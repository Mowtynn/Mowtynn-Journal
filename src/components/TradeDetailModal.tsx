import { saveBlob, dataUrlToBlob, waitForPaint, withExportSafeText } from "../lib/download";
import { fileSlug } from "../utils/exportTrades";
import { EASE } from '../lib/motion';
import { MODAL_BACKDROP, MODAL_PANEL } from '../lib/motion';

/** İşlemler arası geçiş eğrisi: expo'dan daha yumuşak başlayan, uzun süzülen bir yavaşlama */

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, animate } from "motion/react";
import toast from "react-hot-toast";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_DEFINITION_TITLES, cleanDefinitionTitleString, smartUpper, getTradeAccountName } from "../constants/constants";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { isChartShareLink, resolveChartImage } from "../lib/chartLink";
import {
  X, Edit3, Trash2, Calendar, Clock, Maximize2,
  ExternalLink, Image as ImageIcon, FileText,
  Activity, Monitor, AlertCircle,
  Download, Loader2, Crosshair, PenLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FlowStep, FlowProgress, flowSteps, qualityTone } from "./setupFlow/SetupFlow";
import { nyWallDate, nyDateKey } from "../lib/tradingTime";
import { ResultPanel, SetupHistoryPanel } from "./tradeDetail/TradeInsightPanels";
import { computeTradeInsight } from "../lib/tradeInsight";
import { tradeConfirmations } from "../lib/tradeModel";
import { useAllTrades } from "../lib/allTradesContext";

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

/** Notlar kutusunun en küçük yüksekliği: 2-3 cümle (kısa ekranda biraz daha az); pencere ölçümünde bu değer sayılır */
const notesBoxMinH = (vh: number) => (vh < 820 ? 96 : 112);

/**
 * Grafik kutusunun sabit oranı. Pencere ve grafik kutusu görselin kendi oranına / çözünürlüğüne göre değil yalnızca ekran
 * boyutuna göre ölçülür: TradingView, OpenMarket ya da başka bir görsel açılsa da pencere birebir aynı boyutta açılır.
 * Oran, kullanılan görsellerin ikisine de eşit uzaklıkta seçildi (TradingView ≈ 1.73, OpenMarket ≈ 1.98): ikisinde de
 * kenarlarda yalnızca ince, eşit bir boşluk kalır. Görsel kutuya orantısı bozulmadan (object-contain) sığdırılır, kırpılmaz.
 */
const CHART_ASPECT = 1.85;
/** Grafiğin altındaki "Kurulum geçmişi" kartının sabit yüksekliği: kartın içeriği işleme göre değişse de pencere / grafik boyutu değişmez */
const SETUP_SLOT_H = 72;

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
  // Grafiği uygulamanın içinde tam ekran büyütme (Esc / tıklama ile kapanır)
  const [zoomOpen, setZoomOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  // Görsel sunucusu CORS başlığı göndermiyorsa (ör. OpenMarket) crossOrigin olmadan yeniden denenir; görsel görünür, indirilen PNG'de boş kalabilir
  const [noCors, setNoCors] = useState(false);

  // Preserve displayedTrade so that content remains intact during exit animation when trade prop is cleared
  const [displayedTrade, setDisplayedTrade] = useState<Trade | null>(trade);

  useBodyScrollLock(!!(trade || displayedTrade));

  useEffect(() => {
    if (trade) {
      setDisplayedTrade(trade);
    }
  }, [trade]);

  const currentTrade = trade || displayedTrade;
  // Kurulum geçmişi için tüm işlemler (App'ten)
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
    setNoCors(false);
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
  const headerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);

  /**
   * Masaüstü (≥1024px) boyutlandırma: pencere içeriğe göre ölçülür.
   * - Grafik varsa: grafik kutusu tam olarak görselin oranında (üst / alt / yan boşluk yok); en büyük boyut
   *   ekranın izin verdiği alan, pencere genişliği ve yüksekliği buna göre hesaplanır.
   * - Grafik yoksa: pencere yüksekliği sol sütunun içeriği kadar.
   * Sol sütunun doğal yüksekliği çocukların toplamıdır (notlar en küçük boyutuyla sayılır).
   */
  const [viewport, setViewport] = useState(() => ({ w: typeof window !== 'undefined' ? window.innerWidth : 0, h: typeof window !== 'undefined' ? window.innerHeight : 0 }));
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setViewport({ w: window.innerWidth, h: window.innerHeight }));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  // İçerik boyutu değişince (yazı tipi yüklenmesi, işlem değişimi, düzen) ölçüm yenilenir; notlar izlenmez (esneyen alan)
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => {
    const left = leftColRef.current;
    const header = headerRef.current;
    if (!left || !header || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
    });
    ro.observe(header);
    Array.from(left.children).forEach((k) => {
      if (!(k as HTMLElement).dataset.notes) ro.observe(k);
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [currentTrade?.id, isExporting]);
  const [fit, setFit] = useState<{ w?: number; h: number; leftW?: number; cw?: number; ch?: number; chBox?: number } | null>(null);
  // Görsel yüklenirken de grafik alanı ayrılır; oran sabit olduğu için görsel gelince pencere yeniden boyutlanmaz. Yalnızca hata olursa grafik yok sayılır
  const shotKey = currentTrade?.screenshot || '';
  const hasChart = !!(shotKey && !imageError);
  // Telefon / tablet: görsel kutunun tam genişliğinde, kutu görselin yüksekliği kadar (üst / alt boşluk yok)
  const phoneChart = hasChart && !isExporting && viewport.w < 1024;
  useLayoutEffect(() => {
    const left = leftColRef.current;
    const header = headerRef.current;
    if (!currentTrade || isExporting || !left || !header || viewport.w < 1024) {
      setFit(null);
      return;
    }
    // Kullanılabilir alan: pencereyi taşıyan katmanın iç boyutu (kaydırma çubuğu, iç boşluk ve üst çubuk düşülmüş)
    const overlay = contentRef.current?.parentElement;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    let maxW = Math.min(viewport.w - 32, 1800);
    let maxH = viewport.h - navH - 32;
    if (overlay) {
      const os = getComputedStyle(overlay);
      maxW = Math.min(1800, overlay.clientWidth - parseFloat(os.paddingLeft) - parseFloat(os.paddingRight));
      maxH = Math.min(maxH, overlay.clientHeight - parseFloat(os.paddingTop) - parseFloat(os.paddingBottom));
    }
    const headerH = header.offsetHeight;
    const leftW = Math.round(Math.min(500, Math.max(430, viewport.w * 0.33)));
    // Sol sütunun doğal yüksekliği (notlar en küçük yüksekliğiyle)
    const kids = Array.from(left.children) as HTMLElement[];
    const cs = getComputedStyle(left);
    let leftNeed = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    kids.forEach((k) => {
      const ks = getComputedStyle(k);
      const m = (parseFloat(ks.marginTop) || 0) + (parseFloat(ks.marginBottom) || 0);
      // Notlar: başlık + en küçük kutu (bölüm esnediği için kendi yüksekliği ölçülmez)
      const notesHead = k.dataset.notes ? (k.firstElementChild as HTMLElement | null)?.offsetHeight || 0 : 0;
      const notesChrome = k.dataset.notes
        ? (parseFloat(ks.paddingTop) || 0) + (parseFloat(ks.paddingBottom) || 0) + (parseFloat(ks.rowGap) || 0) + 2
        : 0;
      leftNeed += m + (k.dataset.notes ? notesHead + notesChrome + notesBoxMinH(viewport.h) : k.offsetHeight);
    });
    const BORDER = 2;
    if (hasChart) {
      const a = CHART_ASPECT;
      // Grafiğin altındaki kurulum geçmişi alanı (kart olsun olmasın aynı yer ayrılır) ve aradaki boşluk
      const setupH = SETUP_SLOT_H + 16;
      const padX = 40;
      const padY = 40;
      const headingH = 34;
      const chartWMax = maxW - leftW - padX - BORDER * 2;
      const chartHMax = maxH - headerH - padY - headingH - setupH - BORDER * 2;
      let cw = Math.min(chartWMax, chartHMax * a);
      let ch = cw / a;
      if (cw < 200 || ch < 120) {
        setFit({ h: Math.min(maxH, headerH + leftNeed + BORDER) });
        return;
      }
      cw = Math.floor(cw);
      ch = Math.floor(ch);
      const rightH = ch + BORDER + headingH + setupH + padY;
      const h = Math.min(maxH, headerH + Math.max(leftNeed, rightH) + BORDER);
      // Sol sütun grafikten uzunsa grafik kutusu kalan yüksekliği doldurur (grafikle kurulum geçmişi arasında boşluk kalmaz;
      // görsel orantısı korunarak ortalanır)
      const chBox = ch + Math.max(0, h - headerH - BORDER - rightH);
      setFit({ w: leftW + cw + BORDER + padX + BORDER, h, leftW, cw, ch, chBox });
    } else {
      setFit({ h: Math.min(maxH, Math.max(headerH + leftNeed + BORDER, 480)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrade?.id, hasChart, viewport.w, viewport.h, isExporting, measureTick]);

  const handleDownload = async () => {
    if (!contentRef.current) return;
    try {
      setIsDownloading(true);
      setIsExporting(true); // Triggers layout changes
      
      // Wait a moment for DOM to update with isExporting classes and base64 image
      // Ultimate Optimization: Use double requestAnimationFrame to wait for the exact moment the browser paints the new layout, 0ms idle time.
      await waitForPaint();
      // Görsel kütüphanesi yalnızca indirme anında yüklenir (açılış paketinde yok)
      const htmlToImage = await import("html-to-image");
      const node = contentRef.current;
      if (!node) return; // pencere bu arada kapandıysa
      const dataUrl = await withExportSafeText(node, () => htmlToImage.toPng(node, {
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
      }));
      
      const dateStr = currentTrade?.createdAt ? nyDateKey(currentTrade.createdAt) : 'export';
      await saveBlob(dataUrlToBlob(dataUrl), `${fileSlug(currentTrade?.asset || 'Trade')}_${dateStr}.png`);
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
    } else {
      setZoomOpen(false);
    }
  }, [trade]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (zoomOpen) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoomOpen(false); }
        return;
      }
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
  }, [onClose, showDeleteConfirm, trade, goPrev, goNext, zoomOpen]);

  const bodyRef = React.useRef<HTMLDivElement>(null);
  const headInfoRef = React.useRef<HTMLDivElement>(null);
  // Yeni işleme geçince paneller en üstten başlasın; gezinmeyle gelindiyse hafif yönlü geçiş
  // (yalnızca opacity + transform; içerik yeniden bağlanmaz, görseller yeniden yüklenmez)
  React.useEffect(() => {
    contentRef.current?.querySelectorAll<HTMLElement>('.custom-scrollbar').forEach((el) => { el.scrollTop = 0; });
    const dir = navDirRef.current;
    navDirRef.current = 0;
    if (!dir || typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Geçiş: pencere ve zemin sabit kalır. İçerik tek parça halinde, geldiği yönden kısa bir kaymayla ve
    // hızlı bir solmayla yerine oturur (kademesiz, ~0.2 sn): art arda ok tuşuyla gezerken bile takılmaz,
    // her basış önceki animasyonu keser. Sayaç (n / toplam) hareket etmez: oklarla aynı hizada sabit durur.
    const controls = [
      bodyRef.current && animate(bodyRef.current, { opacity: [0.35, 1], x: [dir * 18, 0] }, { duration: 0.22, ease: EASE }),
      headInfoRef.current && animate(headInfoRef.current, { opacity: [0.35, 1], x: [dir * 10, 0] }, { duration: 0.2, ease: EASE }),
    ];
    return () => controls.forEach((c) => c && c.stop());
  }, [currentTrade?.id]);

  // Dokunmatik ekranda yatay kaydırmayla işlemler arası geçiş (sola: sonraki, sağa: önceki); dikey kaydırma etkilenmez
  const swipeRef = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const onSwipeStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    swipeRef.current = e.touches.length === 1 ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s0 = swipeRef.current;
    swipeRef.current = null;
    if (!s0 || !canNav) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - s0.x;
    const dy = p.clientY - s0.y;
    if (Date.now() - s0.t > 600 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) goNext(); else goPrev();
  };

  if (!currentTrade) return null;


  // Tarih New York gününe göre gösterilir (saat tutulmuyor)
  const formatDate = (timestamp: number) => {
    return nyWallDate(timestamp).toLocaleDateString('tr-TR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
             className="modal-overlay modal-layer modal-dim !p-2 sm:!p-4"
          >
            <motion.div 
              key="trade-detail-content"
              ref={contentRef}
              {...MODAL_PANEL}
              style={{ 
                willChange: "transform, opacity", 
                ...(isExporting ? { margin: 0, padding: 0, boxShadow: 'none', borderRadius: 0, border: 'none', transform: 'none' } : {}),
                ...(fit && !isExporting ? { height: fit.h, ...(fit.w ? { width: fit.w, maxWidth: 'none' } : {}) } : {}),
              }}
              onClick={(e) => e.stopPropagation()}
              // İşlem ekleme penceresiyle aynı boyut: aynı genişlik basamakları ve ekranın %96'sına kadar yükseklik
              className={`w-full modal-content detail-soft relative ${
                isExporting 
                  ? 'max-w-6xl h-auto max-h-none overflow-visible shadow-none rounded-none border-0 m-0 p-0 bg-[#0a0a0c]' 
                  // Yükseklik = üst çubuğun altındaki alan − katmanın iç boşluğu (mobil 0.5rem, masaüstü 1rem; üst + alt).
                  // Eskiden 96vh / genel sınır yalnızca 1rem düşüyordu: masaüstünde pencere 16px taşıp katmanı kaydırıyordu.
                  : 'max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-[calc(100dvh_-_var(--nav-h,0px)_-_1rem)] sm:h-[calc(100dvh_-_var(--nav-h,0px)_-_2rem)] overflow-hidden'
              }`}
            >
              {/* Header */}
              <div ref={headerRef} className="modal-header gap-3 relative">
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
                      {/* Durum rozeti yok: sonuç kartı R ile birlikte Kazanç / Kayıp / Breakeven gösteriyor */}
                    </div>
                  </div>
                  <div className="hidden xl:block w-px h-8 bg-zinc-800"></div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs xl:text-sm font-sans min-w-0">
                    <Calendar size={14} className="text-zinc-500 shrink-0"/>
                    <span className="truncate whitespace-nowrap">{formatDate(currentTrade.createdAt)}</span>
                    {(currentTrade.sweepTime || currentTrade.session) && (
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-zinc-500">
                        <span className="text-zinc-700">·</span>
                        <Clock size={13} className="shrink-0" />
                        {currentTrade.sweepTime && <span className="tabular-nums text-zinc-300">{currentTrade.sweepTime}<span className="ml-0.5 text-label text-zinc-500">NY</span></span>}
                        {currentTrade.session && <span lang="en" className="text-zinc-400">{currentTrade.session}</span>}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 no-export">
                  {canNav && (
                    <>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Önceki işlem" onClick={goPrev} disabled={!prevTrade}
                          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronLeft size={16} />
                        </button>
                        {/* Sayaç oklarla aynı yükseklikte ortalı ve hareketsiz: genişlik toplam sayının hane sayısından kurulur
                            (rakamlar eşit genişlikli), böylece 9 → 10 → 100'e geçerken oklar yerinden oynamaz */}
                        <span
                          aria-live="polite"
                          className="flex h-9 items-center justify-center whitespace-nowrap text-label font-semibold leading-none tabular-nums text-zinc-500"
                          style={{ minWidth: `${String(navList!.length).length * 2 + 3}ch` }}
                        >
                          {navIndex + 1} / {navList!.length}
                        </span>
                        <button type="button" aria-label="Sonraki işlem" onClick={goNext} disabled={!nextTrade}
                          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
                    </>
                  )}
                  <button aria-label="Düzenle"
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                  >
                    <Edit3 size={16} />
                  </button>
                  {onDelete && (
                    <button aria-label="Sil"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    aria-label="Görsel olarak indir (PNG)"
                    disabled={isDownloading}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                  <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>
                  <button aria-label="Kapat"
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
              <div ref={bodyRef} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} className={`flex flex-col lg:flex-row flex-1 min-h-0 ${isExporting ? 'overflow-hidden' : 'overflow-y-auto lg:overflow-hidden custom-scrollbar'}`}>
                
                {/* Left Sidebar - Meta & Context (approx 35%) */}
                <div ref={leftColRef} style={fit?.leftW ? { width: fit.leftW } : undefined} className={`w-full lg:w-[40%] bg-zinc-950/40 border-r border-zinc-800/60 p-5 space-y-3.5 lg:[@media(max-height:820px)]:space-y-3 shrink-0 flex flex-col ${isExporting ? 'overflow-visible' : 'lg:overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Hızlı kayıt: ayrıntılar eksik */}
                  {currentTrade.quickEntry === true && !isExporting && (() => {
                    const missing = [
                      !currentTrade.asiaRange && (cleanDefinitionTitleString(definitionTitles.asiaRange) || "Asia Range"),
                      !currentTrade.sweepTime && (cleanDefinitionTitleString(definitionTitles.sweepTime) || "POI Sweep Time"),
                      !currentTrade.poiTimeframe && (cleanDefinitionTitleString(definitionTitles.poiTimeframes) || "POI Timeframe"),
                      !currentTrade.trend && (cleanDefinitionTitleString(definitionTitles.trendTypes) || "İşlem Tipi"),
                      !currentTrade.planFidelity && (cleanDefinitionTitleString(definitionTitles.planFidelities) || "Setup Kalitesi"),
                      tradeConfirmations(currentTrade).length === 0 && (cleanDefinitionTitleString(definitionTitles.premiumDiscounts) || "Confirmations"),
                    ].filter(Boolean) as string[];
                    return (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <PenLine size={14} className="text-amber-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-label font-bold text-amber-200">Hızlı kayıt · ayrıntılar tamamlanmadı</p>
                          {missing.length > 0 && (
                            <p className="text-label text-amber-200/70 mt-0.5">Eksik: {missing.join(", ")}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { onEdit(currentTrade); onClose(); }}
                          className="shrink-0 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-label font-bold uppercase text-amber-200 cursor-pointer transition-colors"
                        >
                          Tamamla
                        </button>
                      </div>
                    );
                  })()}

                  {/* Sonuç kartı: R, durum, hesap, risk ve hesaba dolar etkisi */}
                  <ResultPanel trade={currentTrade} realizedR={typeof currentTrade.rr === "number" && Number.isFinite(currentTrade.rr) ? currentTrade.rr : 0} />

                  {/* KURULUM AKIŞI: formdaki akışın okunur hali — kurulum zaman sırasıyla, adım adım */}
                  {(() => {
                    const T = (v: string | undefined, fb: string) => smartUpper(cleanDefinitionTitleString(v) || fb);
                    const conf = tradeConfirmations(currentTrade);
                    const steps = flowSteps({ ...currentTrade, confirmations: conf });
                    const quality = qualityTone(currentTrade.planFidelity);
                    return (
                      <section className={DETAIL_CARD}>
                        <div className={CARD_HEAD}>
                          <Crosshair size={14} className="text-blue-400 shrink-0" />
                          <span className={CARD_TITLE}>{T(definitionTitles.setupCard, "KURULUM")}</span>
                          <FlowProgress steps={steps} />
                        </div>
                        <div className="flex flex-col pl-0.5">
                          <FlowStep n={1} done={steps[0]} dense>
                            <FlowFields>
                              <FlowField label={T(definitionTitles.asiaRange, "ASIA RANGE")}>
                                <ValueChip value={currentTrade.asiaRange} />
                              </FlowField>
                            </FlowFields>
                          </FlowStep>
                          <FlowStep n={2} done={steps[1]} dense>
                            <FlowFields>
                              <FlowField label={T(definitionTitles.trendTypes, "İŞLEM TİPİ")}>
                                <ValueChip value={currentTrade.trend} />
                              </FlowField>
                              <FlowField label={T(definitionTitles.planFidelities, "SETUP KALİTESİ")}>
                                <ValueChip value={currentTrade.planFidelity} cls={quality.chip} />
                              </FlowField>
                            </FlowFields>
                          </FlowStep>
                          <FlowStep n={3} done={steps[2]} dense>
                            <FlowFields>
                              <FlowField label={T(definitionTitles.sweepTime, "POI SWEEP TIME")}>
                                {currentTrade.sweepTime ? (
                                  <span className="flex items-baseline gap-1 text-base font-bold tabular-nums text-zinc-100 leading-7">
                                    {currentTrade.sweepTime}<span className="text-label font-semibold text-zinc-500">NY</span>
                                  </span>
                                ) : <ValueChip />}
                              </FlowField>
                              <FlowField label={T(definitionTitles.sessions, "SESSION")}>
                                <ValueChip value={currentTrade.session} />
                              </FlowField>
                              <FlowField label={T(definitionTitles.poiTimeframes, "POI TIMEFRAME")}>
                                <ValueChip value={currentTrade.poiTimeframe} />
                              </FlowField>
                            </FlowFields>
                          </FlowStep>
                          <FlowStep n={4} done={steps[3]} dense last>
                            <FlowField label={T(definitionTitles.premiumDiscounts, "CONFIRMATIONS")}>
                              {conf.length > 0 ? (
                                <span className="flex flex-wrap gap-1.5">
                                  {conf.map((c) => <ValueChip key={c} value={c} cls="border-blue-500/25 bg-blue-500/10 text-blue-200" />)}
                                </span>
                              ) : <ValueChip />}
                            </FlowField>
                          </FlowStep>
                        </div>
                      </section>
                    );
                  })()}


                  {/* Notlar: kart; en az 2-3 cümlelik alan, sol sütunda yer kalırsa onu doldurur, daha uzun not kendi içinde kayar */}
                  <section data-notes="1" className={`${DETAIL_CARD} ${isExporting ? '' : 'lg:flex-1 lg:min-h-0'}`}>
                    <div className={`${CARD_HEAD} shrink-0`}>
                      <FileText size={14} className="text-zinc-400 shrink-0" />
                      <span className={CARD_TITLE}>{smartUpper(cleanDefinitionTitleString(definitionTitles.notesCard) || "Analiz & Notlar")}</span>
                    </div>
                    <div style={isExporting ? undefined : { minHeight: notesBoxMinH(viewport.h) }} className={`overflow-x-hidden ${isExporting ? '' : 'max-h-[220px] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto custom-scrollbar'}`}>
                      {currentTrade.notes ? (
                        <p className="text-zinc-200 text-sm leading-7 whitespace-pre-wrap break-words font-sans">
                          {currentTrade.notes}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { onEdit(currentTrade); onClose(); }}
                          className="w-full h-full min-h-[64px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors cursor-pointer"
                        >
                          <PenLine size={14} />
                          <span className="text-xs">Not yok · eklemek için dokun</span>
                        </button>
                      )}
                    </div>
                  </section>
                </div>

                {/* Sağ panel: teknik analiz görseli (masaüstünde tüm yükseklik) */}
                <div style={fit?.leftW ? { width: 'auto', flex: '1 1 0%' } : undefined} className={`w-full lg:w-[60%] min-w-0 bg-[#0a0a0c] flex flex-col p-5 space-y-4 lg:min-h-0 ${isExporting ? 'overflow-visible' : 'lg:overflow-y-auto custom-scrollbar'}`}>
                  
                  {/* Technical Chart — masaüstünde sağ sütunun tüm yüksekliğini kaplar */}
                  <section className={`flex flex-col ${isExporting ? 'flex-shrink-0' : 'flex-shrink-0 lg:flex-1 lg:min-h-0'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="heading-2">
                        <ImageIcon size={12}/> TEKNİK ANALİZ GÖRSELİ
                      </h4>
                      {currentTrade.screenshot && !imageError && (
                        <a href={/^https?:\/\//i.test(currentTrade.screenshot || "") ? currentTrade.screenshot! : undefined} target="_blank" rel="noopener noreferrer" className="text-label text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans uppercase font-bold bg-blue-500/10 px-2.5 py-1 rounded-md transition-colors">
                          Tam Boyut <ExternalLink size={10}/>
                        </a>
                      )}
                    </div>
                    
                    <div style={fit?.cw && fit.ch ? { width: fit.cw + 2, height: (fit.chBox ?? fit.ch) + 2, flex: 'none', minHeight: 0, padding: 0 } : phoneChart ? { minHeight: 0, maxHeight: 'none', padding: 0, aspectRatio: String(CHART_ASPECT) } : undefined} className={`bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden relative group w-full flex items-center justify-center p-2 ${
                      isExporting 
                        ? 'h-auto max-h-none' 
                        : currentTrade.screenshot 
                          ? 'min-h-[240px] max-h-[min(440px,45vh)] lg:max-h-none lg:flex-1 lg:min-h-[260px]' 
                          : 'h-[180px] lg:h-auto lg:flex-1 lg:min-h-[180px]'
                    }`}>
                    {currentTrade.screenshot ? (
                      <>
                        {/* Consistent Loading Overlay - Prevents container shrinking/jumping */}
                        {isImageLoading && !imageError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-950/60 backdrop-blur-sm z-10">
                            <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin mb-3"></div>
                            <p className="text-xs text-zinc-400 font-sans">
                              {isChartShareLink(currentTrade.screenshot) && !resolvedImageUrl
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
                            key={noCors ? 'plain' : 'cors'}
                            src={resolvedImageUrl} 
                            alt="Trading chart" 
                            onClick={() => { if (!isExporting && !isImageLoading) setZoomOpen(true); }}
                            style={fit?.cw ? { padding: 0 } : phoneChart ? { position: 'absolute', inset: 0, width: '100%', height: '100%', maxHeight: 'none', borderRadius: 0 } : undefined}
                            className={`object-contain rounded-lg transition-opacity duration-200 ${isExporting ? '' : 'cursor-zoom-in'} ${isExporting ? 'w-auto h-auto max-w-full' : 'w-auto h-auto max-w-full max-h-[min(420px,43vh)] lg:absolute lg:inset-0 lg:m-auto lg:w-full lg:h-full lg:max-h-none lg:p-2'} ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                            crossOrigin={noCors ? undefined : "anonymous"}
                            referrerPolicy="no-referrer"
                            onLoad={() => {
                              setIsImageLoading(false);
                              setImageError(false);
                            }}
                            onError={() => {
                              if (!noCors) { setNoCors(true); return; }
                              setImageError(true);
                              setIsImageLoading(false);
                            }}
                          />
                        ) : null}
                        {resolvedImageUrl && !imageError && !isImageLoading && !isExporting && (
                          <button
                            type="button"
                            aria-label="Grafiği büyüt"
                            onClick={() => setZoomOpen(true)}
                            className="no-export absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-700/70 bg-zinc-950/80 backdrop-blur-sm text-label font-bold uppercase text-zinc-300 hover:text-white hover:border-zinc-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Maximize2 size={12} /> Büyüt
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-600">
                        <Monitor size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold font-sans text-zinc-400">Grafik Linki Yok</p>
                        <p className="text-xs text-zinc-500 mt-2 font-sans max-w-xs">Bu işleme henüz bir grafik linki eklenmemiş.</p>
                        <button onClick={() => { onEdit(currentTrade); onClose(); }} className="mt-4 text-xs font-sans font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-colors uppercase cursor-pointer">
                          Grafik Linki Ekle
                        </button>
                      </div>
                    )}
                    </div>
                  </section>

                  {/* Kurulum geçmişi: grafiğin altında sabit yükseklikli alan (masaüstünde kart olmasa da yer ayrılır; pencere her işlemde aynı boyutta kalır) */}
                  {(insight?.setup || fit?.cw) && (
                    <div className="shrink-0" style={fit?.cw ? { height: SETUP_SLOT_H } : undefined}>
                      {insight?.setup && <SetupHistoryPanel insight={insight} fixedHeight={!!fit?.cw} />}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mobile Actions Footer */}
              <div className="sm:hidden flex items-center gap-2 p-4 border-t border-zinc-800/80 bg-zinc-950/80 shrink-0 no-export">
                 <button aria-label="Düzenle"
                    onClick={() => { onEdit(currentTrade); onClose(); }}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 flex-1"
                  >
                    <Edit3 size={16} />
                  </button>
                 {onDelete && (
                    <button aria-label="Sil"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl border transition-colors cursor-pointer shrink-0 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 flex-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    aria-label="Görsel olarak indir (PNG)"
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

      {/* Grafik büyütme: tam ekran, görsel oranı korunur; dışarı tıklama / Esc / ✕ kapatır */}
      <AnimatePresence>
        {zoomOpen && resolvedImageUrl && trade && (
          <motion.div
            key="trade-chart-zoom"
            {...MODAL_BACKDROP}
            onClick={() => setZoomOpen(false)}
            className="fixed inset-0 z-[4600] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-sm cursor-zoom-out"
          >
            <img
              src={resolvedImageUrl}
              alt="Grafik (büyük)"
              referrerPolicy="no-referrer"
              crossOrigin={noCors ? undefined : "anonymous"}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              aria-label="Kapat"
              onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
              className="btn-icon absolute top-4 right-4"
            >
              <X size={16} />
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-label text-zinc-400 bg-zinc-950/70 border border-zinc-800 rounded-lg px-2.5 py-1 select-none">
              {currentTrade.asset} · {formatDate(currentTrade.createdAt)} · kapatmak için Esc
            </span>
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
              className="confirm-panel"
            >
              <div className="confirm-icon">
                <Trash2 size={20} />
              </div>
              <h3 className="confirm-title">
                {smartUpper("İşlemi Sil")}
              </h3>
              <p className="confirm-text">
                <span className="font-semibold text-zinc-200">{currentTrade.asset}</span> ({currentTrade.type === 'LONG' ? 'Long' : 'Short'} - {getTradeAccountName(currentTrade)}) pozisyonunu silmek istediğine emin misin? Bu işlem geri alınamaz.
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-cancel"
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
                  className="btn-danger"
                >
                  <Trash2 size={13} />
                  <span>Evet, Sil</span>
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

/** Sol sütun kartları: işlem ekleme formundaki kartlarla aynı dil (başlık · çizgi · içerik) */
const DETAIL_CARD = "rounded-2xl border border-zinc-800/80 bg-zinc-900/45 p-4 flex flex-col gap-3 shadow-sm";
const CARD_HEAD = "flex items-center gap-2 pb-2.5 border-b border-zinc-800/60";
const CARD_TITLE = "text-xs font-bold text-zinc-200 uppercase tracking-wider font-sans";

/* Kurulum akışı (detay): her adım bir ya da birkaç alan; alan = küçük başlık + değer çipi */
function FlowFields({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-5 gap-y-2">{children}</div>;
}

function FlowField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-label font-bold uppercase tracking-wider font-sans text-zinc-400 leading-none mb-2">{label}</div>
      {children}
    </div>
  );
}

/** Değer çipi; değer yoksa soluk bir tire (adımın eksik kaldığı görünür) */
function ValueChip({ value, cls }: { value?: string | null; cls?: string }) {
  if (!value) return <span className="inline-flex items-center h-7 text-sm font-bold text-zinc-700">—</span>;
  return (
    <span lang="en" className={`inline-flex items-center h-7 px-2.5 rounded-lg border text-xs font-bold uppercase tracking-wide font-sans whitespace-nowrap ${cls || "border-zinc-700/70 bg-zinc-900/70 text-zinc-200"}`}>
      {smartUpper(value)}
    </span>
  );
}

export default TradeDetailModal;
