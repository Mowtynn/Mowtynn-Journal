import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { JournalEntry } from '../types';
import { TURKISH_MONTHS, TURKISH_DAYS_SHORT } from './TurkishDateTimePicker';

interface JournalCalendarProps {
  entries: JournalEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function JournalCalendar({ entries, selectedDate, onSelectDate }: JournalCalendarProps) {
  const parsedDate = useMemo(() => {
    if (!selectedDate) return new Date();
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, (month || 1) - 1, day || 1);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    onSelectDate(selectedDate === dateStr ? '' : dateStr);
  };

  const handleSetToday = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    onSelectDate(formatted);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formatted = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
    onSelectDate(formatted);
    setViewYear(yesterday.getFullYear());
    setViewMonth(yesterday.getMonth());
  };

  const handleClear = () => {
    onSelectDate('');
  };

  // Generate calendar days with 7-column grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; dateObj: Date; dateStr: string }> = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const d = new Date(viewYear, viewMonth - 1, prevDay);
      days.push({
        day: prevDay,
        isCurrentMonth: false,
        dateObj: d,
        dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        day: i,
        isCurrentMonth: true,
        dateObj: d,
        dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        day: i,
        isCurrentMonth: false,
        dateObj: d,
        dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  // Map entries by date for fast lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    entries.forEach(e => {
      if (e.date) map.set(e.date, e);
    });
    return map;
  }, [entries]);

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="w-[280px] sm:w-[290px] bg-zinc-900/98 border border-zinc-700/60 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl shadow-black/80 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Quick Preset / Filter Actions */}
      <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-zinc-800/80">
        <button
          type="button"
          onClick={handleClear}
          className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer text-center ${
            !selectedDate
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
              : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/40 hover:border-zinc-600'
          }`}
        >
          Tüm Günlükler
        </button>
        <button
          type="button"
          onClick={handleSetToday}
          className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
        >
          Bugün
        </button>
        <button
          type="button"
          onClick={handleSetYesterday}
          className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-700/40 hover:border-zinc-600 transition-all cursor-pointer text-center"
        >
          Dün
        </button>
      </div>

      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-zinc-100 tracking-wide">
          {TURKISH_MONTHS[viewMonth]} {viewYear}
        </span>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-0.5 shadow-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
            title="Önceki Ay"
          >
            <ChevronLeft size={13} />
          </button>
          <div className="w-px h-3.5 bg-zinc-800" />
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6.5 h-6.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
            title="Sonraki Ay"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {TURKISH_DAYS_SHORT.map((day) => (
          <span key={day} className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {calendarDays.map((item, idx) => {
          const isSelected = selectedDate === item.dateStr;
          const today = isToday(item.dateObj);
          const entry = entriesByDate.get(item.dateStr);

          let entryDotColor = 'bg-blue-400';
          if (entry) {
            if (entry.mood === 'excellent' || entry.mood === 'good') entryDotColor = 'bg-emerald-400';
            else if (entry.mood === 'bad' || entry.mood === 'terrible') entryDotColor = 'bg-rose-400';
            else if (entry.mood === 'neutral') entryDotColor = 'bg-amber-400';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (item.isCurrentMonth) {
                  handleSelectDay(item.dateStr);
                } else {
                  setViewYear(item.dateObj.getFullYear());
                  setViewMonth(item.dateObj.getMonth());
                  handleSelectDay(item.dateStr);
                }
              }}
              className={`h-7 text-[10px] font-mono rounded-lg transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                isSelected
                  ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 font-bold shadow-xs'
                  : entry
                  ? 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 hover:border-zinc-500'
                  : !item.isCurrentMonth
                  ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30 border border-transparent'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-transparent'
              }`}
            >
              <span className="leading-none">{item.day}</span>
              
              {/* Entry Indicator Dot */}
              {entry && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${entryDotColor}`} />
              )}

              {/* Today Indicator Dot if no entry */}
              {today && !entry && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-blue-400/80 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer info & Clear Filter action */}
      {selectedDate && (
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span className="text-zinc-300">
            Filtre: <strong className="text-blue-400 font-bold">{selectedDate}</strong>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-bold text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X size={11} /> Kaldır
          </button>
        </div>
      )}
    </div>
  );
}
