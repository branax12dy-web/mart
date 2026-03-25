import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  pending:   { next: "confirmed", label: "Confirm Order",   color: "bg-orange-500" },
  confirmed: { next: "preparing", label: "Start Preparing", color: "bg-blue-500" },
  preparing: { next: "ready",     label: "Mark Ready",      color: "bg-purple-500" },
};

const STATUS_COLORS: Record<string, string> = {
  pending:          "bg-yellow-100 text-yellow-700",
  confirmed:        "bg-blue-100 text-blue-700",
  preparing:        "bg-purple-100 text-purple-700",
  ready_for_pickup: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-red-100 text-red-700",
};

const TABS = ["all", "pending", "preparing", "delivered"] as const;
type Tab = typeof TABS[number];

export default function Orders() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

  const { data, isLoading } = useQuery({ queryKey: ["vendor-orders"], queryFn: () => api.getOrders(), refetchInterval: 20000 });
  const allOrders = data?.orders || [];

  const filtered = tab === "all" ? allOrders :
    tab === "pending" ? allOrders.filter((o: any) => ["pending","confirmed"].includes(o.status)) :
    tab === "preparing" ? allOrders.filter((o: any) => ["preparing","ready_for_pickup"].includes(o.status)) :
    allOrders.filter((o: any) => o.status === "delivered");

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateOrder(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-orders"] }); qc.invalidateQueries({ queryKey: ["vendor-dashboard"] }); showToast("✅ Order updated!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-orange-100 text-sm">{allOrders.length} total orders</p>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"}`}
          >
            {t === "pending" ? "Pending" : t === "preparing" ? "Preparing" : t === "delivered" ? "Delivered" : "All"}
            {t === "pending" && allOrders.filter((o:any) => ["pending","confirmed"].includes(o.status)).length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {allOrders.filter((o:any) => ["pending","confirmed"].includes(o.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse"/>)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-bold text-gray-700">No orders here</p>
          </div>
        ) : (
          filtered.map((o: any) => {
            const next = STATUS_FLOW[o.status];
            const items = Array.isArray(o.items) ? o.items : [];
            return (
              <div key={o.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600"}`}>
                      {o.status.replace(/_/g," ").toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 font-mono">#{o.id.slice(-6).toUpperCase()} · {formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatCurrency(o.total)}</p>
                    <p className="text-xs text-orange-500 font-semibold">You: {formatCurrency(o.total * 0.85)}</p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.name} × {item.quantity}</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {items.length > 3 && <p className="text-xs text-gray-400">+{items.length - 3} more items</p>}
                </div>
                {next && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => updateMut.mutate({ id: o.id, status: next.next })}
                      disabled={updateMut.isPending}
                      className={`w-full py-2.5 ${next.color} text-white font-bold rounded-xl text-sm disabled:opacity-60`}
                    >
                      {next.label} →
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {toastMsg && (
        <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
