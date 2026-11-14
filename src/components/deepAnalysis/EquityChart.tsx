import { EASE } from '../../lib/motion';
import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatR } from "../../lib/format";
import type { Trade } from "../../types";

/** Eğrinin bir noktası (işlem, gün, hafta ya da ay): o ana kadarki kümülatif R ve noktaya düşen işlemler */
export interface EquityChartPoint {
  label: string;
  fullTitle: string;
  cumulativePnl: number;
  drawdown: number;
  trades: Trade[];
}

export const MemoizedEquityChart = React.memo(function MemoizedEquityChart({ 
  chartEquityCurve, 
  equityFilter, 
  setSelectedEquityPoint 
}: { 
  chartEquityCurve: EquityChartPoint[];
  equityFilter: string;
  setSelectedEquityPoint: (val: { title: string; trades: Trade[] } | null) => void;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Eksen etiketleri: şeridin genişliğine sığacak kadar, döneme eşit yayılmış nokta (ilk ve son dahil).
    // Sabit 15 etiket şeride sığmıyor, baştaki tarihler görünmüyor ve biri yarım kesiliyordu.
    const stripRef = useRef<HTMLDivElement>(null);
    const [stripWidth, setStripWidth] = useState(0);
    useEffect(() => {
      const el = stripRef.current;
      if (!el) return;
      const measure = () => setStripWidth(Math.round(el.getBoundingClientRect().width));
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    const axisLabels = useMemo(() => {
      const list = chartEquityCurve || [];
      const total = list.length;
      if (total === 0) return [] as { item: EquityChartPoint; index: number }[];
      const longest = list.reduce((m: number, d: EquityChartPoint) => Math.max(m, String(d?.label ?? '').length), 1);
      const perLabel = longest * 6.8 + 16 + 2 + 10; // 12px yazı + yatay iç boşluk + kenarlık + aralık
      const fit = stripWidth > 0 ? Math.floor((stripWidth + 10) / perLabel) : 6;
      const count = Math.max(1, Math.min(15, fit, total));
      if (count >= total) return list.map((item: EquityChartPoint, index: number) => ({ item, index }));
      if (count === 1) return [{ item: list[total - 1], index: total - 1 }];
      const out: { item: EquityChartPoint; index: number }[] = [];
      for (let k = 0; k < count; k++) {
        const index = Math.round((k * (total - 1)) / (count - 1));
        if (!out.length || out[out.length - 1].index !== index) out.push({ item: list[index], index });
      }
      return out;
    }, [chartEquityCurve, stripWidth]);

  

    const chartData = useMemo(() => {
      const values = (chartEquityCurve || []).map((d) => (d.cumulativePnl ?? 0));
      let maxVal = 0;
      let minVal = 0;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
      const range = (maxVal - minVal) || 1;
      const width = 600, height = 180, padding = 20;
      const curveLen = values.length > 0 ? values.length : 1;

      const pts = [
        { x: 20, y: height - padding - ((0 - minVal) / range) * (height - 2*padding) },
        ...(chartEquityCurve || []).map((pt, i: number) => ({
          x: padding + ((i + 1) / curveLen) * (width - 2 * padding),
          y: height - padding - ((((pt?.cumulativePnl ?? 0)) - minVal) / range) * (height - 2 * padding)
        }))
      ];

      // Kesikli çizgi: kümülatif R'nin 10 noktalık hareketli ortalaması (eğrinin genel yönü). Önceden ortalama hiç
      // hesaplanmıyordu ve kesikli çizgi eğrinin tam üstüne çiziliyordu.
      const cum = (chartEquityCurve || []).map((pt) => pt?.cumulativePnl ?? 0);
      const smaPts = [
        { x: 20, y: height - padding - ((0 - minVal) / range) * (height - 2*padding) },
        ...cum.map((_, i: number) => {
          const from = Math.max(0, i - 9);
          let sum = 0;
          for (let k = from; k <= i; k++) sum += cum[k];
          const smaVal = sum / (i - from + 1);
          return {
            x: padding + ((i + 1) / curveLen) * (width - 2 * padding),
            y: height - padding - ((smaVal - minVal) / range) * (height - 2 * padding)
          };
        })
      ];
      const smaPointsStr = smaPts.map(p => p.x + "," + p.y).join(" ");
      const pointsStr = pts.map(p => p.x + "," + p.y).join(" ");

      const peakPts = pts.map((p, i) => {
        if (i === 0) return { x: p.x, y: p.y };
        const pt = chartEquityCurve?.[i - 1];
        const peakPnl = ((pt?.cumulativePnl ?? 0)) - ((pt?.drawdown ?? 0));
        const peakY = height - padding - ((peakPnl - minVal) / range) * (height - 2 * padding);
        return { x: p.x, y: peakY };
      });
      const peakPathStr = peakPts.map(p => p.x + "," + p.y).join(" L ");
      const equityPathStr = [...pts].reverse().map(p => p.x + "," + p.y).join(" L ");
      const underwaterPathStr = `M ${peakPathStr} L ${equityPathStr} Z`;

      return { pts, smaPts, smaPointsStr, pointsStr, underwaterPathStr };
    }, [chartEquityCurve]);

    const { pts, smaPointsStr, pointsStr, underwaterPathStr } = chartData;
    const hoveredPt = hoveredIndex !== null ? pts[hoveredIndex + 1] : null;
    const hoveredItem = hoveredIndex !== null ? chartEquityCurve[hoveredIndex] : null;

    return (
      <div className="space-y-1.5 flex-1 flex flex-col relative">
        {/* Masaüstünde eğri yüksekliği ekran yüksekliğine uyar (160–240px): Genel Bakış kaydırmadan sığsın.
            704px = sayfanın geri kalanı (üst menüler + diğer bölümler + alt boşluk); bölüm yükseklikleri değişirse güncelle. */}
        <div className="relative bg-zinc-900/70 border border-zinc-700/50  rounded-2xl overflow-visible h-[200px] sm:h-[230px] lg:h-[clamp(160px,calc(100dvh_-_704px),240px)]">
          <svg viewBox="0 0 600 180" className="absolute inset-0 w-full h-full text-blue-500 p-2" preserveAspectRatio="none">
            <line x1="0" y1="20" x2="600" y2="20" stroke="#0f172a" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="90" x2="600" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1="160" x2="600" y2="160" stroke="#1f1f1f" strokeWidth="1" strokeDasharray="3,3" />

            <path d={underwaterPathStr} fill="url(#gradient-drawdown)" opacity="0.3" />
            <path d={"M 20,160 L " + pointsStr + " L " + pts[pts.length-1].x + ",160 Z"} fill="url(#gradient-pnl)" opacity="0.12" />
            <polyline fill="none" stroke="#71717a" strokeWidth="1.5" points={smaPointsStr} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,4" />
            <polyline fill="none" stroke="#60a5fa" strokeWidth="2.5" points={pointsStr} strokeLinecap="round" strokeLinejoin="round" />
            {pts.slice(1).map((p, i) => {
               const totalPoints = chartEquityCurve.length;
               const maxCircles = 80;
               if (totalPoints > maxCircles) {
                 const step = Math.ceil(totalPoints / maxCircles);
                 if (i % step !== 0 && i !== totalPoints - 1) {
                   return null;
                 }
               }
               const item = chartEquityCurve[i];
               return (
                 <g
                   key={i}
                   onClick={(e) => {
                     e.stopPropagation();
                     if (item?.trades && item.trades.length > 0) {
                       setSelectedEquityPoint({
                         title: item.fullTitle || item.label || "İşlem Geçmişi",
                         trades: item.trades
                       });
                     }
                   }}
                   onMouseEnter={() => {
                      setHoveredIndex(i);
                   }}
                   onMouseLeave={() => {
                      setHoveredIndex(null);
                   }}
                   className="cursor-pointer"
                 >
                   <circle 
                     cx={p.x} 
                     cy={p.y} 
                     r="15" 
                     fill="transparent"
                   />
                   <circle 
                     cx={p.x} 
                     cy={p.y} 
                     r={hoveredIndex === i ? "6" : "4"} 
                     className="fill-zinc-800 stroke-blue-400 transition-colors" 
                     strokeWidth="2.5"
                   />
                 </g>
               );
            })}

            <defs>
              <linearGradient id="gradient-pnl" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3ea6ff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradient-drawdown" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <AnimatePresence>
            {hoveredPt && hoveredItem && (
              <motion.div
                key="chart-hover-tooltip"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: EASE }}
                style={{
                  left: `${(hoveredPt.x / 600) * 100}%`,
                  top: `${(hoveredPt.y / 180) * 100}%`
                }}
                className={`absolute pointer-events-none z-50 min-w-[160px] bg-zinc-950/95  border border-zinc-800/80 rounded-lg p-2.5 shadow-2xl flex flex-col gap-1.5 ${
                  hoveredPt.x < 110 
                    ? "translate-x-[4%] -translate-y-[calc(100%+14px)]" 
                    : hoveredPt.x > 490 
                      ? "-translate-x-[104%] -translate-y-[calc(100%+14px)]" 
                      : "-translate-x-1/2 -translate-y-[calc(100%+14px)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-1.5 mb-0.5">
                  <span className="text-xs text-zinc-200 font-bold font-sans truncate max-w-[140px]">
                    {hoveredItem.fullTitle || hoveredItem.label}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-lg toggle-item-brand border border-blue-500/20 shrink-0 font-sans shadow-xs">
                    {equityFilter === 'trade' ? 'İşlem' : equityFilter === 'daily' ? 'Gün' : equityFilter === 'weekly' ? 'Hafta' : 'Ay'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-zinc-500 font-medium font-sans">Kümülatif R</span>
                  <span className={`font-black font-sans text-xs tabular-nums ${hoveredItem.cumulativePnl > 0 ? 'text-emerald-400' : hoveredItem.cumulativePnl < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                    {formatR(hoveredItem.cumulativePnl)}
                  </span>
                </div>

                {(() => {
                  const prevItem = hoveredIndex > 0 ? chartEquityCurve[hoveredIndex - 1] : { cumulativePnl: 0 };
                  const diffPnl = hoveredItem.cumulativePnl - prevItem.cumulativePnl;
                  return (
                    <div className="flex justify-between items-center text-xs pt-1 mt-0.5 border-t border-zinc-800/50">
                      <span className="text-zinc-500 font-medium font-sans">Değişim</span>
                      <span className={`font-black font-sans text-xs tabular-nums ${diffPnl > 0 ? 'text-emerald-400' : diffPnl < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {formatR(diffPnl)}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-medium font-sans">Drawdown</span>
                  <span className={`font-black font-sans tabular-nums ${(hoveredItem.drawdown ?? 0) !== 0 ? 'text-rose-400/80' : 'text-zinc-400'}`}>
                    {formatR(hoveredItem.drawdown ?? 0)}
                  </span>
                </div>

                {hoveredItem.trades && hoveredItem.trades.length > 1 && (() => {
                  // BE işlemler kayıp sayılmaz: ayrı gösterilir
                  const wins = hoveredItem.trades.filter((t) => t.status === 'WIN').length;
                  const losses = hoveredItem.trades.filter((t) => t.status === 'LOSS').length;
                  const bes = hoveredItem.trades.length - wins - losses;
                  return (
                    <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5 mt-0.5">
                      <span className="text-zinc-500 font-medium font-sans">İşlemler</span>
                      <span className="text-zinc-300 font-black font-sans tabular-nums">
                        {hoveredItem.trades.length} (<span className="text-emerald-400">{wins}W</span>/<span className="text-rose-400">{losses}L</span>{bes > 0 && <>/<span className="text-zinc-400">{bes}BE</span></>})
                      </span>
                    </div>
                  );
                })()}

                {hoveredItem.trades && hoveredItem.trades.length === 1 && equityFilter !== 'trade' && (
                  <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-medium font-sans">İşlemler</span>
                    <span className="text-zinc-300 font-black font-sans">1</span>
                  </div>
                )}

                {equityFilter === 'trade' && hoveredItem.trades && hoveredItem.trades.length === 1 && (
                  <div className="flex justify-between items-center text-[10px] border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-medium font-sans">Parite</span>
                    <span className="text-zinc-400 font-bold font-sans">
                      {hoveredItem.trades[0].asset} <span className={hoveredItem.trades[0].type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>({hoveredItem.trades[0].type})</span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center gap-3 text-xs text-zinc-400 font-sans px-1">
          <span className="shrink-0 whitespace-nowrap"><span className="hidden sm:inline">Günlük Başlangıcı </span>(0R)</span>
          {/* Sağdan sola dizilir: ölçüm tutmazsa en eski etiket alt satıra düşer ve gizlenir, hiçbir etiket yarım kesilmez */}
          <div ref={stripRef} className="flex-1 min-w-0 h-[22px] overflow-hidden flex flex-row-reverse flex-wrap gap-x-2.5 gap-y-2">
            {[...axisLabels].reverse().map(({ item, index }) => (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.trades && item.trades.length > 0) {
                    setSelectedEquityPoint({
                      title: item.fullTitle || item.label || "İşlem Geçmişi",
                      trades: item.trades
                    });
                  }
                }}
                className="shrink-0 whitespace-nowrap bg-zinc-800/30 border border-transparent hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
});
