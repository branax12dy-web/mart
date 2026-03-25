import { useState } from "react";
import { useOrdersEnriched, useUpdateOrder } from "@/hooks/use-admin";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Search, User, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function Orders() {
  const { data, isLoading } = useOrdersEnriched();
  const updateMutation = useUpdateOrder();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, status }, {
      onSuccess: () => toast({ title: "Order status updated ✅" }),
      onError: (err) => toast({ title: "Update failed", description: err.message, variant: "destructive" })
    });
  };

  const orders = data?.orders || [];
  const filtered = orders.filter((o: any) => {
    const q = search.toLowerCase();
    const matchesSearch = o.id.toLowerCase().includes(q)
      || (o.userName || "").toLowerCase().includes(q)
      || (o.userPhone || "").includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesType = typeFilter === "all" || o.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const ordersCount = orders.length;
  const pendingCount = orders.filter((o: any) => o.status === "pending").length;
  const deliveredCount = orders.filter((o: any) => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Mart & Food Orders</h1>
            <p className="text-muted-foreground text-sm">{ordersCount} total · {pendingCount} pending · {deliveredCount} delivered</p>
          </div>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-border/50 shadow-sm flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {["all", "mart", "food"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize transition-colors border ${
                typeFilter === t ? "bg-primary text-white border-primary" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary"
              }`}
            >
              {t === "mart" ? "🛒 " : t === "food" ? "🍔 " : ""}{t}
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading orders...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
              ) : (
                filtered.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <TableCell>
                      <p className="font-mono font-medium text-sm">{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{Array.isArray(order.items) ? `${order.items.length} items` : 'N/A'}</p>
                    </TableCell>
                    <TableCell>
                      {order.userName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{order.userName}</p>
                            <p className="text-xs text-muted-foreground">{order.userPhone}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Guest</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.type === 'food' ? 'default' : 'secondary'} className="capitalize">
                        {order.type === 'food' ? '🍔 ' : '🛒 '}{order.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{formatCurrency(order.total)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select
                        value={order.status}
                        onValueChange={(val) => handleUpdateStatus(order.id, val)}
                      >
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
                    <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </TableCell>
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
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              Order Detail
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-bold">{selectedOrder.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-semibold">{selectedOrder.userName || "Guest"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedOrder.userPhone || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant={selectedOrder.type === 'food' ? 'default' : 'secondary'} className="capitalize">
                    {selectedOrder.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize font-medium">{selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Address</span>
                  <span className="text-right max-w-[200px] text-xs">{selectedOrder.deliveryAddress || "—"}</span>
                </div>
              </div>

              {/* Order Items */}
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" /> Items ({selectedOrder.items.length})
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-muted/30 rounded-xl px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        </div>
                        <p className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                      <p className="font-bold text-foreground">Total</p>
                      <p className="font-bold text-primary text-lg">{formatCurrency(selectedOrder.total)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ordered: {formatDate(selectedOrder.createdAt)}</span>
                <span>Updated: {formatDate(selectedOrder.updatedAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
