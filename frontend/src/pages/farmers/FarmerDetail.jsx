import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import AppLayout from "../../components/layout/AppLayout.jsx";
import { api } from "../../lib/api.js";
import { decodeToken } from "../../lib/jwt.js";
import { formatINR, formatWeight } from "../../lib/format.js";
import { getCropConfig, getAvatarColor, getInitials } from "../../lib/crop.js";
import { showToast } from "../../lib/toast.js";
import { MessageCircle } from "lucide-react";

const TABS = ["All", "Deliveries", "Payments", "Advances"];

export default function FarmerDetail() {
  const { id } = useParams();
  const [farmer, setFarmer]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [pending, setPending]   = useState([]);
  const [tab, setTab]           = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [timelineLimit, setTimelineLimit] = useState(30);
  const [notFound, setNotFound] = useState(false);

  // Settlement state
  const token = localStorage.getItem("accessToken");
  let role = "munsi";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || "munsi";
  }

  const [settlingId, setSettlingId]     = useState(null);
  const [settleMode, setSettleMode]     = useState(role === "seth" ? "Jama" : "Cash");
  const [settlePaidBy, setSettlePaidBy] = useState(role);
  const [settleUpi, setSettleUpi]       = useState("");
  const [enableJamaRecovery, setEnableJamaRecovery] = useState(false);
  const [enableUdharRecovery, setEnableUdharRecovery] = useState(false);
  const [jamaRecoveryAmt, setJamaRecoveryAmt] = useState("");
  const [udharRecoveryAmt, setUdharRecoveryAmt] = useState("");
  const [chhootAmt, setChhootAmt]       = useState("");
  const [adjustedRates, setAdjustedRates] = useState({}); // entryId → rate override
  const [saving, setSaving] = useState(false);

  // Transaction Modal
  const [txnModal, setTxnModal] = useState(false);
  const [txnType, setTxnType]   = useState("payment");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnMode, setTxnMode]   = useState("Cash");
  const [txnPaidBy, setTxnPaidBy] = useState(role);
  const [txnNotes, setTxnNotes]   = useState("");

  // Edit Profile State
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  function openEditModal() {
    setEditForm({
      name: farmer.name,
      phone: farmer.phone || "",
      village: farmer.village || "",
      fatherName: farmer.fatherName || "",
      fullAddress: farmer.fullAddress || "",
      guarantorName: farmer.guarantorName || "",
      guarantorPhone: farmer.guarantorPhone || "",
      notes: farmer.notes || ""
    });
    setEditModal(true);
  }

  async function handleUpdateProfile() {
    setSaving(true);
    await api.patch(`/farmers/${id}`, editForm);
    setSaving(false);
    setEditModal(false);
    load();
  }

  function sendWhatsAppReceipt(txn) {
    if (!farmer) return;
    const dateStr = new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN');
    let message = '';

    if (txn.type === 'delivery') {
      const cropName = txn.cropType ? txn.cropType.charAt(0).toUpperCase() + txn.cropType.slice(1) : '';
      message = `*Rular Ledger Crop Delivery*\n--------------------\nFarmer: ${farmer.name}\nDate: ${dateStr}\n`;
      if (cropName) message += `Crop: ${cropName}\n`;
      message += `\n`;
      
      if (txn.bagWeights && txn.bagWeights.length > 0) {
        message += `📦 *${txn.bagWeights.length} Individual Boris:*\n`;
        txn.bagWeights.forEach((w, i) => {
          message += `${i + 1}. ${w}kg\n`;
        });
        message += `\n`;
      }
      
      message += `*Summary:*\n`;
      message += `• Total Weight: ${formatWeight(txn.totalWeight)}\n`;
      if ((txn.kardaWeight || 0) > 0) {
        message += `• Karda Cut: -${formatWeight(txn.kardaWeight)}\n`;
      }
      message += `• Net Weight: ${formatWeight(txn.netWeight ?? txn.totalWeight)}\n`;
      message += `• Rate: ₹${txn.ratePerKg}/kg\n`;
      message += `• Gross: +${formatINR((txn.netWeight ?? txn.totalWeight) * txn.ratePerKg)}\n`;
      if ((txn.palledariAmount || 0) > 0) {
        message += `• 👷 Palledari: -${formatINR(txn.palledariAmount)}\n`;
      }
      
      message += `--------------------\n*Net Amount: ${formatINR(txn.netAmount ?? txn.amount)}*\n\nThank you for trading with us!`;
    } else {
      const netCrop = formatINR(txn.cropAmount || 0);
      const recovery = formatINR((txn.jamaRecovered || 0) + (txn.advanceRecovered || 0) + (txn.interestRecovered || 0));
      const chhoot = txn.chhootAmount ? `\nChhoot (Bonus): +${formatINR(txn.chhootAmount)}` : '';
      const payout = formatINR(txn.amount || 0);

      message = `*Rular Ledger Receipt*\n--------------------\nFarmer: ${farmer.name}\nDate: ${dateStr}\n\nCrop Value: ${netCrop}\nTotal Recovery/Udhar: -${recovery}${chhoot}\n--------------------\n*Final Settlement Payout: ${payout}*\n\nThank you for trading with us!`;
    }

    const encoded = encodeURIComponent(message);
    const phone = farmer.phone ? farmer.phone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/91${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  function load() {
    Promise.all([
      api.get(`/farmers/${id}`),
      api.get(`/weight-entries?farmerId=${id}&status=pending`),
    ]).then(([f, p]) => { setFarmer(f); setPending(p); })
      .catch(err => {
        console.error(err);
        setNotFound(true);
      });
  }

  function loadTimeline() {
    api.get(`/farmers/${id}/timeline?limit=${timelineLimit}`).then(setTimeline).catch(console.error);
  }

  useEffect(() => {
    if (id) {
      load();
      loadTimeline();
    }
  }, [id, timelineLimit]);

  // ── Derived loan values ─────────────────────────────────────────────────────
  const advancePrincipal = farmer?.advanceAmount   ?? 0;
  const accruedInterest  = farmer?.accruedInterest ?? 0;
  const interestRate     = farmer?.interestRate    ?? 0;
  const chargeInterest   = farmer?.chargeInterest  ?? false;
  const monthlyInterest  = chargeInterest
    ? Math.round(advancePrincipal * interestRate / 100 * 100) / 100
    : 0;
  const outstandingDebt  = advancePrincipal + accruedInterest;

  // ── Law 1: calc with moisture-adjusted rate ─────────────────────────────────
  function getRate(entry) {
    return adjustedRates[entry._id] !== undefined
      ? adjustedRates[entry._id]
      : entry.ratePerKg;
  }

  function calcSettlement(entry) {
    const rate     = getRate(entry);
    const karda    = entry.kardaWeight || 0;
    const netWeight= Math.max(0, entry.totalWeight - karda);
    const gross    = Math.round(netWeight * rate * 100) / 100;
    const labour   = entry.palledariAmount || 0;
    const netCrop  = Math.max(0, gross - labour);

    // Law 2: recovery
    let jamaRecovery = 0;
    let udharRecovery = 0;
    
    if (enableJamaRecovery) {
      jamaRecovery = Math.abs(parseFloat(jamaRecoveryAmt) || 0);
      // Optional: cap it if farmer.balance is negative
      if (farmer?.balance < 0) jamaRecovery = Math.min(jamaRecovery, Math.abs(farmer.balance));
    }
    if (enableUdharRecovery) {
      udharRecovery = Math.min(Math.abs(parseFloat(udharRecoveryAmt) || 0), outstandingDebt);
    }

    const totalRecovery = jamaRecovery + udharRecovery;

    // Law 3: chhoot — extra round cash given by Seth (always positive, added to payout)
    const chhoot = Math.abs(parseFloat(chhootAmt) || 0);

    const finalPayout = netCrop - totalRecovery + chhoot;
    return { rate, karda, gross, labour, netCrop, jamaRecovery, udharRecovery, chhoot, finalPayout };
  }

  // ── Finalize settlement ─────────────────────────────────────────────────────
  async function handleFinalize(entry) {
    setSaving(true);
    const { netCrop, jamaRecovery, udharRecovery, chhoot, finalPayout, rate } = calcSettlement(entry);

    // Law 2: split recovery into principal vs interest portions
    let advRec = 0, intRec = 0;
    if (enableUdharRecovery) {
      // recover interest first, then principal
      intRec = Math.min(udharRecovery, accruedInterest);
      advRec = Math.max(0, udharRecovery - intRec);
    }

    try {
      await api.post("/settlements", {
        farmerId: id,
        weightEntryId: entry._id,
        cropAmount:        netCrop,
        jamaRecovered:     jamaRecovery,
        advanceRecovered:  advRec,
        interestRecovered: intRec,
        chhootAmount:      chhoot || null,
        recoveryMode:      (enableJamaRecovery && enableUdharRecovery) ? "both" : enableJamaRecovery ? "jama" : enableUdharRecovery ? "udhar" : "skip",
        finalAmount:       finalPayout,
        paymentMethod:     settleMode,
        paidBy:            settlePaidBy,
        upiTransactionId:  settleUpi || null,
        deliveryBags:      entry.totalBags,  // Law 4: bags come back
        adjustedRate:      rate !== entry.ratePerKg ? rate : null,
      });


      setSaving(false);
      setSettlingId(null);
      setEnableJamaRecovery(false); setEnableUdharRecovery(false);
      setJamaRecoveryAmt(""); setUdharRecoveryAmt(""); setChhootAmt("");
      setSettlePaidBy("munsi");
      setAdjustedRates(p => { const n = { ...p }; delete n[entry._id]; return n; });
      load();
      loadTimeline();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save. Please try again.", "error");
      setSaving(false);
    }
  }

  function openSettle(entry) {
    const open = settlingId === entry._id;
    setSettlingId(open ? null : entry._id);
    setEnableJamaRecovery(false);
    setEnableUdharRecovery(false);
    setJamaRecoveryAmt("");
    setUdharRecoveryAmt("");
    setChhootAmt("");
  }

  const filtered = timeline.filter(e => {
    if (tab === "Deliveries") return e.type === "delivery";
    if (tab === "Payments")   return e.type === "payment";
    if (tab === "Advances")   return e.type === "advance";
    return true;
  });

  if (notFound) return (
    <AppLayout title="Not Found" showBack>
      <div className="p-12 text-center flex flex-col items-center h-[60vh] justify-center">
        <span className="text-6xl mb-4 grayscale opacity-50">🕵️</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Khata Not Found</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-[250px] leading-relaxed">This farmer may have been deleted or the link is invalid.</p>
        <button onClick={() => history.back()} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm active:scale-95">Go Back</button>
      </div>
    </AppLayout>
  );

  if (!farmer) return (
    <AppLayout title="Farmer Khata" showBack>
      <div className="p-8 text-center text-gray-400">Loading…</div>
    </AppLayout>
  );

  return (
    <AppLayout title="Farmer Khata" showBack>

      {/* ── Profile header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-8 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-inner ${getAvatarColor(farmer.name)}`}>
              {getInitials(farmer.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-xl">{farmer.name}</h2>
                <button onClick={openEditModal} className="text-blue-700 bg-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform">✏️ Edit Profile</button>
              </div>
              <p className="text-white/80 text-xs mt-1 font-medium">📍 {farmer.village} · 📞 {farmer.phone}</p>
              {farmer.fatherName && <p className="text-white/60 text-[10px] mt-0.5 font-medium uppercase tracking-wider">S/O {farmer.fatherName}</p>}
            </div>
          </div>

          {/* Balance + Bags row */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 rounded-2xl p-4 bg-white/10 border border-white/20 min-w-[140px]">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${farmer.balance >= 0 ? "text-green-300" : "text-red-300"}`}>
                {farmer.balance >= 0 ? "↑ Jama Balance" : "↓ Wallet Due"}
              </p>
              <p className="text-2xl font-black text-white mt-1">
                {formatINR(Math.abs(farmer.balance))}
              </p>
            </div>

            {(farmer.advanceAmount > 0 || farmer.accruedInterest > 0) && (
              <div className="flex-1 rounded-2xl p-4 bg-red-500/20 border border-red-400/30 min-w-[140px]">
                <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest flex justify-between">
                  <span>↓ Udhar (Loan)</span>
                  {farmer.chargeInterest && farmer.interestRate > 0 && (
                    <span className="bg-red-500/40 px-1.5 rounded text-[8px]">{farmer.interestRate}%/mo</span>
                  )}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-2xl font-black text-white">{formatINR(farmer.advanceAmount)}</p>
                  {farmer.accruedInterest > 0 && (
                    <p className="text-xs font-bold text-red-200 flex flex-col leading-tight">
                      <span>+ {formatINR(farmer.accruedInterest)}</span>
                      <span className="text-[8px] uppercase tracking-wider">vyaj</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {farmer.bagsIssued > 0 && (
              <div className="bg-orange-500/20 border border-orange-400/30 rounded-2xl px-4 py-2 text-center flex flex-col justify-center min-w-[90px]">
                <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">Bori Debt</p>
                <p className="text-white font-black text-2xl">{farmer.bagsIssued}</p>
                <p className="text-orange-200/70 text-[9px] uppercase tracking-widest">out</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-4 pt-5 pb-2 overflow-x-auto -mt-6 relative z-10" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => { setTxnType("payment"); setTxnModal(true); }} className="px-5 py-3 bg-white text-red-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">💸</span> Give Payment</button>
        <button onClick={() => { setTxnType("deposit"); setTxnModal(true); }} className="px-5 py-3 bg-white text-emerald-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">📥</span> Receive Cash</button>
        <button onClick={() => { setTxnType("advance"); setTxnModal(true); }} className="px-5 py-3 bg-white text-blue-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">💰</span> Give Advance</button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Pending settlements ─────────────────────────────────────────────── */}
        {pending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-900">Pending Settlement</h3>
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
            </div>

            {pending.map(entry => {
              const crop = getCropConfig(entry.cropType);
              const open = settlingId === entry._id;
              const m    = open ? calcSettlement(entry) : null;
              const rate = getRate(entry);
              const isMoistureAdjusted = rate !== entry.ratePerKg;

              return (
                <div key={entry._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">

                  {/* Header row */}
                  <button onClick={() => openSettle(entry)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm capitalize">{entry.cropType} delivery</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${crop.badge}`}>{crop.emoji} {crop.label}</span>
                        {isMoistureAdjusted && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">💧 Moisture adj.</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.totalBags} Boris · {formatWeight(entry.totalWeight)} · ₹{entry.ratePerKg}/kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2a6c4a]">{formatINR(entry.netAmount ?? entry.totalAmount)}</p>
                      <p className="text-[10px] text-gray-400">{open ? "▲ close" : "▼ settle"}</p>
                    </div>
                  </button>

                  {/* Settlement panel */}
                  {open && m && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

                      {/* Settlement Pay Mode */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Payment Method</p>
                        <div className="flex gap-2 mb-3">
                          <select 
                            value={settleMode} 
                            onChange={e => setSettleMode(e.target.value)}
                            className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 font-bold text-sm focus:border-[#2a6c4a] focus:outline-none"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Jama">Jama (Add to Wallet)</option>
                          </select>
                        </div>
                        {settleMode === 'UPI' && (
                          <input type="text" placeholder="Transaction ID" value={settleUpi} onChange={e => setSettleUpi(e.target.value)} className="w-full mb-3 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm" />
                        )}

                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                          <button 
                            type="button" 
                            onClick={() => { 
                              setSettlePaidBy("seth"); 
                              if (settleMode === "Cash") setSettleMode("Jama"); 
                            }} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${settlePaidBy === "seth" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                          >
                            Seth Paid
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { 
                              setSettlePaidBy("munsi"); 
                              if (settleMode === "Jama") setSettleMode("Cash"); 
                            }} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${settlePaidBy === "munsi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                          >
                            Munsi Paid
                          </button>
                        </div>
                      </div>

                      {/* ── LAW 1: Trinity Calc + Moisture Override ──────────── */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">⚖️ Law 1 — Crop Value</p>
                          {isMoistureAdjusted && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">Rate adjusted for moisture</span>
                          )}
                        </div>

                        {/* Moisture rate field */}
                        <div className={`rounded-xl border p-3 mb-2 ${isMoistureAdjusted ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1.5">
                            💧 Moisture Adjustment — Lower rate if crop is wet/damaged
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 text-xs text-gray-400">
                              Original: <span className="font-semibold text-gray-700">₹{entry.ratePerKg}/kg</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400 text-xs">₹</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={entry.ratePerKg}
                                value={adjustedRates[entry._id] ?? entry.ratePerKg}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v) && v <= entry.ratePerKg && v > 0) {
                                    setAdjustedRates(p => ({ ...p, [entry._id]: v }));
                                  }
                                }}
                                className="w-20 text-sm font-bold text-center focus:outline-none"
                              />
                              <span className="text-gray-400 text-xs">/kg</span>
                            </div>
                          </div>
                          {isMoistureAdjusted && (
                            <p className="text-[10px] text-orange-600 mt-1.5">
                              Rate drop: ₹{(entry.ratePerKg - rate).toFixed(2)}/kg · Loss: {formatINR((entry.ratePerKg - rate) * entry.totalWeight)}
                            </p>
                          )}
                        </div>

                        {/* Trinity calculation chain */}
                        <div className="bg-white rounded-xl border border-gray-100 divide-y text-sm">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Total Weight</span>
                            <span className="font-semibold">{formatWeight(entry.totalWeight)}</span>
                          </div>
                          {m.karda > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Karda Cut</span>
                              <span className="font-semibold text-orange-500">−{formatWeight(m.karda)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Net Weight</span>
                            <span className="font-semibold">{formatWeight(Math.max(0, entry.totalWeight - m.karda))}</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Rate {isMoistureAdjusted && <span className="text-orange-500">(adj.)</span>}</span>
                            <span className="font-semibold">₹{rate}/kg</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Gross</span>
                            <span className="font-semibold">+{formatINR(m.gross)}</span>
                          </div>
                          {m.labour > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">👷 Palledari</span>
                              <span className="font-semibold text-red-500">−{formatINR(m.labour)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-[#2a6c4a] font-bold text-xs">Net Crop Value</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(m.netCrop)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── LAW 2: Jama / Udhar Recovery ─────────────────── */}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-2">💸 Law 2 — Recovery Options</p>
                        
                        {/* Debt / Deficit breakdown */}
                        <div className="flex gap-2 mb-3">
                          {outstandingDebt > 0 && (
                            <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-2.5">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Udhar (Loan)</p>
                              <p className="font-bold text-red-700">{formatINR(outstandingDebt)}</p>
                            </div>
                          )}
                          {farmer.balance < 0 && (
                            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Jama Deficit</p>
                              <p className="font-bold text-amber-700">{formatINR(Math.abs(farmer.balance))}</p>
                            </div>
                          )}
                        </div>

                        {/* Recovery options */}
                        <div className="space-y-2">
                          {/* Option 1: Partial Jama Recovery */}
                          <label className={`flex items-start gap-3 border-2 rounded-xl p-3 cursor-pointer ${enableJamaRecovery ? "border-amber-400 bg-amber-50" : "border-gray-100 bg-white"}`}>
                            <input
                              type="checkbox"
                              checked={enableJamaRecovery}
                              onChange={(e) => { setEnableJamaRecovery(e.target.checked); if(!e.target.checked) setJamaRecoveryAmt(""); }}
                              className="mt-0.5 accent-amber-600 shrink-0 w-4 h-4 rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">Partial Jama Recovery</p>
                              <p className="text-xs text-gray-500">Recover a custom amount towards the Jama balance.</p>
                              {enableJamaRecovery && (
                                <div className="mt-2">
                                  <input
                                    type="number"
                                    placeholder={farmer.balance < 0 ? `Max ${formatINR(Math.abs(farmer.balance))}` : "Amount"}
                                    value={jamaRecoveryAmt}
                                    onChange={e => setJamaRecoveryAmt(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </label>

                          {/* Option 2: Partial Udhar Recovery */}
                          <label className={`flex items-start gap-3 border-2 rounded-xl p-3 cursor-pointer ${enableUdharRecovery ? "border-red-400 bg-red-50" : "border-gray-100 bg-white"}`}>
                            <input
                              type="checkbox"
                              checked={enableUdharRecovery}
                              onChange={(e) => { setEnableUdharRecovery(e.target.checked); if(!e.target.checked) setUdharRecoveryAmt(""); }}
                              className="mt-0.5 accent-red-600 shrink-0 w-4 h-4 rounded"
                              disabled={outstandingDebt <= 0}
                            />
                            <div className="flex-1 opacity-100">
                              <p className={`text-sm font-bold ${outstandingDebt <= 0 ? "text-gray-400" : "text-gray-900"}`}>Partial Loan or Udhar Recovery</p>
                              <p className={`text-xs ${outstandingDebt <= 0 ? "text-gray-400" : "text-gray-500"}`}>Deduct a custom amount from the outstanding loan.</p>
                              {enableUdharRecovery && outstandingDebt > 0 && (
                                <div className="mt-2">
                                  <input
                                    type="number"
                                    placeholder={`Max ${formatINR(outstandingDebt)}`}
                                    value={udharRecoveryAmt}
                                    onChange={e => setUdharRecoveryAmt(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    max={outstandingDebt}
                                    className="w-full border border-red-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </label>

                          {/* Helper Text for Skip */}
                          {!enableJamaRecovery && !enableUdharRecovery && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                              <p className="text-xs text-green-700 font-bold">No recovery selected.</p>
                              <p className="text-[10px] text-green-600">Farmer will receive the full net crop value today.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── LAW 3: Chhoot ───────────────────────────────────── */}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">✂️ Law 3 — Chhoot (Round Cash)</p>
                        <p className="text-[10px] text-gray-400 mb-2">
                          If you pay round cash (e.g. ₹{Math.ceil(m.finalPayout / 100) * 100} instead of {formatINR(m.finalPayout)}), enter the extra amount here. The difference is logged as Chhoot — ledger stays accurate.
                        </p>
                        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-gray-400 text-sm">+₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Extra paid e.g. 20"
                            value={chhootAmt}
                            onChange={e => setChhootAmt(e.target.value)}
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                          />
                          {parseFloat(chhootAmt) > 0 && (
                            <span className="text-[10px] text-blue-500 font-semibold">Logged as Chhoot</span>
                          )}
                        </div>
                      </div>

                      {/* ── LAW 4: Bori return notice ───────────────────────── */}
                      {farmer.bagsIssued > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <span className="text-lg">📦</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-orange-700">Law 4 — Bori Cycle</p>
                            <p className="text-[10px] text-orange-600">
                              {entry.totalBags} full bags returned with this delivery.
                              Pending will drop: {farmer.bagsIssued} → {Math.max(0, farmer.bagsIssued - entry.totalBags)} bags out
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── Final payout summary ─────────────────────────────── */}
                      <div className={`rounded-xl border p-3.5 ${m.finalPayout >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        <div className="space-y-1 text-xs mb-2.5">
                          <div className="flex justify-between"><span className="text-gray-500">Net Crop Value</span><span className="font-semibold">{formatINR(m.netCrop)}</span></div>
                          {m.jamaRecovery > 0 && <div className="flex justify-between"><span className="text-gray-500">Jama Recovery</span><span className="font-semibold text-amber-500">−{formatINR(m.jamaRecovery)}</span></div>}
                          {m.udharRecovery > 0 && <div className="flex justify-between"><span className="text-gray-500">Udhar Recovery</span><span className="font-semibold text-red-500">−{formatINR(m.udharRecovery)}</span></div>}
                          {m.chhoot > 0 && <div className="flex justify-between"><span className="text-gray-500">Chhoot</span><span className="font-semibold text-blue-500">+{formatINR(m.chhoot)}</span></div>}
                        </div>
                        <div className={`flex items-center justify-between pt-2 border-t ${m.finalPayout >= 0 ? "border-green-200" : "border-red-200"}`}>
                          <p className={`font-bold text-sm uppercase ${m.finalPayout >= 0 ? "text-[#2a6c4a]" : "text-red-600"}`}>
                            {m.finalPayout >= 0 ? "Pay Farmer" : "Farmer Owes"}
                          </p>
                          <p className={`text-2xl font-bold ${m.finalPayout >= 0 ? "text-[#2a6c4a]" : "text-red-600"}`}>
                            {formatINR(Math.abs(m.finalPayout))}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={saving}
                        onClick={() => handleFinalize(entry)}
                        className="w-full bg-[#2a6c4a] text-white rounded-xl py-3.5 font-bold text-sm disabled:opacity-60 mt-4"
                      >
                        {saving ? "Processing…" : `✓ Settle ${formatINR(Math.abs(m.finalPayout))}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Loan & Interest card ────────────────────────────────────────────── */}
        {advancePrincipal > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Loan & Interest</h3>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${chargeInterest ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                {chargeInterest ? `Market · ${interestRate}%/month` : "Friendly · 0% interest"}
              </span>
            </div>

            {/* Interest Rate Slider */}
            <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>0%</span>
                <span className="font-bold text-amber-700">{interestRate}% / month</span>
                <span>5%</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={interestRate}
                onChange={async (e) => {
                  const val = parseFloat(e.target.value);
                  const isCharging = val > 0;
                  setFarmer(f => ({ ...f, interestRate: val, chargeInterest: isCharging }));
                  await api.patch(`/farmers/${id}`, { interestRate: val, chargeInterest: isCharging });
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400">Principal</p>
                <p className="font-bold text-red-600">{formatINR(advancePrincipal)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400">Accrued Interest</p>
                <p className="font-bold text-amber-600">{formatINR(accruedInterest)}</p>
              </div>
              {chargeInterest && (
                <div className="bg-amber-50 rounded-xl p-3 col-span-2">
                  <p className="text-[11px] text-gray-400 mb-0.5">Monthly Interest Formula</p>
                  <p className="text-xs font-mono text-amber-700">
                    ₹{advancePrincipal.toLocaleString()} × {interestRate}% = <span className="font-bold">+{formatINR(monthlyInterest)}/month</span>
                  </p>
                </div>
              )}
              <div className={`rounded-xl p-3 col-span-2 ${outstandingDebt > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="text-[11px] text-gray-400">Total Outstanding (principal + interest)</p>
                <p className={`font-bold text-lg ${outstandingDebt > 0 ? "text-red-700" : "text-green-600"}`}>
                  {formatINR(outstandingDebt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────────────── */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3">Transaction History</h3>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${tab === t ? "bg-[#2a6c4a] text-white" : "bg-gray-100 text-gray-500"}`}>{t}</button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">
                No history found
              </p>
            )}
            
            {filtered.map((e, idx) => {
                const crop        = e.cropType ? getCropConfig(e.cropType) : null;
                const isDelivery  = e.type === "delivery";
                const isSettlement = e.type === "settlement";
                const expanded    = expandedId === idx;
                const isOut       = e.type === "payment" || e.type === "advance";
                const borderMap   = { delivery: "border-l-green-500", payment: "border-l-red-500", advance: "border-l-amber-500", deposit: "border-l-blue-500", interest_accrual: "border-l-purple-500", settlement: "border-l-emerald-600" };
                const border      = borderMap[e.type] ?? "border-l-gray-200";
                return (
                  <div key={idx} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${border} shadow-sm overflow-hidden`}>
                    <div className="flex justify-between items-start p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{e.description}</span>
                          {crop && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${crop.badge}`}>{crop.emoji} {crop.label}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {e.paymentMode && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500">{e.paymentMode}</span>}
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        {isDelivery && farmer?.phone && (
                          <button 
                            onClick={(evt) => { evt.stopPropagation(); sendWhatsAppReceipt(e); }}
                            className="bg-[#25D366] text-white p-1.5 rounded-full shadow-sm active:scale-95 transition-all mt-0.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </button>
                        )}
                        {e.amount != null && (
                          <button onClick={() => (isDelivery || isSettlement) && setExpandedId(expanded ? null : idx)} className="text-right">
                            <p className={`font-bold text-base ${isOut ? "text-red-600" : "text-[#2a6c4a]"}`}>
                              {isOut ? "−" : "+"}{formatINR(e.amount)}
                            </p>
                            {(isDelivery || isSettlement) && <p className="text-[10px] text-gray-400">{expanded ? "▲ hide" : "▼ details"}</p>}
                          </button>
                        )}
                      </div>
                    </div>

                    {isDelivery && expanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                        {/* Individual bag weights — horizontal scroll */}
                        {e.bagWeights && e.bagWeights.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                              📦 {e.bagWeights.length} Individual Boris
                            </p>
                            <div
                              className="flex gap-2 overflow-x-auto pb-1"
                              style={{ scrollbarWidth: "none" }}
                            >
                              {e.bagWeights.map((w, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-white border border-[#2a6c4a]/20 rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
                                  <span className="w-4 h-4 rounded-full bg-[#2a6c4a] text-white text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{w}<span className="text-[10px] font-normal text-gray-400 ml-0.5">kg</span></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Calculation breakdown */}
                        <div className="bg-white rounded-xl border border-gray-100 divide-y text-sm">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Total Weight</span>
                            <span className="font-semibold">{formatWeight(e.totalWeight)}</span>
                          </div>
                          {(e.kardaWeight ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Karda Cut</span>
                              <span className="font-semibold text-orange-500">−{formatWeight(e.kardaWeight)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Net Weight</span>
                            <span className="font-semibold">{formatWeight(e.netWeight ?? e.totalWeight)}</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Rate</span>
                            <span className="font-semibold">₹{e.ratePerKg}/kg</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Gross</span>
                            <span className="font-semibold">+{formatINR((e.netWeight ?? e.totalWeight) * e.ratePerKg)}</span>
                          </div>
                          {(e.palledariAmount ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">👷 Palledari</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.palledariAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-xs font-bold text-[#2a6c4a]">Net Amount</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(e.netAmount ?? e.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isSettlement && expanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                        <div className="bg-white rounded-xl border border-gray-100 divide-y text-sm">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">Net Crop Value</span>
                            <span className="font-semibold">{formatINR(e.cropAmount)}</span>
                          </div>
                          {(e.jamaRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Jama Recovery</span>
                              <span className="font-semibold text-amber-500">−{formatINR(e.jamaRecovered)}</span>
                            </div>
                          )}
                          {(e.advanceRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Udhar Recovery</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.advanceRecovered)}</span>
                            </div>
                          )}
                          {(e.interestRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Interest Recovery</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.interestRecovered)}</span>
                            </div>
                          )}
                          {(e.chhootAmount ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">Chhoot Paid</span>
                              <span className="font-semibold text-blue-500">+{formatINR(e.chhootAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-xs font-bold text-[#2a6c4a]">Final Payout</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(e.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Passbook Footer */}
                    {e.runningBalance !== undefined && (
                      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-[10px] whitespace-nowrap rounded-b-2xl">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">Jama:</span>
                          <span className={`font-bold ${e.runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatINR(e.runningBalance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">Udhar:</span>
                          <span className="font-bold text-amber-600">{formatINR(e.runningAdvance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">Vyaj:</span>
                          <span className="font-bold text-red-600">{formatINR(e.runningInterest)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }

            {filtered.length > 0 && timeline.length >= timelineLimit && (
              <button 
                onClick={() => setTimelineLimit(p => p + 30)}
                className="w-full py-3 text-sm font-semibold text-[#2a6c4a] bg-green-50 rounded-xl hover:bg-green-100 mt-4"
              >
                Load Older Transactions
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Transaction Modal ──────────────────────────────────────────────── */}
      {txnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">
                {txnType === "payment" && "Give Payment (To Farmer)"}
                {txnType === "deposit" && "Receive Cash (From Farmer)"}
                {txnType === "advance" && "Give Advance (Loan)"}
              </h3>
              <button onClick={() => setTxnModal(false)} className="text-gray-400 font-bold text-xl hover:text-gray-600">✕</button>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Amount (₹)</label>
              <input 
                type="number" 
                value={txnAmount} 
                onChange={e => setTxnAmount(e.target.value)} 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-xl focus:border-[#2a6c4a] focus:outline-none" 
                placeholder="e.g. 5000" 
              />
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-3">
              <button type="button" onClick={() => setTxnPaidBy("seth")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${txnPaidBy === "seth" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Seth</button>
              <button type="button" onClick={() => setTxnPaidBy("munsi")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${txnPaidBy === "munsi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Munsi</button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Notes (Optional)</label>
              <input type="text" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Payment Mode</label>
              <select 
                value={txnMode} 
                onChange={e => setTxnMode(e.target.value)} 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-[#2a6c4a] focus:outline-none bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="PhonePe">PhonePe</option>
                <option value="GPay">Google Pay</option>
                <option value="Paytm">Paytm</option>
              </select>
            </div>

            <button 
              disabled={saving || !txnAmount || txnAmount <= 0} 
              onClick={async () => {
                setSaving(true);
                await api.post("/transactions", { 
                    farmerId: id, 
                    type: txnType, 
                    amount: parseFloat(txnAmount), 
                    paymentMode: txnMode,
                    paidBy: txnPaidBy,
                    notes: txnNotes || null,
                    chargeInterest: txnType === "advance" ? chargeInterest : undefined, 
                    interestRate: txnType === "advance" ? interestRate : undefined 
                });
                setSaving(false);
                setTxnModal(false);
                setTxnAmount("");
                load();
              }}
              className="w-full py-3.5 bg-[#2a6c4a] text-white rounded-xl font-bold disabled:opacity-50 mt-2"
            >
              {saving ? "Processing..." : "Confirm Transaction"}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-lg text-gray-900">Edit Farmer Profile</h3>
              <button onClick={() => setEditModal(false)} className="text-gray-400 font-bold text-xl hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4" style={{ scrollbarWidth: "thin" }}>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Farmer Name *</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-bold text-sm focus:border-[#2a6c4a] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Father's Name</label>
                <input type="text" value={editForm.fatherName} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Phone</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Village</label>
                  <input type="text" value={editForm.village} onChange={e => setEditForm({...editForm, village: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Full Address</label>
                <textarea rows={2} value={editForm.fullAddress} onChange={e => setEditForm({...editForm, fullAddress: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none resize-none"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Guarantor Name</label>
                  <input type="text" value={editForm.guarantorName} onChange={e => setEditForm({...editForm, guarantorName: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Guarantor Phone</label>
                  <input type="text" value={editForm.guarantorPhone} onChange={e => setEditForm({...editForm, guarantorPhone: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Notes / Observations</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none resize-none"></textarea>
              </div>
            </div>

            <button 
              disabled={saving || !editForm.name} 
              onClick={handleUpdateProfile}
              className="w-full py-3.5 bg-[#2a6c4a] text-white rounded-xl font-bold disabled:opacity-50 mt-4 shrink-0"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
