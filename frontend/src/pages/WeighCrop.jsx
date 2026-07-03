import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { decodeToken } from "../lib/jwt.js";
import { formatINR } from "../lib/format.js";
import { showToast } from "../lib/toast.js";
import { X, Scale, Search } from "lucide-react";
import { getAvatarColor, getInitials } from "../lib/crop.js";
const CROPS = [
  { key: "wheat", emoji: "🌾", label: "Wheat" },
  { key: "maize", emoji: "🌽", label: "Maize" },
  { key: "rice", emoji: "🍚", label: "Rice" },
  { key: "soybean", emoji: "🫘", label: "Pulse" },
];

const QUALITY_PRESETS = [
  {
    label: "A+",
    pct: 1.0,
    activeClass: "bg-green-500 text-white border-green-500",
  },
  {
    label: "A",
    pct: 0.97,
    activeClass: "bg-blue-500 text-white border-blue-500",
  },
  {
    label: "B",
    pct: 0.93,
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    label: "Wet",
    pct: 0.88,
    activeClass: "bg-red-500 text-white border-red-500",
  },
];

const NUMPAD = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "00"],
];

export default function WeighCrop() {
  const [, navigate] = useLocation();
  const [farmers, setFarmers] = useState([]);
  const [marketRates, setMarketRates] = useState({});
  const [settings, setSettings] = useState({ kardaPerBagKg: 0.5, labourPerBagCash: 5 });
  
  // Local state for toggles/overrides
  const [applyKarda, setApplyKarda] = useState(true);
  const [applyLabour, setApplyLabour] = useState(true);
  const [customKarda, setCustomKarda] = useState("");
  const [customLabour, setCustomLabour] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [cropType, setCropType] = useState("wheat");
  const [ratePerKg, setRatePerKg] = useState("");
  const [rateEdited, setRateEdited] = useState(false);
  const [bagWeights, setBagWeights] = useState([]);
  const [current, setCurrent] = useState("0");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [flash, setFlash] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const chipsRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
      api.get(`/farmers${q}`).then(setFarmers);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    api.get("/settings").then(s => setSettings(s)).catch(() => {});
    api.get("/rates").then((rates) => {
      const map = {};
      rates.forEach((r) => {
        map[r.cropType] = r.ratePerKg;
      });
      setMarketRates(map);
      if (map.wheat) setRatePerKg(String(map.wheat));
    });
  }, []);

  useEffect(() => {
    if (!rateEdited && marketRates[cropType] !== undefined)
      setRatePerKg(String(marketRates[cropType]));
  }, [cropType, marketRates]);

  const totalWeight = Math.round(bagWeights.reduce((s, w) => s + w, 0) * 100) / 100;
  const totalBags = bagWeights.length;
  const rate = parseFloat(ratePerKg) || 0;
  const marketRate = marketRates[cropType] ?? 0;
  
  // Deductions
  const kPerBag = customKarda !== "" ? parseFloat(customKarda) || 0 : settings.kardaPerBagKg;
  const lPerBag = customLabour !== "" ? parseFloat(customLabour) || 0 : settings.labourPerBagCash;
  
  const kardaWeight = applyKarda ? kPerBag * totalBags : 0;
  const palledariAmount = applyLabour ? lPerBag * totalBags : 0;
  
  const netWeight = Math.max(0, totalWeight - kardaWeight);
  const netAmount = Math.max(0, Math.round(netWeight * rate * 100) / 100 - palledariAmount);
  const currentVal = parseFloat(current) || 0;

  function tap(k) {
    setFlash(k);
    setTimeout(() => setFlash(null), 100);
    if (k === "C") {
      setCurrent("0");
      return;
    }
    if (k === "←") {
      setCurrent((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
      return;
    }
    if (k === ".") {
      if (!current.includes(".")) setCurrent((p) => p + ".");
      return;
    }
    if (k === "00") {
      setCurrent((p) => (p === "0" ? "0" : p + "00"));
      return;
    }
    setCurrent((p) => (p === "0" ? k : p + k));
  }

  function addBag() {
    const w = parseFloat(current);
    if (!w || w <= 0) return;
    setBagWeights((p) => {
      const next = [...p, w];
      setTimeout(() => {
        if (chipsRef.current) {
          chipsRef.current.scrollLeft = chipsRef.current.scrollWidth;
        }
      }, 50);
      return next;
    });
    setCurrent("0");
  }

  function deleteBag(i) {
    setBagWeights((p) => p.filter((_, j) => j !== i));
  }

  function applyQuality(pct) {
    if (!marketRate) return;
    setRatePerKg(String(Math.round(marketRate * pct * 100) / 100));
    setRateEdited(true);
  }

  async function handleSubmit() {
    if (!farmerId || !bagWeights.length || !rate) return;
    setSaving(true);
    
    try {

      const res = await api.post("/weight-entries", {
        farmerId,
        cropType,
        bagWeights,
        ratePerKg: rate,
        kardaWeight,
        palledariAmount,
        
      });

      const farmer = farmers.find(f => f._id === farmerId);
      if (farmer) {
        const dateStr = new Date().toLocaleDateString('en-IN');
        const cropName = cropType.charAt(0).toUpperCase() + cropType.slice(1);
        let message = `*Rular Ledger Crop Delivery*\n--------------------\nFarmer: ${farmer.name}\nDate: ${dateStr}\nCrop: ${cropName}\n\n`;
        message += `📦 *${bagWeights.length} Individual Boris:*\n`;
        bagWeights.forEach((w, i) => { message += `${i + 1}. ${w}kg\n`; });
        message += `\n*Summary:*\n`;
        message += `• Total Weight: ${totalWeight.toFixed(2)}kg\n`;
        if (kardaWeight > 0) message += `• Karda Cut: -${kardaWeight}kg\n`;
        message += `• Net Weight: ${netWeight}kg\n`;
        message += `• Rate: ₹${rate}/kg\n`;
        message += `• Gross: +₹${Math.round(netWeight * rate).toLocaleString('en-IN')}\n`;
        if (palledariAmount > 0) message += `• 👷 Palledari: -₹${palledariAmount}\n`;
        message += `--------------------\n*Net Amount: ₹${netAmount.toLocaleString('en-IN')}*\n\nThank you for trading with us!`;

        const encoded = encodeURIComponent(message);
        const phone = farmer.phone ? String(farmer.phone).replace(/\D/g, '') : '';
        
        if (phone) {
          if (res._offline) {
            showToast("Saved offline. Message will send when online.", "success");
          } else {
            const url = `https://wa.me/91${phone}?text=${encoded}`;
            window.open(url, '_blank');
          }
        }
      }
      setSaving(false);
      setSuccess(true);
      setTimeout(() => {
        const token = localStorage.getItem("accessToken");
        let role = "munsi";
        if (token) {
          const decoded = decodeToken(token);
          role = decoded?.role || "munsi";
        }
        navigate(role === "seth" ? "/" : role === "labour" ? "/labour" : "/munsi");
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save. Please try again.", "error");
      setSaving(false);
    }
  }

  const crop = CROPS.find((c) => c.key === cropType);

  if (success)
    return (
      <AppLayout title="Weigh Crop" showBack munsiMode>
        <div className="flex flex-col items-center justify-center h-64 gap-3 mt-16">
          <div className="text-5xl">✅</div>
          <p className="font-bold text-[#2a6c4a] text-lg">Entry Saved!</p>
          <p className="text-gray-400 text-sm">
            {totalBags} bags · Net: {netWeight} kg · {formatINR(netAmount)}
          </p>
        </div>
      </AppLayout>
    );

  const activeQuality = QUALITY_PRESETS.find(
    (q) => Math.abs(rate - Math.round(marketRate * q.pct * 100) / 100) < 0.01,
  );

  return (
    <AppLayout title="Weigh Crop" showBack munsiMode>
      {/* Outer container (Native Android gray background) */}
      <div className="flex flex-col bg-gray-50 relative overflow-hidden" style={{ height: "calc(100vh - 112px)" }}>
        
        {/* ─── SCROLLABLE TOP (Settings) ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          
          {/* Farmer Selection (Full Screen Modal trigger) */}
          <div className="relative">
            <div 
              onClick={() => setShowDropdown(true)}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-[2rem] px-5 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div className="text-gray-900 font-bold text-lg truncate">
                  {farmerId ? farmers.find(f => f._id === farmerId)?.name || "Selected" : "Tap to select farmer..."}
                </div>
              </div>
              <Search className="text-blue-500" size={20} />
            </div>

            {showDropdown && (
              <div className="fixed inset-0 w-full max-w-[480px] mx-auto bg-gray-50 z-[100] flex flex-col">
                <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-8 pt-4 rounded-b-[2rem] shadow-md relative z-10 shrink-0">
                  <div className="flex items-center gap-3 mb-4 mt-2">
                    <button onClick={() => setShowDropdown(false)} className="text-white bg-white/20 p-2 rounded-full active:scale-95 transition-transform">
                      <X size={24} />
                    </button>
                    <h2 className="text-white text-xl font-bold">Select Farmer</h2>
                  </div>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-12 py-3.5 text-sm font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
                  {farmers.length === 0 ? (
                    <div className="p-8 text-gray-400 font-bold text-center">No farmers found</div>
                  ) : (
                    farmers.map(f => (
                      <div
                        key={f._id}
                        onClick={() => {
                          setFarmerId(f._id);
                          setSearchQuery(""); // Clear search after selection
                          setShowDropdown(false);
                        }}
                        className="bg-white rounded-3xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner ${getAvatarColor(f.name)}`}>
                            {getInitials(f.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{f.name}</p>
                            <p className="text-[11px] font-medium text-gray-500">{f.village} • {f.phone}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Crop Selection (White Cards) */}
          <div className="flex gap-3">
            {CROPS.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setCropType(c.key);
                  setRateEdited(false);
                }}
                className={`flex-1 py-4 rounded-3xl border transition-all flex flex-col items-center justify-center shadow-sm ${cropType === c.key ? "bg-white border-blue-500 text-blue-600 ring-2 ring-blue-500/20 scale-[1.02]" : "bg-white border-gray-100 text-gray-800 hover:bg-gray-50"}`}
              >
                <span className="text-3xl mb-1">{c.emoji}</span>
                <span className="text-xs font-black uppercase tracking-wider">{c.label}</span>
              </button>
            ))}
          </div>

          {/* Rate & Quality (White Card) */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 text-sm font-bold uppercase tracking-wider">Rate (₹/kg)</span>
              <input
                type="number"
                step="0.25"
                value={ratePerKg}
                onChange={(e) => {
                  setRatePerKg(e.target.value);
                  setRateEdited(true);
                }}
                className="w-28 bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl px-3 py-2 text-right font-black text-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
              />
            </div>
            <div className="flex gap-2">
              {QUALITY_PRESETS.map((q) => {
                const isActive = Math.abs(rate - Math.round(marketRate * q.pct * 100) / 100) < 0.01;
                return (
                  <button
                    key={q.label}
                    onClick={() => applyQuality(q.pct)}
                    className={`flex-1 py-2 rounded-xl border text-[11px] font-black uppercase transition-all shadow-sm ${isActive ? q.activeClass : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    {q.label}
                    <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                      ₹{Math.round(marketRate * q.pct * 100) / 100}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deductions (White Cards) */}
          <div className="flex gap-4">
            {/* Karda */}
            <div className="flex-1 bg-white border border-gray-100 rounded-[2rem] p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700 text-xs font-bold uppercase tracking-wider">Karda</span>
                <div className="relative inline-block w-10 h-5 cursor-pointer" onClick={() => setApplyKarda(!applyKarda)}>
                  <div className={`block w-10 h-5 rounded-full transition-colors ${applyKarda ? 'bg-[#2a5940]' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${applyKarda ? 'transform translate-x-5' : ''}`}></div>
                </div>
              </div>
              {applyKarda && (
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1" 
                    placeholder={settings.kardaPerBagKg}
                    value={customKarda} 
                    onChange={e => setCustomKarda(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 text-gray-900 px-3 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-[#2a5940] text-center font-bold text-base"
                  />
                  <span className="text-[10px] text-gray-600 font-semibold leading-tight">kg<br/>bag</span>
                </div>
              )}
            </div>
            
            {/* Palledari */}
            <div className="flex-1 bg-white border border-gray-100 rounded-[2rem] p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700 text-xs font-bold uppercase tracking-wider">Labour</span>
                <div className="relative inline-block w-10 h-5 cursor-pointer" onClick={() => setApplyLabour(!applyLabour)}>
                  <div className={`block w-10 h-5 rounded-full transition-colors ${applyLabour ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${applyLabour ? 'transform translate-x-5' : ''}`}></div>
                </div>
              </div>
              {applyLabour && (
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="1" 
                    placeholder={settings.labourPerBagCash}
                    value={customLabour} 
                    onChange={e => setCustomLabour(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 text-gray-900 px-3 py-2 rounded-xl focus:outline-none focus:bg-white focus:border-orange-400 text-center font-bold text-base"
                  />
                  <span className="text-[10px] text-gray-600 font-semibold leading-tight">₹<br/>bag</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Button to open Calculator */}
        {!showCalculator && (
          <div className="absolute bottom-4 left-4 right-4 z-10 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button 
              onClick={() => setShowCalculator(true)}
              className="w-full bg-white text-blue-600 font-black text-lg py-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-white flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            >
              <Scale size={24} className="text-blue-600" />
              START WEIGHING ➔
            </button>
          </div>
        )}

        {/* ─── SLIDING BOTTOM SHEET: Calculator ──────────────────────────── */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out flex flex-col z-20`}
          style={{ height: '95%', transform: showCalculator ? 'translateY(0)' : 'translateY(100%)' }}
        >
          {/* Header of Bottom Sheet */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
            <h3 className="font-black text-xl text-gray-800 flex items-center gap-2">
              <Scale size={20} className="text-[#2a5940]"/>
              Weigh Bags
            </h3>
            <button onClick={() => setShowCalculator(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 active:scale-90 transition-all">
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col justify-between p-3 pb-4 min-h-0">
            
            {/* DYNAMIC ISLAND STATS (White Glassmorphism inside Sheet) */}
            <div className="bg-gradient-to-r from-[#2a5940]/10 to-[#1e3c45]/10 border border-[#2a5940]/20 rounded-[2rem] p-3 flex shadow-sm items-center justify-between mb-2 shrink-0">
              <div className="text-center px-2 border-r border-[#2a5940]/20 flex-1">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Bags</p>
                <p className="text-2xl font-black text-[#2a5940] leading-none mt-1">{totalBags}</p>
              </div>
              <div className="text-center px-2 border-r border-[#2a5940]/20 flex-1">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Net Wt</p>
                <p className="text-2xl font-black text-[#2a5940] leading-none mt-1">{netWeight}<span className="text-[11px] font-medium ml-0.5">kg</span></p>
              </div>
              <div className="text-center pl-2 flex-1">
                <p className="text-[10px] text-[#2a5940] font-black uppercase tracking-widest">Payout</p>
                <p className="text-2xl font-black text-[#2a5940] leading-none mt-1">{formatINR(netAmount)}</p>
              </div>
            </div>

            {/* BAG CHIPS */}
            <div className="mb-2 shrink-0">
              {bagWeights.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-[1.5rem] py-3 text-center shadow-inner">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No bags weighed yet</p>
                </div>
              ) : (
                <div ref={chipsRef} className="flex gap-2 overflow-x-auto items-center py-1 scroll-smooth" style={{ scrollbarWidth: "none" }}>
                  {bagWeights.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-2 pr-1 py-1 shrink-0 shadow-md transition-all animate-in slide-in-from-right-2">
                      <div className="w-5 h-5 rounded-full bg-[#2a5940] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm font-black text-gray-800">
                        {w}<span className="text-[9px] font-medium text-gray-400 ml-0.5">kg</span>
                      </span>
                      <button
                        onClick={() => deleteBag(i)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-[12px] font-black flex items-center justify-center hover:bg-red-200 transition-colors shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculator Screen */}
            <div className="flex items-end justify-between bg-gray-50 rounded-[2rem] px-5 py-2 border border-gray-200 shadow-inner mb-2 shrink-0">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                  Entering Bag #{totalBags + 1}
                </p>
                {currentVal > 0 && rate > 0 && (
                  <p className="text-[12px] text-[#2a5940] font-black">
                    ≈ {formatINR(currentVal * rate)}
                  </p>
                )}
              </div>
              <div className="flex items-baseline">
                <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                  {current}
                </span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mb-2 shrink-0">
              {[40, 45, 50, 55, 60].map((w) => (
                <button
                  key={w}
                  onClick={() => setCurrent(String(w))}
                  className={`flex-1 py-2 rounded-2xl text-sm font-black transition-all active:scale-95 ${current === String(w) ? "bg-[#2a5940] text-white shadow-lg" : "bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50"}`}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Numpad & Actions */}
            <div className="flex gap-3 mb-2 shrink-0">
              {/* 3/4 Width: Numbers */}
              <div className="grid grid-cols-3 gap-2 w-3/4">
                {NUMPAD.map((row) =>
                  row.map((k) => (
                    <button
                      key={k}
                      onClick={() => tap(k)}
                      className={`rounded-full aspect-square max-w-[5.5rem] max-h-[5.5rem] mx-auto w-full flex items-center justify-center font-black text-3xl transition-all active:scale-90 select-none shadow-md ${flash === k ? "bg-gray-300 scale-90" : "bg-white text-gray-800 border border-gray-100 hover:bg-gray-50"}`}
                    >
                      {k}
                    </button>
                  ))
                )}
              </div>
              
              {/* 1/4 Width: Actions */}
              <div className="w-1/4 flex flex-col gap-3">
                <button onClick={() => tap("C")} className="flex-1 rounded-[2rem] bg-orange-100 text-orange-600 font-black text-xl active:scale-90 transition-all border border-orange-200 shadow-md flex items-center justify-center">
                  AC
                </button>
                <button onClick={() => tap("←")} className="flex-1 rounded-[2rem] bg-gray-100 text-gray-600 font-black text-xl active:scale-90 transition-all border border-gray-200 shadow-sm flex items-center justify-center">
                  ⌫
                </button>
                <button 
                  onClick={addBag} 
                  disabled={currentVal <= 0}
                  className={`flex-[2] rounded-[2rem] font-black flex flex-col items-center justify-center gap-1 transition-all active:scale-90 shadow-xl ${currentVal > 0 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400 shadow-none"}`}
                >
                  <span className="text-4xl leading-none">+</span>
                  <span className="text-[12px] uppercase tracking-widest">Add</span>
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="shrink-0">
              <button
                onClick={handleSubmit}
                disabled={saving || !farmerId || !bagWeights.length || !rate}
                className="w-full bg-[#0f2027] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-3xl py-4 font-black text-base active:scale-[0.98] transition-all shadow-xl disabled:shadow-none"
              >
                {saving
                  ? "SAVING..."
                  : !farmerId
                    ? "SELECT FARMER (CLOSE PANEL)"
                    : !bagWeights.length
                      ? "ADD BAG WEIGHTS ABOVE"
                      : `SUBMIT ${totalBags} BAGS ➔`}
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
