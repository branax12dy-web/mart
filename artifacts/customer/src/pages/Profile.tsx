import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User, Shield, Settings, ChevronLeft, Camera, Star,
  Award, Lock, Eye, EyeOff, Globe, Bell, BellOff,
  CheckCircle, Clock, XCircle, AlertCircle, Save,
  Phone, Mail, CreditCard, MapPin, Edit2, LogOut,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/utils";

/* ── Types ── */
type Tab = "personal" | "security" | "settings";

const LEVEL_CONFIG = {
  bronze: { label: "Bronze",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", bar: "bg-amber-400",  icon: "🥉", next: "Silver",  tip: "Naam, email aur address add karein" },
  silver: { label: "Silver",  color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200", bar: "bg-slate-400",  icon: "🥈", next: "Gold",    tip: "CNIC aur city bhi complete karein" },
  gold:   { label: "Gold",    color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", bar: "bg-yellow-400", icon: "🥇", next: null,      tip: "Mubarak ho! Aap Gold level par hain" },
};

const KYC_CONFIG = {
  none:     { label: "Not Submitted", color: "text-gray-500",  bg: "bg-gray-100",  Icon: AlertCircle },
  pending:  { label: "Under Review",  color: "text-amber-600", bg: "bg-amber-100", Icon: Clock },
  verified: { label: "Verified",      color: "text-green-600", bg: "bg-green-100", Icon: CheckCircle },
  rejected: { label: "Rejected",      color: "text-red-600",   bg: "bg-red-100",   Icon: XCircle },
};

const LANGUAGES = [
  { code: "en",       label: "English" },
  { code: "ur",       label: "اردو (Urdu)" },
  { code: "roman",    label: "Roman Urdu" },
  { code: "en_roman", label: "English + Roman" },
  { code: "en_ur",    label: "English + Urdu" },
];

/* ── Small helpers ── */
function Field({ label, value, icon: Icon }: { label: string; value?: string | null; icon: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium truncate">{value || <span className="text-gray-300 font-normal">—</span>}</p>
      </div>
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 max-w-xs",
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {msg}
    </div>
  );
}

/* ── Section: Personal Info ── */
function PersonalSection({ onToast }: { onToast: (msg: string, t: "success" | "error") => void }) {
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", cnic: "", city: "", address: "" });
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      cnic: user.cnic ?? "",
      city: user.city ?? "",
      address: user.address ?? "",
    });
  }, [user]);

  const saveMut = useMutation({
    mutationFn: () => api.updateProfile({
      name: form.name.trim() || undefined,
      email: form.email.trim() || undefined,
      cnic: form.cnic.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
    }),
    onSuccess: (d) => {
      setUser({ ...user!, ...d });
      qc.invalidateQueries({ queryKey: ["cust-profile"] });
      setEditing(false);
      onToast("Profile update ho gayi!", "success");
    },
    onError: (e: Error) => onToast(e.message, "error"),
  });

  const avatarMut = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: (d) => {
      setUser({ ...user!, avatar: d.avatarUrl });
      onToast("Avatar update ho gaya!", "success");
    },
    onError: (e: Error) => onToast(e.message, "error"),
  });

  const level = LEVEL_CONFIG[user?.accountLevel ?? "bronze"];
  const levelPct = user?.accountLevel === "gold" ? 100 : user?.accountLevel === "silver" ? 60 : 20;
  const kyc = KYC_CONFIG[user?.kycStatus ?? "none"];
  const KycIcon = kyc.Icon;

  return (
    <div className="space-y-5">
      {/* Avatar + Level card */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur overflow-hidden ring-2 ring-white/40">
              {user?.avatar
                ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {(user?.name ?? user?.phone ?? "?")[0].toUpperCase()}
                  </div>
              }
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarMut.isPending}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition"
            >
              {avatarMut.isPending
                ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                : <Camera size={13} className="text-green-600" />
              }
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) avatarMut.mutate(f); e.target.value = ""; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight truncate">{user?.name ?? "Guest"}</p>
            <p className="text-white/70 text-sm truncate">{user?.phone}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg">{level.icon}</span>
              <span className="text-sm font-semibold">{level.label} Member</span>
            </div>
          </div>
        </div>

        {/* Level progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span>Account Level</span>
            <span>{levelPct}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", level.bar)} style={{ width: `${levelPct}%` }} />
          </div>
          {level.next && <p className="text-xs text-white/60 mt-1.5">{level.tip}</p>}
        </div>
      </div>

      {/* KYC Status */}
      <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border text-sm", kyc.bg, "border-transparent")}>
        <KycIcon size={18} className={kyc.color} />
        <div>
          <p className={cn("font-semibold", kyc.color)}>KYC Status: {kyc.label}</p>
          {user?.kycStatus === "none" && <p className="text-gray-500 text-xs mt-0.5">Profile complete karein KYC ke liye apply hoga</p>}
          {user?.kycStatus === "rejected" && <p className="text-red-500 text-xs mt-0.5">Documents resubmit karein, please contact support</p>}
        </div>
      </div>

      {/* Info form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <p className="font-semibold text-gray-800 text-sm">Personal Information</p>
          <button
            onClick={() => editing ? saveMut.mutate() : setEditing(true)}
            disabled={saveMut.isPending}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition",
              editing
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {saveMut.isPending
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : editing ? <><Save size={12} /> Save</> : <><Edit2 size={12} /> Edit</>
            }
          </button>
        </div>

        <div className="px-4 py-2">
          {editing ? (
            <div className="space-y-3 py-2">
              {[
                { key: "name",    label: "Full Name",    placeholder: "Apna naam darj karein",  Icon: User },
                { key: "email",   label: "Email",        placeholder: "email@example.com",       Icon: Mail },
                { key: "cnic",    label: "CNIC",         placeholder: "3740512345678",            Icon: CreditCard },
                { key: "city",    label: "City",         placeholder: "Lahore, Karachi...",       Icon: MapPin },
                { key: "address", label: "Address",      placeholder: "Ghar ka address",         Icon: MapPin },
              ].map(({ key, label, placeholder, Icon }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                    <Icon size={12} /> {label}
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                    value={(form as any)[key]}
                    placeholder={placeholder}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <button
                onClick={() => setEditing(false)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 pt-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <Field label="Phone" value={user?.phone} icon={Phone} />
              <Field label="Full Name" value={user?.name} icon={User} />
              <Field label="Email" value={user?.email} icon={Mail} />
              <Field label="CNIC" value={user?.cnic} icon={CreditCard} />
              <Field label="City" value={user?.city} icon={MapPin} />
              <Field label="Address" value={user?.address} icon={MapPin} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section: Security ── */
function SecuritySection({ onToast }: { onToast: (msg: string, t: "success" | "error") => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const pwMut = useMutation({
    mutationFn: () => {
      if (form.next !== form.confirm) throw new Error("Passwords match nahi kar rahe");
      if (form.next.length < 6) throw new Error("Password kam az kam 6 characters ka hona chahiye");
      return api.setPassword(form.next, user?.totpEnabled || !!form.current ? form.current : undefined);
    },
    onSuccess: () => {
      setForm({ current: "", next: "", confirm: "" });
      onToast("Password update ho gaya!", "success");
    },
    onError: (e: Error) => onToast(e.message, "error"),
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Lock size={15} className="text-green-500" /> Change Password
          </p>
        </div>
        <div className="px-4 py-4 space-y-3">
          {[
            { key: "current", label: "Current Password", show: show.current, toggle: () => setShow(p => ({ ...p, current: !p.current })) },
            { key: "next",    label: "New Password",     show: show.next,    toggle: () => setShow(p => ({ ...p, next: !p.next })) },
            { key: "confirm", label: "Confirm Password", show: show.confirm, toggle: () => setShow(p => ({ ...p, confirm: !p.confirm })) },
          ].map(({ key, label, show: vis, toggle }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
              <div className="relative">
                <input
                  type={vis ? "text" : "password"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                  value={(form as any)[key]}
                  placeholder="••••••••"
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                />
                <button type="button" onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {vis ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => pwMut.mutate()}
            disabled={pwMut.isPending || !form.next}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            {pwMut.isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Lock size={14} /> Update Password</>
            }
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3">
        <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Shield size={15} className="text-green-500" /> Account Info
        </p>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-400">Member Since</span>
            <span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">2FA Status</span>
            <span className={cn("font-medium text-xs px-2 py-0.5 rounded-full", user?.totpEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
              {user?.totpEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Phone</span>
            <span className="font-medium">{user?.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section: Settings ── */
function SettingsSection({ onToast }: { onToast: (msg: string, t: "success" | "error") => void }) {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["cust-settings"],
    queryFn: api.getSettings,
  });

  const saveMut = useMutation({
    mutationFn: (patch: any) => api.updateSettings(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cust-settings"] });
      onToast("Settings save ho gayi!", "success");
    },
    onError: (e: Error) => onToast(e.message, "error"),
  });

  const toggle = (key: string, val: boolean) => saveMut.mutate({ [key]: val });
  const setLang = (lang: string) => saveMut.mutate({ language: lang });

  const NOTIFS = [
    { key: "notifOrders", label: "Order updates",     icon: Bell },
    { key: "notifWallet", label: "Wallet transactions", icon: Bell },
    { key: "notifRides",  label: "Ride updates",       icon: Bell },
    { key: "notifDeals",  label: "Deals & offers",     icon: Bell },
  ];

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Language */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Globe size={15} className="text-green-500" /> Language
          </p>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm font-medium border transition text-left",
                settings?.language === l.code
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-gray-50 text-gray-600 border-gray-100 hover:border-green-300"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Bell size={15} className="text-green-500" /> Notifications
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {NOTIFS.map(({ key, label, icon: Icon }) => {
            const val = settings?.[key] ?? true;
            return (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  {val ? <Icon size={14} className="text-green-500" /> : <BellOff size={14} className="text-gray-400" />}
                  {label}
                </div>
                <button
                  onClick={() => toggle(key, !val)}
                  disabled={saveMut.isPending}
                  className={cn(
                    "w-11 h-6 rounded-full transition-all relative",
                    val ? "bg-green-500" : "bg-gray-200"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                    val ? "left-5" : "left-0.5"
                  )} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Profile Page ── */
export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("personal");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "personal", label: "Profile",  icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900 text-base flex-1">My Profile</h1>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto flex border-t border-gray-50">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2",
                tab === id
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5">
        {tab === "personal" && <PersonalSection onToast={showToast} />}
        {tab === "security" && <SecuritySection onToast={showToast} />}
        {tab === "settings" && <SettingsSection onToast={showToast} />}
      </div>
    </div>
  );
}
