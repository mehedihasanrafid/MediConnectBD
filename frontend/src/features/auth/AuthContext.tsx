/**
 * Authentication context: holds the current user and access token in memory, exposes login and
 * logout, and restores the session on reload using the HTTP-only refresh cookie.
 *
 * Refresh tokens are single-use and rotate on every call, so concurrent refreshes would trip
 * reuse detection and revoke the session. A module-level in-flight promise serializes them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setAccessToken } from "../../shared/api";
import type { AuthResponse, PublicUser } from "../../shared/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let refreshInFlight: Promise<AuthResponse> | null = null;

/**
 * Shares one refresh request across concurrent callers. Without this, React StrictMode's double
 * effect invocation rotates the token twice and the second call is treated as token reuse.
 */
function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= api
    .post<AuthResponse>("/auth/refresh")
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await refreshSession();
        if (cancelled) return;
        setAccessToken(result.accessToken);
        setUser(result.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AuthResponse>("/auth/login", { email, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
