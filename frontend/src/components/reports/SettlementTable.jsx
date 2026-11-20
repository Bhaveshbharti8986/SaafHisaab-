import React from "react";
import { formatINR } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";

export default function SettlementTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return <p className="text-sm text-gray-500">{t("No settlements in this period.")}</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[750px] border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50/80 text-left font-bold text-gray-600 border-b border-gray-100">
            <th className="px-3 py-2.5">{t("Date")}</th>
            <th className="px-3 py-2.5">{t("Crop value")}</th>
            <th className="px-3 py-2.5">{t("Deductions & Recoveries")}</th>
            <th className="px-3 py-2.5 text-right">{t("Final payout")}</th>
            <th className="px-3 py-2.5">{t("Payment mode")}</th>
            <th className="px-3 py-2.5 text-center">{t("Status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const hasRecovery = (r.jamaRecovered || 0) + (r.principalRecovered || 0) + (r.interestRecovered || 0) + (r.chhootAmount || 0) > 0;
            return (
              <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">
                  {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2.5 font-bold text-gray-900">{formatINR(r.cropAmount)}</td>
                <td className="px-3 py-2.5 text-gray-600">
                  {hasRecovery ? (
                    <div className="space-y-0.5 text-[11px]">
                      {Number(r.advanceRecovered || 0) > 0 && <div>{t("Principal")}: <span className="font-semibold text-blue-700">{formatINR(r.advanceRecovered)}</span></div>}
                      {Number(r.interestRecovered || 0) > 0 && <div>{t("Interest")}: <span className="font-semibold text-amber-700">{formatINR(r.interestRecovered)}</span></div>}
                      {Number(r.jamaRecovered || 0) > 0 && <div>{t("Jama recovery")}: <span className="font-semibold text-emerald-700">{formatINR(r.jamaRecovered)}</span></div>}
                      {Number(r.chhootAmount || 0) > 0 && <div>{t("Chhoot")}: <span className="font-semibold text-purple-700">{formatINR(r.chhootAmount)}</span></div>}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-black text-gray-900 text-sm">
                  {formatINR(r.finalAmount)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    String(r.paymentMethod).toLowerCase() === "jama"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {String(r.paymentMethod).toLowerCase() === "jama" ? t("Jama (credited)") : t(r.paymentMethod)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {t(r.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
