import React, { useId } from "react";

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
  id,
  ...inputProps
}) {
  const accentClasses = accents[accent] || accents.seth;
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`block ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-[13px] font-bold leading-[14px] text-slate-700">
          {label}
        </label>
      )}
      <div
        className={`flex h-14 items-center gap-3 rounded-2xl border-[1.5px] border-slate-400 bg-white px-2.5 shadow-field ring-4 ring-transparent transition focus-within:ring-4 ${accentClasses.focus}`}
      >
        {Icon && (
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentClasses.icon}`}
          >
            <Icon size={18} />
          </span>
        )}
        <input
          id={inputId}
          {...inputProps}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500"
        />
        {right}
      </div>
    </div>
  );
}
