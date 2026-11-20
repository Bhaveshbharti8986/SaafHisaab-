import React, { useEffect, useRef, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { User, Mail, Phone, Briefcase, FileText, MapPin, Lock, LogOut, ShieldAlert, Camera, X } from "lucide-react";
import { showToast } from "../lib/toast.js";
import { useTranslation } from "../lib/i18n.jsx";

export default function Settings() {
  const { language, setLanguage, t } = useTranslation();
  const [profile, setProfile] = useState({
    ownerName: "", email: "", phone: "",
    businessName: "", gstNumber: "", address: "", village: "",
    kardaPerBagKg: 0.5, labourPerBagCash: 5, shrinkagePercent: 2,
    role: "", employeeId: "", profileImageUrl: ""
  });
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ oldPin: "", newPin: "", confirmPin: "" });
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contactChallenge, setContactChallenge] = useState(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactCredential, setContactCredential] = useState("");
  const savedContacts = useRef({ email: "", phone: "" });
  const profileImageInput = useRef(null);

  const isSeth = profile.role === "seth";
  const isMunsi = profile.role === "munsi";
  const isLabour = profile.role === "labour";
  const isRestricted = isMunsi || isLabour;
  const roleLabel = isSeth
    ? "Mandi Owner (Seth)"
    : isMunsi
      ? "Accountant / Clerk (Munshi)"
      : isLabour
        ? "Weighing Staff"
        : "Account";
  const hasPendingContactChange = ["phone", "email"].some(field => {
    const current = field === "email"
      ? (profile[field] || "").trim().toLowerCase()
      : (profile[field] || "").trim();
    return current !== savedContacts.current[field];
  });
  const isContactChallengeActive = contactChallenge && (
    contactChallenge.field === "email"
      ? (profile.email || "").trim().toLowerCase() === contactChallenge.value
      : (profile.phone || "").trim() === contactChallenge.value
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfileLoadError(false);
    api.get("/auth/profile")
      .then(s => {
        if (active && s) {
          setProfile(s);
          savedContacts.current = {
            email: (s.email || "").trim().toLowerCase(),
            phone: (s.phone || "").trim(),
          };
        }
      })
      .catch(err => {
        if (!active) return;
        setProfileLoadError(true);
        showToast("error", t(err.message || "Failed to load profile"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  async function handleSave(e) {
    e.preventDefault();
    const changedContact = ["phone", "email"].find(field => {
      const current = field === "email"
        ? (profile[field] || "").trim().toLowerCase()
        : (profile[field] || "").trim();
      return current !== savedContacts.current[field];
    });

    if (changedContact) {
      if (!contactCredential.trim()) {
        showToast("error", t(`Enter your current ${isRestricted ? "PIN" : "password"} to verify this contact change`));
        return;
      }
      const value = changedContact === "email"
        ? (profile.email || "").trim().toLowerCase()
        : (profile.phone || "").trim();
      const type = changedContact === "email" ? "email" : "mobile";
      setContactBusy(true);
      try {
        if (contactChallenge?.field !== changedContact || contactChallenge.value !== value) {
          await api.post("/auth/profile/contact-otp", {
            type,
            value,
            currentCredential: contactCredential,
          });
          setContactChallenge({ field: changedContact, value, otp: "" });
          setContactCredential("");
          showToast("success", t(`Verification code sent to your ${changedContact}`));
          return;
        }

        if (!/^\d{6}$/.test(contactChallenge.otp)) {
          showToast("error", t("Enter the 6-digit verification code"));
          return;
        }

        await api.post("/auth/profile/verify-contact", {
          type,
          value,
          otp: contactChallenge.otp,
          currentCredential: contactCredential,
        });
        savedContacts.current[changedContact] = value;
        setProfile(current => ({ ...current, [changedContact]: value }));
        setContactChallenge(null);
        setContactCredential("");
        showToast("success", t(`${changedContact === "email" ? "Email" : "Phone number"} verified. Save again to apply other profile changes.`));
      } catch (err) {
        showToast("error", t(err.message || "Contact verification failed"));
      } finally {
        setContactBusy(false);
      }
      return;
    }

    try {
      await api.patch("/auth/profile", profile);
      setContactChallenge(null);
      showToast("success", t("Profile updated successfully!"));
    } catch (err) {
      showToast("error", t(err.message || "Failed to update profile"));
    }
  }

  async function handleResendContactOtp() {
    if (!contactChallenge) return;
    if (!contactCredential.trim()) {
      showToast("error", t(`Enter your current ${isRestricted ? "PIN" : "password"} to resend the code`));
      return;
    }
    setContactBusy(true);
    try {
      await api.post("/auth/profile/contact-otp", {
        type: contactChallenge.field === "email" ? "email" : "mobile",
        value: contactChallenge.value,
        currentCredential: contactCredential,
      });
      setContactChallenge(current => current ? { ...current, otp: "" } : current);
      setContactCredential("");
      showToast("success", t("Verification code sent"));
    } catch (err) {
      showToast("error", t(err.message || "Could not resend verification code"));
    } finally {
      setContactBusy(false);
    }
  }

  async function handleProfileImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("error", t("Choose a JPG, PNG, or WebP image"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", t("Profile images must be 5 MB or smaller"));
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setUploadingImage(true);
    try {
      const result = await api.post("/auth/profile/image", formData);
      if (!result?.profileImageUrl) {
        throw new Error("Profile image upload returned no image URL");
      }
      setProfile(current => ({ ...current, profileImageUrl: result.profileImageUrl }));
      showToast("success", t("Profile photo updated"));
    } catch (err) {
      showToast("error", t(err.message || "Failed to upload profile photo"));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      const message = err instanceof TypeError
        ? "Could not log out. Check your connection and try again."
        : err.message || "Could not log out. Check your connection and try again.";
      showToast("error", t(message));
      return;
    }
    localStorage.removeItem("accessToken"); // ✅ Fixed: was "token"
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  async function handleLogoutAll() {
    try {
      await api.post("/auth/logout-all");
      showToast("success", t("Logged out from all devices securely."));
    } catch (err) {
      const message = err instanceof TypeError
        ? "Could not log out from all devices. Check your connection and try again."
        : err.message || "Logout from all devices failed";
      showToast("error", t(message));
      return;
    }
    localStorage.removeItem("accessToken"); // ✅ Fixed: was "token"
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  const handlePinChange = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinForm.oldPin) || !/^\d{4}$/.test(pinForm.newPin)) {
      return showToast("error", t("Current and new PIN must each be 4 digits"));
    }
    if (pinForm.newPin !== pinForm.confirmPin) return showToast("error", t("New PINs do not match"));

    setPinSubmitting(true);
    try {
      await api.post("/auth/change-pin", { oldPin: pinForm.oldPin, newPin: pinForm.newPin });
      showToast("success", t("PIN changed successfully!"));
      setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
      setShowPinModal(false);
    } catch (err) {
      showToast("error", t(err.message || "Failed to change PIN"));
    } finally {
      setPinSubmitting(false);
    }
  };

  return (
    <AppLayout title="Profile" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">{t("Account")}</p>
            <h2 className="text-white text-xl font-bold">{t("Profile & Settings")}</h2>
          </div>
        </div>
        {/* Profile Header */}
        <div className="flex flex-col items-center mt-2">
          <div className="relative mb-3">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl overflow-hidden">
              {profile.profileImageUrl
                ? <img src={profile.profileImageUrl} alt={`${profile.ownerName || t("Profile")} avatar`} className="h-full w-full object-cover" />
                : <User size={40} className="text-white/80" />}
            </div>
            <input
              ref={profileImageInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProfileImageChange}
              className="hidden"
              aria-label={t("Choose profile photo")}
            />
            <button
              type="button"
              onClick={() => profileImageInput.current?.click()}
              disabled={loading || profileLoadError || uploadingImage}
              aria-label={t(uploadingImage ? "Uploading profile photo" : "Change profile photo")}
              className="absolute bottom-0 right-0 min-h-11 min-w-11 rounded-full border-2 border-blue-800 bg-blue-500 p-2 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
            >
              <Camera size={16} />
            </button>
          </div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            {profile.ownerName || t(roleLabel)}
            <span className="text-[10px] uppercase bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
              {t(roleLabel)}
            </span>
          </h2>
          <p className="text-white/70 text-sm font-semibold tracking-wider mt-1">{profile.employeeId || "ADMIN"}</p>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-6 relative z-10">
        <section className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{t("Language")}</h3>
            <p className="mt-1 text-xs text-gray-500">{t("Choose the language used in the app on this device.")}</p>
          </div>
          <div className="grid min-h-11 grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:w-56">
            <button
              type="button"
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
              className={`rounded-lg px-4 text-sm font-bold transition-colors ${language === "en" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={language === "hi"}
              onClick={() => setLanguage("hi")}
              className={`rounded-lg px-4 text-sm font-bold transition-colors ${language === "hi" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}
            >
              हिन्दी
            </button>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : profileLoadError ? (
          <div className="rounded-3xl border border-red-100 bg-white p-5 text-center shadow-sm">
            <p className="font-semibold text-slate-800">{t("Could not load your profile.")}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt(attempt => attempt + 1)}
              className="mt-3 min-h-11 rounded-xl bg-blue-600 px-5 font-bold text-white"
            >
              {t("Try again")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Personal Info */}
            <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t("Personal Information")}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><User size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Full Name")}</label>
                    <input type="text" value={profile.ownerName} onChange={e => setProfile({...profile, ownerName: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Name")} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Mail size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Email Address")}</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Email")} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0"><Phone size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Phone Number")}</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Phone")} />
                  </div>
                </div>
                {!isRestricted && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Village")}</label>
                      <input type="text" value={profile.village} onChange={e => setProfile({...profile, village: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Village")} />
                    </div>
                  </div>
                )}
                {isContactChallengeActive && (
                  <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {t("Enter the verification code sent to")} {contactChallenge.value}
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={contactChallenge.otp}
                      onChange={event => setContactChallenge(current => ({
                        ...current,
                        otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                      }))}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-lg font-bold tracking-[0.4em] text-slate-900"
                      placeholder={t("6-digit code")}
                      aria-label={t("Contact verification code")}
                    />
                    <button
                      type="button"
                      onClick={handleResendContactOtp}
                      disabled={contactBusy}
                      className="min-h-11 rounded-xl px-3 text-sm font-bold text-blue-700 disabled:opacity-60"
                    >
                      {t("Resend code")}
                    </button>
                  </div>
                )}
                {hasPendingContactChange && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-sm font-bold text-slate-700">
                      {t("Current")} {t(isRestricted ? "4-digit PIN" : "password")}
                    </label>
                    <input
                      type="password"
                      inputMode={isRestricted ? "numeric" : "text"}
                      maxLength={isRestricted ? 4 : undefined}
                      autoComplete="current-password"
                      value={contactCredential}
                      onChange={event => setContactCredential(
                        isRestricted ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value,
                      )}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900"
                      placeholder={t(isRestricted ? "Enter current PIN" : "Enter current password")}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Business Details */}
            {!isRestricted && (
              <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t("Business Details")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Briefcase size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Firm / Business Name")}</label>
                      <input type="text" value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Business Name")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><FileText size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("GST Number")}</label>
                      <input type="text" value={profile.gstNumber} onChange={e => setProfile({...profile, gstNumber: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter GST Number")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Office Address")}</label>
                      <input type="text" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder={t("Enter Address")} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Mandi Settings */}
            {!isRestricted && (
              <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t("Mandi Defaults")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <span className="font-black text-sm">KG</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Karda Deduction (per bag)")}</label>
                      <input 
                        type="number" step="0.1" 
                        value={profile.kardaPerBagKg} 
                        onChange={e => setProfile({...profile, kardaPerBagKg: parseFloat(e.target.value) || 0})} 
                        className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <span className="font-black text-sm">₹</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Labour Deduction (per bag)")}</label>
                      <input 
                        type="number" 
                        value={profile.labourPerBagCash} 
                        onChange={e => setProfile({...profile, labourPerBagCash: parseFloat(e.target.value) || 0})} 
                        className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                      <span className="font-black text-sm">%</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Shrinkage Loss (%)")}</label>
                      <input 
                        type="number" step="0.1" 
                        value={profile.shrinkagePercent} 
                        onChange={e => setProfile({...profile, shrinkagePercent: parseFloat(e.target.value) || 0})} 
                        className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" 
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <button type="submit" disabled={contactBusy} className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-bold shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-60">
              {contactBusy ? t("Please wait...") : isContactChallengeActive ? t("Verify Contact") : t("Save Profile")}
            </button>
          </form>
        )}

        {/* Security & Password */}
        {isRestricted && (
          <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t("Security")}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0"><Lock size={18} /></div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t("Security PIN")}</p>
                  <p className="text-gray-400 text-xs tracking-widest mt-0.5">••••</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPinModal(true)}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:bg-blue-100"
              >
                {t("Change PIN")}
              </button>
            </div>
          </section>
        )}

        {/* Account Actions */}
        <section className="space-y-3 pt-2">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-bold shadow-sm active:bg-gray-50 transition-all">
            <LogOut size={18} />
            {t("Logout from this device")}
          </button>
          
          <button onClick={handleLogoutAll} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 rounded-2xl py-3.5 font-bold active:bg-red-100 transition-all">
            <ShieldAlert size={18} />
            {t("Logout from all devices")}
          </button>
        </section>

      </div>

      {/* Change PIN Slide-Up Bottom Sheet Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 pb-8 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowPinModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">{t("Change PIN")}</h3>
              <p className="mt-1 text-xs text-gray-500">{t("Change your 4-digit mobile security PIN.")}</p>
            </div>

            <form onSubmit={handlePinChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Current PIN")}</label>
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.oldPin}
                  onChange={e => setPinForm({...pinForm, oldPin: e.target.value.replace(/\D/g, "")})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.5em] font-black text-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{t("New PIN")}</label>
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.newPin}
                  onChange={e => setPinForm({...pinForm, newPin: e.target.value.replace(/\D/g, "")})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.5em] font-black text-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{t("Confirm New PIN")}</label>
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={4}
                  value={pinForm.confirmPin}
                  onChange={e => setPinForm({...pinForm, confirmPin: e.target.value.replace(/\D/g, "")})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center tracking-[0.5em] font-black text-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="••••"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={pinSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4"
              >
                {pinSubmitting ? t("Changing PIN...") : t("Change PIN")}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
