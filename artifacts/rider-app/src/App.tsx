import { Switch, Route, Router as WouterRouter } from "wouter";
import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { usePlatformConfig, getRiderModules } from "./lib/useConfig";
import { useLanguage, LanguageProvider } from "./lib/useLanguage";
import { BottomNav } from "./components/BottomNav";
import { AnnouncementBar } from "./components/AnnouncementBar";
import { MaintenanceScreen } from "./components/MaintenanceScreen";
import { api } from "./lib/api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Active from "./pages/Active";
import History from "./pages/History";
import Earnings from "./pages/Earnings";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Notifications from "./pages/Notifications";
import SecuritySettings from "./pages/SecuritySettings";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function AppRoutes() {
  const { user, loading } = useAuth();
  const { config } = usePlatformConfig();
  const modules = getRiderModules(config);
  useLanguage();

  /* Show a subtle toast whenever refreshUser fails persistently */
  const [refreshFailToast, setRefreshFailToast] = useState(false);
  const refreshFailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handler = () => {
      setRefreshFailToast(true);
      if (refreshFailTimer.current) clearTimeout(refreshFailTimer.current);
      refreshFailTimer.current = setTimeout(() => setRefreshFailToast(false), 4000);
    };
    window.addEventListener("ajkmart:refresh-user-failed", handler);
    return () => {
      window.removeEventListener("ajkmart:refresh-user-failed", handler);
      if (refreshFailTimer.current) clearTimeout(refreshFailTimer.current);
    };
  }, []);

  /* Global heartbeat — runs on every page whenever rider is online.
     Emits rider:heartbeat every 30s with battery level so admin fleet stays up-to-date. */
  useEffect(() => {
    if (!user?.isOnline || !user?.id) return;
    let batteryLevel: number | undefined;
    type BatteryManager = { level: number; addEventListener: (event: string, cb: () => void) => void };
    (navigator as unknown as { getBattery?: () => Promise<BatteryManager> }).getBattery?.()
      .then((batt) => {
        batteryLevel = batt.level;
        batt.addEventListener("levelchange", () => { batteryLevel = batt.level; });
      }).catch(() => {});

    let socket: ReturnType<typeof import("socket.io-client")["io"]> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const token = api.getToken();

    import("socket.io-client").then(({ io }) => {
      socket = io(window.location.origin, {
        path: "/api/socket.io",
        auth: { token },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionDelay: 2000,
      });

      const sendHeartbeat = () => {
        if (socket?.connected) {
          socket.emit("rider:heartbeat", { batteryLevel, isOnline: true });
        }
      };

      socket.on("connect", sendHeartbeat);
      intervalId = setInterval(sendHeartbeat, 30_000);
    }).catch(() => {});

    return () => {
      if (intervalId) clearInterval(intervalId);
      socket?.disconnect();
    };
  }, [user?.isOnline, user?.id]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🏍️</div>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-white mt-3 font-medium">Loading Rider Portal...</p>
      </div>
    </div>
  );

  if (!user) return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route><Login /></Route>
    </Switch>
  );

  return (
    <div className="max-w-md mx-auto relative flex flex-col min-h-screen">
      {/* ── Maintenance overlay (fullscreen) ── */}
      {config.platform.appStatus === "maintenance" && (
        <MaintenanceScreen message={config.content.maintenanceMsg} appName={config.platform.appName} />
      )}

      {/* ── Subtle sync-failure toast ── */}
      {refreshFailToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Connection issue — profile sync failed
        </div>
      )}

      {/* ── Sticky header stack: announcement + any future system bars.
            max-h caps combined height so stacked bars never push content
            off-screen on small viewports; overflow-y-auto scrolls if needed. ── */}
      <div className="sticky top-0 z-50 flex flex-col max-h-[30vh] overflow-y-auto">
        <AnnouncementBar message={config.content.announcement} />
      </div>

      <div className="flex-1" style={{ paddingBottom: "calc(64px + max(8px, env(safe-area-inset-bottom, 8px)))" }}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/active" component={Active} />
          {modules.history && <Route path="/history" component={History} />}
          {modules.earnings && <Route path="/earnings" component={Earnings} />}
          {modules.wallet && <Route path="/wallet" component={Wallet} />}
          <Route path="/notifications" component={Notifications} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings/security" component={SecuritySettings} />
        </Switch>
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
