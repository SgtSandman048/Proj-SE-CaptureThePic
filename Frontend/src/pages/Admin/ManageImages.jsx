/**
 * pages/Admin/ManageImages.jsx
 * Admin panel — four tabs:
 *   1. Gallery          — browse all published images
 *   2. Image Moderation — approve / reject pending uploads
 *   3. Order Moderation — verify / reject payment slips
 *   4. Dashboard        — platform-wide stats
 *
 * Backend consumed (adminController.js + adminService.js):
 *   GET   /admin/orders              -> checking orders
 *   PATCH /admin/orders/:id/verify   -> { status, note }
 *   GET   /admin/images/pending      -> pending images
 *   PUT   /admin/images/:id/approve
 *   PUT   /admin/images/:id/reject   -> { reason }
 *   GET   /admin/dashboard
 */
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Toast from "../../components/common/Toast";
import ManageUsers from "./ManageUsers";
import ImageDetail from "../ImageDetail";
import { getImages } from "../../services/imageService";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";
import {
  getCheckingOrders,
  getAllAdminOrders,
  verifyOrder,
  getPendingImages,
  approveImage,
  rejectImage,
  getDashboardStats,
  getAdminWithdrawals,
  processWithdrawal,
} from "../../services/adminService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatTHB, formatDate } from "../../utils/format";
import iconSearch from "../../assets/icons/search.png";
import "../../assets/styles/HomePageAdmin.css";
 
const FILTERS = ["All","Nature","Architecture","People","Abstract","Animals","Travel","Food"];
const SKELETON_HEIGHTS = [220,160,280,195,240,170,300,185,210,260,150,230];
const TABS = [
  { id:"gallery",   label:"Gallery",          icon:"🖼"  },
  { id:"images",    label:"Image Moderation", icon:"🛡"  },
  { id:"orders",    label:"Order Moderation", icon:"💳" },
  { id: "users",    label:"User Moderation",   icon: "👥" },
  { id: "wallet",   label:"Wallet Moderation",  icon: "💰" },
  { id:"dashboard", label:"Dashboard",          icon:"📊" },
];

const ORDER_STATUS = {
  checking:  { label:"Checking",  icon:"🔍" },
  completed: { label:"Completed", icon:"✓"  },
  rejected:  { label:"Rejected",  icon:"✗"  },
  pending:   { label:"Pending",   icon:"⏳" },
  cancelled: { label:"Cancelled", icon:"🚫" },
};
 
// ════════════════════════════════════════════════════════════════
export default function ManageImages({ onOrdersClick, onNotificationsClick }) {
  const { user, logout } = useAuth();
  const { toast, showToast } = useToast();
 
  const [activeTab,       setActiveTab]       = useState("gallery");
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [images,          setImages]          = useState([]);
  const [loadingImages,   setLoadingImages]   = useState(true);
  const [activeFilter,    setActiveFilter]    = useState("All");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [notifCount,      setNotifCount]      = useState(null);
  const [pendingImgCount, setPendingImgCount] = useState(null);
  const [checkingCount,   setCheckingCount]   = useState(null);
  const [pendingWalletCount, setPendingWalletCount] = useState(null);
 
  useEffect(() => {
    const fetch = () =>
      getUnreadCount().then(setNotifCount).catch(() => setNotifCount(0));
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getPendingImages().then((imgs) => setPendingImgCount(imgs.length)).catch(() => setPendingImgCount(0));
    getCheckingOrders().then((orders) => setCheckingCount(orders.length)).catch(() => setCheckingCount(0));
    getAdminWithdrawals({ all: false }).then((w) => setPendingWalletCount(w.length)).catch(() => setPendingWalletCount(0));
  }, []);
 
  useEffect(() => {
    if (activeTab !== "gallery") return;
    setLoadingImages(true);
    getImages({ category: activeFilter, search: searchQuery })
      .then(setImages).catch(() => {}).finally(() => setLoadingImages(false));
  }, [activeFilter, searchQuery, activeTab]);
 
  // Map internal tab IDs to sidebar activeNav values
  const sidebarNav = { gallery: "home", images: "images", orders: "orders", users: "users", wallet: "wallet", dashboard: "dashboard" };
 
  const sharedSidebar = (
    <Sidebar user={user} isAdmin notifCount={notifCount}
      activeNav={sidebarNav[activeTab] ?? "home"}
      onHomeClick={() => { setSelectedImageId(null); setActiveTab("gallery"); }}
      onOrdersClick={() => setActiveTab("orders")}
      onNotificationsClick={() => setActiveTab("alerts")}
      onImagesClick={() => setActiveTab("images")}
      onUsersClick={() => setActiveTab("users")}
      onWalletClick={() => setActiveTab("wallet")}
      onDashboardClick={() => setActiveTab("dashboard")}
      onLogout={logout} />
  );
 
  if (selectedImageId) {
    return (
      <div className="app-container">
        {sharedSidebar}
        <ImageDetail imageId={selectedImageId} isAdmin
          onBack={() => setSelectedImageId(null)} onNavigate={setSelectedImageId} />
      </div>
    );
  }
 
  return (
    <div className="app-container">
      {sharedSidebar}
      <main className="main-content">
        {/* Top bar */}
        <header className="black-top-bar">
          <div className="top-bar-content">
            <div className="search-container">
              <button className="search-btn"><img src={iconSearch} alt="search" className="search-icon-img" /></button>
              <input type="text" placeholder="Search images, orders, users…"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="top-bar-right">
              <span className="admin-topbar-chip">⚙ Admin Mode</span>
              <div className="logo"><span className="logo-admin-prefix">(ADMIN)</span> Imagery</div>
            </div>
          </div>
        </header>
 
        {/* Page tabs */}
        {/* <div className="admin-page-tabs">
          {TABS.map((tab) => (
            <button key={tab.id}
              className={`admin-page-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
              {tab.id === "images" && pendingImgCount > 0 && <span className="admin-tab-badge">{pendingImgCount}</span>}
              {tab.id === "orders" && checkingCount > 0  && <span className="admin-tab-badge">{checkingCount}</span>}
            </button>
          ))}
        </div> */}
 
        {/* Notification bar — gallery only */}
        {activeTab === "gallery" && (
          <div className="admin-notif-bar" onClick={() => onNotificationsClick?.()}
            role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setActiveTab("alerts")}>
            <div className="admin-notif-bar-left">
              <span className="notif-bar-icon">🔔</span>
              <span className="notif-bar-text">
                {notifCount === null ? "Loading notifications…"
                  : notifCount === 0 ? "No new notifications"
                  : `You have ${notifCount} notification${notifCount !== 1 ? "s" : ""}`}
              </span>
              {notifCount > 0 && <span className="notif-bar-count">{notifCount}</span>}
            </div>
            <span className="notif-bar-cta">View all →</span>
          </div>
        )}
 
        {/* Tab content */}
        {activeTab === "gallery"   && <GalleryTab images={images} loading={loadingImages} activeFilter={activeFilter} setActiveFilter={setActiveFilter} onImageClick={setSelectedImageId} />}
        {activeTab === "alerts"    && <AlertsTab onCountChange={setNotifCount} onTabSwitch={setActiveTab} />}
        {activeTab === "images"    && <ImageModerationTab showToast={showToast} onCountChange={setPendingImgCount} />}
        {activeTab === "orders"    && <OrderModerationTab showToast={showToast} onCountChange={setCheckingCount} />}
        {activeTab === "users"     && <ManageUsers showToast={showToast} onNotificationsClick={onNotificationsClick}/>}
        {activeTab === "wallet"    && <WalletModerationTab showToast={showToast} onCountChange={setPendingWalletCount} />}
        {activeTab === "dashboard" && <DashboardTab onTabSwitch={setActiveTab} />}
      </main>
      <Toast toast={toast} />
    </div>
  );
}
 
// ════════════════════════════════════════════════════════════════
// TAB 1 — Gallery
// ════════════════════════════════════════════════════════════════
function GalleryTab({ images, loading, activeFilter, setActiveFilter, onImageClick }) {
  return (
    <section className="gallery-section" style={{ paddingTop: 24 }}>
      <div className="section-header">
        <h2 className="section-title">{activeFilter === "All" ? "All Images" : activeFilter}</h2>
        <a className="section-link" href="#" onClick={(e) => { e.preventDefault(); setActiveFilter("All"); }}>
          {activeFilter !== "All" ? "Clear filter ✕" : ""}
        </a>
      </div>
      <div className="gallery-filter-row">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-chip ${activeFilter === f ? "active" : ""}`}
            onClick={() => setActiveFilter(f)}>{f}</button>
        ))}
      </div>
      {loading ? (
        <div className="gallery-skeleton">
          {SKELETON_HEIGHTS.map((h, i) => <div key={i} className="gallery-skeleton-card" style={{ height: h }} />)}
        </div>
      ) : images.length === 0 ? (
        <div className="gallery-empty"><div className="empty-icon">🖼</div><p>No images found.</p></div>
      ) : (
        <div className="image-gallery">
          {images.map((img) => (
            <div className="gallery-card" key={img.imageId} onClick={() => onImageClick(img.imageId)}>
              <img src={img.watermarkUrl || `https://picsum.photos/seed/${img.imageId}/400`} alt={img.imageName} loading="lazy" />
              <div className="gallery-card-overlay">
                <div className="gallery-card-name">{img.imageName}</div>
                {img.price && <div className="gallery-card-price">{formatTHB(img.price)}</div>}
                <div className="gallery-card-admin-actions">
                  <button className="admin-card-btn" onClick={(e) => e.stopPropagation()}>✏ Edit</button>
                  <button className="admin-card-btn danger" onClick={(e) => e.stopPropagation()}>🗑 Delete</button>
                </div>
              </div>
              <div className="gallery-card-like">♡ {img.likes ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
 
// ════════════════════════════════════════════════════════════════
// TAB 2 — Image Moderation
// ════════════════════════════════════════════════════════════════
function ImageModerationTab({ showToast, onCountChange }) {
  const [images,       setImages]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [cardState,    setCardState]    = useState({});
 
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const imgs = await getPendingImages(100);
      setImages(imgs);
      onCountChange?.(imgs.filter((i) => !i.status || i.status === "pending").length);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
 
  useEffect(() => { load(); }, [load]);
 
  const setCard = (id, patch) =>
    setCardState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
 
  const handleApprove = async (imageId) => {
    setCard(imageId, { acting: true });
    try {
      await approveImage(imageId);
      showToast("✓ Image approved and now live", "success");
      setImages((prev) => prev.filter((i) => i.imageId !== imageId));
      onCountChange?.((c) => Math.max(0, (c || 1) - 1));
    } catch (e) { showToast(`✗ ${e.message}`, "error"); }
    finally { setCard(imageId, { acting: false }); }
  };
 
  const handleRejectSubmit = async (imageId, reason) => {
    setCard(imageId, { acting: true });
    try {
      await rejectImage(imageId, reason);
      showToast("✓ Image rejected", "success");
      setImages((prev) => prev.filter((i) => i.imageId !== imageId));
    } catch (e) { showToast(`✗ ${e.message}`, "error"); }
    finally { setCard(imageId, { acting: false, showReject: false, reason: "" }); }
  };
 
  const counts = {
    all:      images.length,
    pending:  images.filter((i) => !i.status || i.status === "pending").length,
    approved: images.filter((i) => i.status === "approved").length,
    rejected: images.filter((i) => i.status === "rejected").length,
  };
 
  const filtered = images.filter((img) => {
    if (statusFilter === "all")     return true;
    if (statusFilter === "pending") return !img.status || img.status === "pending";
    return img.status === statusFilter;
  });
 
  return (
    <div className="mod-panel">
      <div className="mod-header">
        <div>
          <div className="mod-title">Image Moderation</div>
          <div className="mod-subtitle">Review submitted images before they appear in the marketplace.</div>
        </div>
        <button className="mod-refresh-btn" onClick={load}>↻ Refresh</button>
      </div>
 
      <div className="mod-status-row">
        {[["all","All"],["pending","Pending"],["approved","Approved"],["rejected","Rejected"]].map(([key, lbl]) => (
          <button key={key} className={`mod-status-chip ${key} ${statusFilter === key ? "active" : ""}`}
            onClick={() => setStatusFilter(key)}>
            <span className="mod-chip-dot" />
            {lbl} ({counts[key] ?? 0})
          </button>
        ))}
      </div>
 
      {loading ? (
        <div className="mod-loading">{[1,2,3,4,5,6].map((i) => <div key={i} className="mod-skeleton" style={{ height: 80 }} />)}</div>
      ) : error ? (
        <div className="mod-error"><span>⚠</span><p>{error}</p><button onClick={load}>Try Again</button></div>
      ) : filtered.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty-icon">{statusFilter === "pending" ? "🎉" : "🖼"}</div>
          <p>{statusFilter === "pending" ? "No pending images — all clear!" : `No ${statusFilter} images.`}</p>
        </div>
      ) : (
        <div className="img-mod-grid">
          {filtered.map((img, idx) => {
            const cs = cardState[img.imageId] || {};
            const isPending = !img.status || img.status === "pending";
            return (
              <div className="img-mod-card" key={img.imageId} style={{ animationDelay: `${idx * 0.04}s` }}>
                <img className="img-mod-thumb"
                  src={img.watermarkUrl || `https://picsum.photos/seed/${img.imageId}/400/300`}
                  alt={img.imageName} loading="lazy" />
                <div className="img-mod-body">
                  <div className="img-mod-meta">
                    <div className="img-mod-name">{img.imageName || "Untitled"}</div>
                    <div className="img-mod-sub">
                      {img.category && <span className="img-mod-category">{img.category}</span>}
                      <span className="img-mod-date">{formatDate(img.uploadDate || img.createdAt)}</span>
                    </div>
                    {img.price != null && <div className="img-mod-price">{formatTHB(img.price)}</div>}
                  </div>
 
                  {img.tags?.length > 0 && (
                    <div className="img-mod-tags">
                      {img.tags.slice(0, 4).map((t) => <span key={t} className="img-mod-tag">#{t}</span>)}
                      {img.tags.length > 4 && <span className="img-mod-tag">+{img.tags.length - 4}</span>}
                    </div>
                  )}
 
                  <div className="img-mod-seller">
                    <div className="img-mod-seller-avatar">📷</div>
                    <div>
                      <div className="img-mod-seller-name">{img.sellerName || "Unknown seller"}</div>
                      <div className="img-mod-seller-id">{(img.sellerId || "").slice(0, 12)}…</div>
                    </div>
                  </div>
 
                  {isPending ? (
                    !cs.showReject ? (
                      <div className="img-mod-actions">
                        <button className="btn-mod-approve" disabled={cs.acting} onClick={() => handleApprove(img.imageId)}>
                          {cs.acting ? "⏳" : "✓"} Approve
                        </button>
                        <button className="btn-mod-reject" disabled={cs.acting}
                          onClick={() => setCard(img.imageId, { showReject: true, reason: "" })}>
                          ✗ Reject
                        </button>
                      </div>
                    ) : (
                      <div className="reject-reason-box">
                        <label className="reject-reason-label">REJECTION REASON *</label>
                        <textarea className="reject-reason-input" rows={3}
                          placeholder="Explain why this image cannot be published…"
                          value={cs.reason || ""}
                          onChange={(e) => setCard(img.imageId, { reason: e.target.value })} />
                        <div className="reject-reason-actions">
                          <button className="btn-reason-cancel" disabled={cs.acting}
                            onClick={() => setCard(img.imageId, { showReject: false })}>Cancel</button>
                          <button className="btn-reason-submit"
                            disabled={cs.acting || !cs.reason?.trim()}
                            onClick={() => handleRejectSubmit(img.imageId, cs.reason)}>
                            {cs.acting ? "Rejecting…" : "Confirm Reject"}
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className={`img-mod-status-badge ${img.status}`}>
                      {img.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
// ════════════════════════════════════════════════════════════════
// TAB 3 — Order Moderation
// ════════════════════════════════════════════════════════════════
function OrderModerationTab({ showToast, onCountChange }) {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusFilter, setStatusFilter] = useState("checking");
  const [expandedId,   setExpandedId]   = useState(null);
  const [cardState,    setCardState]    = useState({});
 
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getAllAdminOrders({ all: true });
      setOrders(data);
      onCountChange?.(data.filter((o) => o.status === "checking").length);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
 
  useEffect(() => { load(); }, [load]);
 
  const setCard = (id, patch) =>
    setCardState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
 
  const handleVerify = async (orderId, status) => {
    const note = cardState[orderId]?.note?.trim() || null;
    if (status === "rejected" && !note) {
      showToast("✗ A rejection note is required.", "error"); return;
    }
    setCard(orderId, { acting: true });
    try {
      await verifyOrder(orderId, status, note);
      showToast(status === "completed" ? "✓ Order approved — buyer can download." : "✓ Order rejected.", "success");
      setOrders((prev) => prev.map((o) => o.orderId === orderId ? { ...o, status } : o));
      if (status === "completed" || status === "rejected")
        onCountChange?.((c) => Math.max(0, (c || 1) - 1));
      setExpandedId(null);
    } catch (e) { showToast(`✗ ${e.message}`, "error"); }
    finally { setCard(orderId, { acting: false }); }
  };
 
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});
 
  const filtered = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);
 
  return (
    <div className="mod-panel">
      <div className="mod-header">
        <div>
          <div className="mod-title">Order Moderation</div>
          <div className="mod-subtitle">Verify payment slips and release digital downloads to buyers.</div>
        </div>
        <button className="mod-refresh-btn" onClick={load}>↻ Refresh</button>
      </div>
 
      <div className="mod-status-row">
        {["all","checking","completed","rejected","pending","cancelled"].map((key) => (
          <button key={key} className={`mod-status-chip ${key} ${statusFilter === key ? "active" : ""}`}
            onClick={() => setStatusFilter(key)}>
            <span className="mod-chip-dot" />
            {key === "all" ? `All (${counts.all || 0})` : `${ORDER_STATUS[key]?.label} (${counts[key] || 0})`}
          </button>
        ))}
      </div>
 
      {loading ? (
        <div className="mod-loading">{[1,2,3,4].map((i) => <div key={i} className="mod-skeleton" style={{ height: 72 }} />)}</div>
      ) : error ? (
        <div className="mod-error"><span>⚠</span><p>{error}</p><button onClick={load}>Try Again</button></div>
      ) : filtered.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty-icon">{statusFilter === "checking" ? "🎉" : "📦"}</div>
          <p>{statusFilter === "checking" ? "No orders awaiting verification." : `No ${statusFilter} orders.`}</p>
        </div>
      ) : (
        <div className="order-mod-list">
          {filtered.map((order, idx) => {
            const cs = cardState[order.orderId] || {};
            const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
            const isChecking = order.status === "checking";
            const isResolved = order.status === "completed" || order.status === "rejected";
            const exp = expandedId === order.orderId;
 
            return (
              <div key={order.orderId} className={`order-mod-card ${exp ? "expanded" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s` }}>
 
                {/* Header */}
                <div className="order-mod-header" onClick={() => setExpandedId(exp ? null : order.orderId)}>
                  <div className="order-mod-thumb">🖼</div>
                  <div className="order-mod-info">
                    <div className="order-mod-image-name">{order.imageName || "Image Purchase"}</div>
                    <div className="order-mod-meta">
                      <span className="order-mod-id">#{order.orderId?.slice(-10)}</span>
                      <span className="order-mod-date">{formatDate(order.createdAt || order.orderDate)}</span>
                      {order.totalAmount && <span className="order-mod-amount">{formatTHB(order.totalAmount)}</span>}
                    </div>
                  </div>
                  <div className="order-mod-right">
                    <span className={`order-status-badge ${order.status}`}>{st.icon} {st.label}</span>
                    <span className="order-mod-chevron">▼</span>
                  </div>
                </div>
 
                {/* Expanded */}
                {exp && (
                  <div className="order-mod-body">
                    <div className="order-mod-detail-grid">
                      {[
                        ["Order ID",  order.orderId],
                        ["User ID",   order.userId],
                        ["Image ID",  order.imageId],
                        ["Amount",    formatTHB(order.totalAmount), true],
                        ["Created",   formatDate(order.createdAt || order.orderDate)],
                        ["Updated",   formatDate(order.updatedAt)],
                        order.verifiedBy && ["Verified By", order.verifiedBy],
                      ].filter(Boolean).map(([lbl, val, highlight]) => (
                        <div key={lbl} className="order-mod-detail-item">
                          <span className="order-mod-detail-label">{lbl}</span>
                          <span className={`order-mod-detail-value ${highlight ? "highlight" : ""}`}>{val}</span>
                        </div>
                      ))}
                      {order.adminNote && (
                        <div className="order-mod-detail-item" style={{ gridColumn:"1/-1" }}>
                          <span className="order-mod-detail-label">Admin Note</span>
                          <span className="order-mod-detail-value">{order.adminNote}</span>
                        </div>
                      )}
                    </div>
 
                    <div className="order-mod-divider" />
 
                    {/* Slip */}
                    <div className="slip-preview-section">
                      <div className="slip-preview-label">Payment Slip</div>
                      <div className="slip-img-wrap">
                        {order.slipUrl
                          ? <img className="slip-img" src={order.slipUrl} alt="Payment slip" />
                          : <div className="slip-img-placeholder"><span>📋</span>No slip uploaded</div>}
                      </div>
                      {order.slipUrl && (
                        <button className="slip-open-btn" onClick={() => window.open(order.slipUrl, "_blank")}>
                          ↗ Open full image
                        </button>
                      )}
                    </div>
 
                    <div className="order-mod-divider" />
 
                    {/* Actions */}
                    {isResolved ? (
                      <div className={`verified-badge ${order.status}`}>
                        {order.status === "completed"
                          ? "✓ Approved — buyer can now download."
                          : "✗ This order was rejected."}
                      </div>
                    ) : isChecking ? (
                      <>
                        <div className="admin-note-section">
                          <label className="admin-note-label">NOTE (required when rejecting)</label>
                          <textarea className="admin-note-input" rows={2}
                            placeholder="Add a note visible to the buyer…"
                            value={cs.note || ""}
                            onChange={(e) => setCard(order.orderId, { note: e.target.value })}
                            disabled={cs.acting} />
                        </div>
                        <div className="order-mod-actions">
                          <button className="btn-verify-approve"
                            disabled={cs.acting || !order.slipUrl}
                            title={!order.slipUrl ? "No slip uploaded" : ""}
                            onClick={() => handleVerify(order.orderId, "completed")}>
                            {cs.acting ? "⏳" : "✓"} Approve Payment
                          </button>
                          <button className="btn-verify-reject"
                            disabled={cs.acting}
                            onClick={() => handleVerify(order.orderId, "rejected")}>
                            {cs.acting ? "⏳" : "✗"} Reject Payment
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="verified-badge" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text-mute)" }}>
                        Status is <strong style={{ color:"var(--text-mid)" }}>{order.status}</strong> — no action needed.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 

const NOTIF_TYPES = {
  new_image_pending:  { icon: "📷", label: "New Image",    color: "var(--admin-accent)" },
  new_slip_uploaded:  { icon: "💳", label: "New Slip",     color: "var(--admin-blue)"   },
  purchase_complete:  { icon: "✅", label: "Approved",     color: "var(--admin-green)"  },
  payment_rejected:   { icon: "❌", label: "Rejected",     color: "var(--admin-red)"    },
  photo_approved:     { icon: "🎉", label: "Img Approved", color: "var(--admin-green)"  },
  photo_rejected:     { icon: "⚠️", label: "Img Rejected", color: "var(--admin-red)"    },
};
const TYPE_FILTERS = [
  { value: "all",    label: "All" },
  { value: "images", label: "Images", types: ["new_image_pending", "photo_approved", "photo_rejected"] },
  { value: "orders", label: "Orders", types: ["new_slip_uploaded", "purchase_complete", "payment_rejected"] },
  { value: "unread", label: "Unread"  },
];
 
function AlertsTab({ onCountChange, onTabSwitch }) {
  const [notifs,      setNotifs]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [markingAll,  setMarkingAll]  = useState(false);
 
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getNotifications();
      setNotifs(Array.isArray(data) ? data : []);
      const unread = (Array.isArray(data) ? data : []).filter(n => !n.read).length;
      onCountChange?.(unread);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
 
  // Initial load + 30s auto-refresh
  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);
 
  const handleMarkOne = async (id) => {
    await markAsRead(id).catch(() => {});
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onCountChange?.(next.filter(n => !n.read).length);
      return next;
    });
  };
 
  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllAsRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange?.(0);
    setMarkingAll(false);
  };
 
  const displayed = notifs.filter(n => {
    const f = TYPE_FILTERS.find(f => f.value === typeFilter);
    if (!f) return true;
    if (f.value === "all")    return true;
    if (f.value === "unread") return !n.read;
    return f.types?.includes(n.type);
  });
 
  const unreadCount = notifs.filter(n => !n.read).length;
 
  // Action shortcut: clicking a card navigates to the relevant tab
  const handleNotifClick = (n) => {
    handleMarkOne(n.id);
    if (n.type === "new_image_pending" || n.type === "photo_approved" || n.type === "photo_rejected") {
      onTabSwitch?.("images");
    } else if (n.type === "new_slip_uploaded" || n.type === "purchase_complete" || n.type === "payment_rejected") {
      onTabSwitch?.("orders");
    }
  };
 
  return (
    <div className="mod-panel">
      {/* Header */}
      <div className="mod-header">
        <div>
          <div className="mod-title">🔔 Alerts</div>
          <div className="mod-subtitle">
            {loading ? "Loading…" : `${unreadCount} unread · ${notifs.length} total`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="mod-refresh-btn"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? "⏳" : "✓"} Mark all read
          </button>
          <button className="mod-refresh-btn" onClick={load}>↻ Refresh</button>
        </div>
      </div>
 
      {/* Type filter pills */}
      <div className="mod-status-row" style={{ gap: 8 }}>
        {TYPE_FILTERS.map(f => (
          <button key={f.value}
            className={`mod-status-chip ${typeFilter === f.value ? "active" : ""}`}
            style={typeFilter === f.value ? { borderColor: "var(--admin-accent)", color: "var(--admin-accent)", background: "var(--admin-accent-dim)" } : {}}
            onClick={() => setTypeFilter(f.value)}>
            {f.label}
            {f.value === "unread" && unreadCount > 0 && (
              <span className="admin-tab-badge" style={{ marginLeft: 6 }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>
 
      {/* Content */}
      {loading ? (
        <div className="mod-loading">
          {[1,2,3,4,5].map(i => <div key={i} className="mod-skeleton" style={{ height: 76 }} />)}
        </div>
      ) : error ? (
        <div className="mod-error"><span>⚠</span><p>{error}</p><button onClick={load}>Retry</button></div>
      ) : displayed.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty-icon">{unreadCount === 0 ? "🎉" : "🔍"}</div>
          <p>{typeFilter === "unread" && unreadCount === 0 ? "All caught up — no unread notifications!" : "No notifications match this filter."}</p>
        </div>
      ) : (
        <div className="alerts-list">
          {displayed.map((n, idx) => {
            const meta = NOTIF_TYPES[n.type] ?? { icon: "🔔", label: "Info", color: "var(--text-mute)" };
            return (
              <div
                key={n.id}
                className={`alert-card ${n.read ? "read" : "unread"}`}
                style={{ animationDelay: `${idx * 0.03}s` }}
                onClick={() => handleNotifClick(n)}
                title="Click to go to relevant section"
              >
                <div className="alert-icon" style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                  {meta.icon}
                </div>
                <div className="alert-body">
                  <div className="alert-type-badge" style={{ color: meta.color }}>{meta.label}</div>
                  <p className="alert-message">{n.message}</p>
                  <span className="alert-time">{formatTime(n.createdAt)}</span>
                </div>
                <div className="alert-right">
                  {!n.read && <span className="alert-unread-dot" />}
                  <button
                    className="alert-read-btn"
                    title="Mark as read"
                    onClick={(e) => { e.stopPropagation(); handleMarkOne(n.id); }}
                    style={{ visibility: n.read ? "hidden" : "visible" }}
                  >
                    ✓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
function formatTime(ts) {
  if (!ts) return "";
  const d    = new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(ts);
}

// ════════════════════════════════════════════════════════════════
// TAB — Wallet Moderation
// ════════════════════════════════════════════════════════════════
const WITHDRAWAL_STATUS = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  approved:  { label: "Approved",  color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  rejected:  { label: "Rejected",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

function WalletModerationTab({ showToast, onCountChange }) {
  const [withdrawals,  setWithdrawals]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedId,   setExpandedId]   = useState(null);
  const [cardState,    setCardState]    = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getAdminWithdrawals({ all: true });
      setWithdrawals(data);
      onCountChange?.(data.filter((w) => w.status === "pending").length);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setCard = (id, patch) =>
    setCardState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleProcess = async (withdrawalId, status) => {
    const note = cardState[withdrawalId]?.note?.trim() || null;
    if (status === "rejected" && !note) {
      showToast("✗ An admin note is required when rejecting.", "error"); return;
    }
    setCard(withdrawalId, { acting: true });
    try {
      await processWithdrawal(withdrawalId, status, note);
      showToast(
        status === "approved"
          ? "✓ Withdrawal approved — funds deducted from seller balance."
          : "✓ Withdrawal rejected — seller has been notified.",
        "success"
      );
      setWithdrawals((prev) =>
        prev.map((w) => w.withdrawalId === withdrawalId ? { ...w, status, adminNote: note } : w)
      );
      onCountChange?.((c) => Math.max(0, (c || 1) - 1));
      setExpandedId(null);
    } catch (e) { showToast(`✗ ${e.message}`, "error"); }
    finally { setCard(withdrawalId, { acting: false }); }
  };

  const counts = withdrawals.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  const filtered = withdrawals.filter(
    (w) => statusFilter === "all" || w.status === statusFilter
  );

  return (
    <div className="mod-panel">
      <div className="mod-header">
        <div>
          <div className="mod-title">Wallet Moderation</div>
          <div className="mod-subtitle">Review and process seller withdrawal requests.</div>
        </div>
        <button className="mod-refresh-btn" onClick={load}>↻ Refresh</button>
      </div>

      {/* Status filter chips */}
      <div className="mod-status-row">
        {["all", "pending", "approved", "rejected", "cancelled"].map((key) => (
          <button
            key={key}
            className={`mod-status-chip ${key} ${statusFilter === key ? "active" : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            <span className="mod-chip-dot" />
            {key === "all"
              ? `All (${counts.all || 0})`
              : `${WITHDRAWAL_STATUS[key]?.label || key} (${counts[key] || 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mod-loading">
          {[1,2,3].map((i) => <div key={i} className="mod-skeleton" style={{ height: 76 }} />)}
        </div>
      ) : error ? (
        <div className="mod-error"><span>⚠</span><p>{error}</p><button onClick={load}>Try Again</button></div>
      ) : filtered.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty-icon">💰</div>
          <p>{statusFilter === "pending" ? "No pending withdrawal requests." : `No ${statusFilter} withdrawals.`}</p>
        </div>
      ) : (
        <div className="order-mod-list">
          {filtered.map((w, idx) => {
            const cs  = cardState[w.withdrawalId] || {};
            const st  = WITHDRAWAL_STATUS[w.status] || WITHDRAWAL_STATUS.pending;
            const exp = expandedId === w.withdrawalId;
            const isPending = w.status === "pending";

            return (
              <div
                key={w.withdrawalId}
                className={`order-mod-card ${exp ? "expanded" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Card header */}
                <div
                  className="order-mod-header"
                  onClick={() => setExpandedId(exp ? null : w.withdrawalId)}
                >
                  <div className="wmod-thumb">🏦</div>

                  <div className="order-mod-info">
                    <div className="order-mod-image-name">{w.sellerName || w.sellerId}</div>
                    <div className="order-mod-meta">
                      <span className="order-mod-id">#{w.withdrawalId?.slice(-10)}</span>
                      <span className="order-mod-date">{formatDate(w.createdAt)}</span>
                      <span className="wmod-bank-chip">{w.bankName}</span>
                    </div>
                  </div>

                  <div className="order-mod-right">
                    <span className="wmod-amount">{formatTHB(w.amount)}</span>
                    <span
                      className="order-status-badge"
                      style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}33` }}
                    >
                      {st.label}
                    </span>
                    <span className="order-mod-chevron">{exp ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded body */}
                {exp && (
                  <div className="order-mod-body">
                    {/* Detail grid */}
                    <div className="order-mod-detail-grid">
                      {[
                        ["Withdrawal ID", w.withdrawalId],
                        ["Seller ID",     w.sellerId],
                        ["Amount",        formatTHB(w.amount), true],
                        ["Bank",          w.bankName],
                        ["Account No.",   w.accountNumber],
                        ["Account Name",  w.accountName],
                        ["Requested",     formatDate(w.createdAt)],
                        w.processedAt && ["Processed", formatDate(w.processedAt)],
                        w.note        && ["Seller Note", w.note],
                      ].filter(Boolean).map(([lbl, val, highlight]) => (
                        <div key={lbl} className="order-mod-detail-item">
                          <span className="order-mod-detail-label">{lbl}</span>
                          <span className={`order-mod-detail-value ${highlight ? "highlight" : ""}`}>{val}</span>
                        </div>
                      ))}
                      {w.adminNote && (
                        <div className="order-mod-detail-item" style={{ gridColumn: "1/-1" }}>
                          <span className="order-mod-detail-label">Admin Note</span>
                          <span className="order-mod-detail-value">{w.adminNote}</span>
                        </div>
                      )}
                    </div>

                    <div className="order-mod-divider" />

                    {/* Actions */}
                    {isPending ? (
                      <>
                        <div className="admin-note-section">
                          <label className="admin-note-label">
                            ADMIN NOTE <span className="wmod-note-req">(required when rejecting)</span>
                          </label>
                          <textarea
                            className="admin-note-input"
                            rows={2}
                            placeholder="Reason for rejection, or transfer reference for approval…"
                            value={cs.note || ""}
                            onChange={(e) => setCard(w.withdrawalId, { note: e.target.value })}
                            disabled={cs.acting}
                          />
                        </div>
                        <div className="order-mod-actions">
                          <button
                            className="btn-verify-approve"
                            disabled={cs.acting}
                            onClick={() => handleProcess(w.withdrawalId, "approved")}
                          >
                            {cs.acting ? "⏳" : "✓"} Approve & Transfer
                          </button>
                          <button
                            className="btn-verify-reject"
                            disabled={cs.acting}
                            onClick={() => handleProcess(w.withdrawalId, "rejected")}
                          >
                            {cs.acting ? "⏳" : "✗"} Reject Request
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        className="verified-badge"
                        style={{
                          background: st.bg,
                          border: `1px solid ${st.color}33`,
                          color: st.color,
                        }}
                      >
                        {w.status === "approved"
                          ? "✓ Approved — funds transferred to seller's bank."
                          : w.status === "rejected"
                          ? "✗ Rejected — seller has been notified."
                          : `Status: ${w.status}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

 
// ════════════════════════════════════════════════════════════════
// TAB 4 — Dashboard
// ════════════════════════════════════════════════════════════════
function DashboardTab({ onTabSwitch }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
 
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStats(await getDashboardStats()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
 
  useEffect(() => { load(); }, [load]);
 
  const STAT_CARDS = stats ? [
    { icon:"👥", color:"amber", num:stats.totalUsers,          label:"Total Users",           nc:"amber" },
    { icon:"🖼",  color:"teal",  num:stats.approvedImages,      label:"Live Images",           nc:"teal"  },
    { icon:"⏳",  color:"amber", num:stats.pendingImages,       label:"Pending Review",        nc:"amber" },
    { icon:"✓",  color:"green", num:stats.completedOrders,     label:"Completed Orders",      nc:"green" },
    { icon:"🔍",  color:"blue",  num:stats.pendingVerification, label:"Awaiting Verification", nc:"blue"  },
    { icon:"💰",  color:"green", num:formatTHB(stats.totalRevenue), label:"Total Revenue",     nc:"green" },
  ] : [];
 
  return (
    <div className="dashboard-panel">
      <div>
        <div className="dashboard-title">Platform Dashboard</div>
        <div className="dashboard-subtitle">Last refreshed {new Date().toLocaleTimeString()}</div>
      </div>
 
      {loading ? (
        <div className="stat-cards">{[1,2,3,4,5,6].map((i) => <div key={i} className="stat-card-skeleton" />)}</div>
      ) : error ? (
        <div className="mod-error"><span>⚠</span><p>{error}</p><button onClick={load}>Retry</button></div>
      ) : (
        <div className="stat-cards">
          {STAT_CARDS.map(({ icon, color, num, label, nc }, i) => (
            <div className="stat-card" key={i} style={{ animationDelay:`${i*0.06}s` }}>
              <div className={`stat-card-icon ${color}`}>{icon}</div>
              <div className={`stat-card-num ${nc}`}>{typeof num === "number" ? num.toLocaleString() : num}</div>
              <div className="stat-card-label">{label}</div>
            </div>
          ))}
        </div>
      )}
 
      <div>
        <div className="dashboard-section-title">Quick Actions</div>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => onTabSwitch("images")}>
            <span>🛡</span> Review Pending Images
            {stats?.pendingImages > 0 && <span className="admin-tab-badge">{stats.pendingImages}</span>}
          </button>
          <button className="quick-action-btn" onClick={() => onTabSwitch("orders")}>
            <span>💳</span> Verify Payment Slips
            {stats?.pendingVerification > 0 && <span className="admin-tab-badge">{stats.pendingVerification}</span>}
          </button>
          <button className="quick-action-btn" onClick={() => onTabSwitch("gallery")}>
            <span>🖼</span> Browse All Images
          </button>
          <button className="quick-action-btn" onClick={load}>
            <span>↻</span> Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}