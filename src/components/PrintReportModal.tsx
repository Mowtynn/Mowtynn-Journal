import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Trade } from '../types';
import html2canvas from 'html2canvas';

// --- OKLCH & OKLAB to RGB/RGBA Conversion Helpers for html2canvas Compatibility ---
function oklabToRgb(L: number, labA: number, labB: number, A: number = 1): string {
  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.2914855480 * labB;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bLin = -0.0041960863 * l3 - 0.7034186145 * m3 + 1.7076147010 * s3;

  const transformChannel = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };

  const outR = Math.max(0, Math.min(255, Math.round(transformChannel(rLin) * 255)));
  const outG = Math.max(0, Math.min(255, Math.round(transformChannel(gLin) * 255)));
  const outB = Math.max(0, Math.min(255, Math.round(transformChannel(bLin) * 255)));

  return A === 1 ? `rgb(${outR},${outG},${outB})` : `rgba(${outR},${outG},${outB},${A})`;
}

function oklchToRgb(L: number, C: number, H: number, A: number = 1): string {
  // H is in degrees. Convert to radians.
  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);
  return oklabToRgb(L, labA, labB, A);
}

function parseOklchParts(inner: string) {
  const rawParts = inner.replace(/,/g, ' ').replace(/\//g, ' ').trim().split(/\s+/);
  if (rawParts.length < 3) return null;

  let L = 0;
  if (rawParts[0].endsWith('%')) {
    L = parseFloat(rawParts[0]) / 100;
  } else {
    L = parseFloat(rawParts[0]);
  }

  let C = 0;
  if (rawParts[1].endsWith('%')) {
    C = parseFloat(rawParts[1]) / 100;
  } else {
    C = parseFloat(rawParts[1]);
  }

  let H = 0;
  const hStr = rawParts[2];
  if (hStr.endsWith('deg')) {
    H = parseFloat(hStr);
  } else if (hStr.endsWith('rad')) {
    H = (parseFloat(hStr) * 180) / Math.PI;
  } else if (hStr.endsWith('grad')) {
    H = (parseFloat(hStr) * 360) / 400;
  } else if (hStr.endsWith('turn')) {
    H = parseFloat(hStr) * 360;
  } else {
    H = parseFloat(hStr);
  }

  let A = 1;
  if (rawParts[3] !== undefined) {
    const aStr = rawParts[3];
    if (aStr.endsWith('%')) {
      A = parseFloat(aStr) / 100;
    } else {
      A = parseFloat(aStr);
    }
  }

  if (isNaN(L) || isNaN(C) || isNaN(H) || isNaN(A)) return null;
  return { L, C, H, A };
}

function parseOklabParts(inner: string) {
  const rawParts = inner.replace(/,/g, ' ').replace(/\//g, ' ').trim().split(/\s+/);
  if (rawParts.length < 3) return null;

  let L = 0;
  if (rawParts[0].endsWith('%')) {
    L = parseFloat(rawParts[0]) / 100;
  } else {
    L = parseFloat(rawParts[0]);
  }

  let a = 0;
  if (rawParts[1].endsWith('%')) {
    a = parseFloat(rawParts[1]) / 100;
  } else {
    a = parseFloat(rawParts[1]);
  }

  let b = 0;
  if (rawParts[2].endsWith('%')) {
    b = parseFloat(rawParts[2]) / 100;
  } else {
    b = parseFloat(rawParts[2]);
  }

  let A = 1;
  if (rawParts[3] !== undefined) {
    const aStr = rawParts[3];
    if (aStr.endsWith('%')) {
      A = parseFloat(aStr) / 100;
    } else {
      A = parseFloat(aStr);
    }
  }

  if (isNaN(L) || isNaN(a) || isNaN(b) || isNaN(A)) return null;
  return { L, a, b, A };
}

const replaceOklchAndOklabInString = (str: string): string => {
  let replaced = str.replace(/oklch\(([^)]+)\)/gi, (match, inner) => {
    const parsed = parseOklchParts(inner);
    if (parsed) {
      return oklchToRgb(parsed.L, parsed.C, parsed.H, parsed.A);
    }
    return match;
  });

  replaced = replaced.replace(/oklab\(([^)]+)\)/gi, (match, inner) => {
    const parsed = parseOklabParts(inner);
    if (parsed) {
      return oklabToRgb(parsed.L, parsed.a, parsed.b, parsed.A);
    }
    return match;
  });

  return replaced;
};

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
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Prevent body scroll when preview is open & handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // 1. Calculations
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const breakevens = trades.filter((t) => t.status === 'BREAKEVEN').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalR = trades.reduce((sum, t) => sum + (t.rr || 0), 0);
  const longs = trades.filter((t) => t.type === 'LONG').length;
  const shorts = trades.filter((t) => t.type === 'SHORT').length;

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const element = reportRef.current;
    if (!element) return null;

    // Keep track of elements with inline styles, stylesheets to restore, and temp elements
    const elementsWithInlineStyles: { el: HTMLElement; originalStyle: string }[] = [];
    const sheetsToRestore: { sheet: CSSStyleSheet; wasDisabled: boolean }[] = [];
    const tempStyleElements: HTMLStyleElement[] = [];
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Temporarily sanitize same-origin stylesheets
      const sheetsSnapshot = Array.from(document.styleSheets);
      for (let i = 0; i < sheetsSnapshot.length; i++) {
        const sheet = sheetsSnapshot[i];
        try {
          if (!sheet.cssRules) continue;
          const rulesArray = Array.from(sheet.cssRules);
          const cssText = rulesArray.map(r => r.cssText).join('\n');
          
          if (cssText.includes('oklch') || cssText.includes('oklab')) {
            const sanitized = replaceOklchAndOklabInString(cssText);
            const tempStyle = document.createElement('style');
            tempStyle.textContent = sanitized;
            document.head.appendChild(tempStyle);
            tempStyleElements.push(tempStyle);
            
            sheetsToRestore.push({ sheet, wasDisabled: sheet.disabled });
            sheet.disabled = true;
          }
        } catch (err) {}
      }

      // 2. Temporarily traverse the DOM tree
      const traverseAndSanitizeInline = (root: HTMLElement) => {
        const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
        const attributesToSanitize = ['style', 'fill', 'stroke', 'stop-color'];
        
        elements.forEach((el) => {
          attributesToSanitize.forEach((attr) => {
            const val = el.getAttribute(attr);
            if (val && (val.includes('oklch') || val.includes('oklab'))) {
              elementsWithInlineStyles.push({ el, originalStyle: `${attr}:${val}` });
              el.setAttribute(attr, replaceOklchAndOklabInString(val));
            }
          });
        });
      };
      traverseAndSanitizeInline(element);

      // 3. Temporarily patch window.getComputedStyle
      window.getComputedStyle = function (el, pseudo) {
        const style = originalGetComputedStyle.call(window, el, pseudo);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchAndOklabInString(val);
                }
                return val;
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return replaceOklchAndOklabInString(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      };

      // Temporarily expand height and force desktop width for consistent mobile rendering
      const originalStyleHeight = element.style.height;
      const originalStyleMaxHeight = element.style.maxHeight;
      const originalStyleWidth = element.style.width;
      const originalStyleMinWidth = element.style.minWidth;
      const originalStyleMaxWidth = element.style.maxWidth;
      const originalStyleTransform = element.style.transform;
      
      element.style.height = 'auto';
      element.style.maxHeight = 'none';
      element.style.width = '896px';
      element.style.minWidth = '896px';
      element.style.maxWidth = '896px';
      element.style.transform = 'none';

      const canvas = await html2canvas(element, {
        scale: 2.0, // 2.0 provides the best balance between high-res quality and mobile memory limits
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#030712',
        logging: false,
        width: 896,
        windowWidth: 896,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        ignoreElements: (element) => element.tagName.toLowerCase() === 'iframe',
      });

      // Restore styling
      element.style.height = originalStyleHeight;
      element.style.maxHeight = originalStyleMaxHeight;
      element.style.width = originalStyleWidth;
      element.style.minWidth = originalStyleMinWidth;
      element.style.maxWidth = originalStyleMaxWidth;
      element.style.transform = originalStyleTransform;

      return canvas;

    } finally {
      // Restore inline styles and attributes
      elementsWithInlineStyles.forEach(({ el, originalStyle }) => {
        const colonIndex = originalStyle.indexOf(':');
        if (colonIndex !== -1) {
          const attrName = originalStyle.slice(0, colonIndex);
          const attrVal = originalStyle.slice(colonIndex + 1);
          el.setAttribute(attrName, attrVal);
        }
      });

      // Restore stylesheets disabled state
      sheetsToRestore.forEach(({ sheet, wasDisabled }) => {
        sheet.disabled = wasDisabled;
      });

      // Remove temporary style elements
      tempStyleElements.forEach((styleEl) => {
        styleEl.remove();
      });

      // Restore original window.getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_islem_raporu.png`;
      link.href = canvas.toDataURL('image/png', 0.85);
      link.click();
      toast.success("Rapor başarıyla indirildi.");
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error("Rapor oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: 'opacity' }}
          className="fixed inset-0 z-[2000] overflow-y-auto bg-zinc-950/80 backdrop-blur-sm no-print flex flex-col justify-start items-center p-4 md:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="w-full max-w-4xl flex flex-col items-center"
          >
            {/* ACTION BAR (STAYS FLOATING OR FIXED, NEVER PRINTS) */}
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Download size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-wide">
                İşlem Raporu Önizleme
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold font-mono tracking-widest uppercase bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl transition-all duration-200 ease-out cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>{isGenerating ? 'Hazırlanıyor...' : 'Görüntü Olarak İndir'}</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700/80 rounded-lg transition-colors duration-200 ease-out cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* PRINTABLE PREVIEW CONTAINER */}
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md flex-1 mb-8 relative">
          {/* Loading overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-zinc-950/80 z-50 flex flex-col items-center justify-center text-zinc-100 font-medium">
              <div className="p-4 bg-zinc-900 text-white rounded-2xl flex flex-col items-center gap-3 shadow-md max-w-xs text-center border border-zinc-800">
                <RefreshCw size={24} className="animate-spin text-blue-400" />
                <div>
                  <h3 className="text-xs font-bold tracking-wider">GÖRÜNTÜ HAZIRLANIYOR</h3>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    İşlem verileri okunuyor ve yüksek çözünürlüklü görüntü oluşturuluyor. Lütfen bekleyin...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Paper Frame (scrollable in preview, perfect dimensions) */}
          <div className="h-[75vh] w-full overflow-auto bg-zinc-950 text-zinc-100 hide-scrollbar">
            
            {/* START OF PRINT REPORT WRAPPER */}
            <div id="print-report-root" ref={reportRef} className="w-full min-w-[896px] min-h-full text-zinc-100 select-text p-8 relative overflow-hidden bg-zinc-950 mx-auto">
              
              <div className="relative z-10">
                {/* Header Branding Section */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-white/10 pb-6 mb-6">
                  <div>
                    <span className="text-[10px] font-black tracking-[0.25em] text-blue-400 uppercase">
                      KURUMSAL PERFORMANS RAPORU
                    </span>
                    <h1 className="text-2xl font-black text-white tracking-tight mt-2.5 drop-shadow-sm">
                      {title}
                    </h1>
                    <div className="flex items-center gap-2.5 mt-3">
                      <div className="text-[10px] font-medium text-blue-400 tracking-wide">
                        İşlem Tarihleri: <span className="text-white font-bold ml-1">{dateRangeText}</span>
                      </div>
                      <div className="text-[10px] font-medium text-emerald-400 tracking-wide">
                        Oluşturulma Tarihi: <span className="text-white font-bold ml-1">{new Date().toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Empty placeholder to maintain layout */}
                  <div className="mt-3 md:mt-0 md:text-right flex flex-col md:items-end">
                    <span className={`font-black text-base tracking-tight ${!isGenerating ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400' : 'text-blue-400'}`}>
                      Trading Journal by Mowtynn
                    </span>
                    <p className="text-[10px] text-zinc-400 font-medium tracking-wide mt-1">
                      Gelişmiş İşlem Takip ve Analiz Sistemi
                    </p>
                  </div>
                </div>

                {/* Grid Metric Cards Dashboard Block */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {/* Total Trades Card */}
                  <div className="border border-white/5 bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-px ${!isGenerating ? 'bg-gradient-to-r from-transparent via-blue-500/50 to-transparent' : 'bg-blue-500/20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Toplam İşlem</span>
                    <span className={`text-2xl font-black drop-shadow-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalTrades}</span>
                    <div className="text-[11px] text-zinc-500 font-medium mt-1">
                      <span className="text-emerald-400">{longs} L</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-rose-400">{shorts} S</span>
                    </div>
                  </div>

                  {/* Win Rate Card */}
                  <div className="border border-white/5 bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-px ${!isGenerating ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-emerald-500/20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kazanma Oranı</span>
                    <span className={`text-2xl font-black drop-shadow-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{winRate.toFixed(1)}%</span>
                    <span className="text-[11px] text-zinc-500 font-medium mt-1">
                      <span className="text-emerald-400">{wins} W</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-rose-400">{losses} L</span> <span className="text-zinc-600 mx-1">/</span> <span className="text-amber-400">{breakevens} BE</span>
                    </span>
                  </div>

                  {/* Net Profit Card */}
                  <div className="border border-white/5 bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-px ${!isGenerating ? 'bg-gradient-to-r from-transparent via-blue-500/50 to-transparent' : 'bg-blue-500/20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Kâr / Zarar</span>
                    <span className={`text-2xl font-black drop-shadow-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalPnl >= 0 ? '+' : ''}
                      {totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium mt-1">Toplam Kazanç</span>
                  </div>

                  {/* Net R multiple Card */}
                  <div className="border border-white/5 bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-px ${!isGenerating ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-emerald-500/20'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net R Kazanımı</span>
                    <span className={`text-2xl font-black drop-shadow-sm ${totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalR >= 0 ? '+' : ''}
                      {totalR.toFixed(2)} R
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium mt-1">Toplam R</span>
                  </div>
                </div>

              {/* Transactions Table Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    İŞLEM GEÇMİŞİ
                  </h3>
                  <span className="text-[9px] font-medium text-zinc-400">
                    Toplam {trades.length} işlem
                  </span>
                </div>

                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-200 font-semibold border-b border-zinc-800">
                        <th className="py-2 px-3 font-bold">Tarih</th>
                        <th className="py-2 px-2 font-bold">Parite</th>
                        <th className="py-2 px-2 font-bold text-center">Yön</th>
                        <th className="py-2 px-2 font-bold text-center">Sonuç</th>
                        <th className="py-2 px-2 font-bold text-center">R</th>
                        <th className="py-2 px-3 font-bold text-right">P&L</th>
                        <th className="py-2 px-2 font-bold text-right">Platform</th>
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
                          const dateStr = dateObj.toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          const isWin = trade.status === 'WIN';
                          const isLoss = trade.status === 'LOSS';
                          const isBe = trade.status === 'BREAKEVEN';

                          return (
                            <tr key={trade.id} className="hover:bg-zinc-900 transition-colors">
                              {/* Date */}
                              <td className="py-2 px-3 text-zinc-400 font-medium font-mono whitespace-nowrap">
                                {dateStr}
                              </td>
                              
                              {/* Asset */}
                              <td className="py-2 px-2 font-bold text-zinc-100 uppercase">
                                {trade.asset}
                              </td>

                              {/* Direction (Yön) */}
                              <td className="py-2 px-2 text-center whitespace-nowrap">
                                {trade.type === 'LONG' ? (
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono">LONG</span>
                                ) : (
                                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider font-mono">SHORT</span>
                                )}
                              </td>

                              {/* Result Status */}
                              <td className="py-2 px-2 text-center whitespace-nowrap">
                                {isWin ? (
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono">WIN</span>
                                ) : isLoss ? (
                                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider font-mono">LOSS</span>
                                ) : isBe ? (
                                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono">BE</span>
                                ) : (
                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider font-mono">AÇIK</span>
                                )}
                              </td>

                              {/* R multiple */}
                              <td className="py-2 px-2 text-center font-mono font-bold whitespace-nowrap">
                                {trade.rr !== undefined && trade.rr !== null && trade.rr !== 0 ? (
                                  trade.rr > 0 ? (
                                    <span className="text-[10px] font-black text-emerald-400 tracking-wider">
                                      +{trade.rr}R
                                    </span>
                                  ) : trade.rr < 0 ? (
                                    <span className="text-[10px] font-black text-rose-400 tracking-wider">
                                      {trade.rr}R
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black text-zinc-400 tracking-wider">
                                      {trade.rr}R
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] font-medium text-zinc-500">—</span>
                                )}
                              </td>

                              {/* Profit and Loss */}
                              <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                <span
                                  className={
                                    isWin
                                      ? 'text-emerald-400 font-black'
                                      : isLoss
                                      ? 'text-rose-400 font-black'
                                      : 'text-zinc-500 font-bold'
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
                              <td className="py-2 px-2 text-right text-zinc-500 font-semibold uppercase font-mono">
                                {trade.platform || '—'}
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
        </div>
      </motion.div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
