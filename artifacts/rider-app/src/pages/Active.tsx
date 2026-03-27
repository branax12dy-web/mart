import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";
import { usePlatformConfig } from "../lib/useConfig";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

function NavButton({ label, lat, lng, address }: { label: string; lat?: number; lng?: number; address?: string }) {
  const href = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-colors">
      🗺️ {label}
    </a>
  );
}

function CallButton({ name, phone }: { name?: string | null; phone?: string | null }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`}
      className="flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-green-100 transition-colors">
      📞 Call {name || "Customer"}
    </a>
  );
}

export default function Active() {
  const qc = useQueryClient();
  const { config } = usePlatformConfig();
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rider-active"],
    queryFn: () => api.getActive(),
    refetchInterval: 8000,
  });

  const updateOrderMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateOrder(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider-active"] }); qc.invalidateQueries({ queryKey: ["rider-history"] }); showToast("✅ Status updated!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });
  const updateRideMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateRide(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider-active"] }); qc.invalidateQueries({ queryKey: ["rider-history"] }); showToast("✅ Status updated!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p className="text-gray-500">Loading...</p></div>
    </div>
  );

  const order = data?.order;
  const ride  = data?.ride;

  if (!order && !ride) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Active Delivery</h1>
        <p className="text-green-200 text-sm">Current task</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">🏍️</p>
          <h2 className="text-xl font-bold text-gray-700">No Active Task</h2>
          <p className="text-gray-400 mt-2">Accept an order or ride from the Home tab</p>
          <button onClick={() => refetch()} className="mt-4 bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold">Refresh</button>
        </div>
      </div>
    </div>
  );

  /* ── Progress bar for rides ── */
  const RIDE_STEPS  = ["accepted", "arrived", "in_transit", "completed"];
  const RIDE_LABELS = ["Accepted", "Arrived", "In Transit", "Done"];
  const rideStep    = ride ? RIDE_STEPS.indexOf(ride.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Active {order ? "Delivery" : "Ride"}</h1>
        <p className="text-green-200 text-sm">In progress</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── ACTIVE ORDER ── */}
        {order && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-blue-50 px-4 py-3 flex items-center gap-2">
              <span className="text-xl">{order.type === "food" ? "🍔" : order.type === "mart" ? "🛒" : "📦"}</span>
              <div>
                <p className="font-bold capitalize">{order.type} Order</p>
                <p className="text-xs text-gray-500 font-mono">#{order.id.slice(-6).toUpperCase()}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-green-600">{formatCurrency(order.total)}</p>
                <p className="text-xs text-gray-500">Your cut: {formatCurrency(order.total * (config.finance.riderEarningPct / 100))}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Delivery address */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Delivery Address</p>
                <p className="text-sm font-semibold text-gray-800">{order.deliveryAddress || "Address not provided"}</p>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${order.status === "out_for_delivery" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                  {order.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>

              {/* Items */}
              {order.items && Array.isArray(order.items) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 font-medium mb-2">Items ({order.items.length})</p>
                  <div className="space-y-1">
                    {order.items.slice(0, 4).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name} × {item.quantity}</span>
                        <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {order.deliveryAddress && (
                  <NavButton label="Navigate" address={order.deliveryAddress} />
                )}
                <CallButton name={order.customerName} phone={order.customerPhone} />
              </div>

              {order.status === "out_for_delivery" && (
                <button
                  onClick={() => updateOrderMut.mutate({ id: order.id, status: "delivered" })}
                  disabled={updateOrderMut.isPending}
                  className="w-full bg-green-600 text-white font-bold rounded-xl py-3.5 text-lg disabled:opacity-60"
                >
                  {updateOrderMut.isPending ? "Updating..." : "✓ Mark as Delivered"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE RIDE ── */}
        {ride && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-green-50 px-4 py-3 flex items-center gap-2">
              <span className="text-xl">{ride.type === "bike" ? "🏍️" : "🚗"}</span>
              <div>
                <p className="font-bold capitalize">{ride.type} Ride</p>
                <p className="text-xs text-gray-500 font-mono">#{ride.id.slice(-6).toUpperCase()} · {ride.distance}km</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-green-600">{formatCurrency(ride.fare)}</p>
                <p className="text-xs text-gray-500">Your cut: {formatCurrency(ride.fare * (config.finance.riderEarningPct / 100))}</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Progress Bar */}
              {rideStep >= 0 && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between mb-2">
                    {RIDE_LABELS.map((label, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all
                          ${i <= rideStep ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-300"}`}>
                          {i < rideStep ? "✓" : i + 1}
                        </div>
                        <p className={`text-[9px] font-semibold ${i <= rideStep ? "text-green-600" : "text-gray-400"}`}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-1.5 bg-gray-200 rounded-full">
                    <div className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${rideStep < 0 ? 0 : (rideStep / (RIDE_STEPS.length - 1)) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Pickup → Drop */}
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-600 font-bold mb-1">🟢 PICKUP</p>
                <p className="text-sm font-semibold">{ride.pickupAddress}</p>
              </div>
              <div className="text-center text-gray-400 text-xl">↓</div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-600 font-bold mb-1">🔴 DROP</p>
                <p className="text-sm font-semibold">{ride.dropAddress}</p>
              </div>

              {/* Navigation buttons — contextual based on ride status */}
              <div className="grid grid-cols-2 gap-2">
                {ride.status === "accepted" ? (
                  <NavButton label="Go to Pickup" lat={ride.pickupLat} lng={ride.pickupLng} address={ride.pickupAddress} />
                ) : (
                  <NavButton label="Go to Drop" lat={ride.dropLat} lng={ride.dropLng} address={ride.dropAddress} />
                )}
                <CallButton name={ride.customerName} phone={ride.customerPhone} />
              </div>

              {/* Customer info */}
              {ride.customerName && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <div>
                    <p className="text-xs text-blue-500 font-semibold">Passenger</p>
                    <p className="text-sm font-bold text-gray-800">{ride.customerName}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {ride.status === "accepted" && (
                  <button
                    onClick={() => updateRideMut.mutate({ id: ride.id, status: "arrived" })}
                    disabled={updateRideMut.isPending}
                    className="flex-1 bg-purple-600 text-white font-bold rounded-xl py-3.5 disabled:opacity-60"
                  >📍 I'm at Pickup</button>
                )}
                {ride.status === "arrived" && (
                  <button
                    onClick={() => updateRideMut.mutate({ id: ride.id, status: "in_transit" })}
                    disabled={updateRideMut.isPending}
                    className="flex-1 bg-blue-600 text-white font-bold rounded-xl py-3.5 disabled:opacity-60"
                  >🚗 Start Ride</button>
                )}
                {ride.status === "in_transit" && (
                  <>
                    <button
                      onClick={() => updateRideMut.mutate({ id: ride.id, status: "completed" })}
                      disabled={updateRideMut.isPending}
                      className="flex-1 bg-green-600 text-white font-bold rounded-xl py-3.5 disabled:opacity-60"
                    >✓ Complete Ride</button>
                    <button
                      onClick={() => updateRideMut.mutate({ id: ride.id, status: "cancelled" })}
                      disabled={updateRideMut.isPending}
                      className="px-4 bg-red-50 text-red-600 font-bold rounded-xl py-3.5 text-sm"
                    >Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
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
