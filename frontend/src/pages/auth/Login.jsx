import React, { useState } from "react";
import { Link } from "wouter";
import { UserCircle, ShieldCheck, ArrowRight, Lock, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import SaafHisaabLogo from "../SaafHisaabLogo.jsx";



export default function Login() {
  const [step, setStep] = useState(1); // 1: Login, 2: Forgot Password
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("seth");
  const [loginType, setLoginType] = useState("seth"); // "seth" or "staff"
  
  // Forgot Password state
  const [forgotMethod, setForgotMethod] = useState("phone"); // "phone" or "email"
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    
    console.log("button clicked", employeeId, pin);
    setLoading(true);
    try {
      
      const res = await api.post("/auth/login", { employeeId, pin , role: userRole });
      const token = res.data?.accessToken || res.accessToken;
        if (res.setPin) {
        setUserRole("staff");
        setStep(3); // Set PIN step
        setPin("");
      }
if (token) {
  localStorage.setItem("accessToken", token);
  sessionStorage.setItem("unlocked", "true");
  showToast("success", "Logged in successfully!");
  window.location.href = "/";
} } catch (err) {
      showToast("error", err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (e) => {
    e.preventDefault();

    if (pin.length !== 4) return showToast("error", "PIN must be 4 digits");
    
    setLoading(true);
    try {
      // For first-time users, we need to call a set-pin endpoint
      // For now, we'll use the login endpoint with the PIN
      const res = await api.post("/auth/set-pin", { employeeId, pin });
      showToast("success", "PIN set successfully!");
      setStep(1);
      setPin("");
    } catch (err) {
      showToast("error", err.message || "Failed to set PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      return showToast("error", forgotMethod === "phone" ? "Please enter phone number" : "Please enter email");
    }

    if (forgotMethod === "phone" && !/^\d{10}$/.test(forgotIdentifier)) {
      return showToast("error", "Please enter a valid 10-digit phone number");
    }

    if (forgotMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotIdentifier)) {
      return showToast("error", "Please enter a valid email address");
    }

    setLoading(true);
    try {
      const endpoint = forgotMethod === "phone" 
        ? "/auth/forgot-password/phone" 
        : "/auth/forgot-password/email";
      
      const payload = forgotMethod === "phone" 
        ? { phone: forgotIdentifier }
        : { email: forgotIdentifier };

      const res = await api.post(endpoint, payload);
      setDemoOtp(res.demoOtp || "");
      setOtpSent(true);
      showToast("success", `OTP sent to your ${forgotMethod === "phone" ? "phone" : "email"}`);
    } catch (err) {
      showToast("error", err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      return showToast("error", "Please enter 6-digit OTP");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        method: forgotMethod,
        identifier: forgotIdentifier,
        otp: forgotOtp,
        newPassword: newPassword
      });

      showToast("success", "Password reset successfully! Please login with your new password.");
      setStep(1);
      setEmployeeId("");
      setPin("");
      setForgotIdentifier("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOtpSent(false);
    } catch (err) {
      showToast("error", err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b  from-blue-900 to-gray-900 flex flex-col justify-center px-6 py-12 pb-safe relative overflow-hidden font-sans">
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
      
      {/* Header Info */}
       <div className="mb-4 text-center mt-4">
        <div className="w-24 h-24 bg-blue-900/10 rounded-2xl shadow-xl mx-auto flex items-center justify-center mb-3 p-2 border border-white/5">
          
          <SaafHisaabLogo animated={false} size={80} />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-0.5"> Saaf<span className="text-cyan-300 font-extrabold">Hisaab</span></h1>
        <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest opacity-90">Register Mandi (साफ़हिसाब)</p>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.2rem] shadow-2xl p-6 sm:p-8 w-full max-w-sm mx-auto relative z-10 border border-slate-100"
      >
        {/* Login Type Tabs */}
        {step === 1 && (
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginType("seth"); setEmployeeId(""); setUserRole("seth") }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors ${loginType === "seth" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <ShieldCheck size={14} /> Seth (Admin)
            </button>
            <button
              type="button"
              onClick={() => { setLoginType("staff"); 
                setEmployeeId("");
              setUserRole("munsi") }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors ${loginType === "staff" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <UserCircle size={14} /> Mandi Staff
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* Step 1: Login Form */}
          {step === 1 && (
            <motion.form 
              key="step1"
              onSubmit={handleLogin}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
             
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  {loginType === "seth" ? "Seth Login" : "Staff Login"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Enter your credentials to continue</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCircle size={18} />
                  </div>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder={loginType === "seth" ? "Email, Phone, or Employee ID" : "Employee ID or Phone"}
                    required
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                    placeholder={userRole === "seth" ? "Password" : "4-digit PIN"}
                    minLength={userRole === "seth" ? 6 : 4}
                    maxLength={userRole === "staff" ? 4 : 15}
                    required={userRole === "seth" ? true : false}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                onClick={()=>{
            
                  console.log("Login button clicked");
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"} <ArrowRight size={16} />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-emerald-600 text-xs font-bold hover:underline"
                >
                  {userRole === "seth" ? "Forgot Password?" : "Forgot PIN?"}
                </button>
              </div>
            </motion.form>
          )}

          {/* Step 2: Forgot Password */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  {userRole === "seth" ? "Forgot Password" : "Forgot PIN"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Reset your{userRole === "seth" ? " password" : " PIN"} via OTP verification</p>
              </div>

              {!otpSent ? (
                <div className="space-y-4">
                  <div className="flex bg-slate-100 rounded-2xl p-1 mb-4">
                    <button
                      type="button"
                      onClick={() => { setForgotMethod("phone"); setForgotIdentifier(""); }}
                      className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors ${forgotMethod === "phone" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      <UserCircle size={14} /> Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => { setForgotMethod("email"); setForgotIdentifier(""); }}
                      className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-colors ${forgotMethod === "email" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      <Lock size={14} /> Email
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      {forgotMethod === "phone" ? <UserCircle size={18} /> : <Lock size={18} />}
                    </div>
                    <input
                      type={forgotMethod === "phone" ? "tel" : "email"}
                      value={forgotIdentifier}
                      onChange={e => setForgotIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                      placeholder={forgotMethod === "phone" ? "10-digit Phone Number" : "Email Address"}
                      maxLength={forgotMethod === "phone" ? 10 : undefined}
                      required
                    />
                  </div>

                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"} <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {demoOtp && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-emerald-700 text-xs font-bold">Demo OTP: {demoOtp}</p>
                    </div>
                  )}
     
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-2 block">Enter 6-digit OTP</label>
                    <input
                      type="text"
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-center text-2xl font-bold text-slate-800 tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={18} />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                      placeholder={userRole==="seth" ? "New Password" : "New PIN"}
                        maxLength={userRole==="staff" ?4:15}
                      minLength={userRole==="staff"?4:6}
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                      placeholder={userRole==="seth" ? "Confirm Password" : "Confirm PIN"}
                      maxLength={userRole==="staff" ?4:15}
                      minLength={userRole==="staff"?4:6}
                      required
                    />
                  </div>

                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Resetting..." :userRole==="seth" ? "Reset Password" : "Reset PIN"} <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setForgotOtp(""); }}
                    className="w-full text-slate-500 text-xs font-bold hover:text-slate-700"
                  >
                    ← Back to send OTP again
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 text-xs font-bold hover:text-slate-700"
              >
                ← Back to Login
              </button>
            </motion.div>
          )}

          {/* Step 3: Set PIN for first-time users */}
          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSetPin}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-none">
                  Set Your PIN
                </h2>
                <p className="text-xs text-slate-500 mt-1">Create a 4-digit PIN for quick access</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={18} />
                  </div>
                  <input
                    type="tel"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-center text-2xl font-bold text-slate-800 tracking-widest"
                    placeholder="••••"
                    maxLength={4}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Setting PIN..." : "Set PIN & Continue"} <ArrowRight size={16} />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}