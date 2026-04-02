import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export type User = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  username: string | null;
  role: string;
  avatar: string | null;
  walletBalance: number;
  cnic: string | null;
  city: string | null;
  address: string | null;
  accountLevel: "bronze" | "silver" | "gold";
  kycStatus: "none" | "pending" | "verified" | "rejected";
  totpEnabled: boolean;
  createdAt: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: async () => {}, logout: () => {}, setUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { setLoading(false); return; }
    api.getProfile()
      .then((d: any) => setUser(normaliseUser(d)))
      .catch(() => { api.clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (token: string) => {
    api.setToken(token);
    const d = await api.getProfile();
    setUser(normaliseUser(d));
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function normaliseUser(d: any): User {
  return {
    id: d.id,
    name: d.name ?? null,
    phone: d.phone,
    email: d.email ?? null,
    username: d.username ?? null,
    role: d.role,
    avatar: d.avatar ?? null,
    walletBalance: typeof d.walletBalance === "number" ? d.walletBalance : parseFloat(d.walletBalance ?? "0"),
    cnic: d.cnic ?? null,
    city: d.city ?? null,
    address: d.address ?? null,
    accountLevel: (d.accountLevel as User["accountLevel"]) ?? "bronze",
    kycStatus: (d.kycStatus as User["kycStatus"]) ?? "none",
    totpEnabled: d.totpEnabled ?? false,
    createdAt: d.createdAt ?? new Date().toISOString(),
  };
}
