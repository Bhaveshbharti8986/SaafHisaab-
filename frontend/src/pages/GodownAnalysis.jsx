import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatWeight } from "../lib/format.js";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const CROP_LABELS = { wheat: "Wheat 🌾", maize: "Maize 🌽", rice: "Rice 🍚", soybean: "Pulse 🫘" };
const CROP_COLORS = { wheat: "#f59e0b", maize: "#eab308", rice: "#3b82f6", soybean: "#8b5cf6" };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur shadow-xl rounded-xl p-3 border border-gray-100">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm font-semibold mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="text-gray-900">{formatWeight(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function GodownAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weekly");

  useEffect(() => {
    setLoading(true);
    api.get("/dashboard/godown-analysis").then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <AppLayout title="Godown Analysis" showBack={true}>
        <div className="p-4 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Godown Analysis" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-10 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Trade Volume</p>
        <h2 className="text-white text-2xl font-bold mb-6">Continuous Analysis</h2>
        
        {/* Tabs */}
        <div className="flex bg-black/20 backdrop-blur-md rounded-2xl p-1">
          {["weekly", "monthly", "yearly"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl capitalize transition-colors ${activeTab === tab ? "bg-white text-blue-900 shadow" : "text-blue-100 hover:text-white"}`}
            >
              {tab === "weekly" ? "7 Days" : tab === "monthly" ? "30 Days" : "12 Months"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-6 relative z-10 pb-28">
        
        {activeTab === "weekly" && (
          <>
            {Object.keys(data.weekly).map(crop => (
              <div key={crop} className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                  <span>{CROP_LABELS[crop]}</span>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider">7 Days</span>
                </h3>
                <div className="h-56 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.weekly[crop]}>
                      <defs>
                        <linearGradient id={`in_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CROP_COLORS[crop]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CROP_COLORS[crop]} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id={`out_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}t`} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" name="Godown Stock" dataKey="stock" stroke={CROP_COLORS[crop]} strokeWidth={3} fillOpacity={1} fill={`url(#in_${crop})`} />
                      <Area type="monotone" name="Dispatch" dataKey="dispatch" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill={`url(#out_${crop})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "monthly" && (
          <>
            {Object.keys(data.monthly).map(crop => (
              <div key={crop} className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                  <span>{CROP_LABELS[crop]}</span>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider">30 Days</span>
                </h3>
                <div className="h-56 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly[crop]}>
                      <defs>
                        <linearGradient id={`in_m_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CROP_COLORS[crop]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CROP_COLORS[crop]} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id={`out_m_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}t`} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" name="Godown Stock" dataKey="stock" stroke={CROP_COLORS[crop]} strokeWidth={3} fillOpacity={1} fill={`url(#in_m_${crop})`} />
                      <Area type="monotone" name="Dispatch" dataKey="dispatch" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill={`url(#out_m_${crop})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "yearly" && (
          <>
            {Object.keys(data.yearly).map(crop => (
              <div key={crop} className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
                  <span>{CROP_LABELS[crop]}</span>
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider">12 Months</span>
                </h3>
                <div className="h-56 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.yearly[crop]}>
                      <defs>
                        <linearGradient id={`in_y_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CROP_COLORS[crop]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CROP_COLORS[crop]} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id={`out_y_${crop}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#6b7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}t`} width={40} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Area type="monotone" name="Godown Stock" dataKey="stock" stroke={CROP_COLORS[crop]} strokeWidth={3} fillOpacity={1} fill={`url(#in_y_${crop})`} />
                      <Area type="monotone" name="Dispatch" dataKey="dispatch" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill={`url(#out_y_${crop})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </AppLayout>
  );
}
