import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import AuthField from "../../components/auth/AuthField.jsx";
import AuthHero, { authHeroGradients } from "../../components/auth/AuthHero.jsx";
import OtpInput from "../../components/OtpInput.jsx";

const buttonBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,.32)] transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60";

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [demoPhoneOtp, setDemoPhoneOtp] = useState("");
  const [demoEmailOtp, setDemoEmailOtp] = useState("");

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const requestOtps = async () => {
    if (!form.phone || !/^\d{10}$/.test(form.phone)) {
      showToast("error", "Please enter a valid 10-digit mobile number");
      return false;
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("error", "Please enter a valid email address");
      return false;
    }

    setLoading(true);
    try {
      const [phoneRes, emailRes] = await Promise.all([
        api.post("/auth/register/phone-otp", { phone: form.phone }),
        api.post("/auth/register/email-otp", { email: form.email }),
      ]);
      setDemoPhoneOtp(phoneRes.demoOtp || "");
      setDemoEmailOtp(emailRes.demoOtp || "");
      setPhoneOtp("");
      setEmailOtp("");
      return true;
    } catch (err) {
      showToast("error", err.message || "Failed to send verification OTPs");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessNext = async (event) => {
    event.preventDefault();
    if (!form.businessName.trim()) {
      return showToast("error", "Please enter your firm or mandi name");
    }
    const sent = await requestOtps();
    if (sent) {
      setStep(3);
      showToast("success", "Verification OTPs sent");
    }
  };

  const handleResend = async () => {
    const sent = await requestOtps();
    if (sent) showToast("success", "Verification OTPs sent again");
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!phoneOtp || phoneOtp.length !== 6) {
      return showToast("error", "Please enter valid 6-digit phone OTP");
    }
    if (!emailOtp || emailOtp.length !== 6) {
      return showToast("error", "Please enter valid 6-digit email OTP");
    }

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
      sessionStorage.setItem("showWelcomeSplash", "true");
      showToast("success", "Mandi Registered Successfully!");
      window.location.href = "/";
    } catch (err) {
      showToast("error", err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsNext = (event) => {
    event.preventDefault();
    if (!form.ownerName.trim()) return showToast("error", "Please enter your name");
    if (!form.phone || !/^\d{10}$/.test(form.phone)) {
      return showToast("error", "Please enter a valid 10-digit mobile number");
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return showToast("error", "Please enter a valid email address");
    }
    if (!form.password || form.password.length < 6) {
      return showToast("error", "Password must be at least 6 characters");
    }
    if (form.password !== form.confirmPassword) {
      return showToast("error", "Passwords do not match");
    }
    setStep(2);
  };

  const heroTitles = {
    1: { title: "Your details", subtitle: "Start with your Seth account" },
    2: { title: "Business details", subtitle: "Tell us about your mandi" },
    3: { title: "Verify your details", subtitle: "Enter the codes sent to your phone and email" },
  };

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[480px] font-sans"
      style={{ backgroundImage: authHeroGradients.seth }}
    >
      <AuthHero
        role="seth"
        eyebrow="New mandi registration"
        {...heroTitles[step]}
        height={270}
        onBack={() => step === 1 ? navigate("/") : setStep(step - 1)}
      />
      <section className="relative z-10 -mt-6 min-h-[calc(100vh-246px)] rounded-t-[28px] bg-white px-5 pb-8 pt-6 shadow-[0_-8px_24px_rgba(15,23,42,.12)]">
        <div className="mb-5 flex gap-2" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={`h-1.5 flex-1 rounded-full ${segment <= step ? "bg-blue-600" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleCredentialsNext} className="space-y-4">
            <div className="mb-1">
              <h2 className="text-xl font-extrabold text-slate-900">You</h2>
              <p className="mt-1 text-sm text-slate-600">Step 1 of 3 · Your account details</p>
            </div>
            <AuthField
              label="Your name"
              icon={UserRound}
              accent="seth"
              value={form.ownerName}
              onChange={updateForm("ownerName")}
              placeholder="Owner / Seth name"
              autoComplete="name"
              required
            />
            <AuthField
              label="Mobile number"
              icon={Phone}
              accent="seth"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "") }))}
              placeholder="10-digit mobile number"
              maxLength={10}
              autoComplete="tel"
              required
            />
            <AuthField
              label="Email address"
              icon={Mail}
              accent="seth"
              type="email"
              value={form.email}
              onChange={updateForm("email")}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
            <AuthField
              label="Password"
              icon={KeyRound}
              accent="seth"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateForm("password")}
              placeholder="At least 6 characters"
              minLength={6}
              autoComplete="new-password"
              required
              right={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </span>
                </button>
              }
            />
            <AuthField
              label="Confirm password"
              icon={LockKeyhole}
              accent="seth"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={updateForm("confirmPassword")}
              placeholder="Re-enter your password"
              minLength={6}
              autoComplete="new-password"
              required
              right={
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </span>
                </button>
              }
            />
            <button type="submit" className={buttonBase}>
              Next: Business <ArrowRight size={17} />
            </button>
            <p className="text-center text-sm font-semibold text-slate-600">
              Already registered? <Link href="/login" className="inline-flex min-h-11 items-center font-extrabold text-blue-700">Log in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleBusinessNext} className="space-y-4">
            <div className="mb-1">
              <h2 className="text-xl font-extrabold text-slate-900">Business</h2>
              <p className="mt-1 text-sm text-slate-600">Step 2 of 3 · Mandi information</p>
            </div>
            <AuthField
              label="Firm / mandi name"
              icon={BriefcaseBusiness}
              accent="seth"
              value={form.businessName}
              onChange={updateForm("businessName")}
              placeholder="Your mandi name"
              required
            />
            <AuthField
              label="GST number (optional)"
              icon={FileText}
              accent="seth"
              value={form.gstNumber}
              onChange={(event) => setForm((current) => ({ ...current, gstNumber: event.target.value.toUpperCase() }))}
              placeholder="GST number"
            />
            <AuthField
              label="Village"
              icon={MapPin}
              accent="seth"
              value={form.village}
              onChange={updateForm("village")}
              placeholder="Village or town"
            />
            <AuthField
              label="Address (optional)"
              icon={MapPin}
              accent="seth"
              value={form.address}
              onChange={updateForm("address")}
              placeholder="Street, area or landmark"
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 px-3 text-sm font-bold text-slate-800"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button type="submit" disabled={loading} className={buttonBase}>
                {loading ? "Sending..." : "Next: Verify"} <ArrowRight size={17} />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="mb-1">
              <h2 className="text-xl font-extrabold text-slate-900">Verify</h2>
              <p className="mt-1 text-sm text-slate-600">Step 3 of 3 · Confirm your phone and email</p>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-900">
              <span className="rounded-full bg-white px-3 py-1.5">{form.businessName || "Your mandi"}</span>
              <span className="rounded-full bg-white px-3 py-1.5">{form.ownerName}</span>
              <span className="rounded-full bg-white px-3 py-1.5">{form.village || "Village not added"}</span>
            </div>

            {demoPhoneOtp && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-800">
                Demo Phone OTP: {demoPhoneOtp}
              </p>
            )}
            {demoEmailOtp && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-800">
                Demo Email OTP: {demoEmailOtp}
              </p>
            )}

            <div>
              <p className="mb-2 text-[13px] font-bold text-slate-700">Phone OTP</p>
              <OtpInput length={6} value={phoneOtp} onChange={setPhoneOtp} onComplete={setPhoneOtp} />
              <p className="mt-2 text-xs font-medium text-slate-600">Sent to {form.phone}</p>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-bold text-slate-700">Email OTP</p>
              <OtpInput length={6} value={emailOtp} onChange={setEmailOtp} onComplete={setEmailOtp} />
              <p className="mt-2 text-xs font-medium text-slate-600">Sent to {form.email}</p>
            </div>

            <button type="button" onClick={handleResend} disabled={loading} className="min-h-11 w-full text-sm font-bold text-blue-700 underline underline-offset-2 disabled:opacity-60">
              {loading ? "Sending new codes..." : "Resend OTPs"}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 px-3 text-sm font-bold text-slate-800"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button type="submit" disabled={loading} className={buttonBase}>
                {loading ? "Creating..." : "Create account"} <ArrowRight size={17} />
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
