import { MODAL_BACKDROP, MODAL_PANEL } from '../lib/motion';

/** İşlemler arası geçiş eğrisi: expo'dan daha yumuşak başlayan, uzun süzülen bir yavaşlama */
const SOFT_EASE: [number, number, number, number] = [0.25, 0.8, 0.3, 1];
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, animate } from "motion/react";
import toast from "react-hot-toast";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString, getTradeAccountCategory, getTradeStageLabel, ACCOUNT_CATEGORY_LABELS, getNewsDayLabels, smartUpper } from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { resolveChartImage } from "../lib/chartLink";
import { 


  X, Edit3, Trash2, Calendar, Clock, Target, 
  Maximize2, ExternalLink, Image as ImageIcon, FileText, 
  Activity, Layers, Monitor, ShieldCheck, AlertCircle,
  Download, Loader2, Trophy, TrendingDown, Minus, Zap, TrendingUp,
  Flag, Scale, PenLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { setupQualityTier } from "../lib/discipline";
import { useAllTrades } from "../lib/allTradesContext";
import { nyWallDate, nyDateKey } from "../lib/tradingTime";
import { computeTradeInsight } from "../lib/tradeInsight";
import { ResultPanel, PricePathPanel, hasPricePathContent, SetupHistoryPanel, RuleBadges, formatR } from "./tradeDetail/TradeInsightPanels";

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  definitionTitles?: DefinitionTitles;
  /** Gezinme listesi (ekranda görünen sırayla); verilirse ← / → ile işlemler arası geçilir */
  navList?: Trade[] | null;
  onNavigate?: (trade: Trade) => void;
}

const TradeDetailModal = React.memo(function TradeDetailModal({ 
  trade, 
  onClose, 
  onEdit, 
  onDelete,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  navList,
  onNavigate,
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
  // Tam geçmiş (App'ten): kurulum karnesi ve kural ihlalleri için. Yoksa yalnızca bu işlemin verisi kullanılır.
  const allTrades = useAllTrades();
  const insight = React.useMemo(
    () => (currentTrade && allTrades ? computeTradeInsight(currentTrade, allTrades) : null),
    [currentTrade, allTrades],
  );

  // İşlemler arası geçiş: liste ekrandaki sırayı izler (← önceki, → sonraki)
  const navIndex = React.useMemo(
    () => (navList && currentTrade ? navList.findIndex((t) => t.id === currentTrade.id) : -1),
    [navList, currentTrade],
  );
  const canNav = !!onNavigate && !!navList && navIndex >= 0 && navList.length > 1;
  const prevTrade = canNav && navIndex > 0 ? navList![navIndex - 1] : null;
  const nextTrade = canNav && navIndex < navList!.length - 1 ? navList![navIndex + 1] : null;
  // İşlemler arası geçiş yönü: içerik geldiği yönden hafifçe kayarak belirir (← önceki, → sonraki)
  const navDirRef = React.useRef(0);
  const goPrev = React.useCallback(() => { if (prevTrade && onNavigate) { navDirRef.current = -1; onNavigate(prevTrade); } }, [prevTrade, onNavigate]);
  const goNext = React.useCallback(() => { if (nextTrade && onNavigate) { navDirRef.current = 1; onNavigate(nextTrade); } }, [nextTrade, onNavigate]);

  React.useEffect(() => {
    setImageError(false);
    const screenshot = trade?.screenshot || (!trade ? displayedTrade?.screenshot : undefined);
    if (!screenshot) {
      setResolvedImageUrl(null);
      setIsImageLoading(false);
      return;
    }
    
    setIsImageLoading(true);
    let alive = true;
    resolveChartImage(screenshot).then((url) => {
      if (!alive) return;
      if (!url) {
        // Kayıtlı görsel bulunamadı (silinmiş / erişim yok): sonsuz yükleniyor yerine hata göster
        setResolvedImageUrl(null);
        setIsImageLoading(false);
        setImageError(true);
        return;
      }
      setResolvedImageUrl(url);
    });
    return () => {
      alive = false;
    };
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
      // Görsel kütüphanesi yalnızca indirme anında yüklenir (açılış paketinde yok)
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
      const dateStr = currentTrade?.createdAt ? nyDateKey(currentTrade.createdAt) : 'export';
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
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !showDeleteConfirm && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const el = e.target as HTMLElement | null;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') goPrev(); else goNext();
        return;
      }
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
  }, [onClose, showDeleteConfirm, trade, goPrev, goNext]);

  const bodyRef = React.useRef<HTMLDivElement>(null);
  const headInfoRef = React.useRef<HTMLDivElement>(null);
  const counterRef = React.useRef<HTMLSpanElement>(null);
  // Yeni işleme geçince paneller en üstten başlasın; gezinmeyle gelindiyse hafif yönlü geçiş
  // (yalnızca opacity + transform; içerik yeniden bağlanmaz, görseller yeniden yüklenmez)
  React.useEffect(() => {
    contentRef.current?.querySelectorAll<HTMLElement>('.custom-scrollbar').forEach((el) => { el.scrollTop = 0; });
    const dir = navDirRef.current;
    navDirRef.current = 0;
    if (!dir || typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Geçiş: pencere ve zemin sabit kalır (ton değişmez). Bölümler (sonuç, bağlam, disiplin, görsel, notlar)
    // geldiği yönden çok kısa bir mesafeyle, sırayla (kademeli) yerine süzülür; renkler aynı sürede karışır
    // (index.css · .detail-soft). Sayaç yeni numarayı yönüyle getirir; başlıktaki ince çizgi listedeki konumu gösterir.
    const sections = bodyRef.current
      ? Array.from(bodyRef.current.querySelectorAll<HTMLElement>('section')).filter((el) => !el.parentElement?.closest('section'))
      : [];
    const controls = [
      ...sections.slice(0, 8).map((el, i) =>
        animate(el, { opacity: [0.82, 1], x: [dir * 5, 0], y: [3, 0] }, { duration: 0.46, ease: SOFT_EASE, delay: i * 0.035 }),
      ),
      headInfoRef.current && animate(headInfoRef.current, { opacity: [0.85, 1], x: [dir * 3, 0] }, { duration: 0.4, ease: SOFT_EASE }),
      counterRef.current && animate(counterRef.current, { opacity: [0, 1], y: [dir * 6, 0] }, { duration: 0.32, ease: SOFT_EASE }),
    ];
    return () => controls.forEach((c) => c && c.stop());
  }, [currentTrade?.id]);

  if (!currentTrade) return null;

  const isWin = currentTrade.status === 'WIN';
  const isLoss = currentTrade.status === 'LOSS';
  const isBe = currentTrade.status === 'BREAKEVEN';
  const isOpen = (currentTrade.status as any) === 'OPEN';

  const rrColorClass = currentTrade.rr !== undefined && currentTrade.rr !== null 
    ? currentTrade.rr > 0 ? 'text-emerald-400' : currentTrade.rr < 0 ? 'text-rose-400' : 'text-zinc-400'
    : 'text-zinc-600';

  // Tarih/saat New York saatiyle gösterilir (giriş ve çıkış NY saatiyle girilir)
  const formatDate = (timestamp: number) => {
    return nyWallDate(timestamp).toLocaleString('tr-TR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const riskFormatted = typeof currentTrade.riskPct === 'number'
    ? `%${currentTrade.riskPct.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : '—';

  const rrFormatted = currentTrade.rr !== undefined && currentTrade.rr !== null ? formatR(currentTrade.rr) : `—`;

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
            {...MODAL_BACKDROP}
            onClick={onClose}
             className="modal-overlay modal-layer modal-dim"
          >
            <motion.div 
              key="trade-detail-content"
              ref={contentRef}
              {...MODAL_PANEL}
              style={{ 
                willChange: "transform, opacity", 
                ...(isExporting ? { margin: 0, padding: 0, boxShadow: 'none', borderRadius: 0, border: 'none', transform: 'none' } : {}) 
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-6xl modal-content detail-soft relative ${
                isExporting 
                  ? 'h-auto max-h-none overflow-visible shadow-none rounded-none border-0 m-0 p-0 bg-[#0a0a0c]' 
                  : 'h-[92vh] sm:h-[88vh] max-h-[900px] overflow-hidden'
              }`}
            >
              {/* Header */}
              <div className="modal-header gap-3 relative">
                {canNav && !isExporting && (
                  <span aria-hidden className="no-export absolute left-0 right-0 bottom-0 h-px bg-zinc-800/60 pointer-events-none">
                    <span
                      className="block h-full bg-blue-400/50 transition-[width] duration-500 ease-[cubic-bezier(0.25,0.8,0.3,1)]"
                      style={{ width: `${((navIndex + 1) / navList!.length) * 100}%` }}
                    />
                  </span>
                )}
                <div ref={headInfoRef} className="flex flex-col xl:flex-row xl:items-center gap-1.5 xl:gap-5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                    <h2 className="heading-1 flex items-center gap-3 min-w-0">
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
                  <div className="hidden xl:block w-px h-8 bg-zinc-800"></div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs xl:text-sm font-sans min-w-0" title={formatDate(currentTrade.createdAt)}>
                    <Calendar size={14} className="text-zinc-500 shrink-0"/>
                    <span className="truncate whitespace-nowrap">{formatDate(currentTrade.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 no-export">
                  {canNav && (
                    <>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Önceki işlem" title="Önceki işlem (←)" onClick={goPrev} disabled={!prevTrade}
                          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronLeft size={16} />
                        </button>
                        <span className="min-w-[3.25rem] text-center overflow-hidden"><span ref={counterRef} className="inline-block text-[11px] font-semibold tabular-nums text-zinc-500">{navIndex + 1} / {navList!.length}</span></span>
                        <button type="button" aria-label="Sonraki işlem" title="Sonraki işlem (→)" onClick={goNext} disabled={!nextTrade}
                          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
                    </>
                  )}
                  <button aria-label="Düzenle" title="Düzenle"
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                  >
                    <Edit3 size={16} />
                  </button>
                  {onDelete && (
                    <button aria-label="Sil" title="Sil"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    aria-label="Görsel olarak indir (PNG)"
                    title="Görsel olarak indir (PNG)"
                    disabled={isDownloading}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                  <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
                  <button aria-label="Kapat" title="Kapat"
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
              <div ref={bodyRef} className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
                
                {/* Left Sidebar - Meta & Context (approx 35%) */}
                <div className={`w-full lg:w-[40%] bg-zinc-950/30 border-r border-zinc-800/60 p-5 space-y-5 shrink-0 ${isExporting ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Hızlı kayıt: ayrıntılar eksik */}
                  {currentTrade.quickEntry === true && !isExporting && (() => {
                    const missing = [
                      !currentTrade.session && (cleanDefinitionTitleString(definitionTitles.sessions) || "Seans"),
                      !currentTrade.asiaRange && (cleanDefinitionTitleString(definitionTitles.asiaRange) || "Asia Range"),
                      !(currentTrade.entryModels && currentTrade.entryModels.length) && (cleanDefinitionTitleString(definitionTitles.entryModels) || "Giriş modeli"),
                      !currentTrade.timeframe && (cleanDefinitionTitleString(definitionTitles.timeframes) || "Entry TF"),
                      !currentTrade.planFidelity && (cleanDefinitionTitleString(definitionTitles.planFidelities) || "Setup kalitesi"),
                      !currentTrade.premiumDiscount && (cleanDefinitionTitleString(definitionTitles.premiumDiscounts) || "Confirmations"),
                    ].filter(Boolean) as string[];
                    return (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <PenLine size={14} className="text-amber-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-amber-200">Hızlı kayıt · ayrıntılar tamamlanmadı</p>
                          {missing.length > 0 && (
                            <p className="text-[10px] text-amber-200/70 mt-0.5">Eksik: {missing.join(", ")}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { onEdit(currentTrade); onClose(); }}
                          className="shrink-0 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-[10px] font-bold uppercase text-amber-200 cursor-pointer transition-colors"
                        >
                          Tamamla
                        </button>
                      </div>
                    );
                  })()}

                  {/* Sonuç: gerçekleşen ↔ plan R:R, risk ve fiyat yolu (MAE/MFE stop'a göre) */}
                  {insight ? (
                    <ResultPanel trade={currentTrade} path={insight.path} />
                  ) : (
                    <section>
                      <h4 className="heading-2 mb-3">
                        <Activity size={12}/> SONUÇ
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-center">
                          <span className="heading-3 mb-1.5">SONUÇ (R)</span>
                          <span className={`text-2xl font-bold ${rrColorClass}`}>{rrFormatted}</span>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-center">
                          <span className="heading-3 mb-1.5">İŞLEM BAŞI RİSK</span>
                          <span className="text-2xl font-bold text-zinc-200">{riskFormatted}</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Execution Context */}
                  {(() => {
                    // Setup kalitesi sırası renge yansır: A+ yeşil · A mavi · B-C (ve FOMO / ihlal) kırmızı
                    const tier = setupQualityTier(currentTrade.planFidelity);
                    const planColor = tier === 'high' ? "text-emerald-400 font-bold" : tier === 'mid' ? "text-blue-300 font-bold" : tier === 'low' ? "text-rose-400 font-bold" : undefined;
                    // Trend bir kurulum tipidir, hata değil: değer yargısı içeren renk verilmez
                    const trendColor = undefined;

                    return (
                      <section>
                        <h4 className="heading-2 mb-2">
                          <Layers size={12}/> İŞLEM BAĞLAMI
                        </h4>
                        {/* Hesap tek satır; diğerleri sırayla ikili döşeme */}
                        <div className="grid grid-cols-2 gap-px bg-zinc-800/60 border border-zinc-800/60 rounded-xl overflow-hidden">
                          {/* 1. PLATFORM & HESAP TÜRÜ */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.platforms) || "HESAP")} 
                            value={
                              (() => {
                                const cat = getTradeAccountCategory(currentTrade);
                                const catClass = cat === 'FUNDED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : cat === 'CHALLENGE'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                                return (
                                  <span className="flex items-center gap-1.5 min-w-0 max-w-full" title={currentTrade.platform || 'Hesapsız'}>
                                    <span className="truncate min-w-0">{currentTrade.platform || 'Hesapsız'}</span>
                                    <span className={`shrink-0 text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase border ${catClass}`}>
                                      {getTradeStageLabel(currentTrade) || ACCOUNT_CATEGORY_LABELS[cat]}
                                    </span>
                                  </span>
                                );
                              })()
                            } 
                            icon={<Monitor size={14} className="text-zinc-400"/>} 
                          />
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.asiaRange) || "ASIA RANGE")}
                            value={currentTrade.asiaRange}
                            icon={<Target size={14} className="text-cyan-400"/>}
                          />
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.sweepTime) || "SWEEP TIME")}
                            value={currentTrade.sweepTime ? `${currentTrade.sweepTime} NY` : undefined}
                            icon={<Clock size={14} className="text-cyan-400"/>}
                          />
                          {/* 3. SESSION */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.sessions) || "SESSION")} 
                            value={currentTrade.session} 
                            icon={<Clock size={14} className="text-purple-400"/>} 
                          />
                          {/* 8. TREND YAPISI */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.trendTypes) || "TREND YAPISI")} 
                            value={currentTrade.trend} 
                            icon={<TrendingUp size={14} className="text-emerald-400"/>} 
                            valueColor={trendColor}
                          />
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.asiaRangeFvgs) || "ASIA RANGE FVG")}
                            value={(() => {
                              // Asia range genişliği (pip) önce, ardından FVG var/yok
                              const fvg = currentTrade.asiaRangeFvg ? smartUpper(currentTrade.asiaRangeFvg) : undefined;
                              const pips = currentTrade.asiaRangePips !== undefined && currentTrade.asiaRangePips !== null ? `${currentTrade.asiaRangePips} PIP` : undefined;
                              return fvg && pips ? `${pips} · ${fvg}` : (fvg ?? pips);
                            })()}
                            icon={<Flag size={14} className="text-orange-400"/>}
                          />
                          {/* 4. TIMEFRAME */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.htfTimeframes) || "TIMEFRAME")} 
                            value={currentTrade.htfTimeframe} 
                            icon={<Maximize2 size={14} className="text-rose-400"/>} 
                          />
                          {/* 5. PD ARRAY */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.confirmations) || "PD ARRAY")} 
                            value={currentTrade.confirmations && currentTrade.confirmations.length > 0 
                              ? currentTrade.confirmations.map(c => smartUpper(c)).join(", ") 
                              : undefined} 
                            icon={<Layers size={14} className="text-emerald-400"/>} 
                          />
                          {/* 6. ENTRY TIMEFRAME */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.timeframes) || "ENTRY TIMEFRAME")} 
                            value={currentTrade.timeframe} 
                            icon={<Target size={14} className="text-blue-400"/>} 
                          />
                          {/* 7. ENTRY MODEL */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.entryModels) || "ENTRY MODEL")} 
                            value={Array.isArray(currentTrade.entryModels) && currentTrade.entryModels.length > 0 
                              ? currentTrade.entryModels.map(e => smartUpper(e)).join(", ") 
                              : undefined} 
                            icon={<Zap size={14} className="text-amber-400"/>} 
                          />
                          {/* TARGET (çıkış hedefi) */}
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.tpTargets) || "TARGET")}
                            value={Array.isArray(currentTrade.tpTargets) && currentTrade.tpTargets.length > 0
                              ? currentTrade.tpTargets.map(e => smartUpper(e)).join(", ")
                              : undefined}
                            icon={<Flag size={14} className="text-purple-400"/>}
                          />
                          {/* PREMIUM / DISCOUNT */}
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.premiumDiscounts) || "CONFIRMATIONS")}
                            value={currentTrade.premiumDiscount ? smartUpper(currentTrade.premiumDiscount) : undefined}
                            icon={<Scale size={14} className="text-purple-400"/>}
                          />
                          {/* NEWS DAY / BANK HOLIDAY */}
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.newsDays) || "NEWS DAY/BANK HOLIDAY")}
                            value={typeof currentTrade.newsDay === "boolean" ? smartUpper(currentTrade.newsDay ? getNewsDayLabels().yes : getNewsDayLabels().no) : undefined}
                            icon={<Clock size={14} className="text-amber-400"/>}
                          />
                          {/* 9. SETUP KALİTESİ */}
                          <ContextRow 
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.planFidelities) || "SETUP KALİTESİ")} 
                            value={currentTrade.planFidelity} 
                            icon={<ShieldCheck size={14} className="text-blue-400"/>} 
                            valueColor={planColor}
                          />
                          <ContextRow
                            label={smartUpper(cleanDefinitionTitleString(definitionTitles.management) || "İŞLEM YÖNETİMİ")}
                            value={currentTrade.management?.length ? currentTrade.management.join(', ') : undefined}
                            icon={<Zap size={14} className="text-blue-400"/>}
                          />
                          <ContextRow
                            label="ÇIKIŞ SONRASI TP"
                            value={typeof currentTrade.afterExitTp === 'boolean' ? (currentTrade.afterExitTp ? 'Evet' : 'Hayır') : undefined}
                            icon={<Target size={14} className="text-blue-400"/>}
                          />
                          {/* MAE / MFE (pip): fiyat yolu panelinde R olarak gösterilmiyorsa; ikisi birlikte satır olur */}
                          {(() => {
                            const showMae = currentTrade.maePips !== undefined && currentTrade.maePips !== null && !(insight && insight.path.maeR !== null);
                            const showMfe = currentTrade.mfePips !== undefined && currentTrade.mfePips !== null && !(insight && insight.path.mfeR !== null);
                            if (!showMae && !showMfe) return null;
                            return (
                              <>
                                <ContextRow
                                  label="MAE (PİP)"
                                  value={typeof currentTrade.maePips === 'number' ? `${currentTrade.maePips} Pip` : undefined}
                                  icon={<TrendingDown size={14} className="text-orange-400"/>}
                                />
                                <ContextRow
                                  label="MFE (PİP)"
                                  value={typeof currentTrade.mfePips === 'number' ? `${currentTrade.mfePips} Pip` : undefined}
                                  icon={<TrendingUp size={14} className="text-cyan-400"/>}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </section>
                    );
                  })()}

                  {/* Disiplin: işlem bağlamının hemen altında */}
                  {insight && <RuleBadges insight={insight} />}

                </div>

                {/* Sağ panel: görsel → notlar → fiyat yolu · kurulum geçmişi */}
                <div className={`w-full lg:w-[60%] min-w-0 bg-[#0a0a0c] flex flex-col p-5 space-y-4 min-h-0 ${isExporting ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Technical Chart */}
                  <section className="flex-shrink-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="heading-2">
                        <ImageIcon size={12}/> TEKNİK ANALİZ GÖRSELİ
                      </h4>
                      {currentTrade.screenshot && !imageError && (
                        <a href={/^https?:\/\//i.test(currentTrade.screenshot || "") ? currentTrade.screenshot! : undefined} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans uppercase font-bold bg-blue-500/10 px-2.5 py-1 rounded-md transition-colors">
                          Tam Boyut <ExternalLink size={10}/>
                        </a>
                      )}
                    </div>
                    
                    <div className={`bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden relative group w-full flex items-center justify-center p-2 ${
                      isExporting 
                        ? 'h-auto max-h-none' 
                        : currentTrade.screenshot 
                          ? 'min-h-[280px] max-h-[520px]' 
                          : 'h-[180px]'
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
                          <img decoding="async" 
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
                      <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-600">
                        <Monitor size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold font-sans text-zinc-400">Grafik Linki Yok</p>
                        <p className="text-xs text-zinc-500 mt-2 font-sans max-w-xs">Bu işleme TradingView ya da başka bir grafik linki eklenmemiş.</p>
                        <button onClick={() => { onEdit(currentTrade); onClose(); }} className="mt-4 text-xs font-sans font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-colors uppercase cursor-pointer">
                          Grafik Linki Ekle
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

                  {/* Notların altında: fiyat yolu ve kurulum geçmişi yan yana */}
                  {insight && (() => {
                    const hasPath = hasPricePathContent(currentTrade, insight.path);
                    const hasSetup = !!insight.setup;
                    if (!hasPath && !hasSetup) return null;
                    return (
                      <div className={`shrink-0 grid gap-4 ${hasPath && hasSetup ? 'sm:grid-cols-2' : ''}`}>
                        {hasPath && <PricePathPanel trade={currentTrade} path={insight.path} />}
                        {hasSetup && <SetupHistoryPanel insight={insight} />}
                      </div>
                    );
                  })()}

                </div>
              </div>
              
              {/* Mobile Actions Footer */}
              <div className="sm:hidden flex items-center gap-2 p-4 border-t border-zinc-800/80 bg-zinc-950/80 shrink-0 no-export">
                 <button aria-label="Düzenle" title="Düzenle"
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 flex-1"
                  >
                    <Edit3 size={16} />
                  </button>
                 {onDelete && (
                    <button aria-label="Sil" title="Sil"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 flex-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    aria-label="Görsel olarak indir (PNG)"
                    title="Görsel olarak indir (PNG)"
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
            {...MODAL_BACKDROP}
            className="fixed inset-0 modal-layer modal-dim z-[4500]  flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              key="trade-delete-confirm-content"
              {...MODAL_PANEL}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-white uppercase text-center mb-2 font-sans">
                {smartUpper("İşlemi Sil")}
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
  valueColor,
  wide,
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ReactNode; 
  valueColor?: string;
  wide?: boolean;
}) {
  const displayValue = value !== undefined && value !== null ? value : '—';
  const text = typeof displayValue === 'string' ? smartUpper(displayValue) : displayValue;
  return (
    <div className={`flex flex-col gap-1 px-3.5 py-2.5 bg-zinc-950/70 min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-zinc-500 min-w-0 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:shrink-0">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider font-sans truncate">{smartUpper(label)}</span>
      </div>
      <div className={`text-[11px] font-bold font-sans uppercase truncate ${valueColor || 'text-zinc-300'}`} title={typeof displayValue === 'string' ? displayValue : undefined}>
        {text}
      </div>
    </div>
  );
}

export default TradeDetailModal;
