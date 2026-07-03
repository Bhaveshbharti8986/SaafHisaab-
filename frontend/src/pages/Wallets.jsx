import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { decodeToken } from "../lib/jwt.js";
import { formatINR } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { HardHat, Truck, ClipboardList, X, Wallet, ArrowDownLeft, ArrowDownToLine, ArrowUpRight, QrCode, ArrowRightLeft, User, UserCircle } from "lucide-react";

const EXPENSE_TYPES = [
  { key: "palledari", label: "Palledari",   icon: HardHat, color: "bg-blue-50 text-blue-700" },
  { key: "bhada",     label: "Bhada",       icon: Truck, color: "bg-orange-50 text-orange-700" },
  { key: "misc",      label: "Misc",        icon: ClipboardList, color: "bg-gray-50 text-gray-700" },
];

export default function Wallets() {
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sethBalance, setSethBalance] = useState(0);
  const [munsiBalance, setMunsiBalance] = useState(0);
  
  const token = localStorage.getItem("accessToken");
  let role = "munsi";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || "munsi";
  }
  const [form, setForm] = useState({ type: "palledari", amount: "", notes: "", paidBy: role });
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDirection, setTransferDirection] = useState("seth_to_munsi");
  const [transferAmount, setTransferAmount] = useState("");

  function loadData() {
    api.get(`/dashboard/passbook?date=all&limit=200&role=${role}`).then(setEntries);
    api.get(`/fund-transfers`).then(setTransfers);
    api.get(`/dashboard/summary`).then(data => {
      setSethBalance(data?.sethWalletBalance || 0);
      setMunsiBalance(data?.munsiCashBalance || 0);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addExpense(e) {
    e.preventDefault();
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      await api.post("/expenses", { ...form, amount: parseFloat(form.amount), date: todayStr });
      setForm({ type: "palledari", amount: "", notes: "", paidBy: "munsi" });
      setShowForm(false);
      loadData();
      showToast("Expense added successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to add expense", "error");
    }
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!transferAmount) return;
    const notes = transferDirection === "seth_to_munsi" ? "Transfer to Munsi" : "Transfer to Seth";
    try {
      await api.post("/fund-transfers", { amount: parseFloat(transferAmount), notes, direction: transferDirection });
      setTransferAmount("");
      setShowTransfer(false);
      loadData();
      showToast("Transfer completed successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to transfer funds", "error");
    }
  }

  const filteredEntries = entries.filter(e => filter === "all" ? true : e.direction === filter);

  const groupedEntries = {};
  filteredEntries.forEach(txn => {
    const d = new Date(txn.time);
    const month = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groupedEntries[month]) groupedEntries[month] = [];
    groupedEntries[month].push(txn);
  });

  return (
    <AppLayout title="Wallets" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-10 pt-4 rounded-b-[2rem] shadow-md relative z-0 space-y-4">
        <div className="flex justify-between items-center px-1 mb-2">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Treasury</p>
            <h2 className="text-white text-xl font-bold">Wallets</h2>
          </div>
        </div>
        
        {/* Seth Wallet Card */}
        {role === 'seth' && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><UserCircle size={80} /></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mb-1">Seth Treasury</p>
                <p className={`text-3xl font-black ${sethBalance < 0 ? 'text-rose-400' : ''}`}>{formatINR(sethBalance)}</p>
              </div>
              <button onClick={() => { setTransferDirection("seth_to_munsi"); setShowTransfer(true); }} className="bg-[#2a6c4a] hover:bg-[#348259] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-green-900/50 transition-colors">
                <ArrowRightLeft size={14} /> Send to Munsi
              </button>
            </div>
          </div>
        )}

        {/* Munsi Wallet Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={80} /></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-teal-50 font-bold uppercase tracking-widest text-[10px] mb-1">Munsi Galla</p>
              <p className={`text-3xl font-black ${munsiBalance < 0 ? 'text-rose-400' : ''}`}>{formatINR(munsiBalance)}</p>
            </div>
            <button onClick={() => { setTransferDirection("munsi_to_seth"); setShowTransfer(true); }} className="bg-[#2a6c4a] hover:bg-[#348259] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-green-900/50 transition-colors">
              <ArrowRightLeft size={14} /> Send to Seth
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 mt-6 relative z-10">
          <button className="flex flex-col items-center gap-2 group" onClick={() => setShowForm(v => !v)}>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white/20 transition-all group-active:scale-95">
              <ClipboardList size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/80">Add Expense</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 group opacity-50">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all">
              <ArrowDownToLine size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/80">Add Cash</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 group opacity-50">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all">
              <QrCode size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/80">Scan & Pay</span>
          </button>
          
          <button className="flex flex-col items-center gap-2 group opacity-50">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/80">To Bank</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10">
        
        {showTransfer && (
          <form onSubmit={handleTransfer} className="bg-gradient-to-br from-[#f8fafc] to-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><UserCircle size={16} /></div>
              <ArrowRightLeft size={16} className="text-gray-400" />
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><User size={16} /></div>
              <span className="font-bold text-gray-800 ml-1">
                {transferDirection === "seth_to_munsi" ? "Transfer to Munsi" : "Transfer to Seth"}
              </span>
            </div>
            <input type="number" required placeholder="Amount (₹)" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowTransfer(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 font-semibold text-sm">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-semibold text-sm">Transfer</button>
            </div>
          </form>
        )}

        {showForm && (
          <form onSubmit={addExpense} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm mb-4">
            <h3 className="font-bold text-gray-800 text-sm">New Expense</h3>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-3">
              <button type="button" onClick={() => setForm(p => ({ ...p, paidBy: "seth" }))} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.paidBy === "seth" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Seth Paid</button>
              <button type="button" onClick={() => setForm(p => ({ ...p, paidBy: "munsi" }))} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.paidBy === "munsi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Munsi Paid</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {EXPENSE_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setForm(p => ({ ...p, type: t.key }))}
                  className={`flex-none px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold ${form.type === t.key ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-600"}`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
            <input type="number" required placeholder="Amount (₹)" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 font-medium" />
            <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 font-medium" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-semibold text-sm">Cancel</button>
              <button type="submit" className="flex-1 bg-gray-900 text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-gray-900/20">Save Expense</button>
            </div>
          </form>
        )}

        {/* Filter Chips */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "all", label: "All" },
            { id: "in", label: "Money In" },
            { id: "out", label: "Money Out" },
            { id: "transfers", label: "Transfers" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                filter === f.id 
                  ? "bg-[#2a6c4a] text-white shadow-sm" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filter === "transfers" ? (
          transfers.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No transfers found</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 divide-y divide-gray-100">
              {transfers.map(txn => {
                const isToMunsi = txn.direction === "seth_to_munsi" || !txn.direction;
                return (
                  <div key={txn._id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full ${isToMunsi ? "bg-blue-100 text-blue-600" : "bg-teal-100 text-teal-600"} flex items-center justify-center shrink-0`}>
                      <ArrowRightLeft size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">
                        {isToMunsi ? "Seth → Munsi Transfer" : "Munsi → Seth Transfer"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {new Date(txn.createdAt || txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        {txn.notes && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="text-[10px] text-gray-500 truncate">{txn.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-[15px] ${isToMunsi ? "text-blue-600" : "text-teal-600"}`}>
                        {formatINR(txn.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredEntries.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No transactions found</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              {Object.entries(groupedEntries).map(([month, monthEntries]) => (
                <div key={month}>
                  <div className="bg-gray-100 text-gray-500 font-bold text-xs uppercase px-4 py-2 border-y border-gray-200">
                    {month}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {monthEntries.map(txn => {
                      const isIn = txn.direction === "in";
                      return (
                        <div key={txn.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isIn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                          }`}>
                            {isIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{txn.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-500 font-semibold">
                                {new Date(txn.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shadow-sm border border-gray-200 truncate max-w-[120px]">
                                {txn.category?.replace("_", " ")}
                              </span>
                              {txn.paidBy && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${txn.paidBy === "seth" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}`}>
                                    {txn.paidBy} paid
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-[15px] ${isIn ? "text-[#1d9154]" : "text-gray-900"}`}>
                              {isIn ? "+" : "-"} {formatINR(txn.amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
