import { useState, useEffect } from "react";
import "./LoginPage.css";
import HomePage from "./HomePage";

// ── API base URL — ปรับตาม environment ──
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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

// ── Auth Page ──
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regTerms, setRegTerms] = useState(false);

  // ── Login ──
  const handleLogin = async () => {
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // รับ httpOnly cookie (refreshToken)
        body: JSON.stringify({ email: loginEmail, pass: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        return;
      }

      // เก็บ access token
      saveToken(data.data.token);
      onLogin({
        name: data.data.user.username,
        email: data.data.user.email,
        role: data.data.user.role,
        uid: data.data.user.userId,
      });
    } catch {
      setError("Cannot connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async () => {
    setError("");
    if (!regUsername || !regEmail || !regPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!regTerms) {
      setError("Please accept the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          pass: regPassword,
          role: "user",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // แสดง validation errors ถ้ามี
        if (data.errors && data.errors.length > 0) {
          setError(data.errors.map((e) => e.msg).join(" | "));
        } else {
          setError(data.message || "Registration failed. Please try again.");
        }
        return;
      }

      // สมัครสำเร็จ → auto login
      setError("");
      setMode("login");
      setLoginEmail(regEmail);
      setLoginPassword(regPassword);
      // แจ้งให้ user กด login เอง หรือจะ auto-login ด้านล่างก็ได้
      // ที่นี่เลือก auto-login ทันที
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: regEmail, pass: regPassword }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok) {
        saveToken(loginData.data.token);
        onLogin({
          name: loginData.data.user.username,
          email: loginData.data.user.email,
          role: loginData.data.user.role,
          uid: loginData.data.user.userId,
        });
      } else {
        setError("Registered successfully! Please sign in.");
      }
    } catch {
      setError("Cannot connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  return (
    <div className="auth-wrapper">
      {/* ── LEFT PANEL ── */}
      <div className="left-panel">
        <div className="grid-lines" />

        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div className="brand-name">Imagery</div>
          <div className="brand-tagline">break your imagination limit</div>
        </div>

        <div className="left-center">
          <div className="left-headline">
            Where <em>ideas</em><br/>become<br/>reality.
          </div>
          <p className="left-body">
            A creative platform for designers, artists, and visionaries.
            Upload, explore, and collaborate on visual stories that move people.
          </p>
        </div>

        <div className="left-footer">
          © 2025 Imagery Inc. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel">
        <div className="form-container">

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>
              Sign In
            </button>
            <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>
              Register
            </button>
          </div>

          {/* Error message */}
          {error && <div className="error-msg">{error}</div>}

          {mode === "login" ? (
            <>
              <div className="form-heading">Welcome back.</div>
              <div className="form-subheading">Sign in to your Imagery account</div>

              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <IconMail />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="forgot-row">
                <span className="forgot-link">Forgot password?</span>
              </div>

              <button className="submit-btn" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <div className="switch-text">
                Don't have an account?{" "}
                <button onClick={() => switchMode("register")}>Create one</button>
              </div>
            </>
          ) : (
            <>
              <div className="form-heading">Join us.</div>
              <div className="form-subheading">Create your free Imagery account</div>

              <div className="field">
                <label>Username</label>
                <div className="input-wrap">
                  <IconUser />
                  <input
                    type="text"
                    placeholder="your_username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <IconMail />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input
                    type="password"
                    placeholder="Min. 8 chars, A-Z, a-z, 0-9"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="terms"
                  checked={regTerms}
                  onChange={(e) => setRegTerms(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="terms">
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </label>
              </div>

              <button className="submit-btn" onClick={handleRegister} disabled={loading}>
                {loading ? "Creating account…" : "Create Account"}
              </button>

              <div className="divider">or register with</div>

              <div className="social-row">
                <button className="social-btn" disabled>
                  <GoogleIcon /> Google
                </button>
                <button className="social-btn" disabled>
                  <AppleIcon /> Apple
                </button>
              </div>

              <div className="switch-text">
                Already have an account?{" "}
                <button onClick={() => switchMode("login")}>Sign in</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Root App ──
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // ตรวจ token ที่ค้างอยู่

  // ── เมื่อ app โหลด ให้ตรวจสอบ token ใน localStorage ──
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }

    // เรียก GET /api/auth/me เพื่อยืนยัน token ยังใช้ได้
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser({
            name: data.data.username,
            email: data.data.email,
            role: data.data.role,
            uid: data.data.uid,
          });
        } else {
          // token หมดอายุหรือ invalid → ล้างออก
          removeToken();
        }
      })
      .catch(() => removeToken())
      .finally(() => setChecking(false));
  }, []);

  // ── Logout: เรียก backend ด้วย ──
  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      } catch {
        // ถ้า network error ก็ logout ฝั่ง client ไปก่อน
      }
    }
    removeToken();
    setUser(null);
  };

  if (checking) {
    // แสดง loading screen ระหว่างตรวจสอบ session
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontSize: "1.2rem",
        letterSpacing: "0.1em",
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={(u) => setUser(u)} />;
  }

  return <HomePage user={user} onLogout={handleLogout} />;
}
