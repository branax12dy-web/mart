import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Heart, TrendingUp, Package, Loader2 } from "lucide-react";

type WishlistProduct = {
  productId: string;
  wishlistCount: number;
  productName: string;
  productImage: string | null;
  productCategory: string;
  productPrice: string;
  productInStock: boolean;
  vendorName: string | null;
};

function useWishlistAnalytics() {
  return useQuery({
    queryKey: ["admin-wishlist-analytics"],
    queryFn: () => fetcher("/wishlist-analytics"),
    refetchInterval: 60_000,
  });
}

export default function WishlistInsights() {
  const { data, isLoading, refetch } = useWishlistAnalytics();
  const products: WishlistProduct[] = data?.products || [];

  const topCount = products.length > 0 ? products[0].wishlistCount : 0;

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Heart className="w-6 h-6 text-pink-500" /> Wishlist Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Products ranked by customer demand — see what users want most</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center"><Heart className="w-5 h-5 text-pink-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Most Wishlisted</p>
                <p className="text-xl font-bold">{topCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold">{products.filter(p => !p.productInStock).length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground"><Heart className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No wishlist data yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Wishlist Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p, i) => {
                    const pct = topCount > 0 ? Math.round((p.wishlistCount / topCount) * 100) : 0;
                    return (
                      <TableRow key={p.productId} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {p.productImage ? (
                              <img src={p.productImage} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                            )}
                            <span className="text-sm font-semibold">{p.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{p.productCategory}</Badge></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{p.vendorName || "—"}</span></TableCell>
                        <TableCell className="text-right font-mono text-sm">Rs {Number(p.productPrice).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={p.productInStock ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"}>
                            {p.productInStock ? "In Stock" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-bold text-pink-600">{p.wishlistCount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </PullToRefresh>
  );
}
