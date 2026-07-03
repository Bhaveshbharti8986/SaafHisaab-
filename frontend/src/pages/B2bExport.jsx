import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR, today } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { Plus, X } from "lucide-react";

export default function B2bExport() {
  const [dispatches, setDispatches] = useState([]);
  const [dispForm, setDispForm] = useState({ truckNumber: "", buyerName: "", dispatchDate: today(), dueDate: "", items: [{ cropType: "wheat", weightKg: "", ratePerKg: "" }] });
  const [showForm, setShowForm] = useState(false);
  
  const [paymentModal, setPaymentModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    api.get("/b2b-dispatches").then(setDispatches);
  }, []);

  async function addDispatch(e) {
    e.preventDefault();
    const formattedItems = dispForm.items.map(i => ({
      cropType: i.cropType,
      weightKg: parseFloat(i.weightKg) || 0,
      ratePerKg: parseFloat(i.ratePerKg) || 0,
      itemValue: (parseFloat(i.weightKg) || 0) * (parseFloat(i.ratePerKg) || 0)
    }));
    
    try {
      const d = await api.post("/b2b-dispatches", { ...dispForm, items: formattedItems });
      setDispatches(p => [d, ...p]);
      setDispForm({ truckNumber: "", buyerName: "", dispatchDate: today(), dueDate: "", items: [{ cropType: "wheat", weightKg: "", ratePerKg: "" }] });
      setShowForm(false);
      showToast("Dispatch recorded successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to record dispatch", "error");
    }
  }

  async function handlePayment(e) {
    e.preventDefault();
    try {
      const updated = await api.patch(`/b2b-dispatches/${paymentModal._id}`, { paidAmount: parseFloat(payAmount) });
      setDispatches(p => p.map(x => x._id === paymentModal._id ? updated : x));
      setPaymentModal(null);
      showToast("Payment recorded successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    }
  }

  async function toggleUnpaid(id) {
    if (confirm("Are you sure you want to mark this as Unpaid? This will deduct the amount from the Seth Wallet.")) {
      try {
        const updated = await api.patch(`/b2b-dispatches/${id}`, { paidAmount: 0 });
        setDispatches(p => p.map(x => x._id === id ? updated : x));
        showToast("Marked as Unpaid", "success");
      } catch (err) {
        showToast(err.message || "Failed to update status", "error");
      }
    }
  }

  return (
    <AppLayout title="B2B Export" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">
        <div className="flex justify-between items-center px-1 mb-2">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Mandi Operations</p>
            <h2 className="text-white text-xl font-bold">B2B Dispatches</h2>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4 -mt-6 relative z-10 pb-28">
        <button onClick={() => setShowForm(v => !v)} className="w-full bg-white text-blue-700 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 rounded-3xl py-4 font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
          <span className="text-lg leading-none">+</span> Add Dispatch
        </button>

        {showForm && (
          <form onSubmit={addDispatch} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
            {[
              { field: "truckNumber", label: "Truck Number", type: "text" },
              { field: "buyerName",   label: "Buyer Name",   type: "text" },
              { field: "dispatchDate",label: "Dispatch Date", type: "date" },
              { field: "dueDate",     label: "Payment Due",  type: "date" },
            ].map(f => (
              <div key={f.field}>
                {f.type === "date" && <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{f.label}</label>}
                <input type={f.type} required={f.field !== "buyerName"} placeholder={f.label} value={dispForm[f.field]} onChange={e => setDispForm(p => ({ ...p, [f.field]: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ))}

            <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-700 text-sm">Crops to Dispatch</h4>
                <button type="button" onClick={() => setDispForm(p => ({ ...p, items: [...p.items, { cropType: "wheat", weightKg: "", ratePerKg: "" }] }))} className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1"><Plus size={12}/> Add Crop</button>
              </div>
              {dispForm.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl space-y-2 relative border border-gray-100">
                  {dispForm.items.length > 1 && (
                    <button type="button" onClick={() => setDispForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1"><X size={12}/></button>
                  )}
                  <select value={item.cropType} onChange={e => {
                    const newItems = [...dispForm.items];
                    newItems[idx].cropType = e.target.value;
                    setDispForm(p => ({ ...p, items: newItems }));
                  }} className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    {["wheat","maize","rice","soybean"].map(c => <option key={c} value={c}>{c === "soybean" ? "pulse" : c}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="number" required step="any" placeholder="Weight (kg)" value={item.weightKg} onChange={e => {
                      const newItems = [...dispForm.items];
                      newItems[idx].weightKg = e.target.value;
                      setDispForm(p => ({ ...p, items: newItems }));
                    }} className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    
                    <input type="number" required step="any" placeholder="Rate (₹/kg)" value={item.ratePerKg} onChange={e => {
                      const newItems = [...dispForm.items];
                      newItems[idx].ratePerKg = e.target.value;
                      setDispForm(p => ({ ...p, items: newItems }));
                    }} className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 font-semibold text-sm">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-semibold text-sm">Save Dispatch</button>
            </div>
          </form>
        )}

        {dispatches.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No dispatches found</p>
        ) : (
          dispatches.map(d => {
            const statusColor = d.paymentStatus === "paid" ? "bg-green-100 text-green-700" : d.paymentStatus === "overdue" ? "bg-red-100 text-red-700" : d.paymentStatus === "partial" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
            
            const cropsList = d.items && d.items.length > 0 
              ? d.items.map(i => `${i.cropType === 'soybean' ? 'pulse' : i.cropType} (${i.weightKg}kg)`).join(" • ")
              : `${d.cropType === 'soybean' ? 'pulse' : d.cropType} (${d.weightKg}kg)`;

            return (
              <div key={d._id} className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{d.truckNumber}</p>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{d.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900 text-lg">{formatINR(d.totalValue)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{d.paymentStatus.toUpperCase()}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-3 my-3">
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">{cropsList}</p>
                </div>

                <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-3">
                  <span>Due: {d.dueDate}</span>
                  {d.daysOverdue && <span className="text-red-500">{d.daysOverdue}d overdue</span>}
                  {d.daysRemaining != null && <span className="text-amber-600">{d.daysRemaining}d remaining</span>}
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="text-xs font-bold text-gray-500">
                    Received: <span className="text-gray-900">{formatINR(d.paidAmount || 0)}</span>
                  </div>
                  {d.paymentStatus !== "paid" ? (
                    <button onClick={() => { setPayAmount(d.totalValue - (d.paidAmount || 0)); setPaymentModal(d); }} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Add Payment</button>
                  ) : (
                    <button onClick={() => toggleUnpaid(d._id)} className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Mark Unpaid</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-end">
          <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-[2rem] p-6 space-y-5 animate-in slide-in-from-bottom-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pb-32">
            <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wide">Record Payment</h3>
            <p className="text-sm text-gray-500">Truck: <span className="font-bold text-gray-900">{paymentModal.truckNumber}</span></p>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Payment Amount</label>
                <div className="flex gap-2 mt-1">
                  <input type="number" step="any" max={paymentModal.totalValue} required value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 text-2xl font-black focus:outline-none focus:bg-white focus:border-blue-500" />
                </div>
                <p className="text-xs font-bold text-gray-400 mt-2">Remaining: {formatINR(paymentModal.totalValue - (paymentModal.paidAmount || 0))}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setPaymentModal(null)} className="flex-1 bg-gray-100 text-gray-600 rounded-2xl py-4 font-bold active:scale-95 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-2xl py-4 font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
