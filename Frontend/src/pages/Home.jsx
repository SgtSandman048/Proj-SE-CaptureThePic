// pages/Home.jsx
// Main gallery page for regular (buyer/seller) users.

import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Toast from "../components/common/Toast";
import ImageDetail from "./ImageDetail";
import UploadImage from "./UploadImage";
import Profile from "./Profile";
import { getImages } from "../services/imageService";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import "../assets/styles/HomePage.css";

const FILTERS = ["All", "Nature", "Architecture", "People", "Abstract", "Animals", "Travel", "Food"];
const SKELETON_HEIGHTS = [220, 160, 280, 195, 240, 170, 300, 185, 210, 260, 150, 230];

const CATEGORIES = [
  { label: "Photos",             seed: "photo",  emoji: "📷" },
  { label: "Vectors",            seed: "vector", emoji: "✏️" },
  { label: "Illustrations",      seed: "illus",  emoji: "🎨" },
  { label: "AI Image Generator", seed: "ai",     emoji: "✨" },
];

const GALLERY_TABS = ["Handpicked content", "Most popular"];

export default function Home({ onOrdersClick }) {
  const { user, logout } = useAuth();
  const { toast, showToast } = useToast();

  const [selectedImageId,  setSelectedImageId]  = useState(null);
  const [showProfile,      setShowProfile]      = useState(false);
  const [showUpload,       setShowUpload]       = useState(false);
  const [theme,            setTheme]            = useState("dark");
  const [images,           setImages]           = useState([]);
  const [loadingImages,    setLoadingImages]    = useState(true);
  const [activeFilter,     setActiveFilter]     = useState("All");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [activeTab,        setActiveTab]        = useState(0);

  useEffect(() => {
    setLoadingImages(true);
    getImages({ category: activeFilter, search: searchQuery })
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoadingImages(false));
  }, [activeFilter, searchQuery]);

  // ── ImageDetail ────────────────────────────────────────────
  if (selectedImageId) {
    return (
      <div className="app-container">
        <Sidebar user={user} activeNav="home"
          onHomeClick={() => setSelectedImageId(null)}
          onOrdersClick={onOrdersClick}
          onUploadClick={() => { setSelectedImageId(null); setShowUpload(true); }}
          onLogout={logout}
        />
        <ImageDetail imageId={selectedImageId} onBack={() => setSelectedImageId(null)} onNavigate={setSelectedImageId} />
      </div>
    );
  }

  // ── Profile ────────────────────────────────────────────────
  if (showProfile) {
    return (
      <div className="app-container">
        <Sidebar user={user} activeNav="profile" onHomeClick={() => setShowProfile(false)} onLogout={logout} />
        <Profile onBack={() => setShowProfile(false)} theme={theme} onThemeChange={setTheme} />
      </div>
    );
  }

  // ── Upload ─────────────────────────────────────────────────
  if (showUpload) {
    return (
      <div className="app-container">
        <UploadImage onBack={() => setShowUpload(false)} onSuccess={(id) => { setShowUpload(false); setSelectedImageId(id); }} />
      </div>
    );
  }

  // ── Main home ──────────────────────────────────────────────
  return (
    <div className="app-container">
      <Sidebar
        user={user} activeNav="home"
        onOrdersClick={onOrdersClick}
        onProfileClick={() => setShowProfile(true)}
        onUploadClick={() => setShowUpload(true)}
        onLogout={logout}
      />

      <main className="main-content">
        {/* Top bar */}
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
                <button className="topbar-upload-btn" onClick={() => setShowUpload(true)}>＋ Upload</button>
              )}
              <div className="logo">Imagery</div>
            </div>
          </div>
        </header>

        {/* ── Explore categories ──────────────────────────── */}
        <section className="categories">
          <div className="section-header">
            <h2 className="section-title">Explore images that ignite your creativity</h2>
          </div>
          <div className="category-grid">
            {CATEGORIES.map(({ label, seed }) => (
              <div className="cat-item" key={label} onClick={() => setActiveFilter(label)}>
                <img src={`https://picsum.photos/seed/${seed}/200/200`} alt={label} loading="lazy" />
                <p>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gallery / Trending ──────────────────────────── */}
        <section className="gallery-section">
          <h2 className="section-title" style={{ marginBottom: 20, fontSize: 32, fontWeight: 900, letterSpacing: "-0.8px" }}>
            See what's trending
          </h2>

          {/* Filter chips */}
          <div className="gallery-filter-row">
            {FILTERS.filter(f => f !== "All").map((f) => (
              <button
                key={f}
                className={`filter-chip ${activeFilter === f ? "active" : ""}`}
                onClick={() => setActiveFilter(f === activeFilter ? "All" : f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Tab bar */}
          {/* <div className="gallery-tab-bar">
            {GALLERY_TABS.map((tab, i) => (
              <button
                key={tab}
                className={`gallery-tab ${activeTab === i ? "active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {tab}
              </button>
            ))}
          </div> */}

          {/* Images */}
          {loadingImages ? (
            <div className="gallery-skeleton">
              {SKELETON_HEIGHTS.map((h, i) => (
                <div key={i} className="gallery-skeleton-card" style={{ height: h }} />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="gallery-empty">
              <span className="empty-icon">🖼</span>
              <p>No images found{activeFilter !== "All" ? ` in "${activeFilter}"` : ""}.</p>
            </div>
          ) : (
            <div className="image-gallery">
              {images.map((img) => (
                <GalleryCard key={img.imageId} image={img} onClick={() => setSelectedImageId(img.imageId)} />
              ))}
            </div>
          )}
        </section>

        <button className="fab-add" title="Upload image" onClick={() => setShowUpload(true)}>＋</button>
      </main>

      <Toast toast={toast} />
    </div>
  );
}

function GalleryCard({ image, onClick }) {
  const src   = image.watermarkUrl || `https://picsum.photos/seed/${image.imageId}/400`;
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
      <div className="gallery-card-like">♡ {image.likes ?? 0}</div>
    </div>
  );
}
