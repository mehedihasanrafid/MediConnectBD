/**
 * Authentication context: holds the current user and access token in memory, exposes login,
 * registration, and logout, and restores the session on reload using the HTTP-only refresh cookie.
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
import {
  authApi,
  type RegisterDoctorInput,
  type RegisterPatientInput,
} from "../../api/auth";
import { setAccessToken } from "../../api/client";
import type { PublicUser } from "../../shared/types";

export interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  registerPatient: (input: RegisterPatientInput) => Promise<PublicUser>;
  registerDoctor: (input: RegisterDoctorInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await authApi.refresh();
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
    const result = await authApi.login(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const registerPatient = useCallback(async (input: RegisterPatientInput) => {
    const result = await authApi.registerPatient(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const registerDoctor = useCallback(async (input: RegisterDoctorInput) => {
    const result = await authApi.registerDoctor(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, registerPatient, registerDoctor, logout }),
    [user, loading, login, registerPatient, registerDoctor, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
