import React, { useState, useEffect } from "react";
import { Plus, Trash2, User, UserCircle, Briefcase, Phone, Mail, Hash, Search, RefreshCw, X, Users, Scale } from "lucide-react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { showToast } from "../lib/toast.js";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../lib/i18n.jsx";

const employeeRoleLabel = (role, t) => t(({
  munsi: "Accountant / Clerk",
  labour: "Weighing Staff",
}[role] || "Staff"));

const createEmptyForm = () => ({ name: "", mobile: "", email: "", role: "munsi" });

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [submitting, setSubmitting] = useState(false);

  const filteredEmployees = employees.filter((emp) => {
    const matchesRole = activeTab === "all" || emp.role === activeTab;
    const searchText = [emp.name, emp.mobile, emp.email, emp.employeeId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesRole && searchText.includes(search.trim().toLowerCase());
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async (manualRefresh = false) => {
    if (manualRefresh) setRefreshing(true);
    setLoadError(false);
    try {
      const data = await api.get("/users");
      if (!Array.isArray(data)) throw new Error(t("Could not load staff list"));
      setEmployees(data);
    } catch (err) {
      setLoadError(true);
      showToast("error", err.message || t("Failed to fetch employees"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return showToast("error", t("Please enter your name"));
    if (!/^\d{10}$/.test(form.mobile)) {
      return showToast("error", t("Please enter a valid 10-digit mobile number"));
    }

    setSubmitting(true);
    try {
      const employee = await api.post("/users", {
        ...form,
        name,
        email: form.email.trim() || null,
      });
      if (employee?._offline) {
        showToast("error", t("Could not confirm staff registration. Refresh the list before trying again."));
        return;
      }
      if (!employee?._id) throw new Error(t("Failed to register employee"));

      setEmployees((current) => [employee, ...current]);
      setSearch("");
      setActiveTab("all");
      showToast("success", t("Employee registered successfully"));
      setShowModal(false);
      setForm(createEmptyForm());
    } catch (err) {
      showToast("error", err.message || t("Failed to register employee"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("Are you sure you want to permanently delete this employee? They will lose all access."))) return;

    setDeletingId(id);
    try {
      const result = await api.delete(`/users/${id}`);
      if (result?._offline) {
        showToast("error", t("Could not confirm staff removal. Refresh the list before trying again."));
        return;
      }
      showToast("success", t("Employee deleted permanently"));
      setEmployees((current) => current.filter((employee) => employee._id !== id));
    } catch (err) {
      showToast("error", err.message || t("Failed to delete employee"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout title={t("Manage Staff")}>
      <div className="min-h-[calc(100vh-56px)] space-y-5 bg-gray-50 p-4 pb-24 sm:p-6 md:pb-8">
        <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-800 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">{t("TEAM MANAGEMENT")}</p>
            <h1 className="mt-1 text-2xl font-extrabold">{t("Manage your staff")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">{t("Add clear logins for your accountant and weighing team.")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-blue-900 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]"
          >
            <Plus size={19} />
            {t("Add staff")}
          </button>
        </section>

        <section className="grid grid-cols-3 gap-3" aria-label={t("Staff summary")}>
          {[
            { label: t("Total staff"), count: employees.length, Icon: Users, tone: "text-blue-700 bg-blue-50" },
            { label: t("Accountants / clerks"), count: employees.filter((employee) => employee.role === "munsi").length, Icon: Briefcase, tone: "text-teal-700 bg-teal-50" },
            { label: t("Weighing staff"), count: employees.filter((employee) => employee.role === "labour").length, Icon: Scale, tone: "text-orange-700 bg-orange-50" },
          ].map(({ label, count, Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-3 sm:p-4">
              <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl sm:mb-0 ${tone}`}><Icon size={18} /></span>
              <div>
                <p className="text-xl font-extrabold leading-none text-gray-900">{loading ? "—" : count}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-gray-500 sm:text-xs">{label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search staff by name, phone, or ID")}
                aria-label={t("Search staff by name, phone, or ID")}
                className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={t("Clear search")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchEmployees(true)}
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {t("Refresh")}
            </button>
          </div>

          {employees.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {["all", "munsi", "labour"].map((tab) => {
                const count = tab === "all" ? employees.length : employees.filter((employee) => employee.role === tab).length;
                const label = tab === "all" ? t("All") : employeeRoleLabel(tab, t);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                      activeTab === tab ? "bg-blue-700 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label} <span className={activeTab === tab ? "text-blue-100" : "text-gray-400"}>({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-800">{t("Staff list could not be loaded. Check your connection and try again.")}</p>
            <button type="button" onClick={() => fetchEmployees(true)} className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100">
              {t("Retry")}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-gray-100 bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-b-blue-700" role="status" aria-label={t("Loading staff")} />
          </div>
        ) : loadError && employees.length === 0 ? null : employees.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white px-5 py-10 text-center shadow-sm sm:py-14">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserCircle size={30} /></span>
            <h2 className="mt-4 text-lg font-bold text-gray-900">{t("No staff accounts yet.")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{t("Add an accountant / clerk or weighing staff member to give them a login.")}</p>
            <button type="button" onClick={() => setShowModal(true)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-bold text-white shadow-sm transition hover:bg-blue-800">
              <Plus size={18} /> {t("Add your first staff member")}
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center">
            <Search size={28} className="mx-auto text-gray-300" />
            <p className="mt-3 font-semibold text-gray-800">{t("No staff match your search")}</p>
            <p className="mt-1 text-sm text-gray-500">{t("Try another name, phone, ID, or staff role.")}</p>
            <button type="button" onClick={() => { setSearch(""); setActiveTab("all"); }} className="mt-4 text-sm font-bold text-blue-700 hover:text-blue-900">
              {t("Clear filters")}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {filteredEmployees.map((emp) => (
                <motion.article
                  key={emp._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${emp.role === "munsi" ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-orange-700"}`}>
                      {emp.role === "munsi" ? <Briefcase size={21} /> : <User size={21} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold text-gray-900">{emp.name}</h3>
                      <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                        {employeeRoleLabel(emp.role, t)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(emp._id)}
                      disabled={deletingId === emp._id}
                      aria-label={`${t("Delete employee")}: ${emp.name}`}
                      title={t("Delete employee")}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p className="flex min-w-0 items-center gap-2"><Phone size={15} className="shrink-0 text-gray-400" /><span className="truncate">{emp.mobile}</span></p>
                    {emp.email && <p className="flex min-w-0 items-center gap-2"><Mail size={15} className="shrink-0 text-gray-400" /><span className="truncate">{emp.email}</span></p>}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("Employee ID")}</p>
                      <p className="mt-1 truncate font-mono text-xs font-bold text-blue-700">{emp.employeeId || t("Not available")}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${emp.status === "inactive" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>
                      {emp.status === "inactive" ? t("Inactive") : t("Active")}
                    </span>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) setShowModal(false);
            }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-dialog-title"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="staff-dialog-title" className="text-xl font-extrabold text-gray-900">{t("Register Employee")}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t("Create an official ID for your staff.")}</p>
                </div>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting} aria-label={t("Close")} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">{t("Role")}</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { role: "munsi", label: "Accountant / Clerk", description: "Manages mandi accounts and farmer records.", Icon: Briefcase },
                      { role: "labour", label: "Weighing Staff", description: "Records crop weights at the weighing area.", Icon: Scale },
                    ].map(({ role, label, description, Icon }) => (
                      <button
                        key={role}
                        type="button"
                        aria-pressed={form.role === role}
                        onClick={() => setForm((current) => ({ ...current, role }))}
                        className={`flex min-h-20 items-start gap-3 rounded-2xl border-2 p-3 text-left transition ${
                          form.role === role ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={19} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="block text-sm font-bold">{t(label)}</span>
                          <span className="mt-1 block text-xs leading-5 text-gray-500">{t(description)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="staff-name" className="mb-1.5 block text-sm font-semibold text-gray-700">{t("Full Name")}</label>
                  <input
                    id="staff-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder={t("e.g. Ramesh Kumar")}
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="staff-mobile" className="mb-1.5 block text-sm font-semibold text-gray-700">{t("Mobile Number (Login ID)")}</label>
                  <input
                    id="staff-mobile"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    value={form.mobile}
                    onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder={t("10-digit number")}
                    autoComplete="tel"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="staff-email" className="mb-1.5 block text-sm font-semibold text-gray-700">{t("Email (Optional)")}</label>
                  <input
                    id="staff-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder={t("e.g. ramesh@gmail.com")}
                    autoComplete="email"
                  />
                </div>

                <p className="rounded-xl bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-800">
                  {t("Staff can sign in with their employee ID or registered phone, then set a 4-digit PIN.")}
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="min-h-12 flex-1 rounded-xl bg-gray-100 font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    {submitting ? t("Registering...") : t("Register")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
