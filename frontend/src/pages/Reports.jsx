import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { api } from "../lib/api.js";
import { formatINR } from "../lib/format.js";
import { ArrowDownLeft, ArrowUpRight, Search, FileText } from "lucide-react";

export default function Reports() {
  const [entries, setEntries] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'in', 'out'

  useEffect(() => {
    api.get(`/dashboard/passbook?date=all&limit=200`).then(setEntries);
  }, []);

  const totalJama = entries?.filter(e => e.direction === "in").reduce((s, e) => s + e.amount, 0) || 0;
  const totalKharcha = entries?.filter(e => e.direction === "out").reduce((s, e) => s + e.amount, 0) || 0;

  const filteredEntries = entries?.filter(e => filter === "all" ? true : e.direction === filter) || [];

  const groupedEntries = {};
  filteredEntries.forEach(txn => {
    const d = new Date(txn.time);
    const month = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groupedEntries[month]) groupedEntries[month] = [];
    groupedEntries[month].push(txn);
  });

  return (
    <AppLayout title="Passbook" showBack={true}>
      <div className="bg-gradient-to-b from-blue-800 to-blue-700 px-4 pb-6 pt-4 sticky top-[56px] z-20 rounded-b-[2rem] shadow-md">

        {/* Top Summary Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-sm mb-4 flex divide-x divide-white/20">
          <div className="flex-1 pr-4">
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Money Received (In)</p>
            <p className="text-white font-black text-xl">{formatINR(totalJama)}</p>
          </div>
          <div className="flex-1 pl-4">
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Money Paid (Out)</p>
            <p className="text-white font-black text-xl">{formatINR(totalKharcha)}</p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "in", label: "Money In" },
            { id: "out", label: "Money Out" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                filter === f.id 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 min-h-[400px]">
        {!entries ? (
          <div className="space-y-0 divide-y divide-gray-100 bg-white">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-3 p-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-bold text-gray-500">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">Try changing the date or filter</p>
          </div>
        ) : (
          <div className="bg-white">
            {Object.entries(groupedEntries).map(([month, monthEntries]) => (
              <div key={month}>
                <div className="bg-gray-100 text-gray-500 font-bold text-xs uppercase px-4 py-2 sticky top-[170px] z-10 shadow-sm border-y border-gray-200">
                  {month}
                </div>
                <div className="divide-y divide-gray-100 border-b border-gray-100">
                  {monthEntries.map(txn => {
                    const isIn = txn.direction === "in";
                    return (
                      <div key={txn.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isIn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                        }`}>
                          {isIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{txn.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold">
                              {new Date(txn.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(txn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shadow-sm border border-gray-200 truncate max-w-[120px]">
                              {txn.category?.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <p className={`font-black text-[15px] ${isIn ? "text-[#1d9154]" : "text-gray-900"}`}>
                            {isIn ? "+" : "-"} {formatINR(txn.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
