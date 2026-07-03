import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR, formatWeight } from "../lib/format.js";
import { Scale, Factory, ReceiptText, Mic, TrendingUp, HandCoins } from "lucide-react";
import DirectPurchaseSheet from "../components/DirectPurchaseSheet.jsx";

export default function Munsi() {
  const [stock, setStock]   = useState(null);
  const [pending, setPending] = useState([]);
  const [showPurchase, setShowPurchase] = useState(false);

  const fetchGodown = () => api.get("/godown").then(setStock);

  useEffect(() => {
    fetchGodown();
    api.get("/weight-entries?status=pending").then(setPending);
  }, []);

  const actions = [
    { label: "Weigh Crop", icon: <Scale size={32} />, path: "/munsi/weigh", color: "bg-green-50 text-green-700" },
    { label: "Godown", icon: <Factory size={32} />, path: "/godown", color: "bg-orange-50 text-orange-700" },
    { label: "Expenses", icon: <ReceiptText size={32} />, path: "/expenses", color: "bg-rose-50 text-rose-700" },
    { label: "Analysis", icon: <TrendingUp size={32} />, path: "/godown-analysis", color: "bg-indigo-50 text-indigo-700" },
    { label: "Direct Buy", icon: <HandCoins size={32} />, action: () => setShowPurchase(true), color: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <AppLayout title="Munsi Terminal" munsiMode>
      <DirectPurchaseSheet 
        isOpen={showPurchase} 
        onClose={() => {
          setShowPurchase(false);
          fetchGodown(); // refresh stock
        }} 
      />
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pt-4 pb-12 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Munsi Operations</p>
            <h2 className="text-white text-xl font-bold">Field Terminal</h2>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Pending Sync</p>
            <p className="text-white text-4xl font-black">{pending.length}</p>
          </div>
          <div className="text-5xl opacity-80 drop-shadow-md">⚖️</div>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-6 relative z-10">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {actions.map(a => {
            const inner = (
              <div className={`${a.color.replace('bg-green-50', 'bg-white')} rounded-2xl border border-gray-200 p-3 shadow-md flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform min-h-[90px] justify-center`}>
                <div className="drop-shadow-sm scale-90">{a.icon}</div>
                <span className="font-bold text-xs tracking-wide text-center">{a.label}</span>
              </div>
            );
            
            if (a.path) {
              return <Link key={a.label} href={a.path}>{inner}</Link>;
            } else if (a.action) {
              return <div key={a.label} onClick={a.action}>{inner}</div>;
            } else {
              return (
                <div key={a.label} className="bg-white text-gray-400 rounded-2xl border border-gray-200 p-3 shadow-sm flex flex-col items-center gap-2 min-h-[90px] justify-center opacity-70">
                  <div className="grayscale opacity-50 scale-90">{a.icon}</div>
                  <span className="font-bold text-xs tracking-wide text-center">{a.label}</span>
                </div>
              );
            }
          })}
        </div>

        {/* Godown Stock */}
        {stock && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
            <h3 className="font-bold text-gray-900 mb-3">Godown Stock</h3>
            <div className="space-y-2">
              {[
                { crop: "wheat",   emoji: "🌾", max: 50000 },
                { crop: "maize",   emoji: "🌽", max: 30000 },
                { crop: "rice",    emoji: "🍚", max: 40000 },
                { crop: "soybean", emoji: "🫘", max: 20000 },
              ].map(c => {
                const val = stock[c.crop] || 0;
                const pct = Math.min(100, Math.round(val / c.max * 100));
                return (
                  <div key={c.crop} className="flex items-center gap-3">
                    <span className="text-lg w-6">{c.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700 capitalize">{c.crop === 'soybean' ? 'pulse' : c.crop}</span>
                        <span className="text-gray-400">{formatWeight(val)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2a6c4a] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold text-orange-600">📦 Empty Bags</span>
                <span className="font-bold text-orange-600">{stock.emptyBags ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

