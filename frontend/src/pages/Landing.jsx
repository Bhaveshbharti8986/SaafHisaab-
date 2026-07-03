import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, ChevronRight, Lock, Sparkles, Loader2 } from "lucide-react";
import { decodeToken } from "../lib/jwt.js"; 

const SaafHisaabLogo = ({ className = "w-20 h-20" }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M100 25 L100 165" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
    <circle cx="100" cy="25" r="14" fill="#ffffff" />
    <path d="M100 165 L70 180 L130 180 Z" fill="#ffffff" />
    <path d="M40 70 L160 70" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
    <path d="M40 70 L20 130" stroke="#38bdf8" strokeWidth="4" />
    <path d="M40 70 L60 130" stroke="#38bdf8" strokeWidth="4" />
    <path d="M15 130 C15 150, 65 150, 65 130 Z" fill="#38bdf8" />
    <path d="M160 70 L140 130" stroke="#ffffff" strokeWidth="4" />
    <path d="M160 70 L180 130" stroke="#ffffff" strokeWidth="4" />
    <path d="M135 130 C135 150, 185 150, 185 130 Z" fill="#ffffff" />
    <path d="M40 100 Q30 90 32 80 Q35 90 40 100 Z" fill="#1e3a8a" />
    <path d="M40 100 Q50 90 48 80 Q45 90 40 100 Z" fill="#1e3a8a" />
    <path d="M40 115 Q30 105 32 95 Q35 105 40 115 Z" fill="#1e3a8a" />
    <path d="M40 115 Q50 105 48 95 Q45 105 40 115 Z" fill="#1e3a8a" />
    <path d="M40 130 L40 85" stroke="#1e3a8a" strokeWidth="3" />
    <path d="M142 125 L152 110 L162 118 L172 102" stroke="#1e3a8a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M167 102 L172 102 L172 107" stroke="#1e3a8a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="147" y="100" fill="#1e3a8a" fontSize="16" fontWeight="bold" fontFamily="sans-serif">₹</text>
  </svg>
);

export default function Welcome() {
  const [location, setLocation] = useLocation();
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("accessToken");
    
    if (!token) {
      // Small delay prevents Framer Motion from glitching on instant state changes
      setTimeout(() => {
        if (isMounted) setIsSyncing(false);
      }, 500); 
      return;
    }

    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      try {
        const decoded = decodeToken(token);
        const role = decoded?.role || "seth";

        // Route based on role
        if (role === "seth") {
          // IMPORTANT: Ensure your main App router handles "/" properly
          setLocation("/"); 
        } else if (role === "labour") {
          setLocation("/labour");
        } else {
          setLocation("/munsi");
        }
      } catch (err) {
        console.error("Token decoding failed:", err);
        localStorage.removeItem("token");
        setIsSyncing(false); 
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [setLocation]);

  // Prevent rendering if we are already trying to route away from Welcome
  // This stops the UI from flashing before the router catches up.
  if (isSyncing && location !== "/" && location !== "/welcome") {
      return null; 
  }

  return (
    <div className="min-h-[100dvh] bg-blue-900 flex justify-center w-full overflow-hidden font-sans">
      <div className="w-full max-w-md bg-gradient-to-b from-blue-900 to-blue-800 relative flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* Background Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0, 0.4, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-20%] w-72 h-72 bg-blue-400/30 rounded-full blur-[80px] pointer-events-none"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[20%] right-[-20%] w-80 h-80 bg-cyan-400/20 rounded-full blur-[100px] pointer-events-none"
        />

        <div className={`flex-1 flex flex-col items-center p-6 z-10 relative transition-all duration-700 justify-center`}>
          
          <motion.div
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
            className="relative z-20"
          >
            {isSyncing && (
              <motion.div 
                animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.5, 2] }}
                transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity }}
                className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl"
              />
            )}
            
            <div className="w-28 h-28 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.3)] flex items-center justify-center mb-6 relative">
              <SaafHisaabLogo />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-extrabold text-white tracking-tight mb-2"
          >
            Saaf<span className="text-blue-300">Hisaab</span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-bold text-blue-200 tracking-wide mb-4 font-sans"
          >
            साफ़हिसाब
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-4 py-1.5 rounded-full shadow-inner"
          >
            <Sparkles size={14} className="text-blue-300" />
            <span className="text-blue-100 text-xs font-bold uppercase tracking-widest">
              Har Hisaab, Saaf Saaf
            </span>
          </motion.div>

          {/* Loader */}
          <AnimatePresence>
            {isSyncing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-10 flex flex-col items-center gap-3"
              >
                <Loader2 size={24} className="text-blue-300 animate-spin" />
                <span className="text-blue-200/70 text-[10px] font-bold uppercase tracking-widest">
                  Syncing Ledger...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {!isSyncing && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[2.5rem] p-6 pt-8 pb-10 z-20 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] relative"
            >
              <div className="flex items-center justify-center gap-2 mb-8 bg-blue-50 py-2 px-4 rounded-full w-max mx-auto border border-blue-100">
                <ShieldCheck size={18} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">100% Safe & Secure Mandi Ledger</span>
              </div>

              <div className="space-y-4">
                <Link href="/register">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative overflow-hidden bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.25)] flex items-center justify-between group"
                  >
                    <span className="relative z-10">Start Your Ledger</span>
                    <div className="bg-white/20 p-1.5 rounded-xl group-hover:translate-x-1 transition-transform relative z-10">
                      <ArrowRight size={20} className="text-white" />
                    </div>
                  </motion.button>
                </Link>

                <Link href="/login">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white hover:bg-slate-50 transition-colors text-slate-800 font-bold text-lg py-4 px-6 rounded-2xl border-2 border-slate-100 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-50 transition-colors">
                        <Lock size={18} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <span>Staff Login</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
              </div>
              
              <p className="text-center text-[10px] text-slate-400 font-bold mt-8 uppercase tracking-widest">
                Made for Indian Agriculture
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}