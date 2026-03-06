import { useState, useEffect } from "react";

import HomePage from "./HomePage";
import HomePageAdmin from "./HomePageAdmin";
import OrderHistory from "./OrderHistory";

// ── API base URL — ปรับตาม environment ──
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// ── Token helpers ──
const saveToken = (token) => localStorage.setItem("accessToken", token);
const getToken = () => localStorage.getItem("accessToken");
const removeToken = () => localStorage.removeItem("accessToken");

// SVG Icons
const IconMail = () => (
  <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,14 22,4"/></svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// ── Auth Page ──
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regTerms, setRegTerms] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!loginEmail || !loginPassword) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, pass: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed. Please try again."); return; }
      saveToken(data.data.token);
      onLogin({ name: data.data.user.username, email: data.data.user.email, role: data.data.user.role, uid: data.data.user.userId });
    } catch { setError("Cannot connect to server. Please try again later."); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError("");
    if (!regUsername || !regEmail || !regPassword) { setError("Please fill in all fields."); return; }
    if (!regTerms) { setError("Please accept the Terms of Service."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername, email: regEmail, pass: regPassword, role: "user" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.errors?.length > 0 ? data.errors.map((e) => e.msg).join(" | ") : data.message || "Registration failed.");
        return;
      }
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ email: regEmail, pass: regPassword }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        saveToken(loginData.data.token);
        onLogin({ name: loginData.data.user.username, email: loginData.data.user.email, role: loginData.data.user.role, uid: loginData.data.user.userId });
      } else { setError("Registered successfully! Please sign in."); }
    } catch { setError("Cannot connect to server. Please try again later."); }
    finally { setLoading(false); }
  };

  const switchMode = (m) => { setMode(m); setError(""); };

  return (
    <div className="auth-wrapper">
      <div className="left-panel">
        <div className="grid-lines" />
        <div className="brand">
          <div className="brand-logo"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
          <div className="brand-name">Imagery</div>
          <div className="brand-tagline">break your imagination limit</div>
        </div>
        <div className="left-center">
          <div className="left-headline">Where <em>ideas</em><br/>become<br/>reality.</div>
          <p className="left-body">A creative platform for designers, artists, and visionaries. Upload, explore, and collaborate on visual stories that move people.</p>
        </div>
        <div className="left-footer">© 2025 Imagery Inc. All rights reserved.</div>
      </div>

      <div className="right-panel">
        <div className="form-container">
          <div className="tabs">
            <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>Sign In</button>
            <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>Register</button>
          </div>
          {error && <div className="error-msg">{error}</div>}
          {mode === "login" ? (
            <>
              <div className="form-heading">Welcome back.</div>
              <div className="form-subheading">Sign in to your Imagery account</div>
              <div className="field"><label>Email</label><div className="input-wrap"><IconMail /><input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={loading} /></div></div>
              <div className="field"><label>Password</label><div className="input-wrap"><IconLock /><input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={loading} /></div></div>
              <div className="forgot-row"><span className="forgot-link">Forgot password?</span></div>
              <button className="submit-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
              <div className="divider">or continue with</div>
              <div className="social-row"><button className="social-btn" disabled><GoogleIcon /> Google</button><button className="social-btn" disabled><AppleIcon /> Apple</button></div>
              <div className="switch-text">Don't have an account? <button onClick={() => switchMode("register")}>Create one</button></div>
            </>
          ) : (
            <>
              <div className="form-heading">Join us.</div>
              <div className="form-subheading">Create your free Imagery account</div>
              <div className="field"><label>Username</label><div className="input-wrap"><IconUser /><input type="text" placeholder="your_username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={loading} /></div></div>
              <div className="field"><label>Email</label><div className="input-wrap"><IconMail /><input type="email" placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} /></div></div>
              <div className="field"><label>Password</label><div className="input-wrap"><IconLock /><input type="password" placeholder="Min. 8 chars, A-Z, a-z, 0-9" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} /></div></div>
              <div className="checkbox-row"><input type="checkbox" id="terms" checked={regTerms} onChange={(e) => setRegTerms(e.target.checked)} disabled={loading} /><label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label></div>
              <button className="submit-btn" onClick={handleRegister} disabled={loading}>{loading ? "Creating account…" : "Create Account"}</button>
              <div className="divider">or register with</div>
              <div className="social-row"><button className="social-btn" disabled><GoogleIcon /> Google</button><button className="social-btn" disabled><AppleIcon /> Apple</button></div>
              <div className="switch-text">Already have an account? <button onClick={() => switchMode("login")}>Sign in</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root App ──
export default function App() {
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);
  const [page,     setPage]     = useState("home"); // "home" | "orders"

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser({ name: data.data.username, email: data.data.email, role: data.data.role, uid: data.data.uid });
        } else { removeToken(); }
      })
      .catch(() => removeToken())
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, credentials: "include" });
      } catch {}
    }
    removeToken();
    setUser(null);
    setPage("home");
  };

  if (checking) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0a0a0a", color:"#fff", fontSize:"1.2rem", letterSpacing:"0.1em" }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage onLogin={(u) => setUser(u)} />;

  // ── Page routing ──
  if (page === "orders") {
    return <OrderHistory user={user} onBack={() => setPage("home")} />;
  }

  // Admin role → render admin homepage
  if (user?.role === "admin") {
    return (
      <HomePageAdmin
        user={user}
        onLogout={handleLogout}
        onOrdersClick={() => setPage("orders")}
        onNotificationsClick={() => setPage("notifications")}
      />
    );
  }

  return (
    <HomePage
      user={user}
      onLogout={handleLogout}
      onOrdersClick={() => setPage("orders")}
    />
  );
}