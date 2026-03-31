import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useLanguage } from "../lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";

function StarBar({ starValue, count, total }: { starValue: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-green-500"];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right text-gray-500 font-bold">{starValue}</span>
      <span className="text-amber-400">★</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[starValue] ?? "bg-gray-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 text-right text-gray-400 tabular-nums">{count}</span>
    </div>
  );
}

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-xl" : "text-sm";
  return (
    <span className={cls}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

export default function Reviews() {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);

  const [page, setPage]   = useState(1);
  const [stars, setStars] = useState<string>("");
  const [sort, setSort]   = useState<string>("newest");

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-reviews", page, stars, sort],
    queryFn: () => api.getVendorReviews({ page, limit: 15, stars: stars || undefined, sort }),
    staleTime: 30_000,
  });

  const reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    orderType: string | null;
    createdAt: string;
    customerName: string | null;
  }>                          = data?.reviews      ?? [];
  const total: number         = data?.total        ?? 0;
  const pages: number         = data?.pages        ?? 1;
  const avgRating: number | null = data?.avgRating ?? null;
  const breakdown: Record<number, number> = data?.starBreakdown ?? {};

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900">{T("reviews")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{T("customerFeedback")}</p>
      </div>

      {/* Rating summary card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-start gap-6">
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-black text-gray-900">
              {avgRating !== null ? avgRating.toFixed(1) : "—"}
            </p>
            <StarRating value={avgRating ?? 0} size="lg" />
            <p className="text-xs text-gray-400 mt-1">
              {total} {T("reviews")}
            </p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(r => (
              <StarBar
                key={r}
                starValue={r}
                count={breakdown[r] ?? 0}
                total={total}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
          <span className="text-xs text-gray-500 font-medium">{T("starsFilter")}</span>
          <select
            value={stars}
            onChange={e => { setStars(e.target.value); setPage(1); }}
            className="text-xs font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
          >
            <option value="">{T("all")}</option>
            {[5,4,3,2,1].map(s => <option key={s} value={String(s)}>{s} ★</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
          <span className="text-xs text-gray-500 font-medium">{T("sortLabel")}</span>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            className="text-xs font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
          >
            <option value="newest">{T("sortNewest")}</option>
            <option value="oldest">{T("sortOldest")}</option>
          </select>
        </div>
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-extrabold text-gray-700">{T("noReviews")}</p>
          <p className="text-sm text-gray-400 mt-1">{T("customerFeedback")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-600">
                      {(r.customerName?.[0] ?? "?").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{r.customerName ?? T("customer")}</p>
                    <p className="text-xs text-gray-400">
                      {r.orderType && (
                        <span className="mr-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 capitalize">
                          {r.orderType}
                        </span>
                      )}
                      {new Date(r.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StarRating value={r.rating} />
              </div>
              {r.comment && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed border-t border-gray-50 pt-2 italic">
                  "{r.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40"
          >
            ← {T("back")}
          </button>
          <span className="text-sm text-gray-500">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40"
          >
            {T("nextPage")} →
          </button>
        </div>
      )}
    </div>
  );
}
