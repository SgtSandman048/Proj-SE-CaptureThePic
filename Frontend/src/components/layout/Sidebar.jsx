// components/layout/Sidebar.jsx
// Shared sidebar between user-admin views.

import "./Sidebar.css";
 
export default function Sidebar({
  user,
  activeNav = "home",
  isAdmin = false,
  notifCount = null,
  onHomeClick,
  onOrdersClick,
  onNotificationsClick,
  onProfileClick,
  onUploadClick,
  onDashboardClick,
  onImagesClick,
  onLogout,
}) {
  const NavItem = ({ icon, label, active, onClick, badge }) => (
    <a
      href="#"
      className={active ? "active" : ""}
      onClick={(e) => { e.preventDefault(); onClick?.(); }}
    >
      <span className="nav-icon">{icon}</span>
      {label}
      {badge > 0 && <span className="nav-notif-badge">{badge}</span>}
    </a>
  );
 
  return (
    <aside className="sidebar">
      {/* Logo mark */}
      <div className="sidebar-brand">
        <div className={`brand-mark ${isAdmin ? "admin-mark" : ""}`}>
          {isAdmin ? "⚙" : "✦"}
        </div>
      </div>
 
      {/* Navigation */}
      <nav className="nav-links">
        <NavItem
          icon="🏠" label="Home"
          active={activeNav === "home"}
          onClick={onHomeClick}
        />
 
        {isAdmin ? (
          <>
            <NavItem icon="🔔" label="Alerts"
              active={activeNav === "alerts"}
              onClick={onNotificationsClick}
              badge={notifCount}
            />
            <NavItem icon="📦" label="Orders"
              active={activeNav === "orders"}
              onClick={onOrdersClick}
            />
            <NavItem icon="👥" label="Users"
              active={activeNav === "users"}
              onClick={() => {}}
            />
            <NavItem icon="📊" label="Stats"
              active={activeNav === "dashboard"}
              onClick={onDashboardClick}
            />
            <NavItem icon="🗂"  label="Images"
              active={activeNav === "images"}
              onClick={onImagesClick}
            />
          </>
        ) : (
          <>
            <NavItem icon="📦" label="Orders"   onClick={onOrdersClick} />
            <NavItem icon="🔔" label="Alerts"   onClick={() => alert("Notifications coming soon!")} />
            <NavItem
              icon="＋" label="Upload"
              active={activeNav === "upload"}
              onClick={onUploadClick}
            />
          </>
        )}
      </nav>
 
      {/* Account section */}
      <div className="user-account">
        {/* Settings */}
        <a
          href="#"
          className="settings"
          onClick={(e) => { e.preventDefault(); onProfileClick?.(); }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚙</span>
          Settings
        </a>
 
        {/* Profile avatar */}
        <div className="profile">
          <div className={`profile-avatar ${isAdmin ? "admin-avatar" : ""}`}>
            {isAdmin ? "⚙" : "👤"}
          </div>
        </div>
 
        {/* Sign out */}
        {onLogout && (
          <a
            href="#"
            className="settings logout-btn"
            onClick={(e) => { e.preventDefault(); onLogout(); }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🚪</span>
            Sign Out
          </a>
        )}
      </div>
    </aside>
  );
}