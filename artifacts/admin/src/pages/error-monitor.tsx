import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import {
  AlertTriangle, Bug, Server, Monitor, Code, Zap,
  ChevronDown, ChevronRight, RefreshCw, Filter, X, CheckCircle2,
  Flame, ShieldAlert, Inbox,
} from "lucide-react";

type ErrorReport = {
  id: string;
  timestamp: string;
  sourceApp: string;
  errorType: string;
  severity: string;
  status: string;
  functionName: string | null;
  moduleName: string | null;
  componentName: string | null;
  errorMessage: string;
  shortImpact: string | null;
  stackTrace: string | null;
  metadata: Record<string, unknown> | null;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Tab = "new" | "unresolved" | "completed";

const SOURCE_APPS = [
  { value: "", label: "All Sources" },
  { value: "customer", label: "Customer" },
  { value: "rider", label: "Rider" },
  { value: "vendor", label: "Vendor" },
  { value: "admin", label: "Admin" },
  { value: "api", label: "API Server" },
];

const SEVERITIES = [
  { value: "", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "medium", label: "Medium" },
  { value: "minor", label: "Minor" },
];

const ERROR_TYPES = [
  { value: "", label: "All Types" },
  { value: "frontend_crash", label: "Frontend Crash" },
  { value: "api_error", label: "API Error" },
  { value: "db_error", label: "Database Error" },
  { value: "route_error", label: "Route Error" },
  { value: "ui_error", label: "UI Error" },
  { value: "unhandled_exception", label: "Unhandled Exception" },
];

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  medium:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  minor:    { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:           { bg: "bg-red-500/15", text: "text-red-300" },
  acknowledged:  { bg: "bg-amber-500/15", text: "text-amber-300" },
  in_progress:   { bg: "bg-blue-500/15", text: "text-blue-300" },
  resolved:      { bg: "bg-green-500/15", text: "text-green-300" },
};

const SOURCE_ICONS: Record<string, typeof Monitor> = {
  customer: Monitor,
  rider: Zap,
  vendor: Code,
  admin: Bug,
  api: Server,
};

const TAB_STATUS_FILTERS: Record<Tab, string[]> = {
  new:        ["new"],
  unresolved: ["acknowledged", "in_progress"],
  completed:  ["resolved"],
};

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.new;
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${c.bg} ${c.text}`}>
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const Icon = SOURCE_ICONS[source] || Server;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-white/70 border border-white/10 capitalize">
      <Icon className="w-3 h-3" />
      {source === "api" ? "API Server" : source}
    </span>
  );
}

function ErrorTypeLabel({ type }: { type: string }) {
  const label = type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return <span className="text-[12px] text-white/50">{label}</span>;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function useTabCount(tab: Tab, sourceApp: string, severity: string, errorType: string) {
  const statuses = TAB_STATUS_FILTERS[tab];
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", "1");
  statuses.forEach(s => params.append("status", s));
  if (sourceApp) params.set("sourceApp", sourceApp);
  if (severity) params.set("severity", severity);
  if (errorType) params.set("errorType", errorType);

  const { data } = useQuery({
    queryKey: ["error-reports-tab-count", tab, sourceApp, severity, errorType],
    queryFn: () => fetcher(`/error-reports?${params.toString()}`),
    refetchInterval: 15000,
  });
  return (data?.pagination?.total ?? 0) as number;
}

export default function ErrorMonitor() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [page, setPage] = useState(1);
  const [sourceApp, setSourceApp] = useState("");
  const [severity, setSeverity] = useState("");
  const [errorType, setErrorType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [fixingAll, setFixingAll] = useState(false);

  const tabStatuses = TAB_STATUS_FILTERS[activeTab];

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "30");
  tabStatuses.forEach(s => params.append("status", s));
  if (sourceApp) params.set("sourceApp", sourceApp);
  if (severity) params.set("severity", severity);
  if (errorType) params.set("errorType", errorType);
  if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
  if (dateTo) params.set("dateTo", new Date(dateTo + "T23:59:59").toISOString());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["error-reports", activeTab, page, sourceApp, severity, errorType, dateFrom, dateTo],
    queryFn: () => fetcher(`/error-reports?${params.toString()}`),
    refetchInterval: 30000,
  });

  const reports: ErrorReport[] = data?.reports || [];
  const pagination: Pagination = data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 };

  const newCount     = useTabCount("new",        sourceApp, severity, errorType);
  const unresolvedCount = useTabCount("unresolved", sourceApp, severity, errorType);
  const completedCount  = useTabCount("completed",  sourceApp, severity, errorType);

  const tabCounts: Record<Tab, number> = {
    new:        newCount,
    unresolved: unresolvedCount,
    completed:  completedCount,
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      fetcher(`/error-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-reports"] });
      queryClient.invalidateQueries({ queryKey: ["error-reports-tab-count"] });
      queryClient.invalidateQueries({ queryKey: ["error-reports-count"] });
    },
  });

  const handleFixAll = async () => {
    if (fixingAll) return;
    setFixingAll(true);
    try {
      await fetcher("/error-reports/bulk-resolve", {
        method: "POST",
        body: JSON.stringify({
          sourceApp: sourceApp || undefined,
          severity: severity || undefined,
          errorType: errorType || undefined,
          statusFilter: TAB_STATUS_FILTERS[activeTab],
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["error-reports"] });
      queryClient.invalidateQueries({ queryKey: ["error-reports-tab-count"] });
      queryClient.invalidateQueries({ queryKey: ["error-reports-count"] });
      setActiveTab("completed");
      setPage(1);
    } finally {
      setFixingAll(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    setExpandedId(null);
  };

  const hasActiveFilters = sourceApp || severity || errorType || dateFrom || dateTo;

  const clearFilters = () => {
    setSourceApp(""); setSeverity(""); setErrorType("");
    setDateFrom(""); setDateTo(""); setPage(1);
  };

  const TABS: { id: Tab; label: string; icon: typeof Flame; color: string; badge: string }[] = [
    { id: "new",        label: "New",        icon: Flame,       color: "text-red-400",   badge: "bg-red-500/20 text-red-300" },
    { id: "unresolved", label: "Unresolved", icon: ShieldAlert, color: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
    { id: "completed",  label: "Completed",  icon: CheckCircle2,color: "text-green-400", badge: "bg-green-500/20 text-green-300" },
  ];

  const canFixAll = activeTab !== "completed" && pagination.total > 0;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bug className="w-6 h-6 text-red-400" />
            Error Monitor
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time error tracking across all apps
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canFixAll && (
            <button
              onClick={handleFixAll}
              disabled={fixingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className={`w-4 h-4 ${fixingAll ? "animate-spin" : ""}`} />
              {fixingAll ? "Fixing…" : `Fix All (${pagination.total})`}
            </button>
          )}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/60 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/60">Filters</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select value={sourceApp} onChange={e => { setSourceApp(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50">
              {SOURCE_APPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50">
              {SEVERITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={errorType} onChange={e => { setErrorType(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50">
              {ERROR_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From date"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To date"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-white/10 pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                isActive
                  ? `${tab.color} border-current bg-white/[0.04]`
                  : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.02]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab.badge}`}>
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        {isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            {activeTab === "completed" ? (
              <>
                <CheckCircle2 className="w-12 h-12 mb-3 text-green-500/40" />
                <p className="text-lg font-semibold">No completed errors</p>
                <p className="text-sm mt-1">Resolved errors will appear here</p>
              </>
            ) : activeTab === "unresolved" ? (
              <>
                <ShieldAlert className="w-12 h-12 mb-3 text-amber-500/40" />
                <p className="text-lg font-semibold">No unresolved errors</p>
                <p className="text-sm mt-1">Acknowledged and in-progress errors appear here</p>
              </>
            ) : (
              <>
                <Inbox className="w-12 h-12 mb-3 text-green-500/40" />
                <p className="text-lg font-semibold">No new errors</p>
                <p className="text-sm mt-1">All systems running smoothly</p>
              </>
            )}
          </div>
        ) : (
          <div>
            {reports.map(report => {
              const isExpanded = expandedId === report.id;
              return (
                <div key={report.id} className="border-b border-white/5 last:border-b-0">
                  <div
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  >
                    <div className="mt-1 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={report.severity} />
                        <SourceBadge source={report.sourceApp} />
                        <ErrorTypeLabel type={report.errorType} />
                        <StatusBadge status={report.status} />
                      </div>

                      <p className="text-sm text-white/80 font-medium truncate">
                        {report.errorMessage}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/35">
                        <span>{formatTimestamp(report.timestamp)}</span>
                        {report.functionName && (
                          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{report.functionName}</span>
                        )}
                        {report.componentName && (
                          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{report.componentName}</span>
                        )}
                        {report.shortImpact && (
                          <span className="text-white/25">{report.shortImpact}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      <select
                        value={report.status}
                        onChange={e => updateMutation.mutate({ id: report.id, newStatus: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="new">New</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-11 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Timestamp</span>
                          <p className="text-xs text-white/70 mt-0.5">{new Date(report.timestamp).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Module</span>
                          <p className="text-xs text-white/70 mt-0.5 font-mono">{report.moduleName || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Function</span>
                          <p className="text-xs text-white/70 mt-0.5 font-mono">{report.functionName || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Component</span>
                          <p className="text-xs text-white/70 mt-0.5 font-mono">{report.componentName || "—"}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Error Message</span>
                        <p className="text-xs text-white/70 mt-0.5 whitespace-pre-wrap break-all">{report.errorMessage}</p>
                      </div>

                      {report.shortImpact && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Impact</span>
                          <p className="text-xs text-white/70 mt-0.5">{report.shortImpact}</p>
                        </div>
                      )}

                      {report.stackTrace && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Stack Trace</span>
                          <pre className="mt-1 text-[11px] text-white/50 bg-black/30 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all font-mono">
                            {report.stackTrace}
                          </pre>
                        </div>
                      )}

                      {report.metadata && Object.keys(report.metadata).length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Metadata</span>
                          <pre className="mt-1 text-[11px] text-white/50 bg-black/30 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                            {JSON.stringify(report.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {(report.acknowledgedAt || report.resolvedAt) && (
                        <div className="flex gap-4">
                          {report.acknowledgedAt && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Acknowledged At</span>
                              <p className="text-xs text-white/70 mt-0.5">{new Date(report.acknowledgedAt).toLocaleString()}</p>
                            </div>
                          )}
                          {report.resolvedAt && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Resolved At</span>
                              <p className="text-xs text-white/70 mt-0.5">{new Date(report.resolvedAt).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-white/40">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg text-xs bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 rounded-lg text-xs bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
