import { EASE } from '../../lib/motion';
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

export const MemoizedEquityChart = React.memo(function MemoizedEquityChart({ 
  chartEquityCurve, 
  equityFilter, 
  setSelectedEquityPoint 
}: { 
  chartEquityCurve: any[]; 
  equityFilter: string; 
  setSelectedEquityPoint: (val: any) => void; 
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  

    const chartData = useMemo(() => {
      const values = (chartEquityCurve || []).map((d: any) => (d.cumulativePnl ?? 0));
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
        ...(chartEquityCurve || []).map((pt: any, i: number) => ({
          x: padding + ((i + 1) / curveLen) * (width - 2 * padding),
          y: height - padding - ((((pt?.cumulativePnl ?? 0)) - minVal) / range) * (height - 2 * padding)
        }))
      ];

      const smaPts = [
        { x: 20, y: height - padding - ((0 - minVal) / range) * (height - 2*padding) },
        ...(chartEquityCurve || []).map((pt: any, i: number) => {
          const rawVal = (pt?.cumulativePnl ?? 0);
          const smaVal = (pt?.sma10 ?? rawVal);
          return {
            x: padding + ((i + 1) / curveLen) * (width - 2 * padding),
            y: height - padding - (((smaVal ?? rawVal) - minVal) / range) * (height - 2 * padding)
          };
        })
      ];
      const smaPointsStr = smaPts.map(p => p.x + "," + p.y).join(" ");
      const pointsStr = pts.map(p => p.x + "," + p.y).join(" ");

      const peakPts = pts.map((p, i) => {
        if (i === 0) return { x: p.x, y: p.y };
        const pt = chartEquityCurve?.[i - 1] as any;
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
      <div className="space-y-2 flex-1 flex flex-col relative">
        <div className="relative bg-zinc-900/70 border border-zinc-700/50  rounded-2xl overflow-visible flex-1 min-h-[180px]">
          <svg viewBox="0 0 600 180" className="absolute inset-0 w-full h-full text-cyan-500 p-2" preserveAspectRatio="none">
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
               const item = chartEquityCurve[i] as any;
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
                  <span className="text-zinc-400 font-medium font-sans">Kümülatif R:</span>
                  <span className={`font-black font-sans text-xs ${(hoveredItem.cumulativePnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {`${hoveredItem.cumulativePnl >= 0 ? '+' : ''}${hoveredItem.cumulativePnl.toFixed(2)} R`}
                  </span>
                </div>

                {(() => {
                  const prevItem = hoveredIndex > 0 ? chartEquityCurve[hoveredIndex - 1] : { cumulativePnl: 0 };
                  const diffPnl = hoveredItem.cumulativePnl - prevItem.cumulativePnl;
                  const isPositive = diffPnl >= 0;
                  return (
                    <div className="flex justify-between items-center text-xs pt-1 mt-0.5 border-t border-zinc-800/50">
                      <span className="text-zinc-500 font-medium font-sans">Değişim:</span>
                      <span className={`font-black font-sans text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {`${isPositive ? '+' : ''}${diffPnl.toFixed(2)} R`}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-bold">Drawdown</span>
                  <span className="text-rose-400/80 font-black font-sans">
                    {`${(hoveredItem.drawdown ?? 0).toFixed(2)} R`}
                  </span>
                </div>

                {hoveredItem.trades && hoveredItem.trades.length > 1 && (() => {
                  const wins = hoveredItem.trades.filter((t: any) => t.status === 'WIN').length;
                  const losses = hoveredItem.trades.length - wins;
                  return (
                    <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5 mt-0.5">
                      <span className="text-zinc-500 font-bold">İşlemler</span>
                      <span className="text-zinc-300 font-black font-sans">
                        {hoveredItem.trades.length} (<span className="text-emerald-400">{wins}W</span>/<span className="text-rose-400">{losses}L</span>)
                      </span>
                    </div>
                  );
                })()}

                {hoveredItem.trades && hoveredItem.trades.length === 1 && equityFilter !== 'trade' && (
                  <div className="flex justify-between items-center text-xs border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-bold">İşlemler</span>
                    <span className="text-zinc-300 font-black font-sans">1</span>
                  </div>
                )}

                {equityFilter === 'trade' && hoveredItem.trades && hoveredItem.trades.length === 1 && (
                  <div className="flex justify-between items-center text-[10px] border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-bold">Parite</span>
                    <span className="text-zinc-400 font-bold font-sans">
                      {hoveredItem.trades[0].asset} <span className={hoveredItem.trades[0].type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>({hoveredItem.trades[0].type})</span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-400 font-sans px-1">
          <span>Günlük Başlangıcı (0.00 R)</span>
          <div className="flex gap-2.5 overflow-x-auto max-w-[70%] scrollbar-none justify-end">
            {(() => {
              const totalPoints = chartEquityCurve.length;
              const maxLabels = 15;
              if (totalPoints <= maxLabels) {
                return chartEquityCurve.map((d: any, i: number) => (
                  <span 
                    key={i} 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (d.trades && d.trades.length > 0) {
                        setSelectedEquityPoint({
                          title: d.fullTitle || d.label || "İşlem Geçmişi",
                          trades: d.trades
                        });
                      }
                    }}
                    className="shrink-0 bg-zinc-800/30 border border-transparent hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    {d.label}
                  </span>
                ));
              } else {
                const step = Math.ceil(totalPoints / maxLabels);
                const sampled: any[] = [];
                for (let i = 0; i < totalPoints; i += step) {
                  sampled.push({ item: chartEquityCurve[i], index: i });
                }
                if (sampled.length > 0 && sampled[sampled.length - 1].index !== totalPoints - 1) {
                  sampled.push({ item: chartEquityCurve[totalPoints - 1], index: totalPoints - 1 });
                }
                return sampled.map(({ item, index }) => (
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
                    className="shrink-0 bg-zinc-800/30 border border-transparent hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    {item.label}
                  </span>
                ));
              }
            })()}
          </div>
        </div>
      </div>
    );
});
