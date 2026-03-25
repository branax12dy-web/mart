import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function formatDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function History() {
  const { data, isLoading } = useQuery({ queryKey: ["rider-history"], queryFn: () => api.getHistory() });
  const history = data?.history || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Delivery History</h1>
        <p className="text-green-200 text-sm">{history.length} completed tasks</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse"/>)
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-bold text-gray-700">No history yet</p>
            <p className="text-gray-400 text-sm mt-1">Your deliveries will appear here</p>
          </div>
        ) : (
          history.map((item: any) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${item.kind === "ride" ? "bg-green-50" : "bg-blue-50"}`}>
                  {item.kind === "ride" ? (item.type === "bike" ? "🏍️" : "🚗") : (item.type === "food" ? "🍔" : item.type === "mart" ? "🛒" : "📦")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 capitalize">{item.kind === "ride" ? `${item.type} Ride` : `${item.type} Delivery`}</p>
                  <p className="text-xs text-gray-500 truncate">{item.address || "—"}</p>
                  <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600">+{formatCurrency(item.earnings)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "delivered" || item.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
