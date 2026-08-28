import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalCalendarProps {
  entries: JournalEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  getMoodColor: (mood: JournalEntry['mood'] | null) => string;
}

export function JournalCalendar({ entries, selectedDate, onSelectDate, getMoodColor }: JournalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; 

    const daysArr = [];
    for (let i = startDayOfWeek; i > 0; i--) {
      daysArr.push(new Date(year, month, 1 - i));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      daysArr.push(new Date(year, month, i));
    }
    const remainingDays = 42 - daysArr.length;
    for (let i = 1; i <= remainingDays; i++) {
      daysArr.push(new Date(year, month + 1, i));
    }
    return daysArr;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };
  
  const getFormatDateStr = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const dayNames = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

  return (
    <div className="w-64 p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <div className="text-[11px] font-bold font-mono text-zinc-200 uppercase tracking-widest">
          {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </div>
        <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[9px] font-bold text-zinc-500">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          const dateStr = getFormatDateStr(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const entry = entries.find(e => e.date === dateStr);
          const isSelected = selectedDate === dateStr;
          
          let bgColor = 'bg-transparent';
          let textColor = isCurrentMonth ? 'text-zinc-300' : 'text-zinc-700';
          let borderColor = 'border-transparent';
          
          if (entry) {
             bgColor = getMoodColor(entry.mood || null);
             textColor = 'text-white';
          }
          if (isSelected) {
             borderColor = 'border-blue-500';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(isSelected ? '' : dateStr)}
              className={`h-8 flex flex-col items-center justify-center rounded-lg text-[10px] font-mono transition-all border cursor-pointer ${borderColor} ${bgColor} ${!entry && !isSelected ? 'hover:bg-zinc-800' : ''}`}
            >
              <span className={textColor}>{date.getDate()}</span>
              {entry && <div className="w-1 h-1 rounded-full bg-white/50 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
