import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

function fc(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fd(d: string | Date) {
  return new Date(d).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const TABS = [
  { key: "new",       label: "New",        icon: "🔔", status: "new" },
  { key: "active",    label: "Preparing",  icon: "🍳", status: "active" },
  { key: "delivered", label: "Delivered",  icon: "✅", status: "delivered" },
  { key: "all",       label: "All",        icon: "📋", status: "all" },
];

const NEXT_STATUS: Record<string, { next: string; label: string; color: string }> = {
  pending:   { next: "confirmed", label: "✓ Accept Order",   color: "bg-green-500 text-white" },
  confirmed: { next: "preparing", label: "🍳 Start Preparing", color: "bg-blue-500 text-white" },
  preparing: { next: "ready",     label: "📦 Mark as Ready",  color: "bg-purple-500 text-white" },
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  ready:     "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function Orders() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("new");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const { data, isLoading, refetch } = useQuery({ queryKey: ["vendor-orders", tab], queryFn: () => api.getOrders(tab), refetchInterval: 15000 });
  const orders = data?.orders || [];

  const newCount = useQuery({ queryKey: ["vendor-orders-count"], queryFn: () => api.getOrders("new"), refetchInterval: 15000 });
  const newOrderCount = newCount.data?.orders?.length || 0;

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateOrder(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      qc.invalidateQueries({ queryKey: ["vendor-stats"] });
      qc.invalidateQueries({ queryKey: ["vendor-orders-count"] });
      const msgs: Record<string, string> = { confirmed: "✅ Order accepted!", preparing: "🍳 Preparing started", ready: "📦 Marked as ready", cancelled: "❌ Order cancelled" };
      showToast(msgs[status] || "✅ Updated");
    },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Orders</h1><p className="text-orange-100 text-sm">{orders.length} {tab} orders</p></div>
          <button onClick={() => refetch()} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm">↻</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[70px] flex flex-col items-center py-3 text-xs font-semibold transition-colors border-b-2 ${tab === t.key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400"}`}
          >
            <span className="text-base mb-0.5">{t.icon}</span>
            {t.label}
            {t.key === "new" && newOrderCount > 0 && (
              <span className="absolute mt-0.5 -translate-y-3 translate-x-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{newOrderCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse"/>)
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">{TABS.find(t => t.key === tab)?.icon || "📋"}</p>
            <p className="font-bold text-gray-700">No {tab === "all" ? "" : tab + " "}orders</p>
          </div>
        ) : (
          orders.map((o: any) => {
            const next = NEXT_STATUS[o.status];
            const items = Array.isArray(o.items) ? o.items : [];
            const isExpanded = expanded === o.id;
            return (
              <div key={o.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Order Header */}
                <button className="w-full px-4 py-3 flex items-center gap-3 text-left" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${o.type === "food" ? "bg-red-50" : "bg-blue-50"}`}>
                    {o.type === "food" ? "🍔" : o.type === "mart" ? "🛒" : o.type === "pharmacy" ? "💊" : "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[o.status] || "bg-gray-100 text-gray-600"}`}>
                        {o.status.replace(/_/g," ").toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">#{o.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fd(o.createdAt)} · {items.length} items</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-800">{fc(o.total)}</p>
                    <p className="text-xs text-orange-500 font-semibold">+{fc(o.total * 0.85)}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{isExpanded ? "▲" : "▼"}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-50">
                    {/* Items */}
                    {items.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 space-y-1">
                        <p className="text-xs font-bold text-gray-500 mb-2">ORDER ITEMS</p>
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                            <span className="font-semibold text-gray-800">{fc((item.price || 0) * (item.quantity || 1))}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                          <span>Total</span><span className="text-orange-600">{fc(o.total)}</span>
                        </div>
                      </div>
                    )}

                    {/* Delivery Info */}
                    {o.deliveryAddress && (
                      <div className="px-4 py-2 flex items-start gap-2">
                        <span className="text-sm mt-0.5">📍</span>
                        <p className="text-sm text-gray-600">{o.deliveryAddress}</p>
                      </div>
                    )}

                    {/* Payment */}
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-sm">💳</span>
                      <p className="text-sm text-gray-600 capitalize">{o.paymentMethod || "Cash"}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-4 pb-4 pt-2 flex gap-2">
                      {next ? (
                        <>
                          <button
                            onClick={() => updateMut.mutate({ id: o.id, status: next.next })}
                            disabled={updateMut.isPending}
                            className={`flex-1 py-3 ${next.color} font-bold rounded-xl text-sm disabled:opacity-60`}
                          >{next.label}</button>
                          {o.status === "pending" && (
                            <button
                              onClick={() => updateMut.mutate({ id: o.id, status: "cancelled" })}
                              disabled={updateMut.isPending}
                              className="px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm"
                            >✕ Reject</button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Quick Accept (when not expanded) */}
                {!isExpanded && o.status === "pending" && (
                  <div className="px-4 pb-3 flex gap-2">
                    <button onClick={() => updateMut.mutate({ id: o.id, status: "confirmed" })} disabled={updateMut.isPending} className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm">✓ Accept</button>
                    <button onClick={() => updateMut.mutate({ id: o.id, status: "cancelled" })} disabled={updateMut.isPending} className="px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm">✕</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">{toast}</div>}
    </div>
  );
}
