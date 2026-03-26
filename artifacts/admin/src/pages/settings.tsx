import { useState, useEffect } from "react";
import {
  Settings2, Save, RefreshCw, Truck, Car, BarChart3,
  ShoppingCart, Globe, Users, Bike, Store, Zap, Info,
  MessageSquare, Shield, Puzzle, Link, KeyRound, Bell,
  Wifi, AlertTriangle, CreditCard, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Setting {
  key: string;
  value: string;
  label: string;
  category: string;
}

const CATEGORY_CONFIG: Record<string, {
  label: string; icon: any; color: string; bg: string; description: string;
}> = {
  features:     { label: "App Feature Toggles",       icon: Zap,          color: "text-violet-600",  bg: "bg-violet-100",  description: "Turn each service on or off across the entire app instantly" },
  customer:     { label: "Customer Settings",          icon: Users,        color: "text-blue-600",    bg: "bg-blue-100",    description: "Wallet limits, loyalty points, referral bonuses and order caps for customers" },
  rider:        { label: "Rider Settings",             icon: Bike,         color: "text-green-600",   bg: "bg-green-100",   description: "Earnings %, acceptance radius, delivery limits and payout rules for riders" },
  vendor:       { label: "Vendor Settings",            icon: Store,        color: "text-orange-600",  bg: "bg-orange-100",  description: "Commission rates, menu limits, settlement cycles and approval rules for vendors" },
  delivery:     { label: "Delivery Charges",           icon: Truck,        color: "text-sky-600",     bg: "bg-sky-100",     description: "Delivery fees per service and free delivery threshold" },
  rides:        { label: "Ride Pricing",               icon: Car,          color: "text-teal-600",    bg: "bg-teal-100",    description: "Base fare and per-km rates for bike and car rides" },
  finance:      { label: "Finance & Margins",          icon: BarChart3,    color: "text-purple-600",  bg: "bg-purple-100",  description: "Platform-wide commission percentage" },
  orders:       { label: "Order Rules",                icon: ShoppingCart, color: "text-amber-600",   bg: "bg-amber-100",   description: "Minimum order amounts and COD limits" },
  general:      { label: "General Settings",           icon: Globe,        color: "text-gray-600",    bg: "bg-gray-100",    description: "App name, support contact and maintenance mode" },
  content:      { label: "Content & Messaging",        icon: MessageSquare,color: "text-pink-600",    bg: "bg-pink-100",    description: "Control app banners, announcements, chat support and content links" },
  security:     { label: "Security & API Keys",        icon: Shield,       color: "text-red-600",     bg: "bg-red-100",     description: "OTP modes, GPS tracking, rate limits and third-party API credentials" },
  integrations: { label: "Platform Integrations",      icon: Puzzle,       color: "text-indigo-600",  bg: "bg-indigo-100",  description: "Toggle push notifications, analytics, email alerts and monitoring tools" },
  payment:      { label: "Payment Gateways",           icon: CreditCard,   color: "text-emerald-600", bg: "bg-emerald-100", description: "Configure JazzCash and EasyPaisa credentials, modes and transaction limits" },
};

const TOGGLE_KEYS = new Set([
  "feature_mart","feature_food","feature_rides","feature_pharmacy",
  "feature_parcel","feature_wallet","feature_referral","feature_new_users",
  "rider_cash_allowed","vendor_auto_approve",
  "feature_chat","feature_live_tracking","feature_reviews",
  "security_otp_bypass","security_gps_tracking",
  "integration_push_notif","integration_analytics",
  "integration_email","integration_sentry","integration_whatsapp",
  "jazzcash_enabled","easypaisa_enabled","payment_auto_cancel",
]);

const TEXT_KEYS = new Set([
  "app_name","app_status","support_phone",
  "content_banner","content_announcement","content_maintenance_msg",
  "content_support_msg","content_tnc_url","content_privacy_url",
  "api_map_key","api_sms_gateway","api_firebase_key",
  "jazzcash_merchant_id","jazzcash_password","jazzcash_salt",
  "jazzcash_currency","jazzcash_return_url","jazzcash_mode",
  "easypaisa_store_id","easypaisa_merchant_id","easypaisa_hash_key",
  "easypaisa_username","easypaisa_password","easypaisa_mode",
]);

const FEATURE_ICONS: Record<string, string> = {
  feature_mart:           "🛒",
  feature_food:           "🍔",
  feature_rides:          "🚗",
  feature_pharmacy:       "💊",
  feature_parcel:         "📦",
  feature_wallet:         "💰",
  feature_referral:       "🎁",
  feature_new_users:      "👤",
  integration_push_notif: "🔔",
  integration_analytics:  "📊",
  integration_email:      "📧",
  integration_sentry:     "🐛",
  integration_whatsapp:   "💬",
};

function ToggleSwitch({
  checked, onChange, label, icon, isDirty, danger,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; icon?: string; isDirty: boolean; danger?: boolean }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all select-none
        ${checked
          ? danger ? "bg-red-50 border-red-300 hover:bg-red-100" : "bg-green-50 border-green-200 hover:bg-green-100"
          : "bg-muted/40 border-border hover:bg-muted/60"}
        ${isDirty ? "ring-2 ring-amber-300" : ""}
      `}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        {danger && !icon && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className={`text-xs font-bold ${checked ? (danger ? "text-red-600" : "text-green-600") : "text-muted-foreground"}`}>
            {checked ? (danger ? "⚠ ENABLED" : "● Active") : "○ Disabled"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isDirty && (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>
        )}
        <div className={`w-12 h-6 rounded-full transition-colors relative ${checked ? (danger ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Credential Input (with show/hide toggle for secrets) ────────────────────
function CredInput({
  label, value, onChange, placeholder, isDirty, isSecret = false, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  isDirty: boolean; isSecret?: boolean; suffix?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
        {value && !isDirty && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
      </div>
      <div className="relative">
        <Input
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "Not configured"}
          className={`h-9 rounded-lg text-sm font-mono pr-8 ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""} ${!value ? "border-dashed text-muted-foreground" : ""}`}
        />
        {suffix && !isSecret && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{suffix}</span>
        )}
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Gateway Card (JazzCash / EasyPaisa) ─────────────────────────────────────
function GatewayCard({
  prefix, name, logo, color, bgColor, borderColor,
  localValues, dirtyKeys, handleChange, handleToggle,
}: {
  prefix: "jazzcash" | "easypaisa";
  name: string;
  logo: string;
  color: string;
  bgColor: string;
  borderColor: string;
  localValues: Record<string, string>;
  dirtyKeys: Set<string>;
  handleChange: (k: string, v: string) => void;
  handleToggle: (k: string, v: boolean) => void;
}) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; mode?: string } | null>(null);

  const enabled = (localValues[`${prefix}_enabled`] ?? "off") === "on";
  const mode    = localValues[`${prefix}_mode`]  ?? "sandbox";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`/api/payments/test-connection/${prefix}`, {
        headers: { "x-admin-secret": localStorage.getItem("ajkmart_admin_token") || "" },
      });
      const d = await r.json() as any;
      setTestResult({ ok: d.ok, message: d.message, mode: d.mode });
      if (d.ok) {
        toast({ title: `${name} connection test passed ✅`, description: d.message });
      } else {
        toast({ title: `${name} not ready`, description: d.message, variant: "destructive" });
      }
    } catch {
      setTestResult({ ok: false, message: "Connection test failed — is the API server running?" });
    }
    setTesting(false);
  };

  return (
    <div className={`rounded-2xl border-2 ${borderColor} overflow-hidden`}>
      {/* Gateway Header */}
      <div className={`${bgColor} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{logo}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-base ${color}`}>{name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold border ${mode === "live" ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}`}
              >
                {mode === "live" ? "🟢 LIVE" : "🟡 SANDBOX"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {prefix === "jazzcash" ? "Jazz/Mobilink MWALLET" : "Telenor Microfinance MWALLET REST"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="h-8 rounded-lg text-xs gap-1.5"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          {/* Enable toggle */}
          <div
            onClick={() => handleToggle(`${prefix}_enabled`, !enabled)}
            className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl border transition-all
              ${enabled ? "bg-green-50 border-green-300" : "bg-muted/50 border-border"}`}
          >
            <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-green-500" : "bg-gray-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className={`text-xs font-bold ${enabled ? "text-green-700" : "text-muted-foreground"}`}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={`px-5 py-2.5 flex items-center gap-2 text-sm border-b ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          {testResult.message}
        </div>
      )}

      {/* Credentials */}
      <div className="p-5 space-y-4">
        {/* Mode selector */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Environment Mode</label>
          <div className="flex gap-2">
            {["sandbox", "live"].map(m => (
              <button
                key={m}
                onClick={() => handleChange(`${prefix}_mode`, m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  mode === m
                    ? m === "live" ? "bg-green-500 text-white border-green-600" : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {m === "live" ? "🟢 Live (Production)" : "🟡 Sandbox (Testing)"}
              </button>
            ))}
          </div>
          {mode === "live" && (
            <p className="text-xs text-amber-700 flex items-center gap-1.5 mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <strong>Live mode</strong> — Real money transactions. Ensure credentials are correct.
            </p>
          )}
        </div>

        {/* Gateway credentials */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> API Credentials
          </label>
          {prefix === "jazzcash" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CredInput
                label="Merchant ID"
                value={localValues["jazzcash_merchant_id"] ?? ""}
                onChange={v => handleChange("jazzcash_merchant_id", v)}
                placeholder="MC12345"
                isDirty={dirtyKeys.has("jazzcash_merchant_id")}
              />
              <CredInput
                label="Password"
                value={localValues["jazzcash_password"] ?? ""}
                onChange={v => handleChange("jazzcash_password", v)}
                placeholder="••••••••"
                isDirty={dirtyKeys.has("jazzcash_password")}
                isSecret
              />
              <CredInput
                label="Integrity Salt (Hash Key)"
                value={localValues["jazzcash_salt"] ?? ""}
                onChange={v => handleChange("jazzcash_salt", v)}
                placeholder="Your JazzCash salt"
                isDirty={dirtyKeys.has("jazzcash_salt")}
                isSecret
              />
              <CredInput
                label="Currency"
                value={localValues["jazzcash_currency"] ?? "PKR"}
                onChange={v => handleChange("jazzcash_currency", v)}
                placeholder="PKR"
                isDirty={dirtyKeys.has("jazzcash_currency")}
              />
              <div className="sm:col-span-2">
                <CredInput
                  label="Return URL (after payment)"
                  value={localValues["jazzcash_return_url"] ?? ""}
                  onChange={v => handleChange("jazzcash_return_url", v)}
                  placeholder="https://yourdomain.com/api/payments/callback/jazzcash"
                  isDirty={dirtyKeys.has("jazzcash_return_url")}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CredInput
                label="Store ID"
                value={localValues["easypaisa_store_id"] ?? ""}
                onChange={v => handleChange("easypaisa_store_id", v)}
                placeholder="12345"
                isDirty={dirtyKeys.has("easypaisa_store_id")}
              />
              <CredInput
                label="Merchant Account Number"
                value={localValues["easypaisa_merchant_id"] ?? ""}
                onChange={v => handleChange("easypaisa_merchant_id", v)}
                placeholder="03XX-XXXXXXX"
                isDirty={dirtyKeys.has("easypaisa_merchant_id")}
              />
              <CredInput
                label="Hash Key (Secret)"
                value={localValues["easypaisa_hash_key"] ?? ""}
                onChange={v => handleChange("easypaisa_hash_key", v)}
                placeholder="••••••••"
                isDirty={dirtyKeys.has("easypaisa_hash_key")}
                isSecret
              />
              <CredInput
                label="API Username"
                value={localValues["easypaisa_username"] ?? ""}
                onChange={v => handleChange("easypaisa_username", v)}
                placeholder="easypaisa_api_user"
                isDirty={dirtyKeys.has("easypaisa_username")}
              />
              <CredInput
                label="API Password"
                value={localValues["easypaisa_password"] ?? ""}
                onChange={v => handleChange("easypaisa_password", v)}
                placeholder="••••••••"
                isDirty={dirtyKeys.has("easypaisa_password")}
                isSecret
              />
            </div>
          )}
        </div>

        {/* Docs link */}
        <div className="flex items-center gap-2 pt-1">
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          <a
            href={prefix === "jazzcash"
              ? "https://sandbox.jazzcash.com.pk/sandbox/documentation"
              : "https://easypaystg.easypaisa.com.pk/easypay-service/rest/documentation"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            {name} Developer Documentation
          </a>
          <span className="text-xs text-muted-foreground">— {mode} portal</span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetcher("/platform-settings");
      setSettings(data.settings || []);
      const vals: Record<string, string> = {};
      for (const s of data.settings || []) vals[s.key] = s.value;
      setLocalValues(vals);
      setDirtyKeys(new Set());
    } catch (e: any) {
      toast({ title: "Failed to load settings", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => { const n = new Set(prev); n.add(key); return n; });
  };

  const handleToggle = (key: string, val: boolean) => {
    handleChange(key, val ? "on" : "off");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Array.from(dirtyKeys).map(key => ({ key, value: localValues[key] ?? "" }));
      await fetcher("/platform-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: changed }),
      });
      setDirtyKeys(new Set());
      toast({ title: "Settings saved! ✅", description: `${changed.length} change(s) applied instantly across the app.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleReset = async () => {
    await loadSettings();
    toast({ title: "Settings reloaded" });
  };

  const grouped: Record<string, Setting[]> = {};
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const getInputType  = (key: string) => TEXT_KEYS.has(key) ? "text" : "number";
  const getInputSuffix = (key: string) => {
    if (key.includes("_pct") || key.includes("pct")) return "%";
    if (TEXT_KEYS.has(key)) return "";
    if (key.includes("_km") || key === "rider_acceptance_km") return "KM";
    if (key.includes("_day") || key.includes("_days") || key === "security_session_days") return "days";
    if (key.includes("_pts") || key.includes("_items") || key.includes("_deliveries")) return "#";
    if (key === "security_rate_limit") return "req/min";
    if (key === "payment_timeout_mins") return "min";
    return "Rs.";
  };
  const getPlaceholder = (key: string) => {
    if (key === "api_map_key") return "AIza...";
    if (key === "api_firebase_key") return "AAAA...";
    if (key === "api_sms_gateway") return "console";
    if (key.includes("_url")) return "https://...";
    if (key === "content_announcement") return "Leave empty to hide";
    return "";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
      </div>
    );
  }

  const catOrder = [
    "features","customer","rider","vendor",
    "delivery","rides","finance","orders","general",
    "content","security","integrations","payment",
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">App Settings</h1>
            <p className="text-muted-foreground text-sm">Role-based controls — manage every function of the app</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} disabled={loading} className="h-10 rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || dirtyKeys.size === 0}
            className="h-10 rounded-xl gap-2 shadow-md"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : `Save${dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {dirtyKeys.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800 text-sm font-medium">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          {dirtyKeys.size} unsaved change{dirtyKeys.size > 1 ? "s" : ""} — click Save to apply
        </div>
      )}

      {/* Category Cards */}
      {catOrder.map(cat => {
        const cfg = CATEGORY_CONFIG[cat];
        const catSettings = grouped[cat];
        if (!cfg || !catSettings || catSettings.length === 0) return null;
        const Icon = cfg.icon;

        // ── PAYMENT: special full-page renderer ───────────────────────────
        if (cat === "payment") {
          const generalKeys = ["payment_timeout_mins","payment_auto_cancel","payment_min_online","payment_max_online"];
          const generalSettings = catSettings.filter(s => generalKeys.includes(s.key));

          return (
            <Card key={cat} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground">{cfg.label}</h2>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      {[
                        (localValues["jazzcash_enabled"] ?? "off") === "on" && "JazzCash",
                        (localValues["easypaisa_enabled"] ?? "off") === "on" && "EasyPaisa",
                      ].filter(Boolean).join(" + ") || "None Active"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>
              <CardContent className="p-5 space-y-5">
                {/* JazzCash */}
                <GatewayCard
                  prefix="jazzcash"
                  name="JazzCash"
                  logo="🔴"
                  color="text-red-700"
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                  localValues={localValues}
                  dirtyKeys={dirtyKeys}
                  handleChange={handleChange}
                  handleToggle={handleToggle}
                />

                {/* EasyPaisa */}
                <GatewayCard
                  prefix="easypaisa"
                  name="EasyPaisa"
                  logo="🟢"
                  color="text-green-700"
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                  localValues={localValues}
                  dirtyKeys={dirtyKeys}
                  handleChange={handleChange}
                  handleToggle={handleToggle}
                />

                {/* General Payment Rules */}
                <div className="border-t border-border/40 pt-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" /> Transaction Rules
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {generalSettings.map(s => {
                      const isDirty = dirtyKeys.has(s.key);
                      const isToggle = TOGGLE_KEYS.has(s.key);
                      if (isToggle) {
                        return (
                          <ToggleSwitch
                            key={s.key}
                            checked={(localValues[s.key] ?? s.value) === "on"}
                            onChange={v => handleToggle(s.key, v)}
                            label={s.label}
                            isDirty={isDirty}
                          />
                        );
                      }
                      const suffix = getInputSuffix(s.key);
                      return (
                        <div key={s.key} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-foreground">{s.label}</label>
                            {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              value={localValues[s.key] ?? s.value}
                              onChange={e => handleChange(s.key, e.target.value)}
                              className={`h-10 rounded-xl ${suffix ? "pr-14" : ""} ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                              min={0}
                            />
                            {suffix && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{suffix}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Active Payment Methods Summary
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "cash", label: "Cash on Delivery", logo: "💵", always: true },
                      { id: "wallet", label: "AJKMart Wallet", logo: "💰", key: "feature_wallet" },
                      { id: "jazzcash", label: "JazzCash", logo: "🔴", key: "jazzcash_enabled" },
                      { id: "easypaisa", label: "EasyPaisa", logo: "🟢", key: "easypaisa_enabled" },
                    ].map(m => {
                      const active = m.always || (localValues[m.key!] ?? "off") === "on";
                      return (
                        <div key={m.id} className={`rounded-xl p-3 text-center border ${active ? "bg-white border-green-200" : "bg-muted/30 border-border opacity-60"}`}>
                          <div className="text-2xl mb-1">{m.logo}</div>
                          <p className="text-xs font-semibold text-foreground leading-tight">{m.label}</p>
                          <p className={`text-[10px] font-bold mt-1 ${active ? "text-green-600" : "text-muted-foreground"}`}>
                            {active ? "● Active" : "○ Off"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── FEATURES / INTEGRATIONS: all toggles ──────────────────────────
        if (cat === "features" || cat === "integrations") {
          return (
            <Card key={cat} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{cfg.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catSettings.map(s => (
                    <ToggleSwitch
                      key={s.key}
                      checked={(localValues[s.key] ?? s.value) === "on"}
                      onChange={v => handleToggle(s.key, v)}
                      label={s.label}
                      icon={FEATURE_ICONS[s.key]}
                      isDirty={dirtyKeys.has(s.key)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── SECURITY ──────────────────────────────────────────────────────
        if (cat === "security") {
          return (
            <Card key={cat} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{cfg.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catSettings.filter(s => TOGGLE_KEYS.has(s.key)).map(s => (
                      <ToggleSwitch
                        key={s.key}
                        checked={(localValues[s.key] ?? s.value) === "on"}
                        onChange={v => handleToggle(s.key, v)}
                        label={s.label}
                        isDirty={dirtyKeys.has(s.key)}
                        danger={s.key === "security_otp_bypass"}
                      />
                    ))}
                  </div>
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> API Credentials & Keys
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {catSettings.filter(s => !TOGGLE_KEYS.has(s.key)).map(s => {
                        const isDirty = dirtyKeys.has(s.key);
                        const isApiKey = s.key.startsWith("api_");
                        return (
                          <div key={s.key} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-semibold text-foreground">{s.label}</label>
                              {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
                            </div>
                            <Input
                              type="text"
                              value={localValues[s.key] ?? s.value}
                              onChange={e => handleChange(s.key, e.target.value)}
                              placeholder={getPlaceholder(s.key)}
                              className={`h-11 rounded-xl font-mono text-sm ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                            />
                            {isApiKey && !(localValues[s.key] ?? s.value) && (
                              <p className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Not configured
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── CONTENT ───────────────────────────────────────────────────────
        if (cat === "content") {
          return (
            <Card key={cat} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{cfg.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {catSettings.filter(s => TOGGLE_KEYS.has(s.key)).map(s => (
                      <ToggleSwitch
                        key={s.key}
                        checked={(localValues[s.key] ?? s.value) === "on"}
                        onChange={v => handleToggle(s.key, v)}
                        label={s.label}
                        isDirty={dirtyKeys.has(s.key)}
                      />
                    ))}
                  </div>
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Text Content & Links
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {catSettings.filter(s => !TOGGLE_KEYS.has(s.key)).map(s => {
                        const isDirty = dirtyKeys.has(s.key);
                        const isUrl = s.key.includes("_url");
                        return (
                          <div key={s.key} className="space-y-2">
                            <div className="flex items-center gap-2">
                              {isUrl && <Link className="w-3.5 h-3.5 text-muted-foreground" />}
                              <label className="text-sm font-semibold text-foreground">{s.label}</label>
                              {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
                            </div>
                            <Input
                              type="text"
                              value={localValues[s.key] ?? s.value}
                              onChange={e => handleChange(s.key, e.target.value)}
                              placeholder={getPlaceholder(s.key)}
                              className={`h-11 rounded-xl ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                            />
                            <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ── DEFAULT: numeric + inline toggles ─────────────────────────────
        return (
          <Card key={cat} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border/50 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{cfg.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {catSettings.map(s => {
                  const isDirty = dirtyKeys.has(s.key);
                  const isToggle = TOGGLE_KEYS.has(s.key);
                  const suffix = getInputSuffix(s.key);
                  if (isToggle) {
                    return (
                      <ToggleSwitch
                        key={s.key}
                        checked={(localValues[s.key] ?? s.value) === "on"}
                        onChange={v => handleToggle(s.key, v)}
                        label={s.label}
                        isDirty={isDirty}
                      />
                    );
                  }
                  return (
                    <div key={s.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-foreground">{s.label}</label>
                        {isDirty && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={getInputType(s.key)}
                          value={localValues[s.key] ?? s.value}
                          onChange={e => handleChange(s.key, e.target.value)}
                          placeholder={getPlaceholder(s.key)}
                          className={`h-11 rounded-xl ${suffix ? "pr-16" : ""} ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                          min={0}
                        />
                        {suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{suffix}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info Card */}
      <Card className="rounded-2xl border-blue-200 bg-blue-50/50">
        <CardContent className="p-5 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-800 mb-2">How Settings Work</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>All changes take effect <strong>immediately</strong> — no restart needed</li>
              <li><strong>Feature Toggles</strong> instantly enable/disable services app-wide</li>
              <li><strong>Payment Gateways</strong> — save credentials then click "Test Connection" to verify</li>
              <li><strong>Sandbox mode</strong> lets you test payments without real money</li>
              <li><strong>Live mode</strong> requires real JazzCash/EasyPaisa merchant credentials</li>
              <li><strong>Security</strong> settings control OTP mode, GPS tracking and API keys</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
