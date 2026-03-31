import { useState, useCallback } from "react";
import { Star, Eye, EyeOff, Trash2, RefreshCw, Filter, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { fetcher } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";

type Review = {
  id: string;
  type: "order" | "ride";
  rating: number;
  riderRating?: number | null;
  comment: string | null;
  orderType: string | null;
  hidden: boolean;
  deletedAt: string | null;
  createdAt: string;
  reviewerId: string;
  subjectId: string | null;
  reviewerName: string | null;
  reviewerPhone: string | null;
  subjectName: string | null;
  subjectPhone: string | null;
};

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="text-sm leading-none">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= value ? "text-amber-400" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const STAR_COLORS: Record<number, string> = {
  5: "bg-green-100 text-green-700",
  4: "bg-lime-100 text-lime-700",
  3: "bg-yellow-100 text-yellow-700",
  2: "bg-orange-100 text-orange-700",
  1: "bg-red-100 text-red-700",
};

function ReviewRow({ r, selected, onToggle, onHide, onDelete, hideLoading, deleteLoading, T }: {
  r: Review;
  selected: boolean;
  onToggle: () => void;
  onHide: () => void;
  onDelete: () => void;
  hideLoading: boolean;
  deleteLoading: boolean;
  T: (k: TranslationKey) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-4 flex items-start gap-3 ${r.deletedAt ? "opacity-50 bg-red-50/30" : r.hidden ? "bg-yellow-50/30" : ""}`}>
      {!r.deletedAt && (
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5 flex-shrink-0" />
      )}
      {r.deletedAt && <div className="w-4 flex-shrink-0" />}

      <div className="flex flex-col gap-1.5 flex-shrink-0 min-w-[90px]">
        <Badge variant="outline" className={r.type === "ride" ? "border-blue-300 text-blue-700" : "border-orange-300 text-orange-700"}>
          {r.type === "ride" ? `🚗 ${T("rideReviews").split(" ")[0]}` : `📦 ${T("orderReviews").split(" ")[0]}`}
        </Badge>
        <span className={`text-xs font-bold rounded-full px-2 py-0.5 text-center ${STAR_COLORS[r.rating] ?? "bg-gray-100 text-gray-600"}`}>
          {r.rating}★
        </span>
        {r.hidden && !r.deletedAt && (
          <Badge variant="secondary" className="text-yellow-700 bg-yellow-100 border-yellow-200 text-[10px]">{T("hiddenLabel")}</Badge>
        )}
        {r.deletedAt && (
          <Badge variant="destructive" className="text-[10px]">{T("deletedLabel")}</Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {r.riderRating ? (
            <>
              <span className="text-xs text-muted-foreground font-medium">Vendor:</span>
              <StarDisplay value={r.rating} />
              <span className="text-xs text-muted-foreground font-medium">{T("riderReviews").split(" ")[0]}:</span>
              <StarDisplay value={r.riderRating} />
            </>
          ) : (
            <StarDisplay value={r.rating} />
          )}
        </div>
        {r.orderType && r.type === "order" && (
          <Badge variant="outline" className="text-[10px] capitalize mt-1">{r.orderType}</Badge>
        )}

        {/* Comment preview / full expand */}
        {r.comment ? (
          <div>
            <p className={`text-sm text-foreground mt-1.5 italic ${expanded ? "" : "line-clamp-2"}`}>
              "{r.comment}"
            </p>
            {r.comment.length > 120 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-0.5 text-[11px] text-primary mt-0.5 hover:underline"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? T("hideReview").replace("Hide", "Collapse") : T("viewFullReview")}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{T("noCommentAdded")}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-muted-foreground">
          <span>
            {T("reviewerLabel")}: <span className="font-medium text-foreground">{r.reviewerName ?? r.reviewerId.slice(0, 8)}</span>
            {r.reviewerPhone && <span className="ml-1 text-gray-400">· {r.reviewerPhone}</span>}
          </span>
          {r.subjectName && (
            <span>{T("subjectLabel")}: <span className="font-medium text-foreground">{r.subjectName}</span>
              {r.subjectPhone && <span className="ml-1 text-gray-400">· {r.subjectPhone}</span>}
            </span>
          )}
          <span>{formatDate(r.createdAt)}</span>
        </div>
      </div>

      {!r.deletedAt && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm" variant="outline"
            className="h-8 w-8 p-0"
            title={r.hidden ? T("unhideReview") : T("hideReview")}
            onClick={onHide}
            disabled={hideLoading}
          >
            {r.hidden
              ? <Eye className="h-3.5 w-3.5 text-green-600" />
              : <EyeOff className="h-3.5 w-3.5 text-yellow-600" />}
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50"
            title={T("deleteReview")}
            onClick={onDelete}
            disabled={deleteLoading}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);

  const [page, setPage]               = useState(1);
  const [typeFilter, setType]         = useState("all");
  const [starsFilter, setStars]       = useState("all");
  const [statusFilter, setStatus]     = useState("all");
  const [subjectFilter, setSubject]   = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const limit = 25;

  const buildQS = useCallback((p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (typeFilter    !== "all") params.set("type",    typeFilter);
    if (starsFilter   !== "all") params.set("stars",   starsFilter);
    if (statusFilter  !== "all") params.set("status",  statusFilter);
    if (subjectFilter !== "all") params.set("subject", subjectFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo)   params.set("dateTo",   dateTo);
    return params.toString();
  }, [page, typeFilter, starsFilter, statusFilter, subjectFilter, dateFrom, dateTo]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-reviews", page, typeFilter, starsFilter, statusFilter, subjectFilter, dateFrom, dateTo],
    queryFn: () => fetcher(`/reviews?${buildQS()}`),
    staleTime: 10_000,
  });

  const reviews: Review[] = data?.reviews  ?? [];
  const total: number     = data?.total    ?? 0;
  const pages: number     = data?.pages    ?? 1;

  const hideOrder = useMutation({
    mutationFn: (id: string) => fetcher(`/reviews/${id}/hide`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: T("visibilityToggled") }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteOrder = useMutation({
    mutationFn: (id: string) => fetcher(`/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: T("reviewDeleted") }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const hideRide = useMutation({
    mutationFn: (id: string) => fetcher(`/ride-ratings/${id}/hide`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: T("visibilityToggled") }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteRide = useMutation({
    mutationFn: (id: string) => fetcher(`/ride-ratings/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast({ title: T("reviewDeleted") }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleHide(r: Review) {
    if (r.type === "order") hideOrder.mutate(r.id);
    else hideRide.mutate(r.id);
  }
  function handleDelete(r: Review) {
    if (!confirm(`${T("deleteReview")} #${r.id.slice(0, 8)}?`)) return;
    if (r.type === "order") deleteOrder.mutate(r.id);
    else deleteRide.mutate(r.id);
  }

  const allIds = reviews.filter(r => !r.deletedAt).map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }
  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkHide() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`${T("toggleVisibility")} ${ids.length} review(s)?`)) return;
    const toHide  = reviews.filter(r => ids.includes(r.id) && r.type === "order");
    const toHideR = reviews.filter(r => ids.includes(r.id) && r.type === "ride");
    await Promise.all([
      ...toHide.map(r => fetcher(`/reviews/${r.id}/hide`,      { method: "PATCH" })),
      ...toHideR.map(r => fetcher(`/ride-ratings/${r.id}/hide`, { method: "PATCH" })),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    setSelected(new Set());
    toast({ title: `${ids.length} ${T("visibilityToggled").toLowerCase()}` });
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`${T("deleteReview")} ${ids.length} review(s)?`)) return;
    const orders = reviews.filter(r => ids.includes(r.id) && r.type === "order");
    const rides  = reviews.filter(r => ids.includes(r.id) && r.type === "ride");
    await Promise.all([
      ...orders.map(r => fetcher(`/reviews/${r.id}`,      { method: "DELETE" })),
      ...rides.map(r  => fetcher(`/ride-ratings/${r.id}`, { method: "DELETE" })),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    setSelected(new Set());
    toast({ title: `${ids.length} ${T("reviewDeleted").toLowerCase()}` });
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(1); setSelected(new Set()); };
  }

  const statusStats = [
    { label: T("totalInView"), value: total, color: "text-blue-600" },
    { label: T("visibleLabel"), value: reviews.filter(r => !r.hidden && !r.deletedAt).length, color: "text-green-600" },
    { label: T("hiddenLabel"),  value: reviews.filter(r => r.hidden && !r.deletedAt).length,  color: "text-yellow-600" },
    { label: T("deletedLabel"), value: reviews.filter(r => !!r.deletedAt).length,             color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400" />
            {T("reviewManagement")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {T("moderateCustomerReviews")} · {total} {T("totalInView")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusStats.map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <Select value={typeFilter} onValueChange={handleFilterChange(setType)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={T("reviewType")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allTypes")}</SelectItem>
              <SelectItem value="order">{T("orderReviews")}</SelectItem>
              <SelectItem value="ride">{T("rideReviews")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={starsFilter} onValueChange={handleFilterChange(setStars)}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder={T("starsFilter")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allStars")}</SelectItem>
              {[5,4,3,2,1].map(s => <SelectItem key={s} value={String(s)}>{s} ★</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleFilterChange(setStatus)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={T("reviewStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allStatus")}</SelectItem>
              <SelectItem value="visible">{T("visibleLabel")}</SelectItem>
              <SelectItem value="hidden">{T("hiddenLabel")}</SelectItem>
              <SelectItem value="deleted">{T("deletedLabel")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={subjectFilter} onValueChange={handleFilterChange(setSubject)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={T("allSubjects")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("allSubjects")}</SelectItem>
              <SelectItem value="vendor">{T("vendorReviews")}</SelectItem>
              <SelectItem value="rider">{T("riderReviews")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="h-8 text-xs w-36"
            />
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
                {T("clearDates")}
              </Button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <span className="text-xs font-semibold text-foreground">{selected.size} {T("selectedCount")}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={bulkHide}>
              <EyeOff className="h-3 w-3 mr-1" />{T("toggleVisibility")}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={bulkDelete}>
              <Trash2 className="h-3 w-3 mr-1" />{T("deleteReview")}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              {T("clearSelection")}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">{T("allReviews")}…</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">{T("noReviewsFound")}</p>
            <p className="text-xs text-muted-foreground mt-1">{T("adjustFilters")}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              <span className="text-xs text-muted-foreground">
                {selected.size > 0
                  ? `${selected.size} of ${reviews.length} ${T("selectedCount")}`
                  : `${reviews.length} ${T("onThisPage")}`}
              </span>
            </div>

            <div className="divide-y divide-border">
              {reviews.map(r => (
                <ReviewRow
                  key={r.id}
                  r={r}
                  selected={selected.has(r.id)}
                  onToggle={() => toggleOne(r.id)}
                  onHide={() => handleHide(r)}
                  onDelete={() => handleDelete(r)}
                  hideLoading={hideOrder.isPending || hideRide.isPending}
                  deleteLoading={deleteOrder.isPending || deleteRide.isPending}
                  T={T}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            ← {T("previousPage")}
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>
            {T("nextPage")} →
          </Button>
        </div>
      )}
    </div>
  );
}
