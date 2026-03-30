// pages/ImageDetail.jsx
// Full detail view for a single image — buy, like, download.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import Toast from "../components/common/Toast";
import { getImageById, deleteImage } from "../services/imageService";
import { createOrder, getMyOrders, getDownloadUrl } from "../services/orderService";
import { formatTHB, formatDate, formatFileSize } from "../utils/format";
import "../assets/styles/ImageDetail.css";

const MOCK_SIMILAR = [
  { imageId: "s1", imageName: "Golden Hour Haze",   watermarkUrl: "https://picsum.photos/seed/s1/400/300",  price: 320 },
  { imageId: "s2", imageName: "Urban Geometry",     watermarkUrl: "https://picsum.photos/seed/s2/400/300",  price: 450 },
  { imageId: "s3", imageName: "Twilight Silhouette", watermarkUrl: "https://picsum.photos/seed/s3/400/300", price: 280 },
];

export default function ImageDetail({ imageId, onBack, onNavigate, isAdmin = false }) {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

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

  // Admin-only
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!imageId) return;
    setLoading(true);
    setError(null);
    getImageById(imageId)
      .then((img) => {
        setImage(img);
        setLikeCount(img.likes ?? 0);
        if (user?.purchasedImages?.includes(imageId)) setOwned(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [imageId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLike = () => {
    if (!user) { showToast("⚠ Sign in to like images", "info"); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    showToast(next ? "❤ Added to favourites" : "♡ Removed from favourites");
  };

  const handleBuy = async () => {
    if (!user) { showToast("⚠ Please sign in to purchase", "info"); return; }
    setBuying(true);
    try {
      const order = await createOrder(imageId);
      showToast(`✓ Order created — orderId: ${order.orderId}`);
      setTimeout(() => showToast("→ Go to Order History to upload your payment slip"), 2000);
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setBuying(false);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const orders = await getMyOrders();
      const order  = orders.find((o) => o.imageId === imageId && o.status === "completed");
      if (!order) { showToast("✗ No completed order found", "error"); return; }
      const url = await getDownloadUrl(order.orderId);
      window.open(url, "_blank");
      showToast("✓ Download started", "success");
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteImage(imageId);
      showToast("✓ Image deleted successfully", "success");
      setTimeout(() => onBack?.(), 1200);
    } catch (e) {
      showToast(`✗ ${e.message}`, "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="detail-page">
        <DetailTopBar />
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

  // ── Error ──────────────────────────────────────────────────
  if (error || !image) {
    return (
      <div className="detail-page">
        <DetailTopBar />
        <div className="error-state">
          <div className="err-icon">🔍</div>
          <h3>Image Not Found</h3>
          <p>{error || "This image may have been removed."}</p>
        </div>
      </div>
    );
  }

  const isOwner    = user?.uid === image.sellerId;
  const vatAmount  = image.price * 0.07;
  const totalWithVat = (image.price + vatAmount).toFixed(0);

  return (
    <div className="detail-page">
      <DetailTopBar />

      <div className="breadcrumb">
        <span onClick={onBack}>Home</span>
        <span className="sep">/</span>
        <span onClick={onBack}>Marketplace</span>
        <span className="sep">/</span>
        <span className="current">{image.imageName}</span>
      </div>

      <div className="detail-main">
        {/* Left column */}
        <div className="detail-left">
          <div className="image-stage" onClick={() => setLightbox(true)} title="Click to enlarge">
            <img src={image.watermarkUrl || `https://picsum.photos/seed/${imageId}/800/600`} alt={image.imageName} loading="lazy" />
            <span className="zoom-hint">🔍</span>
            <span className="watermark-badge">© Imagery — Preview Only</span>
          </div>

          <div className="image-meta-strip">
            <div className="image-title-group">
              <h1>{image.imageName}</h1>
              <span className="category-chip">{image.category}</span>
            </div>
            <div className="like-group">
              <button className={`like-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
                <span className="heart">{liked ? "❤" : "♡"}</span>
                {likeCount.toLocaleString()}
              </button>
              <span className="like-count view-counter">👁 {(image.views ?? 0).toLocaleString()} views</span>
            </div>
          </div>

          {image.description && (
            <p style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.7, marginTop: -8 }}>
              {image.description}
            </p>
          )}

          {image.tags?.length > 0 && (
            <div className="tags-section">
              <div className="tags-label">Tags</div>
              <div className="tags-row">
                {image.tags.map((tag) => <span key={tag} className="tag-pill">#{tag}</span>)}
              </div>
            </div>
          )}

          <div className="similar-section">
            <h3>Similar Images</h3>
            <div className="similar-grid">
              {MOCK_SIMILAR.map((s) => (
                <div key={s.imageId} className="similar-card" onClick={() => onNavigate?.(s.imageId)}>
                  <img src={s.watermarkUrl} alt={s.imageName} loading="lazy" />
                  <div className="similar-card-overlay">
                    <span>{s.imageName} — {formatTHB(s.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="detail-right">
          <div className="purchase-card">
            <div className="purchase-card-header">
              <div className="label">License Price</div>
              <div className="price-display">
                <span className="price-main">{image.price.toLocaleString()}</span>
                <span className="price-currency">THB</span>
              </div>
              <div className="price-vat">Incl. VAT 7% — Total: ฿{parseInt(totalWithVat).toLocaleString()}</div>
            </div>

            <div className="purchase-card-body">
              {/* Admin delete section */}
              {isAdmin && (
                <div className="admin-delete-section">
                  <div className="admin-delete-info">
                    <span className="admin-delete-icon">⚠</span>
                    <span>Admin Action — This cannot be undone</span>
                  </div>
                  {!confirmDelete ? (
                    <button className="btn-admin-delete" onClick={() => setConfirmDelete(true)}>🗑 Delete Image</button>
                  ) : (
                    <div className="confirm-delete-box">
                      <p className="confirm-delete-text">
                        Permanently delete <strong>"{image.imageName}"</strong>?
                      </p>
                      <div className="confirm-delete-actions">
                        <button className="btn-confirm-delete" onClick={handleDelete} disabled={deleting}>
                          {deleting ? "⏳ Deleting…" : "✓ Yes, Delete"}
                        </button>
                        <button className="btn-cancel-delete" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="card-divider" />
                </div>
              )}

              {/* Buyer actions */}
              {!isAdmin && (
                owned ? (
                  <>
                    <div className="owned-banner"><span className="icon">✓</span><span>You own this image</span></div>
                    <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                      {downloading ? "⏳ Preparing…" : "⬇ Download Original"}
                    </button>
                  </>
                ) : isOwner ? (
                  <div className="owned-banner"><span className="icon">📷</span><span>This is your image</span></div>
                ) : (
                  <>
                    <button className="btn-buy" onClick={handleBuy} disabled={buying || !user} title={!user ? "Sign in to purchase" : ""}>
                      {buying ? "⏳ Processing…" : "🛒 Buy Now"}
                    </button>
                    <button className="btn-wishlist" onClick={handleLike}>
                      {liked ? "❤ In Favourites" : "♡ Add to Favourites"}
                    </button>
                    {!user && <p style={{ textAlign: "center", fontSize: "12px", color: "#4a5568" }}>Sign in to purchase this image</p>}
                  </>
                )
              )}

              <div className="card-divider" />
              <div className="license-info">
                <strong>{isAdmin ? <span style={{ color: "var(--admin-accent)" }}>Admin View</span> : "Standard License"}</strong><br />
                {isAdmin
                  ? "Full image details and metadata visible. Deleting will permanently remove this image and all associated orders."
                  : "Commercial use · Digital & print · No attribution required. Original full-resolution file delivered after payment verification."}
              </div>
            </div>
          </div>

          {/* File details */}
          <div className="detail-info-panel">
            <div className="detail-info-header"><span>🗂</span><h4>File Details</h4></div>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-row-label">Picture ID</span>
                <span className="detail-row-value">
                  {showId ? <span className="id-revealed">{imageId}</span> : <span className="id-value">{"•".repeat(8)}</span>}
                  <button className="id-toggle" onClick={() => setShowId(!showId)}>{showId ? "🙈" : "👁"}</button>
                </span>
              </div>
              <div className="detail-row"><span className="detail-row-label">Upload Date</span><span className="detail-row-value">{formatDate(image.uploadDate)}</span></div>
              <div className="detail-row"><span className="detail-row-label">Dimensions</span><span className="detail-row-value">{image.metadata?.width && image.metadata?.height ? `${image.metadata.width} × ${image.metadata.height}` : "—"}</span></div>
              <div className="detail-row"><span className="detail-row-label">Format</span><span className="detail-row-value">{image.metadata?.format?.toUpperCase() || "JPG"}</span></div>
              <div className="detail-row"><span className="detail-row-label">File Size</span><span className="detail-row-value">{formatFileSize(image.metadata?.bytes)}</span></div>
              <div className="detail-row"><span className="detail-row-label">Sales</span><span className="detail-row-value">{image.purchases ?? 0}</span></div>
            </div>
          </div>

          {/* Seller panel */}
          <div className="seller-panel">
            <div className="seller-label">Photographer</div>
            <div className="seller-identity">
              <div className="seller-avatar-placeholder">📷</div>
              <div className="seller-info">
                <div className="seller-name">{image.sellerName || "Unknown Artist"}</div>
                <div className="seller-stats">{image.purchases ?? 0} sales · since {formatDate(image.uploadDate).split(" ").pop()}</div>
              </div>
            </div>
            <button className="btn-view-profile">View Profile & More Images →</button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); setLightbox(false); }}>✕</button>
          <img
            src={image.watermarkUrl || `https://picsum.photos/seed/${imageId}/1200/900`}
            alt={image.imageName}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

function DetailTopBar() {
  const [query, setQuery] = useState("");
  return (
    <header className="detail-topbar">
      <div className="search-container">
        <input type="text" placeholder="Search more images…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="search-btn">🔍</button>
      </div>
      <div className="logo">Imagery</div>
    </header>
  );
}
