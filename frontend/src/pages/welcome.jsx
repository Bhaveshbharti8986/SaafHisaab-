import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, UserRoundPlus } from "lucide-react";
import { useLocation } from "wouter";
import SaafHisaabLogo from "./SaafHisaabLogo";
import { CharacterForRole } from "../components/Characters.jsx";

const roles = [
  { role: "seth", title: "I am Seth", hindi: "सेठ" },
  { role: "munshi", title: "I am Munshi", hindi: "मुंशी" },
  { role: "labour", title: "I am Labour", hindi: "मज़दूर" },
];

const roleCardClasses = {
  seth: "border-[#1595ff] bg-gradient-to-r from-sky-50 to-blue-50 text-slate-950 shadow-[0_8px_24px_rgba(37,99,235,.18)]",
  munshi: "border-teal-200 bg-gradient-to-r from-teal-50/80 to-white text-slate-950 shadow-[0_6px_18px_rgba(15,118,110,.08)]",
  labour: "border-orange-200 bg-gradient-to-r from-orange-50/80 to-white text-slate-950 shadow-[0_6px_18px_rgba(194,65,12,.08)]",
};

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
      {dots.map((dot, index) => (
        <motion.span
          key={index}
          className="pointer-events-none absolute rounded-full bg-cyan-300"
          style={{
            width: dot.size,
            height: dot.size,
            left: `calc(50% + ${dot.x}px)`,
            top: `calc(50% + ${dot.y}px)`,
            boxShadow: "0 0 8px 2px rgba(56,211,238,0.7)",
          }}
          initial={{ opacity: 0, scale: 0, y: 10 }}
          animate={{ opacity: [0, 1, 0.6, 0], scale: [0, 1, 1, 0.6], y: [10, -6, -12, -20] }}
          transition={{ delay: 0.6 + dot.delay, duration: 1.6, ease: "easeOut" }}
        />
      ))}
    </>
  );
};

function SplashWelcome() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-900 to-gray-900 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0c2a4d_0%,_#05080F_65%)]" />
      <motion.div
        className="relative z-20 h-36 w-36"
        initial={{ y: 30, scale: 1.5, opacity: 0, filter: "blur(12px)" }}
        animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ y: { duration: 0.8, type: "spring", bounce: 0.3 }, scale: { duration: 0.6, ease: "easeOut" } }}
      >
        <SaafHisaabLogo animated={true} size={150} />
        <Particles />
      </motion.div>
      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mt-8 text-4xl font-black tracking-tighter text-white"
      >
        Saaf<span className="font-extrabold text-cyan-300">Hisaab</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="z-10 mt-2 text-sm font-semibold tracking-wide text-blue-100"
      >
        Har hisaab, saaf saaf
      </motion.p>
    </div>
  );
}

function FarmFooter() {
  return (
    <svg
      viewBox="0 0 480 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 h-[100px] w-full text-blue-200/80"
    >
      <path d="M0 56 60 43l55 16 69-22 50 17 74-31 70 27 47-24 55 18v56H0Z" fill="#dbeafe" />
      <path d="M0 68 72 56l62 13 54-14 68 12 55-19 60 17 56-17 53 16v36H0Z" fill="#bfdbfe" />
      <path d="M0 78h480v22H0z" fill="#93c5fd" opacity=".8" />
      <g fill="#7fb2e8" opacity=".72">
        <path d="M284 70h111v24H284z" />
        <path d="m299 55 35-13 30 13v15h-65z" />
        <path d="M343 59h28v17h-28z" fill="#dbeafe" />
        <path d="M121 71h5v-18h4v18h5v9h-14zm-7-18 9-16 9 16z" />
        <circle cx="125" cy="41" r="13" opacity=".75" />
        <path d="M426 73h5V54h4v19h5v8h-14zm-7-19 9-15 9 15z" />
        <circle cx="426" cy="53" r="12" opacity=".75" />
        <path d="M212 81h23v-9h-23z" />
        <circle cx="218" cy="84" r="6" fill="#60a5fa" />
        <circle cx="232" cy="84" r="6" fill="#60a5fa" />
        <path d="M218 84h14l-2-10h-8z" />
      </g>
      <path d="M0 91h480" stroke="#60a5fa" strokeWidth="2" opacity=".75" />
      <path d="M0 95h480" stroke="#dbeafe" strokeWidth="2" strokeDasharray="9 7" opacity=".9" />
    </svg>
  );
}

export default function Welcome({ isSplash = false }) {
  const [, navigate] = useLocation();
  const [showIntro, setShowIntro] = useState(() => {
    if (isSplash) return false;
    const navigationType = window.performance
      .getEntriesByType("navigation")[0]?.type;
    return !sessionStorage.getItem("roleIntroPlayed") || navigationType === "reload";
  });

  useEffect(() => {
    if (isSplash || !showIntro) return undefined;
    sessionStorage.setItem("roleIntroPlayed", "true");
    const timer = window.setTimeout(() => setShowIntro(false), 2750);
    return () => window.clearTimeout(timer);
  }, [isSplash, showIntro]);

  if (isSplash) return <SplashWelcome />;

  const chooseRole = (role) => {
    sessionStorage.setItem("loginRole", role);
    navigate("/login");
  };

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <motion.div
          key="brand-intro"
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
        >
          <SplashWelcome />
        </motion.div>
      ) : (
        <motion.main
          key="role-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative mx-auto flex h-[100dvh] min-h-[600px] w-full max-w-[480px] flex-col overflow-hidden bg-[#f7faff] px-5 pb-0 pt-0 font-sans"
        >
          <header
            className="relative -mx-5 shrink-0 overflow-hidden bg-[#05264c] px-5 text-center text-white"
            style={{ height: "clamp(150px, 22vh, 228px)" }}
          >
            <div className="absolute -left-20 -top-32 h-[270px] w-[270px] rounded-full bg-blue-700/25" />
            <div className="absolute -right-20 top-5 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />
            <div className="absolute right-8 top-12 grid grid-cols-4 gap-2 opacity-35">
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              ))}
            </div>
            <div className="relative z-10 flex flex-col items-center pt-2">
              <SaafHisaabLogo size={64} animated={false} primary="#ffffff" accent="#22d3ee" />
              <h1 className="mt-0.5 text-[30px] font-black leading-none tracking-tight text-white">
                Saaf<span className="text-cyan-400">Hisaab</span>
              </h1>
              <p className="mt-1 text-sm font-semibold text-sky-200">Har hisaab, saaf saaf</p>
            </div>
            <svg
              viewBox="0 0 480 88"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute -bottom-px left-0 h-[clamp(58px,10vh,88px)] w-full"
            >
              <path d="M0 18C74-3 116 49 213 57c103 9 177-40 267-45v76H0Z" fill="#f7faff" />
              <path d="M252 59c83 1 154-42 228-47" fill="none" stroke="#22b8f5" strokeWidth="5" />
            </svg>
          </header>

          <section className="relative z-10 -mt-1 flex shrink-0 flex-col items-center">
            <div className="mb-2 flex min-h-11 items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 shadow-[0_5px_18px_rgba(37,99,235,.12)]">
              <SaafHisaabLogo size={30} animated={false} primary="#123d79" accent="#1677ff" />
              <span className="text-sm font-extrabold text-[#102b57]">SaafHisaab</span>
              <span className="mx-1 h-5 w-px bg-slate-300" />
              <span className="text-xs font-medium text-slate-600">Har hisaab, saaf saaf</span>
            </div>
            <h2 className="text-center text-[clamp(28px,8vw,34px)] font-black leading-[1.05] tracking-tight text-[#0b2551]">
              Who is using <span className="text-blue-500">today?</span>
            </h2>
            <p className="mt-1 text-center text-base font-medium text-[#1e3765]">Choose your role to continue</p>
          </section>

          <div className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col justify-center">
            <div className="flex flex-col gap-2">
              {roles.map(({ role, title, hindi }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => chooseRole(role)}
                  className={`relative flex min-h-[clamp(78px,11vh,94px)] w-full shrink-0 items-center gap-3 rounded-[26px] border-2 p-2 text-left transition active:scale-[.99] ${roleCardClasses[role]}`}
                >
                  <span className={`flex h-[clamp(60px,8vh,76px)] w-[clamp(60px,8vh,76px)] shrink-0 items-center justify-center rounded-full ${role === "seth" ? "bg-sky-100" : role === "munshi" ? "bg-teal-100" : "bg-orange-100"}`}>
                    <CharacterForRole role={role} className="h-full w-full" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[clamp(18px,5.5vw,21px)] font-extrabold tracking-tight">{title}</span>
                    <span className="mt-0.5 block text-base font-bold text-slate-600">{hindi}</span>
                  </span>
                  <span className={`mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${role === "seth" ? "bg-blue-600 text-white" : role === "munshi" ? "bg-teal-100 text-teal-800" : "bg-orange-100 text-orange-800"}`}>
                    <ChevronRight size={25} strokeWidth={2.5} />
                  </span>
                  {role === "seth" && (
                    <span aria-hidden="true" className="absolute -right-6 top-[-25px] rotate-[32deg] text-3xl font-black leading-none text-blue-500">
                      〃
                    </span>
                  )}
                </button>
              ))}
              <a
                href="/register"
                className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-blue-300 bg-white/70 px-3 text-sm font-extrabold text-[#102b57] shadow-[0_6px_16px_rgba(37,99,235,.14)] transition hover:border-blue-500"
              >
                <UserRoundPlus size={23} />
                New mandi? Register as Seth
                <ChevronRight size={22} className="ml-auto" />
              </a>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 z-0 w-full">
            <FarmFooter />
          </div>
        </motion.main>
      )}
    </AnimatePresence>
  );
}
