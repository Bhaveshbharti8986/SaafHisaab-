import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import {
  ShieldCheck,
  User,
  Phone,
  Mail,
  Briefcase,
  FileText,
  MapPin,
  Lock,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SaafHisaabLogo from "../SaafHisaabLogo.jsx";

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1); //1
  const [form, setForm] = useState({
    ownerName: "",
    phone: "",
    email: "",
    businessName: "",
    gstNumber: "",
    address: "",
    village: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  // OTP states
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [demoPhoneOtp, setDemoPhoneOtp] = useState("");
  const [demoEmailOtp, setDemoEmailOtp] = useState("");

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!form.phone || !/^\d{10}$/.test(form.phone)) {
      return showToast("error", "Please enter a valid 10-digit mobile number");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register/phone-otp", {
        phone: form.phone,
      });
      setDemoPhoneOtp(res.demoOtp || "");
      setStep(3);
      showToast("success", "OTP sent to your phone");
    } catch (err) {
      showToast("error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    // ✅ Fixed: Validate phone OTP before proceeding to email step
    if (!phoneOtp || phoneOtp.length !== 6) {
      return showToast("error", "Please enter the 6-digit Phone OTP first");
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return showToast("error", "Please enter a valid email address");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register/email-otp", {
        email: form.email,
      });
      setDemoEmailOtp(res.demoOtp || "");
      setStep(4);
      showToast("success", "OTP sent to your email");
    } catch (err) {
      showToast("error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // ✅ Fixed: Validate phone and email OTP before proceeding to registration
    if (!phoneOtp || phoneOtp.length !== 6)
      return showToast("error", "Please enter valid 6-digit phone OTP");
    if (!emailOtp || emailOtp.length !== 6)
      return showToast("error", "Please enter valid 6-digit email OTP");

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        ownerName: form.ownerName,
        phone: form.phone,
        phoneotp: phoneOtp,
        email: form.email,
        emailotp: emailOtp,
        businessName: form.businessName,
        gstNumber: form.gstNumber,
        address: form.address,
        village: form.village,
        password: form.password,
      });

      localStorage.setItem("accessToken", res.accessToken);
      sessionStorage.setItem("unlocked", "true");
      showToast("success", "Mandi Registered Successfully!");
      window.location.href = "/";
    } catch (err) {
      showToast("error", err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b  from-blue-900 to-gray-900  flex flex-col justify-center px-4 py-12 pb-safe relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-green-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>

      {/* Floating Top-Left Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-all text-xs font-bold bg-white/5 hover:bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/10 shadow-sm active:scale-95">
            ← Back to Home
          </button>
        </Link>
      </div>

      <div className="mb-4 text-center mt-4">
        <div className="w-24 h-24 bg-blue-900/10 rounded-2xl shadow-xl mx-auto flex items-center justify-center mb-3 p-2 border border-white/5">
          <SaafHisaabLogo animated={false} size={80} />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-0.5">
          {" "}
          Saaf<span className="text-cyan-300 font-extrabold">Hisaab</span>
        </h1>
        <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest opacity-90">
          Register Mandi (साफ़हिसाब)
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.2rem] shadow-2xl p-6 w-full max-w-md mx-auto relative z-10 border border-slate-100"
      >
        <AnimatePresence mode="wait">
          {/* Step 1: Registration Form */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.phone || !/^\d{10}$/.test(form.phone)) {
                  return showToast(
                    "error",
                    "Please enter a valid 10-digit mobile number",
                  );
                }
                if (
                  !form.email ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
                ) {
                  return showToast(
                    "error",
                    "Please enter a valid email address",
                  );
                }
                if (!form.password || form.password.length < 6)
                  return showToast(
                    "error",
                    "Password must be at least 6 characters",
                  );
                if (form.password !== form.confirmPassword)
                  return showToast("error", "Passwords do not match");
                setStep(2);
              }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  Register Your Mandi
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Step 1 of 4: create user credentials
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={form.ownerName}
                    onChange={(e) =>
                      setForm({ ...form, ownerName: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Owner / Seth Name"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Mobile Number"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Email Address (Required)"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="password"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Confirm Password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Please wait..." : "Fill buisness details"}{" "}
                <ArrowRight size={16} />
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-emerald-600 text-xs font-bold hover:underline"
                >
                  Already have an account? Login
                </Link>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendPhoneOtp}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  Register Your Mandi
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Step 2 of 4: Basic Information
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase size={18} />
                  </div>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) =>
                      setForm({ ...form, businessName: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Firm / Mandi Name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FileText size={18} />
                    </div>
                    <input
                      type="text"
                      value={form.gstNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gstNumber: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-xs font-semibold text-slate-800 placeholder-slate-400"
                      placeholder="GST (Optional)"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin size={18} />
                    </div>
                    <input
                      type="text"
                      value={form.village}
                      onChange={(e) =>
                        setForm({ ...form, village: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-xs font-semibold text-slate-800 placeholder-slate-400"
                      placeholder="Village"
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin size={18} />
                  </div>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder="Address (Optional)"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending OTP..." : "Continue to OTP Verification"}{" "}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 text-xs font-bold hover:text-slate-700"
              >
                ← Back to credentials
              </button>
            </motion.form>
          )}

          {/* Step 3: Phone OTP Verification */}
          {step === 3 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  Verify Phone Number
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Step 3 of 4: Phone OTP Verification
                </p>
              </div>

              {demoPhoneOtp && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-emerald-700 text-xs font-bold">
                    Demo Phone OTP: {demoPhoneOtp}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                  Enter 6-digit Phone OTP
                </label>
                <input
                  type="text"
                  value={phoneOtp}
                  onChange={(e) =>
                    setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-center text-2xl font-bold text-slate-800 tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                onClick={handleSendEmailOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue to Email OTP"}{" "}
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full text-slate-500 text-xs font-bold hover:text-slate-700"
              >
                ← Back to details
              </button>
            </motion.div>
          )}

          {/* Step 4: Email OTP Verification */}
          {step === 4 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  Verify Email Address
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Step 4 of 4: Email OTP Verification
                </p>
              </div>

              {demoEmailOtp && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-emerald-700 text-xs font-bold">
                    Demo Email OTP: {demoEmailOtp}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                  Enter 6-digit Email OTP
                </label>
                <input
                  type="text"
                  value={emailOtp}
                  onChange={(e) =>
                    setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-center text-2xl font-bold text-slate-800 tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Registering..." : "Complete Registration"}{" "}
                <ArrowRight size={16} />
              </button>
              {/* back to phone otp step2 */}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full text-slate-500 text-xs font-bold hover:text-slate-700"
              >
                ← Back to Phone OTP
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
