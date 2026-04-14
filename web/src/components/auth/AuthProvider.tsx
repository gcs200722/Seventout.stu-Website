"use client";

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
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refreshToken as refreshTokenRequest,
  register as registerRequest,
  type LoginPayload,
  type MeResponse,
  type RegisterPayload,
} from "@/lib/auth-api";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredAccessToken,
  setStoredTokens,
} from "@/lib/auth-storage";

type AuthContextValue = {
  user: MeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function refreshSession(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) {
    return null;
  }

  try {
    const refreshed = await refreshTokenRequest(tokens.refresh_token);
    setStoredAccessToken(refreshed.access_token);
    return refreshed.access_token;
  } catch {
    clearStoredTokens();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens?.access_token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await getMe(tokens.access_token);
      setUser(me);
      setLoading(false);
      return;
    } catch {
      const newAccessToken = await refreshSession();
      if (!newAccessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await getMe(newAccessToken);
        setUser(me);
      } catch {
        clearStoredTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await loginRequest(payload);
    setStoredTokens(tokens);
    const me = await getMe(tokens.access_token);
    setUser(me);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload);
    const tokens = await loginRequest({
      email: payload.email,
      password: payload.password,
    });
    setStoredTokens(tokens);
    const me = await getMe(tokens.access_token);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    const tokens = getStoredTokens();
    if (tokens?.access_token) {
      try {
        await logoutRequest(tokens.access_token);
      } catch {
        // Keep client logout resilient even if API returns error.
      }
    }
    clearStoredTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
