import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";

interface AuthUser {
  id: string; phone: string; name?: string; email?: string;
  avatar?: string; isOnline: boolean; walletBalance: number;
  createdAt?: string; lastLoginAt?: string;
  stats: { deliveriesToday: number; earningsToday: number; totalDeliveries: number; totalEarnings: number; rating?: number };
  // Profile fields
  cnic?: string; city?: string; address?: string; emergencyContact?: string;
  vehicleType?: string; vehiclePlate?: string;
  bankName?: string; bankAccount?: string; bankAccountTitle?: string;
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
    const t = localStorage.getItem("rider_token");
    if (t) {
      setToken(t);
      api.getMe().then(setUser).catch(() => {
        localStorage.removeItem("rider_token");
      }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = (t: string, u: AuthUser) => {
    localStorage.setItem("rider_token", t);
    setToken(t); setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("rider_token");
    setToken(null); setUser(null);
  };

  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(u);
  };

  return <Ctx.Provider value={{ user, token, loading, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}
