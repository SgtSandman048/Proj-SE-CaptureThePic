import { useState } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --dark: #1a1a1a;
    --darker: #111111;
    --mid: #2e2e2e;
    --light: #f5f5f5;
    --white: #ffffff;
    --accent: #e0e0e0;
    --muted: #888888;
    --border: rgba(255,255,255,0.08);
    --input-bg: rgba(255,255,255,0.04);
  }

  .auth-wrapper {
    font-family: 'DM Sans', sans-serif;
    display: flex;
    min-height: 100vh;
    background: var(--darker);
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .left-panel {
    width: 45%;
    min-height: 100vh;
    background: var(--dark);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 52px 52px 44px;
    position: relative;
    overflow: hidden;
  }

  .left-panel::before {
    content: '';
    position: absolute;
    top: -180px; left: -180px;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .left-panel::after {
    content: '';
    position: absolute;
    bottom: -120px; right: -120px;
    width: 360px; height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
    pointer-events: none;
  }

  .brand {
    position: relative;
    z-index: 1;
  }

  .brand-logo {
    width: 40px; height: 40px;
    border: 2px solid var(--white);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }

  .brand-logo svg { width: 20px; height: 20px; fill: var(--white); }

  .brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--white);
    letter-spacing: -0.5px;
  }

  .brand-tagline {
    margin-top: 6px;
    font-size: 13px;
    color: var(--muted);
    font-weight: 300;
    letter-spacing: 0.5px;
  }

  .left-center {
    position: relative;
    z-index: 1;
  }

  .left-headline {
    font-family: 'Playfair Display', serif;
    font-size: clamp(36px, 4vw, 52px);
    font-weight: 900;
    color: var(--white);
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 20px;
  }

  .left-headline em {
    font-style: italic;
    color: var(--accent);
  }

  .left-body {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.7;
    max-width: 300px;
    font-weight: 300;
  }

  .stat-row {
    display: flex;
    gap: 32px;
    margin-top: 40px;
  }

  .stat {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 14px;
  }

  .stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--white);
  }

  .stat-label {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 2px;
  }

  .left-footer {
    position: relative; z-index: 1;
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    font-weight: 300;
  }

  /* Decorative grid lines */
  .grid-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }

  /* ── RIGHT PANEL ── */
  .right-panel {
    flex: 1;
    background: var(--light);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 48px;
    position: relative;
  }

  .right-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 4px;
    background: linear-gradient(90deg, var(--dark), var(--mid), var(--dark));
  }

  .form-container {
    width: 100%;
    max-width: 400px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    background: #e8e8e8;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 40px;
  }

  .tab {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.25s ease;
    background: transparent;
    color: var(--muted);
  }

  .tab.active {
    background: var(--dark);
    color: var(--white);
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  }

  /* Heading */
  .form-heading {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 900;
    color: var(--darker);
    letter-spacing: -0.8px;
    margin-bottom: 6px;
  }

  .form-subheading {
    font-size: 13.5px;
    color: var(--muted);
    font-weight: 300;
    margin-bottom: 32px;
  }

  /* Input */
  .field {
    margin-bottom: 18px;
    position: relative;
  }

  .field label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 8px;
  }

  .input-wrap {
    position: relative;
  }

  .input-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px; height: 16px;
    stroke: #aaa;
    fill: none;
    stroke-width: 1.8;
    pointer-events: none;
  }

  .field input {
    width: 100%;
    padding: 13px 14px 13px 42px;
    background: var(--white);
    border: 1.5px solid #ddd;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: var(--darker);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .field input:focus {
    border-color: var(--dark);
    box-shadow: 0 0 0 3px rgba(26,26,26,0.08);
  }

  .field input::placeholder { color: #bbb; }

  /* Name row */
  .name-row { display: flex; gap: 12px; }
  .name-row .field { flex: 1; }

  /* Forgot */
  .forgot-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -10px;
    margin-bottom: 28px;
  }

  .forgot-link {
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    cursor: pointer;
    transition: color 0.2s;
  }
  .forgot-link:hover { color: var(--darker); }

  /* Submit */
  .submit-btn {
    width: 100%;
    padding: 14px;
    background: var(--dark);
    color: var(--white);
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .submit-btn:hover {
    background: #333;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    transform: translateY(-1px);
  }

  .submit-btn:active { transform: translateY(0); }

  /* Divider */
  .divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 24px 0;
    color: #bbb;
    font-size: 12px;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ddd;
  }

  /* Social */
  .social-row {
    display: flex;
    gap: 12px;
    margin-bottom: 28px;
  }

  .social-btn {
    flex: 1;
    padding: 11px;
    border: 1.5px solid #ddd;
    background: var(--white);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #555;
    font-weight: 400;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .social-btn:hover {
    border-color: #aaa;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .social-btn svg { width: 18px; height: 18px; }

  /* Switch link */
  .switch-text {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
  }
  .switch-text button {
    background: none; border: none;
    color: var(--darker);
    font-weight: 500;
    cursor: pointer;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Checkbox */
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
  }
  .checkbox-row input[type="checkbox"] {
    width: 16px; height: 16px;
    accent-color: var(--dark);
    cursor: pointer;
  }
  .checkbox-row label {
    font-size: 12.5px;
    color: var(--muted);
    cursor: pointer;
  }
  .checkbox-row a { color: var(--darker); text-decoration: underline; text-underline-offset: 2px; }

  @media (max-width: 768px) {
    .auth-wrapper { flex-direction: column; }
    .left-panel { width: 100%; min-height: auto; padding: 32px 28px; }
    .left-headline { font-size: 30px; }
    .stat-row { gap: 20px; }
    .right-panel { padding: 40px 24px; }
  }
`;

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

export default function AuthPage() {
  const [mode, setMode] = useState("login");

  return (
    <>
      <style>{style}</style>
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
              <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
                Sign In
              </button>
              <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
                Register
              </button>
            </div>

            {mode === "login" ? (
              <>
                <div className="form-heading">Welcome back.</div>
                <div className="form-subheading">Sign in to your Imagery account</div>

                <div className="field">
                  <label>Email</label>
                  <div className="input-wrap">
                    <IconMail />
                    <input type="email" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <IconLock />
                    <input type="password" placeholder="••••••••" />
                  </div>
                </div>

                <div className="forgot-row">
                  <span className="forgot-link">Forgot password?</span>
                </div>

                <button className="submit-btn">Sign In</button>

                <div className="divider">or continue with</div>

                <div className="social-row">
                  <button className="social-btn"><GoogleIcon /> Google</button>
                  <button className="social-btn"><AppleIcon /> Apple</button>
                </div>

                <div className="switch-text">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("register")}>Create one</button>
                </div>
              </>
            ) : (
              <>
                <div className="form-heading">Join us.</div>
                <div className="form-subheading">Create your free Imagery account</div>

                <div className="name-row">
                  <div className="field">
                    <label>First Name</label>
                    <div className="input-wrap">
                      <IconUser />
                      <input type="text" placeholder="Jane" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Last Name</label>
                    <div className="input-wrap">
                      <IconUser />
                      <input type="text" placeholder="Doe" />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label>Email</label>
                  <div className="input-wrap">
                    <IconMail />
                    <input type="email" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <IconLock />
                    <input type="password" placeholder="Min. 8 characters" />
                  </div>
                </div>

                <div className="checkbox-row">
                  <input type="checkbox" id="terms" />
                  <label htmlFor="terms">
                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                  </label>
                </div>

                <button className="submit-btn">Create Account</button>

                <div className="divider">or register with</div>

                <div className="social-row">
                  <button className="social-btn"><GoogleIcon /> Google</button>
                  <button className="social-btn"><AppleIcon /> Apple</button>
                </div>

                <div className="switch-text">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")}>Sign in</button>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
