// pages/Profile.jsx
// User profile, settings, and purchase history.

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import Toast from "../components/common/Toast";
import { getMyOrders } from "../services/orderService";
import { getMyImages } from "../services/imageService";
import { getWallet, getTransactions, getMyWithdrawals, requestWithdrawal, cancelWithdrawal } from "../services/walletService";
import { formatTHB, formatDate } from "../utils/format";
import "../assets/styles/ProfilePage.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("accessToken");

const CHART_DATA = [
  { month: "Jan", value: 800  }, { month: "Feb", value: 1200 },
  { month: "Mar", value: 950  }, { month: "Apr", value: 1800 },
  { month: "May", value: 1500 }, { month: "Jun", value: 2400 },
  { month: "Jul", value: 2100 }, { month: "Aug", value: 3200 },
];

// ── SVG Area Chart ─────────────────────────────────────────────
function AreaChart({ data }) {
  const W = 340, H = 90, PAD = 4;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const pts = data.map((d, i) => [
    PAD + (i / (data.length - 1)) * (W - PAD * 2),
    H - PAD - (d.value / max) * (H - PAD * 2),
  ]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4fc3c3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4fc3c3" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={linePath} fill="none" stroke="#4fc3c3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#4fc3c3" />)}
      </svg>
      <div className="chart-axis-labels">
        {data.map((d) => <span key={d.month}>{d.month}</span>)}
      </div>
    </div>
  );
}

// ── Avatar component — shows image or initials fallback ────────
function Avatar({ src, name, size = 56, className = "" }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?")[0].toUpperCase();

  if (!src || broken) {
    return (
      <div
        className={`avatar-initials ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={`avatar-img ${className}`}
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  );
}

// ══════════════════════════════════════════════════════════════
export default function Profile({ onBack, theme = "dark", onThemeChange, onImageClick }) {
  const { user, setUser } = useAuth();
  const { toast, showToast } = useToast();
  const avatarInputRef = useRef(null);

  const [activeTab,    setActiveTab]    = useState("profile");
  const [orders,       setOrders]       = useState([]);
  const [loadOrders,   setLoadOrders]   = useState(false);
  const [myImages,     setMyImages]     = useState([]);
  const [loadImages,   setLoadImages]   = useState(false);

  // Wallet state
  const [wallet,          setWallet]          = useState(null);
  const [loadWallet,      setLoadWallet]      = useState(false);
  const [transactions,    setTransactions]    = useState([]);
  const [loadTxns,        setLoadTxns]        = useState(false);
  const [withdrawals,     setWithdrawals]     = useState([]);
  const [loadWithdrawals, setLoadWithdrawals] = useState(false);

  // Withdrawal form
  const [wAmount,     setWAmount]     = useState("");
  const [wBank,       setWBank]       = useState("");
  const [wAccNum,     setWAccNum]     = useState("");
  const [wAccName,    setWAccName]    = useState("");
  const [wNote,       setWNote]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // Seller stats derived from real images
  const [profileStats, setProfileStats] = useState({
    totalSales: 0, monthSales: 0, totalRevenue: 0, monthRevenue: 0,
  });

  // Profile form — seeded from live user data
  const [formUsername, setFormUsername] = useState(user?.name     ?? "");
  const [formBio,      setFormBio]      = useState(user?.bio      ?? "");
  const [formLocation, setFormLocation] = useState(user?.location ?? "");
  const [formEmail,    setFormEmail]    = useState(user?.email    ?? "");
  const [saving,       setSaving]       = useState(false);

  // Avatar upload state
  const [avatarPreview,   setAvatarPreview]   = useState(user?.profileImage ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile,      setAvatarFile]      = useState(null);

  // Appearance toggles
  const [compactMode, setCompactMode] = useState(false);
  const [showNSFW,    setShowNSFW]    = useState(false);
  const [emailNotif,  setEmailNotif]  = useState(true);

  // ── Fetch orders when Purchases tab opens ──────────────────
  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadOrders(true);
    getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadOrders(false));
  }, [activeTab]);

  // ── Fetch wallet data when Wallet tab opens ─────────────────
  useEffect(() => {
    if (activeTab !== "wallet") return;
    fetchWalletData();
  }, [activeTab]);

  const fetchWalletData = () => {
    setLoadWallet(true);
    setLoadTxns(true);
    setLoadWithdrawals(true);

    getWallet()
      .then(setWallet)
      .catch(() => setWallet(null))
      .finally(() => setLoadWallet(false));

    getTransactions({ limit: 20 })
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoadTxns(false));

    getMyWithdrawals()
      .then(setWithdrawals)
      .catch(() => setWithdrawals([]))
      .finally(() => setLoadWithdrawals(false));
  };

  // ── Fetch seller's own images ──────────────────────────────
  useEffect(() => {
    setLoadImages(true);
    getMyImages()
      .then((imgs) => {
        setMyImages(imgs || []);
        // Derive stats from real data
        const purchases   = imgs.reduce((s, i) => s + (i.purchases || 0), 0);
        const revenue     = imgs.reduce((s, i) => s + (i.purchases || 0) * (i.price || 0), 0);
        setProfileStats({
          totalSales:   purchases,
          monthSales:   0,    // would need date-filtered API to get accurate month stats
          totalRevenue: revenue,
          monthRevenue: 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoadImages(false));
  }, []);

  // ── Avatar file selection → preview immediately ────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("✗ Only JPEG, PNG or WEBP allowed", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("✗ Max 2 MB for profile pictures", "error");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));  // instant preview
  };

  // ── Upload avatar to backend ───────────────────────────────
  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatarFile", avatarFile);   // matches multer field name

      const res = await fetch(`${API_BASE}/auth/me/avatar`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      const newUrl = data.data?.profileImage;
      setAvatarPreview(newUrl);
      setAvatarFile(null);

      // Patch the auth context so the avatar updates globally
      setUser?.((prev) => ({ ...prev, profileImage: newUrl }));
      showToast("✓ Profile picture updated", "success");
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Withdrawal submit ──────────────────────────────────────
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!wAmount || !wBank || !wAccNum || !wAccName) {
      showToast("✗ Please fill in all required fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal({
        amount:        parseFloat(wAmount),
        bankName:      wBank,
        accountNumber: wAccNum,
        accountName:   wAccName,
        note:          wNote,
      });
      showToast("✓ Withdrawal request submitted", "success");
      setWAmount(""); setWBank(""); setWAccNum(""); setWAccName(""); setWNote("");
      fetchWalletData();
    } catch (err) {
      showToast(`✗ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    try {
      await cancelWithdrawal(withdrawalId);
      showToast("✓ Withdrawal cancelled", "success");
      setWithdrawals((prev) => prev.filter((w) => w.withdrawalId !== withdrawalId));
      fetchWalletData();
    } catch (err) {
      showToast(`✗ ${err.message}`, "error");
    }
  };

  // ── Save profile fields ────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const body = {};
      if (formUsername.trim() !== (user?.name     ?? "")) body.username = formUsername.trim();
      if (formBio.trim()      !== (user?.bio      ?? "")) body.bio      = formBio.trim();
      if (formLocation.trim() !== (user?.location ?? "")) body.location = formLocation.trim();

      if (Object.keys(body).length === 0) {
        showToast("No changes to save", "info");
        setSaving(false);
        return;
      }

      const res = await fetch(`${API_BASE}/auth/me`, {
        method:  "PATCH",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Save failed");
      }

      // Patch auth context
      setUser?.((prev) => ({
        ...prev,
        name:     data.data?.username ?? prev.name,
        bio:      data.data?.bio      ?? prev.bio,
        location: data.data?.location ?? prev.location,
      }));

      showToast("✓ Profile updated successfully", "success");
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived display data ───────────────────────────────────
  const displayUploads = myImages.slice(0, 3);
  const uploadExtra    = Math.max(0, myImages.length - 3);

  return (
    <div className={`profile-page theme-${theme}`}>
      <header className="profile-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="logo">Imagery</div>
      </header>

      <div className="profile-body">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-header-row">
              <div className="profile-identity">
                <div className="avatar-wrap">
                  <Avatar
                    src={avatarPreview}
                    name={user?.name}
                    size={56}
                    className="profile-avatar-img"
                  />
                  <span className="avatar-online" />
                </div>
                <div className="identity-text">
                  <div className="profile-username">{user?.name ?? "—"}</div>
                  <div className="profile-role-badge">✦ {user?.role ?? "user"}</div>
                </div>
              </div>
              <button className="edit-profile-btn" onClick={() => setActiveTab("profile")}>
                ✏ Edit Profile
              </button>
            </div>

            <div className="profile-bio-row">
              <p className="profile-bio">{formBio || "No bio yet."}</p>
              <div className="profile-meta">
                {formLocation && <span className="meta-item"><span className="icon">📍</span>{formLocation}</span>}
                <span className="meta-item"><span className="icon">✉</span>{formEmail}</span>
              </div>
            </div>

            <div className="profile-stat-chips">
              {user?.role === "user" && (
                <>
                  <div className="stat-chip">
                    <span className="stat-chip-num">{profileStats.totalSales.toLocaleString()}</span>
                    <span className="stat-chip-label">Total Sales</span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-num">{myImages.length}</span>
                    <span className="stat-chip-label">Images</span>
                  </div>
                </>
              )}
              <div className="stat-chip">
                <span className="stat-chip-num">{orders.length || "—"}</span>
                <span className="stat-chip-label">Orders</span>
              </div>
            </div>
          </div>

          {/* Recently Uploaded — real API data */}
          <div className="section-block">
            <div className="section-block-header">
              <span className="section-block-title">
                {user?.role === "user" ? "Recently Uploaded" : "My Purchases"}
              </span>
              <button className="section-block-link">View all →</button>
            </div>
            <div className="section-block-body">
              {loadImages ? (
                <div className="uploads-grid-skeleton">
                  {[1, 2, 3].map((i) => <div key={i} className="upload-cell-skeleton" />)}
                </div>
              ) : displayUploads.length === 0 ? (
                <div className="uploads-empty">
                  <span>{user?.role === "user" ? "No uploads yet" : "No purchases yet"}</span>
                </div>
              ) : (
                <div className="uploads-grid">
                  {/* Tall first cell */}
                  <div
                    className="upload-cell tall"
                    onClick={() => onImageClick?.(displayUploads[0]?.imageId)}
                  >
                    <img
                      src={displayUploads[0]?.watermarkUrl || `https://picsum.photos/seed/${displayUploads[0]?.imageId}/400/600`}
                      alt={displayUploads[0]?.imageName}
                    />
                    <div className="upload-cell-overlay">
                      <span className="upload-cell-name">{displayUploads[0]?.imageName}</span>
                      {displayUploads[0]?.price > 0 && (
                        <span className="upload-cell-price">{formatTHB(displayUploads[0].price)}</span>
                      )}
                    </div>
                    <span className={`upload-status-dot ${displayUploads[0]?.status}`} title={displayUploads[0]?.status} />
                  </div>

                  {/* Second cell */}
                  {displayUploads[1] && (
                    <div
                      className="upload-cell"
                      onClick={() => onImageClick?.(displayUploads[1]?.imageId)}
                    >
                      <img
                        src={displayUploads[1]?.watermarkUrl || `https://picsum.photos/seed/${displayUploads[1]?.imageId}/400/300`}
                        alt={displayUploads[1]?.imageName}
                      />
                      <div className="upload-cell-overlay">
                        <span className="upload-cell-name">{displayUploads[1]?.imageName}</span>
                      </div>
                      <span className={`upload-status-dot ${displayUploads[1]?.status}`} />
                    </div>
                  )}

                  {/* Third cell or +N more */}
                  {displayUploads[2] ? (
                    <div
                      className="upload-cell"
                      onClick={() => onImageClick?.(displayUploads[2]?.imageId)}
                    >
                      <img
                        src={displayUploads[2]?.watermarkUrl || `https://picsum.photos/seed/${displayUploads[2]?.imageId}/400/300`}
                        alt={displayUploads[2]?.imageName}
                      />
                      <div className="upload-cell-overlay">
                        <span className="upload-cell-name">{displayUploads[2]?.imageName}</span>
                      </div>
                      {uploadExtra > 0 && (
                        <div className="upload-more-overlay">+{uploadExtra} more</div>
                      )}
                    </div>
                  ) : uploadExtra > 0 ? (
                    <div className="upload-more-cell">
                      <span className="upload-more-count">+{uploadExtra}</span>
                      <span>more</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Portfolio — from real images */}
          <div className="section-block">
            <div className="section-block-header">
              <span className="section-block-title">Portfolio</span>
              <button className="section-block-link">See all →</button>
            </div>
            <div className="section-block-body">
              <div className="portfolio-grid">
                {(myImages.length > 0 ? myImages : []).slice(0, 5).map((img) => (
                  <div
                    key={img.imageId}
                    className="portfolio-cell"
                    onClick={() => onImageClick?.(img.imageId)}
                  >
                    <img
                      src={img.watermarkUrl || `https://picsum.photos/seed/${img.imageId}/300/300`}
                      alt={img.imageName}
                      loading="lazy"
                    />
                  </div>
                ))}
                {myImages.length > 5 && (
                  <div className="portfolio-cell portfolio-more">
                    <span className="portfolio-more-num">+{myImages.length - 5}</span>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }}>more</span>
                  </div>
                )}
                {myImages.length === 0 && (
                  <div className="portfolio-empty">No images yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div className="profile-right">
          {/* Stats card (seller) */}
          {user?.role === "user" && (
            <div className="stats-card">
              <div className="stats-card-header"><span>📊</span><span className="stats-card-title">Statistics</span></div>
              <div className="stats-card-body">
                <div>
                  <div className="stat-group-label">Downloads</div>
                  <div className="stat-row-item"><span className="stat-row-label">Total</span><span className="stat-row-value accent">{profileStats.totalSales.toLocaleString()}</span></div>
                </div>
                <div className="stat-divider" />
                <div>
                  <div className="stat-group-label">Revenue</div>
                  <div className="stat-row-item"><span className="stat-row-label">Total</span><span className="stat-row-value green">{formatTHB(profileStats.totalRevenue)}</span></div>
                </div>
                <div>
                  <div className="chart-label">Monthly revenue trend</div>
                  <AreaChart data={CHART_DATA} />
                </div>
              </div>
            </div>
          )}

          {/* Settings card */}
          <div className="settings-card">
            <div className="settings-tabs">
              <button className={`settings-tab ${activeTab === "profile"    ? "active" : ""}`} onClick={() => setActiveTab("profile")}>👤 Profile</button>
              <button className={`settings-tab ${activeTab === "orders"     ? "active" : ""}`} onClick={() => setActiveTab("orders")}>📦 Purchases</button>
              {user?.role === "user" && (
                <button className={`settings-tab ${activeTab === "wallet" ? "active" : ""}`} onClick={() => setActiveTab("wallet")}>💰 Wallet</button>
              )}
              <button className={`settings-tab ${activeTab === "appearance" ? "active" : ""}`} onClick={() => setActiveTab("appearance")}>🎨 Appearance</button>
            </div>

            <div className="settings-body">

              {/* ── Profile tab ──────────────────────────────── */}
              {activeTab === "profile" && (
                <div>
                  <div className="settings-section-title">Edit Profile</div>

                  {/* Avatar upload */}
                  <div className="avatar-upload-row">
                    <div className="avatar-upload-preview">
                      <Avatar src={avatarPreview} name={user?.name} size={64} />
                      {avatarFile && (
                        <span className="avatar-pending-dot" title="Unsaved — click Save Photo" />
                      )}
                    </div>
                    <div className="avatar-upload-actions">
                      <button
                        className="avatar-upload-btn"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? "Uploading…" : "Change Photo"}
                      </button>
                      {avatarFile && !uploadingAvatar && (
                        <button className="avatar-save-btn" onClick={handleUploadAvatar}>
                          ✓ Save Photo
                        </button>
                      )}
                      <p style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 5, fontFamily: "var(--mono)" }}>
                        JPG · PNG · WEBP · Max 2 MB
                      </p>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="form-field">
                    <label>Username</label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="your_username"
                      maxLength={30}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      readOnly
                      style={{ opacity: 0.5, cursor: "not-allowed" }}
                      title="Email cannot be changed here"
                    />
                  </div>
                  <div className="form-field">
                    <label>Bio</label>
                    <textarea
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      placeholder="Tell buyers about your work…"
                      maxLength={500}
                    />
                    <div className="char-count">{formBio.length}/500</div>
                  </div>
                  <div className="form-field">
                    <label>Location</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={100}
                    />
                  </div>
                  <div className="form-field">
                    <label>Account Type</label>
                    <input
                      type="text"
                      value={user?.role ?? "user"}
                      readOnly
                      style={{ opacity: 0.5, cursor: "not-allowed" }}
                    />
                  </div>
                  <div className="form-save-row">
                    <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Purchases tab ────────────────────────────── */}
              {activeTab === "orders" && (
                <div>
                  <div className="settings-section-title">Purchase History</div>
                  {loadOrders ? (
                    <div style={{ color: "var(--text-mute)", fontSize: 12, fontFamily: "var(--mono)", padding: "20px 0" }}>
                      Loading orders…
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="orders-empty"><div className="empty-icon">📦</div><p>No orders yet.</p></div>
                  ) : (
                    <div className="order-list">
                      {orders.map((o) => <OrderItem key={o.orderId} order={o} />)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Wallet tab ──────────────────────────────── */}
              {activeTab === "wallet" && (
                <div className="wallet-tab">

                  {/* Balance cards */}
                  {loadWallet ? (
                    <div className="wallet-skeleton-row">
                      {[1,2,3].map((i) => <div key={i} className="wallet-card-skeleton" />)}
                    </div>
                  ) : wallet ? (
                    <div className="wallet-balance-cards">
                      <div className="wallet-balance-card available">
                        <div className="wbc-label">Available</div>
                        <div className="wbc-amount">{formatTHB(wallet.available)}</div>
                        <div className="wbc-sub">Ready to withdraw</div>
                      </div>
                      <div className="wallet-balance-card earned">
                        <div className="wbc-label">Total Earned</div>
                        <div className="wbc-amount">{formatTHB(wallet.totalEarned)}</div>
                        <div className="wbc-sub">Lifetime (after fees)</div>
                      </div>
                      <div className="wallet-balance-card pending">
                        <div className="wbc-label">Pending</div>
                        <div className="wbc-amount">{formatTHB(wallet.pendingWithdrawal)}</div>
                        <div className="wbc-sub">Awaiting admin</div>
                      </div>
                    </div>
                  ) : (
                    <div className="wallet-error">Could not load wallet. Try again.</div>
                  )}

                  {/* Platform fee note */}
                  <div className="wallet-fee-note">
                    <span>ℹ</span>
                    Platform fee is 20% per sale. You keep 80% of each purchase price.
                    Minimum withdrawal: ฿100.
                  </div>

                  {/* Withdrawal request form */}
                  <div className="wallet-section">
                    <div className="wallet-section-title">Request Withdrawal</div>
                    <form className="withdraw-form" onSubmit={handleWithdraw}>
                      <div className="withdraw-field">
                        <label>Amount (THB) *</label>
                        <div className="withdraw-amount-row">
                          <span className="withdraw-currency">฿</span>
                          <input
                            type="number"
                            min="100"
                            max={wallet?.available || 0}
                            step="1"
                            placeholder="0"
                            value={wAmount}
                            onChange={(e) => setWAmount(e.target.value)}
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            className="btn-withdraw-max"
                            onClick={() => setWAmount(String(Math.floor(wallet?.available || 0)))}
                            disabled={!wallet?.available || submitting}
                          >
                            Max
                          </button>
                        </div>
                      </div>

                      <div className="withdraw-field-row">
                        <div className="withdraw-field">
                          <label>Bank Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. KBank, SCB, Bangkok Bank"
                            value={wBank}
                            onChange={(e) => setWBank(e.target.value)}
                            disabled={submitting}
                            maxLength={60}
                          />
                        </div>
                        <div className="withdraw-field">
                          <label>Account Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. 123-4-56789-0"
                            value={wAccNum}
                            onChange={(e) => setWAccNum(e.target.value)}
                            disabled={submitting}
                            maxLength={20}
                          />
                        </div>
                      </div>

                      <div className="withdraw-field">
                        <label>Account Name *</label>
                        <input
                          type="text"
                          placeholder="Full name on bank account"
                          value={wAccName}
                          onChange={(e) => setWAccName(e.target.value)}
                          disabled={submitting}
                          maxLength={100}
                        />
                      </div>

                      <div className="withdraw-field">
                        <label>Note (optional)</label>
                        <input
                          type="text"
                          placeholder="Any additional info for admin"
                          value={wNote}
                          onChange={(e) => setWNote(e.target.value)}
                          disabled={submitting}
                          maxLength={300}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-withdraw-submit"
                        disabled={submitting || !wAmount || !wBank || !wAccNum || !wAccName}
                      >
                        {submitting ? "Submitting…" : "Request Withdrawal"}
                      </button>
                    </form>
                  </div>

                  {/* Withdrawal history */}
                  <div className="wallet-section">
                    <div className="wallet-section-title">Withdrawal History</div>
                    {loadWithdrawals ? (
                      <div className="wallet-list-skeleton">
                        {[1,2].map((i) => <div key={i} className="wallet-item-skeleton" />)}
                      </div>
                    ) : withdrawals.length === 0 ? (
                      <div className="wallet-empty">No withdrawal requests yet.</div>
                    ) : (
                      <div className="withdrawal-list">
                        {withdrawals.map((w) => (
                          <WithdrawalItem
                            key={w.withdrawalId}
                            item={w}
                            onCancel={handleCancelWithdrawal}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transaction history */}
                  <div className="wallet-section">
                    <div className="wallet-section-title">Transaction History</div>
                    {loadTxns ? (
                      <div className="wallet-list-skeleton">
                        {[1,2,3].map((i) => <div key={i} className="wallet-item-skeleton" />)}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="wallet-empty">No transactions yet.</div>
                    ) : (
                      <div className="transaction-list">
                        {transactions.map((t) => (
                          <TransactionItem key={t.txnId} item={t} />
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ── Appearance tab ───────────────────────────── */}
              {activeTab === "appearance" && (
                <div>
                  <div className="settings-section-title">Appearance</div>
                  <div className="appearance-section">
                    <div className="appearance-section-label">Color Theme</div>
                    <div className="theme-options">
                      {["dark", "light"].map((t) => (
                        <div
                          key={t}
                          className={`theme-option ${theme === t ? "selected" : ""}`}
                          onClick={() => onThemeChange?.(t)}
                        >
                          <div className={`theme-preview ${t}-prev`}>
                            <div className="theme-preview-bar" />
                            <div className="theme-preview-bar" />
                            <div className="theme-preview-bar" />
                          </div>
                          <span className="theme-option-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="appearance-section">
                    <div className="appearance-section-label">Display Preferences</div>
                    {[
                      { label: "Compact Gallery",    desc: "Show more images per row",       state: compactMode, setter: setCompactMode },
                      { label: "Email Notifications", desc: "Order updates, new messages",    state: emailNotif,  setter: setEmailNotif  },
                      { label: "Show Mature Content", desc: "Display 18+ tagged images",      state: showNSFW,    setter: setShowNSFW    },
                    ].map(({ label, desc, state, setter }) => (
                      <div key={label} className="toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">{label}</span>
                          <span className="toggle-desc">{desc}</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={state} onChange={(e) => setter(e.target.checked)} />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="form-save-row">
                    <button className="btn-save" onClick={() => showToast("✓ Preferences saved", "success")}>
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function OrderItem({ order }) {
  const statusClass =
    order.status === "completed" ? "completed" :
    order.status === "checking"  ? "checking"  : "pending";
  return (
    <div className="order-item">
      <div className="order-thumb">🖼</div>
      <div className="order-info">
        <div className="order-name">{order.imageName || "Image Purchase"}</div>
        <div className="order-date">{formatDate(order.orderDate || order.createdAt)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span className="order-price">{order.price ? formatTHB(order.price) : "—"}</span>
        <span className={`order-status ${statusClass}`}>{order.status}</span>
      </div>
    </div>
  );
}

// ── Withdrawal request row ─────────────────────────────────────
function WithdrawalItem({ item, onCancel }) {
  const STATUS_STYLE = {
    pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  label: "⏳ Pending"   },
    approved:  { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "✓ Approved"   },
    rejected:  { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "✗ Rejected"   },
    cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "🚫 Cancelled" },
  };
  const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending;

  return (
    <div className="withdrawal-item">
      <div className="wi-left">
        <div className="wi-bank">{item.bankName}</div>
        <div className="wi-meta">
          <span className="wi-acc">{item.accountNumber}</span>
          <span className="wi-date">{formatDate(item.createdAt)}</span>
        </div>
        {item.adminNote && (
          <div className="wi-admin-note">Admin: {item.adminNote}</div>
        )}
      </div>
      <div className="wi-right">
        <div className="wi-amount">{formatTHB(item.amount)}</div>
        <span className="wi-status" style={{ color: st.color, background: st.bg }}>
          {st.label}
        </span>
        {item.status === "pending" && (
          <button
            className="wi-cancel-btn"
            onClick={() => onCancel(item.withdrawalId)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Transaction row ────────────────────────────────────────────
function TransactionItem({ item }) {
  const isSale       = item.type === "sale";
  const isWithdrawal = item.type === "withdrawal";

  return (
    <div className="txn-item">
      <div className="txn-icon" style={{ background: isSale ? "rgba(52,211,153,0.12)" : "rgba(96,165,250,0.12)" }}>
        {isSale ? "💸" : isWithdrawal ? "🏦" : "📋"}
      </div>
      <div className="txn-info">
        <div className="txn-note">{item.note || item.type}</div>
        <div className="txn-date">{formatDate(item.createdAt)}</div>
      </div>
      <div className="txn-right">
        <div
          className="txn-amount"
          style={{ color: item.amount >= 0 ? "#34d399" : "#f87171" }}
        >
          {item.amount >= 0 ? "+" : ""}{formatTHB(item.net ?? item.amount)}
        </div>
        {item.platformFee > 0 && (
          <div className="txn-fee">fee ฿{item.platformFee.toLocaleString("th-TH")}</div>
        )}
        <div className="txn-balance">bal: {formatTHB(item.balanceAfter)}</div>
      </div>
    </div>
  );
} 