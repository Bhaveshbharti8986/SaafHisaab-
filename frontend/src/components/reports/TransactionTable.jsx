import React from "react";
import { formatINR } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";

export default function TransactionTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return <p className="text-sm text-gray-500">{t("No other transactions in this period.")}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100 text-left font-bold text-gray-700">
            <th className="border-b px-3 py-2.5">{t("Date")}</th>
            <th className="border-b px-3 py-2.5">{t("Type")}</th>
            <th className="border-b px-3 py-2.5 text-right">{t("Amount / Bags")}</th>
            <th className="border-b px-3 py-2.5">{t("Deposit allocation")}</th>
            <th className="border-b px-3 py-2.5">{t("Mode / Paid by")}</th>
            <th className="border-b px-3 py-2.5">{t("Notes")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">
                {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-3 py-2.5">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                  {t(r.type.replace("_", " "))}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-black text-gray-900">
                {r.amount != null ? formatINR(r.amount) : `${r.bags ?? 0} ${t("bags")}`}
              </td>
              <td className="px-3 py-2.5 text-gray-600">
                {r.type === "deposit" ? (
                  <div className="space-y-0.5 text-[11px]">
                    <div>{t("Interest")}: <span className="font-bold text-emerald-700">{r.interestRecovered != null ? formatINR(r.interestRecovered) : t("Unavailable")}</span></div>
                    <div>{t("Principal")}: <span className="font-bold text-blue-700">{r.principalRecovered != null ? formatINR(r.principalRecovered) : t("Unavailable")}</span></div>
                    <div>{t("Jama added")}: <span className="font-bold text-gray-900">{r.jamaAdded != null ? formatINR(r.jamaAdded) : t("Unavailable")}</span></div>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-700">
                {[t(r.paymentMode || ""), t(r.paidBy || "")].filter(Boolean).join(" / ") || "—"}
              </td>
              <td className="px-3 py-2.5 text-gray-500">{r.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
