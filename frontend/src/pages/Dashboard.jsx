import React, { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Scale, Banknote, IndianRupee, Users, Factory, BookOpen, Wallet, Truck, LineChart, PieChart, TrendingDown, Settings, UserCircle, Receipt, Percent } from "lucide-react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR, formatWeight } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { useTranslation } from "../lib/i18n.jsx";

export default function Dashboard() {
  const { t } = useTranslation();
  const [summary, setSummary]   = useState({ 
    todayPurchaseKg: 0, 
    todaySpend: 0, 
    sethWalletBalance: 0, 
    munsiCashBalance: 0,
    activeFarmers: 0,
    totalFarmers: 0,
  });
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || loading || !summary) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // If reached the end (with a tiny threshold for rounding issues), go back to start
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Scroll one card over (~160px)
          scrollRef.current.scrollBy({ left: 160, behavior: "smooth" });
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isHovered, loading, summary]);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/weight-entries?status=pending"),
    ]).then(([s, pe]) => {
      setSummary(s);
      setPending(pe);
      setSummaryLoaded(true);
    }).finally(() => setLoading(false));
  }, []);

  const stats = summary ? [
    { label: "Profit after costs", hint: "Today's estimate", value: formatINR(summary.todayNetProfit || 0), icon: <IndianRupee className={summary.todayNetProfit < 0 ? "text-red-300" : "text-green-300"} size={24} />, valueClass: summary.todayNetProfit < 0 ? "text-red-400" : "text-white" },
    { label: "Cash paid out", hint: "Purchases, expenses and payouts", value: formatINR(summary.todayCashOutflow), icon: <Wallet className="text-red-300" size={24} /> },
    { label: "Crop purchase value", hint: "Total spent buying crops", value: formatINR(summary.todayKharedi), icon: <Banknote className="text-orange-200" size={24} /> },
    { label: "Crop weight bought", hint: "Total weight purchased today", value: formatWeight(summary.todayPurchaseKg), icon: <Scale className="text-blue-200" size={24} /> },
  ] : [];

  return (
    <AppLayout title="Mandi Owner Dashboard">
      <div className="flex min-h-[calc(100vh-56px)] flex-col bg-gray-50 pb-24 lg:pb-8">
        
        {/* Top Header Section (PhonePe / Native App Style) */}
        <div className="relative z-0 rounded-b-[2rem] bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 shadow-md lg:px-8">
          <div className="flex justify-between items-center mb-4 px-1">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-200">{t("Mandi Overview")}</p>
              <h2 className="text-xl font-bold text-white">{t("Today at a glance")}</h2>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-none lg:grid lg:grid-cols-4 lg:overflow-visible"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
          >
            {loading
              ? [1,2].map(i => <div key={i} className="shrink-0 w-40 h-24 bg-white/10 rounded-2xl animate-pulse" />)
              : stats.map((s, i) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.15, ease: "easeOut" }}
                  className="min-w-[150px] shrink-0 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur-md lg:min-w-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 p-1.5 rounded-lg">{s.icon}</span>
                    <p className="text-[10px] font-semibold leading-tight text-blue-100">{t(s.label)}</p>
                  </div>
                  <p className={`font-bold text-2xl ${s.valueClass || "text-white"}`}>{s.value}</p>
                  <p className="mt-1 text-[10px] font-medium leading-tight text-blue-100/80">{t(s.hint)}</p>
                </motion.div>
              ))
            }
          </div>
        </div>

        <div className="relative z-10 -mt-6 space-y-5 px-4 lg:px-8">
          
          {summaryLoaded && summary.totalFarmers === 0 && (
            <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.04)]">
              <h2 className="font-bold text-gray-900">{t("Start setting up your mandi")}</h2>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                {t("Add a farmer, set crop rates, then record your first weighing.")}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Link href="/farmers" className="rounded-xl bg-blue-50 px-2 py-2.5 text-center text-xs font-bold leading-4 text-blue-800">
                  {t("1. Add a farmer")}
                </Link>
                <Link href="/rates" className="rounded-xl bg-blue-50 px-2 py-2.5 text-center text-xs font-bold leading-4 text-blue-800">
                  {t("2. Set crop rates")}
                </Link>
                <Link href="/weigh" className="rounded-xl bg-blue-50 px-2 py-2.5 text-center text-xs font-bold leading-4 text-blue-800">
                  {t("3. Record a weighing")}
                </Link>
              </div>
            </section>
          )}

          {/* Wallet Section (Floating White Cards) */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/wallets">
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden active:scale-95 transition-transform">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-full"><UserCircle size={20} /></div>
                </div>
                <p className="mb-0.5 text-xs font-semibold text-gray-500">{t("Owner's Balance")}</p>
                <p className={`text-lg font-bold ${summary.sethWalletBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatINR(summary.sethWalletBalance)}</p>
              </div>
            </Link>
            <Link href="/wallets">
              <div className="bg-white rounded-2xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden active:scale-95 transition-transform">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-full"><Wallet size={20} /></div>
                </div>
                <p className="mb-0.5 text-xs font-semibold text-gray-500">{t("Staff Cash Balance")}</p>
                <p className={`text-lg font-bold ${summary.munsiCashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatINR(summary.munsiCashBalance)}</p>
              </div>
            </Link>
          </div>

          {/* Quick Access (Single White Card Grid like Paytm/GPay) */}
          <section>
            <div className="bg-white rounded-3xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 p-4">
              <h2 className="mb-4 px-2 text-sm font-bold text-gray-800">{t("Quick actions")}</h2>
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 xl:grid-cols-5">
                <Link href="/farmers" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                  <span className="text-xs font-semibold text-gray-700">{t("Farmer Accounts")}</span>
                </Link>
                <Link href="/employees" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><UserCircle size={24} /></div>
                  <span className="text-xs font-semibold text-gray-700">{t("Manage Staff")}</span>
                </Link>
                <Link href="/godown" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Factory size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Warehouse Stock")}</span>
                </Link>
                <Link href="/reports" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl"><BookOpen size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Transactions")}</span>
                </Link>

                <Link href="/expenses" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Receipt size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Expenses")}</span>
                </Link>
                <Link href="/b2b" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Truck size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Buyer Dispatches")}</span>
                </Link>
                <Link href="/analytics" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><LineChart size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Business Reports")}</span>
                </Link>
                <Link href="/interest" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Percent size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Interest")}</span>
                </Link>
                <Link href="/rates" className="flex flex-col items-center justify-center gap-2 active:opacity-50 transition-opacity p-3 border border-gray-100 rounded-2xl">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><TrendingDown size={24} /></div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-gray-700">{t("Crop Rates")}</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Pending Approvals (Native List View) */}
          {pending.length > 0 && (
            <section className="pb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold text-gray-800">{t("Weighings to review")}</h2>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{pending.length} {t("Pending")}</span>
              </div>
              <div className="bg-white rounded-3xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                {pending.map((e, index) => (
                  <div key={e._id} className={`p-4 flex flex-col gap-3 ${index !== pending.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900 text-sm mb-0.5">{e.farmerName}</p>
                        <p className="text-[11px] font-medium text-gray-500">{e.cropType} • {e.totalBags} Bags • {formatWeight(e.totalWeight)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">{formatINR(e.netAmount ?? e.totalAmount)}</p>
                        <p className="text-[10px] font-medium text-gray-400">@ ₹{e.ratePerKg}/kg</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          api.post(`/weight-entries/${e._id}/approve`)
                            .then(() => {
                              setPending(p => p.filter(x => x._id !== e._id));
                              showToast("Approved", "success");
                            })
                            .catch(err => showToast(err.message || "Failed to approve", "error"));
                        }}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs transition-colors active:bg-blue-700"
                      >
                        {t("Approve")}
                      </button>
                      <button
                        onClick={() => window.location.href = `/farmers/${e.farmerId}`}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs transition-colors active:bg-gray-200"
                      >
                        {t("Review")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
