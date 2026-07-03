import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { getCropConfig } from "../lib/crop.js";

export default function Rates() {
  const [rates, setRates]       = useState([]);
  const [editing, setEditing]   = useState(null);
  const [newRate, setNewRate]   = useState("");
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => { api.get("/rates").then(setRates); }, []);

  async function saveRate(cropType) {
    const updated = await api.post("/rates", { cropType, ratePerKg: parseFloat(newRate) });
    setRates(p => {
      const idx = p.findIndex(r => r.cropType === cropType);
      return idx >= 0 ? p.map(r => r.cropType === cropType ? updated : r) : [...p, updated];
    });
    setEditing(null);
    setNewRate("");
  }

  async function handleBroadcast() {
    const result = await api.post("/rates/broadcast");
    setBroadcast(result);
    setTimeout(() => setBroadcast(null), 3000);
  }

  const trendIcon = { up: "↗", down: "↘", stable: "→" };
  const trendColor = { up: "text-green-500", down: "text-red-500", stable: "text-gray-400" };
  const CROPS_ORDER = ["wheat", "maize", "rice", "soybean"];

  const allCrops = CROPS_ORDER.map(c => rates.find(r => r.cropType === c) ?? { cropType: c, ratePerKg: 0, trend: "stable" });

  return (
    <AppLayout title="Aaj Ka Bhaw (Rates)" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-sm">
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Today's Mandi Rates</p>
          <p className="text-white font-bold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10">
        {allCrops.map(rate => {
          const crop = getCropConfig(rate.cropType);
          const trend = rate.trend ?? "stable";
          return (
            <div key={rate.cropType} className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{crop.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{crop.label}</span>
                    <span className={`font-bold text-lg ${trendColor[trend]}`}>{trendIcon[trend]}</span>
                  </div>
                  {rate.previousRate > 0 && (
                    <p className="text-xs text-gray-400">Prev: ₹{rate.previousRate}/kg</p>
                  )}
                </div>
                <div className="text-right">
                  {editing === rate.cropType ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        placeholder="₹/kg"
                        className="w-20 border border-[#2a6c4a] rounded-lg px-2 py-1 text-sm text-right focus:outline-none"
                      />
                      <button onClick={() => saveRate(rate.cropType)} className="text-[#2a6c4a] font-bold">✓</button>
                      <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(rate.cropType); setNewRate(rate.ratePerKg > 0 ? String(rate.ratePerKg) : ""); }} className="text-right">
                      <p className={`text-xl font-bold ${crop.color}`}>₹{rate.ratePerKg > 0 ? rate.ratePerKg : "—"}<span className="text-xs font-normal text-gray-400">/kg</span></p>
                      <p className="text-[10px] text-[#2a6c4a] font-semibold">tap to edit</p>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={handleBroadcast}
          className="w-full bg-[#2a6c4a] text-white rounded-xl py-4 font-bold flex items-center justify-center gap-2"
        >
          📢 Broadcast to All Farmers
        </button>

        {broadcast && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">✓ Sent to {broadcast.farmersReached} farmers</p>
            <p className="text-green-600/70 text-xs mt-1">"{broadcast.message}"</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
