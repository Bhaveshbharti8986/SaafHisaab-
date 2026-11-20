import React, { useId } from "react";
import { useTranslation } from "../../lib/i18n.jsx";

const accents = {
  seth: {
    icon: "bg-blue-50 text-seth",
    focus: "focus-within:border-seth focus-within:ring-seth/15",
  },
  munshi: {
    icon: "bg-teal-50 text-munshi",
    focus: "focus-within:border-munshi focus-within:ring-munshi/15",
  },
  labour: {
    icon: "bg-orange-50 text-labour",
    focus: "focus-within:border-labour focus-within:ring-labour/15",
  },
};

export default function AuthField({
  label,
  icon: Icon,
  right,
  accent = "seth",
  className = "",
  compact = false,
  id,
  ...inputProps
}) {
  const { t } = useTranslation();
  const accentClasses = accents[accent] || accents.seth;
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`block ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`${compact ? "mb-0.5 text-xs leading-[14px]" : "mb-1 text-[13px] leading-[15px]"} block font-bold text-slate-700`}
        >
          {t(label)}
        </label>
      )}
      <div
        className={`flex ${compact ? "h-11 gap-2 rounded-xl px-2" : "h-12 gap-2.5 rounded-2xl px-2.5"} items-center border-[1.5px] border-slate-500 bg-white shadow-[0_2px_4px_rgba(15,23,42,.08),0_8px_18px_rgba(15,23,42,.07)] ring-4 ring-transparent transition focus-within:ring-4 ${accentClasses.focus}`}
      >
        {Icon && (
          <span
            aria-hidden="true"
            className={`flex ${compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"} shrink-0 items-center justify-center ${accentClasses.icon}`}
          >
            <Icon size={compact ? 16 : 18} />
          </span>
        )}
        <input
          id={inputId}
          {...inputProps}
          placeholder={typeof inputProps.placeholder === "string" ? t(inputProps.placeholder) : inputProps.placeholder}
          aria-label={typeof inputProps["aria-label"] === "string" ? t(inputProps["aria-label"]) : inputProps["aria-label"]}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500"
        />
        {right}
      </div>
    </div>
  );
}
