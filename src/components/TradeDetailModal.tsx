import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString, getTradeAccountCategory } from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { 


  X, Edit3, Trash2, Calendar, Clock, Target, 
  Maximize2, ExternalLink, Image as ImageIcon, FileText, 
  Activity, Layers, Monitor, ShieldCheck, AlertCircle,
  Download, Loader2, Trophy, TrendingDown, Minus, Zap, TrendingUp
} from "lucide-react";

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  currency: string;
  definitionTitles?: DefinitionTitles;
}

const TradeDetailModal = React.memo(function TradeDetailModal({ 
  trade, 
  onClose, 
  onEdit, 
  onDelete,
  currency,
  definitionTitles = DEFAULT_DEFINITION_TITLES
}: TradeDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  // Preserve displayedTrade so that content remains intact during exit animation when trade prop is cleared
  const [displayedTrade, setDisplayedTrade] = useState<Trade | null>(trade);

  useBodyScrollLock(!!(trade || displayedTrade));

  useEffect(() => {
    if (trade) {
      setDisplayedTrade(trade);
    }
  }, [trade]);

  const currentTrade = trade || displayedTrade;

  React.useEffect(() => {
    setImageError(false);
    const screenshot = trade?.screenshot || (!trade ? displayedTrade?.screenshot : undefined);
    if (!screenshot) {
      setResolvedImageUrl(null);
      setIsImageLoading(false);
      return;
    }
    
    setIsImageLoading(true);
    if (screenshot.includes('tradingview.com/x/')) {
      fetch(`/api/resolve-tv?url=${encodeURIComponent(screenshot)}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setResolvedImageUrl(data.url);
          else setResolvedImageUrl(screenshot);
        })
        .catch(() => setResolvedImageUrl(screenshot));
    } else {
      setResolvedImageUrl(screenshot);
    }
  }, [trade?.screenshot, displayedTrade?.screenshot]);

  const contentRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!contentRef.current) return;
    try {
      setIsDownloading(true);
      setIsExporting(true); // Triggers layout changes
      
      // Wait a moment for DOM to update with isExporting classes and base64 image
      // Ultimate Optimization: Use double requestAnimationFrame to wait for the exact moment the browser paints the new layout, 0ms idle time.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(contentRef.current, {
        backgroundColor: "#0a0a0c",
        pixelRatio: 2,
        // Removed cacheBust: true to prevent TradingView S3 403 Forbidden errors
        imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        filter: (node: HTMLElement) => {
          if (node.classList && node.classList.contains('no-export')) {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement("a");
      link.href = dataUrl;
      const dateStr = currentTrade?.createdAt ? new Date(currentTrade.createdAt).toISOString().split('T')[0] : 'export';
      link.download = `${(currentTrade?.asset || 'Trade').replace('/', '_')}_${dateStr}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Görsel oluşturulurken hata:", error);
      toast.error("Görsel oluşturulamadı. Harici URL'den gelen görseller (CORS) buna sebep olabilir.");
    } finally {
      setIsExporting(false);
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (trade) {
      setImageError(false);
      setShowDeleteConfirm(false);
    }
  }, [trade]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (trade) {
          onClose();
        }
      }
    };
    if (trade) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, showDeleteConfirm, trade]);

  if (!currentTrade) return null;

  const isWin = currentTrade.status === 'WIN';
  const isLoss = currentTrade.status === 'LOSS';
  const isBe = currentTrade.status === 'BREAKEVEN';
  const isOpen = (currentTrade.status as any) === 'OPEN';

  const pnlColorClass = isWin 
    ? 'text-emerald-400' 
    : isLoss 
      ? 'text-rose-400' 
      : 'text-zinc-400';

  const rrColorClass = currentTrade.rr !== undefined && currentTrade.rr !== null 
    ? currentTrade.rr > 0 ? 'text-emerald-400' : currentTrade.rr < 0 ? 'text-rose-400' : 'text-zinc-400'
    : 'text-zinc-600';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const pnlFormatted = currentTrade.pnl !== undefined && currentTrade.pnl !== null 
    ? `${currentTrade.pnl > 0 ? '+' : ''}${currentTrade.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    : `—`;

  const rrFormatted = currentTrade.rr !== undefined && currentTrade.rr !== null
    ? `${currentTrade.rr > 0 ? '+' : ''}${currentTrade.rr}R`
    : `—`;

  return createPortal(
    <>
      <AnimatePresence
        onExitComplete={() => {
          if (!trade) {
            setDisplayedTrade(null);
            setShowDeleteConfirm(false);
          }
        }}
      >
        {trade && (
          <motion.div 
            key="trade-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            
            onClick={onClose}
             className="will-change-[opacity] modal-overlay"
          >
            <motion.div 
              key="trade-detail-content"
              ref={contentRef}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                willChange: "transform, opacity", 
                ...(isExporting ? { margin: 0, padding: 0, boxShadow: 'none', borderRadius: 0, border: 'none', transform: 'none' } : {}) 
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-6xl modal-content relative ${
                isExporting 
                  ? 'h-auto max-h-none overflow-visible shadow-none rounded-none border-0 m-0 p-0 bg-[#0a0a0c]' 
                  : 'h-[92vh] sm:h-[88vh] max-h-[900px] overflow-hidden'
              }`}
            >
              {/* Header */}
              <div className="modal-header">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <div className="flex items-center gap-3">
                    <h2 className="heading-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <Activity size={16} />
                      </div>
                      {currentTrade.asset}
                    </h2>
                    <div className="flex gap-2">
                      <span className={`badge-base ${currentTrade.type === 'LONG' ? 'badge-win' : 'badge-loss'}`}>
                        {currentTrade.type}
                      </span>
                      <span className={`badge-base flex items-center gap-1.5 ${
                        isWin ? 'badge-win' : 
                        isLoss ? 'badge-loss' : 
                        isBe ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' :
                        'toggle-item-brand border border-blue-500/20'
                      }`}>
                        {isWin && <><Trophy size={12} className="mr-1"/> WIN</>}
                        {isLoss && <><TrendingDown size={12} className="mr-1"/> LOSS</>}
                        {isBe && <><Minus size={12} className="mr-1"/> BREAKEVEN</>}
                        {isOpen && <><Clock size={12} className="mr-1"/> OPEN</>}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-zinc-800"></div>
                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-sans">
                    <Calendar size={14} className="text-zinc-500"/>
                    {formatDate(currentTrade.createdAt)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 no-export">
                  <button
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                  >
                    <Edit3 size={16} />
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                  <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="btn-icon"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {/* Main Content Layout */}
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
                
                {/* Left Sidebar - Meta & Context (approx 35%) */}
                <div className={`w-full lg:w-[35%] bg-zinc-950/30 border-r border-zinc-800/60 p-5 space-y-8 shrink-0 ${isExporting ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Performance Summary */}
                  <section>
                    <h4 className="heading-2 mb-3">
                      <Activity size={12}/> FİNANSAL PERFORMANS
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-center">
                        <span className="heading-3 mb-1.5">NET KÂR / ZARAR</span>
                        <span className={`text-2xl font-bold ${pnlColorClass}`}>{pnlFormatted}</span>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="heading-3">RISK : REWARD</span>
                          {(currentTrade.stopPips !== undefined || currentTrade.tpPips !== undefined) && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              {currentTrade.stopPips ?? '-'}p / {currentTrade.tpPips ?? '-'}p
                            </span>
                          )}
                        </div>
                        <span className={`text-2xl font-bold ${rrColorClass}`}>{rrFormatted}</span>
                        {(currentTrade.stopPips !== undefined || currentTrade.tpPips !== undefined) && (
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
                            {currentTrade.stopPips !== undefined && (
                              <span className="text-rose-400 font-medium">Stop: {currentTrade.stopPips}p</span>
                            )}
                            {currentTrade.stopPips !== undefined && currentTrade.tpPips !== undefined && <span>•</span>}
                            {currentTrade.tpPips !== undefined && (
                              <span className="text-emerald-400 font-medium">TP: {currentTrade.tpPips}p</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Execution Context */}
                  {(() => {
                    const planLower = (currentTrade.planFidelity || "").toLowerCase();
                    const planColor = (planLower === "tam" || planLower.includes("uygun") || planLower.includes("sadık") || planLower.includes("a+"))
                      ? "text-emerald-400 font-bold"
                      : (planLower === "fomo" || planLower.includes("ihlal") || planLower.includes("disiplinsiz"))
                      ? "text-rose-400 font-bold"
                      : planLower ? "text-amber-400 font-bold" : undefined;

                    const trendLower = (currentTrade.trend || "").toLowerCase();
                    const trendColor = (trendLower.includes("reversal") || trendLower.includes("dönüş") || trendLower.includes("ters"))
                      ? "text-rose-400 font-bold"
                      : trendLower ? "text-emerald-400 font-bold" : undefined;

                    return (
                      <section>
                        <h4 className="heading-2 mb-3">
                          <Layers size={12}/> İŞLEM BAĞLAMI
                        </h4>
                        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
                          {/* 1. PLATFORM & HESAP TÜRÜ */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.platforms) || "PLATFORM").toUpperCase()} 
                            value={
                              currentTrade.platform ? (() => {
                                const cat = getTradeAccountCategory(currentTrade);
                                const catClass = cat === 'FUNDED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : cat === 'CHALLENGE'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                                return (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span>{currentTrade.platform}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase border ${catClass}`}>
                                      {cat}
                                    </span>
                                  </span>
                                );
                              })() : undefined
                            } 
                            icon={<Monitor size={14} className="text-zinc-400"/>} 
                          />
                          {/* 2. LIQUIDITY SWEEP */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.liquiditySweeps || definitionTitles.concepts) || "LIQUIDITY SWEEP").toUpperCase()} 
                            value={
                              currentTrade.liquiditySweeps && currentTrade.liquiditySweeps.length > 0
                                ? currentTrade.liquiditySweeps.join(", ")
                                : (currentTrade.liquiditySweep || currentTrade.concept)
                            } 
                            icon={<Target size={14} className="text-amber-400"/>} 
                          />
                          {/* 3. SESSION */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.sessions) || "SESSION").toUpperCase()} 
                            value={currentTrade.session} 
                            icon={<Clock size={14} className="text-purple-400"/>} 
                          />
                          {/* 4. TIMEFRAME */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.htfTimeframes) || "TIMEFRAME").toUpperCase()} 
                            value={currentTrade.htfTimeframe} 
                            icon={<Maximize2 size={14} className="text-rose-400"/>} 
                          />
                          {/* 5. PD ARRAY */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.confirmations) || "PD ARRAY").toUpperCase()} 
                            value={currentTrade.confirmations && currentTrade.confirmations.length > 0 
                              ? currentTrade.confirmations.map(c => String(c).toLocaleUpperCase('tr-TR')).join(", ") 
                              : undefined} 
                            icon={<Layers size={14} className="text-emerald-400"/>} 
                          />
                          {/* 6. ENTRY TIMEFRAME */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.timeframes) || "ENTRY TIMEFRAME").toUpperCase()} 
                            value={currentTrade.timeframe} 
                            icon={<Target size={14} className="text-blue-400"/>} 
                          />
                          {/* 7. ENTRY MODEL */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.entryModels) || "ENTRY MODEL").toUpperCase()} 
                            value={Array.isArray(currentTrade.entryModels) && currentTrade.entryModels.length > 0 
                              ? currentTrade.entryModels.map(e => String(e).toLocaleUpperCase('tr-TR')).join(", ") 
                              : currentTrade.entry ? String(currentTrade.entry).toLocaleUpperCase('tr-TR') : undefined} 
                            icon={<Zap size={14} className="text-amber-400"/>} 
                          />
                          {/* 8. TREND YAPISI */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.trendTypes) || "TREND YAPISI").toUpperCase()} 
                            value={currentTrade.trend} 
                            icon={<TrendingUp size={14} className="text-emerald-400"/>} 
                            valueColor={trendColor}
                          />
                          {/* 9. SETUP KALİTESİ */}
                          <ContextRow 
                            label={(cleanDefinitionTitleString(definitionTitles.planFidelities) || "SETUP KALİTESİ").toUpperCase()} 
                            value={currentTrade.planFidelity} 
                            icon={<ShieldCheck size={14} className="text-blue-400"/>} 
                            valueColor={planColor}
                          />
                        </div>
                      </section>
                    );
                  })()}

                </div>

                {/* Right Panel - Chart & Notes (approx 65%) */}
                <div className={`w-full lg:w-[65%] min-w-0 bg-[#0a0a0c] flex flex-col p-5 space-y-2.5 min-h-0 ${isExporting ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Technical Chart */}
                  <section className="flex-shrink-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="heading-2">
                        <ImageIcon size={12}/> TEKNİK ANALİZ GÖRSELİ
                      </h4>
                      {currentTrade.screenshot && !imageError && (
                        <a href={currentTrade.screenshot} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans uppercase font-bold bg-blue-500/10 px-2.5 py-1 rounded-md transition-colors">
                          Tam Boyut <ExternalLink size={10}/>
                        </a>
                      )}
                    </div>
                    
                    <div className={`bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden relative group w-full flex items-center justify-center p-2 ${
                      isExporting 
                        ? 'h-auto max-h-none' 
                        : currentTrade.screenshot 
                          ? 'min-h-[280px] max-h-[520px]' 
                          : 'h-[220px] sm:h-[260px]'
                    }`}>
                    {currentTrade.screenshot ? (
                      <>
                        {/* Consistent Loading Overlay - Prevents container shrinking/jumping */}
                        {isImageLoading && !imageError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-950/60 backdrop-blur-sm z-10">
                            <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin mb-3"></div>
                            <p className="text-xs text-zinc-400 font-sans">
                              {currentTrade.screenshot.includes('tradingview.com/x/') && !resolvedImageUrl
                                ? 'Görsel çözümleniyor...'
                                : 'Görsel yükleniyor...'}
                            </p>
                          </div>
                        )}

                        {imageError ? (
                          <div className="flex flex-col items-center justify-center p-10 text-center text-rose-400 h-full">
                            <AlertCircle size={32} className="mb-3 opacity-50" />
                            <p className="text-sm font-bold font-sans">Görsel yüklenemedi</p>
                            <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed font-sans">
                              URL geçersiz, erişim engellendi veya çapraz köken (CORS) politikası tarafından engellendi.
                            </p>
                          </div>
                        ) : resolvedImageUrl ? (
                          <img 
                            src={resolvedImageUrl} 
                            alt="Trading chart" 
                            className={`w-auto h-auto max-w-full max-h-[500px] object-contain rounded-lg transition-opacity duration-200 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onLoad={() => {
                              setIsImageLoading(false);
                              setImageError(false);
                            }}
                            onError={() => {
                              setImageError(true);
                              setIsImageLoading(false);
                            }}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-600 min-h-[300px]">
                        <Monitor size={40} className="mb-4 opacity-20" />
                        <p className="text-sm font-bold font-sans text-zinc-400">Ekran görüntüsü bulunmuyor</p>
                        <p className="text-xs text-zinc-500 mt-2 font-sans max-w-xs">Bu işlem için bir teknik analiz grafiği eklenmemiş.</p>
                        <button onClick={() => { onEdit(currentTrade); onClose(); }} className="mt-4 text-xs font-sans font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-colors uppercase cursor-pointer">
                          Görsel Ekle
                        </button>
                      </div>
                    )}
                    </div>
                  </section>

                  {/* Trading Journal / Notes */}
                  <section className="flex-1 flex flex-col min-h-0">
                    <h4 className="heading-2 mb-2 shrink-0">
                      <FileText size={12}/> GİRİŞ VE ANALİZ NOTLARI
                    </h4>
                    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex-1 min-h-[110px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                      {currentTrade.notes ? (
                        <p className="text-zinc-200 text-sm sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words font-sans">
                          {currentTrade.notes}
                        </p>
                      ) : (
                        <div className="flex items-center justify-center h-full text-zinc-600 text-xs italic">
                          Bu işlem için herhangi bir not girilmemiş.
                        </div>
                      )}
                    </div>
                  </section>

                </div>
              </div>
              
              {/* Mobile Actions Footer */}
              <div className="sm:hidden flex items-center gap-2 p-4 border-t border-zinc-800/80 bg-zinc-950/80 shrink-0 no-export">
                 <button
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 flex-1"
                  >
                    <Edit3 size={16} />
                  </button>
                 {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 flex-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 flex-1 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && currentTrade && (
          <motion.div
            key="trade-delete-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="will-change-[opacity] fixed inset-0 z-[4500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              key="trade-delete-confirm-content"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: "transform, opacity" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-white uppercase text-center mb-2 font-sans">
                İşlemi Sil
              </h3>
              <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed font-sans">
                <span className="font-semibold text-zinc-200">{currentTrade.asset}</span> <span className="text-zinc-300 font-bold">{currentTrade.type}</span> pozisyonunu kalıcı olarak silmek istediğinize emin misiniz?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-zinc-800 text-white text-xs font-bold uppercase rounded-xl transition-colors hover:bg-zinc-700 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete && currentTrade) {
                      onDelete(currentTrade.id);
                      setShowDeleteConfirm(false);
                      onClose();
                    }
                  }}
                  className="flex-1 py-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase rounded-xl transition-colors hover:bg-rose-500/30 cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
});

// Helper component for Context rows
function ContextRow({ 
  label, 
  value, 
  icon, 
  valueColor 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ReactNode; 
  valueColor?: string;
}) {
  const displayValue = value !== undefined && value !== null ? value : '—';
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/20 hover:bg-zinc-900/80 transition-colors">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-[10px] font-extrabold uppercase tracking-widest font-sans">{label}</span>
      </div>
      <div className={`text-xs font-bold font-sans text-right uppercase ${valueColor || 'text-zinc-300'}`}>
        {typeof displayValue === 'string' ? displayValue.toLocaleUpperCase('tr-TR') : displayValue}
      </div>
    </div>
  );
}

export default TradeDetailModal;
