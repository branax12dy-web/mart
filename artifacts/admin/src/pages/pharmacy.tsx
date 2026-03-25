import { useState } from "react";
import { usePharmacyOrders, useUpdatePharmacyOrder } from "@/hooks/use-admin";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill, Search, FileText, User, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function Pharmacy() {
  const { data, isLoading } = usePharmacyOrders();
  const updateMutation = useUpdatePharmacyOrder();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, status }, {
      onSuccess: () => toast({ title: "Status updated" }),
      onError: err => toast({ title: "Update failed", description: err.message, variant: "destructive" })
    });
  };

  const orders = data?.orders || [];
  const q = search.toLowerCase();
  const filtered = orders.filter((o: any) =>
    o.id.toLowerCase().includes(q) ||
    (o.userName || "").toLowerCase().includes(q) ||
    (o.userPhone || "").includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center">
          <Pill className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pharmacy Orders</h1>
          <p className="text-muted-foreground text-sm">Manage medicine deliveries — {filtered.length} orders</p>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-border/50 shadow-sm max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[580px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Prescription</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
              ) : (
                filtered.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <TableCell className="font-mono font-medium text-sm">
                      <p>{order.id.slice(-8).toUpperCase()}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">Pharmacy</Badge>
                    </TableCell>
                    <TableCell>
                      {order.userName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-pink-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{order.userName}</p>
                            <p className="text-xs text-muted-foreground">{order.userPhone}</p>
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {order.prescriptionNote ? (
                        <div className="flex items-start gap-2 bg-amber-50 text-amber-900 p-2 rounded-lg text-xs">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p className="truncate">{order.prescriptionNote}</p>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">No note</span>}
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(order.total)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={order.status} onValueChange={(val) => handleUpdateStatus(order.id, val)}>
                        <SelectTrigger className={`w-36 h-8 text-[11px] font-bold uppercase tracking-wider border-2 ${getStatusColor(order.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs uppercase font-bold tracking-wider">{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={open => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="w-[95vw] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-pink-600" />
              Pharmacy Order Detail
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-bold">{selectedOrder.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-semibold">{selectedOrder.userName || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedOrder.userPhone || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{formatCurrency(selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize font-medium">{selectedOrder.paymentMethod}</span>
                </div>
              </div>
              {selectedOrder.prescriptionNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Prescription Note
                  </p>
                  <p className="text-sm text-amber-900">{selectedOrder.prescriptionNote}</p>
                </div>
              )}
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Items ({selectedOrder.items.length})
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-muted/30 rounded-lg px-3 py-2">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">×{item.quantity} — {formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-right">Ordered: {formatDate(selectedOrder.createdAt)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
