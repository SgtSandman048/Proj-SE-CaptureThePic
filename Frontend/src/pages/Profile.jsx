// pages/Profile.jsx
// User profile, settings, and purchase history.

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import Toast from "../components/common/Toast";
import { getMyOrders } from "../services/orderService";
import { getMyImages } from "../services/imageService";
import { formatTHB, formatDate } from "../utils/format";
import "../assets/styles/ProfilePage.css";

const CHART_DATA = [
  { month: "Jan", value: 800  }, { month: "Feb", value: 1200 },
  { month: "Mar", value: 950  }, { month: "Apr", value: 1800 },
  { month: "May", value: 1500 }, { month: "Jun", value: 2400 },
  { month: "Jul", value: 2100 }, { month: "Aug", value: 3200 },
];

const MOCK_UPLOADS = [
  { id: "u1", name: "Lunar Eclipse",  url: "https://picsum.photos/seed/luna/400/600",  price: 600 },
  { id: "u2", name: "Disco Ball",     url: "https://picsum.photos/seed/disco/400/300", price: 380 },
  { id: "u3", name: "Bangkok Dome",   url: "https://picsum.photos/seed/dome/400/300",  price: 520 },
];

const MOCK_PORTFOLIO = [
  { id: "p1", url: "https://picsum.photos/seed/pf1/300/300" },
  { id: "p2", url: "https://picsum.photos/seed/pf2/300/300" },
  { id: "p3", url: "https://picsum.photos/seed/pf3/300/300" },
  { id: "p4", url: "https://picsum.photos/seed/pf4/300/300" },
  { id: "p5", url: "https://picsum.photos/seed/pf5/300/300" },
];

// ── SVG Area Chart ─────────────────────────────────────────────
function AreaChart({ data }) {
  const W = 340, H = 90, PAD = 4;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const pts = data.map((d, i) => [
    PAD + (i / (data.length - 1)) * (W - PAD * 2),
    H - PAD - (d.value / max) * (H - PAD * 2),
  ]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4fc3c3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4fc3c3" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={linePath} fill="none" stroke="#4fc3c3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#4fc3c3" />)}
      </svg>
      <div className="chart-axis-labels">
        {data.map((d) => <span key={d.month}>{d.month}</span>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Profile({ onBack, theme = "dark", onThemeChange }) {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  const [activeTab,    setActiveTab]    = useState("profile");
  const [orders,       setOrders]       = useState([]);
  const [loadOrders,   setLoadOrders]   = useState(false);
  const [myImages,     setMyImages]     = useState([]);
  const [profileStats] = useState({ totalSales: 1045, monthSales: 57, totalRevenue: 3800, monthRevenue: 570 });

  // Profile form
  const [formUsername, setFormUsername] = useState(user?.name ?? "");
  const [formBio,      setFormBio]      = useState("I do picture and more!");
  const [formLocation, setFormLocation] = useState("Bangkok, TH");
  const [formEmail,    setFormEmail]    = useState(user?.email ?? "");
  const [saving,       setSaving]       = useState(false);

  // Appearance toggles
  const [compactMode,  setCompactMode]  = useState(false);
  const [showNSFW,     setShowNSFW]     = useState(false);
  const [emailNotif,   setEmailNotif]   = useState(true);

  // Fetch orders when Purchases tab opens
  useEffect(() => {
    if (activeTab !== "orders") return;
    setLoadOrders(true);
    getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadOrders(false));
  }, [activeTab]);

  // Fetch seller's own images
  useEffect(() => {
    if (user?.role !== "seller") return;
    getMyImages().then(setMyImages).catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800)); // mock API
    setSaving(false);
    showToast("✓ Profile updated successfully", "success");
  };

  const displayUploads = myImages.length > 0 ? myImages.slice(0, 3) : MOCK_UPLOADS;
  const uploadExtra    = myImages.length > 3 ? myImages.length - 3 : 30;

  return (
    <div className={`profile-page theme-${theme}`}>
      <header className="profile-topbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="logo">Imagery</div>
      </header>

      <div className="profile-body">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-header-row">
              <div className="profile-identity">
                <div className="avatar-wrap">
                  <div className="avatar-placeholder">👤</div>
                  <span className="avatar-online" />
                </div>
                <div className="identity-text">
                  <div className="profile-username">{user?.name ?? "Mambo98"}</div>
                  <div className="profile-role-badge">✦ {user?.role ?? "buyer"}</div>
                </div>
              </div>
              <button className="edit-profile-btn" onClick={() => setActiveTab("profile")}>
                ✏ Edit your Profile
              </button>
            </div>

            <div className="profile-bio-row">
              <p className="profile-bio">{formBio}</p>
              <div className="profile-meta">
                <span className="meta-item"><span className="icon">📍</span>{formLocation}</span>
                <span className="meta-item"><span className="icon">✉</span>{formEmail}</span>
              </div>
            </div>

            <div className="profile-stat-chips">
              {user?.role === "seller" && (
                <>
                  <div className="stat-chip"><span className="stat-chip-num">{profileStats.totalSales.toLocaleString()}</span><span className="stat-chip-label">Total Sales</span></div>
                  <div className="stat-chip"><span className="stat-chip-num">{profileStats.monthSales}</span><span className="stat-chip-label">This Month</span></div>
                  <div className="stat-chip"><span className="stat-chip-num">{displayUploads.length + (myImages.length > 3 ? uploadExtra : 0)}</span><span className="stat-chip-label">Images</span></div>
                </>
              )}
              <div className="stat-chip"><span className="stat-chip-num">{orders.length || "—"}</span><span className="stat-chip-label">Orders</span></div>
            </div>
          </div>

          {/* Recently Uploaded (seller) */}
          {user?.role === "seller" && (
            <div className="section-block">
              <div className="section-block-header">
                <span className="section-block-title">Recently Uploaded</span>
                <button className="section-block-link">View all →</button>
              </div>
              <div className="section-block-body">
                <div className="uploads-grid">
                  <div className="upload-cell tall">
                    <img src={displayUploads[0]?.watermarkUrl || displayUploads[0]?.url || "https://picsum.photos/seed/up0/400/600"} alt={displayUploads[0]?.imageName || displayUploads[0]?.name} />
                    <div className="upload-cell-overlay"><span className="upload-cell-name">{displayUploads[0]?.imageName || displayUploads[0]?.name}</span></div>
                  </div>
                  <div className="upload-cell">
                    <img src={displayUploads[1]?.watermarkUrl || displayUploads[1]?.url || "https://picsum.photos/seed/up1/400/300"} alt={displayUploads[1]?.imageName || displayUploads[1]?.name} />
                    <div className="upload-cell-overlay"><span className="upload-cell-name">{displayUploads[1]?.imageName || displayUploads[1]?.name}</span></div>
                  </div>
                  {displayUploads[2] ? (
                    <div className="upload-cell">
                      <img src={displayUploads[2]?.watermarkUrl || displayUploads[2]?.url || "https://picsum.photos/seed/up2/400/300"} alt={displayUploads[2]?.imageName || displayUploads[2]?.name} />
                      <div className="upload-cell-overlay"><span className="upload-cell-name">{displayUploads[2]?.imageName || displayUploads[2]?.name}</span></div>
                    </div>
                  ) : (
                    <div className="upload-more-cell">
                      <span className="upload-more-count">+{uploadExtra}</span>
                      <span>pictures</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Portfolio */}
          <div className="section-block">
            <div className="section-block-header">
              <span className="section-block-title">Portfolio</span>
              <button className="section-block-link">See all →</button>
            </div>
            <div className="section-block-body">
              <div className="portfolio-grid">
                {MOCK_PORTFOLIO.map((p) => (
                  <div key={p.id} className="portfolio-cell"><img src={p.url} alt="" loading="lazy" /></div>
                ))}
                <div className="portfolio-cell portfolio-more">
                  <span className="portfolio-more-num">+20</span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace" }}>more</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div className="profile-right">
          {/* Stats card (seller) */}
          {user?.role === "seller" && (
            <div className="stats-card">
              <div className="stats-card-header"><span>📊</span><span className="stats-card-title">Statistics</span></div>
              <div className="stats-card-body">
                <div>
                  <div className="stat-group-label">Downloads</div>
                  <div className="stat-row-item"><span className="stat-row-label">In total</span><span className="stat-row-value accent">{profileStats.totalSales.toLocaleString()}</span></div>
                  <div className="stat-row-item"><span className="stat-row-label">This month</span><span className="stat-row-value">{profileStats.monthSales}</span></div>
                </div>
                <div className="stat-divider" />
                <div>
                  <div className="stat-group-label">Cashflow — Overall Income</div>
                  <div className="stat-row-item"><span className="stat-row-label">In total</span><span className="stat-row-value green">{formatTHB(profileStats.totalRevenue)}</span></div>
                  <div className="stat-row-item"><span className="stat-row-label">This month</span><span className="stat-row-value">{formatTHB(profileStats.monthRevenue)}</span></div>
                </div>
                <div>
                  <div className="chart-label">Monthly revenue trend</div>
                  <AreaChart data={CHART_DATA} />
                </div>
              </div>
            </div>
          )}

          {/* Settings card */}
          <div className="settings-card">
            <div className="settings-tabs">
              <button className={`settings-tab ${activeTab === "profile"    ? "active" : ""}`} onClick={() => setActiveTab("profile")}>👤 Profile</button>
              <button className={`settings-tab ${activeTab === "orders"     ? "active" : ""}`} onClick={() => setActiveTab("orders")}>📦 Purchases</button>
              <button className={`settings-tab ${activeTab === "appearance" ? "active" : ""}`} onClick={() => setActiveTab("appearance")}>🎨 Appearance</button>
            </div>

            <div className="settings-body">
              {/* Profile tab */}
              {activeTab === "profile" && (
                <div>
                  <div className="settings-section-title">Edit Profile</div>
                  <div className="avatar-upload-row">
                    <div className="avatar-upload-preview">👤</div>
                    <div>
                      <button className="avatar-upload-btn">Change Photo</button>
                      <p style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 5, fontFamily: "var(--mono)" }}>JPG, PNG · Max 2MB</p>
                    </div>
                  </div>
                  <div className="form-field"><label>Username</label><input type="text" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="your_username" /></div>
                  <div className="form-field"><label>Email</label><input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@example.com" /></div>
                  <div className="form-field"><label>Bio</label><textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} placeholder="Tell buyers about your work…" /></div>
                  <div className="form-field"><label>Location</label><input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="City, Country" /></div>
                  <div className="form-field"><label>Account Type</label><input type="text" value={user?.role ?? "buyer"} readOnly style={{ opacity: 0.5, cursor: "not-allowed" }} /></div>
                  <div className="form-save-row">
                    <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
                  </div>
                </div>
              )}

              {/* Purchases tab */}
              {activeTab === "orders" && (
                <div>
                  <div className="settings-section-title">Purchase History</div>
                  {loadOrders ? (
                    <div style={{ color: "var(--text-mute)", fontSize: 12, fontFamily: "var(--mono)", padding: "20px 0" }}>Loading orders…</div>
                  ) : orders.length === 0 ? (
                    <div className="orders-empty"><div className="empty-icon">📦</div><p>No orders yet.</p></div>
                  ) : (
                    <div className="order-list">
                      {orders.map((o) => <OrderItem key={o.orderId} order={o} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Appearance tab */}
              {activeTab === "appearance" && (
                <div>
                  <div className="settings-section-title">Appearance</div>
                  <div className="appearance-section">
                    <div className="appearance-section-label">Color Theme</div>
                    <div className="theme-options">
                      {["dark", "light"].map((t) => (
                        <div key={t} className={`theme-option ${theme === t ? "selected" : ""}`} onClick={() => onThemeChange?.(t)}>
                          <div className={`theme-preview ${t}-prev`}>
                            <div className="theme-preview-bar" />
                            <div className="theme-preview-bar" />
                            <div className="theme-preview-bar" />
                          </div>
                          <span className="theme-option-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="appearance-section">
                    <div className="appearance-section-label">Display Preferences</div>
                    {[
                      { label: "Compact Gallery", desc: "Show more images per row",     state: compactMode, setter: setCompactMode },
                      { label: "Email Notifications", desc: "Order updates, new messages", state: emailNotif, setter: setEmailNotif },
                      { label: "Show Mature Content", desc: "Display 18+ tagged images",  state: showNSFW,    setter: setShowNSFW },
                    ].map(({ label, desc, state, setter }) => (
                      <div key={label} className="toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">{label}</span>
                          <span className="toggle-desc">{desc}</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={state} onChange={(e) => setter(e.target.checked)} />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="form-save-row">
                    <button className="btn-save" onClick={() => showToast("✓ Preferences saved", "success")}>Save Preferences</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function OrderItem({ order }) {
  const statusClass = order.status === "completed" ? "completed" : order.status === "checking" ? "checking" : "pending";
  return (
    <div className="order-item">
      <div className="order-thumb">🖼</div>
      <div className="order-info">
        <div className="order-name">{order.imageName || "Image Purchase"}</div>
        <div className="order-date">{formatDate(order.createdAt)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span className="order-price">{order.totalAmount ? formatTHB(order.totalAmount) : "—"}</span>
        <span className={`order-status ${statusClass}`}>{order.status}</span>
      </div>
    </div>
  );
}
