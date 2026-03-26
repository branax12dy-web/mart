import { useState, useEffect, useCallback } from "react";
import {
  Settings2, Save, RefreshCw, Truck, Car, BarChart3,
  ShoppingCart, Globe, Users, Bike, Store, Zap, Info,
  MessageSquare, Shield, Puzzle, Link, KeyRound, Bell,
  Wifi, AlertTriangle, CreditCard, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, ExternalLink, ChevronRight,
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

const CAT_ORDER = [
  "features","customer","rider","vendor",
  "delivery","rides","finance","orders","general",
  "content","security","integrations","payment",
] as const;

type CatKey = typeof CAT_ORDER[number];

const CATEGORY_CONFIG: Record<CatKey, {
  label: string; icon: any; color: string; bg: string;
  activeBg: string; activeBorder: string; description: string;
}> = {
  features:     { label: "Feature Toggles",    icon: Zap,          color: "text-violet-600",  bg: "bg-violet-50",   activeBg: "bg-violet-600",   activeBorder: "border-violet-600",  description: "Turn each service on or off instantly across the app" },
  customer:     { label: "Customer",           icon: Users,        color: "text-blue-600",    bg: "bg-blue-50",     activeBg: "bg-blue-600",     activeBorder: "border-blue-600",    description: "Wallet limits, loyalty, referral bonuses and order caps" },
  rider:        { label: "Rider",              icon: Bike,         color: "text-green-600",   bg: "bg-green-50",    activeBg: "bg-green-600",    activeBorder: "border-green-600",   description: "Earnings %, acceptance radius, delivery limits and payouts" },
  vendor:       { label: "Vendor",             icon: Store,        color: "text-orange-600",  bg: "bg-orange-50",   activeBg: "bg-orange-600",   activeBorder: "border-orange-600",  description: "Commission, menu limits, settlement and approval rules" },
  delivery:     { label: "Delivery Charges",   icon: Truck,        color: "text-sky-600",     bg: "bg-sky-50",      activeBg: "bg-sky-600",      activeBorder: "border-sky-600",     description: "Delivery fees per service and free delivery threshold" },
  rides:        { label: "Ride Pricing",        icon: Car,          color: "text-teal-600",    bg: "bg-teal-50",     activeBg: "bg-teal-600",     activeBorder: "border-teal-600",    description: "Base fare and per-km rates for bike and car rides" },
  finance:      { label: "Finance",            icon: BarChart3,    color: "text-purple-600",  bg: "bg-purple-50",   activeBg: "bg-purple-600",   activeBorder: "border-purple-600",  description: "Platform-wide commission percentage" },
  orders:       { label: "Order Rules",        icon: ShoppingCart, color: "text-amber-600",   bg: "bg-amber-50",    activeBg: "bg-amber-600",    activeBorder: "border-amber-600",   description: "Minimum order amounts and COD limits" },
  general:      { label: "General",            icon: Globe,        color: "text-gray-600",    bg: "bg-gray-50",     activeBg: "bg-gray-700",     activeBorder: "border-gray-700",    description: "App name, support contact and maintenance mode" },
  content:      { label: "Content",            icon: MessageSquare,color: "text-pink-600",    bg: "bg-pink-50",     activeBg: "bg-pink-600",     activeBorder: "border-pink-600",    description: "Banners, announcements, chat support and content links" },
  security:     { label: "Security & API",     icon: Shield,       color: "text-red-600",     bg: "bg-red-50",      activeBg: "bg-red-600",      activeBorder: "border-red-600",     description: "OTP modes, GPS tracking, rate limits and API credentials" },
  integrations: { label: "Integrations",       icon: Puzzle,       color: "text-indigo-600",  bg: "bg-indigo-50",   activeBg: "bg-indigo-600",   activeBorder: "border-indigo-600",  description: "Push notifications, analytics, email alerts and monitoring" },
  payment:      { label: "Payment Gateways",   icon: CreditCard,   color: "text-emerald-600", bg: "bg-emerald-50",  activeBg: "bg-emerald-600",  activeBorder: "border-emerald-600", description: "JazzCash and EasyPaisa credentials, modes and limits" },
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
  feature_mart: "🛒", feature_food: "🍔", feature_rides: "🚗",
  feature_pharmacy: "💊", feature_parcel: "📦", feature_wallet: "💰",
  feature_referral: "🎁", feature_new_users: "👤",
  integration_push_notif: "🔔", integration_analytics: "📊",
  integration_email: "📧", integration_sentry: "🐛", integration_whatsapp: "💬",
};

// ─── Reusable Components ──────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, icon, isDirty, danger }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; icon?: string; isDirty: boolean; danger?: boolean;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all select-none
        ${checked
          ? danger ? "bg-red-50 border-red-300" : "bg-green-50 border-green-200"
          : "bg-white border-border hover:bg-muted/30"}
        ${isDirty ? "ring-2 ring-amber-300" : ""}
      `}
    >
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-xl">{icon}</span>}
        {danger && !icon && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">{label}</p>
          <p className={`text-xs font-bold ${checked ? (danger ? "text-red-600" : "text-green-600") : "text-muted-foreground"}`}>
            {checked ? (danger ? "⚠ ENABLED" : "● Active") : "○ Disabled"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold hidden sm:flex">CHANGED</Badge>}
        <div className={`w-11 h-6 rounded-full relative transition-colors ${checked ? (danger ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

function CredInput({ label, value, onChange, placeholder, isDirty, isSecret = false, suffix }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; isDirty: boolean; isSecret?: boolean; suffix?: string;
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
          className={`h-9 rounded-lg text-sm font-mono pr-8 ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""} ${!value ? "border-dashed" : ""}`}
        />
        {suffix && !isSecret && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{suffix}</span>
        )}
        {isSecret && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, s, localValues, dirtyKeys, handleChange, getInputType, getInputSuffix, getPlaceholder }: {
  label: string; s: Setting;
  localValues: Record<string, string>; dirtyKeys: Set<string>;
  handleChange: (k: string, v: string) => void;
  getInputType: (k: string) => string;
  getInputSuffix: (k: string) => string;
  getPlaceholder: (k: string) => string;
}) {
  const isDirty = dirtyKeys.has(s.key);
  const suffix = getInputSuffix(s.key);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-foreground">{s.label}</label>
        {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
      </div>
      <div className="relative">
        <Input
          type={getInputType(s.key)}
          value={localValues[s.key] ?? s.value}
          onChange={e => handleChange(s.key, e.target.value)}
          placeholder={getPlaceholder(s.key)}
          className={`h-10 rounded-xl ${suffix ? "pr-16" : ""} ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
          min={0}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{suffix}</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground font-mono">{s.key}</p>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </p>
  );
}

// ─── Gateway Card ─────────────────────────────────────────────────────────────
function GatewayCard({ prefix, name, logo, color, bgColor, borderColor, localValues, dirtyKeys, handleChange, handleToggle }: {
  prefix: "jazzcash" | "easypaisa"; name: string; logo: string;
  color: string; bgColor: string; borderColor: string;
  localValues: Record<string, string>; dirtyKeys: Set<string>;
  handleChange: (k: string, v: string) => void;
  handleToggle: (k: string, v: boolean) => void;
}) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const enabled = (localValues[`${prefix}_enabled`] ?? "off") === "on";
  const mode = localValues[`${prefix}_mode`] ?? "sandbox";

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`/api/payments/test-connection/${prefix}`, {
        headers: { "x-admin-secret": localStorage.getItem("ajkmart_admin_token") || "" },
      });
      const d = await r.json() as any;
      setTestResult({ ok: d.ok, message: d.message });
      toast({ title: d.ok ? `${name} OK ✅` : `${name} not ready`, description: d.message, variant: d.ok ? "default" : "destructive" });
    } catch {
      setTestResult({ ok: false, message: "Connection failed — is API running?" });
    }
    setTesting(false);
  };

  return (
    <div className={`rounded-2xl border-2 ${borderColor} overflow-hidden bg-white`}>
      <div className={`${bgColor} px-5 py-4 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{logo}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold text-base ${color}`}>{name}</h3>
              <Badge variant="outline" className={`text-[10px] font-bold border ${mode === "live" ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}`}>
                {mode === "live" ? "🟢 LIVE" : "🟡 SANDBOX"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {prefix === "jazzcash" ? "Jazz/Mobilink MWALLET HMAC-SHA256" : "Telenor Microfinance REST API"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="h-8 rounded-lg text-xs gap-1.5">
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
            {testing ? "Testing..." : "Test"}
          </Button>
          <div
            onClick={() => handleToggle(`${prefix}_enabled`, !enabled)}
            className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl border transition-all
              ${enabled ? "bg-green-50 border-green-300" : "bg-white/60 border-border"}`}
          >
            <div className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? "bg-green-500" : "bg-gray-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className={`text-xs font-bold hidden sm:block ${enabled ? "text-green-700" : "text-muted-foreground"}`}>
              {enabled ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>

      {testResult && (
        <div className={`px-5 py-2.5 flex items-center gap-2 text-sm border-b ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          {testResult.message}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Mode */}
        <div>
          <SectionLabel>Environment Mode</SectionLabel>
          <div className="flex gap-2">
            {["sandbox", "live"].map(m => (
              <button key={m} onClick={() => handleChange(`${prefix}_mode`, m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  mode === m
                    ? m === "live" ? "bg-green-500 text-white border-green-600 shadow-sm" : "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {m === "live" ? "🟢 Live" : "🟡 Sandbox"}
              </button>
            ))}
          </div>
          {mode === "live" && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <strong>Live mode</strong> — Real transactions. Ensure credentials are correct.
            </div>
          )}
        </div>

        {/* Credentials */}
        <div>
          <SectionLabel icon={KeyRound}>API Credentials</SectionLabel>
          {prefix === "jazzcash" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CredInput label="Merchant ID" value={localValues["jazzcash_merchant_id"] ?? ""} onChange={v => handleChange("jazzcash_merchant_id", v)} placeholder="MC12345" isDirty={dirtyKeys.has("jazzcash_merchant_id")} />
              <CredInput label="Password" value={localValues["jazzcash_password"] ?? ""} onChange={v => handleChange("jazzcash_password", v)} placeholder="••••••••" isDirty={dirtyKeys.has("jazzcash_password")} isSecret />
              <CredInput label="Integrity Salt" value={localValues["jazzcash_salt"] ?? ""} onChange={v => handleChange("jazzcash_salt", v)} placeholder="Your JazzCash salt" isDirty={dirtyKeys.has("jazzcash_salt")} isSecret />
              <CredInput label="Currency" value={localValues["jazzcash_currency"] ?? "PKR"} onChange={v => handleChange("jazzcash_currency", v)} placeholder="PKR" isDirty={dirtyKeys.has("jazzcash_currency")} />
              <div className="sm:col-span-2">
                <CredInput label="Return URL" value={localValues["jazzcash_return_url"] ?? ""} onChange={v => handleChange("jazzcash_return_url", v)} placeholder="https://yourdomain.com/api/payments/callback/jazzcash" isDirty={dirtyKeys.has("jazzcash_return_url")} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CredInput label="Store ID" value={localValues["easypaisa_store_id"] ?? ""} onChange={v => handleChange("easypaisa_store_id", v)} placeholder="12345" isDirty={dirtyKeys.has("easypaisa_store_id")} />
              <CredInput label="Merchant Account" value={localValues["easypaisa_merchant_id"] ?? ""} onChange={v => handleChange("easypaisa_merchant_id", v)} placeholder="03XX-XXXXXXX" isDirty={dirtyKeys.has("easypaisa_merchant_id")} />
              <CredInput label="Hash Key (Secret)" value={localValues["easypaisa_hash_key"] ?? ""} onChange={v => handleChange("easypaisa_hash_key", v)} placeholder="••••••••" isDirty={dirtyKeys.has("easypaisa_hash_key")} isSecret />
              <CredInput label="API Username" value={localValues["easypaisa_username"] ?? ""} onChange={v => handleChange("easypaisa_username", v)} placeholder="easypaisa_api_user" isDirty={dirtyKeys.has("easypaisa_username")} />
              <CredInput label="API Password" value={localValues["easypaisa_password"] ?? ""} onChange={v => handleChange("easypaisa_password", v)} placeholder="••••••••" isDirty={dirtyKeys.has("easypaisa_password")} isSecret />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          <a
            href={prefix === "jazzcash" ? "https://sandbox.jazzcash.com.pk/sandbox/documentation" : "https://easypaystg.easypaisa.com.pk/easypay-service/rest/documentation"}
            target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline"
          >
            {name} Docs
          </a>
          <span className="text-xs text-muted-foreground">— {mode} portal</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section Renderers ────────────────────────────────────────────────────────
function renderSection(
  cat: CatKey,
  catSettings: Setting[],
  localValues: Record<string, string>,
  dirtyKeys: Set<string>,
  handleChange: (k: string, v: string) => void,
  handleToggle: (k: string, v: boolean) => void,
  getInputType: (k: string) => string,
  getInputSuffix: (k: string) => string,
  getPlaceholder: (k: string) => string,
) {
  const toggles = catSettings.filter(s => TOGGLE_KEYS.has(s.key));
  const inputs  = catSettings.filter(s => !TOGGLE_KEYS.has(s.key));

  if (cat === "features" || cat === "integrations") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {catSettings.map(s => (
          <Toggle key={s.key} checked={(localValues[s.key] ?? s.value) === "on"}
            onChange={v => handleToggle(s.key, v)} label={s.label}
            icon={FEATURE_ICONS[s.key]} isDirty={dirtyKeys.has(s.key)} />
        ))}
      </div>
    );
  }

  if (cat === "payment") {
    const generalKeys = ["payment_timeout_mins","payment_auto_cancel","payment_min_online","payment_max_online"];
    const generalSettings = catSettings.filter(s => generalKeys.includes(s.key));
    return (
      <div className="space-y-5">
        {/* Summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: "cash", label: "Cash on Delivery", logo: "💵", always: true },
            { id: "wallet", label: "AJKMart Wallet", logo: "💰", key: "feature_wallet" },
            { id: "jazzcash", label: "JazzCash", logo: "🔴", key: "jazzcash_enabled" },
            { id: "easypaisa", label: "EasyPaisa", logo: "🟢", key: "easypaisa_enabled" },
          ].map(m => {
            const active = (m as any).always || (localValues[m.key!] ?? "off") === "on";
            return (
              <div key={m.id} className={`rounded-xl p-3 text-center border ${active ? "bg-white border-green-200" : "bg-muted/20 border-border opacity-60"}`}>
                <div className="text-2xl mb-1">{m.logo}</div>
                <p className="text-xs font-semibold text-foreground leading-tight">{m.label}</p>
                <p className={`text-[10px] font-bold mt-1 ${active ? "text-green-600" : "text-muted-foreground"}`}>
                  {active ? "● Active" : "○ Off"}
                </p>
              </div>
            );
          })}
        </div>

        {/* Gateway cards */}
        <GatewayCard prefix="jazzcash" name="JazzCash" logo="🔴" color="text-red-700" bgColor="bg-red-50" borderColor="border-red-200"
          localValues={localValues} dirtyKeys={dirtyKeys} handleChange={handleChange} handleToggle={handleToggle} />
        <GatewayCard prefix="easypaisa" name="EasyPaisa" logo="🟢" color="text-green-700" bgColor="bg-green-50" borderColor="border-green-200"
          localValues={localValues} dirtyKeys={dirtyKeys} handleChange={handleChange} handleToggle={handleToggle} />

        {/* Transaction rules */}
        {generalSettings.length > 0 && (
          <div className="border-t border-border/40 pt-4">
            <SectionLabel icon={ShoppingCart}>Transaction Rules</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generalSettings.map(s => (
                TOGGLE_KEYS.has(s.key)
                  ? <Toggle key={s.key} checked={(localValues[s.key] ?? s.value) === "on"} onChange={v => handleToggle(s.key, v)} label={s.label} isDirty={dirtyKeys.has(s.key)} />
                  : <FieldInput key={s.key} label={s.label} s={s} localValues={localValues} dirtyKeys={dirtyKeys} handleChange={handleChange} getInputType={getInputType} getInputSuffix={getInputSuffix} getPlaceholder={getPlaceholder} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (cat === "security") {
    return (
      <div className="space-y-5">
        {toggles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {toggles.map(s => (
              <Toggle key={s.key} checked={(localValues[s.key] ?? s.value) === "on"}
                onChange={v => handleToggle(s.key, v)} label={s.label}
                isDirty={dirtyKeys.has(s.key)} danger={s.key === "security_otp_bypass"} />
            ))}
          </div>
        )}
        {inputs.length > 0 && (
          <div className="border-t border-border/40 pt-4">
            <SectionLabel icon={KeyRound}>API Credentials & Keys</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {inputs.map(s => {
                const isDirty = dirtyKeys.has(s.key);
                return (
                  <div key={s.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-foreground">{s.label}</label>
                      {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
                    </div>
                    <Input type="text" value={localValues[s.key] ?? s.value} onChange={e => handleChange(s.key, e.target.value)}
                      placeholder={getPlaceholder(s.key)}
                      className={`h-10 rounded-xl font-mono text-sm ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                    />
                    {s.key.startsWith("api_") && !(localValues[s.key] ?? s.value) && (
                      <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Not configured</p>
                    )}
                    <p className="text-[11px] text-muted-foreground font-mono">{s.key}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (cat === "content") {
    return (
      <div className="space-y-5">
        {toggles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {toggles.map(s => (
              <Toggle key={s.key} checked={(localValues[s.key] ?? s.value) === "on"}
                onChange={v => handleToggle(s.key, v)} label={s.label} isDirty={dirtyKeys.has(s.key)} />
            ))}
          </div>
        )}
        {inputs.length > 0 && (
          <div className={`${toggles.length > 0 ? "border-t border-border/40 pt-4" : ""}`}>
            <SectionLabel icon={MessageSquare}>Text Content & Links</SectionLabel>
            <div className="grid grid-cols-1 gap-4">
              {inputs.map(s => {
                const isDirty = dirtyKeys.has(s.key);
                const isUrl = s.key.includes("_url");
                return (
                  <div key={s.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isUrl && <Link className="w-3.5 h-3.5 text-muted-foreground" />}
                      <label className="text-sm font-semibold text-foreground">{s.label}</label>
                      {isDirty && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">CHANGED</Badge>}
                    </div>
                    <Input type="text" value={localValues[s.key] ?? s.value} onChange={e => handleChange(s.key, e.target.value)}
                      placeholder={getPlaceholder(s.key)}
                      className={`h-10 rounded-xl ${isDirty ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : ""}`}
                    />
                    <p className="text-[11px] text-muted-foreground font-mono">{s.key}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: mixed toggles + number inputs
  return (
    <div className="space-y-5">
      {toggles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {toggles.map(s => (
            <Toggle key={s.key} checked={(localValues[s.key] ?? s.value) === "on"}
              onChange={v => handleToggle(s.key, v)} label={s.label} isDirty={dirtyKeys.has(s.key)} />
          ))}
        </div>
      )}
      {inputs.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${toggles.length > 0 ? "border-t border-border/40 pt-4" : ""}`}>
          {inputs.map(s => (
            <FieldInput key={s.key} label={s.label} s={s} localValues={localValues} dirtyKeys={dirtyKeys}
              handleChange={handleChange} getInputType={getInputType} getInputSuffix={getInputSuffix} getPlaceholder={getPlaceholder} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<CatKey>("features");

  const loadSettings = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => { const n = new Set(prev); n.add(key); return n; });
  };
  const handleToggle = (key: string, val: boolean) => handleChange(key, val ? "on" : "off");

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Array.from(dirtyKeys).map(key => ({ key, value: localValues[key] ?? "" }));
      await fetcher("/platform-settings", { method: "PUT", body: JSON.stringify({ settings: changed }) });
      setDirtyKeys(new Set());
      toast({ title: "Settings saved ✅", description: `${changed.length} change(s) applied instantly.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
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

  const activeCfg = CATEGORY_CONFIG[activeTab];
  const ActiveIcon = activeCfg.icon;
  const activeSettings = grouped[activeTab] || [];

  // Count dirty per category
  const dirtyCounts: Record<string, number> = {};
  for (const k of dirtyKeys) {
    const s = settings.find(x => x.key === k);
    if (s) dirtyCounts[s.category] = (dirtyCounts[s.category] || 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">App Settings</h1>
            <p className="text-muted-foreground text-sm">
              {dirtyKeys.size > 0
                ? <span className="text-amber-600 font-medium">{dirtyKeys.size} unsaved change{dirtyKeys.size > 1 ? "s" : ""}</span>
                : "All settings saved"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadSettings(); toast({ title: "Settings reloaded" }); }} disabled={loading} className="h-9 rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving || dirtyKeys.size === 0} className="h-9 rounded-xl gap-2 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : `Save${dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ""}`}
          </Button>
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="flex gap-4 items-start">
        {/* LEFT: Category nav */}
        <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden sticky top-4">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">Sections</p>
          </div>
          <nav className="p-2 space-y-0.5">
            {CAT_ORDER.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const Icon = cfg.icon;
              const isActive = activeTab === cat;
              const count = grouped[cat]?.length ?? 0;
              const dirty = dirtyCounts[cat] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? `${activeCfg.activeBg} text-white shadow-sm`
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? "bg-white/20" : cfg.bg
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : cfg.color}`} />
                  </div>
                  <span className={`text-xs font-semibold flex-1 truncate ${isActive ? "text-white" : "text-foreground"}`}>
                    {cfg.label}
                  </span>
                  {dirty > 0 ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"}`}>
                      {dirty}
                    </span>
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${isActive ? "text-white/70" : "text-muted-foreground/40 group-hover:opacity-100"}`} />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground text-center">
              {settings.length} settings · {Object.keys(grouped).length} sections
            </p>
          </div>
        </div>

        {/* RIGHT: Section content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className={`px-6 py-4 border-b border-border/40 flex items-start gap-3`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activeCfg.bg}`}>
                <ActiveIcon className={`w-5 h-5 ${activeCfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-foreground">{activeCfg.label}</h2>
                  <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border">
                    {activeSettings.length} settings
                  </Badge>
                  {dirtyCounts[activeTab] > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                      {dirtyCounts[activeTab]} changed
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{activeCfg.description}</p>
              </div>
            </div>

            {/* Section body */}
            <div className="p-6">
              {activeSettings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No settings in this section</p>
                </div>
              ) : renderSection(
                activeTab, activeSettings, localValues, dirtyKeys,
                handleChange, handleToggle, getInputType, getInputSuffix, getPlaceholder
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="mt-4 bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-bold text-blue-800">How it works</p>
              <p>Changes are applied <strong>instantly</strong> across the app after saving. Payment gateways: save credentials then click "Test" to verify. Sandbox mode works without real credentials.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
