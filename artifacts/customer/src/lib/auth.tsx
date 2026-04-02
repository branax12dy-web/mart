import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

type User = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: async () => {}, logout: () => {},
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
    api.getMe()
      .then((d: any) => setUser(d.user ?? d))
      .catch(() => { api.clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (token: string) => {
    api.setToken(token);
    const d = await api.getMe();
    setUser(d.user ?? d);
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
