import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Store, ChevronRight } from "lucide-react";
import SaafHisaabLogo from "./SaafHisaabLogo"; // Ensure this file exists


const Particles = () => {
  const dots = [
    { x: -70, y: -40, delay: 0.1, size: 3 },
    { x: 80, y: -55, delay: 0.3, size: 2 },
    { x: -90, y: 30, delay: 0.5, size: 2.5 },
    { x: 95, y: 50, delay: 0.2, size: 3 },
    { x: 0, y: -85, delay: 0.4, size: 2 },
    { x: -50, y: 90, delay: 0.6, size: 2.5 },
    { x: 60, y: 95, delay: 0.15, size: 2 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-cyan-300 pointer-events-none"
          style={{
            width: d.size, height: d.size,
            left: `calc(50% + ${d.x}px)`, top: `calc(50% + ${d.y}px)`,
            boxShadow: "0 0 8px 2px rgba(56,211,238,0.7)",
          }}
          initial={{ opacity: 0, scale: 0, y: 10 }}
          animate={{ opacity: [0, 1, 0.6, 0], scale: [0, 1, 1, 0.6], y: [10, -6, -12, -20] }}
          transition={{ delay: 0.6 + d.delay, duration: 1.6, ease: "easeOut" }}
        />
      ))}
    </>
  );
};

export default function Welcome({ isSplash = false }) {
  const [showButtons, setShowButtons] = useState(!isSplash);

  useEffect(() => {
    if (isSplash) {
      const timer = setTimeout(() => setShowButtons(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSplash]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b  from-blue-900 to-gray-900 flex flex-col items-center justify-center overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0c2a4d 0%,_#05080F 65%)]" />
      
      <motion.div
        className="relative w-36 h-36 z-20"
        initial={{ y: 30, scale: 1.5, opacity: 0, filter: "blur(12px)" }}
        animate={{
          y: showButtons ? -64 : 0,
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
        }}
        transition={{
          y: { duration: 0.8, type: "spring", bounce: 0.3 },
          scale: { duration: 0.6, ease: "easeOut" },
        }}
      >
        <SaafHisaabLogo animated={true} size={150} />
        {isSplash && !showButtons && <Particles />}
      </motion.div>

      <motion.h1 
        animate={{ opacity: 1, y: showButtons ? -64 : 0 }}
        className="text-4xl font-black text-white tracking-tighter mt-8 z-10"
      >
        Saaf<span className="text-cyan-300 font-extrabold">Hisaab</span>
      </motion.h1>

      <AnimatePresence>
        {showButtons && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 24, stiffness: 210 }}
            className="absolute bottom-0 w-full p-6 pb-12 bg-gradient-to-t from-slate-400/0 to-slate-900/50 backdrop-blur-2xl border-t border-white/10 rounded-t-[2rem] z-30"
          >
            <div className="max-w-md mx-auto flex flex-col gap-3">
              <a href="/login" className="w-full bg-gradient-to-r from-blue-600 to-blue  text-white py-4 px-5 rounded-2xl flex items-center justify-between active:scale-95 transition-transform">
                <span className="font-black text-lg">Staff Portal Sign In</span>
                <LogIn size={20} />
              </a>
              <a href="/register" className="w-full bg-gradient-to-r from-blue-600 to-blue  text-white py-4 px-5 rounded-2xl flex items-center justify-between active:scale-95 transition-transform">
                <span className="font-bold text-lg">Register New Mandi</span>
                <Store size={20} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}