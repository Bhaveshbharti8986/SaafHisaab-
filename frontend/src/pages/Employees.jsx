import React, { useState, useEffect } from "react";
import { Plus, Trash2, User, UserCircle, Briefcase, Phone, Mail, Hash } from "lucide-react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { showToast } from "../lib/toast.js";
import { motion, AnimatePresence } from "framer-motion";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState({ name: "", mobile: "", email: "", role: "munsi" });
  const [submitting, setSubmitting] = useState(false);

  const filteredEmployees = employees.filter(emp => activeTab === "all" || emp.role === activeTab);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.get("/users");
      setEmployees(data);
    } catch (err) {
      showToast("error", "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile) return showToast("error", "Name and mobile are required");
    
    setSubmitting(true);
    try {
      await api.post("/users", form);
      showToast("success", "Employee registered successfully");
      setShowModal(false);
      setForm({ name: "", mobile: "", email: "", role: "munsi" });
      fetchEmployees();
    } catch (err) {
      showToast("error", err.message || "Failed to register employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this employee? They will lose all access.")) return;
    
    try {
      await api.delete(`/users/${id}`);
      showToast("success", "Employee deleted permanently");
      setEmployees(employees.filter(e => e._id !== id));
    } catch (err) {
      showToast("error", "Failed to delete employee");
    }
  };

  return (
    <AppLayout title="Employee Registry">
      <div className="p-4 bg-gray-50 min-h-[calc(100vh-56px)] pb-24">
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Tabs only show if there are ANY employees registered */}
            {employees.length > 0 && (
              <div className="flex bg-gray-200/60 p-1 rounded-xl mb-4">
                {['all', 'munsi', 'labour'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* List or Empty State */}
            {employees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
                <UserCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No employees registered yet.</p>
                <p className="text-sm text-gray-400 mt-1">Add your Munsi or Labour to get started.</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <UserCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No {activeTab} employees found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmployees.map((emp) => (
                  <motion.div 
                    key={emp._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center"
                  >
                    <div className="flex gap-4 items-center">
                      <div className={`p-3 rounded-full ${emp.role === 'munsi' ? 'bg-teal-50 text-teal-600' : 'bg-orange-50 text-orange-600'}`}>
                        {emp.role === 'munsi' ? <Briefcase size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          {emp.name} 
                          <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                            {emp.role}
                          </span>
                        </h3>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={12}/> {emp.mobile}</p>
                          {emp.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={12}/> {emp.email}</p>}
                          <p className="text-xs text-blue-600 font-semibold flex items-center gap-1.5 mt-0.5 bg-blue-50 w-max px-1.5 py-0.5 rounded"><Hash size={12}/> {emp.employeeId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(emp._id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40"
      >
        <Plus size={24} />
      </button>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-safe"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">Register Employee</h3>
              <p className="text-sm text-gray-500 mb-6">Create an official ID for your staff.</p>

              <form onSubmit={handleRegister} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, role: "munsi" })}
                      className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-colors ${form.role === 'munsi' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                    >
                      <Briefcase size={18}/> Munsi
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, role: "labour" })}
                      className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-colors ${form.role === 'labour' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                    >
                      <User size={18}/> Labour
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number (Login ID)</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10-digit number"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. ramesh@gmail.com"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 active:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Registering..." : "Register"}
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
