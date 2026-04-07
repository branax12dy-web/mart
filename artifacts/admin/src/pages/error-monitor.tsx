import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Bug, Server, Monitor, Code, Zap,
  ChevronDown, ChevronRight, RefreshCw, Filter, X, CheckCircle2,
  Flame, ShieldAlert, Inbox, CheckCheck, Layers,
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

type Pagination = { page: number; limit: number; total: number; totalPages: number };
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

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  minor:    "bg-blue-100 text-blue-700 border-blue-200",
};
const STATUS_STYLE: Record<string, string> = {
  new:          "bg-red-100 text-red-700",
  acknowledged: "bg-amber-100 text-amber-700",
  in_progress:  "bg-blue-100 text-blue-700",
  resolved:     "bg-green-100 text-green-700",
};
const SOURCE_ICONS: Record<string, typeof Monitor> = {
  customer: Monitor, rider: Zap, vendor: Code, admin: Bug, api: Server,
};

const TAB_STATUS_FILTERS: Record<Tab, string[]> = {
  new:        ["new"],
  unresolved: ["acknowledged", "in_progress"],
  completed:  ["resolved"],
};

const STATUS_NEXT: Record<string, { status: string; label: string; btnClass: string } | null> = {
  new:          { status: "acknowledged", label: "Acknowledge",       btnClass: "bg-amber-500 hover:bg-amber-600 text-white" },
  acknowledged: { status: "in_progress",  label: "Mark In Progress",  btnClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  in_progress:  { status: "resolved",     label: "Resolve",           btnClass: "bg-green-600 hover:bg-green-700 text-white" },
  resolved:     null,
};

const CATEGORY_LABELS: Record<string, string> = {
  frontend_crash:      "Frontend Crash",
  api_error:           "API Error",
  db_error:            "DB Error",
  route_error:         "Route Error",
  ui_error:            "UI Error",
  unhandled_exception: "Unhandled Exception",
};

const TABS: { id: Tab; label: string; icon: typeof Flame; activeClass: string; badgeClass: string }[] = [
  { id: "new",        label: "New",        icon: Flame,        activeClass: "border-red-500 text-red-600 bg-red-50",       badgeClass: "bg-red-100 text-red-700" },
  { id: "unresolved", label: "Unresolved", icon: ShieldAlert,  activeClass: "border-amber-500 text-amber-600 bg-amber-50", badgeClass: "bg-amber-100 text-amber-700" },
  { id: "completed",  label: "Completed",  icon: CheckCircle2, activeClass: "border-green-500 text-green-600 bg-green-50",  badgeClass: "bg-green-100 text-green-700" },
];

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function useTabCount(tab: Tab, sourceApp: string, severity: string, errorType: string) {
  const statuses = TAB_STATUS_FILTERS[tab];
  const p = new URLSearchParams({ page: "1", limit: "1" });
  statuses.forEach(s => p.append("status", s));
  if (sourceApp) p.set("sourceApp", sourceApp);
  if (severity) p.set("severity", severity);
  if (errorType) p.set("errorType", errorType);
  const { data } = useQuery({
    queryKey: ["error-count", tab, sourceApp, severity, errorType],
    queryFn: () => fetcher(`/error-reports?${p}`),
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
  const [groupByCategory, setGroupByCategory] = useState(false);

  const tabStatuses = TAB_STATUS_FILTERS[activeTab];
  const params = new URLSearchParams({ page: String(page), limit: "30" });
  tabStatuses.forEach(s => params.append("status", s));
  if (sourceApp) params.set("sourceApp", sourceApp);
  if (severity) params.set("severity", severity);
  if (errorType) params.set("errorType", errorType);
  if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
  if (dateTo) params.set("dateTo", new Date(dateTo + "T23:59:59").toISOString());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["error-reports", activeTab, page, sourceApp, severity, errorType, dateFrom, dateTo],
    queryFn: () => fetcher(`/error-reports?${params}`),
    refetchInterval: 30000,
  });

  const reports: ErrorReport[] = data?.reports || [];
  const pagination: Pagination = data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 };

  const newCount        = useTabCount("new",        sourceApp, severity, errorType);
  const unresolvedCount = useTabCount("unresolved", sourceApp, severity, errorType);
  const completedCount  = useTabCount("completed",  sourceApp, severity, errorType);
  const tabCounts: Record<Tab, number> = { new: newCount, unresolved: unresolvedCount, completed: completedCount };

  const updateMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      fetcher(`/error-reports/${id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-reports"] });
      queryClient.invalidateQueries({ queryKey: ["error-count"] });
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
      queryClient.invalidateQueries({ queryKey: ["error-count"] });
      queryClient.invalidateQueries({ queryKey: ["error-reports-count"] });
      setActiveTab("completed");
      setPage(1);
    } finally {
      setFixingAll(false);
    }
  };

  const switchTab = (tab: Tab) => { setActiveTab(tab); setPage(1); setExpandedId(null); };
  const hasFilters = !!(sourceApp || severity || errorType || dateFrom || dateTo);
  const clearFilters = () => { setSourceApp(""); setSeverity(""); setErrorType(""); setDateFrom(""); setDateTo(""); setPage(1); };
  const canFixAll = activeTab !== "completed" && pagination.total > 0;

  const groupedReports = useMemo(() => {
    if (!groupByCategory) return null;
    const groups: Record<string, ErrorReport[]> = {};
    for (const r of reports) {
      if (!groups[r.errorType]) groups[r.errorType] = [];
      groups[r.errorType]!.push(r);
    }
    return groups;
  }, [reports, groupByCategory]);

  const renderReportRow = (report: ErrorReport) => {
    const isExpanded = expandedId === report.id;
    const Icon = SOURCE_ICONS[report.sourceApp] || Server;
    const sevStyle = SEVERITY_STYLE[report.severity] || SEVERITY_STYLE.medium;
    const statusStyle = STATUS_STYLE[report.status] || STATUS_STYLE.new;
    const leftAccent = report.severity === "critical"
      ? "border-l-4 border-l-red-400"
      : report.severity === "medium"
      ? "border-l-4 border-l-amber-400"
      : "border-l-4 border-l-blue-400";
    const nextStep = STATUS_NEXT[report.status];

    return (
      <div key={report.id} className={`bg-white ${leftAccent} hover:bg-gray-50 transition-colors`}>
        <div
          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : report.id)}
        >
          <div className="mt-1 shrink-0 text-gray-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${sevStyle}`}>
                {report.severity}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 capitalize">
                <Icon className="w-3 h-3" />
                {report.sourceApp === "api" ? "API Server" : report.sourceApp}
              </span>
              <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                {report.errorType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusStyle}`}>
                {report.status.replace(/_/g, " ")}
              </span>
            </div>

            <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">
              {report.errorMessage}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
              <span>{formatTimestamp(report.timestamp)}</span>
              {report.functionName && (
                <span className="font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{report.functionName}</span>
              )}
              {report.componentName && (
                <span className="font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{report.componentName}</span>
              )}
              {report.shortImpact && (
                <span className="text-gray-400 italic">{report.shortImpact}</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
            {nextStep ? (
              <button
                onClick={() => updateMutation.mutate({ id: report.id, newStatus: nextStep.status })}
                disabled={updateMutation.isPending}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-all disabled:opacity-60 ${nextStep.btnClass}`}
              >
                {nextStep.label}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-5 pl-11 space-y-4 bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {[
                { label: "Timestamp",  value: new Date(report.timestamp).toLocaleString() },
                { label: "Module",     value: report.moduleName    || "—", mono: true },
                { label: "Function",   value: report.functionName  || "—", mono: true },
                { label: "Component",  value: report.componentName || "—", mono: true },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">{f.label}</p>
                  <p className={`text-xs text-gray-700 ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Error Message</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap break-all bg-white border border-gray-200 rounded-lg p-3">{report.errorMessage}</p>
            </div>

            {report.shortImpact && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Impact</p>
                <p className="text-xs text-gray-700">{report.shortImpact}</p>
              </div>
            )}

            {report.stackTrace && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Stack Trace</p>
                <pre className="text-[11px] bg-gray-900 text-green-300 border border-gray-300 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all font-mono">
                  {report.stackTrace}
                </pre>
              </div>
            )}

            {report.metadata && Object.keys(report.metadata).length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Metadata</p>
                <pre className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                  {JSON.stringify(report.metadata, null, 2)}
                </pre>
              </div>
            )}

            {(report.acknowledgedAt || report.resolvedAt) && (
              <div className="flex gap-6">
                {report.acknowledgedAt && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Acknowledged At</p>
                    <p className="text-xs text-gray-700">{new Date(report.acknowledgedAt).toLocaleString()}</p>
                  </div>
                )}
                {report.resolvedAt && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Resolved At</p>
                    <p className="text-xs text-green-700 font-semibold">{new Date(report.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="w-6 h-6 text-red-500" />
            Error Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time error tracking across all apps</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canFixAll && (
            <Button
              onClick={handleFixAll}
              disabled={fixingAll}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              <CheckCheck className={`w-4 h-4 ${fixingAll ? "animate-spin" : ""}`} />
              {fixingAll ? "Fixing…" : `Fix All (${pagination.total})`}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGroupByCategory(g => !g)}
            className={groupByCategory ? "border-purple-400 text-purple-600 bg-purple-50" : ""}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Group by Type
            {groupByCategory && <span className="ml-1.5 w-2 h-2 rounded-full bg-purple-500 inline-block" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(f => !f)}
            className={hasFilters ? "border-indigo-400 text-indigo-600 bg-indigo-50" : ""}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {hasFilters && <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <Card className="p-4 space-y-3 border-indigo-100 bg-indigo-50/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Filters</span>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { value: sourceApp, onChange: (v: string) => { setSourceApp(v); setPage(1); }, options: SOURCE_APPS },
              { value: severity,  onChange: (v: string) => { setSeverity(v);  setPage(1); }, options: SEVERITIES },
              { value: errorType, onChange: (v: string) => { setErrorType(v); setPage(1); }, options: ERROR_TYPES },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300">
                {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-400" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-400" />
          </div>
        </Card>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-stretch border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                isActive
                  ? `${tab.activeClass} border-b-2`
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  isActive ? tab.badgeClass : "bg-gray-100 text-gray-600"
                }`}>
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error List ── */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        {isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            {activeTab === "completed" ? (
              <><CheckCircle2 className="w-12 h-12 mb-3 text-green-400" /><p className="text-lg font-semibold text-gray-600">No completed errors</p><p className="text-sm mt-1">Resolved errors will appear here</p></>
            ) : activeTab === "unresolved" ? (
              <><ShieldAlert className="w-12 h-12 mb-3 text-amber-400" /><p className="text-lg font-semibold text-gray-600">No unresolved errors</p><p className="text-sm mt-1">Acknowledged / in-progress errors appear here</p></>
            ) : (
              <><Inbox className="w-12 h-12 mb-3 text-green-400" /><p className="text-lg font-semibold text-gray-600">No new errors</p><p className="text-sm mt-1">All systems are running smoothly</p></>
            )}
          </div>
        ) : groupedReports ? (
          <div>
            {Object.entries(groupedReports).map(([cat, catReports]) => {
              const resolvedCount = catReports.filter(r => r.status === "resolved").length;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 min-w-[20px] text-center">
                      {catReports.length}
                    </span>
                    {resolvedCount > 0 && (
                      <span className="text-[11px] text-green-600 font-semibold">
                        · {resolvedCount} resolved
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {catReports.map(r => renderReportRow(r))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map(r => renderReportRow(r))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
