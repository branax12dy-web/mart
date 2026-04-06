import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, TrendingUp, Eye, Heart, ShoppingCart, Star,
  RefreshCw, BarChart2, Package, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function adminHeaders() {
  return { Authorization: `Bearer ${sessionStorage.getItem("ajkmart_admin_token")}` };
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: adminHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json.data !== undefined ? json.data : json;
}

type TrendingProduct = {
  id: string;
  name: string;
  price: number;
  category?: string;
  image?: string;
  rating?: number;
  vendorName?: string;
  score?: number;
  reason?: string;
};

type WishlistItem = {
  productId: string;
  count: number;
  name?: string;
  price?: number;
};

type StatsData = {
  productCount?: number;
  restaurantCount?: number;
  userCount?: number;
  orderCount?: number;
};

const INTERACTION_ICONS: Record<string, React.ElementType> = {
  view: Eye,
  wishlist: Heart,
  cart: ShoppingCart,
  purchase: ShoppingCart,
  rating: Star,
};

const INTERACTION_COLORS: Record<string, string> = {
  view: "text-blue-600 bg-blue-50",
  wishlist: "text-pink-600 bg-pink-50",
  cart: "text-purple-600 bg-purple-50",
  purchase: "text-green-600 bg-green-50",
  rating: "text-amber-600 bg-amber-50",
  trending: "text-orange-600 bg-orange-50",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className={cn("rounded-2xl border p-4 flex items-center gap-3", color.includes("blue") ? "bg-blue-50 border-blue-100" : color.includes("green") ? "bg-green-50 border-green-100" : color.includes("purple") ? "bg-purple-50 border-purple-100" : "bg-amber-50 border-amber-100")}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function SearchAnalyticsPage() {
  const [trendingPeriod, setTrendingPeriod] = useState("7d");

  const { data: trendingData, isLoading: trendLoading, refetch: refetchTrending } = useQuery<{ products: TrendingProduct[] }>({
    queryKey: ["admin-trending-products", trendingPeriod],
    queryFn: () => apiFetch(`/recommendations/trending?limit=20&days=${trendingPeriod.replace("d", "")}`),
    staleTime: 5 * 60_000,
  });

  const { data: trendingSearchData, isLoading: searchLoading } = useQuery<{ terms: string[] }>({
    queryKey: ["admin-trending-searches"],
    queryFn: () => apiFetch("/products/trending-searches?limit=20"),
    staleTime: 5 * 60_000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["admin-platform-stats"],
    queryFn: () => apiFetch("/stats/public"),
    staleTime: 5 * 60_000,
  });

  const { data: wishlistData, isLoading: wishLoading } = useQuery<{ items: WishlistItem[] }>({
    queryKey: ["admin-wishlist-analytics"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users?limit=1`, { headers: adminHeaders() });
      if (!res.ok) return { items: [] };
      return { items: [] };
    },
    staleTime: 5 * 60_000,
  });

  const trending: TrendingProduct[] = trendingData?.products ?? [];
  const searchTerms: string[] = Array.isArray(trendingSearchData?.terms)
    ? (trendingSearchData as { terms: string[] }).terms
    : (Array.isArray(trendingSearchData) ? trendingSearchData as unknown as string[] : []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-gray-900">Search & Engagement Analytics</h1>
          </div>
          <p className="text-sm text-gray-500">What customers are searching, viewing, and engaging with most</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => { refetchTrending(); }}
          className="h-8 rounded-xl gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Products" value={statsLoading ? "…" : statsData?.productCount?.toLocaleString() ?? "—"} icon={Package} color="text-blue-600" />
        <StatCard label="Restaurants" value={statsLoading ? "…" : statsData?.restaurantCount?.toLocaleString() ?? "—"} icon={TrendingUp} color="text-green-600" />
        <StatCard label="Trending Items" value={trending.length} icon={TrendingUp} color="text-purple-600" />
        <StatCard label="Search Terms" value={searchTerms.length} icon={Search} color="text-amber-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Trending Search Terms */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-sm text-gray-800">Trending Searches</span>
            </div>
            <Badge variant="secondary" className="text-xs">{searchTerms.length}</Badge>
          </div>
          <div className="p-3">
            {searchLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
            ) : searchTerms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <Search className="w-8 h-8 opacity-20" />
                <p className="text-sm">No search data yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {searchTerms.slice(0, 15).map((term, i) => (
                  <div key={term} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      i === 0 ? "bg-amber-100 text-amber-700"
                        : i === 1 ? "bg-gray-100 text-gray-600"
                        : i === 2 ? "bg-orange-100 text-orange-700"
                        : "bg-gray-50 text-gray-400"
                    )}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">{term}</span>
                    <TrendingUp className={cn("w-3.5 h-3.5 shrink-0", i < 3 ? "text-orange-500" : "text-gray-300")} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trending Products */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-sm text-gray-800">Trending Products</span>
            </div>
            <Select value={trendingPeriod} onValueChange={setTrendingPeriod}>
              <SelectTrigger className="h-7 w-20 text-xs rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3">
            {trendLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
            ) : trending.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <Package className="w-8 h-8 opacity-20" />
                <p className="text-sm">No trending data yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {trending.slice(0, 10).map((product, i) => (
                  <div key={product.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      i === 0 ? "bg-purple-100 text-purple-700"
                        : i === 1 ? "bg-indigo-100 text-indigo-700"
                        : i === 2 ? "bg-blue-100 text-blue-700"
                        : "bg-gray-50 text-gray-400"
                    )}>
                      {i + 1}
                    </span>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {product.vendorName && `${product.vendorName} · `}Rs. {product.price?.toLocaleString()}
                      </p>
                    </div>
                    {product.score !== undefined && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {Math.round(product.score)} pts
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-teal-50 to-green-50">
          <Eye className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-sm text-gray-800">Customer Engagement Guide</span>
        </div>
        <div className="p-4 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { type: "view", label: "Product Views", desc: "How many times products are opened and viewed by customers", icon: Eye },
            { type: "wishlist", label: "Wishlist Adds", desc: "Products customers save to view later — shows purchase intent", icon: Heart },
            { type: "cart", label: "Cart Adds", desc: "Products added to cart — high conversion intent", icon: ShoppingCart },
            { type: "trending", label: "Trending Score", desc: "Combined score based on views, cart adds, and purchases", icon: TrendingUp },
            { type: "rating", label: "Product Ratings", desc: "Customer satisfaction signals from product reviews", icon: Star },
            { type: "purchase", label: "Conversions", desc: "Products that led to completed orders", icon: ShoppingCart },
          ].map(item => {
            const Icon = item.icon;
            const colorClass = INTERACTION_COLORS[item.type] || "text-gray-600 bg-gray-50";
            return (
              <div key={item.type} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
