import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Target, BarChart2, Star, TrendingUp, CheckCircle,
  Wallet, ClipboardList, CreditCard, ChevronDown,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePlatformConfig } from "../lib/useConfig";
import { useLanguage } from "../lib/useLanguage";
import { tDual } from "@workspace/i18n";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "../components/ui/accordion";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

type Period = "today" | "week" | "month";

export default function Earnings() {
  const { user } = useAuth();
  const { config } = usePlatformConfig();
  const { language } = useLanguage();
  const T = (key: Parameters<typeof tDual>[0]) => tDual(key, language);
  const riderKeepPct = config.rider?.keepPct ?? config.finance.riderEarningPct;
  const [period, setPeriod] = useState<Period>("week");

  const { data, isLoading } = useQuery({
    queryKey: ["rider-earnings"],
    queryFn: () => api.getEarnings(),
    refetchInterval: 60000,
  });

  const periodData = data?.[period] || { earnings: 0, deliveries: 0 };
  const dailyGoal  = config.rider?.dailyGoal ?? 5000;
  const todayPct   = Math.min(100, Math.round(((data?.today?.earnings || 0) / dailyGoal) * 100));

  const totalDeliveries = user?.stats?.totalDeliveries || 0;
  const totalEarnings   = user?.stats?.totalEarnings   || 0;
  const avgPerDelivery  = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

  const rating = user?.stats?.rating ?? 5;
  const ratingLabel = rating >= 4.8 ? "Excellent" : rating >= 4.5 ? "Very Good" : rating >= 4.0 ? "Good" : "Needs Work";

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: "today", label: T("today") },
    { key: "week",  label: T("thisWeek") },
    { key: "month", label: T("thisMonth") },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-24">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 px-5 pb-8 rounded-b-[2rem] relative overflow-hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}>
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-green-500/[0.04]"/>
        <div className="absolute bottom-10 -left-16 w-56 h-56 rounded-full bg-white/[0.02]"/>
        <div className="relative">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-1">{T("incomePerformance")}</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{T("earnings")}</h1>

          <div className="mt-5 bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-4">
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase flex items-center gap-1.5"><Wallet size={13}/> {T("walletBalance")}</p>
            <p className="text-[36px] font-black text-white mt-1 leading-tight">{formatCurrency(Number(user?.walletBalance) || 0)}</p>
            <p className="text-white/30 text-xs mt-1">{T("earningsAfterDelivery")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        <div className="flex bg-white rounded-full p-1 shadow-sm gap-1 border border-gray-100">
          {PERIOD_TABS.map(tab => (
            <button key={tab.key} onClick={() => setPeriod(tab.key)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all ${period === tab.key ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-32 bg-white rounded-3xl animate-pulse border border-gray-100" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-3xl p-5 text-white shadow-sm">
              <p className="text-white/40 text-sm font-medium">{T("earnings")}</p>
              <p className="text-3xl font-extrabold mt-1">{formatCurrency(periodData.earnings)}</p>
              <p className="text-white/30 text-xs mt-1">{riderKeepPct}% {T("deliveries").toLowerCase()}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 font-medium">{T("deliveries")}</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{periodData.deliveries}</p>
              <p className="text-xs text-gray-400 mt-1">{T("completedLabel")}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Target size={14} className="text-gray-900"/> {T("dailyGoal")}</p>
              <p className="text-xs text-gray-400 mt-0.5">Target: {formatCurrency(dailyGoal)}/day</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-gray-900">{todayPct}%</p>
              <p className="text-xs text-gray-400">{formatCurrency(data?.today?.earnings || 0)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
            <div
              className={`h-3.5 rounded-full transition-all duration-700 ${todayPct >= 100 ? "bg-green-500" : todayPct >= 60 ? "bg-gray-700" : "bg-gray-400"}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          {todayPct >= 100 ? (
            <p className="text-xs text-green-600 font-bold mt-2.5 flex items-center gap-1">
              <CheckCircle size={12}/> {T("dailyGoalReached")}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-2.5">
              {formatCurrency(dailyGoal - (data?.today?.earnings || 0))} {T("moreToGoal")}
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
          <p className="font-bold text-gray-800 text-sm mb-3.5 flex items-center gap-1.5"><BarChart2 size={14} className="text-gray-900"/> {T("performance")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5F6F8] rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalDeliveries}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1 flex items-center justify-center gap-1"><ClipboardList size={11}/> {T("totalDeliveries")}</p>
            </div>
            <div className="bg-[#F5F6F8] rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(avgPerDelivery)}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1 flex items-center justify-center gap-1"><TrendingUp size={11}/> {T("avgPerDelivery")}</p>
            </div>
            <div className="bg-[#F5F6F8] rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(totalEarnings)}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1 flex items-center justify-center gap-1"><CreditCard size={11}/> {T("allTimeEarned")}</p>
            </div>
            <div className="bg-[#F5F6F8] rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-extrabold text-gray-900">{rating.toFixed(1)}</p>
                <Star size={18} className="fill-yellow-400 text-yellow-400"/>
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">{ratingLabel}</p>
            </div>
          </div>
        </div>

        {!isLoading && (
          <Accordion type="single" collapsible defaultValue="breakdown">
            <AccordionItem value="breakdown" className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
              <AccordionTrigger className="px-5 py-4 bg-gray-50/50 hover:no-underline">
                <span className="font-bold text-gray-800 text-sm">{T("thisMonthBreakdown")}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pt-0">
                <div className="divide-y divide-gray-50">
                  {[
                    { label: `${T("totalEarned")} (${riderKeepPct}%)`, value: formatCurrency(data?.month?.earnings || 0), color: "text-green-600" },
                    { label: `${T("deliveries")} ${T("completedLabel")}`,   value: String(data?.month?.deliveries || 0),       color: "text-gray-900"  },
                    { label: T("avgPerDelivery"),                 value: formatCurrency((data?.month?.deliveries || 0) > 0 ? (data?.month?.earnings || 0) / data.month.deliveries : 0), color: "text-gray-900" },
                    { label: T("allTimeEarnings"),                       value: formatCurrency(totalEarnings),              color: "text-green-600" },
                    { label: T("allTimeDeliveries"),                     value: String(totalDeliveries),                    color: "text-gray-900"  },
                  ].map(row => (
                    <div key={row.label} className="px-5 py-3.5 flex items-center justify-between">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <span className={`font-extrabold text-sm ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem value="how-it-works" className="bg-gray-900 rounded-3xl overflow-hidden border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-white/40">
              <span className="font-bold text-white text-sm flex items-center gap-1.5"><CreditCard size={14} className="text-white/60"/> {T("howEarningsWork")}</span>
            </AccordionTrigger>
            <AccordionContent className="pt-0">
              <div className="px-5 pb-1 space-y-2">
                {[
                  T("keepPercentage").replace("{pct}", String(riderKeepPct)),
                  T("earningsCreditedInstantly"),
                  T("withdrawAnytime"),
                  T("processedWithin"),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-white/60 leading-relaxed font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </div>
    </div>
  );
}
