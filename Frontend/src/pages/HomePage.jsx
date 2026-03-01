import { useState } from "react";
import "./HomePage.css";

export default function HomePage({ user, onLogout }) {
  const [prefOpen, setPrefOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="menu-header">☰</div>
        <nav className="nav-links">
          <a href="#" className="active">🏠 Home</a>

          {/* Preference toggle */}
          <a href="#" onClick={(e) => { e.preventDefault(); setPrefOpen(!prefOpen); }}>
            ✓ Preference
          </a>

          {/* Dropdown Tags */}
          {prefOpen && (
            <div className="pref-submenu">
              {/* 1. ธรรมชาติ */}
              <div className="tag-group">
                <div className="tag-header">🌿 ธรรมชาติ</div>
                <div className="subtags">
                  {["Nature", "Landscape", "Sea", "Mountain", "Forest", "Flower"].map(t => (
                    <label key={t}><input type="checkbox" /> {t}</label>
                  ))}
                </div>
              </div>
              {/* 2. บุคคล */}
              <div className="tag-group">
                <div className="tag-header">👤 บุคคล</div>
                <div className="subtags">
                  {["Portrait", "Fashion", "People", "Lifestyle", "Street Photography"].map(t => (
                    <label key={t}><input type="checkbox" /> {t}</label>
                  ))}
                </div>
              </div>
              {/* 3. สถาปัตยกรรม */}
              <div className="tag-group">
                <div className="tag-header">🏢 สถาปัตยกรรม</div>
                <div className="subtags">
                  {["Architecture", "Building", "Interior", "Cityscape", "Minimalist"].map(t => (
                    <label key={t}><input type="checkbox" /> {t}</label>
                  ))}
                </div>
              </div>
              {/* 4. อาหาร */}
              <div className="tag-group">
                <div className="tag-header">🍕 อาหาร</div>
                <div className="subtags">
                  {["Food", "Drink", "Cafe", "Bakery", "Cooking"].map(t => (
                    <label key={t}><input type="checkbox" /> {t}</label>
                  ))}
                </div>
              </div>
              {/* 5. ธุรกิจ/เทคโนโลยี */}
              <div className="tag-group">
                <div className="tag-header">💻 ธุรกิจ/เทคโนโลยี</div>
                <div className="subtags">
                  {["Business", "Technology", "Office", "Working", "Remote Work"].map(t => (
                    <label key={t}><input type="checkbox" /> {t}</label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <a href="#">📑 Catalog</a>
          <a href="#">🔔 Notification</a>
        </nav>

        <div className="user-account">
          <p>your account</p>
          <div className="profile">
            <img src="BlackKnight.png" alt="avatar" />
            <span>{user?.name ?? "Mambo98"}</span>
          </div>
          <a href="#" className="settings">⚙ Account Setting</a>
          {onLogout && (
            <a href="#" className="settings logout-btn" onClick={(e) => { e.preventDefault(); onLogout(); }}>
              🚪 Logout
            </a>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="black-top-bar">
          <div className="top-bar-content">
            <div className="search-container">
              <input type="text" placeholder="man eating pizza with dog..." />
              <button className="search-btn">🔍</button>
            </div>
            <div className="logo">Imagery</div>
          </div>
        </header>

        <section className="categories">
          <h3>check out different types of images</h3>
          <div className="category-grid">
            {[
              { src: "image/thumb1.jpg", label: "Illustration" },
              { src: "image/thumb2.jpg", label: "Painting" },
              { src: "image/thumb3.jpg", label: "Photoshoot" },
              { src: "image/thumb4.jpg", label: "Photoshop" },
            ].map(({ src, label }) => (
              <div className="cat-item" key={label}>
                <img src={src} alt={label} />
                <p>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="image-gallery" id="gallery">
          {/* รูปภาพจะถูกเจนด้วย JS หรือ fetch จาก API ในอนาคต */}
        </div>

        <button className="fab-add">+</button>
      </main>
    </div>
  );
}
