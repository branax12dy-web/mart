import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { BottomNav } from "./components/BottomNav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Profile from "./pages/Profile";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🏪</div>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-white mt-3 font-medium">Loading Vendor Portal...</p>
      </div>
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="max-w-md mx-auto relative">
      <div className="pb-20">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/orders" component={Orders} />
          <Route path="/products" component={Products} />
          <Route path="/profile" component={Profile} />
        </Switch>
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
