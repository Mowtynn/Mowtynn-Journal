import React, { useState, useMemo, useEffect } from 'react';
import { smartUpper } from '../constants/constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Trade } from '../types';
import { TradeHistoryModal } from './TradeHistoryModal';
import { nyWallDate, nyNow } from '../lib/tradingTime';

const DAYS_OF_WEEK = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  let day = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0 and Sunday is 6
  return day === 0 ? 6 : day - 1;
};

const formatDateLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const monthNames = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const displayDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const formatDisplayDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return displayDateFormatter.format(dateObj);
};

export const CalendarView = React.memo(({ trades, onEdit }: { trades: Trade[], onEdit?: (trade: Trade) => void }) => {
  const [currentDate, setCurrentDate] = useState(nyNow());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(nyNow());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDateStr) setSelectedDateStr(null);
      }
    };
    if (selectedDateStr) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDateStr]);

  // Group trades by date string "YYYY-MM-DD" based on user's timezone implicitly
  const dailyStats = useMemo(() => {
    const stats: Record<string, { rr: number, count: number, trades: Trade[] }> = {};
    
    trades.forEach(trade => {
      // Assuming createdAt is timestamp
      const date = nyWallDate(trade.createdAt);
      const dateStr = formatDateLocal(date);
      
      if (!stats[dateStr]) {
        stats[dateStr] = { rr: 0, count: 0, trades: [] };
      }
      stats[dateStr].rr += trade.rr || 0;
      stats[dateStr].count += 1;
      stats[dateStr].trades.push(trade);
    });
    
    return stats;
  }, [trades]);

  const monthlyStats = useMemo(() => {
    let totalRr = 0;
    let tradingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(new Date(year, month, day));
      if (dailyStats[dateStr]) {
        totalRr += dailyStats[dateStr].rr;
        tradingDays++;
      }
    }
    
    return { totalRr, tradingDays };
  }, [dailyStats, year, month, daysInMonth]);

  const renderCells = () => {
    const cells = [];
    
    // Empty cells before the first day of the month
    for (let i = 0; i < firstDay; i++) {
       cells.push(
         <div 
           key={`empty-${i}`} 
           className="bg-zinc-900 border border-zinc-900/60 rounded-xl min-h-[64px] sm:min-h-[76px] opacity-40 pointer-events-none"
         />
       );
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(new Date(year, month, day));
      const stat = dailyStats[dateStr];
      const isToday = formatDateLocal(nyNow()) === dateStr;
      
      let cardStyle = "bg-zinc-900 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-800";
      let primaryColor = "text-zinc-400";
      let secondaryColor = "text-zinc-500";
      
      if (stat) {
         const val = stat.rr;
         if (val > 0) {
            cardStyle = "bg-emerald-500/[0.07] hover:bg-emerald-500/15 border-emerald-500/25 hover:border-emerald-500/50 cursor-pointer shadow-xs shadow-emerald-500/5";
            primaryColor = "text-emerald-400";
            secondaryColor = "text-emerald-500/80";
         } else if (val < 0) {
            cardStyle = "bg-rose-500/[0.07] hover:bg-rose-500/15 border-rose-500/25 hover:border-rose-500/50 cursor-pointer shadow-xs shadow-rose-500/5";
            primaryColor = "text-rose-400";
            secondaryColor = "text-rose-500/80";
         } else {
            cardStyle = "bg-zinc-800 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700 cursor-pointer";
            primaryColor = "text-zinc-200";
            secondaryColor = "text-zinc-400";
         }
      }
      
      cells.push(
        <div 
           key={`day-${day}`} 
           onClick={() => stat ? setSelectedDateStr(dateStr) : null}
           className={`border rounded-xl p-1.5 sm:p-2 min-h-[64px] sm:min-h-[76px] flex flex-col justify-between transition-ui duration-200 ease-out group relative ${cardStyle}`}
        >
          {/* Top Row: Day Number & Trade Count */}
          <div className="flex items-start justify-between">
            <span className={`font-sans text-[10px] sm:text-xs leading-none transition-ui ${
              isToday 
                ? 'toggle-item-brand border border-blue-500/40 font-black px-1.5 py-0.5 rounded-lg shadow-xs' 
                : stat ? 'text-zinc-300 font-bold' : 'text-zinc-600 font-medium'
            }`}>
              {day}
            </span>

            {stat && (
              <span className="text-[8.5px] sm:text-[9px] font-sans font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors leading-none">
                {stat.count} İşlem
              </span>
            )}
          </div>

          {/* Bottom Row: Trade Statistics */}
          {stat ? (
            <div className="mt-auto flex flex-col items-end text-right overflow-hidden">
               <div className={`font-sans font-extrabold text-xs sm:text-xs leading-none ${primaryColor} tracking-tight truncate`}>
                 {stat.rr > 0 ? '+' : ''}{stat.rr.toFixed(1)}<span className="text-[8px] font-bold ml-0.5 opacity-80">R</span>
               </div>
               <div className={`font-sans text-[8.5px] sm:text-[9px] font-medium mt-0.5 ${secondaryColor} truncate leading-none`}>
                 {stat.count} işlem
               </div>
            </div>
          ) : (
            <div className="mt-auto text-right text-[10px] text-zinc-800/80 font-sans select-none pointer-events-none leading-none">—</div>
          )}
        </div>
      );
    }
    
    // Fill the rest of the row
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
       for (let i = 0; i < remaining; i++) {
         cells.push(
           <div 
             key={`empty-end-${i}`} 
             className="bg-zinc-900 border border-zinc-900/60 rounded-xl min-h-[64px] sm:min-h-[76px] opacity-40 pointer-events-none"
           />
         );
       }
    }
    
    return cells;
  };

  const selectedDateStats = selectedDateStr ? dailyStats[selectedDateStr] : null;

  return (
    <div className="w-full flex flex-col gap-3">
       <div className="flex-1 flex flex-col bg-zinc-900/70 border border-zinc-700/50 /80 rounded-2xl p-3 sm:p-5 shadow-xl">
          {/* Header Controls & Summary Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
             {/* Navigation */}
             <div className="flex items-center gap-2">
               <button 
                 type="button"
                 onClick={goToToday}
                 className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-colors duration-150 shadow-xs cursor-pointer"
               >
                 Bugün
               </button>
               <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-xs">
                 <button aria-label="Önceki" 
                   type="button"
                   onClick={prevMonth} 
                   className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                 >
                   <ChevronLeft size={13} />
                 </button>
                 <span className="min-w-[110px] text-center font-sans font-semibold text-xs text-zinc-100 tracking-wide select-none">
                   {monthNames[month]} {year}
                 </span>
                 <button aria-label="Sonraki" 
                   type="button"
                   onClick={nextMonth} 
                   className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                 >
                   <ChevronRight size={13} />
                 </button>
               </div>
             </div>
             
             {/* Monthly Summary Badges */}
             <div className="flex flex-wrap items-center gap-2.5 text-xs font-sans">
               {/* Total PnL / RR */}
               <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl shadow-xs overflow-hidden">
                 <div className="flex items-center gap-2">
                   <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">{smartUpper("Aylık R:")}</span>
                   <span className={`font-black font-sans text-xs ${monthlyStats.totalRr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {monthlyStats.totalRr >= 0 ? '+' : ''}{monthlyStats.totalRr.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} R
                   </span>
                 </div>
               </div>

               {/* Trading Days */}
               <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl shadow-xs">
                 <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">İşlem Günü:</span>
                 <span className="font-extrabold text-zinc-200 font-sans text-xs">{monthlyStats.tradingDays} Gün</span>
               </div>
             </div>
          </div>
          
          {/* Calendar Grid Container */}
          <div className="w-full rounded-2xl bg-zinc-950/80 p-2 sm:p-3 border border-zinc-800/80 shadow-2xl">
             {/* Days of week header */}
             <div className="grid grid-cols-7 mb-1.5 pb-1.5 border-b border-zinc-800/60">
               {DAYS_OF_WEEK.map(day => (
                 <div key={day} className="py-0.5 text-center heading-3">
                   {day}
                 </div>
               ))}
             </div>
             {/* Cells */}
             <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
               {renderCells()}
             </div>
          </div>
       </div>

       {/* Daily Trades Modal */}
       <TradeHistoryModal
         isOpen={!!(selectedDateStr && selectedDateStats)}
         onClose={() => setSelectedDateStr(null)}
         title={selectedDateStr ? formatDisplayDate(selectedDateStr) : ""}
         icon={<CalendarIcon size={16} className="mr-1.5 text-blue-400 shrink-0" />}
         trades={selectedDateStats?.trades || []}
         onEdit={(trade) => {
           if (onEdit) onEdit(trade);
           setSelectedDateStr(null);
         }}
       />

    </div>
  );
});
