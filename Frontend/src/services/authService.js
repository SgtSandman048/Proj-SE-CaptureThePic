// services/authService.js
// All authentication-related API calls.

import api from "./api";

const TOKEN_KEY = "accessToken";

// ── Token helpers ─────────────────────────────────────────────
export const saveToken  = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken   = ()      => localStorage.getItem(TOKEN_KEY);
export const removeToken = ()     => localStorage.removeItem(TOKEN_KEY);

/**
 * POST /auth/login
 * @param {string} email
 * @param {string} password
 * @returns {{ name, email, role, uid }}
 */
export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, pass: password });
  saveToken(data.data.token);
  const u = data.data.user;
  return { name: u.username, email: u.email, role: u.role, uid: u.userId };
};

/**
 * POST /auth/register  → auto-login on success
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {{ name, email, role, uid }}
 */
export const register = async (username, email, password) => {
  const { data } = await api.post("/auth/register", {
    username,
    email,
    pass: password,
    role: "user",
  });
  if (!data.success) {
    const msgs = data.errors?.map((e) => e.msg).join(" | ") || data.message;
    throw new Error(msgs || "Registration failed.");
  }
  // Auto-login
  return login(email, password);
};

/**
 * GET /auth/me — verify stored token and return user profile.
 * Returns null if token is missing or invalid.
 */
export const getMe = async () => {
  const token = getToken();
  if (!token) return null;
  try {
    const { data } = await api.get("/auth/me");
    if (!data.success) { removeToken(); return null; }
    return {
      name: data.data.username,
      email: data.data.email,
      role: data.data.role,
      uid: data.data.uid,
      profileImage: data.data.profileImage  || null,
      bio:          data.data.bio           || "",
      location:     data.data.location      || "",
    };
  } catch {
    removeToken();
    return null;
  }
};

/**
 * POST /auth/logout
 */
export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch { /* best-effort */ }
  removeToken();
};
