import { useState } from "react";
import { Search, CheckCircle2, XCircle, Wallet, RefreshCw, Trash2, Activity, ShoppingBag, Car, Pill, Package } from "lucide-react";
import { useUsers, useUpdateUser, useWalletTopup, useDeleteUser, useUserActivity } from "@/hooks/use-admin";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function UserActivityModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const { data, isLoading } = useUserActivity(userId);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity — {userName}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Orders */}
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" /> Recent Orders ({data?.orders?.length || 0})
              </h3>
              {data?.orders?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {data?.orders?.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center text-sm bg-muted/30 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-mono font-bold text-xs">{o.id.slice(-6).toUpperCase()}</span>
                        <span className="ml-2 text-muted-foreground capitalize">{o.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(o.status)}`}>{o.status.replace('_',' ')}</span>
                        <span className="font-bold">{formatCurrency(o.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rides */}
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-green-600" /> Recent Rides ({data?.rides?.length || 0})
              </h3>
              {data?.rides?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rides yet.</p>
              ) : (
                <div className="space-y-2">
                  {data?.rides?.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center text-sm bg-muted/30 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-mono font-bold text-xs">{r.id.slice(-6).toUpperCase()}</span>
                        <span className="ml-2 text-muted-foreground capitalize">{r.type}</span>
                        <span className="ml-2 text-muted-foreground">{r.distance}km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(r.status)}`}>{r.status.replace('_',' ')}</span>
                        <span className="font-bold">{formatCurrency(r.fare)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pharmacy */}
            {(data?.pharmacy?.length || 0) > 0 && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-pink-600" /> Pharmacy Orders ({data.pharmacy.length})
                </h3>
                <div className="space-y-2">
                  {data.pharmacy.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm bg-muted/30 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs">{p.id.slice(-6).toUpperCase()}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(p.status)}`}>{p.status}</span>
                        <span className="font-bold">{formatCurrency(p.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parcels */}
            {(data?.parcels?.length || 0) > 0 && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-orange-600" /> Parcel Bookings ({data.parcels.length})
                </h3>
                <div className="space-y-2">
                  {data.parcels.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm bg-muted/30 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs">{p.id.slice(-6).toUpperCase()}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(p.status)}`}>{p.status}</span>
                        <span className="font-bold">{formatCurrency(p.fare)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet Transactions */}
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-sky-600" /> Wallet History ({data?.transactions?.length || 0})
              </h3>
              {data?.transactions?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No wallet activity.</p>
              ) : (
                <div className="space-y-1.5">
                  {data?.transactions?.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center text-sm bg-muted/30 rounded-xl px-3 py-2">
                      <span className="text-muted-foreground truncate max-w-[180px]">{t.description}</span>
                      <span className={`font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const { data, isLoading, refetch, isFetching } = useUsers();
  const updateMutation = useUpdateUser();
  const topupMutation = useWalletTopup();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [topupUser, setTopupUser] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [activityUser, setActivityUser] = useState<any>(null);

  const handleUpdate = (id: string, updates: any) => {
    updateMutation.mutate({ id, ...updates }, {
      onSuccess: () => toast({ title: "User updated successfully" }),
      onError: err => toast({ title: "Update failed", description: err.message, variant: "destructive" })
    });
  };

  const handleTopup = () => {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    topupMutation.mutate(
      { id: topupUser.id, amount: amt, description: topupNote || `Admin top-up: Rs. ${amt}` },
      {
        onSuccess: (d: any) => {
          toast({ title: "Wallet Topped Up! 💰", description: `Rs. ${amt} added. New balance: ${formatCurrency(d.newBalance)}` });
          setTopupUser(null); setTopupAmount(""); setTopupNote("");
        },
        onError: err => toast({ title: "Top-up failed", description: err.message, variant: "destructive" })
      }
    );
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    deleteMutation.mutate(deleteUser.id, {
      onSuccess: () => { toast({ title: "User deleted" }); setDeleteUser(null); },
      onError: err => toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    });
  };

  const users = data?.users || [];
  const filtered = users.filter((u: any) => {
    const matchesSearch =
      (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.phone || "").includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold text-foreground">Users</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-semibold">
            {filtered.length} Users
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9 rounded-xl gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border-border/50 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="rider">Rider</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold text-right">Wallet</TableHead>
                <TableHead className="font-semibold text-center">Active</TableHead>
                <TableHead className="font-semibold text-right">Joined</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading users...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                filtered.map((user: any) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(user.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{user.phone}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(val) => handleUpdate(user.id, { role: val })}>
                        <SelectTrigger className="w-28 h-8 text-xs font-semibold uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="rider">Rider</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-foreground">{formatCurrency(user.walletBalance)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch checked={user.isActive} onCheckedChange={(val) => handleUpdate(user.id, { isActive: val })} />
                        {user.isActive
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-red-500" />
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActivityUser(user)}
                          className="h-8 rounded-lg text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                          title="View Activity"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setTopupUser(user); setTopupAmount(""); setTopupNote(""); }}
                          className="h-8 rounded-lg text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Top Up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteUser(user)}
                          className="h-8 w-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 p-0 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Wallet Top-up Modal */}
      <Dialog open={!!topupUser} onOpenChange={(open) => { if (!open) setTopupUser(null); }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" /> Wallet Top-up
            </DialogTitle>
          </DialogHeader>
          {topupUser && (
            <div className="mt-4 space-y-5">
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {(topupUser.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{topupUser.name}</p>
                  <p className="text-sm text-muted-foreground">Balance: <span className="font-bold text-green-600">{formatCurrency(topupUser.walletBalance)}</span></p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Amount (Rs.)</label>
                <Input
                  type="number" min="1" placeholder="e.g. 500" value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  className="h-12 rounded-xl text-lg font-bold" autoFocus
                />
                <div className="flex gap-2 mt-2">
                  {[100, 200, 500, 1000].map(amt => (
                    <button
                      key={amt} type="button" onClick={() => setTopupAmount(String(amt))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        topupAmount === String(amt) ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-border/50 hover:border-primary hover:text-primary'
                      }`}
                    >+{amt}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Note (optional)</label>
                <Input placeholder="e.g. Bonus for referral" value={topupNote} onChange={e => setTopupNote(e.target.value)} className="h-11 rounded-xl" />
              </div>
              {topupAmount && Number(topupAmount) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                  <p className="text-green-700 font-semibold">
                    New balance: <span className="text-green-800 font-bold">{formatCurrency(topupUser.walletBalance + Number(topupAmount))}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setTopupUser(null)}>Cancel</Button>
                <Button
                  className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 font-bold"
                  onClick={handleTopup}
                  disabled={topupMutation.isPending || !topupAmount || Number(topupAmount) <= 0}
                >
                  {topupMutation.isPending ? "Processing..." : `Add ${topupAmount ? formatCurrency(Number(topupAmount)) : ""}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={!!deleteUser} onOpenChange={open => { if (!open) setDeleteUser(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to delete <strong>"{deleteUser?.name}"</strong> ({deleteUser?.phone})? This will permanently remove the user and cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button
              variant="destructive" className="flex-1 rounded-xl"
              onClick={handleDelete} disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Activity Modal */}
      {activityUser && (
        <UserActivityModal
          userId={activityUser.id}
          userName={activityUser.name || activityUser.phone}
          onClose={() => setActivityUser(null)}
        />
      )}
    </div>
  );
}
