import { useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

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
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-20">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <button onClick={logout} className="text-green-200 text-sm bg-white/20 px-3 py-1.5 rounded-lg">Logout</button>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4 pb-6">
        {/* Avatar Card */}
        <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {(user?.name || user?.phone || "R")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{user?.name || "Rider"}</h2>
            <p className="text-gray-500 text-sm">{user?.phone}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${user?.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {user?.isOnline ? "🟢 Online" : "⚫ Offline"}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">🏍️ Rider</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{user?.stats?.totalDeliveries || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Deliveries</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(user?.stats?.totalEarnings || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Earned</p>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Personal Info</h3>
            <button onClick={() => { setEditing(!editing); setName(user?.name || ""); setEmail(user?.email || ""); }} className="text-green-600 text-sm font-semibold">
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="email@example.com" />
                </div>
                <button onClick={saveProfile} disabled={saving} className="w-full h-11 bg-green-600 text-white font-bold rounded-xl disabled:opacity-60">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Name</span>
                  <span className="text-sm font-semibold">{user?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm font-semibold">{user?.phone}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-semibold">{user?.email || "—"}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 text-white">
          <p className="text-sm text-green-100">Wallet Balance</p>
          <p className="text-3xl font-bold">{formatCurrency(user?.walletBalance || 0)}</p>
          <p className="text-xs text-green-200 mt-1">Earnings credited automatically after each delivery</p>
        </div>

        {/* Logout */}
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
