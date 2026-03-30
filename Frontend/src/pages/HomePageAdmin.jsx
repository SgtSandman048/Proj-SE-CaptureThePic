import { useState, useEffect } from "react";
import "./HomePageAdmin.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("accessToken");

const FILTERS = ["All", "Nature", "Architecture", "People", "Abstract", "Animals", "Travel", "Food"];
const SKELETON_HEIGHTS = [220, 160, 280, 195, 240, 170, 300, 185, 210, 260, 150, 230];

const PREF_GROUPS = [
  { icon: "🌿", label: "ธรรมชาติ",          tags: ["Nature","Landscape","Sea","Mountain","Forest","Flower"] },
  { icon: "👤", label: "บุคคล",              tags: ["Portrait","Fashion","People","Lifestyle","Street Photography"] },
  { icon: "🏢", label: "สถาปัตยกรรม",       tags: ["Architecture","Building","Interior","Cityscape","Minimalist"] },
  { icon: "🍕", label: "อาหาร",              tags: ["Food","Drink","Cafe","Bakery","Cooking"] },
  { icon: "💻", label: "ธุรกิจ/เทคโนโลยี",  tags: ["Business","Technology","Office","Working","Remote Work"] },
];

export default function HomePageAdmin({ user, onLogout, onOrdersClick, onNotificationsClick }) {
  const [prefOpen,        setPrefOpen]        = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [images,          setImages]          = useState([]);
  const [loadingImages,   setLoadingImages]   = useState(true);
  const [activeFilter,    setActiveFilter]    = useState("All");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [notifCount,      setNotifCount]      = useState(null);

  // Fetch notification count
  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/notifications/count`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setNotifCount(data.data?.count ?? 0);
        else setNotifCount(0);
      })
      .catch(() => setNotifCount(0));
  }, []);

  // Fetch gallery images
  useEffect(() => {
    const token = getToken();
    const params = new URLSearchParams();
    if (activeFilter !== "All") params.set("category", activeFilter.toLowerCase());
    if (searchQuery)            params.set("search",   searchQuery);

    setLoadingImages(true);
    fetch(`${API_BASE}/images?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setImages(data.data?.images || []); })
      .catch(() => {})
      .finally(() => setLoadingImages(false));
  }, [activeFilter, searchQuery]);

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark admin-mark">⚙</div>
          <span className="brand-text">Imagery</span>
          <span className="admin-badge">ADMIN</span>
        </div>

        <nav className="nav-links">
          <span className="nav-section-label">Menu</span>

          <a href="#" className="active">🏠 Home</a>

          <a href="#" onClick={(e) => { e.preventDefault(); setPrefOpen(!prefOpen); }}>
            ☑ Preference
          </a>

          {prefOpen && (
            <div className="pref-submenu">
              {PREF_GROUPS.map(({ icon, label, tags }) => (
                <div className="tag-group" key={label}>
                  <div className="tag-header">{icon} {label}</div>
                  <div className="subtags">
                    {tags.map((t) => (
                      <label key={t}><input type="checkbox" /> {t}</label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <span className="nav-section-label" style={{ marginTop: 8 }}>Admin</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onNotificationsClick?.(); }}>
            🔔 Notifications
            {notifCount !== null && notifCount > 0 && (
              <span className="nav-notif-badge">{notifCount}</span>
            )}
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); onOrdersClick?.(); }}>📦 My Orders</a>
          <a href="#">👥 Users</a>
          <a href="#">📊 Dashboard</a>
          <a href="#">🗂 All Images</a>
        </nav>

        <div className="user-account">
          <div className="user-label">Your Account</div>
          <div className="profile">
            <div className="profile-avatar admin-avatar">⚙</div>
            <div>
              <div className="profile-name">{user?.name ?? "Admin"}</div>
              <div className="profile-role admin-role-tag">administrator</div>
            </div>
          </div>
          <a href="#" className="settings">⚙ Settings</a>
          {onLogout && (
            <a href="#" className="settings logout-btn"
              onClick={(e) => { e.preventDefault(); onLogout(); }}>
              🚪 Sign Out
            </a>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* ── Top Bar ── */}
        <header className="black-top-bar">
          <div className="top-bar-content">
            <div className="search-container">
              <button className="search-btn">🔍</button>
              <input
                type="text"
                placeholder="Search images, styles, moods…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="top-bar-right">
              {/* Admin label replaces upload button */}
              <span className="admin-topbar-chip">⚙ Admin Mode</span>
              <div className="logo">
                <span className="logo-admin-prefix">(ADMIN)</span> Imagery
              </div>
            </div>
          </div>
        </header>

        {/* ── Notification Bar ── */}
        <div
          className="admin-notif-bar"
          onClick={() => onNotificationsClick?.()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNotificationsClick?.()}
        >
          <div className="admin-notif-bar-left">
            <span className="notif-bar-icon">🔔</span>
            <span className="notif-bar-text">
              {notifCount === null
                ? "Loading notifications…"
                : notifCount === 0
                  ? "You have no new notifications"
                  : `You have ${notifCount} notification${notifCount !== 1 ? "s" : ""}`}
            </span>
            {notifCount !== null && notifCount > 0 && (
              <span className="notif-bar-count">{notifCount}</span>
            )}
          </div>
          <span className="notif-bar-cta">
            View all →
          </span>
        </div>

        {/* ── Gallery Section ── */}
        <section className="gallery-section" style={{ paddingTop: 24 }}>
          <div className="section-header">
            <h2 className="section-title">
              {activeFilter === "All" ? "Explore Images" : activeFilter}
            </h2>
            <a className="section-link" href="#" onClick={(e) => { e.preventDefault(); setActiveFilter("All"); }}>
              {activeFilter !== "All" ? "Clear filter ✕" : ""}
            </a>
          </div>

          <div className="gallery-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`filter-chip ${activeFilter === f ? "active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loadingImages ? (
            <div className="gallery-skeleton">
              {SKELETON_HEIGHTS.map((h, i) => (
                <div key={i} className="gallery-skeleton-card" style={{ height: h }} />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="gallery-empty">
              <div className="empty-icon">🖼</div>
              <p>No images found{activeFilter !== "All" ? ` in "${activeFilter}"` : ""}.</p>
            </div>
          ) : (
            <div className="image-gallery">
              {images.map((img) => (
                <GalleryCard
                  key={img.imageId}
                  image={img}
                  onClick={() => setSelectedImageId(img.imageId)}
                  isAdmin
                />
              ))}
            </div>
          )}
        </section>

        {/* No FAB for admin */}
      </main>
    </div>
  );
}

// ── Gallery Card (admin variant) ────────────────────────────────
function GalleryCard({ image, onClick, isAdmin }) {
  const src = image.watermarkUrl || `https://picsum.photos/seed/${image.imageId}/400`;
  const price = image.price
    ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(image.price)
    : "";

  return (
    <div className="gallery-card" onClick={onClick}>
      <img src={src} alt={image.imageName} loading="lazy" />
      <div className="gallery-card-overlay">
        <div className="gallery-card-name">{image.imageName}</div>
        {price && <div className="gallery-card-price">{price}</div>}
        {isAdmin && (
          <div className="gallery-card-admin-actions">
            <button className="admin-card-btn" onClick={(e) => { e.stopPropagation(); }}>✏ Edit</button>
            <button className="admin-card-btn danger" onClick={(e) => { e.stopPropagation(); }}>🗑 Delete</button>
          </div>
        )}
      </div>
      <div className="gallery-card-like">
        ♡ {image.likes ?? 0}
      </div>
    </div>
  );
}
