import { useState } from "react";
import { useRidesEnriched, useUpdateRide } from "@/hooks/use-admin";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Search, User, MapPin, Navigation, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["searching", "accepted", "arrived", "in_transit", "completed", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  searching:  "Searching",
  accepted:   "Accepted",
  arrived:    "Arrived",
  in_transit: "In Transit",
  completed:  "Completed",
  cancelled:  "Cancelled",
};

export default function Rides() {
  const { data, isLoading } = useRidesEnriched();
  const updateMutation = useUpdateRide();
  const { toast } = useToast();
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, status }, {
      onSuccess: () => toast({ title: "Ride status updated ✅" }),
      onError: err => toast({ title: "Update failed", description: err.message, variant: "destructive" })
    });
  };

  const rides = data?.rides || [];
  const q = search.toLowerCase();

  const filtered = rides.filter((r: any) => {
    const matchSearch = r.id.toLowerCase().includes(q)
      || (r.userName  || "").toLowerCase().includes(q)
      || (r.userPhone || "").includes(q)
      || (r.riderName || "").toLowerCase().includes(q);
    const matchType   = typeFilter   === "all" || r.type   === typeFilter;
    const matchStatus = statusFilter === "all"
      || (statusFilter === "active"    && ["searching","accepted","arrived","in_transit"].includes(r.status))
      || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const bikeCount      = rides.filter((r: any) => r.type === "bike").length;
  const carCount       = rides.filter((r: any) => r.type === "car").length;
  const activeCount    = rides.filter((r: any) => ["searching","accepted","arrived","in_transit"].includes(r.status)).length;
  const completedCount = rides.filter((r: any) => r.status === "completed").length;
  const cancelledCount = rides.filter((r: any) => r.status === "cancelled").length;

  const openInMaps = (ride: any) => {
    if (ride.pickupLat && ride.dropLat) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${ride.pickupLat},${ride.pickupLng}&destination=${ride.dropLat},${ride.dropLng}&travelmode=driving`, "_blank");
    } else if (ride.pickupAddress && ride.dropAddress) {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ride.pickupAddress)}&destination=${encodeURIComponent(ride.dropAddress)}&travelmode=driving`, "_blank");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Rides</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">{bikeCount} bike · {carCount} car · {rides.length} total</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 rounded-2xl border-border/50 shadow-sm text-center">
          <p className="text-3xl font-bold text-foreground">{rides.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Rides</p>
        </Card>
        <Card className="p-4 rounded-2xl border-border/50 shadow-sm text-center bg-blue-50/60 border-blue-200/60">
          <p className="text-3xl font-bold text-blue-700">{activeCount}</p>
          <p className="text-xs text-blue-500 mt-1">Active Now</p>
        </Card>
        <Card className="p-4 rounded-2xl border-border/50 shadow-sm text-center bg-green-50/60 border-green-200/60">
          <p className="text-3xl font-bold text-green-700">{completedCount}</p>
          <p className="text-xs text-green-500 mt-1">Completed</p>
        </Card>
        <Card className="p-4 rounded-2xl border-border/50 shadow-sm text-center bg-red-50/60 border-red-200/60">
          <p className="text-3xl font-bold text-red-700">{cancelledCount}</p>
          <p className="text-xs text-red-400 mt-1">Cancelled</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4 rounded-2xl border-border/50 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, customer, rider or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 sm:h-11 rounded-xl bg-muted/30 border-border/50 text-sm"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            {["all", "bike", "car"].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold capitalize transition-colors border ${
                  typeFilter === t ? "bg-primary text-white border-primary" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary"
                }`}
              >
                {t === "bike" ? "🏍️ Bike" : t === "car" ? "🚗 Car" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Row */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all",       label: "All",        cls: "border-border/50 text-muted-foreground hover:border-primary" },
            { key: "active",    label: "🔵 Active",    cls: "border-blue-300 text-blue-700 bg-blue-50" },
            { key: "searching", label: "🟡 Searching", cls: "border-amber-300 text-amber-700 bg-amber-50" },
            { key: "completed", label: "✅ Completed", cls: "border-green-300 text-green-700 bg-green-50" },
            { key: "cancelled", label: "❌ Cancelled", cls: "border-red-300 text-red-600 bg-red-50" },
          ].map(({ key, label, cls }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                statusFilter === key ? "bg-primary text-white border-primary" : `bg-muted/30 ${cls}`
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Ride / Type</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Rider</TableHead>
                <TableHead className="font-semibold">Route</TableHead>
                <TableHead className="font-semibold">Fare</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading rides...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No rides found.</TableCell></TableRow>
              ) : (
                filtered.map((ride: any) => (
                  <TableRow key={ride.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedRide(ride)}>
                    <TableCell>
                      <p className="font-mono font-medium text-sm">{ride.id.slice(-8).toUpperCase()}</p>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-[10px] font-bold uppercase ${ride.type === 'bike' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-sky-50 text-sky-600 border-sky-200'}`}
                      >
                        {ride.type === 'bike' ? '🏍️' : '🚗'} {ride.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ride.userName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{ride.userName}</p>
                            <p className="text-xs text-muted-foreground">{ride.userPhone}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ride.riderName ? (
                        <div>
                          <p className="text-sm font-semibold">{ride.riderName}</p>
                          {ride.riderPhone && <p className="text-xs text-muted-foreground">{ride.riderPhone}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="truncate">{ride.pickupAddress || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span className="truncate">{ride.dropAddress || '—'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold">{formatCurrency(ride.fare)}</p>
                      <p className="text-xs text-muted-foreground">{ride.distance} km</p>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={ride.status} onValueChange={(val) => handleUpdateStatus(ride.id, val)}>
                        <SelectTrigger className={`w-32 sm:w-36 h-8 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-2 ${getStatusColor(ride.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs uppercase font-bold">{STATUS_LABELS[s] ?? s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(ride.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Ride Detail Modal */}
      <Dialog open={!!selectedRide} onOpenChange={open => { if (!open) setSelectedRide(null); }}>
        <DialogContent className="w-[95vw] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-green-600" />
              Ride Detail
            </DialogTitle>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-4 mt-2">
              {/* Info grid */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ride ID</span>
                  <span className="font-mono font-bold">{selectedRide.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase ${selectedRide.type === 'bike' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-sky-50 text-sky-600 border-sky-200'}`}>
                    {selectedRide.type === 'bike' ? '🏍️' : '🚗'} {selectedRide.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fare</span>
                  <span className="font-bold text-foreground">{formatCurrency(selectedRide.fare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span>{selectedRide.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize font-medium">{selectedRide.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getStatusColor(selectedRide.status)}`}>
                    {STATUS_LABELS[selectedRide.status] ?? selectedRide.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Customer & Rider */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1"><User className="w-3 h-3" /> Customer</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedRide.userName || "Unknown"}</p>
                  {selectedRide.userPhone && (
                    <a href={`tel:${selectedRide.userPhone}`} className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                      <Phone className="w-3 h-3" /> {selectedRide.userPhone}
                    </a>
                  )}
                </div>
                <div className={`rounded-xl p-3 space-y-1 border ${selectedRide.riderName ? "bg-green-50 border-green-100" : "bg-muted/30 border-border/50"}`}>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide flex items-center gap-1"><Car className="w-3 h-3" /> Rider</p>
                  {selectedRide.riderName ? (
                    <>
                      <p className="text-sm font-semibold text-gray-800">{selectedRide.riderName}</p>
                      {selectedRide.riderPhone && (
                        <a href={`tel:${selectedRide.riderPhone}`} className="flex items-center gap-1 text-xs text-green-600 font-medium hover:underline">
                          <Phone className="w-3 h-3" /> {selectedRide.riderPhone}
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not assigned yet</p>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="bg-gradient-to-b from-green-50 to-red-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> Route
                  </p>
                  {(selectedRide.pickupAddress || selectedRide.pickupLat) && (
                    <button
                      onClick={() => openInMaps(selectedRide)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      🗺️ Open in Maps
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Pickup</p>
                    <p className="text-sm">{selectedRide.pickupAddress || "—"}</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted ml-[7px] h-3" />
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Drop</p>
                    <p className="text-sm">{selectedRide.dropAddress || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Status changer inside modal */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Change Status</span>
                <Select value={selectedRide.status} onValueChange={(val) => { handleUpdateStatus(selectedRide.id, val); setSelectedRide({ ...selectedRide, status: val }); }}>
                  <SelectTrigger className={`w-40 h-9 text-[11px] font-bold uppercase tracking-wider border-2 ${getStatusColor(selectedRide.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="text-xs uppercase font-bold">{STATUS_LABELS[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Booked: {formatDate(selectedRide.createdAt)}</span>
                <span>Updated: {formatDate(selectedRide.updatedAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
