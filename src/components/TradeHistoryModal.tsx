import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Download, X } from "lucide-react";
import { Trade, DefinitionTitles } from "../types";
import { useMetricMode } from "../context/MetricContext";
import { PrintReportModal } from "./PrintReportModal";
import TradeDetailModal from "./TradeDetailModal";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

export interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  trades: Trade[];
  currency: string;
  onEdit?: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  definitionTitles?: DefinitionTitles;
}

export const TradeHistoryModal: React.FC<TradeHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  title,
  icon,
  trades,
  currency,
  onEdit,
  onDelete,
  definitionTitles
}) => {
  const { isRrMode } = useMetricMode();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Preserve displayed state so that content remains intact during exit animation when props are cleared
  const [displayedTrades, setDisplayedTrades] = useState<Trade[]>(trades);
  const [displayedTitle, setDisplayedTitle] = useState<string>(title);
  const [displayedIcon, setDisplayedIcon] = useState<React.ReactNode>(icon);

  useEffect(() => {
    if (isOpen) {
      setDisplayedTrades(trades);
      setDisplayedTitle(title);
      setDisplayedIcon(icon);
    }
  }, [isOpen, trades, title, icon]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedTrade) {
          setSelectedTrade(null);
        } else if (isPrintModalOpen) {
          setIsPrintModalOpen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedTrade, isPrintModalOpen, onClose]);

  const activeTrades = isOpen ? trades : displayedTrades;
  const activeTitle = isOpen ? title : displayedTitle;
  const activeIcon = isOpen ? icon : displayedIcon;

  const sortedTrades = React.useMemo(() => {
    return [...activeTrades].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeTrades]);

  const totalCount = sortedTrades.length;
  const longTrades = sortedTrades.filter(t => t.type === "LONG");
  const shortTrades = sortedTrades.filter(t => t.type === "SHORT");

  const longWins = longTrades.filter(t => t.status === "WIN").length;
  const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;

  const shortWins = shortTrades.filter(t => t.status === "WIN").length;
  const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

  const sessionBreakdown = React.useMemo(() => {
    return sortedTrades.reduce((acc, t) => {
      const s = t.session || "Belirtilmemiş";
      if (!acc[s]) acc[s] = { pnl: 0, rr: 0 };
      acc[s].pnl += t.pnl || 0;
      acc[s].rr += t.rr || 0;
      return acc;
    }, {} as Record<string, { pnl: number; rr: number }>);
  }, [sortedTrades]);

  return createPortal(
    <>
      <AnimatePresence
        onExitComplete={() => {
          if (!isOpen) {
            setDisplayedTrades([]);
            setDisplayedTitle("");
          }
        }}
      >
        {isOpen && (
          <motion.div
            key="trade-history-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-zinc-950/80"
            onClick={onClose}
          >
            <motion.div
              key="trade-history-modal-content"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="w-full max-w-4xl h-[80vh] sm:h-[620px] max-h-[85vh] min-h-[420px] flex flex-col bg-zinc-950/95 border border-zinc-800/80 rounded-2xl shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-zinc-950/60 border-b border-zinc-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 flex-1 min-w-0">
                  <div className="bg-blue-500/10 border border-blue-500/20 px-2 sm:px-3 py-1.5 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-[10px] sm:text-sm font-black text-blue-400 font-sans tracking-widest uppercase flex items-center justify-center leading-none">
                      {activeIcon || <CalendarIcon size={16} className="mr-1.5 text-blue-400 shrink-0" />}
                      <span className="ml-1">{activeTitle}</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <h2 className="text-zinc-100 font-black text-[10px] sm:text-sm uppercase tracking-wider font-sans leading-none flex items-center whitespace-nowrap">
                      İşlem Geçmişi
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-xl transition-colors duration-200 ease-out cursor-pointer group shadow-xs shrink-0"
                  >
                    <Download size={18} className="transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900/70 border border-zinc-700/50 rounded-xl transition-colors duration-200 ease-out cursor-pointer group shadow-xs shrink-0"
                  >
                    <X size={18} className="transition-colors" />
                  </button>
                </div>
              </div>

              {/* Sub-Header Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900 border-b border-zinc-800/80 shrink-0 select-none w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 text-zinc-100 rounded-xl px-2.5 py-1.5 shrink-0">
                    <span className="heading-2">TOPLAM:</span>
                    <span className="text-xs font-black text-white font-sans">{totalCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 shrink-0">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-sans">LONG:</span>
                    <span className="text-xs font-black text-emerald-400 font-sans">{longTrades.length}</span>
                    <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest ml-1 font-sans">WR:</span>
                    <span className="text-xs font-black text-emerald-400 font-sans">%{longWinRate.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1.5 shrink-0">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest font-sans">SHORT:</span>
                    <span className="text-xs font-black text-rose-400 font-sans">{shortTrades.length}</span>
                    <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest ml-1 font-sans">WR:</span>
                    <span className="text-xs font-black text-rose-400 font-sans">%{shortWinRate.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                  {Object.entries(sessionBreakdown).map(([session, vals]) => {
                    const val = isRrMode ? vals.rr : vals.pnl;
                    if (val === 0) return null;

                    const isProfit = val > 0;
                    const isLoss = val < 0;

                    const textColorClass = isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-zinc-400";
                    const bgClass = isProfit ? "bg-emerald-500/10 border-emerald-500/20" : isLoss ? "bg-rose-500/10 border-rose-500/20" : "bg-zinc-500/10 border-zinc-500/20";
                    const labelClass = isProfit ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-zinc-400";

                    return (
                      <div key={session} className={`flex items-center justify-center gap-1 shrink-0 px-2 py-0.5 rounded-lg border leading-none ${bgClass}`}>
                        <span className={`heading-3 ${labelClass}`}>{session}:</span>
                        <span className={`text-[9px] font-black font-sans leading-none ${textColorClass}`}>
                          {isRrMode ? `${val > 0 ? "+" : ""}${val.toFixed(1)}R` : `${val > 0 ? "+" : ""}${val.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trades Table */}
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-xs font-sans whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                  <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                    <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80">
                      <th className="py-2 px-3 font-sans select-none w-[20%] min-w-[120px] text-left">Parite</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[11%] min-w-[65px]">Yön</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[11%] min-w-[65px]">RR</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[14%] min-w-[75px]">Session</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[14%] min-w-[75px]">Sonuç</th>
                      <th className="py-2 px-3 text-right font-sans select-none w-[16%] min-w-[95px]">
                        <div className="flex items-center justify-end w-full">Kâr/Zarar</div>
                      </th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[14%] min-w-[80px]">Platform</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {sortedTrades.slice(0, 100).map((t, idx) => {
                      const isWin = t.status === "WIN";
                      const isLoss = t.status === "LOSS";
                      const isBe = t.status === "BREAKEVEN";
                      let pnlText = "—";
                      let pnlColor = "text-zinc-400";
                      if (isBe) {
                        pnlText = `0.00 ${currency}`;
                        pnlColor = "text-zinc-500 font-bold";
                      } else {
                        const pnlValue = t.pnl || 0;
                        const prefix = pnlValue > 0 ? "+" : "";
                        pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                        pnlColor = pnlValue > 0 ? "text-emerald-400 font-bold" : (pnlValue < 0 ? "text-rose-400 font-bold" : "text-zinc-500 font-bold");
                      }

                      const dateObj = new Date(t.createdAt);
                      const formattedTime = dateObj.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
                      const formattedDate = dateObj.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

                      return (
                        <tr
                          key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                          onClick={() => setSelectedTrade(t)}
                          className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-800 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0 align-middle"
                        >
                          <td className="w-1/2 sm:w-[20%] sm:min-w-[120px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-sans sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-l-xl sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                              <span className="text-white font-bold text-xs sm:text-[10px]">{t.asset}</span>
                              <span className="text-[10px] sm:text-[10px] text-zinc-500 sm:text-zinc-400 transition-colors">
                                {formattedDate} • {formattedTime}
                              </span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex items-center justify-center w-full">
                              {t.type === "LONG" ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">LONG</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">SHORT</span>
                              )}
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                              <span className="sm:hidden heading-3 h-[10px]">RR</span>
                              <div className="flex items-center justify-center w-full h-[18px]">
                                {t.rr !== undefined && t.rr !== null && t.rr !== 0 ? (
                                  t.rr > 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">
                                      +{t.rr}R
                                    </span>
                                  ) : t.rr < 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">
                                      {t.rr}R
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">
                                      {t.rr}R
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded-md">—</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-1 px-2 text-center text-zinc-400 font-medium sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 w-[14%] min-w-[75px] align-middle">
                            <div className="flex items-center justify-center w-full">
                              <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-sans transition-colors whitespace-nowrap truncate">
                                {t.session || "Diğer"}
                              </span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[14%] sm:min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <div className="flex items-center justify-center w-full h-[18px]">
                              {isWin ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">WIN</span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">LOSS</span>
                              ) : isBe ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">BE</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">AÇIK</span>
                              )}
                            </div>
                          </td>
                          <td className={`w-full sm:w-[16%] sm:min-w-[95px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 max-sm:pt-3 max-sm:border-t max-sm:border-zinc-800/50 sm:py-1 align-middle`}>
                            <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end sm:h-[20px]">
                              <span className="text-sm sm:text-xs font-bold font-sans inline-flex items-center justify-end h-[20px] leading-none tracking-tight">{pnlText}</span>
                            </div>
                          </td>
                          <td className="w-full sm:w-[14%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-r-xl sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
                            <div className="sm:hidden">
                              <span className="heading-3">Platform</span>
                            </div>
                            <div className="flex items-center justify-center w-full">
                              {t.platform ? (
                                <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-sans transition-colors whitespace-nowrap truncate">
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
                    {sortedTrades.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">
                          Bu periyot için herhangi bir işlem bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        trades={sortedTrades}
        title={`${title} İşlem Raporu`}
        dateRangeText={title}
        currency={currency}
      />

      <TradeDetailModal
        key="trade-history-detail-modal"
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedTrade(null);
          onClose();
        }}
        onDelete={(id) => {
          if (onDelete) onDelete(id);
          setSelectedTrade(null);
          onClose();
        }}
        currency={currency}
        definitionTitles={definitionTitles}
      />
    </>,
    document.body
  );
});

TradeHistoryModal.displayName = "TradeHistoryModal";
