import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useState } from "react";

function fc(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const { data: stats, isLoading } = useQuery({ queryKey: ["vendor-stats"], queryFn: () => api.getStats(), refetchInterval: 30000 });
  const { data: ordersData } = useQuery({ queryKey: ["vendor-orders", "all"], queryFn: () => api.getOrders(), refetchInterval: 20000 });

  const toggleStoreMut = useMutation({
    mutationFn: (isOpen: boolean) => api.updateStore({ storeIsOpen: isOpen }),
    onSuccess: () => { refreshUser(); qc.invalidateQueries({ queryKey: ["vendor-stats"] }); showToast(user?.storeIsOpen ? "🔴 Store closed" : "🟢 Store opened"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const allOrders = ordersData?.orders || [];
  const pendingOrders = allOrders.filter((o: any) => o.status === "pending");
  const activeOrders = allOrders.filter((o: any) => ["confirmed","preparing","ready"].includes(o.status));

  const acceptMut = useMutation({
    mutationFn: (id: string) => api.updateOrder(id, "confirmed"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-orders"] }); qc.invalidateQueries({ queryKey: ["vendor-stats"] }); showToast("✅ Order confirmed!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-10 -translate-x-10" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-orange-100 text-sm font-medium">Welcome back,</p>
              <h1 className="text-2xl font-bold text-white">{user?.storeName || "My Store"} 🏪</h1>
              {user?.storeCategory && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user.storeCategory}</span>}
            </div>
            <div className="text-right">
              <p className="text-orange-100 text-xs">Wallet</p>
              <p className="font-bold text-white text-lg">{fc(user?.walletBalance || 0)}</p>
            </div>
          </div>
          {/* Store Toggle */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">{user?.storeIsOpen ? "🟢 Open for Orders" : "🔴 Store Closed"}</p>
              <p className="text-orange-100 text-xs">{user?.storeIsOpen ? "Accepting new orders" : "Tap to open your store"}</p>
            </div>
            <button
              onClick={() => toggleStoreMut.mutate(!user?.storeIsOpen)}
              disabled={toggleStoreMut.isPending}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${user?.storeIsOpen ? "bg-green-400" : "bg-white/30"}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${user?.storeIsOpen ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-14 pb-6 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Today's Orders</p>
            <p className="text-3xl font-bold text-orange-500">{isLoading ? "—" : (stats?.today?.orders ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">orders received</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Today's Revenue</p>
            <p className="text-2xl font-bold text-amber-600">{isLoading ? "—" : fc(stats?.today?.revenue ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">your 85% share</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">This Week</p>
            <p className="text-2xl font-bold text-orange-600">{isLoading ? "—" : fc(stats?.week?.revenue ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.week?.orders ?? 0} orders</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">This Month</p>
            <p className="text-2xl font-bold text-gray-700">{isLoading ? "—" : fc(stats?.month?.revenue ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.month?.orders ?? 0} orders</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {(stats?.lowStock ?? 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-700">{stats.lowStock} Products Low on Stock!</p>
              <p className="text-red-600 text-sm">Go to Products → update stock quantities</p>
            </div>
          </div>
        )}

        {/* Pending Orders — Need Attention */}
        {pendingOrders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <p className="font-bold text-orange-800 text-sm">{pendingOrders.length} New Order{pendingOrders.length > 1 ? "s" : ""} — Action Required!</p>
                <p className="text-orange-600 text-xs">Accept or reject within 5 minutes</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingOrders.slice(0, 3).map((o: any) => (
                <div key={o.id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                    {o.type === "food" ? "🍔" : "🛒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                    <p className="text-xs text-gray-500 font-mono">#{o.id.slice(-6).toUpperCase()} · {fc(o.total)}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => acceptMut.mutate(o.id)} disabled={acceptMut.isPending} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold">Accept</button>
                    <button onClick={() => api.updateOrder(o.id, "cancelled").then(() => qc.invalidateQueries({ queryKey: ["vendor-orders"] }))} className="bg-red-100 text-red-600 text-xs px-2 py-1.5 rounded-lg font-bold">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-800">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</p>
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">In Progress</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.slice(0, 3).map((o: any) => (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                    <p className="text-xs text-gray-500 font-mono">#{o.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{fc(o.total)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === "preparing" ? "bg-purple-100 text-purple-700" : o.status === "ready" ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingOrders.length === 0 && activeOrders.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-semibold text-gray-600">No new orders right now</p>
            <p className="text-gray-400 text-sm mt-1">New orders will appear here instantly</p>
          </div>
        )}

        {/* Commission Info */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-orange-100 font-medium">Your Commission</p>
              <p className="text-2xl font-bold">85%</p>
              <p className="text-xs text-orange-100">of every order value</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-100">All-Time Earned</p>
              <p className="text-xl font-bold">{fc(user?.stats?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center animate-in slide-in-from-top">{toast}</div>}
    </div>
  );
}
