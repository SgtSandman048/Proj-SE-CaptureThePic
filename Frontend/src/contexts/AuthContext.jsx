// contexts/AuthContext.jsx
// Provides global authentication state and actions.

import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as loginService, register as registerService, logout as logoutService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true); // checking stored session

  // ── Restore session on mount ───────────────────────────────
  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const login = async (email, password) => {
    const u = await loginService(email, password);
    setUser(u);
    return u;
  };

  const register = async (username, email, password) => {
    const u = await registerService(username, email, password);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await logoutService();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await getMe();
      setUser(u);
      return u;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — throws if used outside <AuthProvider />. */
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider />");
  return ctx;
}

export default AuthContext;
