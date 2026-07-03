import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { HardHat, Truck, ClipboardList, X } from "lucide-react";

import { decodeToken } from "../lib/jwt.js";

const EXPENSE_TYPES = [
  { key: "palledari", label: "Palledari",   icon: HardHat, color: "bg-blue-50 text-blue-700" },
  { key: "bhada",     label: "Bhada",       icon: Truck, color: "bg-orange-50 text-orange-700" },
  { key: "misc",      label: "Misc",        icon: ClipboardList, color: "bg-gray-50 text-gray-700" },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  
  const token = localStorage.getItem("accessToken");
  let role = "munsi";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || "munsi";
  }

  const [form, setForm] = useState({ type: "palledari", amount: "", notes: "", paidBy: role });
  const [showForm, setShowForm] = useState(false);

  function loadData() {
    api.get(`/expenses?date=all`).then(setExpenses);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addExpense(e) {
    e.preventDefault();
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      const exp = await api.post("/expenses", { ...form, amount: parseFloat(form.amount), date: todayStr });
      setExpenses(p => [exp, ...p]);
      setForm({ type: "palledari", amount: "", notes: "", paidBy: role });
      setShowForm(false);
      loadData();
      showToast("Expense added successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to add expense", "error");
    }
  }

  const groupedExpenses = {};
  expenses.forEach(e => {
    const d = new Date(e.createdAt || e.date);
    const month = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groupedExpenses[month]) groupedExpenses[month] = [];
    groupedExpenses[month].push(e);
  });

  return (
    <AppLayout title="Expenses" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-10 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center px-1 mb-2">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Business Operations</p>
            <h2 className="text-white text-xl font-bold">Expenses Tracker</h2>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10 pb-28">
        
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full bg-white text-blue-700 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 rounded-3xl py-4 font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add Expense
        </button>

        {showForm && (
          <form onSubmit={addExpense} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] mb-4">
            <h3 className="font-bold text-gray-800 text-sm">New Expense</h3>
            <div className="flex gap-2 p-1 bg-gray-50 rounded-xl mb-3 border border-gray-100">
              <button type="button" onClick={() => setForm(p => ({ ...p, paidBy: "seth" }))} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.paidBy === "seth" ? "bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.05)]" : "text-gray-500"}`}>Seth Paid</button>
              <button type="button" onClick={() => setForm(p => ({ ...p, paidBy: "munsi" }))} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${form.paidBy === "munsi" ? "bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.05)]" : "text-gray-500"}`}>Munsi Paid</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {EXPENSE_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setForm(p => ({ ...p, type: t.key }))}
                  className={`flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border ${form.type === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
            <input type="number" required placeholder="Amount (₹)" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-medium" />
            <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-medium" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-bold text-sm">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm shadow-[0_4px_15px_rgba(37,99,235,0.2)]">Save Expense</button>
            </div>
          </form>
        )}

        {expenses.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No expenses recorded</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedExpenses).map(([month, monthExpenses]) => (
              <div key={month}>
                <div className="text-gray-500 font-bold text-xs uppercase px-2 mb-2">
                  {month}
                </div>
                <div className="space-y-3">
                  {monthExpenses.map(e => {
                    const t = EXPENSE_TYPES.find(x => x.key === e.type) ?? EXPENSE_TYPES[2];
                    return (
                      <div key={e._id} className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-4 flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${t.color}`}>
                          <t.icon size={22} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${e.paidBy === "seth" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                              {e.paidBy}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold mb-0.5 mt-0.5">
                            {new Date(e.createdAt || e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                          {e.notes && <p className="text-xs text-gray-500 mt-1">{e.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-black text-gray-900 text-base">{formatINR(e.amount)}</span>
                          <button onClick={() => {
                            if (confirm("Are you sure you want to delete this expense?")) {
                              api.delete(`/expenses/${e._id}`)
                                .then(() => {
                                  setExpenses(p => p.filter(x => x._id !== e._id));
                                  showToast("Expense deleted", "success");
                                })
                                .catch(err => showToast(err.message || "Failed to delete", "error"));
                            }
                          }} className="text-gray-300 hover:text-red-400 text-lg ml-2">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
