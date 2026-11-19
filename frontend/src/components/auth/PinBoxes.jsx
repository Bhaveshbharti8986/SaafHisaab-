import React, { useRef } from "react";

export default function PinBoxes({ value = "", onChange, length = 4, accent = "seth" }) {
  const inputRefs = useRef([]);
  const focusClasses = {
    seth: "focus:border-seth focus:ring-seth/15",
    munshi: "focus:border-munshi focus:ring-munshi/15",
    labour: "focus:border-labour focus:ring-labour/15",
  };
  const focusClass = focusClasses[accent] || focusClasses.seth;

  const updateAt = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const digits = value.split("");
    if (digit && index <= digits.length && digits.length < length) {
      if (index === digits.length) digits.push(digit);
      else digits[index] = digit;
    } else if (!digit && index < digits.length) {
      digits.splice(index, 1);
    }
    onChange(digits.join("").slice(0, length));
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
    if (!digit && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const digits = value.split("");
      if (index < digits.length) {
        digits.splice(index, 1);
        onChange(digits.join(""));
      }
      if (index > 0) inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={`${length}-digit PIN`}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => { inputRefs.current[index] = element; }}
          aria-label={`PIN digit ${index + 1}`}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[index] || ""}
          onChange={(event) => updateAt(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={handlePaste}
          className={`h-12 w-1/5 min-w-0 rounded-xl border-[1.5px] border-slate-500 bg-white text-center text-2xl font-extrabold text-slate-900 shadow-[0_2px_4px_rgba(15,23,42,.08),0_8px_18px_rgba(15,23,42,.07)] outline-none transition focus:ring-4 ${focusClass}`}
        />
      ))}
    </div>
  );
}
