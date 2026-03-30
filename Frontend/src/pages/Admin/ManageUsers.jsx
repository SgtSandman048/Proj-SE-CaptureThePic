/**
 * pages/Admin/ManageUsers.jsx
 * Admin user moderation panel.
 *
 * Features:
 *   • Search by username / email / userId (client-side, instant)
 *   • Filter by role (all / buyer / seller) and ban status
 *   • Expandable user rows — shows profile details, stats, recent activity
 *   • Ban with reason, Unban, and permanent Soft-Delete (with double-confirm)
 *
 * Backend consumed (adminController.js):
 *   GET    /admin/users              → list with filters
 *   GET    /admin/users/:id/activity → recent orders + images
 *   PATCH  /admin/users/:id/ban      → { reason }
 *   PATCH  /admin/users/:id/unban
 *   DELETE /admin/users/:id
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../utils/format";
import {
  getAllUsers,
  getUserActivity,
  banUser,
  unbanUser,
  deleteUser,
} from "../../services/adminService";
import { getNotificationCount } from "../../services/orderService";
import "../../assets/styles/ManageUsers.css";

// ── Constants ───────────────────────────────────────────────────────────────
const ROLE_FILTERS  = ["all", "user", "admin"];
const BAN_FILTERS   = [
  { value: "all",    label: "All Users"    },
  { value: "active", label: "Active"       },
  { value: "banned", label: "Banned"       },
];

// ════════════════════════════════════════════════════════════════════════════
export default function ManageUsers({ onNotificationsClick }) {
  const { user, logout } = useAuth();
  const { toast, showToast } = useToast();

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [banFilter,    setBanFilter]    = useState("all");
  const [notifCount,   setNotifCount]   = useState(null);
  // Map of userId → card UI state
  const [cards,        setCards]        = useState({});

  // ── Load users ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Send role + banned filters to the API; search is client-side (faster UX)
      const params = {
        role:   roleFilter !== "all" ? roleFilter : null,
        banned: banFilter === "banned" ? true : banFilter === "active" ? false : null,
        limit:  200,
      };
      setUsers(await getAllUsers(params));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, banFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getNotificationCount().then(setNotifCount).catch(() => setNotifCount(0));
  }, []);

  // ── Client-side search filter ─────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email    || "").toLowerCase().includes(q) ||
        (u.userId   || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  // ── Card state helpers ────────────────────────────────────────
  const getCard = (uid) => cards[uid] ?? {};
  const setCard = (uid, patch) =>
    setCards((prev) => ({ ...prev, [uid]: { ...prev[uid], ...patch } }));

  const toggleExpand = async (uid) => {
    const next = !getCard(uid).expanded;
    setCard(uid, { expanded: next });
    // Lazy-load activity the first time the row is opened
    if (next && !getCard(uid).activity && !getCard(uid).activityLoading) {
      setCard(uid, { activityLoading: true });
      try {
        const activity = await getUserActivity(uid);
        setCard(uid, { activity, activityLoading: false });
      } catch {
        setCard(uid, { activityLoading: false });
      }
    }
  };

  // ── Actions ───────────────────────────────────────────────────
  const handleBan = async (uid) => {
    const cs = getCard(uid);
    if (!cs.banReason?.trim()) {
      showToast("⚠ Enter a ban reason before banning", "info");
      return;
    }
    setCard(uid, { acting: true });
    try {
      await banUser(uid, cs.banReason);
      setUsers((prev) =>
        prev.map((u) => u.userId === uid ? { ...u, isBanned: true, banReason: cs.banReason } : u),
      );
      setCard(uid, { acting: false, banReason: "", confirmDelete: false });
      showToast("✓ User banned", "success");
    } catch (e) {
      setCard(uid, { acting: false });
      showToast(`✗ ${e.message}`, "error");
    }
  };

  const handleUnban = async (uid) => {
    setCard(uid, { acting: true });
    try {
      await unbanUser(uid);
      setUsers((prev) =>
        prev.map((u) => u.userId === uid ? { ...u, isBanned: false, banReason: null } : u),
      );
      setCard(uid, { acting: false });
      showToast("✓ User unbanned", "success");
    } catch (e) {
      setCard(uid, { acting: false });
      showToast(`✗ ${e.message}`, "error");
    }
  };

  const handleDelete = async (uid) => {
    setCard(uid, { acting: true });
    try {
      await deleteUser(uid);
      setUsers((prev) => prev.filter((u) => u.userId !== uid));
      showToast("✓ User account deleted", "success");
    } catch (e) {
      setCard(uid, { acting: false, confirmDelete: false });
      showToast(`✗ ${e.message}`, "error");
    }
  };

  // ── Sidebar ───────────────────────────────────────────────────
//   const sidebar = (
//     <Sidebar
//       user={user}
//       isAdmin
//       notifCount={notifCount}
//       activeNav="users"
//       onNotificationsClick={onNotificationsClick}
//       onLogout={logout}
//     />
//   );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* {sidebar} */}
      <main className="main-content">
        {/* Top bar */}
        {/* <header className="black-top-bar">
          <div className="top-bar-content">
            <div className="search-container">
              <button className="search-btn">🔍</button>
              <input
                type="text"
                placeholder="Search by name, email, or user ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="top-bar-right">
              <span className="admin-topbar-chip">⚙ Admin Mode</span>
              <div className="logo">
                <span className="logo-admin-prefix">(ADMIN)</span> Imagery
              </div>
            </div>
          </div>
        </header> */}

        {/* Page header */}
        <div className="um-page-header">
          <div>
            <h2 className="um-page-title">👥 User Moderation</h2>
            <p className="um-page-sub">
              {loading ? "Loading…" : `${displayed.length} user${displayed.length !== 1 ? "s" : ""} shown`}
            </p>
          </div>
          <button className="um-refresh-btn" onClick={load} disabled={loading}>
            {loading ? "⏳" : "↻"} Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="um-filters">
          {/* Role pills */}
          <div className="um-filter-group">
            <span className="um-filter-label">Role</span>
            <div className="um-pill-row">
              {ROLE_FILTERS.map((r) => (
                <button
                  key={r}
                  className={`um-pill ${roleFilter === r ? "active" : ""}`}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Ban status pills */}
          <div className="um-filter-group">
            <span className="um-filter-label">Status</span>
            <div className="um-pill-row">
              {BAN_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`um-pill ${banFilter === f.value ? "active" : ""}`}
                  onClick={() => setBanFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="um-list-container">
          {loading ? (
            <UserListSkeleton />
          ) : error ? (
            <div className="mod-error">
              <span>⚠</span>
              <p>{error}</p>
              <button onClick={load}>Retry</button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty-icon">🔍</div>
              <p>No users match these filters.</p>
            </div>
          ) : (
            displayed.map((u) => (
              <UserRow
                key={u.userId}
                user={u}
                cs={getCard(u.userId)}
                onToggle={() => toggleExpand(u.userId)}
                onSetCard={(patch) => setCard(u.userId, patch)}
                onBan={() => handleBan(u.userId)}
                onUnban={() => handleUnban(u.userId)}
                onDelete={() => handleDelete(u.userId)}
              />
            ))
          )}
        </div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UserRow — single collapsible user card
// ════════════════════════════════════════════════════════════════════════════
function UserRow({ user: u, cs, onToggle, onSetCard, onBan, onUnban, onDelete }) {
  const isDeleted = u.isDeleted;
  const isBanned  = u.isBanned && !isDeleted;

  const statusBadge = isDeleted
    ? { cls: "deleted",  icon: "🗑",  label: "Deleted" }
    : isBanned
    ? { cls: "banned",   icon: "🚫",  label: "Banned"  }
    : { cls: "active",   icon: "✓",   label: "Active"  };

  const roleBadge = u.role === "admin"
    ? { cls: "role-admin",  label: "Admin"  }
    : { cls: "role-user",  label: "User"  };

  return (
    <div className={`um-row ${cs.expanded ? "expanded" : ""} ${isDeleted ? "um-row-deleted" : ""}`}>
      {/* ── Row header ── */}
      <div className="um-row-header" onClick={onToggle}>
        <div className="um-row-left">
          <div className={`um-avatar ${isDeleted ? "avatar-deleted" : isBanned ? "avatar-banned" : ""}`}>
            {isDeleted ? "🗑" : isBanned ? "🚫" : "👤"}
          </div>
          <div className="um-identity">
            <div className="um-name">
              {u.username || <span style={{ color: "var(--text-mute)" }}>—</span>}
              <span className={`um-role-badge ${roleBadge.cls}`}>{roleBadge.label}</span>
            </div>
            <div className="um-email">{u.email || "—"}</div>
          </div>
        </div>

        <div className="um-row-right">
          <span className={`um-status-badge ${statusBadge.cls}`}>
            {statusBadge.icon} {statusBadge.label}
          </span>
          {isBanned && u.banReason && (
            <span className="um-ban-reason-chip" title={u.banReason}>
              {u.banReason.length > 30 ? `${u.banReason.slice(0, 28)}…` : u.banReason}
            </span>
          )}
          <span className="um-row-chevron">{cs.expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {cs.expanded && (
        <div className="um-row-body">

          {/* Profile details grid */}
          <div className="um-detail-grid">
            {[
              ["User ID",    u.userId],
              ["Username",   u.username   || "—"],
              ["Email",      u.email      || "—"],
              ["Role",       u.role       || "—"],
              ["Joined",     formatDate(u.createdAt)],
              ["Last seen",  formatDate(u.lastLoginAt)],
              ["Orders",     u.stats?.totalOrders ?? "—"],
              ["Images",     u.stats?.totalImages ?? "—"],
              isBanned && ["Banned at",  formatDate(u.bannedAt)],
              isBanned && ["Banned by",  u.bannedBy  || "—"],
              isBanned && ["Reason",     u.banReason || "—"],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="um-detail-item">
                <span className="um-detail-label">{label}</span>
                <span className="um-detail-value">{value}</span>
              </div>
            ))}
          </div>

          {/* ── Recent activity ── */}
          <div className="um-activity-section">
            <div className="um-section-title">Recent Activity</div>
            {cs.activityLoading ? (
              <div className="um-activity-loading">
                {[1, 2, 3].map((i) => <div key={i} className="um-activity-skeleton" />)}
              </div>
            ) : cs.activity ? (
              <div className="um-activity-cols">
                {/* Recent orders */}
                <div className="um-activity-col">
                  <div className="um-activity-col-title">🛒 Recent Orders</div>
                  {cs.activity.recentOrders.length === 0 ? (
                    <p className="um-activity-empty">No orders yet.</p>
                  ) : (
                    cs.activity.recentOrders.slice(0, 5).map((o) => (
                      <div key={o.orderId} className="um-activity-item">
                        <span className={`um-order-dot ${o.status}`} />
                        <div className="um-activity-item-info">
                          <span className="um-activity-item-name">{o.imageName || o.imageId}</span>
                          <span className="um-activity-item-meta">
                            {o.status} · {formatDate(o.createdAt || o.orderDate)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent images */}
                <div className="um-activity-col">
                  <div className="um-activity-col-title">📷 Uploaded Images</div>
                  {cs.activity.recentImages.length === 0 ? (
                    <p className="um-activity-empty">No uploads yet.</p>
                  ) : (
                    cs.activity.recentImages.slice(0, 5).map((img) => (
                      <div key={img.imageId} className="um-activity-item">
                        <span className={`um-img-dot ${img.status}`} />
                        <div className="um-activity-item-info">
                          <span className="um-activity-item-name">{img.imageName || img.imageId}</span>
                          <span className="um-activity-item-meta">
                            {img.status} · {formatDate(img.uploadDate)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="um-activity-empty">Could not load activity.</p>
            )}
          </div>

          <div className="um-divider" />

          {/* ── Actions ── */}
          {isDeleted ? (
            <div className="um-action-notice deleted">
              🗑 This account has been permanently deleted. No further actions available.
            </div>
          ) : u.role === "admin" ? (
            <div className="um-action-notice admin">
              ⚙ Admin accounts cannot be banned or deleted.
            </div>
          ) : (
            <div className="um-actions">
              {/* ── Ban / Unban ── */}
              {isBanned ? (
                <div className="um-action-group">
                  <div className="um-action-group-title">Lift Ban</div>
                  <button
                    className="um-btn um-btn-unban"
                    disabled={cs.acting}
                    onClick={onUnban}
                  >
                    {cs.acting ? "⏳ Unbanning…" : "✓ Unban User"}
                  </button>
                </div>
              ) : (
                <div className="um-action-group">
                  <div className="um-action-group-title">Ban User</div>
                  <textarea
                    className="um-reason-input"
                    rows={2}
                    placeholder="Ban reason (required, shown to the user)…"
                    value={cs.banReason || ""}
                    onChange={(e) => onSetCard({ banReason: e.target.value })}
                    disabled={cs.acting}
                  />
                  <button
                    className="um-btn um-btn-ban"
                    disabled={cs.acting || !cs.banReason?.trim()}
                    onClick={onBan}
                  >
                    {cs.acting ? "⏳ Banning…" : "🚫 Ban User"}
                  </button>
                </div>
              )}

              {/* ── Permanent delete ── */}
              <div className="um-action-group um-action-group-danger">
                <div className="um-action-group-title">Danger Zone</div>
                {!cs.confirmDelete ? (
                  <button
                    className="um-btn um-btn-delete"
                    disabled={cs.acting}
                    onClick={() => onSetCard({ confirmDelete: true })}
                  >
                    🗑 Delete Account
                  </button>
                ) : (
                  <div className="um-confirm-delete">
                    <p className="um-confirm-text">
                      Permanently delete <strong>{u.username || u.email}</strong>?
                      This anonymises their profile and removes all pending images.
                      <br />
                      <strong style={{ color: "var(--admin-red)" }}>This cannot be undone.</strong>
                    </p>
                    <div className="um-confirm-actions">
                      <button
                        className="um-btn um-btn-confirm-delete"
                        disabled={cs.acting}
                        onClick={onDelete}
                      >
                        {cs.acting ? "⏳ Deleting…" : "✓ Yes, Delete Permanently"}
                      </button>
                      <button
                        className="um-btn um-btn-cancel"
                        disabled={cs.acting}
                        onClick={() => onSetCard({ confirmDelete: false })}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Skeleton loader
// ════════════════════════════════════════════════════════════════════════════
function UserListSkeleton() {
  return (
    <div className="mod-loading">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="um-row-skeleton" style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}