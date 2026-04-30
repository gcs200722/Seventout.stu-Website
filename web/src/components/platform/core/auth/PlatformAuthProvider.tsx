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
import type { LoginPayload, RegisterPayload } from "@/lib/auth-api";
import {
  platformGetMe,
  platformLogin,
  platformLogout,
  platformRefreshToken,
  platformRegister,
  type PlatformMeResponse,
} from "@/lib/platform-auth-api";
import { switchTenant } from "@/lib/auth-api";
import {
  AUTH_TOKENS_CHANGED_EVENT,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from "@/lib/auth-storage";
import { parseAccessTokenClaims } from "@/lib/jwt";

type PlatformAuthContextValue = {
  user: PlatformMeResponse | null;
  loading: boolean;
  role: string | null;
  platformPermissions: string[];
  activeTenantId: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  switchTenantById: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined);

function normalizeClaims(accessToken: string) {
  const claims = parseAccessTokenClaims(accessToken);
  return {
    role: claims?.role ?? null,
    platformPermissions: Array.isArray(claims?.platform_permissions)
      ? claims.platform_permissions
      : [],
    activeTenantId: claims?.active_tenant_id ?? null,
  };
}

async function refreshPlatformSession(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) {
    return null;
  }
  try {
    const refreshed = await platformRefreshToken(tokens.refresh_token);
    setStoredTokens(refreshed);
    return refreshed.access_token;
  } catch {
    clearStoredTokens();
    return null;
  }
}

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformMeResponse | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [platformPermissions, setPlatformPermissions] = useState<string[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyClaims = useCallback((accessToken: string) => {
    const parsed = normalizeClaims(accessToken);
    setRole(parsed.role);
    setPlatformPermissions(parsed.platformPermissions);
    setActiveTenantId(parsed.activeTenantId);
  }, []);

  const loadUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens?.access_token) {
      setUser(null);
      setRole(null);
      setPlatformPermissions([]);
      setActiveTenantId(null);
      setLoading(false);
      return;
    }
    try {
      applyClaims(tokens.access_token);
      const profile = await platformGetMe(tokens.access_token);
      setUser(profile);
    } catch {
      const refreshed = await refreshPlatformSession();
      if (!refreshed) {
        setUser(null);
        setRole(null);
        setPlatformPermissions([]);
        setActiveTenantId(null);
        setLoading(false);
        return;
      }
      try {
        applyClaims(refreshed);
        const profile = await platformGetMe(refreshed);
        setUser(profile);
      } catch {
        clearStoredTokens();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [applyClaims]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    const reload = () => {
      setLoading(true);
      void loadUser();
    };
    window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [loadUser]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const tokens = await platformLogin(payload);
      setStoredTokens(tokens);
      applyClaims(tokens.access_token);
      const profile = await platformGetMe(tokens.access_token);
      setUser(profile);
    },
    [applyClaims],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await platformRegister(payload);
      const tokens = await platformLogin({
        email: payload.email,
        password: payload.password,
      });
      setStoredTokens(tokens);
      applyClaims(tokens.access_token);
      const profile = await platformGetMe(tokens.access_token);
      setUser(profile);
    },
    [applyClaims],
  );

  const switchTenantById = useCallback(
    async (tenantId: string) => {
      const tokens = getStoredTokens();
      if (!tokens?.access_token) {
        throw new Error("Bạn chưa đăng nhập.");
      }
      const nextTokens = await switchTenant(tokens.access_token, { tenant_id: tenantId });
      setStoredTokens(nextTokens);
      applyClaims(nextTokens.access_token);
    },
    [applyClaims],
  );

  const logout = useCallback(async () => {
    const tokens = getStoredTokens();
    if (tokens?.access_token) {
      try {
        await platformLogout(tokens.access_token);
      } catch {
        // Client logout stays resilient if API errors.
      }
    }
    clearStoredTokens();
    setUser(null);
    setRole(null);
    setPlatformPermissions([]);
    setActiveTenantId(null);
  }, []);

  const value = useMemo<PlatformAuthContextValue>(
    () => ({
      user,
      loading,
      role,
      platformPermissions,
      activeTenantId,
      login,
      register,
      switchTenantById,
      logout,
    }),
    [
      user,
      loading,
      role,
      platformPermissions,
      activeTenantId,
      login,
      register,
      switchTenantById,
      logout,
    ],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  }
  return context;
}
