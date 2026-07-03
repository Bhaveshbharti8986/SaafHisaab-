import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { User, Mail, Phone, Briefcase, FileText, MapPin, Lock, LogOut, ShieldAlert, Camera, X } from "lucide-react";
import { showToast } from "../lib/toast.js";

export default function Settings() {
  const [profile, setProfile] = useState({
    ownerName: "", email: "", phone: "",
    businessName: "", gstNumber: "", address: "", village: "",
    kardaPerBagKg: 0.5, labourPerBagCash: 5, shrinkagePercent: 2,
    role: "", employeeId: ""
  });
  const [loading, setLoading] = useState(true);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ oldPin: "", newPin: "", confirmPin: "" });
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const isSeth = profile.role === "seth";
  const isMunsi = profile.role === "munsi";
  const isLabour = profile.role === "labour";
  const isRestricted = isMunsi || isLabour;

  useEffect(() => {
    api.get("/auth/profile")
      .then(s => { if (s) setProfile(s); })
      .finally(() => setLoading(false));
  }, []);

  function handleSave(e) {
    e.preventDefault();
    api.patch("/auth/profile", profile)
      .then(() => showToast("Profile updated successfully!", "success"))
      .catch(err => showToast(err.message, "error"));
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem("accessToken"); // ✅ Fixed: was "token"
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  async function handleLogoutAll() {
    try {
      await api.post("/auth/logout-all");
      showToast("Logged out from all devices securely.", "success");
    } catch (err) {
      showToast(err.message || "Logout from all devices failed", "error");
    }
    localStorage.removeItem("accessToken"); // ✅ Fixed: was "token"
    sessionStorage.removeItem("unlocked");
    window.location.href = "/";
  }

  const handlePinChange = async (e) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 4) return showToast("New PIN must be 4 digits", "error");
    if (pinForm.newPin !== pinForm.confirmPin) return showToast("New PINs do not match", "error");

    setPinSubmitting(true);
    try {
      await api.post("/auth/change-pin", { oldPin: pinForm.oldPin, newPin: pinForm.newPin });
      showToast("PIN changed successfully!", "success");
      setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
      setShowPinModal(false);
    } catch (err) {
      showToast(err.message || "Failed to change PIN", "error");
    } finally {
      setPinSubmitting(false);
    }
  };

  return (
    <AppLayout title="Profile" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-12 pt-4 rounded-b-[2rem] shadow-md relative z-0">
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">Account</p>
            <h2 className="text-white text-xl font-bold">Profile & Settings</h2>
          </div>
        </div>
        {/* Profile Header */}
        <div className="flex flex-col items-center mt-2">
          <div className="relative mb-3">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl overflow-hidden">
              <User size={40} className="text-white/80" />
            </div>
            <button type="button" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full text-white shadow-lg active:scale-95 transition-transform border-2 border-blue-800">
              <Camera size={14} />
            </button>
          </div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            {profile.ownerName || (isLabour ? "Labour" : isMunsi ? "Munsi" : "Admin")}
            <span className="text-[10px] uppercase bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
              {profile.role || "seth"}
            </span>
          </h2>
          <p className="text-white/70 text-sm font-semibold tracking-wider mt-1">{profile.employeeId || "ADMIN"}</p>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-6 relative z-10">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Personal Info */}
            <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><User size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Full Name</label>
                    <input type="text" value={profile.ownerName} onChange={e => setProfile({...profile, ownerName: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Name" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Mail size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Email" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0"><Phone size={18} /></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Phone Number</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Phone" />
                  </div>
                </div>
                {!isRestricted && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Village</label>
                      <input type="text" value={profile.village} onChange={e => setProfile({...profile, village: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Village" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Business Details */}
            {!isRestricted && (
              <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Business Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Briefcase size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Firm / Business Name</label>
                      <input type="text" value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Business Name" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><FileText size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">GST Number</label>
                      <input type="text" value={profile.gstNumber} onChange={e => setProfile({...profile, gstNumber: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter GST Number" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Office Address</label>
                      <input type="text" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full text-sm font-bold text-gray-900 focus:outline-none border-b border-gray-100 pb-1 focus:border-blue-600" placeholder="Enter Address" />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Mandi Settings */}
            {!isRestricted && (
              <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Mandi Defaults</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <span className="font-black text-sm">KG</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Karda Deduction (per bag)</label>
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
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Labour Deduction (per bag)</label>
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
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Shrinkage Loss (%)</label>
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

            <button type="submit" className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-bold shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all">
              Save Profile
            </button>
          </form>
        )}

        {/* Security & Password */}
        {isRestricted && (
          <section className="bg-white rounded-3xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Security</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0"><Lock size={18} /></div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Security PIN</p>
                  <p className="text-gray-400 text-xs tracking-widest mt-0.5">••••</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPinModal(true)}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:bg-blue-100"
              >
                Change PIN
              </button>
            </div>
          </section>
        )}

        {/* Account Actions */}
        <section className="space-y-3 pt-2">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-bold shadow-sm active:bg-gray-50 transition-all">
            <LogOut size={18} />
            Logout from this device
          </button>
          
          <button onClick={handleLogoutAll} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 rounded-2xl py-3.5 font-bold active:bg-red-100 transition-all">
            <ShieldAlert size={18} />
            Logout from ALL devices
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
              <h3 className="text-xl font-bold text-gray-900">Change PIN</h3>
              <p className="text-gray-500 text-xs mt-1">Change your 4-digit mobile security PIN.</p>
            </div>

            <form onSubmit={handlePinChange} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Current PIN</label>
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">New PIN</label>
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">Confirm New PIN</label>
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
                {pinSubmitting ? "Changing PIN..." : "Change PIN"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
