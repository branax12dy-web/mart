import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api, apiFetch } from "../lib/api";
import { usePlatformConfig } from "../lib/useConfig";

const TRADITIONAL_BANKS = ["HBL","MCB","UBL","Meezan Bank","Bank Alfalah","NBP","Allied Bank","Bank Al Habib","Faysal Bank","Askari Bank","Other"];
const fc  = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
const fd  = (d: string | Date) => new Date(d).toLocaleString("en-PK", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
const fdr = (d: string | Date) => {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return "Abhi abhi";
  if (h < 24) return `${h} ghante pehle`;
  return `${Math.floor(h / 24)} din pehle`;
};

type TxFilter = "all" | "credit" | "debit" | "bonus";

function txIcon(type: string) {
  if (type === "credit")   return { emoji: "💰", label: "Delivery",   bg: "bg-green-50",  badge: "bg-green-100 text-green-700"  };
  if (type === "bonus")    return { emoji: "🎁", label: "Bonus",      bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700"    };
  if (type === "loyalty")  return { emoji: "⭐", label: "Loyalty",    bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" };
  if (type === "cashback") return { emoji: "💝", label: "Cashback",   bg: "bg-pink-50",   badge: "bg-pink-100 text-pink-700"    };
  return                          { emoji: "💸", label: "Withdrawal", bg: "bg-red-50",    badge: "bg-red-100 text-red-600"      };
}

function methodIcon(method: string | null) {
  if (!method) return "🏦";
  const m = method.toLowerCase();
  if (m.includes("jazzcash"))  return "🔴";
  if (m.includes("easypaisa")) return "🟢";
  return "🏦";
}

type PayMethod = { id: string; label: string; logo: string; description?: string };

/* ══════════════════════════════════════════
   WITHDRAW MODAL — 4-step flow
══════════════════════════════════════════ */
function WithdrawModal({ balance, minPayout, maxPayout, onClose, onSuccess }: {
  balance: number; minPayout: number; maxPayout: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount]          = useState("");
  const [selectedMethod, setMethod]  = useState<PayMethod | null>(null);
  const [acNo, setAcNo]              = useState("");
  const [acName, setAcName]          = useState("");
  const [bankName, setBankName]      = useState("");
  const [note, setNote]              = useState("");
  const [step, setStep]              = useState<"amount"|"method"|"details"|"confirm"|"done">("amount");
  const [err, setErr]                = useState("");
  const [methods, setMethods]        = useState<PayMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const { user } = useAuth();

  const INPUT  = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-colors";
  const SELECT = "w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 appearance-none";

  useEffect(() => {
    apiFetch("/payments/methods").then((data: any) => {
      const enabled: PayMethod[] = [];
      const ms: any[] = data.methods || [];
      if (ms.find((m: any) => m.id === "jazzcash"))  enabled.push({ id: "jazzcash",  label: "JazzCash",      logo: "🔴", description: "JazzCash mobile wallet mein transfer" });
      if (ms.find((m: any) => m.id === "easypaisa")) enabled.push({ id: "easypaisa", label: "EasyPaisa",     logo: "🟢", description: "EasyPaisa account mein transfer" });
      if (ms.find((m: any) => m.id === "bank"))      enabled.push({ id: "bank",      label: "Bank Transfer", logo: "🏦", description: "IBFT ya RAAST ke zariye bank account mein" });
      if (enabled.length === 0) enabled.push({ id: "bank", label: "Bank Transfer", logo: "🏦", description: "IBFT ya RAAST ke zariye bank account mein" });
      setMethods(enabled);
    }).catch(() => {
      setMethods([{ id: "bank", label: "Bank Transfer", logo: "🏦", description: "Bank account mein transfer" }]);
    }).finally(() => setLoadingMethods(false));
  }, []);

  const mut = useMutation({
    mutationFn: () => {
      const m = selectedMethod!;
      return api.withdrawWallet({
        amount: Number(amount),
        bankName: m.id === "bank" ? bankName : m.label,
        accountNumber: acNo, accountTitle: acName,
        paymentMethod: m.id, note,
      });
    },
    onSuccess: () => setStep("done"),
    onError: (e: any) => { setErr(e.message); },
  });

  const goToMethod = () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setErr("Valid amount likhein"); return; }
    if (amt < minPayout) { setErr(`Minimum: ${fc(minPayout)}`); return; }
    if (amt > maxPayout) { setErr(`Maximum: ${fc(maxPayout)}`); return; }
    if (amt > balance)   { setErr(`Sirf ${fc(balance)} available hai`); return; }
    setErr(""); setStep("method");
  };

  const goToDetails  = (m: PayMethod) => { setMethod(m); setAcNo(""); setAcName(""); setBankName(""); setErr(""); setStep("details"); };
  const goToConfirm  = () => {
    if (!acNo.trim())   { setErr("Account / phone number required"); return; }
    if (!acName.trim()) { setErr("Account holder name required"); return; }
    if (selectedMethod?.id === "bank" && !bankName) { setErr("Bank name select karein"); return; }
    setErr(""); setStep("confirm");
  };

  const STEP_LABELS = ["amount","method","details","confirm"];
  const stepIdx = STEP_LABELS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl overflow-hidden max-h-[93vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Top drag pill */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>

        {/* Step progress — only when not done */}
        {step !== "done" && stepIdx >= 0 && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="flex gap-1.5 mt-1">
              {STEP_LABELS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-green-500" : "bg-gray-100"}`}/>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right">Step {stepIdx + 1} / {STEP_LABELS.length}</p>
          </div>
        )}

        <div className="overflow-y-auto flex-1">

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="p-8 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-5xl">✅</div>
              <h3 className="text-2xl font-extrabold text-gray-800">Request Submitted!</h3>
              <p className="text-gray-500 mt-2">
                <span className="font-extrabold text-green-600">{fc(Number(amount))}</span> withdrawal request queue mein hai.
              </p>
              <p className="text-sm text-gray-400 mt-1">Admin 24–48 hours mein process karega.</p>
              <div className="mt-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="font-bold">{selectedMethod?.logo} {selectedMethod?.label}</span>
                </div>
                {selectedMethod?.id === "bank" && (
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Bank</span><span className="font-bold">{bankName}</span></div>
                )}
                <div className="flex justify-between text-sm"><span className="text-gray-500">{selectedMethod?.id === "bank" ? "Account No." : "Phone"}</span><span className="font-bold">{acNo}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Account Name</span><span className="font-bold">{acName}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-green-100">
                  <span className="text-gray-600 font-semibold">Amount</span>
                  <span className="text-2xl font-extrabold text-green-600">{fc(Number(amount))}</span>
                </div>
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700">💡 Aap Wallet page par apni request ka status track kar sakte hain.</p>
              </div>
              <button onClick={() => { onSuccess(); onClose(); }} className="mt-5 w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl text-lg">
                Done ✓
              </button>
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="p-6">
              <h3 className="text-xl font-extrabold text-gray-800 mb-1">Confirm Withdrawal</h3>
              <p className="text-sm text-gray-500 mb-5">Submit karne se pehle sab details check karein</p>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Amount</span>
                  <span className="font-extrabold text-green-600 text-3xl">{fc(Number(amount))}</span>
                </div>
                <div className="h-px bg-green-100"/>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-bold">{selectedMethod?.logo} {selectedMethod?.label}</span></div>
                {selectedMethod?.id === "bank" && <div className="flex justify-between text-sm"><span className="text-gray-500">Bank</span><span className="font-bold">{bankName}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-500">{selectedMethod?.id === "bank" ? "Account No." : "Phone"}</span><span className="font-bold font-mono">{acNo}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Account Name</span><span className="font-bold">{acName}</span></div>
                {note && <div className="flex justify-between text-sm"><span className="text-gray-500">Note</span><span className="font-bold">{note}</span></div>}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-700 font-medium">Galat account details se payment fail ho sakti hai. Submit karne ke baad cancel nahi hoga.</p>
              </div>
              {err && <div className="bg-red-50 rounded-xl px-4 py-2.5 mb-3"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
              <div className="flex gap-3">
                <button onClick={() => { setStep("details"); setErr(""); }} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl py-3 text-sm">← Edit</button>
                <button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-[2] bg-green-600 text-white font-extrabold rounded-2xl py-3 disabled:opacity-60 text-sm">
                  {mut.isPending ? "⏳ Processing..." : "✅ Submit Withdrawal"}
                </button>
              </div>
            </div>
          )}

          {/* ── DETAILS ── */}
          {step === "details" && selectedMethod && (
            <div className="p-6">
              <button onClick={() => setStep("method")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 font-semibold">← Back</button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">{selectedMethod.logo}</div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800">{selectedMethod.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedMethod.description}</p>
                </div>
              </div>

              {(user as any)?.bankName && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-blue-700">💾 Saved Account</p>
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
                    {selectedMethod.id === "bank" ? "Account Number / IBAN *" : "Registered Phone Number *"}
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
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Admin ke liye koi note" className={INPUT}/>
                </div>
                {err && <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
                <button onClick={goToConfirm} className="w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl">Review & Confirm →</button>
              </div>
            </div>
          )}

          {/* ── METHOD SELECTION ── */}
          {step === "method" && (
            <div className="p-6">
              <button onClick={() => setStep("amount")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 font-semibold">← Back</button>
              <h3 className="text-xl font-extrabold text-gray-800 mb-1">Select Method</h3>
              <p className="text-sm text-gray-500 mb-4">Kahan receive karna chahte hain?</p>
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-green-200">Withdrawal Amount</span>
                <span className="text-2xl font-extrabold text-white">{fc(Number(amount))}</span>
              </div>
              {loadingMethods ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
              ) : (
                <div className="space-y-3">
                  {methods.map(m => (
                    <button key={m.id} onClick={() => goToDetails(m)}
                      className="w-full text-left bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-green-400 hover:bg-green-50 active:scale-[0.98] transition-all">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">{m.logo}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-gray-800">{m.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                      </div>
                      <span className="text-gray-400 text-xl">›</span>
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
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 text-white mb-5">
                <p className="text-sm text-green-200">Available Balance</p>
                <p className="text-4xl font-extrabold mt-0.5">{fc(balance)}</p>
                <div className="flex gap-3 mt-3 text-xs text-green-300">
                  <span>Min: {fc(minPayout)}</span>
                  <span>·</span>
                  <span>Max: {fc(maxPayout)}</span>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Select</p>
              <div className="flex gap-2 mb-5 flex-wrap">
                {[500, 1000, 2000, 5000, 10000].filter(v => v <= balance && v >= minPayout).map(v => (
                  <button key={v} onClick={() => { setAmount(String(v)); setErr(""); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${amount === String(v) ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {fc(v)}
                  </button>
                ))}
                {balance >= minPayout && (
                  <button onClick={() => { setAmount(String(Math.floor(balance))); setErr(""); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${amount === String(Math.floor(balance)) ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-600 border-green-200"}`}>
                    All ({fc(Math.floor(balance))})
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (Rs.) *</p>
                  <input type="number" inputMode="numeric" value={amount}
                    onChange={e => { setAmount(e.target.value); setErr(""); }}
                    placeholder="Enter amount" className={INPUT}/>
                </div>
                {err && <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
                <button onClick={goToMethod} className="w-full h-14 bg-green-600 text-white font-extrabold rounded-2xl">
                  Select Method →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COD REMITTANCE MODAL — 3-step flow
══════════════════════════════════════════ */
const COD_METHODS = [
  { id: "jazzcash",  label: "JazzCash",      logo: "🔴", desc: "0300-XXXXXXX par send karein", placeholder: "03XX-XXXXXXX" },
  { id: "easypaisa", label: "EasyPaisa",     logo: "🟢", desc: "EasyPaisa number par send karein", placeholder: "03XX-XXXXXXX" },
  { id: "bank",      label: "Bank Transfer", logo: "🏦", desc: "Company ke bank account mein",  placeholder: "IBAN / Account No." },
];

function RemittanceModal({ codAccount, netOwed, onClose, onSuccess }: {
  codAccount: { jazzcash?: string; easypaisa?: string; bank?: string; bankName?: string };
  netOwed: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]           = useState<"method"|"details"|"confirm"|"done">("method");
  const [method, setMethod]       = useState<typeof COD_METHODS[0] | null>(null);
  const [amount, setAmount]       = useState(String(Math.ceil(netOwed)));
  const [acNo, setAcNo]           = useState("");
  const [txId, setTxId]           = useState("");
  const [note, setNote]           = useState("");
  const [err, setErr]             = useState("");
  const INPUT = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors";

  const mut = useMutation({
    mutationFn: () => api.submitCodRemittance({
      amount: Number(amount), paymentMethod: method!.label,
      accountNumber: acNo, transactionId: txId, note,
    }),
    onSuccess: () => setStep("done"),
    onError:   (e: any) => setErr(e.message),
  });

  const goToDetails = (m: typeof COD_METHODS[0]) => {
    setMethod(m);
    const saved = m.id === "jazzcash" ? codAccount.jazzcash : m.id === "easypaisa" ? codAccount.easypaisa : codAccount.bank;
    setAcNo(saved || "");
    setErr(""); setStep("details");
  };

  const goToConfirm = () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setErr("Valid amount likhein"); return; }
    if (!acNo.trim()) { setErr("Account / phone number required"); return; }
    if (!txId.trim()) { setErr("Transaction reference ID required hai"); return; }
    setErr(""); setStep("confirm");
  };

  const STEP_LABELS = ["method","details","confirm"];
  const stepIdx = STEP_LABELS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl max-h-[93vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>
        {step !== "done" && stepIdx >= 0 && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="flex gap-1.5 mt-1">
              {STEP_LABELS.map((_,i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-blue-500" : "bg-gray-100"}`}/>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right">Step {stepIdx+1}/{STEP_LABELS.length}</p>
          </div>
        )}
        <div className="overflow-y-auto flex-1">

          {/* DONE */}
          {step === "done" && (
            <div className="p-8 text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5 text-5xl">✅</div>
              <h3 className="text-2xl font-extrabold text-gray-800">Remittance Submitted!</h3>
              <p className="text-gray-500 mt-2 text-sm">Admin 24 hours mein verify karega. Verify hone par notification milegi.</p>
              <div className="mt-5 bg-blue-50 rounded-2xl p-5 text-left space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-bold">{method?.logo} {method?.label}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Account</span><span className="font-bold font-mono">{acNo}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tx Ref</span><span className="font-bold font-mono">{txId}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                  <span className="text-gray-600 font-semibold">Amount Remitted</span>
                  <span className="text-2xl font-extrabold text-blue-600">{fc(Number(amount))}</span>
                </div>
              </div>
              <button onClick={() => { onSuccess(); onClose(); }} className="mt-5 w-full h-14 bg-blue-600 text-white font-extrabold rounded-2xl">Done ✓</button>
            </div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && (
            <div className="p-6">
              <h3 className="text-xl font-extrabold text-gray-800 mb-1">Confirm Remittance</h3>
              <p className="text-sm text-gray-500 mb-5">Submit se pehle sab details check karein</p>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Amount</span>
                  <span className="font-extrabold text-blue-600 text-3xl">{fc(Number(amount))}</span>
                </div>
                <div className="h-px bg-blue-100"/>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-bold">{method?.logo} {method?.label}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">To Account</span><span className="font-bold font-mono">{acNo}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tx Reference</span><span className="font-bold font-mono">{txId}</span></div>
                {note && <div className="flex justify-between text-sm"><span className="text-gray-500">Note</span><span className="font-bold">{note}</span></div>}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex gap-2">
                <span>⚠️</span>
                <p className="text-xs text-amber-700 font-medium">Galat transaction ID se rejection ho sakta hai. Real TxID daalen.</p>
              </div>
              {err && <div className="bg-red-50 rounded-xl px-4 py-2.5 mb-3"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
              <div className="flex gap-3">
                <button onClick={() => { setStep("details"); setErr(""); }} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl py-3 text-sm">← Edit</button>
                <button onClick={() => mut.mutate()} disabled={mut.isPending} className="flex-[2] bg-blue-600 text-white font-extrabold rounded-2xl py-3 disabled:opacity-60 text-sm">
                  {mut.isPending ? "⏳ Submitting..." : "✅ Submit Remittance"}
                </button>
              </div>
            </div>
          )}

          {/* DETAILS */}
          {step === "details" && method && (
            <div className="p-6">
              <button onClick={() => setStep("method")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 font-semibold">← Back</button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">{method.logo}</div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800">{method.label}</h3>
                  <p className="text-xs text-gray-500">{method.desc}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                <p className="text-xs font-bold text-blue-700 mb-1">Company Account Details</p>
                {method.id === "jazzcash"  && <p className="text-sm font-mono font-bold text-blue-800">{codAccount.jazzcash || "Contact admin for account"}</p>}
                {method.id === "easypaisa" && <p className="text-sm font-mono font-bold text-blue-800">{codAccount.easypaisa || "Contact admin for account"}</p>}
                {method.id === "bank"      && <p className="text-sm font-mono font-bold text-blue-800">{codAccount.bank || "Contact admin for IBAN"}{codAccount.bankName ? ` · ${codAccount.bankName}` : ""}</p>}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount Remitted (Rs.) *</p>
                  <input type="number" inputMode="numeric" value={amount}
                    onChange={e => { setAmount(e.target.value); setErr(""); }} className={INPUT} placeholder="0"/>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{method.id === "bank" ? "Your Account No." : "Your Phone (Sender)"} *</p>
                  <input value={acNo} onChange={e => { setAcNo(e.target.value); setErr(""); }}
                    placeholder={method.placeholder} className={INPUT}/>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Transaction ID / Reference *</p>
                  <input value={txId} onChange={e => { setTxId(e.target.value); setErr(""); }}
                    placeholder="JazzCash/EasyPaisa TxID ya bank ref no." className={INPUT}/>
                  <p className="text-[10px] text-gray-400 mt-1">JazzCash app ya bank SMS mein milta hai</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Note (Optional)</p>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Koi additional info" className={INPUT}/>
                </div>
                {err && <div className="bg-red-50 rounded-xl px-4 py-2.5"><p className="text-red-500 text-sm font-semibold">⚠️ {err}</p></div>}
                <button onClick={goToConfirm} className="w-full h-14 bg-blue-600 text-white font-extrabold rounded-2xl">Review & Submit →</button>
              </div>
            </div>
          )}

          {/* METHOD SELECTION */}
          {step === "method" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-extrabold text-gray-800">💵 Remit COD Cash</h3>
                <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-xl font-bold text-gray-500">✕</button>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white mb-5">
                <p className="text-sm text-blue-200">Total COD Owed</p>
                <p className="text-4xl font-extrabold mt-0.5">{fc(netOwed)}</p>
                <p className="text-xs text-blue-300 mt-2">Company ke account mein remit karein</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">Kahan bheja? Method select karein:</p>
              <div className="space-y-3">
                {COD_METHODS.map(m => (
                  <button key={m.id} onClick={() => goToDetails(m)}
                    className="w-full text-left bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">{m.logo}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-gray-800">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                    </div>
                    <span className="text-gray-400 text-xl">›</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                <span>💡</span>
                <p className="text-xs text-amber-700 font-medium">Pehle company account mein transfer karein, phir yahan Transaction ID ke sath submit karein.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   7-DAY EARNINGS CHART (CSS bars)
══════════════════════════════════════════ */
function EarningsChart({ transactions }: { transactions: any[] }) {
  const days = useMemo(() => {
    const result: { label: string; amount: number; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const earned = transactions
        .filter(t => t.type === "credit" && new Date(t.createdAt) >= d && new Date(t.createdAt) < next)
        .reduce((s, t) => s + Number(t.amount), 0);
      result.push({
        label: i === 0 ? "Aaj" : d.toLocaleDateString("en-PK", { weekday: "short" }),
        amount: earned,
        date: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }),
      });
    }
    return result;
  }, [transactions]);

  const maxVal = Math.max(...days.map(d => d.amount), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-gray-800 text-sm">7-Day Earnings</p>
        <span className="text-xs text-gray-400">{fc(days.reduce((s, d) => s + d.amount, 0))} this week</span>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: "56px" }}>
              <div
                className={`w-full rounded-t-lg transition-all ${i === 6 ? "bg-green-500" : "bg-green-200"}`}
                style={{ height: `${Math.max((d.amount / maxVal) * 56, d.amount > 0 ? 4 : 0)}px` }}
                title={`${d.date}: ${fc(d.amount)}`}
              />
            </div>
            <p className="text-[9px] text-gray-400 font-medium text-center leading-tight">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PENDING REQUEST CARD
══════════════════════════════════════════ */
function PendingRequestCard({ tx }: { tx: any }) {
  const parsed = (() => {
    const parts = (tx.description || "").replace("Withdrawal — ", "").split(" · ");
    return { bank: parts[0] || "—", account: parts[1] || "—", title: parts[2] || "—", note: parts[3] || "" };
  })();

  const ref = tx.reference ?? "pending";
  const status = ref === "pending" ? "pending" : ref.startsWith("paid:") ? "paid" : ref.startsWith("rejected:") ? "rejected" : "pending";
  const refNo  = ref.startsWith("paid:") ? ref.slice(5) : ref.startsWith("rejected:") ? ref.slice(9) : "";

  const statusConfig = {
    pending:  { label: "⏳ Processing", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
    paid:     { label: "✅ Paid",       bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700",  dot: "bg-green-400" },
    rejected: { label: "❌ Rejected",   bg: "bg-red-50",   border: "border-red-200",   badge: "bg-red-100 text-red-600",     dot: "bg-red-400"   },
  }[status] ?? { label: "⏳ Processing", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400" };

  return (
    <div className={`${statusConfig.bg} border ${statusConfig.border} rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
            {methodIcon(tx.paymentMethod || parsed.bank)}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-gray-900 text-sm">{parsed.bank}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{parsed.account}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-extrabold text-gray-900">{fc(Number(tx.amount))}</p>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${statusConfig.badge} inline-flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${status === "pending" ? "animate-pulse" : ""}`}/>
            {statusConfig.label}
          </span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/60 flex items-center justify-between">
        <p className="text-[10px] text-gray-500">{fd(tx.createdAt)} · {fdr(tx.createdAt)}</p>
        {refNo && <p className="text-[10px] font-bold text-gray-600">Ref: {refNo}</p>}
      </div>
      {status === "rejected" && refNo && (
        <div className="mt-2 bg-white/70 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600 font-medium">Reason: {refNo}</p>
          <p className="text-[10px] text-red-500 mt-0.5">Raqam aapke wallet mein wapas aa gaya hai.</p>
        </div>
      )}
      {status === "pending" && (
        <p className="text-[10px] text-amber-600 mt-2 font-medium">Admin 24–48 hours mein process karega.</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   FILTER TABS
══════════════════════════════════════════ */
const FILTER_TABS: { key: TxFilter; label: string; emoji: string }[] = [
  { key: "all",    label: "All",        emoji: "📋" },
  { key: "credit", label: "Earnings",   emoji: "💰" },
  { key: "debit",  label: "Withdrawals",emoji: "💸" },
  { key: "bonus",  label: "Bonuses",    emoji: "🎁" },
];

/* ══════════════════════════════════════════
   MAIN WALLET PAGE
══════════════════════════════════════════ */
export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const { config } = usePlatformConfig();
  const riderKeepPct      = config.rider?.keepPct    ?? config.finance.riderEarningPct;
  const minPayout         = config.rider?.minPayout  ?? config.finance.minRiderPayout;
  const maxPayout         = config.rider?.maxPayout  ?? 50000;
  const withdrawalEnabled = config.rider?.withdrawalEnabled !== false;
  const procDays          = config.wallet?.withdrawalProcessingDays ?? 2;
  const qc = useQueryClient();

  const [showWithdraw, setShowWithdraw]     = useState(false);
  const [showRemittance, setShowRemittance] = useState(false);
  const [toast, setToast]     = useState("");
  const [filter, setFilter]   = useState<TxFilter>("all");
  const [showRequests, setShowRequests]     = useState(true);
  const [showCodHistory, setShowCodHistory] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rider-wallet"],
    queryFn: () => api.getWallet(),
    refetchInterval: 30000,
    enabled: config.features.wallet,
  });

  const { data: codData, refetch: refetchCod } = useQuery({
    queryKey: ["rider-cod"],
    queryFn: () => api.getCodSummary(),
    refetchInterval: 60000,
    enabled: config.features.wallet,
  });

  const transactions: any[] = data?.transactions || [];
  const balance = data?.balance ?? (user?.walletBalance ? Number(user.walletBalance) : 0);

  const today   = new Date(); today.setHours(0,0,0,0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

  const todayEarned    = transactions.filter(t => t.type === "credit" && new Date(t.createdAt) >= today).reduce((s, t) => s + Number(t.amount), 0);
  const weekEarned     = transactions.filter(t => t.type === "credit" && new Date(t.createdAt) >= weekAgo).reduce((s, t) => s + Number(t.amount), 0);
  const totalEarned    = transactions.filter(t => t.type === "credit" || t.type === "bonus").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawn = transactions.filter(t => t.type === "debit" && !t.reference?.startsWith("refund:")).reduce((s, t) => s + Number(t.amount), 0);

  // Withdrawal requests (all statuses)
  const withdrawalRequests = transactions.filter(t =>
    t.type === "debit" && t.description?.startsWith("Withdrawal") && !t.reference?.startsWith("refund:")
  );
  const pendingRequests = withdrawalRequests.filter(t => !t.reference || t.reference === "pending");
  const pendingAmt = pendingRequests.reduce((s, t) => s + Number(t.amount), 0);

  // COD tracking
  const codNetOwed    = codData?.netOwed       ?? 0;
  const codCollected  = codData?.totalCollected ?? 0;
  const codVerified   = codData?.totalVerified  ?? 0;
  const codOrderCount = codData?.codOrderCount  ?? 0;
  const codRemittances: any[] = codData?.remittances ?? [];
  const codPending    = codRemittances.filter(r => r.reference === "pending");
  const codAccount    = {
    jazzcash:  config.payment?.jazzcashNumber  || "",
    easypaisa: config.payment?.easypaisaNumber || "",
    bank:      config.payment?.bankIban        || "",
    bankName:  config.payment?.bankName        || "",
  };

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    if (filter === "bonus") return transactions.filter(t => t.type === "bonus" || t.type === "loyalty" || t.type === "cashback");
    return transactions.filter(t => t.type === filter);
  }, [filter, transactions]);

  /* ── Wallet disabled state ── */
  if (!config.features.wallet) {
    return (
      <div className="bg-gray-50 pb-24 min-h-screen">
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-8">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <div className="bg-white rounded-3xl p-10 shadow-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Wallet Disabled</h3>
            <p className="text-sm text-gray-500">Admin ne wallet feature abhi band ki hai. Baad mein dobara check karein.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-28 min-h-screen">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/2"/>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"/>
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Wallet</h1>
            <p className="text-green-200 text-sm mt-0.5">Earnings & Withdrawals</p>
          </div>
          <button onClick={() => refetch()} className="h-9 w-9 bg-white/20 text-white text-sm font-bold rounded-xl flex items-center justify-center">↻</button>
        </div>
      </div>

      <div className="px-4 -mt-16 space-y-4">

        {/* ── BALANCE CARD ── */}
        <div className="bg-white rounded-3xl shadow-xl p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-50 rounded-full"/>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-emerald-50 rounded-full"/>
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Balance</p>
                <p className="text-5xl font-extrabold text-green-600 mt-1 leading-none">{fc(balance)}</p>
                <p className="text-xs text-gray-400 mt-2">{riderKeepPct}% of every delivery — credited instantly</p>
              </div>
              {pendingAmt > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-right flex-shrink-0">
                  <p className="text-[10px] text-amber-600 font-bold">PENDING</p>
                  <p className="text-sm font-extrabold text-amber-700">{fc(pendingAmt)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              {withdrawalEnabled ? (
                <button onClick={() => setShowWithdraw(true)}
                  className="flex-1 bg-green-600 text-white font-extrabold rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  💸 Withdraw
                </button>
              ) : (
                <button disabled className="flex-1 bg-gray-200 text-gray-400 font-bold rounded-2xl py-3.5 cursor-not-allowed">
                  🔒 Withdrawals Paused
                </button>
              )}
              <button onClick={() => refetch()} className="w-14 h-14 bg-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center text-lg active:scale-95 transition-transform">
                ↻
              </button>
            </div>

            {!withdrawalEnabled && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <span>🚫</span>
                <p className="text-xs text-red-600 font-medium">Admin ne temporarily withdrawals band ki hain. Earnings safe hain.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Earned Today",    value: fc(todayEarned),   icon: "☀️",  bg: "bg-amber-50",  text: "text-amber-700"  },
            { label: "Earned This Week",value: fc(weekEarned),    icon: "📅",  bg: "bg-blue-50",   text: "text-blue-700"   },
            { label: "Total Earned",    value: fc(totalEarned),   icon: "💰",  bg: "bg-green-50",  text: "text-green-700"  },
            { label: "Total Withdrawn", value: fc(totalWithdrawn),icon: "💸",  bg: "bg-red-50",    text: "text-red-600"    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-lg font-extrabold ${s.text} leading-tight`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 7-DAY EARNINGS CHART ── */}
        <EarningsChart transactions={transactions}/>

        {/* ── COD DEPOSIT SECTION ── */}
        {codOrderCount > 0 && (
          <div className={`rounded-2xl shadow-sm overflow-hidden border ${codNetOwed > 0 ? "border-blue-200 bg-white" : "border-green-200 bg-white"}`}>
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${codNetOwed > 0 ? "bg-blue-100" : "bg-green-100"}`}>
                  💵
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">COD Cash Balance</p>
                  <p className="text-xs text-gray-500">Cash on delivery collected</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-extrabold ${codNetOwed > 0 ? "text-blue-600" : "text-green-600"}`}>{fc(codNetOwed)}</p>
                <p className="text-[10px] text-gray-400">{codNetOwed > 0 ? "Remit karna baki" : "✅ All clear"}</p>
              </div>
            </div>

            <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-center border-t border-gray-50 pt-3">
              <div>
                <p className="text-xs font-extrabold text-gray-800">{fc(codCollected)}</p>
                <p className="text-[9px] text-gray-400 font-medium">Total Collected</p>
              </div>
              <div>
                <p className="text-xs font-extrabold text-green-600">{fc(codVerified)}</p>
                <p className="text-[9px] text-gray-400 font-medium">Verified</p>
              </div>
              <div>
                <p className={`text-xs font-extrabold ${codNetOwed > 0 ? "text-blue-600" : "text-gray-400"}`}>{fc(codNetOwed)}</p>
                <p className="text-[9px] text-gray-400 font-medium">Owed</p>
              </div>
            </div>

            {codPending.length > 0 && (
              <div className="mx-4 mb-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse flex-shrink-0"/>
                <p className="text-xs text-amber-700 font-semibold">{codPending.length} remittance verification pending hai</p>
              </div>
            )}

            <div className="px-4 pb-4 flex gap-2">
              {codNetOwed > 0 && (
                <button onClick={() => setShowRemittance(true)}
                  className="flex-1 bg-blue-600 text-white font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform">
                  💵 Remit COD Cash
                </button>
              )}
              <button onClick={() => setShowCodHistory(!showCodHistory)}
                className={`${codNetOwed > 0 ? "w-auto px-4" : "flex-1"} bg-gray-100 text-gray-600 font-bold rounded-2xl py-3 text-sm`}>
                {showCodHistory ? "Hide" : "History"}
              </button>
            </div>

            {showCodHistory && codRemittances.length > 0 && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {codRemittances.map(r => {
                  const ref = r.reference ?? "pending";
                  const st  = ref === "pending" ? "pending" : ref.startsWith("verified:") ? "verified" : ref.startsWith("rejected:") ? "rejected" : "pending";
                  const stBadge = st === "pending" ? "bg-amber-100 text-amber-700" : st === "verified" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600";
                  const stLabel = st === "pending" ? "⏳ Pending" : st === "verified" ? "✅ Verified" : "❌ Rejected";
                  const parts = (r.description || "").replace("COD Remittance — ", "").split(" · ");
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-base flex-shrink-0">💵</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{parts[0] || "Remittance"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-PK", { day:"numeric", month:"short" })}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stBadge}`}>{stLabel}</span>
                        </div>
                      </div>
                      <p className="text-sm font-extrabold text-blue-600 flex-shrink-0">{fc(Number(r.amount))}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── WITHDRAWAL REQUESTS SECTION ── */}
        {withdrawalRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100"
              onClick={() => setShowRequests(!showRequests)}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm">Withdrawal Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {pendingRequests.length} Pending
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{showRequests ? "▲" : "▼"}</span>
            </button>
            {showRequests && (
              <div className="p-3 space-y-3">
                {withdrawalRequests.map(tx => <PendingRequestCard key={tx.id} tx={tx}/>)}
                <div className="bg-blue-50 rounded-xl p-3 flex gap-2">
                  <span className="flex-shrink-0">ℹ️</span>
                  <p className="text-xs text-blue-700 font-medium">
                    Processing time: {procDays * 24}–{procDays * 24 + 24} hours. Admin approve karte hi notification aayegi.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HOW WALLET WORKS (no requests yet) ── */}
        {withdrawalRequests.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-bold text-gray-800 text-sm mb-3">💡 Wallet Kaise Kaam Karta Hai</p>
            <div className="space-y-2.5">
              {[
                { step: "1", icon: "🏍️", title: "Delivery Complete Karein", desc: `${riderKeepPct}% earnings foran wallet mein add ho jati hain` },
                { step: "2", icon: "💰", title: "Balance Accumulate Karein", desc: `Minimum ${fc(minPayout)} hone par withdrawal request dein` },
                { step: "3", icon: "💸", title: "Withdrawal Request Dein",   desc: "JazzCash, EasyPaisa, ya bank account select karein" },
                { step: "4", icon: "✅", title: "Payment Receive Karein",    desc: `${procDays * 24}–${procDays * 24 + 24} hours mein transfer ho jata hai` },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center text-sm font-extrabold text-green-600 flex-shrink-0">{s.step}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">{s.icon} {s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTION HISTORY ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">Transaction History</p>
              <span className="text-xs text-gray-400">{filtered.length} records</span>
            </div>
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
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-bold text-gray-600">No {filter === "all" ? "" : filter} transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Deliveries complete karo aur yahan earnings track karo</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((t: any) => {
                const info = txIcon(t.type);
                const isCredit = t.type !== "debit";
                const isW = t.type === "debit" && t.description?.startsWith("Withdrawal");
                const ref = isW ? (t.reference ?? "pending") : null;
                const wStatus = !ref ? null : ref === "pending" ? "pending" : ref.startsWith("paid:") ? "paid" : ref.startsWith("rejected:") ? "rejected" : null;
                return (
                  <div key={t.id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl ${info.bg}`}>
                      {info.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{t.description}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <p className="text-xs text-gray-400">{fd(t.createdAt)}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${info.badge}`}>{info.label}</span>
                        {wStatus === "pending"  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ Pending</span>}
                        {wStatus === "paid"     && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✅ Paid</span>}
                        {wStatus === "rejected" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">❌ Rejected</span>}
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

        {/* ── PAYOUT POLICY ── */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs font-extrabold text-green-700 mb-3">💡 Payout Policy</p>
          <div className="space-y-2">
            {[
              { icon: "📊", text: `${riderKeepPct}% aapka — ${100 - riderKeepPct}% platform fee` },
              { icon: "💳", text: `Min withdrawal: ${fc(minPayout)} · Max: ${fc(maxPayout)}` },
              { icon: "⏰", text: `${procDays * 24}–${procDays * 24 + 24} hours mein process hota hai` },
              { icon: "📱", text: "JazzCash, EasyPaisa, ya bank account mein transfer" },
              { icon: "🔒", text: "Rejected requests automatically refund ho jate hain" },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0">{p.icon}</span>
                <p className="text-xs text-green-700 font-medium">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">🔐 All transactions encrypted & audited by {config.platform.appName}</p>
      </div>

      {/* ── COD REMITTANCE MODAL ── */}
      {showRemittance && (
        <RemittanceModal
          codAccount={codAccount}
          netOwed={codNetOwed}
          onClose={() => setShowRemittance(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["rider-cod"] });
            refetchCod();
            showToast("✅ COD Remittance submitted! Admin verify karega.");
          }}
        />
      )}

      {/* ── WITHDRAW MODAL ── */}
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

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-6 left-4 right-4 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm font-semibold px-5 py-3.5 rounded-2xl shadow-2xl text-center">{toast}</div>
        </div>
      )}
    </div>
  );
}
