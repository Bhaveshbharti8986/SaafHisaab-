import { useEffect, useState } from "react";

function CustomToastListener() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const { message, type } = event.detail;
      setToast({ message, type });

      // Auto-hide after 3 seconds
      setTimeout(() => setToast(null), 3000);
    };

    window.addEventListener("show-toast", handler);
    return () => window.removeEventListener("show-toast", handler);
  }, []);

  return (
    <>
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
          <div
            className={`bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in zoom-in-95 fade-in max-w-sm pointer-events-auto border ${
              toast.type === "error"
                ? "border-red-500/50"
                : "border-green-500/50"
            }`}
          >
            <span className="text-xl">
              {toast.type === "error" ? "⚠️" : "✅"}
            </span>
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomToastListener;
