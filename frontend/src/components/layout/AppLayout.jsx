import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, Users, Plus, Wallet, User, Scale, Factory, ArrowLeft, LogOut, CloudOff, CloudSync
} from "lucide-react";
import { getQueue, syncQueue } from "../../lib/offlineSync.js";
import { api } from "../../lib/api.js";

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

import { decodeToken } from "../../lib/jwt.js";
import SaafHisaabLogo from "../../pages/SaafHisaabLogo.jsx";
import ToastListener from "./ToastListener.jsx";

export default function AppLayout({ children, title, showBack, munsiMode }) {
  const [location, navigate] = useLocation();
  
  const token = localStorage.getItem("accessToken");
  let role = "munsi";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || "munsi";
  }

  const isMunsi = role === "munsi";
  const isLabour = role === "labour";
  const isSeth = role === "seth";
  const nav = isLabour ? [] : (isMunsi ? MUNSI_NAV : SETH_NAV);

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
    localStorage.removeItem("token");
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">

      <div className="w-full max-w-[480px] flex flex-col min-h-screen bg-gray-50 relative shadow-2xl">
      
        {/* Toast Popup */}
  
      <ToastListener/>
        {/* Top Bar */}
      
<header className=" bg-gradient-to-t from-blue-900 to-gray-900  text-white px-5 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] border-b border-white/10 backdrop-blur-md">
  
  {showBack && (
    <button 
      onClick={() => history.back()} 
      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-blue-500/20 text-cyan-400 transition-all border border-white/10"
    >
      <ArrowLeft size={18} />
    </button>
  )}

  <div className="flex-1 flex items-center gap-3">
    {/* Logo */}
    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-blue-900/20 rounded-full border border-blue-500/20">
       <SaafHisaabLogo size={28} animated={false} />
    </div>

    {/* Title Group - Font & Gradient Styling */}
    <div className="flex flex-col gap-1">
      <span className="text-[12px] uppercase tracking-[0.3em] font-black text-emerald-300 ">
        {title}
      </span>
      <span className="text-[18px] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 leading-none">
        Saaf<span className="text-cyan-400">Hisaab</span>
      </span>
    </div>

    {isOffline && (
      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 font-black ml-auto shadow-[0_0_10px_rgba(239,68,68,0.2)]">
        <CloudOff size={10} strokeWidth={3} /> Offline
      </span>
    )}
  </div>
  
  {/* Pending Sync Button - Subtle Glow */}
  {queueCount > 0 && (
    <button 
      onClick={() => syncQueue()} 
      disabled={isSyncing} 
      className={`text-[10px] px-4 py-1.5 rounded-full font-black flex items-center gap-2 border transition-all shadow-sm ${
        isSyncing 
          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
          : 'bg-orange-500/5 text-orange-300 hover:bg-orange-500/10 border-orange-500/20'
      }`}
    >
      <CloudSync size={12} className={isSyncing ? "animate-spin" : ""} />
      {isSyncing ? "Syncing..." : `${queueCount} Pending`}
    </button>
  )}
</header>
      {/* Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      {!isLabour && (
      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-200 z-30 pb-safe">
        <div className="flex items-center justify-around py-2">
          {nav.map((item, i) =>
            item.fab ? (
              <Link key={i} href="/weigh">
                <div className="w-14 h-14 bg-[#2a6c4a] rounded-full flex items-center justify-center text-white shadow-lg -mt-6 cursor-pointer active:scale-95 transition-transform">
                  {item.icon}
                </div>
              </Link>
            ) : (
              <Link key={i} href={item.path}>
                <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl cursor-pointer transition-colors ${location === item.path ? "text-[#2a6c4a]" : "text-gray-400"}`}>
                  <span className="flex items-center justify-center h-6">{item.icon}</span>
                  <span className="text-[10px] font-semibold">{item.label}</span>
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
