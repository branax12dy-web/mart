import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { SocketProvider } from "./lib/socket";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerPush } from "./lib/push";
import Login from "./pages/Login";
import Booking from "./pages/Booking";
import Tracking from "./pages/Tracking";
import Completed from "./pages/Completed";
import History from "./pages/History";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") registerPush().catch(() => {});
      }).catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <SocketProvider>
      <Switch>
        <Route path="/" component={Booking} />
        <Route path="/tracking/:id">
          {(params: { id: string }) => <Tracking rideId={params.id} />}
        </Route>
        <Route path="/completed/:id">
          {(params: { id: string }) => <Completed rideId={params.id} />}
        </Route>
        <Route path="/history" component={History} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/profile" component={Profile} />
        <Route>
          {() => {
            window.location.href = import.meta.env.BASE_URL;
            return null;
          }}
        </Route>
      </Switch>
    </SocketProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <ProtectedRouter />
          </AuthProvider>
        </WouterRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
