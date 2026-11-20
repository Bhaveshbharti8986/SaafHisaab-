import React from "react";
import { formatINR } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";

export default function InterestTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return <p className="text-sm text-gray-500">{t("No stored interest accruals in this period.")}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[650px] border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100 text-left font-bold text-gray-700">
            {["Period", "Days", "Principal", "Monthly rate", "Interest"].map((h) => (
              <th key={h} className="border-b px-3 py-2.5">{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">
                {new Date(r.fromDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} – {new Date(r.toDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-3 py-2.5 font-medium">{r.days} {t("days")}</td>
              <td className="px-3 py-2.5 font-semibold text-gray-800">{formatINR(r.principalAmount)}</td>
              <td className="px-3 py-2.5 font-medium">{r.monthlyRate}%</td>
              <td className="px-3 py-2.5 font-black text-amber-700">{formatINR(r.interestAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
