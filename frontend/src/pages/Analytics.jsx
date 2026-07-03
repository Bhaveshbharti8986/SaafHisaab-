import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR, formatWeight } from "../lib/format.js";
import { TrendingUp, TrendingDown, IndianRupee, Scale, PackageOpen, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

const CROP_COLORS = { wheat: "#FFB800", maize: "#F9E076", rice: "#00B4D8", soybean: "#9D4EDD" };
const EXPENSE_COLORS = { palledari: "#FF4D6D", bhada: "#FF9E00", misc: "#7B2CBF", salary: "#00F5D4" };

const TIMEFRAMES = [
  { id: "1D", label: "1D", days: 1 },
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "ALL", days: null }
];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [plData, setPlData] = useState(null);
  const [globalTimeframe, setGlobalTimeframe] = useState(TIMEFRAMES[4]);
  const [loading, setLoading] = useState(true);

  const [cropPieTime, setCropPieTime] = useState('ALL');
  const [expPieTime, setExpPieTime] = useState('ALL');

  const getLocalYYYYMMDD = (dateObj) => {
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const filterTrendByTime = (dailyData, timeStr) => {
    if (timeStr === 'ALL') return dailyData;
    const days = timeStr === '1D' ? 0 : timeStr === '1W' ? 6 : timeStr === '1M' ? 29 : 364;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = getLocalYYYYMMDD(cutoff);
    return dailyData.filter(d => d.date >= cutoffStr);
  };

  useEffect(() => {
    setLoading(true);
    let qs = "";
    if (globalTimeframe.days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (globalTimeframe.days - 1));
      qs = `?startDate=${getLocalYYYYMMDD(start)}&endDate=${getLocalYYYYMMDD(end)}&seasonName=${globalTimeframe.label}`;
    }
    
    Promise.all([
      api.get(`/dashboard/analytics${qs}`),
      api.get(`/dashboard/pl-report${qs}`)
    ]).then(([analytics, pl]) => {
      setData(analytics);
      setPlData(pl);
      setLoading(false);
    });
  }, [globalTimeframe]);

  if (loading || !data || !plData) return (
    <AppLayout title="Analytics & P&L">
      <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
    </AppLayout>
  );

  const isProfit = data.netProfit >= 0;

  const plRows = [
    { label: "Gross Sales Margin",  value: plData.grossMargin,    color: "text-[#2a6c4a]", sign: "+" },
    { label: "Interest Earned",     value: plData.interestEarned, color: "text-blue-600",  sign: "+" },
    { label: "Total Expenses",      value: plData.totalExpenses,  color: "text-red-500",   sign: "−" },
    { label: "Shrinkage Loss",      value: plData.shrinkageLoss,  color: "text-orange-500",sign: "−" },
  ];

  const chartData = (data.dailyTrend || []).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }));

  return (
    <AppLayout title="Analytics & P&L" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-6 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Business</p>
            <h2 className="text-white text-xl font-bold">Analytics & P&L</h2>
          </div>
          <div className="flex bg-white/10 p-0.5 rounded-full border border-white/20">
            {TIMEFRAMES.map(tf => (
              <button key={tf.id} onClick={() => setGlobalTimeframe(tf)} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${globalTimeframe.id === tf.id ? 'bg-white text-blue-800 shadow-sm' : 'text-white/70 hover:text-white'}`}>{tf.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Net Profit",    value: formatINR(data.netProfit),          color: data.netProfit >= 0 ? "text-green-300" : "text-red-300" },
            { label: "Total Revenue", value: formatINR(data.totalSales),         color: "text-white" },
            { label: "Volume Traded", value: formatWeight(data.volumeTraded),    color: "text-white" },
            { label: "Active Farmers",value: data.activeFarmers,                 color: "text-white" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm">
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
              <p className={`font-black text-xl mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-6 relative z-10">
             {/* Modern Profit & Loss Graph */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Profit & Loss Trend</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => formatINR(val)} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#00E676" strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gross Margin Trend */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Gross Margin Trend</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => formatINR(val)} />
                <Area type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#0EA5E9" strokeWidth={3} fill="url(#colorMargin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Traded (Continuous Area) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Volume Traded</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(1) + 't' : val + 'kg'}`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => formatWeight(val)} />
                <Area type="monotone" dataKey="volume" name="Volume Bought" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Crop by Revenue (Donut) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Crop Revenue Breakdown</h3>
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              {['1D', '1W', '1M', '1Y', 'ALL'].map(i => (
                <button key={i} onClick={() => setCropPieTime(i)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${cropPieTime === i ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{i}</button>
              ))}
            </div>
          </div>
          
          <div className="flex h-56 w-full items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Wheat", value: filterTrendByTime(data.dailyTrend, cropPieTime).reduce((sum, d) => sum + (d.wheat || 0), 0), color: CROP_COLORS.wheat },
                      { name: "Maize", value: filterTrendByTime(data.dailyTrend, cropPieTime).reduce((sum, d) => sum + (d.maize || 0), 0), color: CROP_COLORS.maize },
                      { name: "Rice", value: filterTrendByTime(data.dailyTrend, cropPieTime).reduce((sum, d) => sum + (d.rice || 0), 0), color: CROP_COLORS.rice },
                      { name: "Soybean", value: filterTrendByTime(data.dailyTrend, cropPieTime).reduce((sum, d) => sum + (d.soybean || 0), 0), color: CROP_COLORS.soybean },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: "Wheat", color: CROP_COLORS.wheat },
                      { name: "Maize", color: CROP_COLORS.maize },
                      { name: "Rice", color: CROP_COLORS.rice },
                      { name: "Soybean", color: CROP_COLORS.soybean },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => formatINR(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col justify-center pl-4 gap-3 border-l border-gray-100">
              {[
                { name: "Wheat", key: "wheat", color: CROP_COLORS.wheat },
                { name: "Maize", key: "maize", color: CROP_COLORS.maize },
                { name: "Rice", key: "rice", color: CROP_COLORS.rice },
                { name: "Soybean", key: "soybean", color: CROP_COLORS.soybean },
              ].map(c => {
                const val = filterTrendByTime(data.dailyTrend, cropPieTime).reduce((sum, d) => sum + (d[c.key] || 0), 0);
                return (
                  <div key={c.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
                      <span className="text-gray-600 font-medium">{c.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatINR(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expenses Breakdown (Donut) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Expenses Breakdown</h3>
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              {['1D', '1W', '1M', '1Y', 'ALL'].map(i => (
                <button key={i} onClick={() => setExpPieTime(i)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${expPieTime === i ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{i}</button>
              ))}
            </div>
          </div>

          <div className="flex h-56 w-full items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Palledari", value: filterTrendByTime(data.dailyTrend, expPieTime).reduce((sum, d) => sum + (d.palledari || 0), 0), color: EXPENSE_COLORS.palledari },
                      { name: "Bhada", value: filterTrendByTime(data.dailyTrend, expPieTime).reduce((sum, d) => sum + (d.bhada || 0), 0), color: EXPENSE_COLORS.bhada },
                      { name: "Misc", value: filterTrendByTime(data.dailyTrend, expPieTime).reduce((sum, d) => sum + (d.misc || 0), 0), color: EXPENSE_COLORS.misc },
                      { name: "Salary", value: filterTrendByTime(data.dailyTrend, expPieTime).reduce((sum, d) => sum + (d.salary || 0), 0), color: EXPENSE_COLORS.salary },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: "Palledari", color: EXPENSE_COLORS.palledari },
                      { name: "Bhada", color: EXPENSE_COLORS.bhada },
                      { name: "Misc", color: EXPENSE_COLORS.misc },
                      { name: "Salary", color: EXPENSE_COLORS.salary },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => formatINR(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col justify-center pl-4 gap-3 border-l border-gray-100">
              {[
                { name: "Palledari", key: "palledari", color: EXPENSE_COLORS.palledari },
                { name: "Bhada", key: "bhada", color: EXPENSE_COLORS.bhada },
                { name: "Misc", key: "misc", color: EXPENSE_COLORS.misc },
                { name: "Salary", key: "salary", color: EXPENSE_COLORS.salary },
              ].map(c => {
                const val = filterTrendByTime(data.dailyTrend, expPieTime).reduce((sum, d) => sum + (d[c.key] || 0), 0);
                return (
                  <div key={c.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
                      <span className="text-gray-600 font-medium">{c.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{formatINR(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] divide-y divide-gray-50">
          <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-700 rounded-t-3xl">
            <h3 className="font-bold text-white mb-1">P&L Summary</h3>
            <p className="text-white/60 text-xs font-semibold uppercase">{plData.season}</p>
          </div>
          {plRows.map(r => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-600">{r.label}</span>
              <span className={`font-bold text-base ${r.color}`}>{r.sign}{formatINR(r.value)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-b-3xl">
            <span className="font-bold text-gray-900">Net Profit</span>
            <span className={`font-bold text-xl ${plData.netProfit >= 0 ? "text-[#2a6c4a]" : "text-red-500"}`}>{formatINR(plData.netProfit)}</span>
          </div>
        </div>

        {/* Volume Stats */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-5">
          <h3 className="font-bold text-gray-900 mb-3">Volume Summary</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Bought",    value: formatWeight(plData.totalBought),   color: "text-[#2a6c4a]" },
              { label: "Sold",      value: formatWeight(plData.totalSold),     color: "text-blue-600"  },
              { label: "Shrinkage", value: formatWeight(plData.shrinkageKg),   color: "text-orange-500"},
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`font-bold text-base ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
