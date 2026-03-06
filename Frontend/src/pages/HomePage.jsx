import { useState, useEffect } from "react";
import "./HomePage.css";
import ImageDetail from "./ImageDetail";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("accessToken");

const FILTERS = ["All", "Nature", "Architecture", "People", "Abstract", "Animals", "Travel", "Food"];

const SKELETON_HEIGHTS = [220, 160, 280, 195, 240, 170, 300, 185, 210, 260, 150, 230];

const CATEGORIES = [
  { label: "Illustration", seed: "illus",  emoji: "🎨" },
  { label: "Painting",     seed: "paint",  emoji: "🖼" },
  { label: "Photoshoot",   seed: "photo",  emoji: "📷" },
  { label: "Photoshop",    seed: "pshop",  emoji: "✏️" },
];

const PREF_GROUPS = [
  { icon: "🌿", label: "ธรรมชาติ",          tags: ["Nature","Landscape","Sea","Mountain","Forest","Flower"] },
  { icon: "👤", label: "บุคคล",              tags: ["Portrait","Fashion","People","Lifestyle","Street Photography"] },
  { icon: "🏢", label: "สถาปัตยกรรม",       tags: ["Architecture","Building","Interior","Cityscape","Minimalist"] },
  { icon: "🍕", label: "อาหาร",              tags: ["Food","Drink","Cafe","Bakery","Cooking"] },
  { icon: "💻", label: "ธุรกิจ/เทคโนโลยี",  tags: ["Business","Technology","Office","Working","Remote Work"] },
];

export default function HomePage({ user, onLogout, onOrdersClick }) {
  const [prefOpen,         setPrefOpen]         = useState(false);
  const [selectedImageId,  setSelectedImageId]  = useState(null);
  const [images,           setImages]           = useState([]);
  const [loadingImages,    setLoadingImages]    = useState(true);
  const [activeFilter,     setActiveFilter]     = useState("All");
  const [searchQuery,      setSearchQuery]      = useState("");

  // Fetch gallery images from API
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

  // ── If an image is selected → render ImageDetail in main slot ──
  if (selectedImageId) {
    return (
      <div className="app-container">
        <Sidebar
          user={user}
          onLogout={onLogout}
          prefOpen={prefOpen}
          setPrefOpen={setPrefOpen}
          activeNav="home"
          onHomeClick={() => setSelectedImageId(null)}
          onOrdersClick={onOrdersClick}
        />
        <ImageDetail
          imageId={selectedImageId}
          user={user}
          onBack={() => setSelectedImageId(null)}
          onNavigate={(id) => setSelectedImageId(id)}
        />
      </div>
    );
  }

  // ── Normal home view ────────────────────────────────────────
  return (
    <div className="app-container">
      <Sidebar
        user={user}
        onLogout={onLogout}
        prefOpen={prefOpen}
        setPrefOpen={setPrefOpen}
        activeNav="home"
        onOrdersClick={onOrdersClick}
      />

      <main className="main-content">

        {/* ── Top Bar ──────────────────────────────────────── */}
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
              {user?.role === "seller" && (
                <button className="topbar-upload-btn">
                  ＋ Upload
                </button>
              )}
              <div className="logo">Imagery</div>
            </div>
          </div>
        </header>

        {/* ── Category Strip ────────────────────────────────── */}
        <section className="categories">
          <div className="section-header">
            <h2 className="section-title">Popular Image</h2>
            <a className="section-link" href="#">See all →</a>
          </div>
          <div className="category-grid">
            {CATEGORIES.map(({ label, seed, emoji }) => (
              <div
                className="cat-item"
                key={label}
                onClick={() => setActiveFilter(label)}
              >
                <img
                  src={`https://picsum.photos/seed/${seed}/400/300`}
                  alt={label}
                  loading="lazy"
                />
                <div className="cat-item-overlay" />
                <p>{emoji} {label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gallery ──────────────────────────────────────── */}
        <section className="gallery-section">

          {/* Filter chips */}
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

          {/* Skeleton */}
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
                />
              ))}
            </div>
          )}
        </section>

        {/* FAB — upload shortcut */}
        <button className="fab-add" title="Upload image">＋</button>

      </main>
    </div>
  );
}

// ── Sidebar component ───────────────────────────────────────────
function Sidebar({ user, onLogout, prefOpen, setPrefOpen, activeNav, onHomeClick, onOrdersClick, onNotificationsClick }) {
  return (
    <aside className="sidebar">

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-mark">✦</div>
        <span className="brand-text">Imagery</span>
      </div>

      {/* Nav */}
      <nav className="nav-links">
        <span className="nav-section-label">Menu</span>

        <a
          href="#"
          className={activeNav === "home" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); onHomeClick?.(); }}
        >
          🏠 Home
        </a>

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setPrefOpen(!prefOpen); }}
        >
          ☑ Preference
        </a>

        {/* Preference dropdown */}
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



        <a href="#" onClick={(e) => { e.preventDefault(); onOrdersClick?.(); }}>📦 My Orders</a>
        <a href="#" onClick={(e) => { e.preventDefault(); alert("Notifications coming soon!"); }}>🔔 Notifications</a>
      </nav>

      {/* User */}
      <div className="user-account">
        <div className="user-label">Your Account</div>
        <div className="profile">
          <div className="profile-avatar">👤</div>
          <div>
            <div className="profile-name">{user?.name ?? "Guest"}</div>
            <div className="profile-role">{user?.role ?? "buyer"}</div>
          </div>
        </div>
        <a href="#" className="settings">⚙ Settings</a>
        {onLogout && (
          <a
            href="#"
            className="settings logout-btn"
            onClick={(e) => { e.preventDefault(); onLogout(); }}
          >
            🚪 Sign Out
          </a>
        )}
      </div>

    </aside>
  );
}

// ── Gallery Card ────────────────────────────────────────────────
function GalleryCard({ image, onClick }) {
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
      </div>
      <div className="gallery-card-like">
        ♡ {image.likes ?? 0}
      </div>
    </div>
  );
}