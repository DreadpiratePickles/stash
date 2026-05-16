import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, bootstrapToken, persistToken, setAuthToken, UserPublic } from "@/src/lib/api";

type AuthState = {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await bootstrapToken();
      if (t) {
        try {
          const r = await api.get<UserPublic>("/auth/me");
          setUser(r.data);
        } catch {
          setAuthToken(null);
          await persistToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    setAuthToken(r.data.access_token);
    await persistToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const r = await api.post("/auth/register", { email, password });
    setAuthToken(r.data.access_token);
    await persistToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await persistToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
