import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
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

const SOURCE_ICONS: Record<string, typeof Monitor> = {
  customer: Monitor, rider: Zap, vendor: Code, admin: Bug, api: Server,
};

const TAB_STATUS_FILTERS: Record<Tab, string[]> = {
  new:        ["new"],
  unresolved: ["acknowledged", "in_progress"],
  completed:  ["resolved"],
};

const STATUS_NEXT: Record<string, { status: string; label: string } | null> = {
  new:          { status: "acknowledged", label: "Acknowledge" },
  acknowledged: { status: "in_progress",  label: "Mark In Progress" },
  in_progress:  { status: "resolved",     label: "Resolve" },
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

const SEVERITY_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
  medium:   { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  minor:    { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  new:          { bg: "#FEF2F2", color: "#B91C1C" },
  acknowledged: { bg: "#FFFBEB", color: "#92400E" },
  in_progress:  { bg: "#EFF6FF", color: "#1D4ED8" },
  resolved:     { bg: "#F0FDF4", color: "#15803D" },
};

const NEXT_BTN_STYLE: Record<string, { bg: string; hover: string; color: string }> = {
  acknowledged: { bg: "#F59E0B", hover: "#D97706", color: "#fff" },
  in_progress:  { bg: "#3B82F6", hover: "#2563EB", color: "#fff" },
  resolved:     { bg: "#16A34A", hover: "#15803D", color: "#fff" },
};

const LEFT_ACCENT: Record<string, string> = {
  critical: "#EF4444",
  medium:   "#F59E0B",
  minor:    "#3B82F6",
};

const TABS: {
  id: Tab;
  label: string;
  icon: typeof Flame;
  activeColor: string;
  activeBorder: string;
  activeBg: string;
  badgeBg: string;
  badgeColor: string;
}[] = [
  { id: "new",        label: "New",        icon: Flame,        activeColor: "#DC2626", activeBorder: "#DC2626", activeBg: "#FEF2F2", badgeBg: "#FEE2E2", badgeColor: "#B91C1C" },
  { id: "unresolved", label: "Unresolved", icon: ShieldAlert,  activeColor: "#D97706", activeBorder: "#F59E0B", activeBg: "#FFFBEB", badgeBg: "#FEF3C7", badgeColor: "#92400E" },
  { id: "completed",  label: "Completed",  icon: CheckCircle2, activeColor: "#16A34A", activeBorder: "#22C55E", activeBg: "#F0FDF4", badgeBg: "#DCFCE7", badgeColor: "#15803D" },
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
    const sevBadge = SEVERITY_BADGE[report.severity] || SEVERITY_BADGE.medium;
    const statusBadge = STATUS_BADGE[report.status] || STATUS_BADGE.new;
    const accentColor = LEFT_ACCENT[report.severity] || "#6366F1";
    const nextStep = STATUS_NEXT[report.status];
    const nextBtnStyle = nextStep ? NEXT_BTN_STYLE[nextStep.status] : null;

    return (
      <div
        key={report.id}
        style={{
          backgroundColor: "#ffffff",
          borderLeft: `4px solid ${accentColor}`,
          borderBottom: "1px solid #F1F5F9",
        }}
      >
        {/* Row */}
        <div
          style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", cursor: "pointer" }}
          onClick={() => setExpandedId(isExpanded ? null : report.id)}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8FAFC"}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"}
        >
          {/* Expand icon */}
          <div style={{ marginTop: 2, color: "#9CA3AF", flexShrink: 0 }}>
            {isExpanded
              ? <ChevronDown style={{ width: 16, height: 16 }} />
              : <ChevronRight style={{ width: 16, height: 16 }} />}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges row */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "2px 8px", borderRadius: 9999,
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                backgroundColor: sevBadge.bg, color: sevBadge.color,
                border: `1px solid ${sevBadge.border}`,
              }}>{report.severity}</span>

              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 9999,
                fontSize: 11, fontWeight: 600,
                backgroundColor: "#F1F5F9", color: "#374151",
                border: "1px solid #E2E8F0", textTransform: "capitalize",
              }}>
                <Icon style={{ width: 12, height: 12 }} />
                {report.sourceApp === "api" ? "API Server" : report.sourceApp}
              </span>

              <span style={{
                fontSize: 11, color: "#6B7280",
                backgroundColor: "#F9FAFB", padding: "2px 8px", borderRadius: 9999,
                border: "1px solid #E5E7EB",
              }}>
                {report.errorType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </span>

              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "2px 8px", borderRadius: 9999,
                fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                backgroundColor: statusBadge.bg, color: statusBadge.color,
              }}>
                {report.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Message */}
            <p style={{
              fontSize: 14, fontWeight: 500, color: "#111827",
              lineHeight: "1.4", marginBottom: 4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {report.errorMessage}
            </p>

            {/* Meta */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 11, color: "#9CA3AF" }}>
              <span>{formatTimestamp(report.timestamp)}</span>
              {report.functionName && (
                <span style={{ fontFamily: "monospace", backgroundColor: "#F3F4F6", color: "#6B7280", padding: "1px 6px", borderRadius: 4 }}>
                  {report.functionName}
                </span>
              )}
              {report.componentName && (
                <span style={{ fontFamily: "monospace", backgroundColor: "#F3F4F6", color: "#6B7280", padding: "1px 6px", borderRadius: 4 }}>
                  {report.componentName}
                </span>
              )}
              {report.shortImpact && (
                <span style={{ fontStyle: "italic", color: "#9CA3AF" }}>{report.shortImpact}</span>
              )}
            </div>
          </div>

          {/* Action button */}
          <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {nextStep && nextBtnStyle ? (
              <button
                onClick={() => updateMutation.mutate({ id: report.id, newStatus: nextStep.status })}
                disabled={updateMutation.isPending}
                style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "5px 10px", borderRadius: 8,
                  backgroundColor: nextBtnStyle.bg, color: nextBtnStyle.color,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  opacity: updateMutation.isPending ? 0.6 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = nextBtnStyle.hover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = nextBtnStyle.bg; }}
              >
                {nextStep.label}
              </button>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 600, color: "#16A34A",
                padding: "5px 10px", backgroundColor: "#F0FDF4",
                borderRadius: 8, border: "1px solid #BBF7D0",
              }}>
                <CheckCircle2 style={{ width: 12, height: 12 }} />
                Resolved
              </span>
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div style={{ padding: "16px 16px 20px 44px", backgroundColor: "#F8FAFC", borderTop: "1px solid #F1F5F9" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
              {[
                { label: "Timestamp",  value: new Date(report.timestamp).toLocaleString(), mono: false },
                { label: "Module",     value: report.moduleName    || "—", mono: true },
                { label: "Function",   value: report.functionName  || "—", mono: true },
                { label: "Component",  value: report.componentName || "—", mono: true },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>
                    {f.label}
                  </p>
                  <p style={{ fontSize: 12, color: "#374151", fontFamily: f.mono ? "monospace" : "inherit" }}>{f.value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>
                Error Message
              </p>
              <p style={{
                fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-all",
                backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
              }}>{report.errorMessage}</p>
            </div>

            {report.shortImpact && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>Impact</p>
                <p style={{ fontSize: 12, color: "#374151" }}>{report.shortImpact}</p>
              </div>
            )}

            {report.stackTrace && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>Stack Trace</p>
                <pre style={{
                  fontSize: 11, fontFamily: "monospace",
                  backgroundColor: "#111827", color: "#86EFAC",
                  border: "1px solid #374151", borderRadius: 8, padding: 12,
                  overflowX: "auto", maxHeight: 256, whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>{report.stackTrace}</pre>
              </div>
            )}

            {report.metadata && Object.keys(report.metadata).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>Metadata</p>
                <pre style={{
                  fontSize: 11, fontFamily: "monospace", color: "#374151",
                  backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                  overflowX: "auto", maxHeight: 160, whiteSpace: "pre-wrap",
                }}>{JSON.stringify(report.metadata, null, 2)}</pre>
              </div>
            )}

            {(report.acknowledgedAt || report.resolvedAt) && (
              <div style={{ display: "flex", gap: 24 }}>
                {report.acknowledgedAt && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>Acknowledged At</p>
                    <p style={{ fontSize: 12, color: "#374151" }}>{new Date(report.acknowledgedAt).toLocaleString()}</p>
                  </div>
                )}
                {report.resolvedAt && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 4 }}>Resolved At</p>
                    <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>{new Date(report.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", padding: "24px", fontFamily: "Inter, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Bug style={{ width: 22, height: 22, color: "#EF4444" }} />
            Error Monitor
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Real-time error tracking across all apps</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {canFixAll && (
            <button
              onClick={handleFixAll}
              disabled={fixingAll}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none",
                backgroundColor: "#16A34A", color: "#ffffff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                opacity: fixingAll ? 0.7 : 1,
              }}
            >
              <CheckCheck style={{ width: 15, height: 15 }} />
              {fixingAll ? "Fixing…" : `Fix All (${pagination.total})`}
            </button>
          )}
          <button
            onClick={() => setGroupByCategory(g => !g)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${groupByCategory ? "#A78BFA" : "#D1D5DB"}`,
              backgroundColor: groupByCategory ? "#EDE9FE" : "#ffffff",
              color: groupByCategory ? "#7C3AED" : "#374151",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <Layers style={{ width: 14, height: 14 }} />
            Group by Type
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${hasFilters ? "#818CF8" : "#D1D5DB"}`,
              backgroundColor: hasFilters ? "#EEF2FF" : "#ffffff",
              color: hasFilters ? "#4F46E5" : "#374151",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <Filter style={{ width: 14, height: 14 }} />
            Filters
            {hasFilters && <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#6366F1", display: "inline-block" }} />}
          </button>
          <button
            onClick={() => refetch()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid #D1D5DB", backgroundColor: "#ffffff",
              color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div style={{
          backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 12,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Filters</span>
            {hasFilters && (
              <button onClick={clearFilters} style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                color: "#DC2626", background: "none", border: "none", cursor: "pointer",
              }}>
                <X style={{ width: 12, height: 12 }} /> Clear all
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { value: sourceApp, onChange: (v: string) => { setSourceApp(v); setPage(1); }, options: SOURCE_APPS },
              { value: severity,  onChange: (v: string) => { setSeverity(v);  setPage(1); }, options: SEVERITIES },
              { value: errorType, onChange: (v: string) => { setErrorType(v); setPage(1); }, options: ERROR_TYPES },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
                style={{
                  backgroundColor: "#ffffff", border: "1px solid #D1D5DB", borderRadius: 8,
                  padding: "8px 12px", fontSize: 13, color: "#374151",
                  outline: "none", cursor: "pointer",
                }}>
                {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              style={{
                backgroundColor: "#ffffff", border: "1px solid #D1D5DB", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, color: "#374151", outline: "none",
              }} />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              style={{
                backgroundColor: "#ffffff", border: "1px solid #D1D5DB", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, color: "#374151", outline: "none",
              }} />
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", marginBottom: 16 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", fontSize: 13, fontWeight: 600,
                border: "none", borderBottom: isActive ? `2px solid ${tab.activeBorder}` : "2px solid transparent",
                marginBottom: -2, cursor: "pointer",
                backgroundColor: isActive ? tab.activeBg : "transparent",
                color: isActive ? tab.activeColor : "#6B7280",
                borderRadius: "8px 8px 0 0",
                transition: "all 0.15s",
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: "1px 7px", borderRadius: 9999,
                  backgroundColor: isActive ? tab.badgeBg : "#F3F4F6",
                  color: isActive ? tab.badgeColor : "#6B7280",
                  minWidth: 20, textAlign: "center",
                }}>
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error List ── */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {isLoading && reports.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "4px solid #6366F1", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#9CA3AF" }}>
            {activeTab === "completed" ? (
              <>
                <CheckCircle2 style={{ width: 48, height: 48, color: "#4ADE80", marginBottom: 12 }} />
                <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>No completed errors</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Resolved errors will appear here</p>
              </>
            ) : activeTab === "unresolved" ? (
              <>
                <ShieldAlert style={{ width: 48, height: 48, color: "#FCD34D", marginBottom: 12 }} />
                <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>No unresolved errors</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Acknowledged / in-progress errors appear here</p>
              </>
            ) : (
              <>
                <Inbox style={{ width: 48, height: 48, color: "#4ADE80", marginBottom: 12 }} />
                <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>No new errors</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>All systems are running smoothly</p>
              </>
            )}
          </div>
        ) : groupedReports ? (
          <div>
            {Object.entries(groupedReports).map(([cat, catReports]) => (
              <div key={cat}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", backgroundColor: "#F8FAFC",
                  borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 10,
                }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: "#9CA3AF" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4B5563" }}>
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: "1px 7px", borderRadius: 9999,
                    backgroundColor: "#E5E7EB", color: "#4B5563",
                  }}>
                    {catReports.length}
                  </span>
                </div>
                <div>{catReports.map(r => renderReportRow(r))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>{reports.map(r => renderReportRow(r))}</div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderTop: "1px solid #F1F5F9", backgroundColor: "#F8FAFC",
          }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12,
                  border: "1px solid #D1D5DB", backgroundColor: "#ffffff",
                  color: "#374151", cursor: page <= 1 ? "not-allowed" : "pointer",
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >Previous</button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12,
                  border: "1px solid #D1D5DB", backgroundColor: "#ffffff",
                  color: "#374151", cursor: page >= pagination.totalPages ? "not-allowed" : "pointer",
                  opacity: page >= pagination.totalPages ? 0.5 : 1,
                }}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
