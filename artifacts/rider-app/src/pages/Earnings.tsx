import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePlatformConfig } from "../lib/useConfig";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

type Period = "today" | "week" | "month";

export default function Earnings() {
  const { user } = useAuth();
  const { config } = usePlatformConfig();
  const riderKeepPct = config.rider?.keepPct ?? config.finance.riderEarningPct;
  const [period, setPeriod] = useState<Period>("week");

  const { data, isLoading } = useQuery({
    queryKey: ["rider-earnings"],
    queryFn: () => api.getEarnings(),
    refetchInterval: 60000,
  });

  const periodData = data?.[period] || { earnings: 0, deliveries: 0 };
  const dailyGoal  = 5000;
  const todayPct   = Math.min(100, Math.round(((data?.today?.earnings || 0) / dailyGoal) * 100));

  /* ── Performance metrics ── */
  const totalDeliveries = user?.stats?.totalDeliveries || 0;
  const totalEarnings   = user?.stats?.totalEarnings   || 0;
  const avgPerDelivery  = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

  /* ── Star rating from profile ── */
  const rating        = (user as any)?.rating ?? 5;
  const ratingLabel   = rating >= 4.8 ? "Excellent 🌟" : rating >= 4.5 ? "Very Good ✨" : rating >= 4.0 ? "Good 👍" : "Needs Work";

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week",  label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Earnings</h1>
        <p className="text-green-200 text-sm">Your income & performance</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Wallet Balance Card */}
        <div className="bg-white rounded-3xl shadow-md p-5 relative overflow-hidden border border-green-100">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-green-50 rounded-full" />
          <div className="relative">
            <p className="text-sm text-gray-500 font-medium">Wallet Balance</p>
            <p className="text-5xl font-extrabold text-green-600 mt-1">{formatCurrency(Number(user?.walletBalance) || 0)}</p>
            <p className="text-xs text-gray-400 mt-2">Earnings added after every delivery</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm gap-1">
          {PERIOD_TABS.map(tab => (
            <button key={tab.key} onClick={() => setPeriod(tab.key)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === tab.key ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period Stats */}
        {isLoading ? (
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-600 rounded-2xl p-4 text-white">
              <p className="text-sm text-green-200 font-medium">Earnings</p>
              <p className="text-3xl font-extrabold mt-1">{formatCurrency(periodData.earnings)}</p>
              <p className="text-xs text-green-300 mt-0.5">{riderKeepPct}% of deliveries</p>
            </div>
            <div className="bg-emerald-100 rounded-2xl p-4">
              <p className="text-sm text-emerald-700 font-medium">Deliveries</p>
              <p className="text-3xl font-extrabold text-emerald-800 mt-1">{periodData.deliveries}</p>
              <p className="text-xs text-emerald-500 mt-0.5">completed</p>
            </div>
          </div>
        )}

        {/* Daily Goal Tracker */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-800 text-sm">🎯 Daily Goal</p>
              <p className="text-xs text-gray-400">Target: {formatCurrency(dailyGoal)}/day</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-green-600">{todayPct}%</p>
              <p className="text-xs text-gray-400">{formatCurrency(data?.today?.earnings || 0)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${todayPct >= 100 ? "bg-green-500" : todayPct >= 60 ? "bg-emerald-400" : "bg-yellow-400"}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          {todayPct >= 100 ? (
            <p className="text-xs text-green-600 font-bold mt-2">🎉 Daily goal reached! Keep going!</p>
          ) : (
            <p className="text-xs text-gray-400 mt-2">
              {formatCurrency(dailyGoal - (data?.today?.earnings || 0))} more to reach your goal
            </p>
          )}
        </div>

        {/* Performance Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="font-bold text-gray-800 text-sm mb-3">📊 Performance</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-blue-700">{totalDeliveries}</p>
              <p className="text-xs text-blue-500 font-medium mt-0.5">Total Deliveries</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-purple-700">{formatCurrency(avgPerDelivery)}</p>
              <p className="text-xs text-purple-500 font-medium mt-0.5">Avg / Delivery</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-orange-700">{formatCurrency(totalEarnings)}</p>
              <p className="text-xs text-orange-500 font-medium mt-0.5">All Time Earned</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-extrabold text-green-700">{rating.toFixed(1)}</p>
                <p className="text-lg">⭐</p>
              </div>
              <p className="text-xs text-green-500 font-medium mt-0.5">{ratingLabel}</p>
            </div>
          </div>
        </div>

        {/* Month Breakdown */}
        {!isLoading && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50">
              <p className="font-bold text-gray-800 text-sm">This Month Breakdown</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: `Total Earnings (${riderKeepPct}% rate)`, value: formatCurrency(data?.month?.earnings || 0), color: "text-green-600" },
                { label: "Deliveries Completed",                    value: String(data?.month?.deliveries || 0),       color: "text-blue-600"  },
                { label: "Avg Earnings / Delivery",                 value: formatCurrency((data?.month?.deliveries || 0) > 0 ? (data?.month?.earnings || 0) / data.month.deliveries : 0), color: "text-purple-600" },
                { label: "All Time Earnings",                       value: formatCurrency(totalEarnings),              color: "text-green-600" },
                { label: "All Time Deliveries",                     value: String(totalDeliveries),                    color: "text-blue-600"  },
              ].map(row => (
                <div key={row.label} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className={`font-extrabold text-sm ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
          <p className="font-bold text-green-800 text-sm">💰 How Earnings Work</p>
          <div className="space-y-1.5">
            {[
              `You keep ${riderKeepPct}% of every delivery`,
              "Earnings credited instantly after delivery",
              "Withdraw anytime from the Wallet tab",
              "Processed within 24–48 hours via EasyPaisa/JazzCash/Bank",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 text-xs mt-0.5">✓</span>
                <p className="text-xs text-green-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
