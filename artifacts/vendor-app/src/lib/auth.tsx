import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";

export interface StoreHours { [day: string]: { open: string; close: string; closed?: boolean } }

export interface AuthUser {
  id: string; phone: string; name?: string; email?: string; avatar?: string;
  walletBalance: number;
  storeName?: string; storeCategory?: string;
  storeBanner?: string; storeDescription?: string;
  storeHours?: StoreHours | null;
  storeAnnouncement?: string;
  storeMinOrder?: number;
  storeDeliveryTime?: string;
  storeIsOpen: boolean;
  lastLoginAt?: string; createdAt?: string;
  stats: { todayOrders: number; todayRevenue: number; totalOrders: number; totalRevenue: number };
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("vendor_token");
    if (t) {
      setToken(t);
      api.getMe().then(setUser).catch(() => {
        localStorage.removeItem("vendor_token");
      }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = (t: string, u: AuthUser) => { localStorage.setItem("vendor_token", t); setToken(t); setUser(u); };
  const logout = () => { localStorage.removeItem("vendor_token"); setToken(null); setUser(null); };
  const refreshUser = async () => { const u = await api.getMe(); setUser(u); };

  return <Ctx.Provider value={{ user, token, loading, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}
