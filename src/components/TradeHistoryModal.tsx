import { RBadge, TrendBadge } from "./tradeList/TradeBadges";
import { MODAL_BACKDROP, MODAL_PANEL, POPOVER } from '../lib/motion';
import { formatR } from '../lib/format';
import { smartUpper, getTradeAccountCategory, getTradeAccountName, ACCOUNT_CATEGORY_BADGE } from '../constants/constants';
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Download, X, FileSpreadsheet, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Trade, DefinitionTitles } from "../types";
import { PrintReportModal } from "./PrintReportModal";
import TradeDetailModal from "./TradeDetailModal";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { exportTradesToExcel, exportTradesToCSV } from "../utils/exportTrades";
import { localDateKey } from '../utils/math';

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  trades: Trade[];
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
  onEdit,
  onDelete,
  definitionTitles
}) => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormatTab, setExportFormatTab] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isExportOpen]);

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
          // Açık işlem detayı kendi Escape'ini yönetir
          return;
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

  const netR = sortedTrades.reduce((acc, t) => acc + (typeof t.rr === "number" && Number.isFinite(t.rr) ? t.rr : 0), 0);
  const netRShown = Math.abs(netR) < 1e-9 ? 0 : netR;

  const sessionBreakdown = React.useMemo(() => {
    return sortedTrades.reduce((acc, t) => {
      const s = t.session || "Belirtilmemiş";
      if (!acc[s]) acc[s] = { rr: 0 };
      acc[s].rr += t.rr || 0;
      return acc;
    }, {} as Record<string, { rr: number }>);
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
            {...MODAL_BACKDROP}
            className="fixed inset-0 modal-layer modal-dim z-[1500] flex items-center justify-center p-4 "
            onClick={onClose}
          >
            <motion.div
              key="trade-history-modal-content"
              {...MODAL_PANEL}
              className="w-full max-w-4xl h-[80vh] sm:h-[620px] max-h-[85vh] min-h-0 sm:min-h-[420px] flex flex-col bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header — diğer pencerelerle aynı: simge kutusu + başlık, sağda eylemler */}
              <div className="modal-header gap-2 px-3 sm:px-5 relative z-30 shrink-0">
                <h2 className="heading-1 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    {activeIcon || <CalendarIcon size={16} />}
                  </div>
                  <span className="min-w-0 truncate">
                    İşlem Geçmişi
                    {activeTitle && <span className="text-zinc-500 font-semibold"> · {activeTitle}</span>}
                  </span>
                </h2>
                <div className="flex items-center gap-2 relative" ref={exportRef}>
                  <button aria-label="İndir"
                    type="button"
                    aria-expanded={isExportOpen}
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className={`btn-icon w-8 h-8 sm:w-9 sm:h-9 ${
                      isExportOpen
                        ? '!text-blue-300 !bg-blue-500/20 !border-blue-500/40'
                        : '!text-blue-400 !bg-blue-500/10 !border-blue-500/25'
                    }`}
                  >
                    <Download size={16} />
                  </button>

                  <AnimatePresence>
                    {isExportOpen && (
                      <motion.div
                        key="modal-export-dropdown"
                        {...POPOVER}
                        className="origin-top-right absolute right-0 top-[calc(100%+8px)] w-[290px] max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-[60] p-2 overflow-hidden"
                      >
                        {/* Format Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 mb-2">
                          <button
                            type="button"
                            onClick={() => setExportFormatTab('excel')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                              exportFormatTab === 'excel'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                            }`}
                          >
                            <FileSpreadsheet size={12} className={exportFormatTab === 'excel' ? 'text-emerald-400' : 'text-zinc-500'} />
                            <span>EXCEL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExportFormatTab('csv')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                              exportFormatTab === 'csv'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                            }`}
                          >
                            <FileText size={12} className={exportFormatTab === 'csv' ? 'text-blue-400' : 'text-zinc-500'} />
                            <span>CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExportFormatTab('pdf')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-ui flex items-center justify-center gap-1.5 cursor-pointer border ${
                              exportFormatTab === 'pdf'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
                            }`}
                          >
                            <Download size={12} className={exportFormatTab === 'pdf' ? 'text-blue-400' : 'text-zinc-500'} />
                            <span>PDF</span>
                          </button>
                        </div>

                        {exportFormatTab === 'excel' && (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const dateStr = localDateKey();
                                  void toast.promise(exportTradesToExcel(sortedTrades, `Islem_Gecmisi_${(activeTitle || 'Rapor').replace(/\s+/g, '_')}_${dateStr}`, {
                                    title: `${activeTitle} İşlem Geçmişi`,
                                    definitionTitles: definitionTitles as any
                                  }), {
                                    loading: 'Excel hazırlanıyor…',
                                    success: `Excel tablosu (.xlsx) indirildi (${sortedTrades.length} işlem).`,
                                    error: (e) => e?.message || 'Excel dosyası oluşturulamadı.',
                                  });
                                  setIsExportOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || 'Hata oluştu.');
                                }
                              }}
                              className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-emerald-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet size={13} className="text-emerald-400" />
                                <span>Bu Listedeki İşlemleri İndir</span>
                              </div>
                              <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {sortedTrades.length} İşlem
                              </span>
                            </button>
                          </div>
                        )}

                        {exportFormatTab === 'csv' && (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const dateStr = localDateKey();
                                  exportTradesToCSV(sortedTrades, `Islem_Gecmisi_${(activeTitle || 'Rapor').replace(/\s+/g, '_')}_${dateStr}`, {
                                    title: `${activeTitle} İşlem Geçmişi`,
                                    definitionTitles: definitionTitles as any
                                  });
                                  toast.success(`CSV dosyası (.csv) indirildi (${sortedTrades.length} işlem).`);
                                  setIsExportOpen(false);
                                } catch (e: any) {
                                  toast.error(e?.message || 'Hata oluştu.');
                                }
                              }}
                              className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <FileText size={13} className="text-blue-400" />
                                <span>Bu Listedeki İşlemleri İndir</span>
                              </div>
                              <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {sortedTrades.length} İşlem
                              </span>
                            </button>
                          </div>
                        )}

                        {exportFormatTab === 'pdf' && (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsPrintModalOpen(true);
                                setIsExportOpen(false);
                              }}
                              className="w-full px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-blue-300 font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <Download size={13} className="text-blue-400" />
                                <span>PDF Rapor Önizleme & Yazdır</span>
                              </div>
                              <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {sortedTrades.length} İşlem
                              </span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button aria-label="Kapat"
                    type="button"
                    onClick={onClose}
                    className="btn-icon w-8 h-8 sm:w-9 sm:h-9"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Sub-Header Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 sm:px-4 bg-zinc-950/60 border-b border-zinc-800/80 shrink-0 select-none w-full relative z-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 rounded-lg px-2 py-1 shrink-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">Toplam:</span>
                    <span className="text-[10px] font-black text-zinc-100 font-sans leading-none">{totalCount}</span>
                    <span className="text-[9px] text-zinc-700 font-bold mx-0.5 leading-none">|</span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">Net:</span>
                    <span className={`text-[10px] font-black font-sans leading-none ${netRShown > 0 ? "text-emerald-400" : netRShown < 0 ? "text-rose-400" : "text-zinc-300"}`}>{formatR(netRShown)}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 rounded-lg px-2 py-1 shrink-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">Long:</span>
                    <span className="text-[10px] font-black text-emerald-400 font-sans leading-none">{longTrades.length}</span>
                    <span className="text-[9px] text-zinc-700 font-bold mx-0.5 leading-none">|</span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">WR:</span>
                    <span className="text-[10px] font-black text-zinc-100 font-sans leading-none">{longTrades.length ? `%${longWinRate.toFixed(1)}` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 rounded-lg px-2 py-1 shrink-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">Short:</span>
                    <span className="text-[10px] font-black text-rose-400 font-sans leading-none">{shortTrades.length}</span>
                    <span className="text-[9px] text-zinc-700 font-bold mx-0.5 leading-none">|</span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">WR:</span>
                    <span className="text-[10px] font-black text-zinc-100 font-sans leading-none">{shortTrades.length ? `%${shortWinRate.toFixed(1)}` : "—"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                  {Object.entries(sessionBreakdown).map(([session, vals]) => {
                    const val = vals.rr;
                    if (Math.abs(val) < 1e-9) return null;

                    const valueColor = val > 1e-9 ? "text-emerald-400" : val < -1e-9 ? "text-rose-400" : "text-zinc-300";

                    return (
                      <div key={session} className="flex items-center justify-center gap-1 shrink-0 px-2 py-1 rounded-lg border border-zinc-800/80 bg-zinc-900 leading-none">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-sans leading-none">{session}:</span>
                        <span className={`text-[10px] font-black font-sans leading-none ${valueColor}`}>
                          {formatR(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trades Table */}
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                <table className="trade-table w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-xs font-sans whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                  <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                    <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800/80">
                      <th className="py-2 px-3 font-sans select-none w-[17%] min-w-[120px] text-center">Parite</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[10%] min-w-[65px]">Yön</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[10%] min-w-[65px]">R</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[13%] min-w-[75px]">Session</th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[15%] min-w-[110px]">İşlem Tipi</th>
                      <th className="py-2 px-3 text-center font-sans select-none w-[13%] min-w-[80px]">
                        <div className="flex items-center justify-center w-full">Risk</div>
                      </th>
                      <th className="py-2 px-2 text-center font-sans select-none w-[22%] min-w-[80px]">Hesap</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {sortedTrades.slice(0, 100).map((t, idx) => {
                      const pnlText = typeof t.riskPct === "number" ? `%${t.riskPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—";
                      const pnlColor = "text-zinc-300 font-bold";

                      return (
                        <tr
                          key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                          onClick={() => setSelectedTrade(t)}
                          className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-800 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0 align-middle"
                        >
                          <td className="w-1/2 sm:w-[17%] sm:min-w-[120px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-sans sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-l-xl sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex items-center sm:justify-center sm:w-full">
                              <span className="text-white font-black text-sm sm:text-[13px] tracking-wide leading-none">{t.asset}</span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[10%] sm:min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                            <div className="flex items-center justify-center w-full">
                              {t.type === "LONG" ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">LONG</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-sans transition-colors">SHORT</span>
                              )}
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[10%] sm:min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                              <span className="sm:hidden heading-3 h-[10px]">R</span>
                              <div className="flex items-center justify-center w-full h-[18px]">
                                <RBadge rr={t.rr} />
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-1 px-2 text-center text-zinc-400 font-medium sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 w-[13%] min-w-[75px] align-middle">
                            <div className="flex items-center justify-center w-full">
                              <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-sans transition-colors whitespace-nowrap truncate">
                                {t.session ? t.session : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[15%] sm:min-w-[110px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                            <span className="sm:hidden heading-3 mr-2">İşlem Tipi</span>
                            <div className="flex items-center justify-end sm:justify-center w-full h-[20px] min-w-0">
                              <TrendBadge trend={t.trend} />
                            </div>
                          </td>
                          <td className={`w-full sm:w-[13%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right sm:text-center ${pnlColor} sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 max-sm:pt-3 max-sm:border-t max-sm:border-zinc-800/50 sm:py-1 align-middle`}>
                            <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">{smartUpper("Risk")}</span>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-center sm:h-[20px]">
                              <span className="text-sm sm:text-xs font-bold font-sans inline-flex items-center justify-center h-[20px] leading-none tracking-tight">{pnlText}</span>
                            </div>
                          </td>
                          <td className="w-full sm:w-[22%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-r-xl sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
                            <div className="sm:hidden trade-mobile-only">
                              <span className="heading-3">Hesap</span>
                            </div>
                            <div className="flex items-center justify-center w-full">
                              <span className={`inline-block min-w-[54px] max-w-full h-[20px] leading-[18px] px-2.5 py-0 text-center text-[10px] font-bold border rounded-full uppercase tracking-wider font-sans transition-colors whitespace-nowrap truncate ${ACCOUNT_CATEGORY_BADGE[getTradeAccountCategory(t)]}`}>
                                {getTradeAccountName(t)}
                              </span>
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
      />

      <TradeDetailModal
        key="trade-history-detail-modal"
        trade={selectedTrade}
        navList={sortedTrades}
        onNavigate={setSelectedTrade}
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
        definitionTitles={definitionTitles}
      />
    </>,
    document.body
  );
});

TradeHistoryModal.displayName = "TradeHistoryModal";
