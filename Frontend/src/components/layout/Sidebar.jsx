// components/layout/Sidebar.jsx
// Shared sidebar between user-admin views.

import { useState } from "react";
import "./Sidebar.css";
import NotificationBell from "../NotificationBell";
import userIcon from "../../assets/icons/user.png";

const PREF_GROUPS = [
  { icon: "🌿", label: "ธรรมชาติ",          tags: ["Nature","Landscape","Sea","Mountain","Forest","Flower"] },
  { icon: "👤", label: "บุคคล",              tags: ["Portrait","Fashion","People","Lifestyle","Street Photography"] },
  { icon: "🏢", label: "สถาปัตยกรรม",       tags: ["Architecture","Building","Interior","Cityscape","Minimalist"] },
  { icon: "🍕", label: "อาหาร",              tags: ["Food","Drink","Cafe","Bakery","Cooking"] },
  { icon: "💻", label: "ธุรกิจ/เทคโนโลยี",  tags: ["Business","Technology","Office","Working","Remote Work"] },
];

/**
 * ProfileAvatar
 * Renders the user's real profile image if available,
 * or falls back to the default user icon / admin symbol.
 */
function ProfileAvatar({ user, isAdmin }) {
  const [imgError, setImgError] = useState(false);

  const hasPhoto = !isAdmin && user?.profileImage && !imgError;

  return (
    <div className={`profile-avatar ${isAdmin ? "admin-avatar" : ""}`}>
      {hasPhoto ? (
        <img
          src={user.profileImage}
          alt={user?.name ?? "Profile"}
          className="sidebar-avatar-img"
          onError={() => setImgError(true)}
        />
      ) : isAdmin ? (
        "⚙"
      ) : (
        <img
          src={userIcon}
          alt="User"
          className="sidebar-icon"
        />
      )}
    </div>
  );
}

export default function Sidebar({
  user,
  activeNav = "home",
  isAdmin = false,
  notifCount = null,
  onHomeClick,
  onOrdersClick,
  onWalletClick,
  onNotificationsClick,
  onUsersClick,
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
      {/* Brand */}
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
            <NavItem icon="🗂"  label="Images"
              active={activeNav === "images"}
              onClick={onImagesClick}
            />
            <NavItem icon="📦" label="Orders"
              active={activeNav === "orders"}
              onClick={onOrdersClick}
            />
            <NavItem icon="👥" label="Users"
              active={activeNav === "users"}
              onClick={onUsersClick}
            />
            <NavItem icon="💰" label="Wallet"
              active={activeNav === "wallet"}
              onClick={onWalletClick}
            />
            <NavItem icon="📊" label="Stats"
              active={activeNav === "dashboard"}
              onClick={onDashboardClick}
            />
          </>
        ) : (
          <>
          <NavItem icon="📦" label="Orders"   onClick={onOrdersClick} />
            
              <NotificationBell userId={user?.uid} />
            <>
              <NavItem
              icon="＋" label="Upload"
              active={activeNav === "upload"}
              onClick={onUploadClick}
            />
            </>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="user-account">
        <div className="user-label">Your Account</div>
        <div className="profile">
          <ProfileAvatar user={user} isAdmin={isAdmin} />
          <div>
            <div className="profile-name">{user?.name ?? "Guest"}</div>
            <div className={`profile-role ${isAdmin ? "admin-role-tag" : ""}`}>
              {isAdmin ? "administrator" : (user?.role ?? "buyer")}
            </div>
          </div>
        </div>

        {!isAdmin && (
          <a href="#" className="settings" onClick={(e) => { e.preventDefault(); onProfileClick?.(); }}>
            ⚙ Settings
          </a>
        )}
        {isAdmin && (
          <a href="#" className="settings">⚙ Settings</a>
        )}

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