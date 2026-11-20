import React from "react";
import { formatINR } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ReportSummary({ report }) {
  const { t } = useTranslation();
  const summary = report.summary || {};
  
  const buckets = [
    { key: "jama", label: "Jama balance", opening: report.openingBalance?.jama, closing: report.closingBalance?.jama },
    { key: "principal", label: "Loan principal", opening: report.openingBalance?.principal, closing: report.closingBalance?.principal },
    { key: "interest", label: "Outstanding interest", opening: report.openingBalance?.interest, closing: report.closingBalance?.interest },
  ];

  const money = (value) => (value == null ? t("Unavailable") : formatINR(value));

  // Plain-language balance position details
  const isSethOwes = report.balancePosition === "seth_owes_farmer";
  const isFarmerOwes = report.balancePosition === "farmer_owes_seth";
  const isNoDue = report.balancePosition === "no_net_jama_due";
  const jamaAmount = report.closingBalance?.jama != null ? Math.abs(report.closingBalance.jama) : null;

  const activityMetrics = [
    { label: "Delivery value", value: money(summary.totalNetDeliveryValue), sub: `${summary.deliveryStatuses?.approved?.count || 0} ${t("approved")}`, color: "text-emerald-700" },
    { label: "Settlement payouts", value: money(summary.totalSettlementPayouts), sub: `${summary.completedSettlements || 0} ${t("completed")}`, color: "text-blue-700" },
    { label: "Total payments", value: money(summary.totalPayments), sub: t("Given to farmer"), color: "text-red-600" },
    { label: "Total advances", value: money(summary.totalAdvances), sub: t("Loan given"), color: "text-amber-700" },
    { label: "Total deposits", value: money(summary.totalDeposits), sub: t("Received from farmer"), color: "text-emerald-700" },
    { label: "Total interest generated", value: money(summary.totalInterestGenerated), sub: t("Accrued on advances"), color: "text-gray-800" },
  ];

  return (
    <section className="space-y-4">
      {/* 1. Who Owes Whom Banner */}
      <div className={`rounded-2xl border p-4 transition-all shadow-sm print-avoid-break ${
        isSethOwes
          ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-900"
          : isFarmerOwes
          ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900"
          : "border-gray-200 bg-gray-50 text-gray-800"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
              {t("Net balance position")}
            </p>
            <p className="text-xl font-black flex items-center gap-2">
              {isSethOwes && <ArrowUpRight className="text-emerald-600 shrink-0" size={24} />}
              {isFarmerOwes && <ArrowDownLeft className="text-amber-600 shrink-0" size={24} />}
              {isNoDue && <CheckCircle2 className="text-gray-500 shrink-0" size={24} />}
              {t(isSethOwes ? "Seth owes the farmer" : isFarmerOwes ? "Farmer owes the Seth" : isNoDue ? "No net Jama due" : "Jama position unavailable")}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {isSethOwes && t("Seth has to pay this credit balance to the farmer.")}
              {isFarmerOwes && t("Farmer has a Jama deficit due to the Seth.")}
              {isNoDue && t("All Jama accounts are settled.")}
            </p>
          </div>
          {jamaAmount !== null && (
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">{t("Closing Jama")}</span>
              <span className={`text-2xl font-black ${isSethOwes ? "text-emerald-700" : isFarmerOwes ? "text-amber-700" : "text-gray-800"}`}>
                {formatINR(jamaAmount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Three Core Account Balances (Royal Blue #1D4ED8) */}
      <div className="print-avoid-break overflow-hidden rounded-xl border border-[#BFDBFE]">
        <div className="bg-[#1D4ED8] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
          {t("Balances")}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3 bg-[#EFF6FF] p-3">
          {buckets.map((b) => (
            <div key={b.key} className="rounded-xl border border-blue-100 bg-white p-3 shadow-2xs">
              <p className="text-xs font-extrabold uppercase text-[#1D4ED8]">{t(b.label)}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{t("Opening")}</span>
                <span className="font-semibold text-gray-700">{money(b.opening)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs border-t border-dashed border-gray-200 pt-1">
                <span className="text-gray-500">{t("Closing")}</span>
                <span className="font-black text-gray-900 text-sm">{money(b.closing)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Key Financial Highlights of the Period (Warm Amber #B45309) */}
      <div className="print-avoid-break overflow-hidden rounded-xl border border-[#FDE68A]">
        <div className="bg-[#B45309] text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider">
          {t("Activity in this period")}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 bg-[#FFFBEB] p-3">
          {activityMetrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-amber-100 bg-white p-3 shadow-2xs">
              <p className="text-[11px] font-semibold text-gray-500 truncate">{t(m.label)}</p>
              <p className={`text-base font-black mt-1 ${m.color}`}>{m.value}</p>
              {m.sub && <p className="text-[10px] text-gray-400 mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings only if real mismatch */}
      {report.reconciliationWarnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2 print-avoid-break">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-0.5">
            <p className="font-bold">{t("Reconciliation notes")}</p>
            {report.reconciliationWarnings.map((w) => <p key={w}>• {w}</p>)}
          </div>
        </div>
      )}
    </section>
  );
}
