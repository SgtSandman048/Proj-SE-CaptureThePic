// App.jsx
// Root component — handles auth gate and top-level page routing.

import { useState } from "react";
import { useAuth } from "./hooks/useAuth";

// Pages
import Home          from "./pages/Home";
import OrderHistory  from "./pages/OrderHistory";
import ManageImages  from "./pages/Admin/ManageImages";

// Auth form (login / register)
import AuthPage      from "./pages/Auth";

// Global styles
import "./assets/styles/App.css";

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState("home"); // "home" | "orders" | "notifications"

  // ── Session check ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0a0a0a",
        color: "#fff", fontSize: "1.2rem", letterSpacing: "0.1em",
      }}>
        Loading…
      </div>
    );
  }

  // ── Not authenticated → show auth page ──────────────────────
  if (!user) return <AuthPage />;

  // ── Orders page ──────────────────────────────────────────────
  if (page === "orders") {
    return <OrderHistory onBack={() => setPage("home")} />;
  }

  // ── Admin ────────────────────────────────────────────────────
  if (user.role === "admin") {
    return (
      <ManageImages
        onOrdersClick={() => setPage("orders")}
        onNotificationsClick={() => setPage("notifications")}
      />
    );
  }

  // ── Default: buyer / seller home ─────────────────────────────
  return <Home onOrdersClick={() => setPage("orders")} />;
}