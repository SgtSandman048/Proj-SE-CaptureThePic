// pages/Home.jsx
// Main gallery page for regular (buyer/seller) users.

import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Toast from "../components/common/Toast";
import ImageDetail from "./ImageDetail";
import UploadImage from "./UploadImage";
import Profile from "./Profile";
import { getImages, searchUsersByName } from "../services/imageService";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import iconSearch from "../assets/icons/search.png";
import "../assets/styles/HomePage.css";

const FILTERS = ["All", "Nature", "Architecture", "People", "Animals", "Technology", "Food", "Travel","Abstract", "Fashion", "Sports", "Illustration", "Other",];
const SKELETON_HEIGHTS = [220, 160, 280, 195, 240, 170, 300, 185, 210, 260, 150, 230];

const CATEGORIES = [
  { label: "Photos",             seed: "photo",  emoji: "📷" },
  { label: "Vectors",            seed: "vector", emoji: "✏️" },
  { label: "Illustrations",      seed: "illus",  emoji: "🎨" },
  { label: "AI Image Generator", seed: "ai",     emoji: "✨" },
];

// const CATEGORIES = [
//   { id: "all",          label: "All",          icon: "◈" },
//   { id: "nature",       label: "Nature",        icon: "🌿" },
//   { id: "architecture", label: "Architecture",  icon: "🏛" },
//   { id: "people",       label: "People",        icon: "👤" },
//   { id: "animals",      label: "Animals",       icon: "🐾" },
//   { id: "technology",   label: "Technology",    icon: "⚡" },
//   { id: "food",         label: "Food",          icon: "🍽" },
//   { id: "travel",       label: "Travel",        icon: "✈" },
//   { id: "abstract",     label: "Abstract",      icon: "◎" },
//   { id: "fashion",      label: "Fashion",       icon: "✦" },
//   { id: "sports",       label: "Sports",        icon: "⚽" },
//   { id: "illustration", label: "Illustration",  icon: "🖌" },
//   { id: "other",        label: "Other",         icon: "•••" },
// ];

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
  const [userResults,      setUserResults]      = useState([]);
  const [foundUser,        setFoundUser]        = useState(null);

 useEffect(() => {
  const timer = setTimeout(() => {
    setLoadingImages(true);
    getImages({ category: activeFilter, search: searchQuery })
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoadingImages(false));

    if (searchQuery.startsWith('@') && searchQuery.length > 1) {
      searchUsersByName(searchQuery.slice(1)).then(users => {
        setUserResults(users)
        setFoundUser(users[0] || null)  // ← store first match
      })
    } else {
      setUserResults([])
      setFoundUser(null)
    }
  }, 500);
  return () => clearTimeout(timer);
}, [activeFilter, searchQuery]);

  if (selectedImageId) {
    return (
      <div className="app-container">
        <Sidebar user={user} activeNav="home"
          onHomeClick={() => setSelectedImageId(null)}
          onOrdersClick={onOrdersClick}
          onUploadClick={() => { setSelectedImageId(null); setShowUpload(true); }}
          onLogout={logout}
        />
        <ImageDetail
          imageId={selectedImageId}
          onBack={(searchQ) => {
            setSelectedImageId(null);
            if (searchQ) setSearchQuery(searchQ);
          }}
          onNavigate={setSelectedImageId}
        />
      </div>
    );
  }

  if (showProfile) {
    return (
      <div className="app-container">
        <Sidebar user={user} activeNav="profile" onHomeClick={() => setShowProfile(false)} onLogout={logout} />
        <Profile
          onBack={() => setShowProfile(false)}
          theme={theme}
          onThemeChange={setTheme}
          onImageClick={(imageId) => { setShowProfile(false); setSelectedImageId(imageId); }}
        />
      </div>
    );
  }

  if (showUpload) {
    return (
      <div className="app-container">
        <UploadImage onBack={() => setShowUpload(false)} onSuccess={(id) => { setShowUpload(false); setSelectedImageId(id); }} />
      </div>
    );
  }

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
        <header className="black-top-bar">
          <div className="top-bar-content">
            <div className="search-container">
              <button className="search-btn"><img src={iconSearch} alt="search" className="search-icon-img" /></button>
              <input
                type="text"
                placeholder="Search images… or @username #tag"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* User search dropdown */}
              {userResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: '8px', zIndex: 1000, marginTop: '4px', overflow: 'hidden'
                }}>
                  {userResults.map(u => (
                    <div key={u.uid}
                      onClick={() => { setSearchQuery(`@${u.username}`); setUserResults([]) }}
                      style={{
                        padding: '10px 16px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--text-mid)', display: 'flex', alignItems: 'center', gap: '8px',
                        borderBottom: '1px solid var(--border)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>👤</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.username}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-mute)' }}>{u.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="top-bar-right">
              {user?.role === "seller" && (
                <button className="topbar-upload-btn" onClick={() => setShowUpload(true)}>＋ Upload</button>
              )}
              <div className="logo">Imagery</div>
            </div>
          </div>
        </header>

        <section className="categories">
          <div className="section-header">
            <h2 className="section-title">Explore images that ignite your creativity</h2>
          </div>
          <div className="category-grid">
            {CATEGORIES.map(({ label, seed }) => (
              <div className="cat-item" key={label} >
                <img src={`https://picsum.photos/seed/${seed}/200/200`} alt={label} loading="lazy" />
                <p>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="gallery-section">
          <h2 className="section-title" style={{ marginBottom: 20, fontSize: 32, fontWeight: 900, letterSpacing: "-0.8px" }}>
            See what's trending
          </h2>

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
            
            {/* User profile card when searching @username */}
          {searchQuery.startsWith('@') && foundUser && !loadingImages && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '16px 20px', marginBottom: '20px',
          background: 'var(--bg-raised)', borderRadius: '12px',
          border: '1px solid var(--border)'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'var(--bg-hover)', border: '1.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
        }}>👤</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-hi)' }}>
            {foundUser.username}
        </div>
          <div style={{ fontSize: '12px', color: 'var(--text-mute)', marginTop: '2px' }}>
            {foundUser.role} · {images.length > 0 ? `${images.length} images` : 'No uploads yet'}
          </div>
        </div>
      </div>
        )}
          {/* Gallery grid or loading skeleton or empty state */}
          {loadingImages ? (
            <div className="gallery-skeleton">
              {SKELETON_HEIGHTS.map((h, i) => (
                <div key={i} className="gallery-skeleton-card" style={{ height: h }} />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="gallery-empty">
              <span className="empty-icon">🖼</span>
              {searchQuery.startsWith('@') ? (
              <p>No images from this user yet.</p>
          ) : (
            <p>No images found{activeFilter !== "All" ? ` in "${activeFilter}"` : ""}.</p>
          )}
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