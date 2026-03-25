import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useState } from "react";
import { Header } from "../components/Header";
import { fc, CARD, CARD_HEADER, STAT_VAL, STAT_LBL, BTN_XS, PAGE, SECTION } from "../lib/ui";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const { data: stats, isLoading } = useQuery({ queryKey: ["vendor-stats"], queryFn: () => api.getStats(), refetchInterval: 30000 });
  const { data: ordersData } = useQuery({ queryKey: ["vendor-orders", "all"], queryFn: () => api.getOrders(), refetchInterval: 20000 });

  const toggleMut = useMutation({
    mutationFn: (isOpen: boolean) => api.updateStore({ storeIsOpen: isOpen }),
    onSuccess: () => { refreshUser(); qc.invalidateQueries({ queryKey: ["vendor-stats"] }); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => api.updateOrder(id, "confirmed"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-orders"] }); qc.invalidateQueries({ queryKey: ["vendor-stats"] }); showToast("✅ Order confirmed!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const allOrders = ordersData?.orders || [];
  const pendingOrders = allOrders.filter((o: any) => o.status === "pending");
  const activeOrders  = allOrders.filter((o: any) => ["confirmed","preparing","ready"].includes(o.status));

  const statItems = [
    { label: "Today Orders",   value: isLoading ? "—" : String(stats?.today?.orders ?? 0),   color: "text-orange-500" },
    { label: "Today Revenue",  value: isLoading ? "—" : fc(stats?.today?.revenue ?? 0),       color: "text-amber-600" },
    { label: "This Week",      value: isLoading ? "—" : fc(stats?.week?.revenue ?? 0),        color: "text-blue-600"  },
    { label: "This Month",     value: isLoading ? "—" : fc(stats?.month?.revenue ?? 0),       color: "text-purple-600"},
  ];

  return (
    <div className={PAGE}>
      {/* ── Header ── */}
      <Header pb="pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">Welcome back,</p>
            <h1 className="text-2xl font-extrabold text-white mt-0.5 leading-tight">{user?.storeName || "My Store"}</h1>
            {user?.storeCategory && (
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full mt-2 inline-block capitalize font-semibold">
                {user.storeCategory}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs font-medium">Wallet</p>
            <p className="text-2xl font-extrabold text-white">{fc(user?.walletBalance || 0)}</p>
          </div>
        </div>
      </Header>

      <div className={SECTION}>
        {/* ── Store Toggle ── */}
        <div className={CARD}>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 text-base">{user?.storeIsOpen ? "🟢 Store is Open" : "🔴 Store is Closed"}</p>
              <p className="text-sm text-gray-500 mt-0.5">{user?.storeIsOpen ? "Accepting new orders" : "Tap to open your store"}</p>
            </div>
            <button
              onClick={() => toggleMut.mutate(!user?.storeIsOpen)}
              disabled={toggleMut.isPending}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 flex-shrink-0 ${user?.storeIsOpen ? "bg-green-400" : "bg-gray-300"}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${user?.storeIsOpen ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map(s => (
            <div key={s.label} className={CARD + " p-4"}>
              <p className={STAT_LBL + " text-gray-400"}>{s.label}</p>
              <p className={`${STAT_VAL} ${s.color} mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Low Stock Alert ── */}
        {(stats?.lowStock ?? 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-700 text-sm">{stats.lowStock} Products Low on Stock</p>
              <p className="text-red-500 text-xs mt-0.5">Go to Products → update stock</p>
            </div>
          </div>
        )}

        {/* ── Pending Orders ── */}
        {pendingOrders.length > 0 && (
          <div className={CARD}>
            <div className={CARD_HEADER + " bg-orange-50 border-b border-orange-100"}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <div>
                  <p className="font-bold text-orange-800 text-sm">{pendingOrders.length} New Order{pendingOrders.length > 1 ? "s" : ""}!</p>
                  <p className="text-orange-500 text-xs">Accept within 5 minutes</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingOrders.slice(0, 3).map((o: any) => (
                <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                    {o.type === "food" ? "🍔" : "🛒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                    <p className="text-xs text-gray-400 font-mono">#{o.id.slice(-6).toUpperCase()} · {fc(o.total)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => acceptMut.mutate(o.id)} disabled={acceptMut.isPending}
                      className="h-9 px-4 bg-green-500 text-white text-xs font-bold rounded-xl android-press min-h-0">
                      ✓ Accept
                    </button>
                    <button onClick={() => api.updateOrder(o.id, "cancelled").then(() => qc.invalidateQueries({ queryKey: ["vendor-orders"] }))}
                      className="h-9 px-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl android-press min-h-0">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active Orders ── */}
        {activeOrders.length > 0 && (
          <div className={CARD}>
            <div className={CARD_HEADER}>
              <p className="font-bold text-gray-800 text-sm">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">In Progress</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.slice(0, 3).map((o: any) => (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                    <p className="text-xs text-gray-400 font-mono">#{o.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-800">{fc(o.total)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      o.status === "preparing" ? "bg-purple-100 text-purple-700" :
                      o.status === "ready" ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"
                    }`}>{o.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingOrders.length === 0 && activeOrders.length === 0 && (
          <div className={CARD + " px-4 py-12 text-center"}>
            <p className="text-5xl mb-3">📋</p>
            <p className="font-bold text-gray-600 text-base">No new orders</p>
            <p className="text-sm text-gray-400 mt-1">New orders will appear here instantly</p>
          </div>
        )}

        {/* ── Commission Banner ── */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-orange-100 font-medium">Your Commission</p>
              <p className="text-4xl font-extrabold">85%</p>
              <p className="text-xs text-orange-100 mt-0.5">of every order value</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-100">All-Time Earned</p>
              <p className="text-2xl font-extrabold">{fc(user?.stats?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center toast-in"
          style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 8px)", paddingLeft: "16px", paddingRight: "16px" }}>
          <div className="bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-sm w-full text-center">{toast}</div>
        </div>
      )}
    </div>
  );
}
