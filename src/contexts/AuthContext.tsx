"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

type User = { id: string; role: string; email: string | null; phone: string | null; displayName?: string | null; avatarUrl?: string | null; isPremiumMember?: boolean; credits?: number; emailVerifiedAt?: string | null };

type AuthContextType = {
  user: User | null;
  token: string | null;
  authReady: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  logoutAll: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function clearAuth() {
  if (typeof window !== "undefined") localStorage.removeItem("token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const retryRef = useRef(false);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) {
      setAuthReady(true);
      return;
    }
    setToken(t);

    async function refreshAccessToken(): Promise<string | null> {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        const next = typeof data.token === "string" ? data.token : null;
        if (next) {
          localStorage.setItem("token", next);
          setToken(next);
        }
        return next;
      } catch {
        return null;
      }
    }

    function onSuccess(u: User) {
      setUser(u);
      setAuthReady(true);
    }
    function onUnauthorized() {
      clearAuth();
      setToken(null);
      setUser(null);
      setAuthReady(true);
    }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          const next = await refreshAccessToken();
          if (!next) {
            onUnauthorized();
            return;
          }
          const retry = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${next}` } });
          if (retry.status === 401 || retry.status === 403) {
            onUnauthorized();
            return;
          }
          if (!retry.ok) {
            setAuthReady(true);
            return;
          }
          try {
            const u = await retry.json();
            if (u && typeof u.id === "string") onSuccess(u);
            else setAuthReady(true);
          } catch {
            setAuthReady(true);
          }
          return;
        }
        if (!r.ok) {
          setAuthReady(true);
          return;
        }
        try {
          const u = await r.json();
          if (u && typeof u.id === "string") {
            onSuccess(u);
          } else {
            setAuthReady(true);
          }
        } catch {
          setAuthReady(true);
        }
      })
      .catch(() => {
        setAuthReady(true);
        if (retryRef.current) return;
        retryRef.current = true;
        setTimeout(() => {
          fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
            .then(async (res) => {
              if (res.ok) {
                try {
                  const u = await res.json();
                  if (u && typeof u.id === "string") {
                    setUser(u);
                  }
                } catch {
                  clearAuth();
                  setToken(null);
                  setUser(null);
                }
              } else {
                clearAuth();
                setToken(null);
                setUser(null);
              }
            })
            .catch(() => {
              clearAuth();
              setToken(null);
              setUser(null);
            });
        }, 800);
      });
  }, []);

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) {
      await fetch("/api/auth/logout-all", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    } else {
      await fetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
    }
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    let t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) return;
    try {
      const r = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
      if (r.status === 401 || r.status === 403) {
        const rr = await fetch("/api/auth/refresh", { method: "POST" });
        if (rr.ok) {
          const data = await rr.json().catch(() => ({}));
          const next = typeof data.token === "string" ? data.token : null;
          if (next) {
            localStorage.setItem("token", next);
            setToken(next);
            t = next;
          }
        }
      }
      const retry = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
      if (retry.ok) {
        const u = await retry.json();
        setUser(u);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, authReady, login, logout, logoutAll, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
