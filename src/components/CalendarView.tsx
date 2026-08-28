import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, X } from 'lucide-react';
import { Trade } from '../types';
import TradeDetailModal from './TradeDetailModal';
import { PrintReportModal } from './PrintReportModal';
import { useMetricMode } from '../context/MetricContext';

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

const formatDisplayDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const CalendarView = React.memo(({ trades, currency, onEdit }: { trades: Trade[], currency: string, onEdit?: (trade: Trade) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    trades: Trade[];
    title: string;
    dateRangeText: string;
  }>({
    isOpen: false,
    trades: [],
    title: '',
    dateRangeText: ''
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTrade) {
          setSelectedTrade(null);
        } else if (selectedDateStr) {
          setSelectedDateStr(null);
        }
      }
    };
    if (selectedDateStr || selectedTrade) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDateStr, selectedTrade]);

  const { isRrMode } = useMetricMode();
  
  // Group trades by date string "YYYY-MM-DD" based on user's timezone implicitly
  const dailyStats = useMemo(() => {
    const stats: Record<string, { pnl: number, rr: number, count: number, trades: Trade[] }> = {};
    
    trades.forEach(trade => {
      // Assuming createdAt is timestamp
      const date = new Date(trade.createdAt);
      const dateStr = formatDateLocal(date);
      
      if (!stats[dateStr]) {
        stats[dateStr] = { pnl: 0, rr: 0, count: 0, trades: [] };
      }
      stats[dateStr].pnl += trade.pnl || 0;
      stats[dateStr].rr += trade.rr || 0;
      stats[dateStr].count += 1;
      stats[dateStr].trades.push(trade);
    });
    
    return stats;
  }, [trades]);

  const monthlyStats = useMemo(() => {
    let totalPnl = 0;
    let totalRr = 0;
    let tradingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(new Date(year, month, day));
      if (dailyStats[dateStr]) {
        totalPnl += dailyStats[dateStr].pnl;
        totalRr += dailyStats[dateStr].rr;
        tradingDays++;
      }
    }
    
    return { totalPnl, totalRr, tradingDays };
  }, [dailyStats, year, month, daysInMonth]);

  const renderCells = () => {
    const cells = [];
    
    // Empty cells before the first day of the month
    for (let i = 0; i < firstDay; i++) {
       cells.push(
         <div 
           key={`empty-${i}`} 
           className="bg-zinc-950/30 border border-zinc-900/60 rounded-xl min-h-[64px] sm:min-h-[76px] opacity-40 pointer-events-none"
         />
       );
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateLocal(new Date(year, month, day));
      const stat = dailyStats[dateStr];
      const isToday = formatDateLocal(new Date()) === dateStr;
      
      let cardStyle = "bg-zinc-950/50 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40";
      let primaryColor = "text-zinc-400";
      let secondaryColor = "text-zinc-500";
      
      if (stat) {
         const val = isRrMode ? stat.rr : stat.pnl;
         if (val > 0) {
            cardStyle = "bg-emerald-500/[0.07] hover:bg-emerald-500/15 border-emerald-500/25 hover:border-emerald-500/50 cursor-pointer shadow-xs shadow-emerald-500/5";
            primaryColor = "text-emerald-400";
            secondaryColor = "text-emerald-500/80";
         } else if (val < 0) {
            cardStyle = "bg-rose-500/[0.07] hover:bg-rose-500/15 border-rose-500/25 hover:border-rose-500/50 cursor-pointer shadow-xs shadow-rose-500/5";
            primaryColor = "text-rose-400";
            secondaryColor = "text-rose-500/80";
         } else {
            cardStyle = "bg-zinc-900/60 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700 cursor-pointer";
            primaryColor = "text-zinc-200";
            secondaryColor = "text-zinc-400";
         }
      }
      
      cells.push(
        <div 
           key={`day-${day}`} 
           onClick={() => stat ? setSelectedDateStr(dateStr) : null}
           className={`border rounded-xl p-1.5 sm:p-2 min-h-[64px] sm:min-h-[76px] flex flex-col justify-between transition-all duration-200 ease-out group relative ${cardStyle}`}
        >
          {/* Top Row: Day Number & Trade Count */}
          <div className="flex items-start justify-between">
            <span className={`font-mono text-[10px] sm:text-[11px] leading-none transition-all ${
              isToday 
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40 font-black px-1.5 py-0.5 rounded shadow-xs' 
                : stat ? 'text-zinc-300 font-bold' : 'text-zinc-600 font-medium'
            }`}>
              {day}
            </span>

            {stat && (
              <span className="text-[8.5px] sm:text-[9px] font-mono font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors leading-none">
                {stat.count} İşlem
              </span>
            )}
          </div>

          {/* Bottom Row: Trade Statistics */}
          {stat ? (
            <div className="mt-auto flex flex-col items-end text-right">
               {/* Primary Value */}
               <div className={`font-mono font-extrabold text-[11px] sm:text-xs leading-none ${primaryColor} tracking-tight truncate`}>
                 {isRrMode ? (
                   <>{stat.rr > 0 ? '+' : ''}{stat.rr.toFixed(1)}<span className="text-[8px] font-bold ml-0.5 opacity-80">R</span></>
                 ) : (
                   <>{stat.pnl > 0 ? '+' : ''}{(stat?.pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}<span className="text-[8px] font-bold ml-0.5 opacity-80">{currency}</span></>
                 )}
               </div>

               {/* Secondary Value */}
               <div className={`font-mono text-[8.5px] sm:text-[9px] font-medium mt-0.5 ${secondaryColor} truncate leading-none`}>
                 {isRrMode ? (
                   <>{stat.pnl > 0 ? '+' : ''}{(stat?.pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}</>
                 ) : (
                   <>{stat.rr > 0 ? '+' : ''}{stat.rr.toFixed(1)} R</>
                 )}
               </div>
            </div>
          ) : (
            <div className="mt-auto text-right text-[10px] text-zinc-800/80 font-mono select-none pointer-events-none leading-none">—</div>
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
             className="bg-zinc-950/30 border border-zinc-900/60 rounded-xl min-h-[64px] sm:min-h-[76px] opacity-40 pointer-events-none"
           />
         );
       }
    }
    
    return cells;
  };

  const selectedDateStats = selectedDateStr ? dailyStats[selectedDateStr] : null;

  return (
    <div className="w-full flex flex-col gap-3">
       <div className="flex-1 flex flex-col bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-3 sm:p-5 shadow-xl">
          {/* Header Controls & Summary Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
             {/* Navigation */}
             <div className="flex items-center gap-2.5">
               <button 
                 onClick={goToToday}
                 className="px-3 py-1.5 text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl transition-all duration-200 shadow-xs active:scale-95 cursor-pointer"
               >
                 Bugün
               </button>
               <div className="flex items-center gap-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800/80 p-1 shadow-xs">
                 <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
                 <span className="min-w-[130px] text-center font-mono font-bold text-xs sm:text-sm text-zinc-100 uppercase tracking-wide">
                   {monthNames[month]} {year}
                 </span>
                 <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"><ChevronRight size={16} /></button>
               </div>
             </div>
             
             {/* Monthly Summary Badges */}
             <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
               {/* Total PnL / RR */}
               <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl shadow-xs">
                 <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">{isRrMode ? 'Aylık RR:' : 'Aylık PnL:'}</span>
                 <span className={`font-black font-mono text-xs ${(isRrMode ? monthlyStats.totalRr : monthlyStats.totalPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                   {(isRrMode ? monthlyStats.totalRr : monthlyStats.totalPnl) >= 0 ? '+' : ''}{(isRrMode ? monthlyStats.totalRr : monthlyStats.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {isRrMode ? 'R' : currency}
                 </span>
               </div>

               {/* Trading Days */}
               <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl shadow-xs">
                 <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">İşlem Günü:</span>
                 <span className="font-extrabold text-zinc-200 font-mono text-xs">{monthlyStats.tradingDays} Gün</span>
               </div>
             </div>
          </div>
          
          {/* Calendar Grid Container */}
          <div className="w-full rounded-2xl bg-zinc-950/80 p-2 sm:p-3 border border-zinc-800/80 shadow-2xl">
             {/* Days of week header */}
             <div className="grid grid-cols-7 mb-1.5 pb-1.5 border-b border-zinc-800/60">
               {DAYS_OF_WEEK.map(day => (
                 <div key={day} className="py-0.5 text-center text-[9px] sm:text-[10px] font-mono font-extrabold text-zinc-400 uppercase tracking-widest">
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

       {/* Daily Trades Drawer/Modal */}
       {createPortal(
         <AnimatePresence>
           {selectedDateStr && selectedDateStats && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
             style={{ willChange: 'opacity' }}
             className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
             onClick={() => setSelectedDateStr(null)}
           >
             <motion.div
               initial={{ opacity: 0, scale: 0.94, y: 16 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.94, y: 16 }}
               transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
               style={{ willChange: 'transform, opacity' }}
               className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950/90 border border-zinc-800/80 rounded-xl shadow-2xl relative overflow-hidden"
               onClick={e => e.stopPropagation()}
             >
                {/* Header */}
                <div className="bg-zinc-950/60 border-b border-zinc-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 flex-1 min-w-0">
                    <div className="bg-blue-500/10 border border-blue-500/20 px-2 sm:px-3 py-1.5 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[10px] sm:text-sm font-black text-blue-400 font-mono tracking-widest uppercase flex items-center justify-center leading-none">
                        <CalendarIcon size={16} className="mr-1.5 text-blue-400 shrink-0" />
                        {formatDisplayDate(selectedDateStr)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <h2 className="text-zinc-100 font-black text-[10px] sm:text-sm uppercase tracking-wider font-mono leading-none flex items-center whitespace-nowrap">İşlem Geçmişi</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintModalState({
                          isOpen: true,
                          trades: selectedDateStats.trades,
                          title: `${formatDisplayDate(selectedDateStr)} İşlem Raporu`,
                          dateRangeText: formatDisplayDate(selectedDateStr)
                        });
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                    >
                      <Download size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedDateStr(null)}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                    >
                      <X size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Date Detailed Stats */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950/40 border-b border-zinc-800/80 shrink-0 select-none w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 text-zinc-100 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">TOPLAM:</span>
                      <span className="text-xs font-black text-white font-mono">{selectedDateStats.count}</span>
                    </div>
                    {(() => {
                      const longTrades = selectedDateStats.trades.filter(t => t.type === 'LONG');
                      const shortTrades = selectedDateStats.trades.filter(t => t.type === 'SHORT');
                      
                      const longWins = longTrades.filter(t => t.status === 'WIN').length;
                      const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
                      
                      const shortWins = shortTrades.filter(t => t.status === 'WIN').length;
                      const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;
                      
                      return (
                        <>
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">LONG:</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">{longTrades.length}</span>
                            <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">%{longWinRate.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest font-mono">SHORT:</span>
                            <span className="text-xs font-black text-rose-400 font-mono">{shortTrades.length}</span>
                            <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                            <span className="text-xs font-black text-rose-400 font-mono">%{shortWinRate.toFixed(1)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                    {(() => {
                      const sessionBreakdown = selectedDateStats.trades.reduce((acc, t) => {
                        const s = t.session || 'Belirtilmemiş';
                        if (!acc[s]) acc[s] = { pnl: 0, rr: 0 };
                        acc[s].pnl += t.pnl || 0;
                        acc[s].rr += t.rr || 0;
                        return acc;
                      }, {} as Record<string, { pnl: number, rr: number }>);

                      return Object.entries(sessionBreakdown).map(([session, vals]) => {
                        const val = isRrMode ? vals.rr : vals.pnl;
                        if (val === 0) return null;
                        
                        const isProfit = val > 0;
                        const isLoss = val < 0;
                        
                        const textColorClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        const bgClass = isProfit ? 'bg-emerald-500/10 border-emerald-500/20' : isLoss ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-500/10 border-zinc-500/20';
                        const labelClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        
                        return (
                          <div key={session} className={`flex items-center justify-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border leading-none ${bgClass}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest leading-none ${labelClass}`}>{session}:</span>
                            <span className={`text-[9px] font-black font-mono leading-none ${textColorClass}`}>
                              {isRrMode ? `${val > 0 ? '+' : ''}${val.toFixed(1)}R` : `${val > 0 ? '+' : ''}${val.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[300px] px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                  <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                    <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                      <tr className="text-[9px] text-zinc-400 uppercase tracking-widest relative after:absolute after:inset-0 after:rounded-lg after:border after:border-zinc-800/80 after:pointer-events-none">
                        <th className="py-1.5 px-3 font-mono select-none w-[20%] min-w-[120px] bg-zinc-950/40 rounded-l-lg text-left">Parite</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[11%] min-w-[65px] bg-zinc-950/40">Yön</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[11%] min-w-[65px] bg-zinc-950/40">RR</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-950/40">Session</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-950/40">Sonuç</th>
                        <th className="py-1.5 px-3 text-right font-mono select-none w-[16%] min-w-[95px] bg-zinc-950/40"><div className="flex items-center justify-end w-full"><span>Kâr/Zarar</span></div></th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[14%] min-w-[80px] bg-zinc-950/40 rounded-r-lg">Platform</th>
                      </tr>
                    </thead>
                    <tbody className="block sm:table-row-group">
                      {selectedDateStats.trades.slice(0, 100).map((t, idx) => {
                        const isWin = t.status === 'WIN';
                        const isLoss = t.status === 'LOSS';
                        const isBe = t.status === 'BREAKEVEN';
                        let pnlText = '—';
                        let pnlColor = 'text-zinc-400';
                        if (isBe) {
                          pnlText = `0.00 ${currency}`;
                          pnlColor = 'text-zinc-500 font-bold';
                        } else {
                          const pnlValue = t.pnl || 0;
                          const prefix = pnlValue > 0 ? '+' : '';
                          pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                          pnlColor = pnlValue > 0 ? 'text-emerald-400 font-black' : (pnlValue < 0 ? 'text-rose-400 font-black' : 'text-zinc-500 font-bold');
                        }
                        
                        return (
                          <tr 
                            key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                          onClick={() => setSelectedTrade ? setSelectedTrade(t) : null}
                          className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-900/40 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0 align-middle"
                        >
                          <td className="w-1/2 sm:w-[20%] sm:min-w-[120px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-mono sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-l-lg sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                              <span className="text-white font-bold text-xs sm:text-[10px]">{t.asset}</span>
                              <span className="text-[10px] sm:text-[10px] text-zinc-500 sm:text-zinc-400 transition-colors">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex items-center justify-center w-full">
                              {t.type === 'LONG' ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LONG</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">SHORT</span>
                              )}
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                              <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
                              <div className="flex items-center justify-center w-full h-[18px]">
                                {t.rr !== undefined && t.rr !== null && t.rr !== 0 ? (
                                  t.rr > 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                      +{t.rr}R
                                    </span>
                                  ) : t.rr < 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded">—</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-1 px-2 text-center text-zinc-400 font-medium sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 w-[14%] min-w-[75px] align-middle">
                            <div className="flex items-center justify-center w-full">
                              <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.session || 'Diğer'}>
                                {t.session || 'Diğer'}
                              </span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[14%] sm:min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <div className="flex items-center justify-center w-full h-[18px]">
                              {isWin ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">WIN</span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LOSS</span>
                              ) : isBe ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">BE</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">AÇIK</span>
                              )}
                            </div>
                          </td>
                          <td className={`w-full sm:w-[16%] sm:min-w-[95px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 pt-3 sm:pt-0 border-t border-zinc-800/50 align-middle`}>
                            <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end">
                              <span className="text-sm sm:text-[11px] font-mono font-black">{pnlText}</span>
                            </div>
                          </td>
                          <td className="w-full sm:w-[14%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-2 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-r-lg sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
                            <div className="sm:hidden">
                              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Platform</span>
                            </div>
                            <div className="flex items-center justify-center w-full">
                              {t.platform ? (
                                <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.platform}>
                                  {t.platform}
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                      {selectedDateStats.trades.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">Bu gün için herhangi bir işlem bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

       <TradeDetailModal 
         trade={selectedTrade} 
         onClose={() => setSelectedTrade(null)} 
         onEdit={(trade) => {
            if (onEdit) onEdit(trade);
            setSelectedTrade(null);
            setSelectedDateStr(null);
          }}
         currency={currency} 
       />

       <PrintReportModal title="Analiz Raporu" isOpen={printModalState.isOpen}
         onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
         trades={printModalState.trades}
         
         dateRangeText={printModalState.dateRangeText}
         currency={currency}
       />
    </div>
  );
});
