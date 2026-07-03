import React, { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import { decodeToken } from "../../lib/jwt.js";

export default function Unlock() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("accessToken");
  let name = "User";
  if (token) {
    const decoded = decodeToken(token);
    name = decoded?.name || "User";
  }

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return showToast("error", "PIN must be 4 digits");
    
    setLoading(true);
    try {
      // The api interceptor automatically attaches the current token
      const res = await api.post("/auth/unlock", { pin });
      
      // Token Rotation: Save the brand new token
      localStorage.setItem("accessToken", res.accessToken);
      sessionStorage.setItem("unlocked", "true");
      
      showToast("success", "Unlocked successfully!");
      window.location.href = "/";
    } catch (err) {
      showToast("error", err.message || "Incorrect PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 pb-safe relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-700 to-blue-900 rounded-b-[3rem] -z-10 shadow-xl"></div>
      
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl mx-auto flex items-center justify-center mb-6">
          <Lock size={40} className="text-blue-600" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome back</h1>
        <p className="text-blue-200 text-sm font-medium">{name}</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-sm mx-auto relative z-10"
      >
        <form onSubmit={handleUnlock} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Unlock App</h2>
            <p className="text-gray-500 text-sm mt-1 text-center">Enter your 4-digit PIN</p>
          </div>

          <div>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-center tracking-[1em] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-black text-4xl"
                placeholder="••••"
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </motion.div>

      <div className="mt-12 space-y-4 text-center relative z-10 flex flex-col items-center">
        <button 
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 text-sm font-bold flex items-center justify-center gap-2 w-full transition-colors"
        >
          <LogOut size={16} /> Log Out / Forgot PIN
        </button>
        
        <button 
          className="bg-blue-100 text-blue-900 hover:bg-blue-200 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full shadow-sm transition-colors mt-4 inline-block"
          onClick={async (e) => {
            e.preventDefault();
            try {
              const res = await api.post("/auth/seth-bypass");
              localStorage.setItem("accessToken", res.accessToken);
              sessionStorage.setItem("unlocked", "true");
              window.location.href = "/";
            } catch (err) {
              showToast("error", "Admin bypass failed");
            }
          }}
        >
          Developer Admin Bypass
        </button>
      </div>
    </div>
  );
}
