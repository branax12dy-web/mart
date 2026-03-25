import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-dashboard"],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["vendor-orders"],
    queryFn: () => api.getOrders(),
    refetchInterval: 30000,
  });

  const stats = data || {};
  const orders = recentOrders?.orders || [];
  const pending = orders.filter((o: any) => o.status === "pending" || o.status === "confirmed");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white px-5 pt-12 pb-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-orange-100 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold">{user?.storeName || user?.name || "Vendor"} 🏪</h1>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs">Wallet</p>
            <p className="font-bold text-lg">{formatCurrency(user?.walletBalance || 0)}</p>
          </div>
        </div>
        {user?.storeCategory && (
          <span className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full capitalize">{user.storeCategory}</span>
        )}
      </div>

      <div className="px-4 -mt-10 pb-6 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Today's Orders</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{isLoading ? "—" : (stats.todayOrders ?? user?.stats?.todayOrders ?? 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Today's Revenue (85%)</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{isLoading ? "—" : formatCurrency(stats.todayRevenue ?? user?.stats?.todayRevenue ?? 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{isLoading ? "—" : formatCurrency(stats.monthRevenue ?? 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-gray-700 mt-1">{isLoading ? "—" : (stats.totalOrders ?? user?.stats?.totalOrders ?? 0)}</p>
          </div>
        </div>

        {/* Pending Orders Alert */}
        {pending.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔔</span>
              <p className="font-bold text-orange-800">{pending.length} Pending Order{pending.length > 1 ? "s" : ""}</p>
            </div>
            <p className="text-sm text-orange-700">Go to Orders tab to confirm them</p>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Recent Orders</h3>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-gray-500">No orders yet</p>
              <p className="text-gray-400 text-sm">Orders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${o.type === "food" ? "bg-red-50" : o.type === "mart" ? "bg-blue-50" : "bg-purple-50"}`}>
                    {o.type === "food" ? "🍔" : o.type === "mart" ? "🛒" : "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                    <p className="text-xs text-gray-400 font-mono">#{o.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(o.total * 0.85)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === "pending" ? "bg-yellow-100 text-yellow-700" : o.status === "delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings Info */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <p className="text-sm text-orange-100">Commission Info</p>
          <p className="font-bold text-lg mt-1">You earn 85% of every order</p>
          <p className="text-xs text-orange-100 mt-1">15% platform fee applies. Earnings credited to wallet after delivery.</p>
        </div>
      </div>
    </div>
  );
}
