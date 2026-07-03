import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { getCropConfig } from "../lib/crop.js";

export default function ViewRates() {
  const [rates, setRates] = useState([]);

  useEffect(() => {
    api.get("/rates").then(setRates).catch(console.error);
  }, []);

  const trendIcon = { up: "↗", down: "↘", stable: "→" };
  const trendColor = { up: "text-green-500", down: "text-red-500", stable: "text-gray-400" };
  const CROPS_ORDER = ["wheat", "maize", "rice", "soybean"];

  const allCrops = CROPS_ORDER.map(c => 
    rates.find(r => r.cropType === c) ?? { cropType: c, ratePerKg: 0, trend: "stable", previousRate: 0 }
  );

  return (
    <AppLayout title="Aaj Ka Bhaw" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-sm text-center">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Today's Mandi Rates</p>
          <p className="text-white font-black text-xl">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6 relative z-10 pb-20">
        {allCrops.map(rate => {
          const crop = getCropConfig(rate.cropType);
          const trend = rate.trend || "stable";
          const diff = rate.ratePerKg - (rate.previousRate || rate.ratePerKg);
          
          return (
            <div key={rate.cropType} className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                  {crop.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{crop.label}</h3>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor[trend]}`}>
                    <span>{trendIcon[trend]}</span>
                    <span>
                      {trend === "stable" ? "Stable" : `${diff > 0 ? "+" : ""}₹${Math.abs(diff).toFixed(1)}/kg`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-black text-gray-900">₹{rate.ratePerKg.toFixed(1)}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">per kg</p>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
