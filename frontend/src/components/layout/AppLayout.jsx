import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, Users, Plus, Wallet, User, Scale, Factory, ArrowLeft, LogOut, CloudOff, CloudSync
} from "lucide-react";
import { getQueue, syncQueue } from "../../lib/offlineSync.js";
import { api } from "../../lib/api.js";
import { useTranslation } from "../../lib/i18n.jsx";

const SETH_NAV = [
  { path: "/",          icon: <LayoutDashboard size={20} />, label: "Home"       },
  { path: "/farmers",   icon: <Users size={20} />,           label: "Khata"      },
  { path: null,         icon: <Plus size={28} />,            label: "",          fab: true },
  { path: "/wallets",   icon: <Wallet size={20} />,          label: "Wallet"     },
  { path: "/settings",  icon: <User size={20} />,            label: "Profile"    },
];

const MUNSI_NAV = [
  { path: "/munsi",       icon: <LayoutDashboard size={20} />, label: "Home"    },
  { path: "/weigh",       icon: <Scale size={20} />,           label: "Weigh"   },
  { path: null,           icon: <Plus size={28} />,            label: "",        fab: true },
  { path: "/wallets",     icon: <Wallet size={20} />,          label: "Wallet"  },
  { path: "/settings",    icon: <User size={20} />,            label: "Profile" },
];

const DESKTOP_NAV = {
  seth: [
    { path: "/", icon: <LayoutDashboard size={20} />, label: "Home" },
    { path: "/farmers", icon: <Users size={20} />, label: "Farmer Accounts" },
    { path: "/weigh", icon: <Scale size={20} />, label: "Weigh Crop" },
    { path: "/wallets", icon: <Wallet size={20} />, label: "Wallet" },
    { path: "/expenses", icon: <Factory size={20} />, label: "Expenses" },
    { path: "/rates", icon: <Scale size={20} />, label: "Crop Rates" },
    { path: "/godown", icon: <Factory size={20} />, label: "Warehouse Stock" },
    { path: "/reports", icon: <LayoutDashboard size={20} />, label: "Transactions" },
    { path: "/employees", icon: <Users size={20} />, label: "Manage Staff" },
    { path: "/settings", icon: <User size={20} />, label: "Profile" },
  ],
  munsi: [
    { path: "/munsi", icon: <LayoutDashboard size={20} />, label: "Home" },
    { path: "/weigh", icon: <Scale size={20} />, label: "Weigh Crop" },
    { path: "/farmers", icon: <Users size={20} />, label: "Farmer Accounts" },
    { path: "/expenses", icon: <Factory size={20} />, label: "Expenses" },
    { path: "/godown", icon: <Factory size={20} />, label: "Warehouse Stock" },
    { path: "/wallets", icon: <Wallet size={20} />, label: "Wallet" },
    { path: "/rates", icon: <Scale size={20} />, label: "Crop Rates" },
    { path: "/settings", icon: <User size={20} />, label: "Profile" },
  ],
  labour: [
    { path: "/labour", icon: <LayoutDashboard size={20} />, label: "Home" },
    { path: "/weigh", icon: <Scale size={20} />, label: "Weigh Crop" },
    { path: "/rates", icon: <Scale size={20} />, label: "Crop Rates" },
    { path: "/settings", icon: <User size={20} />, label: "Profile" },
  ],
};

import { decodeToken } from "../../lib/jwt.js";
import SaafHisaabLogo from "../../pages/SaafHisaabLogo.jsx";

export default function AppLayout({ children, title, showBack, munsiMode }) {
  const [location] = useLocation();
  const { t } = useTranslation();
  
  const token = localStorage.getItem("accessToken");
  let role = "munsi";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || "munsi";
  }

  const isMunsi = role === "munsi";
  const isLabour = role === "labour";
  const nav = isLabour ? [] : (isMunsi ? MUNSI_NAV : SETH_NAV);
  const desktopNav = DESKTOP_NAV[isLabour ? "labour" : isMunsi ? "munsi" : "seth"];

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) syncQueue();
    }
    async function updateQueue() {
      const q = await getQueue();
      setQueueCount(q.length);
    }
    function handleSyncStart() { setIsSyncing(true); }
    function handleSyncComplete() { setIsSyncing(false); updateQueue(); }
    
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    window.addEventListener("offlineQueueChanged", updateQueue);
    window.addEventListener("offlineSyncStarted", handleSyncStart);
    window.addEventListener("offlineSyncCompleted", handleSyncComplete);
    
    function handleToast(e) {
      setToast(e.detail);
      setTimeout(() => setToast(null), 2500);
    }
    window.addEventListener("show-toast", handleToast);
    
    updateQueue();
    if (navigator.onLine) syncQueue();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("offlineQueueChanged", updateQueue);
      window.removeEventListener("offlineSyncStarted", handleSyncStart);
      window.removeEventListener("offlineSyncCompleted", handleSyncComplete);
      window.removeEventListener("show-toast", handleToast);
    };
  }, []);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-gray-50 shadow-2xl md:max-w-[1440px]">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 bg-gradient-to-t from-blue-900 to-gray-900 px-4 py-3 text-white shadow-[0_4px_25px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-5 lg:px-7">
          {showBack && (
            <button
              onClick={() => history.back()}
              aria-label={t("Back")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-cyan-400 transition-all hover:bg-blue-500/20"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-900/20">
              <SaafHisaabLogo size={28} animated={false} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300 sm:text-xs sm:tracking-[0.3em]">
                {t(title)}
              </span>
              <span className="text-[15px] font-extrabold leading-none tracking-tight text-transparent bg-gradient-to-r from-white to-blue-200 bg-clip-text sm:text-base">
                Saaf<span className="text-cyan-400">Hisaab</span> Mandi
              </span>
            </div>
            {isOffline && (
              <span className="ml-auto flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-300 sm:px-3">
                <CloudOff size={10} strokeWidth={3} /> {t("Offline")}
              </span>
            )}
          </div>

          {queueCount > 0 && (
            <button
              onClick={() => syncQueue()}
              disabled={isSyncing}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black shadow-sm transition-all sm:px-4 ${
                isSyncing
                  ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                  : "border-orange-500/20 bg-orange-500/5 text-orange-300 hover:bg-orange-500/10"
              }`}
            >
              <CloudSync size={12} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? t("Syncing...") : <>{queueCount} {t("Pending")}</>}
            </button>
          )}
        </header>

        <div className="flex flex-1">
          <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-60 shrink-0 flex-col border-r border-gray-200 bg-white p-3 md:flex">
            <nav aria-label={t("Main navigation")} className="space-y-1">
              {desktopNav.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                    location === item.path ? "bg-blue-50 text-blue-800" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                    <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                    <span>{t(item.label)}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </aside>

          <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 pb-24 md:pb-8">
            {children}
          </main>
        </div>

        {!isLabour && (
          <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-gray-200 bg-white pb-safe md:hidden" aria-label={t("Main navigation")}>
            <div className="flex items-center justify-around py-2">
              {nav.map((item, i) =>
                item.fab ? (
                  <Link key={i} href="/weigh">
                    <div aria-label={t("Record a weighing")} className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#2a6c4a] text-white shadow-lg -mt-6 transition-transform active:scale-95">
                      {item.icon}
                    </div>
                  </Link>
                ) : (
                  <Link key={i} href={item.path}>
                    <div className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-3 py-1 transition-colors ${location === item.path ? "text-[#2a6c4a]" : "text-gray-400"}`}>
                      <span className="flex h-6 items-center justify-center">{item.icon}</span>
                      <span className="text-[10px] font-semibold">{t(item.label)}</span>
                    </div>
                  </Link>
                )
              )}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
