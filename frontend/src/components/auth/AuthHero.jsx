import React from "react";
import { ArrowLeft } from "lucide-react";
import { CharacterForRole } from "./characters.jsx";

export const authHeroGradients = {
  seth: "linear-gradient(160deg, #2563eb 0%, #1e3a8a 100%)",
  munshi: "linear-gradient(160deg, #0f766e 0%, #115e59 100%)",
  labour: "linear-gradient(160deg, #c2410c 0%, #9a3412 100%)",
};

export default function AuthHero({
  role = "seth",
  title,
  eyebrow,
  subtitle,
  height = 270,
  onBack,
}) {
  return (
    <header
      className="relative isolate overflow-hidden"
      style={{ height, backgroundImage: authHeroGradients[role] || authHeroGradients.seth }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="absolute left-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/20 text-white shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="absolute left-5 top-[76px] z-10 max-w-[190px]">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.15em] text-white/85">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[27px] font-extrabold leading-tight text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-5 text-white/90">{subtitle}</p>}
      </div>
      <CharacterForRole
        role={role}
        className="absolute bottom-5 right-[14px] h-[132px] w-[162px] drop-shadow-lg"
      />
    </header>
  );
}
