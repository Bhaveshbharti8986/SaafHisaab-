import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calculator, Plus, Trash2, CheckCircle2, ChevronDown, Package } from "lucide-react";
import { api } from "../lib/api.js";

const CROPS = [
  { id: "wheat", name: "Wheat", icon: "🌾", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "maize", name: "Maize", icon: "🌽", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "rice", name: "Rice", icon: "🍚", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "soybean", name: "Pulse", icon: "🫘", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export default function DirectPurchaseSheet({ isOpen, onClose }) {
  const [crop, setCrop] = useState("wheat");
  const [bags, setBags] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [overrides, setOverrides] = useState({});
  
  // Backend data
  const [rates, setRates] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch rates and settings when opened
  useEffect(() => {
    if (isOpen) {
      setBags([]);
      setCurrentInput("");
      setOverrides({});
      setCrop("wheat");
      
      api.get("/rates").then(res => {
        const rateMap = {};
        res.forEach(r => { rateMap[r.cropType] = r.ratePerKg; });
        setRates(rateMap);
      });
      api.get("/settings").then(setSettings);
    }
  }, [isOpen]);

  const handleNumpad = (val) => {
    if (val === "C") {
      setCurrentInput("");
    } else if (val === "BACK") {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (val === "ADD") {
      const weight = parseFloat(currentInput);
      if (weight > 0 && weight < 200) { // basic validation
        setBags(prev => [...prev, weight]);
        setCurrentInput("");
      }
    } else if (val === ".") {
      if (!currentInput.includes(".")) setCurrentInput(prev => prev + ".");
    } else {
      setCurrentInput(prev => prev + val);
    }
  };

  const removeBag = (index) => {
    setBags(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const defaultRate = (rates[crop] || 0) * 100;
  const defaultDeduction = settings?.kardaPerBagKg || 0;
  const defaultPalledari = settings?.labourPerBagCash || 0;

  const ratePerQtl = overrides.rate !== undefined ? parseFloat(overrides.rate) || 0 : defaultRate;
  const weightDeduction = overrides.deduction !== undefined ? parseFloat(overrides.deduction) || 0 : defaultDeduction;
  const palledariFee = overrides.palledari !== undefined ? parseFloat(overrides.palledari) || 0 : defaultPalledari;
  
  const totalBags = bags.length;
  const grossWeight = bags.reduce((a, b) => a + b, 0);
  const totalDeduction = totalBags * weightDeduction;
  const netWeight = Math.max(0, grossWeight - totalDeduction);
  
  const grossAmount = (netWeight / 100) * ratePerQtl;
  const totalPalledari = totalBags * palledariFee;
  const finalPayable = Math.max(0, grossAmount - totalPalledari);

  const handleSubmit = async () => {
    if (totalBags === 0) return;
    setSubmitting(true);
    try {
      await api.post("/expenses", {
        type: "direct_purchase",
        amount: finalPayable,
        date: new Date().toISOString().split("T")[0],
        notes: `Direct Purchase: ${totalBags} bags of ${crop}`,
        metadata: {
          crop,
          weightKg: netWeight,
          bags: totalBags,
          grossWeight,
          deduction: totalDeduction,
          palledari: totalPalledari,
          ratePerQtl
        }
      });
      onClose();
    } catch (e) {
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          {/* Sheet */}
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 max-w-[480px] mx-auto bg-gray-50 rounded-t-[2rem] z-50 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white px-5 pt-4 pb-3 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-2xl text-blue-600">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Direct Purchase</h2>
                  <p className="text-xs text-gray-500 font-medium">Quick Calculator</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 text-gray-500 rounded-full active:scale-95">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-4 pb-32">
              
              {/* Crop Selection */}
              <div className="mb-5">
                <p className="text-sm font-bold text-gray-700 mb-2 px-1">Select Crop</p>
                <div className="grid grid-cols-4 gap-2">
                  {CROPS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCrop(c.id); setOverrides({}); }}
                      className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${crop === c.id ? c.color : 'bg-white border-gray-100 text-gray-400 grayscale opacity-70'}`}
                    >
                      <span className="text-2xl mb-1">{c.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate Info Card */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-4 text-white mb-5 shadow-lg flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Rate (₹/qtl)</p>
                  <div className="flex items-center gap-1 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/20 focus-within:border-white focus-within:bg-white/20 transition-all">
                    <span className="text-xl font-bold text-gray-300">₹</span>
                    <input 
                      type="number" 
                      value={overrides.rate ?? defaultRate} 
                      onChange={e => setOverrides(p => ({...p, rate: e.target.value}))}
                      className="bg-transparent text-xl font-black w-20 focus:outline-none text-white p-0 text-right"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Bag Deduction (kg)</p>
                  <div className="flex items-center gap-1 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/20 focus-within:border-orange-400 focus-within:bg-white/20 transition-all">
                    <input 
                      type="number" 
                      value={overrides.deduction ?? defaultDeduction}
                      onChange={e => setOverrides(p => ({...p, deduction: e.target.value}))}
                      className="bg-transparent text-lg font-bold text-orange-400 w-16 focus:outline-none p-0 text-right"
                    />
                    <span className="text-orange-400 font-bold">kg</span>
                  </div>
                 </div>

                <div className="flex justify-between items-center border-t border-gray-700 pt-3">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Palledari (₹/bag)</p>
                  <div className="flex items-center gap-1 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/20 focus-within:border-rose-400 focus-within:bg-white/20 transition-all">
                    <span className="text-lg font-bold text-rose-400">₹</span>
                    <input 
                      type="number" 
                      value={overrides.palledari ?? defaultPalledari}
                      onChange={e => setOverrides(p => ({...p, palledari: e.target.value}))}
                      className="bg-transparent text-lg font-bold text-rose-400 w-16 focus:outline-none p-0 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Live Summary */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5">
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bags</p>
                    <p className="text-xl font-black text-gray-800">{totalBags} <span className="text-sm text-gray-400 font-medium">bags</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gross Wt.</p>
                    <p className="text-xl font-black text-gray-800">{grossWeight.toFixed(1)} <span className="text-sm text-gray-400 font-medium">kg</span></p>
                  </div>
                  <div className="col-span-2 border-t border-dashed border-gray-200 pt-3 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Weight <span className="text-orange-500 lowercase">(-{totalDeduction}kg)</span></p>
                      <p className="text-3xl font-black text-green-600">{netWeight.toFixed(1)} <span className="text-lg text-green-600/60 font-medium">kg</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Amount</p>
                      <p className="text-xl font-bold text-gray-900">₹{grossAmount.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Final Payable */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-5 -mb-5 p-5 rounded-b-3xl">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Final Payable</p>
                    <p className="text-[10px] text-rose-500 font-medium">(- ₹{totalPalledari} palledari)</p>
                  </div>
                  <p className="text-3xl font-black text-blue-600">₹{finalPayable.toFixed(0)}</p>
                </div>
              </div>

              {/* Calculator Section */}
              <div className="flex gap-4">
                {/* Bag List */}
                <div className="w-[100px] bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col h-[300px]">
                  <div className="bg-gray-100 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">Bags</div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {bags.map((b, i) => (
                      <div key={i} className="flex justify-between items-center bg-blue-50 text-blue-800 px-2 py-1.5 rounded-lg text-sm font-bold group">
                        <span>{b}</span>
                        <button onClick={() => removeBag(i)} className="text-blue-300 hover:text-rose-500 active:scale-90">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {bags.length === 0 && (
                      <p className="text-xs text-center text-gray-400 mt-4 italic">Empty</p>
                    )}
                  </div>
                </div>

                {/* Numpad */}
                <div className="flex-1 grid grid-cols-3 gap-2 h-[300px]">
                  {/* Display */}
                  <div className="col-span-3 bg-white rounded-2xl border border-gray-200 p-3 flex justify-between items-center shadow-inner">
                    <span className="text-gray-400 font-medium text-sm flex items-center gap-1"><Package size={16}/> New Bag</span>
                    <span className="text-3xl font-black text-gray-800">{currentInput || "0"}</span>
                  </div>
                  
                  {['1','2','3','4','5','6','7','8','9','C','0','.'].map(btn => (
                    <button
                      key={btn}
                      onClick={() => handleNumpad(btn)}
                      className={`rounded-2xl text-xl font-bold active:scale-95 transition-transform flex items-center justify-center
                        ${btn === 'C' ? 'bg-rose-100 text-rose-600' : 'bg-white border border-gray-100 text-gray-800 shadow-sm'}`}
                    >
                      {btn}
                    </button>
                  ))}
                  
                  {/* Action buttons */}
                  <button onClick={() => handleNumpad('BACK')} className="col-span-1 rounded-2xl bg-gray-200 text-gray-700 font-bold active:scale-95 text-lg">
                    ⌫
                  </button>
                  <button onClick={() => handleNumpad('ADD')} className="col-span-2 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-md shadow-blue-200 active:scale-95 flex justify-center items-center gap-2">
                    <Plus size={20} /> Add Bag
                  </button>
                </div>
              </div>
            </div>
            
            {/* Submit Button Dock */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-8">
              <button 
                onClick={handleSubmit}
                disabled={submitting || totalBags === 0}
                className="w-full bg-green-600 text-white py-4 rounded-3xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-200 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting ? "Processing..." : (
                  <>
                    <CheckCircle2 size={24} /> Confirm Purchase
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



