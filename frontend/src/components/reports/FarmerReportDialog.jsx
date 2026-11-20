import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/api.js";
import FarmerReportConfig from "./FarmerReportConfig.jsx";
import FarmerReportPreview from "./FarmerReportPreview.jsx";
import { useTranslation } from "../../lib/i18n.jsx";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function presetRange(preset) {
  const now = new Date();
  if (preset === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatDate(start), to: formatDate(end) };
  }
  if (preset === "last30") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return { from: formatDate(start), to: formatDate(now) };
  }
  if (preset === "season") {
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${startYear}-04-01`, to: formatDate(now) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: formatDate(start), to: formatDate(now) };
}

export default function FarmerReportDialog({ open, onClose, farmer, language }) {
  const { t } = useTranslation();
  const farmerId = farmer?._id || farmer?.id;
  const initial = useMemo(() => ({ ...presetRange("month"), preset: "month" }), []);
  const [config, setConfig] = useState({
    ...initial,
    deliveryDetail: "all",
    payments: true,
    transactions: true,
    interest: true,
    settlements: true,
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("config");

  useEffect(() => {
    if (!open) return;
    setScreen("config");
    setReport(null);
    setError("");
  }, [open, farmerId]);

  useEffect(() => {
    if (config.preset !== "custom") {
      const range = presetRange(config.preset);
      setConfig((current) => ({ ...current, ...range }));
    }
  }, [config.preset]);

  async function preview() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/farmers/${farmerId}/statement?from=${encodeURIComponent(config.from)}&to=${encodeURIComponent(config.to)}`);
      setReport(data);
      setScreen("preview");
    } catch (err) {
      setError(err?.message || "Could not generate the report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && screen === "preview") {
      document.body.classList.add("has-farmer-statement");
    } else {
      document.body.classList.remove("has-farmer-statement");
    }
    return () => {
      document.body.classList.remove("has-farmer-statement");
    };
  }, [open, screen]);

  if (!open) return null;
  return (
    <div className="farmer-statement-modal-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="farmer-statement-modal-card max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-2xl sm:max-w-4xl sm:rounded-[2rem] sm:p-6">
        <div className="no-print mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-gray-900">{t("Farmer Statement / PDF Report")}</p>
            <p className="text-xs text-gray-500">{[farmer?.name, farmer?.phone, farmer?.village].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>
        {screen === "config" ? (
          <FarmerReportConfig value={config} onChange={setConfig} onPreview={preview} onCancel={onClose} counts={report?.counts} loading={loading} error={error ? t(error) : ""} />
        ) : (
          <FarmerReportPreview report={report} config={config} language={language} onEdit={() => setScreen("config")} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
