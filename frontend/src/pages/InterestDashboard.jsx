import React, { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { AlertCircle, TrendingUp, Users, Search } from "lucide-react";
import { getAvatarColor, getInitials } from "../lib/crop.js";
import { Link } from "wouter";

const TIMEFRAMES = [
  { id: '1d', label: '1D', days: 1 },
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'ALL', days: null }
];

export default function InterestDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalTimeframe, setGlobalTimeframe] = useState(TIMEFRAMES[4]);

  const [debtors, setDebtors] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const getLocalYYYYMMDD = (dateObj) => {
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    let qs = "";
    if (globalTimeframe.days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (globalTimeframe.days - 1));
      qs = `?startDate=${getLocalYYYYMMDD(start)}&endDate=${getLocalYYYYMMDD(end)}`;
    }

    Promise.all([
      api.get(`/dashboard/interest${qs}`),
      api.get(`/dashboard/interest/debtors?search=${debouncedSearch}&page=1`)
    ]).then(([interestData, debtorsData]) => {
      setData(interestData);
      setDebtors(debtorsData.debtors);
      setPage(1);
      setHasMore(debtorsData.page < debtorsData.pages);
    }).finally(() => setLoading(false));
  }, [debouncedSearch, globalTimeframe]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await api.get(`/dashboard/interest/debtors?search=${debouncedSearch}&page=${nextPage}`);
      setDebtors(prev => [...prev, ...res.debtors]);
      setPage(res.page);
      setHasMore(res.page < res.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(p => p + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (page > 1) loadMore();
  }, [page]);

  if (loading || !data) return (
    <AppLayout title="Interest Tracking">
      <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
    </AppLayout>
  );

  return (
    <AppLayout title="Interest Dashboard" showBack={true}>
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Financial Operations</p>
            <h2 className="text-white text-xl font-bold">Interest Projections</h2>
          </div>
          <div className="flex bg-white/10 p-0.5 rounded-full border border-white/20">
            {TIMEFRAMES.map(tf => (
              <button key={tf.id} onClick={() => setGlobalTimeframe(tf)} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${globalTimeframe.id === tf.id ? 'bg-white text-blue-800 shadow-sm' : 'text-white/70 hover:text-white'}`}>{tf.label}</button>
            ))}
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm col-span-2 flex items-center justify-between">
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Total Outstanding Debt</p>
              <p className="font-black text-3xl mt-1 text-white">{formatINR(data.outstandingInterest)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp size={32} className="text-green-300" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Lifetime Accrued</p>
            <p className="font-black text-lg mt-1 text-blue-200">{formatINR(data.totalAccrued)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Recovered</p>
            <p className="font-black text-lg mt-1 text-green-300">{formatINR(data.totalRecovered)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-6 relative z-10 pb-28">
        
        {/* Universal Interest Trend Graph */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Interest Trend</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Accrued interest over time</p>
            </div>
          </div>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="shadowTrend" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#8b5cf6" floodOpacity="0.2"/>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px' }} 
                  formatter={(value) => [formatINR(value), 'Interest Accrued']}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" filter="url(#shadowTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Bar Chart: Accrued vs Recovered */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 mt-5">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Earned vs Collected Interest</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">What we earned vs what we actually got paid</p>
          </div>
          
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} 
                  formatter={(value) => formatINR(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="amount" name="Earned" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="recovered" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Debt Composition Pie Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="font-bold text-gray-900 text-lg">Money Distributed</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Principal vs Interest Breakdown</p>
          </div>
          <div className="flex items-center h-48 mt-2">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: "Principal", value: data.totalAdvances },
                      { name: "Interest", value: data.outstandingInterest }
                    ]} 
                    dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={65} stroke="#ffffff" strokeWidth={3} paddingAngle={0}
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip formatter={(value) => formatINR(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col gap-4 justify-center pl-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3.5 h-3.5 rounded-md bg-indigo-500 shadow-sm"></div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Principal</span>
                </div>
                <p className="text-base font-black text-gray-900">{formatINR(data.totalAdvances)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-sm"></div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interest</span>
                </div>
                <p className="text-base font-black text-gray-900">{formatINR(data.outstandingInterest)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Debtors Search Header */}
        <div className="mt-8 mb-3 px-1 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Defaulting Accounts</h3>
          <Users size={18} className="text-gray-400" />
        </div>
        
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            placeholder="Search debtors by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Top Debtors Leaderboard Cards */}
        <div className="flex flex-col gap-3">
          {debtors.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm font-bold">No outstanding advances found</p>
          ) : (
            debtors.map((farmer, idx) => {
              const isLast = idx === debtors.length - 1;
              return (
                <Link key={farmer._id} href={`/farmers/${farmer._id}`}>
                  <div ref={isLast ? lastElementRef : null} className="p-4 bg-white rounded-3xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner ${getAvatarColor(farmer.name)}`}>
                        {getInitials(farmer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{farmer.name}</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">{farmer.phone}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-black text-red-500 text-base">{formatINR(farmer.totalOwed)}</p>
                      <div className="flex flex-col items-end gap-1 mt-0.5">
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shadow-sm">
                          Adv: {formatINR(farmer.advanceAmount)}
                        </span>
                        <span className="text-[9px] font-bold bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded shadow-sm">
                          Int: {formatINR(farmer.accruedInterest)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
          
          {loadingMore && (
            <div className="py-6 flex justify-center items-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
