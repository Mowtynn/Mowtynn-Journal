import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, X, ShieldCheck, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuditReportModal } from "./AuditReportModal";
import { Trade } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';



interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  title: string;
  dateRangeText: string;
  currency: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  trades,
  title,
  dateRangeText,
  currency,
}) => {
  useBodyScrollLock(isOpen);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Preserve displayed state so that content remains intact during exit animation when props are cleared
  const [displayedTrades, setDisplayedTrades] = useState<Trade[]>(trades);
  const [displayedTitle, setDisplayedTitle] = useState<string>(title);
  const [displayedDateRangeText, setDisplayedDateRangeText] = useState<string>(dateRangeText);

  useEffect(() => {
    if (isOpen) {
      setDisplayedTrades(trades);
      setDisplayedTitle(title);
      setDisplayedDateRangeText(dateRangeText);
    }
  }, [isOpen, trades, title, dateRangeText]);

  const activeTrades = isOpen ? trades : displayedTrades;
  const activeTitle = isOpen ? title : displayedTitle;
  const activeDateRangeText = isOpen ? dateRangeText : displayedDateRangeText;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // 1. Calculations
  const totalTrades = activeTrades.length;
  const wins = activeTrades.filter((t) => t.status === 'WIN').length;
  const losses = activeTrades.filter((t) => t.status === 'LOSS').length;
  const breakevens = activeTrades.filter((t) => t.status === 'BREAKEVEN').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnl = activeTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalR = activeTrades.reduce((sum, t) => sum + (t.rr || 0), 0);
  const longs = activeTrades.filter((t) => t.type === 'LONG').length;
  const shorts = activeTrades.filter((t) => t.type === 'SHORT').length;

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    try {
      setIsGenerating(true);
      // Wait a moment for DOM to update with isGenerating classes and base64 images
      // Ultimate Optimization: Use double requestAnimationFrame to wait for the exact moment the browser paints the new layout, 0ms idle time.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(reportRef.current, {
        backgroundColor: "#09090b",
        pixelRatio: 2,
        imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        filter: (node) => {
          if (node.classList && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement("a");
      link.download = `${activeTitle.toLowerCase().replace(/\s+/g, '_')}_islem_raporu.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Rapor başarıyla indirildi.");
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error("Rapor oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!isOpen) {
          setDisplayedTrades([]);
        }
      }}
    >
      {isOpen && (
        <motion.div
          key="print-report-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="will-change-[opacity] fixed inset-0 z-[3500] overflow-y-auto bg-zinc-950/80 no-print flex flex-col justify-start items-center p-4 md:p-8"
          onClick={onClose}
        >
        {isGenerating && (
          <div className="fixed inset-0 bg-zinc-950/95 z-[3600] flex flex-col items-center justify-center text-zinc-100 font-medium no-print">
            <div className="p-5 bg-zinc-900 text-white rounded-3xl flex flex-col items-center gap-4 shadow-2xl max-w-sm text-center border border-white/10">
              <RefreshCw size={32} className="animate-spin text-blue-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wider text-white">GÖRÜNTÜ HAZIRLANIYOR</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-medium">
                  İşlem verileri okunuyor ve yüksek çözünürlüklü görüntü oluşturuluyor. Lütfen pencereyi kapatmayın...
                </p>
              </div>
            </div>
          </div>
        )}
        <motion.div
          key="print-report-modal-content"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: "transform, opacity" }}
          className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl flex flex-col relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="modal-header">
            <h2 className="heading-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <FileText size={16} />
              </div>
              İşlem Raporu
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20"
              >
                <ShieldCheck size={16} />
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              </button>
              <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          
          {/* Paper Frame */}
          <div className={`w-full bg-zinc-950/40 text-zinc-100 ${isGenerating ? "h-auto overflow-visible" : "h-[75vh] overflow-y-auto overflow-x-hidden"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
            
            {/* START OF PRINT REPORT WRAPPER */}
            <div id="print-report-root" ref={reportRef} className={`w-full min-h-full text-zinc-100 select-text p-6 md:p-8 relative mx-auto bg-[#09090b] ${isGenerating ? "overflow-visible min-w-[1024px]" : "overflow-hidden"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
              
              <div className="relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Header Branding Section */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/10 pb-6 mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-sans">Kurumsal Performans Raporu</h3>
                    <h1 className="text-3xl font-black text-white tracking-tight">{activeTitle}</h1>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[10px] text-zinc-400 font-medium">
                        <span className="text-zinc-500">İşlem Tarihleri:</span> <span className="text-zinc-300 font-semibold">{activeDateRangeText}</span>
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        <span className="text-zinc-500">Oluşturulma Tarihi:</span> <span className="text-zinc-300 font-semibold">{new Date().toLocaleDateString('tr-TR')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <div className="text-lg font-black tracking-tight text-white flex items-center justify-end">
                      Trading Journal <span className="text-blue-500 ml-1">by Mowtynn</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-widest">
                      Gelişmiş İşlem Takip ve Analiz Sistemi
                    </p>
                  </div>
                </div>

                {/* Grid Metric Cards Dashboard Block */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Total Trades Card */}
                  <div className="border border-blue-500/20 bg-gradient-to-b from-blue-500/10 to-zinc-900/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-lg relative overflow-hidden">
                    <span className="text-[10px] font-bold tracking-wider text-blue-400/90 font-sans uppercase">TOPLAM İŞLEM</span>
                    <span className="text-3xl font-black drop-shadow-sm text-blue-400 font-sans tracking-tight">{totalTrades}</span>
                    <div className="text-[11px] text-zinc-400 font-medium mt-1">
                      <span className="text-emerald-400 font-bold">{longs} L</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-rose-400 font-bold">{shorts} S</span>
                    </div>
                  </div>
                  {/* Win Rate Card */}
                  <div className="border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-zinc-900/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-lg relative overflow-hidden">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400/90 font-sans uppercase">KAZANMA ORANI</span>
                    <span className={`text-3xl font-black drop-shadow-sm font-sans tracking-tight ${winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{winRate.toFixed(1)}%</span>
                    <div className="text-[11px] text-zinc-400 font-medium mt-1">
                      <span className="text-emerald-400 font-bold">{wins} W</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-rose-400 font-bold">{losses} L</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-amber-400 font-bold">{breakevens} BE</span>
                    </div>
                  </div>
                  {/* Net Profit Card */}
                  <div className="border border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-zinc-900/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-lg relative overflow-hidden">
                    <span className="text-[10px] font-bold tracking-wider text-purple-400/90 font-sans uppercase">NET KÂR / ZARAR</span>
                    <span className={`text-3xl font-black drop-shadow-sm font-sans tracking-tight ${totalPnl >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>{totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                    <span className="text-[11px] text-zinc-400 font-medium mt-1">Toplam Kazanç</span>
                  </div>
                  {/* Net R multiple Card */}
                  <div className="border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-zinc-900/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-lg relative overflow-hidden">
                    <span className="text-[10px] font-bold tracking-wider text-amber-400/90 font-sans uppercase">NET R KAZANIMI</span>
                    <span className={`text-3xl font-black drop-shadow-sm font-sans tracking-tight ${totalR >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {totalR >= 0 ? '+' : ''}
                      {totalR.toFixed(2)} R
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium mt-1">Toplam R</span>
                  </div>
                </div>

              {/* Transactions Table Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
                    İŞLEM GEÇMİŞİ
                  </h4>
                  <div className="text-[10px] font-medium text-zinc-500 font-sans tracking-wider">
                    Toplam <strong className="text-zinc-300">{trades.length}</strong> işlem
                  </div>
                </div>
                
                <div className={`bg-zinc-900/60 border border-white/10 rounded-2xl p-2 sm:p-3 shadow-inner ${isGenerating ? 'overflow-visible' : 'overflow-hidden'} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
                  <table className="w-full text-left border-collapse text-[10px] font-sans">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[9px] text-zinc-400 uppercase tracking-widest font-sans select-none">
                        <th className="py-2.5 px-3 text-left font-bold font-sans">TARİH</th>
                        <th className="py-2.5 px-2 text-left font-bold font-sans">PARİTE</th>
                        <th className="py-2.5 px-2 text-center font-bold font-sans">YÖN</th>
                        <th className="py-2.5 px-2 text-center font-bold font-sans">SONUÇ</th>
                        <th className="py-2.5 px-2 text-center font-bold font-sans">R</th>
                        <th className="py-2.5 px-3 text-right font-bold font-sans">KÂR / ZARAR</th>
                        <th className="py-2.5 px-3 text-right font-bold font-sans">PLATFORM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">
                            Seçili tarih aralığında kaydedilmiş herhangi bir işlem bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        trades.map((trade) => {
                          const dateObj = new Date(trade.createdAt);
                          const dateStr = dateObj.toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          });
                          
                          const isWin = trade.status === 'WIN';
                          const isLoss = trade.status === 'LOSS';
                          const isBe = trade.status === 'BREAKEVEN';
                          
                          return (
                            <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                              {/* Date */}
                              <td className="py-2.5 px-3 text-zinc-300 font-medium font-sans whitespace-nowrap">
                                {dateStr}
                              </td>
                              
                              {/* Asset */}
                              <td className="py-2.5 px-2 font-bold text-white uppercase tracking-wide">
                                <div className="flex flex-col gap-0.5">
                                  <span>{trade.asset}</span>
                                  {((trade.entryModels && Array.isArray(trade.entryModels) && trade.entryModels.length > 0) || trade.entry) && (
                                    <div className="flex items-center gap-1 font-sans text-[8px] font-normal tracking-normal flex-wrap">
                                      {(trade.entryModels && Array.isArray(trade.entryModels) && trade.entryModels.length > 0) ? (
                                        trade.entryModels.map((em, idx) => (
                                          <span key={idx} className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold uppercase">
                                            {em}
                                          </span>
                                        ))
                                      ) : trade.entry ? (
                                        <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold uppercase">
                                          {trade.entry}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Direction (Yön) */}
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                {trade.type === 'LONG' ? (
                                  <span className="inline-flex items-center justify-center min-w-[50px] px-2.5 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-400 uppercase tracking-wider font-sans">LONG</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center min-w-[50px] px-2.5 py-0.5 rounded-md border border-rose-500/20 bg-rose-500/10 text-[10px] font-black text-rose-400 uppercase tracking-wider font-sans">SHORT</span>
                                )}
                              </td>

                              {/* Result Status */}
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                {isWin ? (
                                  <span className="inline-flex items-center justify-center min-w-[45px] px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-400 uppercase tracking-wider font-sans">WIN</span>
                                ) : isLoss ? (
                                  <span className="inline-flex items-center justify-center min-w-[45px] px-2 py-0.5 rounded-md border border-rose-500/20 bg-rose-500/10 text-[10px] font-black text-rose-400 uppercase tracking-wider font-sans">LOSS</span>
                                ) : isBe ? (
                                  <span className="inline-flex items-center justify-center min-w-[45px] px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-400 uppercase tracking-wider font-sans">BE</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center min-w-[45px] px-2 py-0.5 rounded-md border border-blue-500/20 bg-blue-500/10 text-[10px] font-black text-blue-400 uppercase tracking-wider font-sans">AÇIK</span>
                                )}
                              </td>

                              {/* R multiple */}
                              <td className="py-2.5 px-2 text-center font-sans font-bold whitespace-nowrap">
                                {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
                                  trade.rr > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-400 tracking-wider font-sans">+{trade.rr}R</span>
                                  ) : trade.rr < 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-md border border-rose-500/20 bg-rose-500/10 text-[10px] font-black text-rose-400 tracking-wider font-sans">{trade.rr}R</span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-400 tracking-wider font-sans">{trade.rr}R</span>
                                  )
                                ) : (
                                  <span className="text-zinc-600 font-sans">—</span>
                                )}
                              </td>

                              {/* Profit and Loss */}
                              <td className="py-2.5 px-3 text-right font-sans font-bold whitespace-nowrap">
                                <span
                                  className={
                                    isWin
                                      ? 'text-emerald-400 font-bold'
                                      : isLoss
                                      ? 'text-rose-400 font-bold'
                                      : 'text-zinc-400 font-bold'
                                  }
                                >
                                  {isBe ? (
                                    `0.00 ${currency}`
                                  ) : (
                                    <>
                                      {trade.pnl > 0 ? '+' : ''}
                                      {(trade.pnl || 0).toLocaleString()} {currency}
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Platform */}
                              <td className="py-2.5 px-3 text-right text-zinc-400 font-medium uppercase font-sans tracking-wider">
                                {trade.platform ? (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[9px] font-bold uppercase font-sans">
                                    {trade.platform}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quality Guarantee/Report Footer Info */}
              <div className="border-t border-white/10 pt-3 mt-6 flex flex-col sm:flex-row justify-between items-center text-[9px] text-zinc-500 font-medium">
                <div>
                  © {new Date().getFullYear()} Trading Journal by Mowtynn. Bu rapor otomatik oluşturulmuştur.
                </div>
                <div className="mt-1 sm:mt-0 italic">
                  Rapor Güvenliği Kod No: #{Math.random().toString(36).substring(2, 8).toUpperCase()}
                </div>
              </div>
              
              </div> {/* END OF RELATIVE Z-10 */}
            </div>
            {/* END OF PRINT REPORT WRAPPER */}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )}
      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        trades={trades}
        dateRangeText={dateRangeText}
      />
    </>
  );
};
