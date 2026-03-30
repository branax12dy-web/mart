import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { api } from "./api";

export interface AuthUser {
  id: string; phone: string; name?: string; email?: string;
  avatar?: string; isOnline: boolean; walletBalance: number;
  isRestricted?: boolean;
  createdAt?: string; lastLoginAt?: string;
  stats: { deliveriesToday: number; earningsToday: number; totalDeliveries: number; totalEarnings: number; rating?: number };
  cnic?: string; city?: string; address?: string; emergencyContact?: string;
  vehicleType?: string; vehiclePlate?: string;
  vehicleRegNo?: string; drivingLicense?: string;
  bankName?: string; bankAccount?: string; bankAccountTitle?: string;
  twoFactorEnabled?: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  twoFactorPending: boolean;
  setTwoFactorPending: (v: boolean) => void;
  login: (token: string, user: AuthUser, refreshToken?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const refreshFailCountRef = useRef(0);

  useEffect((): (() => void) | void => {
    /* Try new namespaced key first, fall back to legacy key */
    const t = localStorage.getItem("ajkmart_rider_token") || localStorage.getItem("rider_token");
    if (!t) { setLoading(false); return; }

    setToken(t);
    const controller = new AbortController();
    api.getMe(controller.signal).then(u => {
      setUser(u);
      refreshFailCountRef.current = 0;
      /* Migrate legacy key to new key on successful load */
      if (!localStorage.getItem("ajkmart_rider_token")) {
        localStorage.setItem("ajkmart_rider_token", t);
        localStorage.removeItem("rider_token");
      }
    }).catch((err: unknown) => {
      /* Ignore AbortError — component unmounted before fetch completed */
      if (err instanceof Error && err.name === "AbortError") return;
      api.clearTokens();
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  /* Single logout-event listener for the full lifetime of the auth context */
  useEffect(() => {
    const handleLogout = () => { setToken(null); setUser(null); };
    window.addEventListener("ajkmart:logout", handleLogout);
    return () => window.removeEventListener("ajkmart:logout", handleLogout);
  }, []);

  const login = (t: string, u: AuthUser, refreshToken?: string) => {
    api.storeTokens(t, refreshToken);
    setToken(t);
    setUser(u);
    refreshFailCountRef.current = 0;
  };

  const logout = () => {
    const refreshTok = api.getRefreshToken();
    if (refreshTok) api.logout(refreshTok).catch((err: Error) => {
      console.warn("[auth] Server logout failed (token already expired or network):", err.message);
    });
    else api.clearTokens();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
      refreshFailCountRef.current = 0;
    } catch {
      refreshFailCountRef.current += 1;
      if (refreshFailCountRef.current >= 3) {
        /* Show a subtle toast on persistent failure — dispatch a custom event that
           any page can listen to. We don't import showToast here to avoid coupling. */
        window.dispatchEvent(new CustomEvent("ajkmart:refresh-user-failed", {
          detail: { count: refreshFailCountRef.current },
        }));
      }
    }
  };

  return <Ctx.Provider value={{ user, token, loading, twoFactorPending, setTwoFactorPending, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}
