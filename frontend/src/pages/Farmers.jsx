import React, { useEffect, useState, useRef, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { Search, User } from "lucide-react";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { getAvatarColor, getInitials } from "../lib/crop.js";

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: "", village: "", phone: "" });
  
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setFarmers([]);
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    const q = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
    api.get(`/farmers?paginate=true&page=${page}&limit=30${q}`)
      .then(res => {
        if (page === 1) setFarmers(res.data);
        else setFarmers(prev => [...prev, ...res.data]);
        setHasMore(res.hasMore);
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  async function handleAdd(e) {
    e.preventDefault();
    const f = await api.post("/farmers", form);
    setFarmers(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: "", village: "", phone: "" });
    setShowAdd(false);
  }

  return (
    <AppLayout title="Farmer Khata" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-8 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-12 py-3.5 text-sm font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
        </div>
      </div>

      <div className="p-4 space-y-4 relative z-10">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-bold text-sm shadow-[0_4px_15px_rgba(37,99,235,0.2)] active:scale-95 transition-transform"
        >
          + Add New Farmer
        </button>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
            {["name", "village", "phone"].map(f => (
              <input
                key={f}
                required={f === "name"}
                value={form[f]}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
              />
            ))}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-gray-600 rounded-2xl py-3 font-bold text-sm active:bg-gray-200 transition-colors">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-bold text-sm shadow-md active:bg-blue-700 transition-colors">Save</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-3xl animate-pulse" />)
            : farmers.length === 0
              ? <p className="text-center text-gray-400 py-12 font-bold text-sm">No farmers found</p>
              : farmers.map((f, i) => {
                  const isLast = i === farmers.length - 1;
                  return (
                    <div
                      key={f._id}
                      ref={isLast ? lastElementRef : null}
                      onClick={() => window.location.href = `/farmers/${f._id}`}
                      className="bg-white rounded-3xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner ${getAvatarColor(f.name)}`}>
                          {getInitials(f.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{f.name}</p>
                          <p className="text-[11px] font-medium text-gray-500">{f.village} • {f.phone}</p>
                          {f.bagsIssued > 0 && <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mt-0.5">{f.bagsIssued} bags out</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-base ${f.balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatINR(Math.abs(f.balance))}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.balance >= 0 ? "Due" : "Owes"}</p>
                      </div>
                    </div>
                  );
              })
          }
        </div>

        {hasMore && !loading && (
          <button 
            onClick={() => setPage(p => p + 1)}
            className="w-full py-4 text-sm font-bold text-blue-600 bg-blue-50 rounded-2xl active:bg-blue-100 transition-colors"
          >
            Load More Farmers
          </button>
        )}
      </div>
    </AppLayout>
  );
}
