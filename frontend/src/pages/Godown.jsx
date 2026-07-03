import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatWeight, formatINR } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { X, HandCoins, LineChart } from "lucide-react";

const CROPS = [
  { key: "wheat",   emoji: "🌾", label: "Wheat",   max: 50000, color: "bg-amber-500"  },
  { key: "maize",   emoji: "🌽", label: "Maize",   max: 30000, color: "bg-yellow-500" },
  { key: "rice",    emoji: "🍚", label: "Rice",    max: 40000, color: "bg-blue-500"   },
  { key: "soybean", emoji: "🫘", label: "Pulse", max: 20000, color: "bg-purple-500" },
];

export default function Godown() {
  const [stock, setStock] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [qty, setQty]     = useState("");
  const [dir, setDir]     = useState(1);
  const [showDirectPurchase, setShowDirectPurchase] = useState(false);
  const [dpForm, setDpForm] = useState({ partyName: "", cropType: "wheat", weight: "", rate: "" });

  useEffect(() => { api.get("/godown").then(setStock); }, []);

  async function handleAdjust() {
    if (!adjusting || !qty) return;
    await api.post("/godown/adjust", { crop: adjusting, quantityKg: parseFloat(qty) * dir });
    const updated = await api.get("/godown");
    setStock(updated);
    setAdjusting(null);
    setQty("");
  }

  async function handleDirectPurchase(e) {
    e.preventDefault();
    if (!dpForm.partyName || !dpForm.weight || !dpForm.rate) return;
    
    const weight = parseFloat(dpForm.weight);
    const rate = parseFloat(dpForm.rate);
    const totalAmount = weight * rate;

    try {
      await api.post("/godown/direct-purchase", {
        partyName: dpForm.partyName,
        cropType: dpForm.cropType,
        weight,
        rate,
        totalAmount
      });
      
      const updated = await api.get("/godown");
      setStock(updated);
      
      setShowDirectPurchase(false);
      setDpForm({ partyName: "", cropType: "wheat", weight: "", rate: "" });
      showToast(`✅ Purchase Successful! Added ${weight}kg`, "success");
    } catch (err) {
      showToast(err.message || "Failed to process direct purchase.", "error");
    }
  }

  const dpTotal = (parseFloat(dpForm.weight) || 0) * (parseFloat(dpForm.rate) || 0);

  return (
    <AppLayout title="Godown Inventory" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-10 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">Inventory Overview</h2>
          <Link href="/godown-analysis" className="bg-white text-blue-700 p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all shadow-lg flex items-center gap-2">
            <LineChart size={20} className="text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider">Analysis</span>
          </Link>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-sm mb-4">
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Total Godown Stock</p>
          <p className="text-white text-3xl font-black">
            {stock ? formatWeight(CROPS.reduce((s, c) => s + (stock[c.key] || 0), 0)) : "—"}
          </p>
        </div>

      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10 pb-28">
        {CROPS.map(c => {
          const val = stock ? (stock[c.key] || 0) : 0;
          const pct = Math.min(100, Math.round(val / c.max * 100));
          const level = pct < 20 ? "LOW" : pct < 60 ? "OK" : "FULL";
          const levelColor = pct < 20 ? "text-red-500 bg-red-50" : pct < 60 ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50";
          return (
            <div key={c.key} className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{c.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{c.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColor}`}>{level}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">{formatWeight(val)}</p>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <button onClick={() => { setAdjusting(c.key); setQty(""); setDir(1); }} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform mt-2">+ Adjust Stock</button>
            </div>
          );
        })}

        {/* Empty Bags */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <p className="font-bold text-gray-900">Empty Bags</p>
              <p className="text-sm font-semibold text-orange-600">{stock?.emptyBags ?? 0} bags</p>
            </div>
          </div>
          <button onClick={() => { setAdjusting("emptyBags"); setQty(""); setDir(1); }} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">Adjust</button>
        </div>


      {/* Adjust Modal */}
      {adjusting && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-end">
            <div className="bg-white w-full max-w-[480px] mx-auto rounded-t-[2rem] p-6 space-y-5 animate-in slide-in-from-bottom-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pb-32">
              <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wide">Adjust {adjusting === "emptyBags" ? "Empty Bags" : adjusting}</h3>
              <div className="flex gap-2">
                {[1, -1].map(d => <button key={d} onClick={() => setDir(d)} className={`flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all ${dir === d ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-gray-100 text-gray-500"}`}>{d > 0 ? "+ Add" : "− Remove"}</button>)}
              </div>
              <input type="number" placeholder="Quantity (kg / bags)" value={qty} onChange={e => setQty(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-4 text-2xl font-black focus:outline-none focus:bg-white focus:border-blue-500 text-center" />
              <div className="flex gap-2">
                <button onClick={() => setAdjusting(null)} className="flex-1 bg-gray-100 text-gray-600 rounded-2xl py-4 font-bold active:scale-95 transition-all">Cancel</button>
                <button onClick={handleAdjust} className="flex-1 bg-blue-600 text-white rounded-2xl py-4 font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
