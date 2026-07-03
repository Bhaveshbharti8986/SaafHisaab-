import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { Scale, TrendingUp, User, Clock, ChevronRight, Activity } from "lucide-react";

export default function Labour() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    api.get("/weight-entries").then(setEntries).catch(console.error);
  }, []);

  const pendingCount = entries.filter(e => e.status === "pending").length;
  
  // Get up to 5 unique recent farmers
  const recentFarmers = [];
  const seenIds = new Set();
  for (const entry of entries) {
    if (!seenIds.has(entry.farmerId)) {
      seenIds.add(entry.farmerId);
      recentFarmers.push(entry);
    }
    if (recentFarmers.length >= 5) break;
  }

  const actions = [
    { label: "Weigh Crop", icon: <Scale size={32} />, path: "/weigh", color: "bg-green-50 text-green-700" },
    { label: "Aj Ka Bhaw", icon: <TrendingUp size={32} />, path: "/rates", color: "bg-blue-50 text-blue-700" },
    { label: "Profile", icon: <User size={32} />, path: "/settings", color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <AppLayout title="Labour Terminal">
      <div className="bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] px-4 pt-4 pb-12 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-purple-200 text-xs font-medium uppercase tracking-wider mb-1">Labour Operations</p>
            <h2 className="text-white text-xl font-bold">Field Terminal</h2>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-6 relative z-10 pb-20">
        
        {/* Welcome Card & Pending Stat */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center">
            <h3 className="text-gray-900 font-bold text-lg">Work Dashboard</h3>
            <p className="text-gray-500 text-xs font-semibold mt-1">Select an action below</p>
          </div>
          <div className="w-28 bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 text-orange-500 mb-1">
              <Clock size={16} strokeWidth={3} />
            </div>
            <span className="text-xl font-black text-gray-900 leading-none">{pendingCount}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Pending</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map(a => (
            <Link key={a.label} href={a.path}>
              <div className={`rounded-3xl border border-gray-100 p-5 flex flex-col items-center gap-3 cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-transform min-h-[110px] justify-center ${a.color}`}>
                <div className="drop-shadow-sm">{a.icon}</div>
                <span className="font-bold text-sm tracking-wide">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Farmers List */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center gap-2">
            <Activity size={18} className="text-purple-500" />
            <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wider">Recently Weighed</h3>
          </div>
          
          <div className="flex flex-col">
            {recentFarmers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-semibold text-sm">
                No entries yet today.
              </div>
            ) : (
              recentFarmers.map((entry) => (
                <div key={entry._id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="font-bold text-gray-900">{entry.farmerName}</h4>
                    <p className="text-xs font-semibold text-gray-500 capitalize">{entry.cropType} • {entry.totalWeight}kg</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
