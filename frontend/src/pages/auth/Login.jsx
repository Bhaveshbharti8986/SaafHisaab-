import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { showToast } from "../../lib/toast.js";
import AuthField from "../../components/auth/AuthField.jsx";
import AuthHero, { authHeroGradients } from "../../components/auth/AuthHero.jsx";
import OtpInput from "../../components/OtpInput.jsx";
import PinBoxes from "../../components/auth/PinBoxes.jsx";
import { useTranslation } from "../../lib/i18n.jsx";

const roleAccents = {
  seth: {
    button: "bg-blue-600 hover:bg-blue-700 shadow-[0_8px_18px_rgba(37,99,235,.32)]",
    link: "text-blue-700",
  },
  munshi: {
    button: "bg-teal-700 hover:bg-teal-800 shadow-[0_8px_18px_rgba(15,118,110,.32)]",
    link: "text-teal-800",
  },
  labour: {
    button: "bg-orange-700 hover:bg-orange-800 shadow-[0_8px_18px_rgba(194,65,12,.32)]",
    link: "text-orange-800",
  },
};

const buttonBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60";

function EyeToggle({ visible, onClick }) {
  const { t } = useTranslation();
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(visible ? "Hide password" : "Show password")}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon size={17} />
      </span>
    </button>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [firstLoginOtp, setFirstLoginOtp] = useState("");
  const [firstLoginOtpSent, setFirstLoginOtpSent] = useState(false);
  const [firstLoginMaskedPhone, setFirstLoginMaskedPhone] = useState("");
  const [firstLoginDemoOtp, setFirstLoginDemoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role] = useState(() => {
    const storedRole = sessionStorage.getItem("loginRole");
    return ["seth", "munshi", "labour"].includes(storedRole) ? storedRole : "seth";
  });
  const loginType = role === "seth" ? "seth" : "staff";
  const userRole = loginType === "seth" ? "seth" : "staff";
  const accent = roleAccents[role];

  const [forgotMethod, setForgotMethod] = useState("phone");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loginType === "staff" && pin.length > 0 && pin.length !== 4) {
      return showToast("error", t("PIN must be 4 digits"));
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { employeeId, pin, role: userRole });
      const token = res.data?.accessToken || res.accessToken;
      if (res.setPin) {
        setStep(3);
        setPin("");
        setConfirmPin("");
        setFirstLoginOtp("");
        setFirstLoginOtpSent(false);
        setFirstLoginMaskedPhone("");
        setFirstLoginDemoOtp("");
      }
      if (token) {
        localStorage.setItem("accessToken", token);
        sessionStorage.setItem("unlocked", "true");
        sessionStorage.setItem("showWelcomeSplash", "true");
        showToast("success", t("Logged in successfully!"));
        window.location.href = "/";
      }
    } catch (err) {
      showToast("error", t(err.message || "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendFirstLoginOtp = async () => {
    setLoading(true);
    try {
      const response = await api.post("/auth/first-login/pin-otp", { employeeId });
      setFirstLoginMaskedPhone(response.maskedPhone || "");
      setFirstLoginDemoOtp(response.demoOtp ? String(response.demoOtp) : "");
      setFirstLoginOtp("");
      setFirstLoginOtpSent(true);
      showToast("success", t(response.message || "Verification code sent"));
    } catch (err) {
      showToast("error", t(err.message || "Failed to send verification code"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(firstLoginOtp)) {
      return showToast("error", t("Enter the 6-digit verification code"));
    }
    if (pin.length !== 4) return showToast("error", t("PIN must be 4 digits"));
    if (pin !== confirmPin) return showToast("error", t("PINs do not match"));

    setLoading(true);
    try {
      await api.post("/auth/set-pin", { employeeId, otp: firstLoginOtp, pin });
      showToast("success", t("PIN set successfully!"));
      setStep(1);
      setPin("");
      setConfirmPin("");
      setFirstLoginOtp("");
      setFirstLoginOtpSent(false);
      setFirstLoginDemoOtp("");
    } catch (err) {
      showToast("error", t(err.message || "Failed to set PIN"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    if (!forgotIdentifier) {
      return showToast("error", t(forgotMethod === "phone" ? "Please enter phone number" : "Please enter email"));
    }
    if (forgotMethod === "phone" && !/^\d{10}$/.test(forgotIdentifier)) {
      return showToast("error", t("Please enter a valid 10-digit phone number"));
    }
    if (forgotMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotIdentifier)) {
      return showToast("error", t("Please enter a valid email address"));
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
      showToast("success", t(`OTP sent to your ${forgotMethod === "phone" ? "phone" : "email"}`));
    } catch (err) {
      showToast("error", t(err.message || "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      return showToast("error", t("Please enter 6-digit OTP"));
    }
    if (newPassword !== confirmNewPassword) {
      return showToast("error", t(userRole === "staff" ? "PINs do not match" : "Passwords do not match"));
    }
    if (userRole === "staff" && !/^\d{4}$/.test(newPassword)) {
      return showToast("error", t("PIN must be 4 digits"));
    }
    if (userRole === "seth" && newPassword.length < 6) {
      return showToast("error", t("Password must be at least 6 characters"));
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        method: forgotMethod,
        identifier: forgotIdentifier,
        otp: forgotOtp,
        newPassword,
      });
      showToast("success", t("Password reset successfully! Please login with your new password."));
      setStep(1);
      setEmployeeId("");
      setPin("");
      setForgotIdentifier("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setOtpSent(false);
    } catch (err) {
      showToast("error", t(err.message || "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  const heroContent = step === 3
    ? { title: "Set your PIN", eyebrow: "First login", subtitle: "Create a 4-digit PIN for quick access" }
    : step === 2
      ? { title: loginType === "seth" ? "Reset password" : "Reset your PIN", eyebrow: "Account recovery", subtitle: "Verify your identity with a one-time code" }
      : {
          title: loginType === "seth" ? "Owner Sign In" : role === "munshi" ? "Accountant Sign In" : "Staff Sign In",
          eyebrow: role === "seth" ? "MANDI OWNER · सेठ" : role === "munshi" ? "ACCOUNTANT / CLERK · मुंशी" : "WEIGHING STAFF · मज़दूर",
          subtitle: "Sign in to your mandi account",
        };

  return (
    <main
      className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden font-sans"
      style={{ backgroundImage: authHeroGradients[role] }}
    >
      <AuthHero
        role={role}
        {...heroContent}
        height="clamp(145px, 26dvh, 270px)"
        onBack={() => step === 1 ? navigate("/") : setStep(1)}
      />
      <section className="relative z-10 -mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white px-4 pb-2 pt-4 shadow-[0_-8px_24px_rgba(15,23,42,.12)]">
        {step === 1 && (
          <form onSubmit={handleLogin} className="flex flex-1 flex-col space-y-3">
            {loginType !== "seth" && <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {t("Sign in to your account")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t("Enter your details to continue.")}</p>
            </div>}

            <AuthField
              label={loginType === "seth" ? "Email, phone or Employee ID" : "Employee ID or phone"}
              icon={loginType === "seth" ? Mail : UserRound}
              accent={role}
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder={loginType === "seth" ? "Enter your email, phone or ID" : "Enter your Employee ID or phone"}
              autoComplete="username"
              required
            />

            {loginType === "seth" ? (
              <AuthField
                label="Password · पासवर्ड"
                icon={LockKeyhole}
                accent={role}
                type={showPassword ? "text" : "password"}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                minLength={6}
                required
                right={<EyeToggle visible={showPassword} onClick={() => setShowPassword((value) => !value)} />}
              />
            ) : (
              <div>
                <p className="mb-1.5 text-[13px] font-bold text-slate-700">{t("4-digit PIN")}</p>
                <PinBoxes value={pin} onChange={setPin} accent={role} />
              </div>
            )}

            {loginType === "staff" && (
              <p className="rounded-2xl bg-slate-50 p-2.5 text-sm leading-5 text-slate-700">
                {t("First time? Ask your Mandi Owner for your Employee ID. You will create a 4-digit PIN when you first sign in.")}
              </p>
            )}

            <button type="submit" disabled={loading} className={`${buttonBase} ${accent.button}`}>
              {loading ? t("Signing in...") : t("Sign in · लॉगिन")} <ArrowRight size={17} />
            </button>

            <div className="flex min-h-10 items-center justify-between gap-3 text-sm font-bold">
              <button type="button" onClick={() => setStep(2)} className={`min-h-11 ${accent.link}`}>
                {t(loginType === "seth" ? "Forgot password?" : "Forgot PIN?")}
              </button>
              {loginType === "seth" && (
                <Link href="/register" className={`flex min-h-11 items-center ${accent.link}`}>
                  {t("Register new mandi")}
                </Link>
              )}
            </div>
            {loginType === "seth" && (
              <p className="mt-auto flex min-h-8 items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                <LockKeyhole size={16} /> {t("Encrypted · Works offline")}
              </p>
            )}
          </form>
        )}

        {step === 2 && (
          <div className="space-y-1">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  {["phone", "email"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => { setForgotMethod(method); setForgotIdentifier(""); }}
                      className={`min-h-11 rounded-xl text-sm font-bold capitalize ${forgotMethod === method ? "bg-white text-slate-900 shadow-sm" : "text-slate-700"}`}
                    >
                      {method === "phone" ? <Phone size={15} className="mr-1 inline" /> : <Mail size={15} className="mr-1 inline" />}
                      {t(method)}
                    </button>
                  ))}
                </div>
                <AuthField
                  label={forgotMethod === "phone" ? "Phone number" : "Email address"}
                  icon={forgotMethod === "phone" ? Phone : Mail}
                  accent={role}
                  type={forgotMethod === "phone" ? "tel" : "email"}
                  inputMode={forgotMethod === "phone" ? "numeric" : undefined}
                  value={forgotIdentifier}
                  onChange={(event) => setForgotIdentifier(event.target.value)}
                  placeholder={forgotMethod === "phone" ? "10-digit phone number" : "name@example.com"}
                  maxLength={forgotMethod === "phone" ? 10 : undefined}
                  required
                />
                <button type="submit" disabled={loading} className={`${buttonBase} ${accent.button}`}>
                  {loading ? t("Sending OTP...") : t("Send OTP")} <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-1.5">
                {demoOtp && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-800">
                    {t("Demo OTP:")} {demoOtp}
                  </p>
                )}
                <div>
                  <p className="mb-0.5 text-[13px] font-bold text-slate-700">{t("Enter 6-digit OTP")}</p>
                  <OtpInput length={6} value={forgotOtp} onChange={setForgotOtp} onComplete={setForgotOtp} accent={role} />
                </div>
                {userRole === "staff" ? (
                  <>
                    <div>
                      <p className="mb-1 text-[13px] font-bold text-slate-700">{t("New PIN")}</p>
                      <PinBoxes value={newPassword} onChange={setNewPassword} accent={role} />
                    </div>
                    <div>
                      <p className="mb-1 text-[13px] font-bold text-slate-700">{t("Confirm PIN")}</p>
                      <PinBoxes value={confirmNewPassword} onChange={setConfirmNewPassword} accent={role} />
                    </div>
                  </>
                ) : (
                  <>
                    <AuthField
                      label="New password"
                      icon={KeyRound}
                      accent={role}
                      compact
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={6}
                      autoComplete="new-password"
                      required
                      right={<EyeToggle visible={showNewPassword} onClick={() => setShowNewPassword((value) => !value)} />}
                    />
                    <AuthField
                      label="Confirm password"
                      icon={LockKeyhole}
                      accent={role}
                      compact
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(event) => setConfirmNewPassword(event.target.value)}
                      minLength={6}
                      autoComplete="new-password"
                      required
                      right={<EyeToggle visible={showConfirmPassword} onClick={() => setShowConfirmPassword((value) => !value)} />}
                    />
                  </>
                )}
                <button type="submit" disabled={loading} className={`${buttonBase} ${accent.button}`}>
                  {loading ? t("Resetting...") : t("Reset")} <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setForgotOtp(""); }}
                    className={`min-h-11 w-full text-sm font-bold ${accent.link}`}
                >
                  {t("Send another OTP")}
                </button>
              </form>
            )}
            <button type="button" onClick={() => setStep(1)} className="min-h-11 w-full text-sm font-bold text-slate-600">
              {t("Back to login")}
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSetPin} className="space-y-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{t("Create a secure PIN")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("Use this PIN the next time you sign in.")}</p>
            </div>
            <AuthField
              label="Employee ID"
              icon={UserRound}
              accent={role}
              value={employeeId}
              readOnly
            />
            {!firstLoginOtpSent ? (
              <>
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  {t("Verify the phone number registered to your staff account before setting your PIN.")}
                </p>
                <button
                  type="button"
                  onClick={handleSendFirstLoginOtp}
                  disabled={loading}
                  className={`${buttonBase} ${accent.button}`}
                >
                  {loading ? t("Sending code...") : t("Send verification code")} <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  {t("Enter the code sent to")} {firstLoginMaskedPhone}.
                </p>
                {firstLoginDemoOtp && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-800">
                    {t("Demo OTP:")} {firstLoginDemoOtp}
                  </p>
                )}
                <div>
                  <p className="mb-1 text-[13px] font-bold text-slate-700">{t("Verification code")}</p>
                  <OtpInput length={6} value={firstLoginOtp} onChange={setFirstLoginOtp} onComplete={setFirstLoginOtp} accent={role} />
                </div>
                <div>
                  <p className="mb-1 text-[13px] font-bold text-slate-700">{t("New PIN")}</p>
                  <PinBoxes value={pin} onChange={setPin} accent={role} />
                </div>
                <div>
                  <p className="mb-1 text-[13px] font-bold text-slate-700">{t("Confirm PIN")}</p>
                  <PinBoxes value={confirmPin} onChange={setConfirmPin} accent={role} />
                </div>
                <button type="submit" disabled={loading} className={`${buttonBase} ${accent.button}`}>
                  {loading ? t("Setting PIN...") : t("Set PIN")} <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={handleSendFirstLoginOtp}
                  disabled={loading}
                  className={`min-h-11 w-full text-sm font-bold ${accent.link}`}
                >
                  {t("Send another code")}
                </button>
              </>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
