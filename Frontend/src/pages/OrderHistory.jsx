import { useState, useEffect, useRef } from "react";
import { getMyOrders, uploadSlip, getDownloadUrl } from "../services/orderService";
import "./OrderHistory.css";

// ── Status config ──────────────────────────────────────────────
const STATUS = {
  pending:   { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "⏳" },
  checking:  { label: "Checking",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "🔍" },
  completed: { label: "Completed",  color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "✓"  },
  rejected:  { label: "Rejected",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "✗"  },
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n ?? 0);

// ── Toast hook ─────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ visible: false, msg: "", type: "info" });
  const show = (msg, type = "info") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };
  return { toast, show };
}

// ══════════════════════════════════════════════════════════════
//  OrderHistory Page
// ══════════════════════════════════════════════════════════════
export default function OrderHistory({ user, onBack }) {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState("all");
  const [expandedId,  setExpandedId]  = useState(null);
  const { toast, show: showToast }    = useToast();

  // ── Fetch orders ─────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Filter by tab ────────────────────────────────────────────
  const filtered = activeTab === "all"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="oh-page">

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="oh-header">
        <button className="oh-back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="oh-header-center">
          <h1>My Orders</h1>
          <p className="oh-subtitle">Track your purchases and download originals</p>
        </div>
        <button className="oh-refresh-btn" onClick={fetchOrders} title="Refresh">
          ↻
        </button>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <div className="oh-tabs">
        {["all", "pending", "checking", "completed", "rejected"].map((tab) => (
          <button
            key={tab}
            className={`oh-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" ? "All" : STATUS[tab]?.icon + " " + STATUS[tab]?.label}
            {tab === "all"
              ? <span className="oh-tab-count">{orders.length}</span>
              : counts[tab]
              ? <span className="oh-tab-count">{counts[tab]}</span>
              : null}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="oh-content">
        {loading ? (
          <div className="oh-loading">
            {[1,2,3].map((i) => <div key={i} className="oh-skeleton" />)}
          </div>
        ) : error ? (
          <div className="oh-error">
            <span>⚠</span>
            <p>{error}</p>
            <button onClick={fetchOrders}>Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="oh-empty">
            <div className="oh-empty-icon">🛒</div>
            <p>No {activeTab !== "all" ? activeTab : ""} orders yet.</p>
            <button className="oh-browse-btn" onClick={onBack}>Browse Images</button>
          </div>
        ) : (
          <div className="oh-list">
            {filtered.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                expanded={expandedId === order.orderId}
                onToggle={() => setExpandedId(
                  expandedId === order.orderId ? null : order.orderId
                )}
                onRefresh={fetchOrders}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
      <div className={`oh-toast oh-toast--${toast.type} ${toast.visible ? "visible" : ""}`}>
        {toast.msg}
      </div>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  OrderCard
// ══════════════════════════════════════════════════════════════
function OrderCard({ order, expanded, onToggle, onRefresh, showToast }) {
  const [uploading,    setUploading]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const fileRef = useRef(null);

  const st = STATUS[order.status] || STATUS.pending;

  // ── Upload slip ──────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("✗ Only JPEG, PNG, WEBP allowed", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("✗ File too large (max 10 MB)", "error");
      return;
    }

    setUploading(true);
    try {
      await uploadSlip(order.orderId, file);
      showToast("✓ Slip uploaded — waiting for verification", "success");
      onRefresh();
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  // ── Download original ────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getDownloadUrl(order.orderId);
      window.open(url, "_blank");
      showToast("✓ Download started", "success");
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`oh-card ${expanded ? "expanded" : ""}`}>

      {/* ── Card Header (always visible) ────────────────────── */}
      <div className="oh-card-header" onClick={onToggle}>

        <div className="oh-card-thumb">
          🖼
        </div>

        <div className="oh-card-info">
          <div className="oh-card-name">{order.imageName || "Untitled Image"}</div>
          <div className="oh-card-meta">
            <span className="oh-card-date">{formatDate(order.orderDate)}</span>
            <span className="oh-card-id">#{order.orderId?.slice(-8)}</span>
          </div>
        </div>

        <div className="oh-card-right">
          <span
            className="oh-status-badge"
            style={{ color: st.color, background: st.bg }}
          >
            {st.icon} {st.label}
          </span>
          <span className="oh-chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded Panel ──────────────────────────────────── */}
      {expanded && (
        <div className="oh-card-body">

          <div className="oh-card-detail-row">
            <span>Order ID</span>
            <span className="mono">{order.orderId}</span>
          </div>
          <div className="oh-card-detail-row">
            <span>Order Date</span>
            <span>{formatDate(order.orderDate)}</span>
          </div>
          <div className="oh-card-detail-row">
            <span>Status</span>
            <span style={{ color: st.color }}>{st.icon} {st.label}</span>
          </div>

          <div className="oh-card-divider" />

          {/* ── Status: pending → show upload slip ──────────── */}
          {order.status === "pending" && (
            <div className="oh-slip-zone">
              <p className="oh-slip-title">Upload Payment Slip</p>
              <p className="oh-slip-hint">
                Transfer payment and upload your slip to proceed.
              </p>

              <div
                className={`oh-drop-zone ${dragOver ? "drag-over" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleUpload(e.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => handleUpload(e.target.files[0])}
                />
                <div className="oh-drop-icon">📎</div>
                <p>{uploading ? "Uploading…" : "Click or drag & drop slip image"}</p>
                <span>JPEG · PNG · WEBP · max 10 MB</span>
              </div>
            </div>
          )}

          {/* ── Status: checking ────────────────────────────── */}
          {order.status === "checking" && (
            <div className="oh-checking-banner">
              <span>🔍</span>
              <div>
                <strong>Slip received</strong>
                <p>Our team is verifying your payment. This usually takes 1–2 business days.</p>
              </div>
            </div>
          )}

          {/* ── Status: completed → show download ───────────── */}
          {order.status === "completed" && (
            <button
              className="oh-download-btn"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "⏳ Preparing…" : "⬇ Download Original File"}
            </button>
          )}

          {/* ── Status: rejected ────────────────────────────── */}
          {order.status === "rejected" && (
            <div className="oh-rejected-banner">
              <span>✗</span>
              <div>
                <strong>Payment Rejected</strong>
                <p>Your slip could not be verified. Please contact support or try again.</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}