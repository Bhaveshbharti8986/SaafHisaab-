import React from "react";

export default function RoleSelect() {
  function handleSelect(role) {
    localStorage.setItem("role", role);
    window.location.href = role === "munsi" ? "/munsi" : role === "labour" ? "/labour" : "/";
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1f35] items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white mb-2">AgriSeth</h1>
        <p className="text-white/60 text-sm">Select your role to continue</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => handleSelect("seth")}
          className="w-full bg-[#2a6c4a] hover:bg-[#348259] text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-transform active:scale-95 shadow-lg"
        >
          <span className="text-5xl">👑</span>
          <div className="text-center">
            <h2 className="text-xl font-bold">Seth Dashboard</h2>
            <p className="text-white/60 text-xs mt-1">Full access to khata, analytics, and settings.</p>
          </div>
        </button>

        <button
          onClick={() => handleSelect("munsi")}
          className="w-full bg-[#1e3a5c] hover:bg-[#254670] text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-transform active:scale-95 shadow-lg"
        >
          <span className="text-5xl">📝</span>
          <div className="text-center">
            <h2 className="text-xl font-bold">Munshi Terminal</h2>
            <p className="text-white/60 text-xs mt-1">Add weight entries and manage daily stock.</p>
          </div>
        </button>
        <button
          onClick={() => handleSelect("labour")}
          className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-2xl p-6 flex flex-col items-center gap-3 transition-transform active:scale-95 shadow-lg"
        >
          <span className="text-5xl">👷</span>
          <div className="text-center">
            <h2 className="text-xl font-bold">Labour Terminal</h2>
            <p className="text-white/60 text-xs mt-1">Weigh crops and check today's rates.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
