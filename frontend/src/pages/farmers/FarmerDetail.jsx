import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import AppLayout from "../../components/layout/AppLayout.jsx";
import { api } from "../../lib/api.js";
import { decodeToken } from "../../lib/jwt.js";
import { formatINR, formatWeight } from "../../lib/format.js";
import { getCropConfig, getAvatarColor, getInitials } from "../../lib/crop.js";
import { showToast } from "../../lib/toast.js";
import { MessageCircle, X, Check, Banknote, QrCode, Percent, ChevronDown, FileText } from "lucide-react";
import { useTranslation } from "../../lib/i18n.jsx";
import SaafHisaabLogo from "../SaafHisaabLogo.jsx";
import FarmerReportDialog from "../../components/reports/FarmerReportDialog.jsx";

const TABS = ["All", "Deliveries", "Payments", "Advances"];
const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash", Icon: Banknote, tone: "bg-emerald-100 text-emerald-700" },
  { value: "UPI", label: "UPI", Icon: QrCode, tone: "bg-indigo-100 text-indigo-700" },
  { value: "PhonePe", label: "PhonePe", logo: "/payment-icons/phonepe.svg" },
  { value: "GPay", label: "Google Pay", logo: "/payment-icons/google-pay.svg" },
  { value: "Paytm", label: "Paytm", logo: "/payment-icons/paytm.svg" },
];

export default function FarmerDetail() {
  const { t, language } = useTranslation();
  const { id } = useParams();
  const [farmer, setFarmer]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [pending, setPending]   = useState([]);
  const [tab, setTab]           = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [interestDetailsOpen, setInterestDetailsOpen] = useState(false);
  const [timelineLimit, setTimelineLimit] = useState(30);
  const [notFound, setNotFound] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
    const locale = language === "hi" ? "hi-IN" : "en-IN";
    const dateStr = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(txn.date || txn.createdAt));
    const formatReceiptWeight = (weight) => `${Number(weight ?? 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${t("kg")}`;
    const formatReceiptAmount = (amount) => `₹${Number(amount ?? 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    let lines = [];

    if (txn.type === 'delivery') {
      const cropName = txn.cropType ? txn.cropType.charAt(0).toUpperCase() + txn.cropType.slice(1) : '';
      const bagWeights = Array.isArray(txn.bagWeights) ? txn.bagWeights : [];
      const totalWeight = Number(txn.totalWeight ?? 0);
      const netWeight = Number(txn.netWeight ?? txn.totalWeight ?? 0);
      const ratePerKg = Number(txn.ratePerKg ?? 0);
      const grossAmount = Math.round(netWeight * ratePerKg * 100) / 100;
      lines = [
        "🌾 *SaafHisaab Mandi*",
        `*${t("Crop Delivery Receipt")}*`,
        "━━━━━━━━━━━━━━━━━━━━",
        `👨‍🌾 *${t("Farmer")}:* ${farmer.name}`,
        `📅 *${t("Date")}:* ${dateStr}`,
        ...(cropName ? [`🌱 *${t("Crop")}:* ${t(cropName)}`] : []),
        ...(bagWeights.length > 0 ? [
          "",
          `📦 *${t("Individual Bags")} (${bagWeights.length})*`,
          ...bagWeights.map((weight, index) => `${String(index + 1).padStart(2, "0")}. ${formatReceiptWeight(weight)}`),
        ] : []),
        "",
        `📊 *${t("Delivery Summary")}*`,
        `• ${t("Total Weight")}: ${formatReceiptWeight(totalWeight)}`,
        ...((Number(txn.kardaWeight) || 0) > 0 ? [`• ${t("Karda Cut")}: -${formatReceiptWeight(txn.kardaWeight)}`] : []),
        `• ${t("Net Weight")}: ${formatReceiptWeight(netWeight)}`,
        `• ${t("Rate")}: ${formatReceiptAmount(ratePerKg)}/${t("kg")}`,
        `• ${t("Gross Amount")}: ${formatReceiptAmount(grossAmount)}`,
        ...((Number(txn.palledariAmount) || 0) > 0 ? [`• 👷 ${t("Palledari")}: -${formatReceiptAmount(txn.palledariAmount)}`] : []),
        "━━━━━━━━━━━━━━━━━━━━",
        `✅ *${t("Net Amount")}: ${formatReceiptAmount(txn.netAmount ?? txn.amount)}*`,
        "",
        t("Thank you for trading with us!"),
      ];
    } else {
      const cropValue = Number(txn.cropAmount || 0);
      const recovery = Number(txn.jamaRecovered || 0) + Number(txn.advanceRecovered || 0) + Number(txn.interestRecovered || 0);
      const chhoot = Number(txn.chhootAmount || 0);
      lines = [
        "🌾 *SaafHisaab Mandi*",
        `*${t("Settlement Receipt")}*`,
        "━━━━━━━━━━━━━━━━━━━━",
        `👨‍🌾 *${t("Farmer")}:* ${farmer.name}`,
        `📅 *${t("Date")}:* ${dateStr}`,
        "",
        `📊 *${t("Settlement Summary")}*`,
        `• ${t("Crop Value")}: ${formatReceiptAmount(cropValue)}`,
        `• ${t("Total Recovery/Udhar")}: -${formatReceiptAmount(recovery)}`,
        ...(chhoot > 0 ? [`• ${t("Chhoot (Bonus)")}: +${formatReceiptAmount(chhoot)}`] : []),
        "━━━━━━━━━━━━━━━━━━━━",
        `✅ *${t("Final Settlement Payout")}: ${formatReceiptAmount(txn.amount)}*`,
        "",
        t("Thank you for trading with us!"),
      ];
    }

    const message = lines.join("\n");
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
      showToast(err.message || t("Failed to save. Please try again."), "error");
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
    <AppLayout title={t("Not Found")} showBack>
      <div className="p-12 text-center flex flex-col items-center h-[60vh] justify-center">
        <span className="text-6xl mb-4 grayscale opacity-50">🕵️</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("Khata Not Found")}</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-[250px] leading-relaxed">{t("This farmer may have been deleted or the link is invalid.")}</p>
        <button onClick={() => history.back()} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm active:scale-95">{t("Go Back")}</button>
      </div>
    </AppLayout>
  );

  if (!farmer) return (
    <AppLayout title={t("Farmer Khata")} showBack>
      <div className="p-8 text-center text-gray-400">{t("Loading…")}</div>
    </AppLayout>
  );

  return (
    <AppLayout title={t("Farmer Khata")} showBack>
      <div className="farmer-detail-content">
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
                <button onClick={openEditModal} className="text-blue-700 bg-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform">✏️ {t("Edit Profile")}</button>
              </div>
              <p className="text-white/80 text-xs mt-1 font-medium">📍 {farmer.village} · 📞 {farmer.phone}</p>
              {farmer.fatherName && <p className="text-white/60 text-[10px] mt-0.5 font-medium uppercase tracking-wider">{t("S/O")} {farmer.fatherName}</p>}
            </div>
          </div>

          {/* Balance + Bags row */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 rounded-2xl p-4 bg-white/10 border border-white/20 min-w-[140px]">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${farmer.balance >= 0 ? "text-green-300" : "text-red-300"}`}>
                {farmer.balance >= 0 ? `↑ ${t("Jama Balance")}` : `↓ ${t("Wallet Due")}`}
              </p>
              <p className="text-2xl font-black text-white mt-1">
                {formatINR(Math.abs(farmer.balance))}
              </p>
            </div>

            {(farmer.advanceAmount > 0 || farmer.accruedInterest > 0) && (
              <div className="flex-1 rounded-2xl p-4 bg-red-500/20 border border-red-400/30 min-w-[140px]">
                <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest flex justify-between">
                  <span>↓ {t("Udhar (Loan)")}</span>
                  {farmer.chargeInterest && farmer.interestRate > 0 && (
                    <span className="bg-red-500/40 px-1.5 rounded text-[8px]">{farmer.interestRate}%/mo</span>
                  )}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-2xl font-black text-white">{formatINR(farmer.advanceAmount)}</p>
                  {farmer.accruedInterest > 0 && (
                    <p className="text-xs font-bold text-red-200 flex flex-col leading-tight">
                      <span>+ {formatINR(farmer.accruedInterest)}</span>
                      <span className="text-[8px] uppercase tracking-wider">{t("vyaj")}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {farmer.bagsIssued > 0 && (
              <div className="bg-orange-500/20 border border-orange-400/30 rounded-2xl px-4 py-2 text-center flex flex-col justify-center min-w-[90px]">
                <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">{t("Bori Debt")}</p>
                <p className="text-white font-black text-2xl">{farmer.bagsIssued}</p>
                <p className="text-orange-200/70 text-[9px] uppercase tracking-widest">{t("out")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-4 pt-5 pb-2 overflow-x-auto -mt-6 relative z-10" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => { setTxnType("payment"); setTxnModal(true); }} className="px-5 py-3 bg-white text-red-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">💸</span> {t("Give Payment")}</button>
        <button onClick={() => { setTxnType("deposit"); setTxnModal(true); }} className="px-5 py-3 bg-white text-emerald-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">📥</span> {t("Receive Cash")}</button>
        <button onClick={() => { setTxnType("advance"); setTxnModal(true); }} className="px-5 py-3 bg-white text-blue-600 rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><span className="text-lg leading-none">💰</span> {t("Give Advance")}</button>
        <button onClick={() => setReportOpen(true)} className="px-5 py-3 bg-white text-[#2a6c4a] rounded-2xl font-bold text-xs whitespace-nowrap shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-gray-100 active:scale-95 transition-transform flex items-center gap-2"><FileText size={17} /> Farmer Statement / PDF</button>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Pending settlements ─────────────────────────────────────────────── */}
        {pending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-900">{t("Pending Settlement")}</h3>
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
                        <span className="font-bold text-gray-900 text-sm capitalize">{t(crop.label)} {t("delivery")}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${crop.badge}`}>{crop.emoji} {t(crop.label)}</span>
                        {isMoistureAdjusted && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">💧 {t("Moisture adj.")}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.totalBags} {t("bags")} · {formatWeight(entry.totalWeight)} · ₹{entry.ratePerKg}/kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2a6c4a]">{formatINR(entry.netAmount ?? entry.totalAmount)}</p>
                      <p className="text-[10px] text-gray-400">{open ? `▲ ${t("close")}` : `▼ ${t("settle")}`}</p>
                    </div>
                  </button>

                  {/* Settlement panel */}
                  {open && m && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

                      {/* Settlement Pay Mode */}
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{t("Payment Method")}</p>
                        <div className="flex gap-2 mb-3">
                          <select 
                            value={settleMode} 
                            onChange={e => setSettleMode(e.target.value)}
                            className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 font-bold text-sm focus:border-[#2a6c4a] focus:outline-none"
                          >
                            <option value="Cash">{t("Cash")}</option>
                            <option value="UPI">{t("UPI")}</option>
                            <option value="Jama">{t("Jama (Add to Wallet)")}</option>
                          </select>
                        </div>
                        {settleMode === 'UPI' && (
                          <input type="text" placeholder={t("Transaction ID")} value={settleUpi} onChange={e => setSettleUpi(e.target.value)} className="w-full mb-3 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm" />
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
                            {t("Owner Paid")}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { 
                              setSettlePaidBy("munsi"); 
                              if (settleMode === "Jama") setSettleMode("Cash"); 
                            }} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${settlePaidBy === "munsi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                          >
                            {t("Staff Paid")}
                          </button>
                        </div>
                      </div>

                      {/* ── LAW 1: Trinity Calc + Moisture Override ──────────── */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-700">⚖️ {t("Law 1 — Crop Value")}</p>
                          {isMoistureAdjusted && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">{t("Rate adjusted for moisture")}</span>
                          )}
                        </div>

                        {/* Moisture rate field */}
                        <div className={`rounded-xl border p-3 mb-2 ${isMoistureAdjusted ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1.5">
                            💧 {t("Moisture Adjustment — Lower rate if crop is wet/damaged")}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 text-xs text-gray-400">
                              {t("Original")}: <span className="font-semibold text-gray-700">₹{entry.ratePerKg}/kg</span>
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
                              {t("Rate drop")}: ₹{(entry.ratePerKg - rate).toFixed(2)}/kg · {t("Loss")}: {formatINR((entry.ratePerKg - rate) * entry.totalWeight)}
                            </p>
                          )}
                        </div>

                        {/* Trinity calculation chain */}
                        <div className="bg-white rounded-xl border border-gray-100 divide-y text-sm">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Total Weight")}</span>
                            <span className="font-semibold">{formatWeight(entry.totalWeight)}</span>
                          </div>
                          {m.karda > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Karda Cut")}</span>
                              <span className="font-semibold text-orange-500">−{formatWeight(m.karda)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Net Weight")}</span>
                            <span className="font-semibold">{formatWeight(Math.max(0, entry.totalWeight - m.karda))}</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Rate")} {isMoistureAdjusted && <span className="text-orange-500">({t("adj.")})</span>}</span>
                            <span className="font-semibold">₹{rate}/kg</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Gross")}</span>
                            <span className="font-semibold">+{formatINR(m.gross)}</span>
                          </div>
                          {m.labour > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">👷 {t("Palledari")}</span>
                              <span className="font-semibold text-red-500">−{formatINR(m.labour)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-[#2a6c4a] font-bold text-xs">{t("Net Crop Value")}</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(m.netCrop)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── LAW 2: Jama / Udhar Recovery ─────────────────── */}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-2">💸 {t("Law 2 — Recovery Options")}</p>
                        
                        {/* Debt / Deficit breakdown */}
                        <div className="flex gap-2 mb-3">
                          {outstandingDebt > 0 && (
                            <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-2.5">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">{t("Udhar (Loan)")}</p>
                              <p className="font-bold text-red-700">{formatINR(outstandingDebt)}</p>
                            </div>
                          )}
                          {farmer.balance < 0 && (
                            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">{t("Jama Deficit")}</p>
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
                              <p className="text-sm font-bold text-gray-900">{t("Partial Jama Recovery")}</p>
                              <p className="text-xs text-gray-500">{t("Recover a custom amount towards the Jama balance.")}</p>
                              {enableJamaRecovery && (
                                <div className="mt-2">
                                  <input
                                    type="number"
                                    placeholder={farmer.balance < 0 ? `${t("Max")} ${formatINR(Math.abs(farmer.balance))}` : t("Amount")}
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
                              <p className={`text-sm font-bold ${outstandingDebt <= 0 ? "text-gray-400" : "text-gray-900"}`}>{t("Partial Loan or Udhar Recovery")}</p>
                              <p className={`text-xs ${outstandingDebt <= 0 ? "text-gray-400" : "text-gray-500"}`}>{t("Deduct a custom amount from the outstanding loan.")}</p>
                              {enableUdharRecovery && outstandingDebt > 0 && (
                                <div className="mt-2">
                                  <input
                                    type="number"
                                    placeholder={`${t("Max")} ${formatINR(outstandingDebt)}`}
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
                              <p className="text-xs text-green-700 font-bold">{t("No recovery selected.")}</p>
                              <p className="text-[10px] text-green-600">{t("Farmer will receive the full net crop value today.")}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── LAW 3: Chhoot ───────────────────────────────────── */}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">✂️ {t("Law 3 — Chhoot (Round Cash)")}</p>
                        <p className="text-[10px] text-gray-400 mb-2">
                          {t("If you pay round cash (e.g.")} ₹{Math.ceil(m.finalPayout / 100) * 100} {t("instead of")} {formatINR(m.finalPayout)}{t("), enter the extra amount here. The difference is logged as Chhoot — ledger stays accurate.")}
                        </p>
                        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-gray-400 text-sm">+₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={t("Extra paid e.g. 20")}
                            value={chhootAmt}
                            onChange={e => setChhootAmt(e.target.value)}
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                          />
                          {parseFloat(chhootAmt) > 0 && (
                            <span className="text-[10px] text-blue-500 font-semibold">{t("Logged as Chhoot")}</span>
                          )}
                        </div>
                      </div>

                      {/* ── LAW 4: Bori return notice ───────────────────────── */}
                      {farmer.bagsIssued > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <span className="text-lg">📦</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-orange-700">{t("Law 4 — Bori Cycle")}</p>
                            <p className="text-[10px] text-orange-600">
                              {entry.totalBags} {t("full bags returned with this delivery.")} {t("Pending will drop:")} {farmer.bagsIssued} → {Math.max(0, farmer.bagsIssued - entry.totalBags)} {t("bags out")}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── Final payout summary ─────────────────────────────── */}
                      <div className={`rounded-xl border p-3.5 ${m.finalPayout >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                        <div className="space-y-1 text-xs mb-2.5">
                          <div className="flex justify-between"><span className="text-gray-500">{t("Net Crop Value")}</span><span className="font-semibold">{formatINR(m.netCrop)}</span></div>
                          {m.jamaRecovery > 0 && <div className="flex justify-between"><span className="text-gray-500">{t("Jama Recovery")}</span><span className="font-semibold text-amber-500">−{formatINR(m.jamaRecovery)}</span></div>}
                          {m.udharRecovery > 0 && <div className="flex justify-between"><span className="text-gray-500">{t("Udhar Recovery")}</span><span className="font-semibold text-red-500">−{formatINR(m.udharRecovery)}</span></div>}
                          {m.chhoot > 0 && <div className="flex justify-between"><span className="text-gray-500">{t("Chhoot")}</span><span className="font-semibold text-blue-500">+{formatINR(m.chhoot)}</span></div>}
                        </div>
                        <div className={`flex items-center justify-between pt-2 border-t ${m.finalPayout >= 0 ? "border-green-200" : "border-red-200"}`}>
                          <p className={`font-bold text-sm uppercase ${m.finalPayout >= 0 ? "text-[#2a6c4a]" : "text-red-600"}`}>
                            {m.finalPayout >= 0 ? t("Pay Farmer") : t("Farmer Owes")}
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
                        {saving ? t("Processing…") : `✓ ${t("Settle")} ${formatINR(Math.abs(m.finalPayout))}`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Loan & Interest card ────────────────────────────────────────────── */}
        {(advancePrincipal > 0 || accruedInterest > 0) && (
          <section className="overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Percent size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">{t("Loan account")}</p>
                    <h3 className="truncate font-bold text-gray-900">{t("Loan & Interest")}</h3>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                  chargeInterest ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {chargeInterest ? t("Interest active") : t("Interest paused")}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500">{t("Total Outstanding (principal + interest)")}</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-gray-900">{formatINR(outstandingDebt)}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white bg-white/70 p-3">
                  <p className="text-[11px] font-medium text-gray-500">{t("Principal")}</p>
                  <p className="mt-1 font-bold text-red-700">{formatINR(advancePrincipal)}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white/70 p-3">
                  <p className="text-[11px] font-medium text-gray-500">{t("Accrued Interest")}</p>
                  <p className="mt-1 font-bold text-amber-700">{formatINR(accruedInterest)}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100">
              <button
                type="button"
                aria-expanded={interestDetailsOpen}
                aria-controls="farmer-interest-details"
                onClick={() => setInterestDetailsOpen(open => !open)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 sm:px-5"
              >
                <span className="text-sm font-bold text-gray-800">{t("Monthly rate & estimate")}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-amber-800">
                  {interestDetailsOpen ? t("Hide details") : t("Show details")}
                  <ChevronDown size={16} className={`transition-transform ${interestDetailsOpen ? "rotate-180" : ""}`} />
                </span>
              </button>

              <div id="farmer-interest-details" hidden={!interestDetailsOpen} className="space-y-3 border-t border-gray-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label htmlFor="farmer-interest-rate" className="text-sm font-bold text-gray-900">{t("Monthly interest rate")}</label>
                    <p className="mt-1 text-xs text-gray-500">{t("Choose 0% to stop interest.")}</p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-800">
                    {interestRate}% / {t("month")}
                  </span>
                </div>
                <input
                  id="farmer-interest-rate"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={interestRate}
                  aria-label={t("Monthly interest rate")}
                  onChange={async (e) => {
                    const val = parseFloat(e.target.value);
                    const isCharging = val > 0;
                    setFarmer(f => ({ ...f, interestRate: val, chargeInterest: isCharging }));
                    await api.patch(`/farmers/${id}`, { interestRate: val, chargeInterest: isCharging });
                  }}
                  className="w-full cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] font-semibold text-gray-400">
                  <span>0%</span>
                  <span>5%</span>
                </div>

                {chargeInterest ? (
                  <div className="flex flex-col gap-1 rounded-2xl bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-900">{t("Estimated monthly interest")}</p>
                      <p className="mt-0.5 text-[11px] text-amber-800">
                        {formatINR(advancePrincipal)} × {interestRate}% / {t("month")}
                      </p>
                    </div>
                    <p className="text-lg font-extrabold text-amber-800">{formatINR(monthlyInterest)}</p>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800">
                    {t("No monthly interest at 0%.")}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Timeline ────────────────────────────────────────────────────────── */}
        <section>
          <h3 className="font-bold text-gray-900 mb-3">{t("Transaction History")}</h3>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {TABS.map(tabLabel => (
              <button key={tabLabel} onClick={() => setTab(tabLabel)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${tab === tabLabel ? "bg-[#2a6c4a] text-white" : "bg-gray-100 text-gray-500"}`}>{t(tabLabel)}</button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">
                {t("No transactions yet. Purchases, payments, and settlements will appear here.")}
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
                          <span className="font-bold text-gray-900 text-sm">{t(e.description)}</span>
                          {crop && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${crop.badge}`}>{crop.emoji} {t(crop.label)}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          {new Date(e.date).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {e.paymentMode && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500">{t(e.paymentMode)}</span>}
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        {isDelivery && farmer?.phone && (
                          <button 
                            onClick={(evt) => { evt.stopPropagation(); sendWhatsAppReceipt(e); }}
                            aria-label={t("Send WhatsApp receipt")}
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
                            {(isDelivery || isSettlement) && <p className="text-[10px] text-gray-400">{expanded ? `▲ ${t("hide")}` : `▼ ${t("details")}`}</p>}
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
                              📦 {e.bagWeights.length} {t("Individual Bags")}
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
                            <span className="text-xs text-gray-500">{t("Total Weight")}</span>
                            <span className="font-semibold">{formatWeight(e.totalWeight)}</span>
                          </div>
                          {(e.kardaWeight ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Karda Cut")}</span>
                              <span className="font-semibold text-orange-500">−{formatWeight(e.kardaWeight)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Net Weight")}</span>
                            <span className="font-semibold">{formatWeight(e.netWeight ?? e.totalWeight)}</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Rate")}</span>
                            <span className="font-semibold">₹{e.ratePerKg}/kg</span>
                          </div>
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Gross")}</span>
                            <span className="font-semibold">+{formatINR((e.netWeight ?? e.totalWeight) * e.ratePerKg)}</span>
                          </div>
                          {(e.palledariAmount ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">👷 {t("Palledari")}</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.palledariAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-xs font-bold text-[#2a6c4a]">{t("Net Amount")}</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(e.netAmount ?? e.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isSettlement && expanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                        <div className="bg-white rounded-xl border border-gray-100 divide-y text-sm">
                          <div className="flex justify-between px-3 py-2">
                            <span className="text-xs text-gray-500">{t("Net Crop Value")}</span>
                            <span className="font-semibold">{formatINR(e.cropAmount)}</span>
                          </div>
                          {(e.jamaRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Jama Recovery")}</span>
                              <span className="font-semibold text-amber-500">−{formatINR(e.jamaRecovered)}</span>
                            </div>
                          )}
                          {(e.advanceRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Udhar Recovery")}</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.advanceRecovered)}</span>
                            </div>
                          )}
                          {(e.interestRecovered ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Interest Recovery")}</span>
                              <span className="font-semibold text-red-500">−{formatINR(e.interestRecovered)}</span>
                            </div>
                          )}
                          {(e.chhootAmount ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2">
                              <span className="text-xs text-gray-500">{t("Chhoot Paid")}</span>
                              <span className="font-semibold text-blue-500">+{formatINR(e.chhootAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 bg-green-50 rounded-b-xl">
                            <span className="text-xs font-bold text-[#2a6c4a]">{t("Final Payout")}</span>
                            <span className="font-bold text-[#2a6c4a]">{formatINR(e.amount)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Passbook Footer */}
                    {e.runningBalance !== undefined && (
                      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-[10px] whitespace-nowrap rounded-b-2xl">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">{t("Jama")}:</span>
                          <span className={`font-bold ${e.runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatINR(e.runningBalance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">{t("Udhar")}:</span>
                          <span className="font-bold text-amber-600">{formatINR(e.runningAdvance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 uppercase font-bold">{t("Vyaj")}:</span>
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
                {t("Load Older Transactions")}
              </button>
            )}
          </div>
        </section>
      </div>
      </div>

      <FarmerReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        farmer={farmer}
        language={language}
      />

      {/* ── Transaction Modal ──────────────────────────────────────────────── */}
      {txnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2a6c4a]">
                  <SaafHisaabLogo size={34} primary="#ffffff" accent="#86efac" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2a6c4a]">SaafHisaab Mandi</p>
                  <h3 className="font-bold leading-tight text-gray-900">
                    {txnType === "payment" && t("Give Payment (To Farmer)")}
                    {txnType === "deposit" && t("Receive Cash (From Farmer)")}
                    {txnType === "advance" && t("Give Advance (Loan)")}
                  </h3>
                </div>
              </div>
              <button type="button" onClick={() => setTxnModal(false)} aria-label={t("Close transaction form")} className="shrink-0 rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Amount (₹)")}</label>
              <input 
                type="number" 
                value={txnAmount} 
                onChange={e => setTxnAmount(e.target.value)} 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-xl focus:border-[#2a6c4a] focus:outline-none" 
                placeholder={t("e.g. 5000")}
              />
            </div>

            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-3">
              <button type="button" onClick={() => setTxnPaidBy("seth")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${txnPaidBy === "seth" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t("Owner")}</button>
              <button type="button" onClick={() => setTxnPaidBy("munsi")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${txnPaidBy === "munsi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{t("Staff")}</button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Notes (Optional)")}</label>
              <input type="text" value={txnNotes} onChange={e => setTxnNotes(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Payment Mode")}</label>
              <div role="radiogroup" aria-label={t("Payment Mode")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_METHODS.map(({ value, label, Icon, logo, tone }) => {
                  const selected = txnMode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setTxnMode(value)}
                      className={`flex min-h-14 items-center gap-2 rounded-xl border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2a6c4a]/30 ${
                        selected ? "border-[#2a6c4a] bg-green-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${logo ? "border border-gray-100 bg-white" : tone}`}>
                        {logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Icon size={18} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-800">{t(label)}</span>
                      {selected && <Check size={15} className="shrink-0 text-[#2a6c4a]" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-gray-500">{t("This records the selected method; it does not transfer money.")}</p>
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
              {saving ? t("Processing...") : t("Confirm Transaction")}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-lg text-gray-900">{t("Edit Farmer Profile")}</h3>
              <button onClick={() => setEditModal(false)} aria-label={t("Close edit form")} className="text-gray-400 font-bold text-xl hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4" style={{ scrollbarWidth: "thin" }}>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Farmer Name")} *</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-bold text-sm focus:border-[#2a6c4a] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Father's Name")}</label>
                <input type="text" value={editForm.fatherName} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Phone")}</label>
                  <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Village")}</label>
                  <input type="text" value={editForm.village} onChange={e => setEditForm({...editForm, village: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Full Address")}</label>
                <textarea rows={2} value={editForm.fullAddress} onChange={e => setEditForm({...editForm, fullAddress: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none resize-none"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Guarantor Name")}</label>
                  <input type="text" value={editForm.guarantorName} onChange={e => setEditForm({...editForm, guarantorName: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Guarantor Phone")}</label>
                  <input type="text" value={editForm.guarantorPhone} onChange={e => setEditForm({...editForm, guarantorPhone: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">{t("Notes / Observations")}</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#2a6c4a] focus:outline-none resize-none"></textarea>
              </div>
            </div>

            <button 
              disabled={saving || !editForm.name} 
              onClick={handleUpdateProfile}
              className="w-full py-3.5 bg-[#2a6c4a] text-white rounded-xl font-bold disabled:opacity-50 mt-4 shrink-0"
            >
              {saving ? t("Saving...") : t("Save Profile")}
            </button>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
