// pages/Auth.jsx

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "../assets/styles/LoginPage.css";

// ── SVG Icons ──────────────────────────────────────────────────
const IconMail = () => <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,14 22,4"/></svg>;
const IconLock = () => <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
const IconUser = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;

export default function AuthPage() {
  const { login, register } = useAuth();

  const [mode,    setMode]    = useState("login");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail,    setRegEmail]    = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regTerms,    setRegTerms]    = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!loginEmail || !loginPassword) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (e) {
      setError(e.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    if (!regUsername || !regEmail || !regPassword) { setError("Please fill in all fields."); return; }
    if (!regTerms) { setError("Please accept the Terms of Service."); return; }
    setLoading(true);
    try {
      await register(regUsername, regEmail, regPassword);
    } catch (e) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(""); };

  return (
    <div className="auth-wrapper">
      {/* Left panel */}
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
          <div className="left-headline">Where <em>ideas</em><br/>become<br/>reality.</div>
          <p className="left-body">
            A creative platform for designers, artists, and visionaries.
            Upload, explore, and collaborate on visual stories that move people.
          </p>
        </div>
        <div className="left-footer">© 2025 Imagery Inc. All rights reserved.</div>
      </div>

      {/* Right panel */}
      <div className="right-panel">
        <div className="form-container">
          <div className="tabs">
            <button className={`tab ${mode === "login"    ? "active" : ""}`} onClick={() => switchMode("login")}>Sign In</button>
            <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>Register</button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {mode === "login" ? (
            <>
              <div className="form-heading">Welcome back.</div>
              <div className="form-subheading">Sign in to your Imagery account</div>

              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <IconMail />
                  <input type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={loading} />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={loading} />
                </div>
              </div>

              <div className="forgot-row"><span className="forgot-link">Forgot password?</span></div>
              <button className="submit-btn" onClick={handleLogin} disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
              <div className="switch-text">Don't have an account? <button onClick={() => switchMode("register")}>Create one</button></div>
            </>
          ) : (
            <>
              <div className="form-heading">Join us.</div>
              <div className="form-subheading">Create your free Imagery account</div>

              <div className="field">
                <label>Username</label>
                <div className="input-wrap">
                  <IconUser />
                  <input type="text" placeholder="your_username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <IconMail />
                  <input type="email" placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input type="password" placeholder="Min. 8 chars, A-Z, a-z, 0-9" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="checkbox-row">
                <input type="checkbox" id="terms" checked={regTerms} onChange={(e) => setRegTerms(e.target.checked)} disabled={loading} />
                <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
              </div>

              <button className="submit-btn" onClick={handleRegister} disabled={loading}>{loading ? "Creating account…" : "Create Account"}</button>
              <div className="switch-text">Already have an account? <button onClick={() => switchMode("login")}>Sign in</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
