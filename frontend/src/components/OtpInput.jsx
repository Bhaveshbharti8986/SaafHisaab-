import React, { useState, useEffect, useRef } from "react";

export default function OtpInput({ length = 6, onComplete, value = "" }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value) {
      const valueArray = value.split("").slice(0, length);
      const newOtp = [...otp];
      valueArray.forEach((char, index) => {
        newOtp[index] = char;
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Move to next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Check if OTP is complete
    const otpValue = newOtp.join("");
    if (otpValue.length === length) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    if (pastedData.length === length) {
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
        />
      ))}
    </div>
  );
}