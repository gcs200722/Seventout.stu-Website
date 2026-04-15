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
import { updateAdminUser } from "@/lib/admin-api";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredAccessToken,
  setStoredTokens,
} from "@/lib/auth-storage";
import { parseAccessTokenClaims } from "@/lib/jwt";

type AuthContextValue = {
  user: MeResponse | null;
  role: string | null;
  permissions: string[];
  loading: boolean;
  isAuthenticated: boolean;
  canAccessAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => Promise<void>;
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
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const applyTokenClaims = useCallback((accessToken: string) => {
    const claims = parseAccessTokenClaims(accessToken);
    setRole(claims?.role ?? null);
    setPermissions(Array.isArray(claims?.permissions) ? claims.permissions : []);
  }, []);

  const loadProfile = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens?.access_token) {
      setUser(null);
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      applyTokenClaims(tokens.access_token);
      const me = await getMe(tokens.access_token);
      setUser(me);
      setLoading(false);
      return;
    } catch {
      const newAccessToken = await refreshSession();
      if (!newAccessToken) {
        setUser(null);
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        applyTokenClaims(newAccessToken);
        const me = await getMe(newAccessToken);
        setUser(me);
      } catch {
        clearStoredTokens();
        setUser(null);
        setRole(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }
  }, [applyTokenClaims]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await loginRequest(payload);
    setStoredTokens(tokens);
    applyTokenClaims(tokens.access_token);
    const me = await getMe(tokens.access_token);
    setUser(me);
  }, [applyTokenClaims]);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload);
    const tokens = await loginRequest({
      email: payload.email,
      password: payload.password,
    });
    setStoredTokens(tokens);
    applyTokenClaims(tokens.access_token);
    const me = await getMe(tokens.access_token);
    setUser(me);
  }, [applyTokenClaims]);

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
    setRole(null);
    setPermissions([]);
  }, []);

  const updateProfile = useCallback(
    async (payload: { first_name?: string; last_name?: string; phone?: string }) => {
      if (!user?.id) {
        throw new Error("Bạn chưa đăng nhập.");
      }

      await updateAdminUser(user.id, payload);
      await loadProfile();
    },
    [user?.id, loadProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      permissions,
      loading,
      isAuthenticated: Boolean(user),
      canAccessAdmin: role === "ADMIN" || role === "STAFF",
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, role, permissions, loading, login, register, logout, updateProfile],
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
