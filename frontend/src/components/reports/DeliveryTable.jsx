import React from "react";
import { formatINR, formatWeight } from "../../lib/format.js";
import { useTranslation } from "../../lib/i18n.jsx";

export default function DeliveryTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return <p className="text-sm text-gray-500">{t("No deliveries in this period.")}</p>;

  const getStatusBadge = (status) => {
    if (status === "approved") {
      return <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider">{t("approved")}</span>;
    }
    if (status === "held") {
      return <span className="rounded-md bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider">{t("held")}</span>;
    }
    return <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider">{t("pending")}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[850px] border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50/80 text-left font-bold text-gray-600 border-b border-gray-100">
            <th className="px-3 py-2.5">{t("Date")}</th>
            <th className="px-3 py-2.5">{t("Crop")}</th>
            <th className="px-3 py-2.5">{t("Bags & Weight")}</th>
            <th className="px-3 py-2.5">{t("Rate & Deductions")}</th>
            <th className="px-3 py-2.5 text-right">{t("Net Amount")}</th>
            <th className="px-3 py-2.5 min-w-[260px]">{t("Individual Bori Weights (तौल)")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const hasKarda = Number(r.kardaWeight || 0) > 0;
            const hasPalledari = Number(r.palledariAmount || 0) > 0;
            const bagWeights = Array.isArray(r.bagWeights) ? r.bagWeights : [];

            return (
              <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-3 py-3 align-top whitespace-nowrap">
                  <div className="font-semibold text-gray-900">
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="mt-1">{getStatusBadge(r.status)}</div>
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="font-bold text-sm text-gray-900 capitalize">{t(r.crop)}</div>
                  <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">{r.bags} {t("bori")}</div>
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="font-bold text-gray-900 text-sm">{formatWeight(r.netWeight)} <span className="text-[10px] font-normal text-gray-500">({t("Net")})</span></div>
                  {hasKarda ? (
                    <div className="text-[10px] text-amber-700 mt-0.5">
                      {t("Gross")}: {formatWeight(r.totalWeight)} · {t("Karda")}: -{formatWeight(r.kardaWeight)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-0.5">{t("Gross")}: {formatWeight(r.totalWeight)}</div>
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-gray-800">{formatINR(r.ratePerKg)} / kg</div>
                  {hasPalledari && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {t("Palledari")}: -{formatINR(r.palledariAmount)}
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 align-top text-right">
                  <div className="font-black text-gray-900 text-sm">{formatINR(r.netAmount)}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{t("Gross")}: {formatINR(r.grossAmount)}</div>
                </td>

                <td className="px-3 py-3 align-top">
                  {bagWeights.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <span>📦</span> {bagWeights.length} {t("bori")}
                        </span>
                        {r.totalWeight && bagWeights.length > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">
                            {t("Avg")}: {(r.totalWeight / bagWeights.length).toFixed(1)} kg
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 print:max-h-none overflow-y-auto pr-1">
                        {bagWeights.map((w, idx) => (
                          <div key={idx} className="bori-chip inline-flex items-center gap-1.5 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-lg px-2 py-0.5 shadow-2xs transition-colors whitespace-nowrap shrink-0">
                            <span className="w-4 h-4 rounded-full bg-[#184C34] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">
                              {w} <span className="font-normal text-[9px] text-gray-500">kg</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
