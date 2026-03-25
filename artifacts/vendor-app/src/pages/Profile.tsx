import { useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useQuery } from "@tanstack/react-query";

function fc(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fd(d: string | Date) { return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }); }

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(user?.name || "");
  const [email, setEmail]       = useState(user?.email || "");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const { data: statsData } = useQuery({ queryKey: ["vendor-stats"], queryFn: () => api.getStats() });

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name, email });
      await refreshUser();
      setEditing(false);
      showToast("✅ Profile updated!");
    } catch(e: any) { showToast("❌ " + e.message); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="flex items-center justify-between mb-1 relative">
          <h1 className="text-2xl font-bold text-white">My Account</h1>
          <button onClick={logout} className="text-orange-100 text-sm bg-white/20 px-3 py-1.5 rounded-xl font-semibold">Logout</button>
        </div>
        <p className="text-orange-100 text-sm relative">Vendor account settings</p>
      </div>

      <div className="px-4 -mt-14 pb-6 space-y-4">
        {/* Vendor Card */}
        <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0 shadow-lg">
            {(user?.storeName || user?.name || "V")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{user?.storeName || "My Store"}</h2>
            <p className="text-gray-500 text-sm">{user?.name || user?.phone}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {user?.storeCategory && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold capitalize">{user.storeCategory}</span>}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Verified Vendor</span>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{user?.stats?.totalOrders || statsData?.month?.orders || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-amber-500">{fc(user?.stats?.totalRevenue || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Earned (85%)</p>
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-100">Wallet Balance</p>
              <p className="text-3xl font-bold mt-0.5">{fc(user?.walletBalance || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-orange-100">Commission Rate</p>
              <p className="text-3xl font-bold">85%</p>
            </div>
          </div>
          <p className="text-xs text-orange-100 mt-3 border-t border-white/20 pt-2">Earnings credited after each delivery · 15% platform fee</p>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Personal Information</h3>
            <button onClick={() => { setEditing(!editing); setName(user?.name||""); setEmail(user?.email||""); }} className="text-orange-500 text-sm font-semibold">
              {editing ? "Cancel" : "✏️ Edit"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Your name"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="email@example.com"/>
                </div>
                <button onClick={saveProfile} disabled={saving} className="w-full h-11 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-60">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              [
                { label: "Name", value: user?.name },
                { label: "Phone", value: user?.phone },
                { label: "Email", value: user?.email },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold">{value || "—"}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-800">🔒 Security & Session</h3></div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Last Login</span>
              <span className="text-sm font-semibold">{user?.lastLoginAt ? fd(user.lastLoginAt) : "Just now"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Member Since</span>
              <span className="text-sm font-semibold">{user?.createdAt ? fd(user.createdAt) : "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Account Status</span>
              <span className="text-sm font-bold text-green-600">✓ Active & Verified</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-medium">
              🔐 Your session is secured. Use logout if you're on a shared device. Contact admin to report any suspicious activity.
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-800">Account Actions</h3></div>
          <div className="p-4 space-y-2">
            <button onClick={logout} className="w-full h-12 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              🚪 Logout from This Device
            </button>
            <p className="text-center text-xs text-gray-400">To report issues or request account changes, contact admin</p>
          </div>
        </div>
      </div>

      {toast && <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">{toast}</div>}
    </div>
  );
}
