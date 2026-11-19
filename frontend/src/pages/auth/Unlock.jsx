import React, { useState } from "react";
import { Delete, LogOut } from "lucide-react";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import { decodeToken } from "../../lib/jwt.js";
import { CharacterForRole } from "../../components/Characters.jsx";

const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

export default function Unlock() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("accessToken");
  const decoded = token ? decodeToken(token) : null;
  const name = decoded?.name || "User";
  const tokenRole = decoded?.role;
  const characterRole = tokenRole === "munsi" || tokenRole === "munshi"
    ? "munshi"
    : tokenRole === "labour"
      ? "labour"
      : "seth";

  const handleUnlock = async (event) => {
    event.preventDefault();
    if (pin.length !== 4) return showToast("error", "PIN must be 4 digits");

    setLoading(true);
    try {
      const res = await api.post("/auth/unlock", { pin });
      localStorage.setItem("accessToken", res.accessToken);
      sessionStorage.setItem("unlocked", "true");
      showToast("success", "Unlocked successfully!");
      window.location.href = "/";
    } catch (err) {
      showToast("error", err.message || "Incorrect PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  };

  const pressKey = (key) => {
    if (key === "backspace") {
      setPin((current) => current.slice(0, -1));
    } else {
      setPin((current) => current.length < 4 ? `${current}${key}` : current);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 px-6 pb-8 pt-12 font-sans text-white">
      <div className="mb-6 flex justify-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-xl">
          <CharacterForRole role={characterRole} className="h-28 w-28" />
        </div>
      </div>
      <header className="mb-7 text-center">
        <p className="text-sm font-bold text-blue-200">Welcome back</p>
        <h1 className="mt-1 truncate text-3xl font-extrabold">{name}</h1>
      </header>

      <form onSubmit={handleUnlock} className="mx-auto w-full max-w-[360px]">
        <div className="mb-6 flex justify-center gap-4" aria-label={`${pin.length} of 4 PIN digits entered`}>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-4 w-4 rounded-full border-2 border-blue-200 ${index < pin.length ? "bg-white" : "bg-transparent"}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {keypad.map((key, index) => (
            key ? (
              <button
                key={key}
                type="button"
                onClick={() => pressKey(key)}
                aria-label={key === "backspace" ? "Delete last digit" : `Enter ${key}`}
                className="flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-bold text-white transition hover:bg-white/20 active:scale-95"
              >
                {key === "backspace" ? <Delete size={21} /> : key}
              </button>
            ) : (
              <span key={`empty-${index}`} aria-hidden="true" />
            )
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || pin.length !== 4}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-blue-900 shadow-lg transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Unlock App"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="mx-auto mt-7 flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-bold text-blue-100"
      >
        <LogOut size={17} /> Log out / Forgot PIN
      </button>
    </main>
  );
}
