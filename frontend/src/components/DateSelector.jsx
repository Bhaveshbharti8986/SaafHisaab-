import React from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function DateSelector({ date, setDate }) {
  const safeDate = date || new Date().toISOString().split("T")[0];
  const selectedDateObj = new Date(safeDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedMidnight = new Date(selectedDateObj);
  selectedMidnight.setHours(0, 0, 0, 0);
  
  const isToday = today.getTime() === selectedMidnight.getTime();

  function changeDay(delta) {
    const d = new Date(selectedDateObj);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  }

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl mb-4 p-1 shadow-sm">
      <button 
        onClick={() => changeDay(-1)} 
        className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="relative flex flex-col items-center justify-center flex-1 py-2 cursor-pointer group">
        <input 
          type="date" 
          value={safeDate} 
          onChange={e => {
            if (e.target.value) setDate(e.target.value);
            else setDate(new Date().toISOString().split("T")[0]);
          }} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        <div className="flex items-center gap-2 text-white group-hover:text-green-400 transition-colors">
          <Calendar size={16} className="opacity-70" />
          <span className="font-bold text-sm tracking-wide">
            {isToday ? "Today" : selectedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <ChevronDown size={16} className="opacity-50 group-hover:opacity-100" />
        </div>
      </div>

      <button 
        onClick={() => changeDay(1)} 
        className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
