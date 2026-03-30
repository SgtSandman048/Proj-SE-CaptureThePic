// pages/OrderHistory.jsx
// Displays the current user's orders and allows slip upload / download.

import { useState, useEffect, useRef } from "react";
import { getMyOrders, uploadSlip, getDownloadUrl, cancelOrder, getWatermarkedUrl } from "../services/orderService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/common/Toast";
import { formatDate, formatTHB } from "../utils/format";
import "../assets/styles/OrderHistory.css";

const STATUS = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "⏳" },
  checking:  { label: "Checking",  color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "🔍" },
  completed: { label: "Completed", color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "✓"  },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "✗"  },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: "🚫" },
};

export default function OrderHistory({ onBack }) {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const { toast, showToast }        = useToast();

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

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);
  const counts   = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  return (
    <div className="oh-page">
      <header className="oh-header">
        <button className="oh-back-btn" onClick={onBack}>← Back</button>
        <div className="oh-header-center">
          <h1>My Orders</h1>
          <p className="oh-subtitle">Track your purchases and download originals</p>
        </div>
        <button className="oh-refresh-btn" onClick={fetchOrders} title="Refresh">↻</button>
      </header>

      <div className="oh-tabs">
        {["all", "pending", "checking", "completed", "rejected", "cancelled"].map((tab) => (
          <button
            key={tab}
            className={`oh-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" ? "All" : `${STATUS[tab]?.icon} ${STATUS[tab]?.label}`}
            {tab === "all"
              ? <span className="oh-tab-count">{orders.length}</span>
              : counts[tab] ? <span className="oh-tab-count">{counts[tab]}</span> : null}
          </button>
        ))}
      </div>

      <div className="oh-content">
        {loading ? (
          <div className="oh-loading">{[1, 2, 3].map((i) => <div key={i} className="oh-skeleton" />)}</div>
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
                onToggle={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
                onRefresh={fetchOrders}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

// ── CopyField — click to copy account numbers ──────────────────
function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button className={`oh-copy-field ${copied ? "copied" : ""}`} onClick={copy} type="button">
      <span className="oh-copy-value">{value}</span>
      <span className="oh-copy-icon">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

// ── CopyField ──────────────────────────────────────────────────
function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button className={`oh-copy-field ${copied ? "copied" : ""}`} onClick={copy} type="button">
      <span className="oh-copy-value">{value}</span>
      <span className="oh-copy-icon">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

// ── OrderCard ──────────────────────────────────────────────────
function OrderCard({ order, expanded, onToggle, onRefresh, showToast }) {
  const [uploading,   setUploading]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef(null);

  const st = STATUS[order.status] || STATUS.pending;

  const handleUpload = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      showToast("✗ Only JPEG, PNG, WEBP allowed", "error"); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("✗ File too large (max 10 MB)", "error"); return;
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

  const handleWatermarked = async () => {
    setDownloading(true);
    try {
      const url = await getWatermarkedUrl(order.orderId);
      window.open(url, "_blank");
      showToast("✓ Download started", "success");
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(order.orderId);
      showToast("✓ Order cancelled", "success");
      onRefresh();
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className={`oh-card ${expanded ? "expanded" : ""}`}>
      <div className="oh-card-header" onClick={onToggle}>
        <div className="oh-card-thumb">🖼</div>
        <div className="oh-card-info">
          <div className="oh-card-name">{order.imageName || "Untitled Image"}</div>
          <div className="oh-card-meta">
            <span className="oh-card-date">{formatDate(order.orderDate)}</span>
            <span className="oh-card-id">#{order.orderId?.slice(-8)}</span>
          </div>
        </div>
        <div className="oh-card-right">
          <span className="oh-status-badge" style={{ color: st.color, background: st.bg }}>
            {st.icon} {st.label}
          </span>
          <span className="oh-chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="oh-card-body">
          <div className="oh-card-detail-row"><span>Order ID</span><span className="mono">{order.orderId}</span></div>
          <div className="oh-card-detail-row"><span>Order Date</span><span>{formatDate(order.orderDate)}</span></div>
          <div className="oh-card-detail-row"><span>Status</span><span style={{ color: st.color }}>{st.icon} {st.label}</span></div>
          <div className="oh-card-divider" />

          {order.status === "pending" && (
            <div className="oh-slip-zone">
              <div className="oh-qr-section">
                <p className="oh-slip-title">Payment Details</p>
                <p className="oh-slip-hint">Transfer the exact amount then upload your slip below.</p>
                <div className="oh-payment-panel">
                  <div className="oh-payment-qr">
                    <div className="oh-qr-label">PromptPay QR</div>
                    <div className="oh-qr-box">
                      <img
                        src="https://res.cloudinary.com/dw4bi2d8a/image/upload/v1772868215/645709013_2150592682449296_1042520382335589631_n_ujmnyk.jpg"
                        alt="Payment QR Code"
                        className="oh-qr-img"
                      />
                    </div>
                  </div>
                  <div className="oh-bank-info">
                    <div className="oh-bank-row oh-bank-header">
                      <span className="oh-bank-name">Bank Account</span>

                    </div>
                    <div className="oh-bank-divider" />
                    <div className="oh-bank-row"><span className="oh-bank-label">Account Name</span><span className="oh-bank-value">Thanakrit Muangrak</span></div>
                    <div className="oh-bank-row"><span className="oh-bank-label">Account No.</span><CopyField value="907-7-704782" /></div>
                    <div className="oh-bank-row"><span className="oh-bank-label">Account Bank</span><span className="oh-bank-value">Bangkok Bank Public Company Limited</span></div>
                    <div className="oh-bank-divider" />
                    <div className="oh-bank-row oh-amount-row">
                      <span className="oh-bank-label">Amount to Pay</span>
                      <span className="oh-amount-value">{formatTHB(order.price)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="oh-card-divider" />
              <p className="oh-slip-title">Upload Payment Slip</p>
              <div
                className={`oh-drop-zone ${dragOver ? "drag-over" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
              >
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files[0])} />
                <div className="oh-drop-icon">📎</div>
                <p>{uploading ? "Uploading…" : "Click or drag & drop slip image"}</p>
                <span>JPEG · PNG · WEBP · max 10 MB</span>
              </div>

              <button className="oh-download-btn" onClick={handleWatermarked} disabled={downloading}>
                {downloading ? "⏳ Preparing…" : "View Watermarked Image"}
              </button>

              <button className="oh-cancel-btn" onClick={() => setShowConfirm(true)} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "✗ Cancel Order"}
              </button>

              {showConfirm && (
                <div className="oh-confirm-overlay">
                  <div className="oh-confirm-box">
                    <p>Cancel this order?</p>
                    <div className="oh-confirm-actions">
                      <button className="oh-confirm-no" onClick={() => setShowConfirm(false)}>Keep</button>
                      <button className="oh-confirm-yes" onClick={handleCancel} disabled={cancelling}>
                        {cancelling ? "Cancelling…" : "Yes, Cancel"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {order.status === "checking" && (
            <div className="oh-checking-banner">
              <span>🔍</span>
              <div>
                <strong>Slip received</strong>
                <p>Our team is verifying your payment. This usually takes 1–2 business days.</p>
              </div>
            </div>
          )}

          {order.status === "completed" && (
            <button className="oh-download-btn" onClick={handleDownload} disabled={downloading}>
              {downloading ? "⏳ Preparing…" : "⬇ Download Original File"}
            </button>
          )}

          {order.status === "rejected" && (
            <div className="oh-rejected-banner">
              <span>✗</span>
              <div>
                <strong>Payment Rejected</strong>
                {/* <p></p> */}
                <p>{order.adminNote || "Your slip could not be verified. Please contact support or try again."}</p>
              </div>
              
            </div>
            
          )}
        </div>
      )}
    </div>
  );
}
