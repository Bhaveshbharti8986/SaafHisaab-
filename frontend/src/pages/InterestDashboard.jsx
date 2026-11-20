import React, { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { AlertCircle, TrendingUp, Search, Banknote, Check, X, ChevronDown, Percent } from "lucide-react";
import { getAvatarColor, getInitials } from "../lib/crop.js";
import { Link } from "wouter";
import { useTranslation } from "../lib/i18n.jsx";
import { showToast } from "../lib/toast.js";

const TIMEFRAMES = [
  { id: '1d', label: '1D', days: 1 },
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'ALL', days: null }
];

export default function InterestDashboard() {
  const { t } = useTranslation();
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
  const [advanceRefreshKey, setAdvanceRefreshKey] = useState(0);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceSearch, setAdvanceSearch] = useState("");
  const [advanceCandidates, setAdvanceCandidates] = useState([]);
  const [advanceSearchCursor, setAdvanceSearchCursor] = useState(null);
  const [advanceSearchLoading, setAdvanceSearchLoading] = useState(false);
  const [advanceSearchMoreLoading, setAdvanceSearchMoreLoading] = useState(false);
  const [advanceSearchError, setAdvanceSearchError] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advancePaymentMode, setAdvancePaymentMode] = useState("Cash");
  const [advancePaidBy, setAdvancePaidBy] = useState("seth");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [savingAdvance, setSavingAdvance] = useState(false);
  const advanceLookupRequestId = useRef(0);
  const [expandedInterestFarmerId, setExpandedInterestFarmerId] = useState(null);
  const [interestRateDrafts, setInterestRateDrafts] = useState({});
  const [savingInterestRate, setSavingInterestRate] = useState(false);
  const interestRateSaveLock = useRef(false);

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
  }, [debouncedSearch, globalTimeframe, advanceRefreshKey]);

  useEffect(() => {
    const requestId = ++advanceLookupRequestId.current;
    const query = advanceSearch.trim();
    setAdvanceSearchMoreLoading(false);

    if (!advanceModalOpen || selectedFarmer || query.length < 2) {
      setAdvanceCandidates([]);
      setAdvanceSearchCursor(null);
      setAdvanceSearchError("");
      setAdvanceSearchLoading(false);
      return undefined;
    }

    setAdvanceCandidates([]);
    setAdvanceSearchCursor(null);
    setAdvanceSearchError("");
    setAdvanceSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: query });
        const result = await api.get(`/farmers/advance-picker?${params.toString()}`);
        if (advanceLookupRequestId.current !== requestId) return;
        setAdvanceCandidates(result.farmers);
        setAdvanceSearchCursor(result.nextCursor);
      } catch (err) {
        if (advanceLookupRequestId.current === requestId) {
          setAdvanceSearchError(err.message || t("Could not search farmers."));
        }
      } finally {
        if (advanceLookupRequestId.current === requestId) setAdvanceSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (advanceLookupRequestId.current === requestId) advanceLookupRequestId.current += 1;
    };
  }, [advanceModalOpen, advanceSearch, selectedFarmer, t]);

  const openAdvanceModal = (farmer = null) => {
    setSelectedFarmer(farmer);
    setAdvanceSearch("");
    setAdvanceCandidates([]);
    setAdvanceSearchCursor(null);
    setAdvanceSearchError("");
    setAdvanceAmount("");
    setAdvancePaymentMode("Cash");
    setAdvancePaidBy("seth");
    setAdvanceNotes("");
    setAdvanceModalOpen(true);
  };

  const loadMoreAdvanceCandidates = async () => {
    if (!advanceSearchCursor || advanceSearchMoreLoading) return;
    const requestId = advanceLookupRequestId.current;
    setAdvanceSearchMoreLoading(true);
    setAdvanceSearchError("");
    try {
      const params = new URLSearchParams({
        search: advanceSearch.trim(),
        cursor: advanceSearchCursor,
      });
      const result = await api.get(`/farmers/advance-picker?${params.toString()}`);
      if (advanceLookupRequestId.current !== requestId) return;
      setAdvanceCandidates(current => [...current, ...result.farmers]);
      setAdvanceSearchCursor(result.nextCursor);
    } catch (err) {
      if (advanceLookupRequestId.current === requestId) {
        setAdvanceSearchError(err.message || t("Could not search farmers."));
      }
    } finally {
      if (advanceLookupRequestId.current === requestId) setAdvanceSearchMoreLoading(false);
    }
  };

  const submitAdvance = async (event) => {
    event.preventDefault();
    const amount = Number(advanceAmount);
    if (!selectedFarmer || !Number.isFinite(amount) || amount <= 0) {
      showToast("error", t("Enter an advance amount greater than zero."));
      return;
    }

    setSavingAdvance(true);
    try {
      const result = await api.post("/transactions", {
        farmerId: selectedFarmer._id,
        type: "advance",
        amount,
        paymentMode: advancePaymentMode,
        paidBy: advancePaidBy,
        notes: advanceNotes.trim() || null,
      });
      if (result?._offline) {
        showToast("success", t("Advance saved offline and will sync when online."));
      } else {
        showToast("success", t("Advance recorded successfully"));
        setAdvanceRefreshKey(key => key + 1);
      }
      setAdvanceModalOpen(false);
    } catch (err) {
      showToast("error", err.message || t("Failed to record advance"));
    } finally {
      setSavingAdvance(false);
    }
  };

  const updateInterestRateDraft = (farmerId, value) => {
    setInterestRateDrafts(current => ({ ...current, [farmerId]: Number(value) }));
  };

  const saveInterestRate = async (farmer, value) => {
    const rate = Number(value);
    if (!Number.isFinite(rate) || interestRateSaveLock.current) return;

    const chargeInterest = rate > 0;
    const previousRate = Number(farmer.interestRate || 0);
    const previousChargeInterest = Boolean(farmer.chargeInterest);
    if (rate === previousRate && chargeInterest === previousChargeInterest) {
      setInterestRateDrafts(current => {
        const next = { ...current };
        delete next[farmer._id];
        return next;
      });
      return;
    }

    interestRateSaveLock.current = true;
    setSavingInterestRate(true);
    try {
      const result = await api.patch(`/farmers/${farmer._id}`, { interestRate: rate, chargeInterest });
      setDebtors(current => current.map(item => (
        item._id === farmer._id ? { ...item, interestRate: rate, chargeInterest } : item
      )));
      setInterestRateDrafts(current => {
        const next = { ...current };
        delete next[farmer._id];
        return next;
      });
      showToast(
        "success",
        result?._offline
          ? t("Interest rate saved offline and will sync when online.")
          : t("Interest rate updated successfully")
      );
    } catch (err) {
      setInterestRateDrafts(current => {
        const next = { ...current };
        delete next[farmer._id];
        return next;
      });
      showToast("error", err.message || t("Could not update interest rate"));
    } finally {
      interestRateSaveLock.current = false;
      setSavingInterestRate(false);
    }
  };

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
    <AppLayout title={t("Interest Tracking")}>
      <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
    </AppLayout>
  );

  return (
    <AppLayout title={t("Interest Dashboard")} showBack={true}>
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">{t("Financial Operations")}</p>
            <h2 className="text-white text-xl font-bold">{t("Interest Projections")}</h2>
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
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{t("Total Outstanding Debt")}</p>
              <p className="font-black text-3xl mt-1 text-white">{formatINR(data.outstandingInterest)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp size={32} className="text-green-300" />
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{t("Lifetime Accrued")}</p>
            <p className="font-black text-lg mt-1 text-blue-200">{formatINR(data.totalAccrued)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{t("Recovered")}</p>
            <p className="font-black text-lg mt-1 text-green-300">{formatINR(data.totalRecovered)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-6 relative z-10 pb-28">
        
        {/* Universal Interest Trend Graph */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{t("Interest Trend")}</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{t("Accrued interest over time")}</p>
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
                  formatter={(value) => [formatINR(value), t("Interest Accrued")]}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" filter="url(#shadowTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Bar Chart: Accrued vs Recovered */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 mt-5">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">{t("Earned vs Collected Interest")}</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{t("What we earned vs what we actually got paid")}</p>
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
                <Bar dataKey="amount" name={t("Earned")} fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar dataKey="recovered" name={t("Collected")} fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Debt Composition Pie Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="font-bold text-gray-900 text-lg">{t("Money Distributed")}</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{t("Principal vs Interest Breakdown")}</p>
          </div>
          <div className="flex items-center h-48 mt-2">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: t("Principal"), value: data.totalAdvances },
                      { name: t("Interest"), value: data.outstandingInterest }
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
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Principal")}</span>
                </div>
                <p className="text-base font-black text-gray-900">{formatINR(data.totalAdvances)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-sm"></div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Interest")}</span>
                </div>
                <p className="text-base font-black text-gray-900">{formatINR(data.outstandingInterest)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Debtors Search Header */}
        <div className="mt-8 mb-3 px-1 flex items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900 text-lg">{t("Defaulting Accounts")}</h3>
          <button
            type="button"
            onClick={() => openAdvanceModal()}
            disabled={savingInterestRate}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#2a6c4a] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#235b3e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6c4a]/40 disabled:opacity-50"
          >
            <Banknote size={16} />
            {t("Give Advance")}
          </button>
        </div>
        
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            placeholder={t("Search debtors by name or phone...")}
            aria-label={t("Search debtors by name or phone")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Top Debtors Leaderboard Cards */}
        <div className="flex flex-col gap-3">
          {debtors.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm font-bold">{t("No outstanding advances found")}</p>
          ) : (
            debtors.map((farmer, idx) => {
              const isLast = idx === debtors.length - 1;
              const isInterestExpanded = expandedInterestFarmerId === farmer._id;
              const interestRate = interestRateDrafts[farmer._id] ?? Number(farmer.interestRate || 0);
              const chargeInterest = interestRate > 0;
              const advancePrincipal = Number(farmer.advanceAmount || 0);
              const monthlyInterest = chargeInterest
                ? Math.round(advancePrincipal * interestRate / 100 * 100) / 100
                : 0;
              const interestPanelId = `interest-rate-${farmer._id}`;
              return (
                <div
                  key={farmer._id}
                  ref={isLast ? lastElementRef : null}
                  className="rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Link
                          href={`/farmers/${farmer._id}`}
                          aria-label={`${t("Open farmer account")}: ${farmer.name}`}
                          className="shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6c4a]/40"
                        >
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow-inner ${getAvatarColor(farmer.name)}`}>
                            {getInitials(farmer.name)}
                          </div>
                        </Link>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">{farmer.name}</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">{farmer.phone}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{t("Outstanding balance")}</p>
                        <p className="mt-0.5 text-base font-black text-red-500">{formatINR(farmer.totalOwed)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2">
                        <span className="text-[10px] font-semibold text-amber-700">{t("Adv")}</span>
                        <span className="truncate text-[11px] font-bold text-amber-900">{formatINR(farmer.advanceAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-pink-50 px-3 py-2">
                        <span className="text-[10px] font-semibold text-pink-700">{t("Int")}</span>
                        <span className="truncate text-[11px] font-bold text-pink-900">{formatINR(farmer.accruedInterest)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openAdvanceModal(farmer)}
                      disabled={savingInterestRate}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2 py-2.5 text-[11px] font-bold text-[#2a6c4a] transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6c4a]/30 disabled:opacity-50"
                    >
                      <Banknote size={15} className="shrink-0" />
                      <span className="truncate">{t("Give Advance")}</span>
                    </button>
                    <button
                      type="button"
                      aria-expanded={isInterestExpanded}
                      aria-controls={interestPanelId}
                      aria-label={`${t("Monthly interest rate")}: ${interestRate}%`}
                      onClick={() => setExpandedInterestFarmerId(isInterestExpanded ? null : farmer._id)}
                      disabled={savingInterestRate}
                      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-2 py-2.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 disabled:opacity-50"
                    >
                      <Percent size={14} className="shrink-0" />
                      <span className="truncate">{t("Interest rate")}</span>
                      <span className="shrink-0">{interestRate}%</span>
                      <ChevronDown size={14} className={`shrink-0 transition-transform ${isInterestExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  <div
                    id={interestPanelId}
                    hidden={!isInterestExpanded}
                    className="mt-3 space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <label htmlFor={`${interestPanelId}-slider`} className="text-xs font-bold text-gray-900">{t("Monthly interest rate")}</label>
                        <p className="mt-1 text-[11px] text-gray-500">{t("Choose 0% to stop interest.")}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-extrabold text-amber-800">
                        {interestRate}% / {t("month")}
                      </span>
                    </div>
                    <input
                      id={`${interestPanelId}-slider`}
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={interestRate}
                      disabled={savingInterestRate}
                      aria-label={`${farmer.name}: ${t("Monthly interest rate")}`}
                      onChange={event => updateInterestRateDraft(farmer._id, event.target.value)}
                      onPointerUp={event => saveInterestRate(farmer, event.currentTarget.value)}
                      onKeyUp={event => saveInterestRate(farmer, event.currentTarget.value)}
                      className="w-full cursor-pointer accent-amber-500 disabled:cursor-wait"
                    />
                    <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                      <span>0%</span>
                      <span>5%</span>
                    </div>
                    {chargeInterest ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5">
                        <div>
                          <p className="text-[11px] font-bold text-amber-900">{t("Estimated monthly interest")}</p>
                          <p className="mt-0.5 text-[10px] text-amber-800">
                            {formatINR(advancePrincipal)} × {interestRate}% / {t("month")}
                          </p>
                        </div>
                        <p className="shrink-0 text-base font-extrabold text-amber-800">{formatINR(monthlyInterest)}</p>
                      </div>
                    ) : (
                      <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-medium text-emerald-800">
                        {t("No monthly interest at 0%.")}
                      </p>
                    )}
                  </div>
                </div>
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

      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="advance-modal-title"
            className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2a6c4a]">{t("Interest Dashboard")}</p>
                <h3 id="advance-modal-title" className="mt-1 text-lg font-bold text-gray-900">{t("Give Advance")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(false)}
                disabled={savingAdvance}
                aria-label={t("Close transaction form")}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {!selectedFarmer ? (
              <div className="space-y-3">
                <label htmlFor="advance-farmer-search" className="text-xs font-bold text-gray-600">{t("Select farmer")}</label>
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="advance-farmer-search"
                    type="search"
                    maxLength={80}
                    value={advanceSearch}
                    onChange={event => setAdvanceSearch(event.target.value)}
                    placeholder={t("Search farmer by name or phone...")}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#2a6c4a] focus:ring-2 focus:ring-[#2a6c4a]/15"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] leading-4 text-gray-500">{t("Search names or phones from the beginning (2+ characters).")}</p>

                {advanceSearchError && (
                  <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                    <AlertCircle size={15} />
                    {advanceSearchError}
                  </p>
                )}
                {advanceSearchLoading && (
                  <div className="flex items-center justify-center gap-2 py-5 text-xs font-medium text-gray-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#2a6c4a]" />
                    {t("Searching farmers...")}
                  </div>
                )}
                {!advanceSearchLoading && advanceSearch.trim().length >= 2 && !advanceSearchError && advanceCandidates.length === 0 && (
                  <p className="rounded-xl bg-gray-50 px-3 py-5 text-center text-xs text-gray-500">{t("No farmers found. Try another name or phone number.")}</p>
                )}

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {advanceCandidates.map(farmer => (
                    <button
                      type="button"
                      key={farmer._id}
                      onClick={() => setSelectedFarmer(farmer)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6c4a]/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-gray-900">{farmer.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-gray-500">{farmer.phone || farmer.village || t("Phone not provided")}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs font-bold text-amber-800">{formatINR(Number(farmer.advanceAmount || 0) + Number(farmer.accruedInterest || 0))}</span>
                        <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-semibold text-[#2a6c4a]">
                          {t("Select farmer")} <Check size={12} />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {advanceSearchCursor && (
                  <button
                    type="button"
                    onClick={loadMoreAdvanceCandidates}
                    disabled={advanceSearchMoreLoading}
                    className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {advanceSearchMoreLoading ? t("Searching farmers...") : t("Load more farmers")}
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={submitAdvance} className="space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{selectedFarmer.name}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{selectedFarmer.phone || selectedFarmer.village || t("Phone not provided")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFarmer(null);
                        setAdvanceAmount("");
                        setAdvanceNotes("");
                      }}
                      disabled={savingAdvance}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-[#2a6c4a] hover:bg-white"
                    >
                      {t("Change farmer")}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2.5 text-xs">
                    <span className="text-gray-600">{t("Outstanding balance")}</span>
                    <span className="font-bold text-gray-900">
                      {formatINR(Number(selectedFarmer.advanceAmount || 0) + Number(selectedFarmer.accruedInterest || 0))}
                    </span>
                    <span className="text-gray-600">{t("Interest")}</span>
                    <span className="font-bold text-amber-800">
                      {selectedFarmer.chargeInterest && Number(selectedFarmer.interestRate) > 0
                        ? `${selectedFarmer.interestRate}% / ${t("month")}`
                        : t("Interest paused")}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="interest-advance-amount" className="mb-1 block text-xs font-bold text-gray-600">{t("Advance amount (₹)")}</label>
                  <input
                    id="interest-advance-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={advanceAmount}
                    onChange={event => setAdvanceAmount(event.target.value)}
                    disabled={savingAdvance}
                    placeholder={t("e.g. 5000")}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg font-bold outline-none focus:border-[#2a6c4a]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="interest-advance-mode" className="mb-1 block text-xs font-bold text-gray-600">{t("Payment Mode")}</label>
                    <select
                      id="interest-advance-mode"
                      value={advancePaymentMode}
                      onChange={event => setAdvancePaymentMode(event.target.value)}
                      disabled={savingAdvance}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#2a6c4a]"
                    >
                      {["Cash", "UPI", "PhonePe", "GPay", "Paytm"].map(mode => (
                        <option key={mode} value={mode}>{t(mode === "GPay" ? "Google Pay" : mode)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-bold text-gray-600">{t("Paid by")}</span>
                    <div role="group" aria-label={t("Paid by")} className="flex rounded-xl bg-gray-100 p-1">
                      {[
                        { value: "seth", label: t("Owner") },
                        { value: "munsi", label: t("Staff") },
                      ].map(payer => (
                        <button
                          key={payer.value}
                          type="button"
                          onClick={() => setAdvancePaidBy(payer.value)}
                          disabled={savingAdvance}
                          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                            advancePaidBy === payer.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                          }`}
                        >
                          {payer.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] leading-4 text-gray-500">{t("This records the selected method; it does not transfer money.")}</p>

                <div>
                  <label htmlFor="interest-advance-notes" className="mb-1 block text-xs font-bold text-gray-600">{t("Notes (Optional)")}</label>
                  <input
                    id="interest-advance-notes"
                    type="text"
                    maxLength={250}
                    value={advanceNotes}
                    onChange={event => setAdvanceNotes(event.target.value)}
                    disabled={savingAdvance}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#2a6c4a]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAdvance || !Number.isFinite(Number(advanceAmount)) || Number(advanceAmount) <= 0}
                  className="w-full rounded-xl bg-[#2a6c4a] py-3.5 text-sm font-bold text-white transition hover:bg-[#235b3e] disabled:opacity-50"
                >
                  {savingAdvance ? t("Processing...") : t("Confirm Transaction")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
