import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api, apiFetch } from "../lib/api";
import { usePlatformConfig } from "../lib/useConfig";

const TRADITIONAL_BANKS = ["HBL","MCB","UBL","Meezan Bank","Bank Alfalah","NBP","Allied Bank","Bank Al Habib","Faysal Bank","Askari Bank","Other"];
const fc = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
const fd = (d: string | Date) => new Date(d).toLocaleString("en-PK", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

type TxFilter = "all" | "credit" | "debit" | "bonus" | "loyalty";

function txIcon(type: string) {
  if (type === "credit")   return { emoji: "💰", label: "Delivery",   bg: "bg-green-50",  text: "text-green-600",  badge: "bg-green-100 text-green-700"  };
  if (type === "bonus")    return { emoji: "🎁", label: "Bonus",      bg: "bg-blue-50",   text: "text-blue-600",   badge: "bg-blue-100 text-blue-700"    };
  if (type === "loyalty")  return { emoji: "⭐", label: "Loyalty",    bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" };
  if (type === "cashback") return { emoji: "💝", label: "Cashback",   bg: "bg-pink-50",   text: "text-pink-600",   badge: "bg-pink-100 text-pink-700"    };
  return                          { emoji: "💸", label: "Withdrawal", bg: "bg-red-50",    text: "text-red-500",    badge: "bg-red-100 text-red-600"      };
}

type PayMethod = { id: string; label: string; logo: string; type?: string; description?: string };

function WithdrawModal({ balance, minPayout, maxPayout, onClose, onSuccess }: {
  balance: number; minPayout: number; maxPayout: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount]        = useState("");
  const [selectedMethod, setMethod] = useState<PayMethod | null>(null);
  const [acNo, setAcNo]            = useState("");
  const [acName, setAcName]        = useState("");
  const [bankName, setBankName]    = useState("");
  const [note, setNote]            = useState("");
  const [step, setStep]            = useState<"amount"|"method"|"details"|"confirm"|"done">("amount");
  const [err, setErr]              = useState("");
  const [methods, setMethods]      = useState<PayMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const { user } = useAuth();

  const INPUT  = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-green-400 focus:bg-white transition-colors";
  const SELECT = "w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-green-400 appearance-none";

  useEffect(() => {
    apiFetch("/payments/methods").then((data: any) => {
      const enabled: PayMethod[] = [];
      const ms: any[] = data.methods || [];
      if (ms.find((m: any) => m.id === "jazzcash"))  enabled.push({ id: "jazzcash",  label: "JazzCash",       logo: "🔴", description: "JazzCash mobile wallet mein transfer" });
      if (ms.find((m: any) => m.id === "easypaisa")) enabled.push({ id: "easypaisa", label: "EasyPaisa",      logo: "🟢", description: "EasyPaisa account mein transfer" });
      if (ms.find((m: any) => m.id === "bank"))      enabled.push({ id: "bank",      label: "Bank Transfer",  logo: "🏦", description: "IBFT ya RAAST ke zariye bank mein" });
      if (enabled.length === 0) {
        enabled.push({ id: "bank", label: "Bank Transfer", logo: "🏦", description: "IBFT ya RAAST ke zariye bank mein" });
      }
      setMethods(enabled);
    }).catch(() => {
      setMethods([{ id: "bank", label: "Bank Transfer", logo: "🏦", description: "Bank account mein transfer" }]);
    }).finally(() => setLoadingMethods(false));
  }, []);

  const mut = useMutation({
    mutationFn: () => {
      const m = selectedMethod!;
      const displayBank = m.id === "bank" ? bankName : m.label;
      return api.withdrawWallet({
        amount: Number(amount), bankName: displayBank,
        accountNumber: acNo, accountTitle: acName,
        paymentMethod: m.id, note,
      });
    },
    onSuccess: () => setStep("done"),
    onError: (e: any) => setErr(e.message),
  });

  const goToMethod = () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setErr("Valid amount likhein"); return; }
    if (amt < minPayout) { setErr(`Minimum: ${fc(minPayout)}`); return; }
    if (amt > maxPayout) { setErr(`Maximum: ${fc(maxPayout)}`); return; }
    if (amt > balance)   { setErr(`Available: ${fc(balance)}`); return; }
    setErr(""); setStep("method");
  };

  const goToDetails = (m: PayMethod) => { setMethod(m); setAcNo(""); setAcName(""); setBankName(""); setErr(""); setStep("details"); };

  const goToConfirm = () => {
    if (!acNo.trim())   { setErr("Account / phone number required"); return; }
    if (!acName.trim()) { setErr("Account holder name required"); return; }
    if (selectedMethod?.id === "bank" && !bankName) { setErr("Bank name select karein"); return; }
    setErr(""); setStep("confirm");
  };

  const displayAccount = selectedMethod?.id === "bank" ? `${bankName} — ${acNo}` : `${selectedMethod?.label} — ${acNo}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* ── DONE ── */}
        {step === "done" && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-5xl">✅</div>
            <h3 className="text-2xl font-extrabold text-gray-800">Request Submitted!</h3>
            <p className="text-gray-500 mt-2"><span className="font-extrabold text-green-600">{fc(Number(amount))}</span> withdrawal queued.</p>
            <p className="text-sm text-gray-400 mt-1">Admin 24–48 hours mein process karega.</p>
            <div className="mt-4 bg-green-50 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-bold">{selectedMethod?.logo} {selectedMethod?.label}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Account</span><span className="font-bold">{acNo}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Name</span><span className="font-bold">{acName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-extrabold text-green-600">{fc(Number(amount))}</span></div>
            </div>
            <button onClick={() => { onSuccess(); onClose(); }} className="mt-6 w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl text-lg">Done ✓</button>
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && (
          <div className="p-6">
            <h3 className="text-xl font-extrabold text-gray-800 mb-5">Confirm Withdrawal</h3>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 space-y-3 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Amount</span>
                <span className="font-extrabold text-green-600 text-2xl">{fc(Number(amount))}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-bold">{selectedMethod?.logo} {selectedMethod?.label}</span></div>
              {selectedMethod?.id === "bank" && <div className="flex justify-between text-sm"><span className="text-gray-500">Bank</span><span className="font-bold">{bankName}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-gray-500">{selectedMethod?.id === "bank" ? "Account No." : "Phone"}</span><span className="font-bold">{acNo}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Account Name</span><span className="font-bold">{acName}</span></div>
              {note && <div className="flex justify-between text-sm"><span className="text-gray-500">Note</span><span className="font-bold">{note}</span></div>}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 font-semibold">⚠️ Sabhi details verify karein. Galat info se delay ho sakta hai.</p>
            </div>
            {err && <p className="text-red-500 text-sm font-semibold mb-3 bg-red-50 px-3 py-2 rounded-xl">⚠️ {err}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep("details"); setErr(""); }} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl py-3">← Edit</button>
              <button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-1 bg-green-600 text-white font-bold rounded-2xl py-3 disabled:opacity-60">
                {mut.isPending ? "Processing..." : "✓ Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {step === "details" && selectedMethod && (
          <div className="p-6">
            <button onClick={() => setStep("method")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 font-semibold">← Back</button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">{selectedMethod.logo}</div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-800">{selectedMethod.label}</h3>
                <p className="text-xs text-gray-500">{selectedMethod.description}</p>
              </div>
            </div>

            {/* Auto-fill from profile */}
            {(user as any)?.bankName && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-700">Saved Account</p>
                  <p className="text-xs text-blue-600 mt-0.5">{(user as any).bankName} · {(user as any).bankAccount}</p>
                </div>
                <button onClick={() => {
                  setBankName((user as any).bankName || "");
                  setAcNo((user as any).bankAccount || "");
                  setAcName((user as any).bankAccountTitle || "");
                  setErr("");
                }} className="text-xs font-extrabold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg">Use →</button>
              </div>
            )}

            <div className="space-y-3">
              {selectedMethod.id === "bank" && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bank Name *</p>
                  <select value={bankName} onChange={e => { setBankName(e.target.value); setErr(""); }} className={SELECT}>
                    <option value="">Bank select karein</option>
                    {TRADITIONAL_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {selectedMethod.id === "bank" ? "Account No. / IBAN *" : "Phone Number *"}
                </p>
                <input value={acNo} onChange={e => { setAcNo(e.target.value); setErr(""); }}
                  inputMode="numeric"
                  placeholder={selectedMethod.id === "bank" ? "PK36SCBL0000001234567801" : "03XX-XXXXXXX"}
                  className={INPUT}/>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Account Holder Name *</p>
                <input value={acName} onChange={e => { setAcName(e.target.value); setErr(""); }}
                  placeholder="Full name as on account" className={INPUT}/>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Note (Optional)</p>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any note for admin" className={INPUT}/>
              </div>
              {err && <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
              <button onClick={goToConfirm} className="w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl text-base">Review Withdrawal →</button>
            </div>
          </div>
        )}

        {/* ── METHOD SELECTION ── */}
        {step === "method" && (
          <div className="p-6">
            <button onClick={() => setStep("amount")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 font-semibold">← Back</button>
            <h3 className="text-xl font-extrabold text-gray-800 mb-1">Payment Method</h3>
            <p className="text-sm text-gray-500 mb-5">Paise kahan receive karna chahte hain?</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-green-700">Withdrawal Amount</span>
              <span className="text-xl font-extrabold text-green-600">{fc(Number(amount))}</span>
            </div>
            {loadingMethods ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
            ) : (
              <div className="space-y-3">
                {methods.map(m => (
                  <button key={m.id} onClick={() => goToDetails(m)}
                    className="w-full text-left bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-green-400 hover:bg-green-50 transition-all active:scale-[0.98]">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">{m.logo}</div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-800 text-base">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    </div>
                    <span className="ml-auto text-gray-400 text-lg flex-shrink-0">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AMOUNT ── */}
        {step === "amount" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-extrabold text-gray-800">💸 Withdraw Funds</h3>
              <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-xl font-bold text-gray-500">✕</button>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 text-white mb-5">
              <p className="text-sm text-green-200">Available Balance</p>
              <p className="text-4xl font-extrabold mt-0.5">{fc(balance)}</p>
              <p className="text-xs text-green-300 mt-2">Min: {fc(minPayout)} · Max: {fc(maxPayout)}</p>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Select</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[500, 1000, 2000, 5000].filter(v => v <= balance && v >= minPayout).map(v => (
                <button key={v} onClick={() => { setAmount(String(v)); setErr(""); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${amount === String(v) ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {fc(v)}
                </button>
              ))}
              {balance >= minPayout && (
                <button onClick={() => { setAmount(String(Math.floor(balance))); setErr(""); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${amount === String(Math.floor(balance)) ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-600 border-green-200"}`}>
                  MAX
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (Rs.) *</p>
                <input type="number" inputMode="numeric" value={amount}
                  onChange={e => { setAmount(e.target.value); setErr(""); }}
                  placeholder="0" className={INPUT}/>
              </div>
              {err && <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
              <button onClick={goToMethod} className="w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl text-base">
                Next: Select Method →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const FILTER_TABS: { key: TxFilter; label: string; emoji: string }[] = [
  { key: "all",     label: "All",         emoji: "📋" },
  { key: "credit",  label: "Earnings",    emoji: "💰" },
  { key: "debit",   label: "Withdrawals", emoji: "💸" },
  { key: "bonus",   label: "Bonuses",     emoji: "🎁" },
];

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const { config } = usePlatformConfig();
  const riderKeepPct      = config.rider?.keepPct    ?? config.finance.riderEarningPct;
  const minPayout         = config.rider?.minPayout  ?? config.finance.minRiderPayout;
  const maxPayout         = config.rider?.maxPayout  ?? 50000;
  const withdrawalEnabled = config.rider?.withdrawalEnabled !== false;
  const qc = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<TxFilter>("all");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rider-wallet"],
    queryFn: () => api.getWallet(),
    refetchInterval: 30000,
    enabled: config.features.wallet,
  });

  const transactions: any[] = data?.transactions || [];
  const balance = data?.balance ?? (user?.walletBalance ? Number(user.walletBalance) : 0);

  const today    = new Date(); today.setHours(0,0,0,0);
  const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const todayEarned   = transactions.filter(t => t.type === "credit" && new Date(t.createdAt) >= today).reduce((s, t) => s + Number(t.amount), 0);
  const weekEarned    = transactions.filter(t => t.type === "credit" && new Date(t.createdAt) >= weekAgo).reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawn = transactions.filter(t => t.type === "debit" && !t.reference?.startsWith("refund:")).reduce((s, t) => s + Number(t.amount), 0);
  const pendingWithdrawal = transactions.filter(t => t.type === "debit" && (t.reference === "pending" || !t.reference)).reduce((s, t) => s + Number(t.amount), 0);

  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);

  if (!config.features.wallet) {
    return (
      <div className="bg-gray-50 pb-24">
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-6">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <div className="bg-white rounded-3xl p-10 shadow-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Wallet Disabled</h3>
            <p className="text-sm text-gray-500">Admin ne wallet feature abhi band ki hai.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-20">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <button onClick={() => refetch()} className="h-9 px-4 bg-white/20 text-white text-sm font-bold rounded-xl">↻</button>
        </div>
        <p className="text-green-200 text-sm">Earnings & withdrawals</p>
      </div>

      <div className="px-4 -mt-14 space-y-4">
        {/* Balance Card */}
        <div className="bg-white rounded-3xl shadow-lg p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-green-50 rounded-full"/>
          <div className="relative">
            <p className="text-sm text-gray-500 font-medium">Available Balance</p>
            <p className="text-5xl font-extrabold text-green-600 mt-1">{fc(balance)}</p>
            <p className="text-xs text-gray-400 mt-1.5">{riderKeepPct}% of every delivery credited instantly</p>
            <div className="flex gap-2 mt-4">
              {withdrawalEnabled ? (
                <button onClick={() => setShowWithdraw(true)}
                  className="flex-1 h-13 bg-green-600 text-white font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 text-base">
                  💸 Withdraw
                </button>
              ) : (
                <button disabled
                  className="flex-1 h-13 bg-gray-200 text-gray-400 font-bold rounded-2xl py-3 cursor-not-allowed">
                  🔒 Withdrawals Paused
                </button>
              )}
              <button onClick={() => refetch()}
                className="h-13 px-4 bg-gray-100 text-gray-600 font-bold rounded-2xl py-3">
                ↻
              </button>
            </div>
          </div>
        </div>

        {/* Pending Withdrawal Alert */}
        {pendingWithdrawal > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse flex-shrink-0"/>
            <div>
              <p className="text-sm font-extrabold text-amber-800">Withdrawal Pending</p>
              <p className="text-xs text-amber-600">{fc(pendingWithdrawal)} today submitted — admin processing...</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Earned Today",   value: fc(todayEarned),    icon: "☀️", bg: "bg-amber-50",  text: "text-amber-700"  },
            { label: "Earned This Week", value: fc(weekEarned),   icon: "📅", bg: "bg-blue-50",   text: "text-blue-700"   },
            { label: "Total Withdrawn", value: fc(totalWithdrawn), icon: "💸", bg: "bg-red-50",    text: "text-red-600"    },
            { label: "Current Balance", value: fc(balance),        icon: "💳", bg: "bg-green-50",  text: "text-green-700"  },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3.5`}>
              <p className="text-xl">{s.icon}</p>
              <p className={`text-lg font-extrabold ${s.text} mt-1 leading-tight`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings Rate Info */}
        {!withdrawalEnabled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
            <span className="text-2xl flex-shrink-0">🚫</span>
            <div>
              <p className="text-sm font-bold text-red-800">Withdrawals Paused</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">Admin ne temporarily band ki hain. Earnings safe hain.</p>
            </div>
          </div>
        )}

        {/* Transaction History with Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">Transaction History</p>
              <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === tab.key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-bold text-gray-600">No {filter === "all" ? "" : filter} transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Earnings will appear here after deliveries</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((t: any) => {
                const info = txIcon(t.type);
                const isCredit = t.type === "credit" || t.type === "bonus" || t.type === "loyalty" || t.type === "cashback";
                const isWithdrawal = t.type === "debit" && t.description?.startsWith("Withdrawal");
                const wStatus = !isWithdrawal ? null : t.reference === "pending" ? "pending" : t.reference?.startsWith("paid:") ? "paid" : t.reference?.startsWith("rejected:") ? "rejected" : null;
                const wStatusBadge = wStatus === "pending" ? "bg-amber-100 text-amber-700" : wStatus === "paid" ? "bg-green-100 text-green-700" : wStatus === "rejected" ? "bg-red-100 text-red-600" : null;
                const wStatusLabel = wStatus === "pending" ? "⏳ Pending" : wStatus === "paid" ? `✅ Paid · ${t.reference?.slice(5) || ""}` : wStatus === "rejected" ? "❌ Rejected · Refunded" : null;
                return (
                  <div key={t.id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl ${info.bg}`}>
                      {info.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-gray-400">{fd(t.createdAt)}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${info.badge}`}>{info.label}</span>
                        {wStatusBadge && wStatusLabel && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wStatusBadge}`}>{wStatusLabel}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-base font-extrabold ${isCredit ? "text-green-600" : wStatus === "rejected" ? "text-gray-400 line-through" : "text-red-500"}`}>
                        {isCredit ? "+" : "−"}{fc(Number(t.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Policy */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-green-700">💡 Payout Policy</p>
          {[
            `${riderKeepPct}% earnings — ${100 - riderKeepPct}% platform fee`,
            `Minimum withdrawal: ${fc(minPayout)} — Maximum: ${fc(maxPayout)}`,
            "Processed within 24–48 hours by admin",
            "EasyPaisa, JazzCash, ya bank account par transfer",
          ].map((p, i) => <p key={i} className="text-xs text-green-600">✓ {p}</p>)}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400">🔐 All transactions are encrypted & audited by {config.platform.appName} Admin</p>
        </div>
      </div>

      {showWithdraw && withdrawalEnabled && (
        <WithdrawModal
          balance={balance} minPayout={minPayout} maxPayout={maxPayout}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["rider-wallet"] });
            refreshUser();
            showToast("✅ Withdrawal request submitted!");
          }}
        />
      )}

      {toast && (
        <div className="fixed top-6 left-4 right-4 z-50">
          <div className="bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl text-center">{toast}</div>
        </div>
      )}
    </div>
  );
}
