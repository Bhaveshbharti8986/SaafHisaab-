import React from "react";
import { useTranslation } from "../../lib/i18n.jsx";

export default function FarmerReportConfig({ value, onChange, onPreview, onCancel, counts, loading, error }) {
  const { t } = useTranslation();
  const presets = [
    ["month", "This month"],
    ["lastMonth", "Last month"],
    ["last30", "Last 30 days"],
    ["season", "This season"],
    ["custom", "Custom date range"],
  ];
  const deliveryOptions = [
    ["all", "All deliveries"],
    ["recent5", "Recent 5 deliveries"],
    ["summary", "Summary only"],
    ["hide", "Hide delivery details"],
  ];
  const sections = [
    ["payments", "Payment records"],
    ["transactions", "Transaction history"],
    ["interest", "Interest details"],
    ["settlements", "Settlement details"],
  ];

  function set(key, next) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("Date range")}</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presets.map(([id, label]) => (
            <button key={id} type="button" onClick={() => set("preset", id)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${value.preset === id ? "border-[#2a6c4a] bg-emerald-50 text-[#2a6c4a] shadow-sm ring-1 ring-[#2a6c4a]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              {t(label)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t("Selected Period")}: <span className="font-bold text-gray-800">{value.from}</span> {t("to")} <span className="font-bold text-gray-800">{value.to}</span>
        </p>
      </div>

      {value.preset === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-gray-600">{t("From")}
            <input type="date" value={value.from} onChange={(e) => set("from", e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-xs font-bold text-gray-600">{t("To")}
            <input type="date" value={value.to} onChange={(e) => set("to", e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          </label>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("Delivery details")}</label>
        <select value={value.deliveryDetail} onChange={(e) => set("deliveryDetail", e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm">
          {deliveryOptions.map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{t("Include sections")}</p>
        <div className="space-y-2">
          <label className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm">
            <span className="font-semibold">{t("Summary")}</span><span className="text-xs font-bold text-gray-400">{t("Always included")}</span>
          </label>
          {sections.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3 text-sm">
              <span className="font-semibold">{t(label)}</span>
              <input type="checkbox" checked={value[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-[#2a6c4a]" />
            </label>
          ))}
        </div>
      </div>

      {counts && <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
        {counts.deliveries} {t("deliveries")} · {counts.payments} {t("payments")} · {counts.transactions} {t("transactions")} · {counts.interest} {t("interest entries")} · {counts.settlements} {t("settlements")}
      </div>}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700">{t("Cancel")}</button>
        <button type="button" disabled={loading} onClick={onPreview} className="flex-[2] rounded-xl bg-[#2a6c4a] py-3 text-sm font-bold text-white disabled:opacity-60">
          {loading ? t("Loading preview...") : t("Preview report")}
        </button>
      </div>
    </div>
  );
}
