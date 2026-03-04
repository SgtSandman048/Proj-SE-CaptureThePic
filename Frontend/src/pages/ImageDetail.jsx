import { useState, useEffect, useCallback } from "react";
import "./ImageDetail.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("accessToken");

// ── Mock similar images (replace with API call) ────────────────
const MOCK_SIMILAR = [
  { imageId: "s1", imageName: "Golden Hour Haze",    watermarkUrl: "https://picsum.photos/seed/s1/400/300",  price: 320 },
  { imageId: "s2", imageName: "Urban Geometry",      watermarkUrl: "https://picsum.photos/seed/s2/400/300",  price: 450 },
  { imageId: "s3", imageName: "Twilight Silhouette",  watermarkUrl: "https://picsum.photos/seed/s3/400/300", price: 280 },
];

// ── Format helpers ─────────────────────────────────────────────
const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

const formatDate = (iso) => {
  if (!iso) return "—";
  let d;
  // Firestore REST serialises as { _seconds, _nanoseconds }
  if (iso?._seconds)   d = new Date(iso._seconds * 1000);
  // Firestore SDK gives { seconds, nanoseconds }
  else if (iso?.seconds) d = new Date(iso.seconds * 1000);
  // Plain ISO string or Unix ms number
  else d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Toast helper hook ──────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ visible: false, msg: "" });
  const show = useCallback((msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg }), 2600);
  }, []);
  return { toast, show };
}

// ══════════════════════════════════════════════════════════════
//  ImageDetail Page
//  Props:
//    imageId  (string)  — Firestore image document ID
//    user     (object)  — { uid, name, role, email }
//    onBack   (fn)      — navigate back / close
//    onNavigate (fn)    — navigate to another imageId
// ══════════════════════════════════════════════════════════════
export default function ImageDetail({ imageId, user, onBack, onNavigate }) {
  const [image,       setImage]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(0);
  const [showId,      setShowId]      = useState(false);
  const [lightbox,    setLightbox]    = useState(false);
  const [buying,      setBuying]      = useState(false);
  const [owned,       setOwned]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast, show: showToast }    = useToast();

  // ── Fetch image detail ───────────────────────────────────────
  useEffect(() => {
    if (!imageId) return;
    setLoading(true);
    setError(null);

    const token = getToken();
    fetch(`${API_BASE}/images/${imageId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Not found");
        const img = data.data;
        setImage(img);
        setLikeCount(img.likes ?? 0);

        // Check if buyer already owns it
        if (user?.purchasedImages?.includes(imageId)) {
          setOwned(true);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [imageId]);

  // ── Close lightbox on Escape ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Like handler (optimistic) ────────────────────────────────
  const handleLike = () => {
    if (!user) { showToast("⚠ Sign in to like images"); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    showToast(next ? "❤ Added to favourites" : "♡ Removed from favourites");
  };

  // ── Buy handler ──────────────────────────────────────────────
  const handleBuy = async () => {
    if (!user) { showToast("⚠ Please sign in to purchase"); return; }
    setBuying(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(`✗ ${data.message || "Order failed"}`);
        return;
      }
      showToast(`✓ Order created — orderId: ${data.data.orderId}`);
      // Redirect to OrderHistory so buyer can upload slip
      setTimeout(() => {
        showToast("→ Go to Order History to upload your payment slip");
      }, 2000);
    } catch {
      showToast("✗ Cannot connect to server");
    } finally {
      setBuying(false);
    }
  };

  // ── Download handler (completed orders) ─────────────────────
  const handleDownload = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const token = getToken();
      // Find the completed order ID for this image
      const ordersRes = await fetch(`${API_BASE}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      const order = ordersData.data?.find(
        (o) => o.imageId === imageId && o.status === "completed"
      );
      if (!order) { showToast("✗ No completed order found"); return; }

      const dlRes = await fetch(`${API_BASE}/orders/${order.orderId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dlData = await dlRes.json();
      if (!dlRes.ok) { showToast(`✗ ${dlData.message}`); return; }

      // Open signed URL in new tab
      window.open(dlData.data.downloadUrl, "_blank");
      showToast("✓ Download started");
    } catch {
      showToast("✗ Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  RENDER — Loading
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="detail-page">
        <DetailTopBar onBack={onBack} />
        <div className="detail-main">
          <div className="detail-left">
            <div className="skeleton skeleton-img" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
          </div>
          <div className="detail-right">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER — Error
  // ─────────────────────────────────────────────────────────────
  if (error || !image) {
    return (
      <div className="detail-page">
        <DetailTopBar onBack={onBack} />
        <div className="error-state">
          <div className="err-icon">🔍</div>
          <h3>Image Not Found</h3>
          <p>{error || "This image may have been removed."}</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER — Main
  // ─────────────────────────────────────────────────────────────
  const isOwner = user?.uid === image.sellerId;
  const vatAmount = image.price * 0.07;
  const totalWithVat = (image.price + vatAmount).toFixed(0);

  return (
    <div className="detail-page">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <DetailTopBar onBack={onBack} />

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span onClick={onBack}>Home</span>
        <span className="sep">/</span>
        <span onClick={onBack}>Marketplace</span>
        <span className="sep">/</span>
        <span className="current">{image.imageName}</span>
      </div>

      {/* ── Two-Column Layout ─────────────────────────────── */}
      <div className="detail-main">

        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="detail-left">

          {/* Image Stage */}
          <div
            className="image-stage"
            onClick={() => setLightbox(true)}
            title="Click to enlarge"
          >
            <img
              src={image.watermarkUrl || `https://picsum.photos/seed/${imageId}/800/600`}
              alt={image.imageName}
              loading="lazy"
            />
            <span className="zoom-hint">🔍</span>
            <span className="watermark-badge">© Imagery — Preview Only</span>
          </div>

          {/* Title + Like */}
          <div className="image-meta-strip">
            <div className="image-title-group">
              <h1>{image.imageName}</h1>
              <span className="category-chip">{image.category}</span>
            </div>

            <div className="like-group">
              <button
                className={`like-btn ${liked ? "liked" : ""}`}
                onClick={handleLike}
                title="Like this image"
              >
                <span className="heart">{liked ? "❤" : "♡"}</span>
                {likeCount.toLocaleString()}
              </button>
              <span className="like-count view-counter">
                👁 {(image.views ?? 0).toLocaleString()} views
              </span>
            </div>
          </div>

          {/* Description (if present) */}
          {image.description && (
            <p style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.7, marginTop: -8 }}>
              {image.description}
            </p>
          )}

          {/* Tags */}
          {image.tags?.length > 0 && (
            <div className="tags-section">
              <div className="tags-label">Tags</div>
              <div className="tags-row">
                {image.tags.map((tag) => (
                  <span key={tag} className="tag-pill">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Similar Images */}
          <div className="similar-section">
            <h3>Similar Images</h3>
            <div className="similar-grid">
              {MOCK_SIMILAR.map((s) => (
                <div
                  key={s.imageId}
                  className="similar-card"
                  onClick={() => onNavigate?.(s.imageId)}
                  title={s.imageName}
                >
                  <img src={s.watermarkUrl} alt={s.imageName} loading="lazy" />
                  <div className="similar-card-overlay">
                    <span>{s.imageName} — {formatTHB(s.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        {/* ════ end LEFT ════ */}

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="detail-right">

          {/* ── Purchase Card ──────────────────────────────── */}
          <div className="purchase-card">

            <div className="purchase-card-header">
              <div className="label">License Price</div>
              <div className="price-display">
                <span className="price-main">{image.price.toLocaleString()}</span>
                <span className="price-currency">THB</span>
              </div>
              <div className="price-vat">
                Incl. VAT 7% — Total: ฿{parseInt(totalWithVat).toLocaleString()}
              </div>
            </div>

            <div className="purchase-card-body">

              {/* ── If already owned ──────────────────────── */}
              {owned ? (
                <>
                  <div className="owned-banner">
                    <span className="icon">✓</span>
                    <span>You own this image</span>
                  </div>
                  <button
                    className="btn-download"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? "⏳ Preparing…" : "⬇ Download Original"}
                  </button>
                </>
              ) : isOwner ? (
                /* ── Seller owns this — no buy button ──────── */
                <div className="owned-banner">
                  <span className="icon">📷</span>
                  <span>This is your image</span>
                </div>
              ) : (
                /* ── Standard buy flow ─────────────────────── */
                <>
                  <button
                    className="btn-buy"
                    onClick={handleBuy}
                    disabled={buying || !user}
                    title={!user ? "Sign in to purchase" : ""}
                  >
                    {buying ? "⏳ Processing…" : "🛒 Buy Now"}
                  </button>

                  <button className="btn-wishlist" onClick={handleLike}>
                    {liked ? "❤ In Favourites" : "♡ Add to Favourites"}
                  </button>

                  {!user && (
                    <p style={{ textAlign: "center", fontSize: "12px", color: "#4a5568" }}>
                      Sign in to purchase this image
                    </p>
                  )}
                </>
              )}

              <div className="card-divider" />

              <div className="license-info">
                <strong>Standard License</strong><br />
                Commercial use · Digital & print · No attribution required.
                Original full-resolution file delivered after payment verification.
              </div>

            </div>
          </div>

          {/* ── Detail Info Panel ──────────────────────────── */}
          <div className="detail-info-panel">
            <div className="detail-info-header">
              <span>🗂</span>
              <h4>File Details</h4>
            </div>
            <div className="detail-rows">

              {/* Picture ID with reveal toggle */}
              <div className="detail-row">
                <span className="detail-row-label">Picture ID</span>
                <span className="detail-row-value">
                  {showId ? (
                    <span className="id-revealed">{imageId}</span>
                  ) : (
                    <span className="id-value">{"•".repeat(8)}</span>
                  )}
                  <button
                    className="id-toggle"
                    onClick={() => setShowId(!showId)}
                    title={showId ? "Hide ID" : "Reveal ID"}
                  >
                    {showId ? "🙈" : "👁"}
                  </button>
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-row-label">Upload Date</span>
                <span className="detail-row-value">{formatDate(image.uploadDate)}</span>
              </div>

              <div className="detail-row">
                <span className="detail-row-label">Dimensions</span>
                <span className="detail-row-value">
                  {image.metadata?.width && image.metadata?.height
                    ? `${image.metadata.width} × ${image.metadata.height}`
                    : "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-row-label">Format</span>
                <span className="detail-row-value">
                  {image.metadata?.format?.toUpperCase() || "JPG"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-row-label">File Size</span>
                <span className="detail-row-value">
                  {image.metadata?.bytes
                    ? image.metadata.bytes < 1024 * 1024
                      ? `${(image.metadata.bytes / 1024).toFixed(0)} KB`
                      : `${(image.metadata.bytes / 1024 / 1024).toFixed(1)} MB`
                    : "—"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-row-label">Sales</span>
                <span className="detail-row-value">{image.purchases ?? 0}</span>
              </div>

            </div>
          </div>

          {/* ── Seller Panel ────────────────────────────────── */}
          <div className="seller-panel">
            <div className="seller-label">Photographer</div>
            <div className="seller-identity">
              <div className="seller-avatar-placeholder">📷</div>
              <div className="seller-info">
                <div className="seller-name">
                  {image.sellerName || "Unknown Artist"}
                </div>
                <div className="seller-stats">
                  {image.purchases ?? 0} sales · since{" "}
                  {formatDate(image.uploadDate).split(" ").pop()}
                </div>
              </div>
            </div>
            <button className="btn-view-profile">
              View Profile & More Images →
            </button>
          </div>

        </div>
        {/* ════ end RIGHT ════ */}

      </div>

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
          >
            ✕
          </button>
          <img
            src={image.watermarkUrl || `https://picsum.photos/seed/${imageId}/1200/900`}
            alt={image.imageName}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────── */}
      <div className={`toast ${toast.visible ? "visible" : ""}`}>
        {toast.msg}
      </div>

    </div>
  );
}

// ── Internal: reusable top bar ─────────────────────────────────
function DetailTopBar({ onBack }) {
  const [query, setQuery] = useState("");
  return (
    <header className="detail-topbar">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search more images…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="search-btn">🔍</button>
      </div>
      <div className="logo">Imagery</div>
    </header>
  );
}