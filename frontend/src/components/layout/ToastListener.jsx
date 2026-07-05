import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

const TYPE_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: "border-emerald-400/30",
    glow: "shadow-[0_0_24px_-4px_rgba(52,211,153,0.35)]",
    iconWrap: "bg-emerald-400/10 text-emerald-300",
    bar: "bg-emerald-400",
  },
  error: {
    icon: XCircle,
    ring: "border-red-400/30",
    glow: "shadow-[0_0_24px_-4px_rgba(248,113,113,0.35)]",
    iconWrap: "bg-red-400/10 text-red-300",
    bar: "bg-red-400",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-400/30",
    glow: "shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]",
    iconWrap: "bg-amber-400/10 text-amber-300",
    bar: "bg-amber-400",
  },
  info: {
    icon: Info,
    ring: "border-cyan-400/30",
    glow: "shadow-[0_0_24px_-4px_rgba(56,211,238,0.35)]",
    iconWrap: "bg-cyan-400/10 text-cyan-300",
    bar: "bg-cyan-400",
  },
};

const DURATION = 3000;

function ToastCard({ toast, onDismiss }) {
  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const Icon = style.icon;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), DURATION);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={() => onDismiss(toast.id)}
      className={`pointer-events-auto relative w-full max-w-[340px] overflow-hidden rounded-2xl border ${style.ring} ${style.glow} bg-[#0c1a2e]/90 backdrop-blur-xl cursor-pointer`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}
        >
          <Icon size={17} strokeWidth={2.4} />
        </span>
        <p className="pt-0.5 text-[13.5px] font-semibold leading-snug text-slate-100">
          {toast.message}
        </p>
      </div>

      <div className="h-[3px] w-full bg-white/5">
        <motion.div
          className={`h-full ${style.bar}`}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: DURATION / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

function CustomToastListener() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const { message, type } = event.detail;
      const id = Date.now() + Math.random().toString(36).slice(2, 7);
      setToasts((prev) => [...prev, { id, message, type }].slice(-4));
    };

    window.addEventListener("show-toast", handler);
    return () => window.removeEventListener("show-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-[340px] flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CustomToastListener;
