import { useState } from "react";
import { useParcelBookings, useUpdateParcelBooking } from "@/hooks/use-admin";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Box, Search, User, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["pending", "searching", "accepted", "in_transit", "completed", "cancelled"];

export default function Parcel() {
  const { data, isLoading } = useParcelBookings();
  const updateMutation = useUpdateParcelBooking();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, status }, {
      onSuccess: () => toast({ title: "Status updated" }),
      onError: err => toast({ title: "Update failed", description: err.message, variant: "destructive" })
    });
  };

  const bookings = data?.bookings || [];
  const q = search.toLowerCase();
  const filtered = bookings.filter((b: any) =>
    b.id.toLowerCase().includes(q) ||
    (b.userName || "").toLowerCase().includes(q) ||
    (b.userPhone || "").includes(q) ||
    (b.senderName || "").toLowerCase().includes(q) ||
    (b.receiverName || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
          <Box className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Parcel Bookings</h1>
          <p className="text-muted-foreground text-sm">Manage peer-to-peer parcel deliveries — {filtered.length} bookings</p>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-border/50 shadow-sm max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, sender, receiver, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Booked By</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No bookings found.</TableCell></TableRow>
              ) : (
                filtered.map((b: any) => (
                  <TableRow key={b.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                    <TableCell>
                      <p className="font-mono font-medium text-sm">{b.id.slice(-8).toUpperCase()}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase">{b.parcelType}</Badge>
                    </TableCell>
                    <TableCell>
                      {b.userName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{b.userName}</p>
                            <p className="text-xs text-muted-foreground">{b.userPhone}</p>
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{b.senderName} — {b.pickupAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{b.receiverName} — {b.dropAddress}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{formatCurrency(b.fare)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={b.status} onValueChange={(val) => handleUpdateStatus(b.id, val)}>
                        <SelectTrigger className={`w-36 h-8 text-[11px] font-bold uppercase tracking-wider border-2 ${getStatusColor(b.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs uppercase font-bold tracking-wider">{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={open => { if (!open) setSelectedBooking(null); }}>
        <DialogContent className="w-[95vw] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="w-5 h-5 text-orange-600" />
              Parcel Booking Detail
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="font-mono font-bold">{selectedBooking.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="uppercase text-[10px]">{selectedBooking.parcelType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booked By</span>
                  <span className="font-semibold">{selectedBooking.userName || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fare</span>
                  <span className="font-bold">{formatCurrency(selectedBooking.fare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{selectedBooking.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Sender (Pickup)
                  </p>
                  <p className="text-sm font-semibold">{selectedBooking.senderName}</p>
                  <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {selectedBooking.senderPhone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedBooking.pickupAddress}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Receiver (Drop)
                  </p>
                  <p className="text-sm font-semibold">{selectedBooking.receiverName}</p>
                  <p className="text-xs text-red-700 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {selectedBooking.receiverPhone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedBooking.dropAddress}</p>
                </div>
              </div>

              {selectedBooking.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">Parcel Description</p>
                  <p className="text-sm text-blue-900">{selectedBooking.description}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-right">Booked: {formatDate(selectedBooking.createdAt)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
