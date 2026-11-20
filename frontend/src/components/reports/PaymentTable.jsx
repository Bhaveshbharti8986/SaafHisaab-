import React from "react";
import { formatINR } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";

export default function PaymentTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return <p className="text-sm text-gray-500">{t("No payments in this period.")}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[550px] border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100 text-left font-bold text-gray-700">
            <th className="border-b px-3 py-2.5">{t("Date")}</th>
            <th className="border-b px-3 py-2.5 text-right">{t("Amount")}</th>
            <th className="border-b px-3 py-2.5">{t("Mode")}</th>
            <th className="border-b px-3 py-2.5">{t("Paid by")}</th>
            <th className="border-b px-3 py-2.5">{t("Notes")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">
                {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="px-3 py-2.5 text-right font-black text-red-600">
                {formatINR(r.amount)}
              </td>
              <td className="px-3 py-2.5">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  {t(r.paymentMode)}
                </span>
              </td>
              <td className="px-3 py-2.5 font-medium text-gray-600">
                {t(r.paidBy || "—")}
              </td>
              <td className="px-3 py-2.5 text-gray-500">{r.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
