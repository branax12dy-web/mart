import { useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

const CATEGORIES = ["restaurant", "grocery", "pharmacy", "bakery", "mart", "electronics", "clothing", "other"];

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(user?.name || "");
  const [email, setEmail]     = useState(user?.email || "");
  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [storeCategory, setStoreCategory] = useState(user?.storeCategory || "");
  const [saving, setSaving]   = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name, email, storeName, storeCategory });
      await refreshUser();
      setEditing(false);
      showToast("✅ Profile updated!");
    } catch(e: any) { showToast("❌ " + e.message); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <button onClick={logout} className="text-orange-100 text-sm bg-white/20 px-3 py-1.5 rounded-lg">Logout</button>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4 pb-6">
        {/* Store Card */}
        <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {(user?.storeName || user?.name || "V")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{user?.storeName || "My Store"}</h2>
            <p className="text-gray-500 text-sm">{user?.name || user?.phone}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user?.storeCategory && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold capitalize">{user.storeCategory}</span>
              )}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Vendor</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{user?.stats?.totalOrders || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(user?.stats?.totalRevenue || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Revenue</p>
          </div>
        </div>

        {/* Profile Edit */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Store & Personal Info</h3>
            <button onClick={() => { setEditing(!editing); setName(user?.name||""); setEmail(user?.email||""); setStoreName(user?.storeName||""); setStoreCategory(user?.storeCategory||""); }} className="text-orange-500 text-sm font-semibold">
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {editing ? (
              <>
                {[
                  { label: "Store Name", value: storeName, onChange: setStoreName, placeholder: "My Store" },
                  { label: "Your Name", value: name, onChange: setName, placeholder: "Full name" },
                  { label: "Email", value: email, onChange: setEmail, placeholder: "email@example.com" },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Store Category</label>
                  <select value={storeCategory} onChange={e => setStoreCategory(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <button onClick={saveProfile} disabled={saving} className="w-full h-11 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-60">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                {[
                  { label: "Store Name", value: user?.storeName },
                  { label: "Name", value: user?.name },
                  { label: "Phone", value: user?.phone },
                  { label: "Email", value: user?.email },
                  { label: "Category", value: user?.storeCategory },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold capitalize">{value || "—"}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <p className="text-sm text-orange-100">Wallet Balance</p>
          <p className="text-3xl font-bold">{formatCurrency(user?.walletBalance || 0)}</p>
          <p className="text-xs text-orange-100 mt-1">85% of order revenue. Credited after delivery.</p>
        </div>

        <button onClick={logout} className="w-full h-12 border-2 border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-colors">
          Logout
        </button>
      </div>

      {toastMsg && (
        <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
