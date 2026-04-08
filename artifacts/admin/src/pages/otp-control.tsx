import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, RefreshCw, CheckCircle2, XCircle, Loader2,
  Search, Clock, ChevronUp, ChevronDown, Save,
  Eye, EyeOff, AlertTriangle, Key, Users, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher, getApiBase, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

async function api(method: string, path: string, body?: unknown) {
  const token = getToken() ?? "";
  const r = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) {
    window.location.href = (import.meta.env.BASE_URL ?? "/") + "login";
    return null;
  }
  return r.json();
}

/* ── countdown hook ── */
function useCountdown(targetIso: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!targetIso) { setRemaining(0); return; }
    const tick = () => {
      const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type OTPStatus = { isGloballyDisabled: boolean; disabledUntil: string | null; activeBypassCount: number };
type UserRow = { id: string; name: string | null; phone: string | null; otpBypassUntil?: string | null };
type AuditEntry = { id: string; event: string; userId: string | null; phone: string | null; name: string | null; ip: string; channel: string | null; result: string | null; adminId: string | null; createdAt: string };

const TABS = [
  { id: "global",   label: "Global Control",      emoji: "🌐" },
  { id: "bypass",   label: "Per-User Bypass",      emoji: "👤" },
  { id: "channels", label: "Channel Priority",     emoji: "📡" },
  { id: "ratelimit",label: "Rate Limits",          emoji: "⚙️" },
  { id: "audit",    label: "Audit Log",            emoji: "📋" },
] as const;
type TabId = typeof TABS[number]["id"];

function Panel({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className={`flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" />
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════ GLOBAL CONTROL TAB ════════════════ */
function GlobalControlTab() {
  const { toast } = useToast();
  const [status, setStatus] = useState<OTPStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const remaining = useCountdown(status?.disabledUntil ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api("GET", "/otp/status");
      if (d?.data) setStatus(d.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Auto-restore when countdown reaches 0 */
  useEffect(() => {
    if (status?.isGloballyDisabled && remaining === 0 && status.disabledUntil) {
      setTimeout(load, 1500);
    }
  }, [remaining, status?.isGloballyDisabled, status?.disabledUntil, load]);

  const disable = async (mins: number) => {
    const d = await api("POST", "/otp/disable", { minutes: mins });
    if (d?.data) {
      toast({ title: "OTPs Disabled", description: `All OTPs suspended for ${mins} minutes.` });
      load();
    } else {
      toast({ title: "Error", description: d?.error ?? "Failed", variant: "destructive" });
    }
  };

  const restore = async () => {
    await api("DELETE", "/otp/disable");
    toast({ title: "OTPs Restored", description: "Global OTP has been re-enabled." });
    load();
  };

  return (
    <div className="space-y-4">
      <Panel title="Global OTP Status" icon={Shield} color="text-indigo-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {status === null ? "Loading…" : status.isGloballyDisabled ? "OTPs are DISABLED (auto-pass mode)" : "OTPs are ACTIVE"}
            </p>
            {status?.isGloballyDisabled && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-restores in: <span className="font-mono font-bold text-red-600">{fmtCountdown(remaining)}</span>
              </p>
            )}
            {status && <p className="text-xs text-muted-foreground mt-0.5">{status.activeBypassCount} active per-user bypass(es)</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-8 gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {status?.isGloballyDisabled && (
              <Button size="sm" variant="destructive" onClick={restore} className="h-8">Restore Now</Button>
            )}
          </div>
        </div>

        {status?.isGloballyDisabled && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">OTPs are globally suspended!</p>
              <p className="text-xs text-red-700">All login OTPs will auto-pass. Users can log in without a valid OTP code until the timer expires.</p>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Temporarily Disable OTPs" icon={Clock} color="text-red-700">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Use this when OTP delivery is broken (SMS/WhatsApp outage). All OTP checks will auto-pass during this window. Re-enables automatically.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ label: "30 min", mins: 30 }, { label: "1 hour", mins: 60 }, { label: "2 hours", mins: 120 }].map(opt => (
            <Button key={opt.mins} variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => disable(opt.mins)} disabled={loading}>
              Disable for {opt.label}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Custom mins" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
              className="w-28 h-8 text-xs" min={1} max={1440} />
            <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 h-8"
              onClick={() => { const m = parseInt(customMinutes, 10); if (m > 0) disable(m); }}
              disabled={!customMinutes || parseInt(customMinutes, 10) <= 0 || loading}>
              Disable
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════ PER-USER BYPASS TAB ════════════════ */
function PerUserBypassTab() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [bypassMins, setBypassMins] = useState<Record<string, string>>({});
  const [generatedOtp, setGeneratedOtp] = useState<Record<string, { otp: string; visible: boolean; timer: number }>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const searchUsers = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const d = await fetcher(`/users/search?q=${encodeURIComponent(query)}&limit=20`);
      const list: UserRow[] = (d?.users ?? []).map((u: { id: string; name: string | null; phone: string | null; otpBypassUntil?: string | null }) => ({
        id: u.id, name: u.name, phone: u.phone, otpBypassUntil: u.otpBypassUntil,
      }));
      setUsers(list);
    } finally { setSearching(false); }
  }, [query]);

  useEffect(() => {
    const id = setTimeout(() => { if (query.trim().length >= 2) searchUsers(); }, 400);
    return () => clearTimeout(id);
  }, [query, searchUsers]);

  const grantBypass = async (userId: string, mins: number) => {
    const d = await api("POST", `/users/${userId}/otp/bypass`, { minutes: mins });
    if (d?.data?.bypassUntil) {
      toast({ title: "Bypass Granted", description: `OTP bypass set for ${mins} minutes.` });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, otpBypassUntil: d.data.bypassUntil } : u));
    } else {
      toast({ title: "Error", description: d?.error ?? "Failed", variant: "destructive" });
    }
  };

  const cancelBypass = async (userId: string) => {
    await api("DELETE", `/users/${userId}/otp/bypass`);
    toast({ title: "Bypass Cancelled" });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, otpBypassUntil: null } : u));
  };

  const generateOtp = async (userId: string) => {
    const d = await api("POST", `/users/${userId}/otp/generate`);
    if (d?.data?.otp) {
      if (timersRef.current[userId]) clearInterval(timersRef.current[userId]);
      setGeneratedOtp(prev => ({ ...prev, [userId]: { otp: d.data.otp, visible: true, timer: 30 } }));
      timersRef.current[userId] = setInterval(() => {
        setGeneratedOtp(prev => {
          const cur = prev[userId];
          if (!cur) return prev;
          if (cur.timer <= 1) {
            clearInterval(timersRef.current[userId]);
            const next = { ...prev };
            delete next[userId];
            return next;
          }
          return { ...prev, [userId]: { ...cur, timer: cur.timer - 1 } };
        });
      }, 1000);
      toast({ title: "OTP Generated", description: "The plaintext OTP is shown for 30 seconds only." });
    } else {
      toast({ title: "Error", description: d?.error ?? "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Search Users" icon={Users} color="text-blue-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {searching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching…
          </div>
        )}

        {users.length > 0 && (
          <div className="space-y-2">
            {users.map(user => {
              const bypassActive = !!(user.otpBypassUntil && new Date(user.otpBypassUntil) > new Date());
              const gen = generatedOtp[user.id];
              return (
                <div key={user.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{user.name ?? "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.phone ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {bypassActive ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Bypass Active</Badge>
                      ) : (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </div>
                  </div>

                  {/* OTP display box */}
                  {gen && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <Key className="w-4 h-4 text-yellow-700 shrink-0" />
                      <span className="text-xs text-yellow-800 font-semibold">Generated OTP:</span>
                      <span className="font-mono text-base font-bold tracking-widest text-yellow-900">
                        {gen.visible ? gen.otp : "••••••"}
                      </span>
                      <button onClick={() => setGeneratedOtp(prev => ({ ...prev, [user.id]: { ...gen, visible: !gen.visible } }))}
                        className="ml-auto text-yellow-700 hover:text-yellow-900">
                        {gen.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <span className="text-[10px] text-yellow-700 font-mono ml-1">{gen.timer}s</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5">
                    {bypassActive ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700"
                        onClick={() => cancelBypass(user.id)}>Cancel Bypass</Button>
                    ) : (
                      <>
                        {[15, 30, 60].map(m => (
                          <Button key={m} size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => grantBypass(user.id, m)}>Bypass {m}m</Button>
                        ))}
                        <div className="flex items-center gap-1">
                          <Input type="number" placeholder="min" value={bypassMins[user.id] ?? ""}
                            onChange={e => setBypassMins(prev => ({ ...prev, [user.id]: e.target.value }))}
                            className="w-16 h-7 text-xs" min={1} />
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { const m = parseInt(bypassMins[user.id] ?? "", 10); if (m > 0) grantBypass(user.id, m); }}>
                            Custom
                          </Button>
                        </div>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 ml-auto"
                      onClick={() => generateOtp(user.id)}>
                      <Key className="w-3 h-3 mr-1" /> Generate OTP
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searching && query.trim().length >= 2 && users.length === 0 && (
          <p className="text-xs text-muted-foreground">No users found.</p>
        )}
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════ CHANNEL PRIORITY TAB ══════════════════ */
function ChannelPriorityTab() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<string[]>(["whatsapp", "sms", "email"]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api("GET", "/otp/channels");
      if (d?.data?.channels) setChannels(d.data.channels);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveUp = (i: number) => {
    if (i === 0) return;
    setChannels(prev => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveDown = (i: number) => {
    if (i === channels.length - 1) return;
    setChannels(prev => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; });
  };

  const save = async () => {
    setSaving(true);
    const d = await api("PATCH", "/otp/channels", { channels });
    setSaving(false);
    if (d?.data?.channels) {
      setChannels(d.data.channels);
      toast({ title: "Channel Priority Saved", description: `Order: ${d.data.channels.join(" → ")}` });
    } else {
      toast({ title: "Error", description: d?.error ?? "Failed", variant: "destructive" });
    }
  };

  const channelLabel: Record<string, { icon: string; label: string; desc: string }> = {
    whatsapp: { icon: "💬", label: "WhatsApp", desc: "Via WhatsApp Business API" },
    sms:      { icon: "📱", label: "SMS", desc: "Via Twilio / MSG91 / Zong" },
    email:    { icon: "📧", label: "Email", desc: "Via configured email provider" },
  };

  return (
    <div className="space-y-4">
      <Panel title="OTP Delivery Channel Priority" icon={BarChart3} color="text-blue-700">
        <p className="text-xs text-muted-foreground">
          Drag or use arrows to reorder. The first available channel is tried; if it fails, the next is tried automatically.
        </p>
        <div className="space-y-2">
          {channels.map((ch, i) => {
            const info = channelLabel[ch] ?? { icon: "📡", label: ch, desc: "" };
            return (
              <div key={ch} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                <span className="text-lg w-6 text-center">{info.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveUp(i)} disabled={i === 0}
                    className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveDown(i)} disabled={i === channels.length - 1}
                    className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Button onClick={save} disabled={saving || loading} className="gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Channel Order
        </Button>
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════ RATE LIMITS TAB ════════════════════ */
function RateLimitsTab() {
  const { toast } = useToast();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetcher("/platform-settings");
      const settings: Record<string, string> = {};
      for (const item of d?.settings ?? []) { settings[item.key] = item.value; }
      const keys = ["security_otp_cooldown_sec", "security_login_max_attempts", "security_lockout_minutes",
        "security_otp_max_per_phone", "security_otp_max_per_ip", "security_otp_window_min"];
      const sub: Record<string, string> = {};
      for (const k of keys) sub[k] = settings[k] ?? "";
      setVals(sub);
      setSaved(sub);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = Object.keys(vals).some(k => vals[k] !== saved[k]);

  const save = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    for (const k of Object.keys(vals)) { if (vals[k] !== saved[k]) body[k] = vals[k]; }
    try {
      await fetch(`${getApiBase()}/platform-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": getToken() ?? "" },
        body: JSON.stringify(body),
      });
      setSaved({ ...vals });
      toast({ title: "Rate Limits Saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    }
    setSaving(false);
  };

  const f = (k: string) => vals[k] ?? "";
  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }));

  const fields = [
    { k: "security_otp_cooldown_sec", label: "OTP Resend Cooldown", suffix: "sec", hint: "Min seconds between OTP resend requests per phone" },
    { k: "security_login_max_attempts", label: "Max OTP Attempts", suffix: "attempts", hint: "Failed attempts before lockout" },
    { k: "security_lockout_minutes", label: "Lockout Duration", suffix: "min", hint: "How long account is locked after max failures" },
    { k: "security_otp_max_per_phone", label: "OTP Request Limit (per phone)", suffix: "per window", hint: "Max OTP requests per phone per window" },
    { k: "security_otp_max_per_ip", label: "OTP Request Limit (per IP)", suffix: "per window", hint: "Max OTP requests per IP per window" },
    { k: "security_otp_window_min", label: "Rate Limit Window", suffix: "min", hint: "Duration of the OTP rate limit window" },
  ];

  return (
    <div className="space-y-4">
      <Panel title="OTP Rate Limit & Lockout Settings" icon={Shield} color="text-purple-700">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ k, label, suffix, hint }) => (
              <div key={k} className="space-y-1">
                <label className="text-xs font-semibold text-foreground">{label}</label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={f(k)} onChange={e => set(k, e.target.value)}
                    className={`h-9 text-sm ${vals[k] !== saved[k] ? "border-amber-400 ring-1 ring-amber-300" : ""}`}
                    min={0} />
                  {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
                </div>
                {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
              </div>
            ))}
          </div>
        )}
        {dirty && (
          <Button onClick={save} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Rate Limit Settings
          </Button>
        )}
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════ AUDIT LOG TAB ═════════════════════ */
function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (userFilter.trim()) params.set("userId", userFilter.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const d = await api("GET", `/otp/audit?${params}`);
      if (d?.data) {
        setEntries(d.data.entries ?? []);
        setTotal(d.data.total ?? 0);
        setPage(d.data.page ?? 1);
        setPages(d.data.pages ?? 0);
      }
    } finally { setLoading(false); }
  }, [userFilter, from, to]);

  useEffect(() => { load(1); }, [load]);

  const eventBadge: Record<string, string> = {
    otp_sent: "bg-blue-100 text-blue-700",
    otp_verified_new_user: "bg-green-100 text-green-700",
    login_otp_bypass: "bg-amber-100 text-amber-700",
    login_global_otp_bypass: "bg-purple-100 text-purple-700",
    otp_reuse_attempt: "bg-red-100 text-red-700",
    otp_expired: "bg-red-100 text-red-700",
    otp_failed: "bg-red-100 text-red-700",
    admin_otp_bypass_set: "bg-amber-100 text-amber-700",
    admin_otp_bypass_cancel: "bg-gray-100 text-gray-600",
    admin_otp_generate: "bg-yellow-100 text-yellow-700",
    admin_otp_global_disable: "bg-red-100 text-red-700",
    admin_otp_global_restore: "bg-green-100 text-green-700",
    otp_send_bypassed: "bg-amber-100 text-amber-700",
    otp_send_global_bypassed: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <Panel title="OTP Audit Log" icon={BarChart3} color="text-gray-700">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Filter by User ID" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="w-40 h-8 text-xs" />
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-8 text-xs" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-8 text-xs" />
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => load(1)} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{total} total entries</p>

        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

        {!loading && entries.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No OTP audit entries found.</div>
        )}

        {entries.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-2 text-left font-semibold">Event</th>
                  <th className="p-2 text-left font-semibold">User</th>
                  <th className="p-2 text-left font-semibold">Phone</th>
                  <th className="p-2 text-left font-semibold">IP</th>
                  <th className="p-2 text-left font-semibold">Channel</th>
                  <th className="p-2 text-left font-semibold">Result</th>
                  <th className="p-2 text-left font-semibold">Admin</th>
                  <th className="p-2 text-left font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="p-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${eventBadge[e.event] ?? "bg-gray-100 text-gray-600"}`}>
                        {e.event}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-[11px]">{e.name ?? e.userId ?? "—"}</td>
                    <td className="p-2 font-mono">{e.phone ?? "—"}</td>
                    <td className="p-2 font-mono text-[11px] text-muted-foreground">{e.ip}</td>
                    <td className="p-2">{e.channel ?? "—"}</td>
                    <td className="p-2">
                      {e.result === "success"
                        ? <span className="text-green-700 font-semibold">success</span>
                        : e.result === "fail"
                          ? <span className="text-red-600 font-semibold">fail</span>
                          : <span className="text-muted-foreground">{e.result ?? "—"}</span>}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-muted-foreground">{e.adminId ?? "—"}</td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)} className="h-7">Prev</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => load(page + 1)} className="h-7">Next</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════════ MAIN PAGE ══════════════════════ */
export default function OtpControlPage() {
  const [tab, setTab] = useState<TabId>("global");

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          OTP Control Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage OTP delivery, global disable, per-user bypasses, channel priority, rate limits, and audit log.
        </p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1.5 bg-muted/50 p-1.5 rounded-xl w-max min-w-full">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all
                ${tab === t.id ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:bg-white"}`}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "global"    && <GlobalControlTab />}
      {tab === "bypass"    && <PerUserBypassTab />}
      {tab === "channels"  && <ChannelPriorityTab />}
      {tab === "ratelimit" && <RateLimitsTab />}
      {tab === "audit"     && <AuditLogTab />}
    </div>
  );
}
