import React, { useState, useEffect, useRef } from "react";

export default function OtpInput({ length = 6, onComplete, onChange, value, accent = "seth" }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);
  const accentClasses = {
    seth: "focus:border-seth focus:ring-blue-500/15",
    munshi: "focus:border-munshi focus:ring-teal-600/15",
    labour: "focus:border-labour focus:ring-orange-600/15",
  };
  const focusClass = accentClasses[accent] || accentClasses.seth;

  useEffect(() => {
    if (value !== undefined) {
      setOtp([...value.split("").slice(0, length), ...new Array(length).fill("")].slice(0, length));
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);

    const newOtp = value === undefined ? [...otp] : [...value.split("").slice(0, length), ...new Array(length).fill("")].slice(0, length);
    newOtp[index] = val;
    setOtp(newOtp);
    const otpValue = newOtp.join("");
    onChange?.(otpValue);

    // Move to next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtp.every(Boolean)) {
      onComplete?.(otpValue);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...pastedData, ...new Array(length).fill("")].slice(0, length);
    setOtp(newOtp);
    onChange?.(pastedData);

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className="flex justify-center gap-1.5" role="group" aria-label={`${length}-digit verification code`}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          aria-label={`OTP digit ${index + 1}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value === undefined ? digit : value[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`h-14 min-w-0 max-w-12 flex-1 rounded-2xl border-[1.5px] border-slate-400 bg-white text-center text-2xl font-extrabold text-slate-900 shadow-field outline-none transition focus:ring-4 ${focusClass}`}
        />
      ))}
    </div>
  );
}