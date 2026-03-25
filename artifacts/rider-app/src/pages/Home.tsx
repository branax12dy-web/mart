import { useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

export default function Home() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const toggleOnline = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const newStatus = !user?.isOnline;
      await api.setOnline(newStatus);
      await refreshUser();
      showToast(newStatus ? "🟢 You are now Online!" : "🔴 You are now Offline");
    } catch(e: any) { showToast("❌ " + e.message); }
    setToggling(false);
  };

  const { data: earningsData } = useQuery({
    queryKey: ["rider-earnings"],
    queryFn: () => api.getEarnings(),
    refetchInterval: 60000,
  });

  const { data: requestsData } = useQuery({
    queryKey: ["rider-requests"],
    queryFn: () => api.getRequests(),
    refetchInterval: user?.isOnline ? 15000 : 60000,
  });

  const acceptOrderMut = useMutation({
    mutationFn: (id: string) => api.acceptOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider-requests"] }); qc.invalidateQueries({ queryKey: ["rider-active"] }); showToast("✅ Order accepted!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });
  const acceptRideMut = useMutation({
    mutationFn: (id: string) => api.acceptRide(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider-requests"] }); qc.invalidateQueries({ queryKey: ["rider-active"] }); showToast("✅ Ride accepted!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const totalRequests = (requestsData?.orders?.length || 0) + (requestsData?.rides?.length || 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white px-5 pt-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-green-200 text-sm">Good day,</p>
            <h1 className="text-2xl font-bold">{user?.name || "Rider"} 🏍️</h1>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">Wallet</p>
            <p className="font-bold text-lg">{formatCurrency(user?.walletBalance || 0)}</p>
          </div>
        </div>

        {/* Online Toggle */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{user?.isOnline ? "🟢 Online" : "🔴 Offline"}</p>
              <p className="text-green-100 text-sm">{user?.isOnline ? "Accepting orders & rides" : "Tap to go online"}</p>
            </div>
            <button
              onClick={toggleOnline} disabled={toggling}
              className={`w-16 h-9 rounded-full relative transition-all duration-300 ${user?.isOnline ? "bg-green-400" : "bg-white/30"} ${toggling ? "opacity-60" : ""}`}
            >
              <div className={`w-7 h-7 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${user?.isOnline ? "left-8" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-10">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Today's Deliveries</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{user?.stats?.deliveriesToday || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Today's Earnings</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(user?.stats?.earningsToday || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">This Week</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(earningsData?.week?.earnings || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Deliveries</p>
            <p className="text-3xl font-bold text-gray-700 mt-1">{user?.stats?.totalDeliveries || 0}</p>
          </div>
        </div>

        {/* Available Requests */}
        {user?.isOnline && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Available Now</h3>
              {totalRequests > 0 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{totalRequests} waiting</span>}
            </div>
            {totalRequests === 0 ? (
              <div className="p-8 text-center">
                <p className="text-4xl mb-2">🏍️</p>
                <p className="text-gray-500 font-medium">No requests right now</p>
                <p className="text-gray-400 text-sm">We'll notify you when orders arrive</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {requestsData?.orders?.slice(0, 3).map((o: any) => (
                  <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                      {o.type === "food" ? "🍔" : o.type === "mart" ? "🛒" : o.type === "pharmacy" ? "💊" : "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 capitalize">{o.type} Order</p>
                      <p className="text-xs text-gray-500 truncate">{o.deliveryAddress || "Delivery address"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-600 text-sm">+{formatCurrency(o.total * 0.8)}</p>
                      <button onClick={() => acceptOrderMut.mutate(o.id)} disabled={acceptOrderMut.isPending} className="mt-1 bg-green-600 text-white text-xs px-3 py-1 rounded-lg font-bold">Accept</button>
                    </div>
                  </div>
                ))}
                {requestsData?.rides?.slice(0, 2).map((r: any) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
                      {r.type === "bike" ? "🏍️" : "🚗"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 capitalize">{r.type} Ride · {r.distance}km</p>
                      <p className="text-xs text-gray-500 truncate">{r.pickupAddress} → {r.dropAddress}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-600 text-sm">+{formatCurrency(r.fare * 0.8)}</p>
                      <button onClick={() => acceptRideMut.mutate(r.id)} disabled={acceptRideMut.isPending} className="mt-1 bg-green-600 text-white text-xs px-3 py-1 rounded-lg font-bold">Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!user?.isOnline && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-4">
            <p className="text-5xl mb-3">😴</p>
            <p className="font-bold text-gray-700">You're Offline</p>
            <p className="text-gray-400 text-sm mt-1">Go online to start accepting orders</p>
            <button onClick={toggleOnline} className="mt-4 bg-green-600 text-white px-6 py-3 rounded-xl font-bold">Go Online Now</button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center animate-in slide-in-from-top">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
