import React, { useState, useMemo, useEffect, useDeferredValue } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ValueTransition } from "./ValueTransition";
import { calculateProfitFactor, calculateExpectancy, calculateSortinoRatio, calculateKellyCriterion, calculateRecoveryFactor, toRR } from "../lib/statMath";
import { calculateSQN } from "../utils/math";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_DEFINITION_TITLES } from "../constants/constants";
import { useMetricMode } from "../context/MetricContext";
import {
  LineChart,
  Target,
  Filter,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Crosshair
} from "lucide-react";
import { MetricDetailModal, MetricDetail } from "./MetricDetailModal";
import { metricDetailsDict } from "../config/metricDetails";
import { NewDeepAnalysisMetrics } from "./NewDeepAnalysisMetrics";
import { AdvancedMetricsDashboard } from "./AdvancedMetricsDashboard";
import { CalendarView } from "./CalendarView";
import { PrintReportModal } from "./PrintReportModal";
import { TradeHistoryModal } from "./TradeHistoryModal";

interface DeepAnalysisProps {
  trades: Trade[];
  onViewDetails: (trade: Trade) => void;
  onEdit?: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  currency: string;
  sessions?: string[];
  definitionTitles?: DefinitionTitles;
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
}


const MemoizedEquityChart = React.memo(function MemoizedEquityChart({ 
  chartEquityCurve, 
  isRrMode, 
  currency, 
  equityFilter, 
  setSelectedEquityPoint 
}: { 
  chartEquityCurve: any[]; 
  isRrMode: boolean; 
  currency: string; 
  equityFilter: string; 
  setSelectedEquityPoint: (val: any) => void; 
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  

    const chartData = useMemo(() => {
      const values = (chartEquityCurve || []).map((d: any) => isRrMode ? (d.cumulativePnl ?? 0) : (d.cumulativeRealPnl ?? 0));
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
          y: height - padding - (((isRrMode ? (pt?.cumulativePnl ?? 0) : (pt?.cumulativeRealPnl ?? 0)) - minVal) / range) * (height - 2 * padding)
        }))
      ];

      const smaPts = [
        { x: 20, y: height - padding - ((0 - minVal) / range) * (height - 2*padding) },
        ...(chartEquityCurve || []).map((pt: any, i: number) => {
          const rawVal = isRrMode ? (pt?.cumulativePnl ?? 0) : (pt?.cumulativeRealPnl ?? 0);
          const smaVal = isRrMode ? (pt?.sma10 ?? rawVal) : (pt?.realSma10 ?? rawVal);
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
        const peakPnl = (isRrMode ? (pt?.cumulativePnl ?? 0) : (pt?.cumulativeRealPnl ?? 0)) - (isRrMode ? (pt?.drawdown ?? 0) : (pt?.realDrawdown ?? 0));
        const peakY = height - padding - ((peakPnl - minVal) / range) * (height - 2 * padding);
        return { x: p.x, y: peakY };
      });
      const peakPathStr = peakPts.map(p => p.x + "," + p.y).join(" L ");
      const equityPathStr = [...pts].reverse().map(p => p.x + "," + p.y).join(" L ");
      const underwaterPathStr = `M ${peakPathStr} L ${equityPathStr} Z`;

      return { pts, smaPts, smaPointsStr, pointsStr, underwaterPathStr };
    }, [chartEquityCurve, isRrMode]);

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
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
                  <span className="text-zinc-400 font-medium font-sans">Kümülatif {isRrMode ? 'RR' : 'PnL'}:</span>
                  <span className={`font-black font-sans text-xs ${(isRrMode ? hoveredItem.cumulativePnl : hoveredItem.cumulativeRealPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRrMode 
                      ? `${hoveredItem.cumulativePnl >= 0 ? '+' : ''}${hoveredItem.cumulativePnl.toFixed(2)} R` 
                      : `${hoveredItem.cumulativeRealPnl >= 0 ? '+' : ''}${hoveredItem.cumulativeRealPnl.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                    }
                  </span>
                </div>

                {(() => {
                  const prevItem = hoveredIndex > 0 ? chartEquityCurve[hoveredIndex - 1] : { cumulativePnl: 0, cumulativeRealPnl: 0 };
                  const diffPnl = hoveredItem.cumulativePnl - prevItem.cumulativePnl;
                  const diffRealPnl = hoveredItem.cumulativeRealPnl - prevItem.cumulativeRealPnl;
                  const isPositive = isRrMode ? diffPnl >= 0 : diffRealPnl >= 0;
                  return (
                    <div className="flex justify-between items-center text-xs pt-1 mt-0.5 border-t border-zinc-800/50">
                      <span className="text-zinc-500 font-medium font-sans">Değişim:</span>
                      <span className={`font-black font-sans text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isRrMode 
                          ? `${isPositive ? '+' : ''}${diffPnl.toFixed(2)} R` 
                          : `${isPositive ? '+' : ''}${diffRealPnl.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                        }
                      </span>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-bold">Drawdown</span>
                  <span className="text-rose-400/80 font-black font-sans">
                    {isRrMode 
                      ? `${(hoveredItem.drawdown ?? 0).toFixed(2)} R` 
                      : `${(hoveredItem.realDrawdown ?? 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                    }
                  </span>
                </div>

                {hoveredItem.trades && hoveredItem.trades.length > 1 && (() => {
                  const wins = hoveredItem.trades.filter((t: any) => t.pnl > 0).length;
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


const DeepAnalysisInner = React.memo(function DeepAnalysisInner({
  trades,
  onEdit,
  currency,
  sessions = [],
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  planFidelities = [],
}: DeepAnalysisProps) {
  const { isRrMode } = useMetricMode();
  const deferredTrades = useDeferredValue(trades);
  const [selectedMetric, setSelectedMetric] = useState<MetricDetail | null>(null);
  const [equityFilter, setEquityFilter] = useState<'trade' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [isEquityFilterOpen, setIsEquityFilterOpen] = useState(false);
  const [selectedEquityPoint, setSelectedEquityPoint] = useState<{ title: string; trades: Trade[] } | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    trades: Trade[];
    title: string;
    dateRangeText?: string;
  }>({
    isOpen: false,
    trades: [],
    title: '',
    dateRangeText: ''
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedTrade) {
          setSelectedTrade(null);
        } else if (selectedEquityPoint) {
          setSelectedEquityPoint(null);
        } else if (selectedMetric) {
          setSelectedMetric(null);
        } else if (isEquityFilterOpen) {
          setIsEquityFilterOpen(false);
        }
      }
    };
    if (selectedEquityPoint || selectedTrade || selectedMetric || isEquityFilterOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEquityPoint, selectedTrade, selectedMetric, isEquityFilterOpen]);

  const handleMetricClick = React.useCallback((metricId: string, customValue: string | number, customDef?: Partial<MetricDetail>) => {
    const def = metricDetailsDict[metricId];
    if (def) {
      setSelectedMetric({ id: metricId, value: customValue, ...def, ...(customDef || {}) });
    } else if (customDef) {
      setSelectedMetric({
        id: metricId,
        value: customValue,
        title: customDef.title || metricId,
        description: customDef.description || "",
        type: customDef.type || "neutral",
        icon: customDef.icon || Crosshair,
        details: customDef.details || []
      });
    }
  }, []);

  const closedTrades = useMemo(() => {
    return [...trades].sort((a, b) => a.createdAt - b.createdAt);
  }, [trades]);

  const metrics = useMemo(() => {
    let totalR = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    let longCount = 0;
    let longWins = 0;
    let longPnl = 0;
    let shortCount = 0;
    let shortWins = 0;
    let shortPnl = 0;

    let bestTrade: Trade | null = null;
    let worstTrade: Trade | null = null;

    const dayOfWeekPnL = [
      { day: "Pazartesi", pnl: 0, realPnl: 0, count: 0 },
      { day: "Salı", pnl: 0, realPnl: 0, count: 0 },
      { day: "Çarşamba", pnl: 0, realPnl: 0, count: 0 },
      { day: "Perşembe", pnl: 0, realPnl: 0, count: 0 },
      { day: "Cuma", pnl: 0, realPnl: 0, count: 0 },
      { day: "Cumartesi", pnl: 0, realPnl: 0, count: 0 },
      { day: "Pazar", pnl: 0, realPnl: 0, count: 0 },
    ];

    const assetMap: Record<string, { count: number; wins: number; pnl: number; realPnl: number; longCount: number; longWins: number; shortCount: number; shortWins: number; }> = {};

    const planFidelityMap: Record<string, { count: number; wins: number; losses: number; be: number; totalR: number; totalPnl: number }> = {};
    let totalWithFidelity = 0;
    let highQualityCount = 0;
    let highQualityWins = 0;
    let highQualityLosses = 0;
    let highQualityR = 0;
    let lowQualityCount = 0;
    let lowQualityWins = 0;
    let lowQualityLosses = 0;
    let lowQualityR = 0;

    let fridayCount = 0;
    let fridayWins = 0;
    let fridayPnl = 0;
    let monThuCount = 0;
    let monThuWins = 0;
    let monThuPnl = 0;

    let reversalCount = 0;
    let reversalWins = 0;
    let reversalPnl = 0;
    let prevTrade: Trade | null = null;

    let runningPnl = 0;
    let runningRealPnl = 0;
    let runningPeak = 0;
    let runningRealPeak = 0;

    const equityCurve = closedTrades.map((t) => {
      runningPnl += t.rr || 0;
      runningRealPnl += t.pnl || 0;
      
      runningPeak = Math.max(runningPeak, runningPnl);
      runningRealPeak = Math.max(runningRealPeak, runningRealPnl);
      
      const drawdown = runningPnl - runningPeak;
      const realDrawdown = runningRealPnl - runningRealPeak;
      
      const label = new Date(t.createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      });

      if (prevTrade && t.type !== prevTrade.type) {
        reversalCount++;
        reversalPnl += t.rr || 0;
        if (t.status === "WIN") reversalWins++;
      }
      prevTrade = t;

      const dayRaw = new Date(t.createdAt).getDay();
      if (dayRaw === 5) {
        fridayCount++;
        fridayPnl += t.rr || 0;
        if (t.status === "WIN") fridayWins++;
      } else if (dayRaw >= 1 && dayRaw <= 4) {
        monThuCount++;
        monThuPnl += t.rr || 0;
        if (t.status === "WIN") monThuWins++;
      }

      return {
        timestamp: t.createdAt,
        label,
        cumulativePnl: runningPnl,
        cumulativeRealPnl: runningRealPnl,
        sma10: 0,
        realSma10: 0,
        drawdown,
        realDrawdown,
        trade: t,
      };
    });

    let runningSmaSum = 0;
    let runningRealSmaSum = 0;
    for (let idx = 0; idx < equityCurve.length; idx++) {
      const pt = equityCurve[idx];
      runningSmaSum += pt.cumulativePnl;
      runningRealSmaSum += pt.cumulativeRealPnl;
      if (idx >= 10) {
        runningSmaSum -= equityCurve[idx - 10].cumulativePnl;
        runningRealSmaSum -= equityCurve[idx - 10].cumulativeRealPnl;
      }
      const count = Math.min(idx + 1, 10);
      pt.sma10 = runningSmaSum / count;
      pt.realSma10 = runningRealSmaSum / count;
    }

    closedTrades.forEach((t) => {
      totalR += t.rr || 0;

      if (t.status === "WIN") {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (t.status === "LOSS") {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      if (t.type === "LONG") {
        longCount++;
        longPnl += t.rr || 0;
        if (t.status === "WIN") longWins++;
      } else {
        shortCount++;
        shortPnl += t.rr || 0;
        if (t.status === "WIN") shortWins++;
      }

      if (!bestTrade || (t.rr || 0) > (bestTrade.rr || 0)) {
        bestTrade = t;
      }
      if (!worstTrade || (t.rr || 0) < (worstTrade.rr || 0)) {
        worstTrade = t;
      }

      const dateVal = new Date(t.createdAt);
      const rawDay = dateVal.getDay();
      const dayIdx = rawDay === 0 ? 6 : rawDay - 1;
      dayOfWeekPnL[dayIdx].pnl += t.rr || 0;
      dayOfWeekPnL[dayIdx].realPnl += t.pnl || 0;
      dayOfWeekPnL[dayIdx].count += 1;

      if (!assetMap[t.asset]) {
        assetMap[t.asset] = {
          count: 0,
          wins: 0,
          pnl: 0,
          realPnl: 0,
          longCount: 0,
          longWins: 0,
          shortCount: 0,
          shortWins: 0,
        };
      }
      assetMap[t.asset].count++;
      assetMap[t.asset].pnl += t.rr || 0;
      assetMap[t.asset].realPnl += t.pnl || 0;
      if (t.status === "WIN") assetMap[t.asset].wins++;

      if (t.type === "LONG") {
        assetMap[t.asset].longCount++;
        if (t.status === "WIN") assetMap[t.asset].longWins++;
      } else {
        assetMap[t.asset].shortCount++;
        if (t.status === "WIN") assetMap[t.asset].shortWins++;
      }

      const pf = (t.planFidelity || "").trim();
      if (pf) {
        totalWithFidelity++;
        if (!planFidelityMap[pf]) {
          planFidelityMap[pf] = { count: 0, wins: 0, losses: 0, be: 0, totalR: 0, totalPnl: 0 };
        }
        planFidelityMap[pf].count++;
        if (t.status === "WIN") planFidelityMap[pf].wins++;
        else if (t.status === "LOSS") planFidelityMap[pf].losses++;
        else planFidelityMap[pf].be++;
        planFidelityMap[pf].totalR += t.rr || 0;
        planFidelityMap[pf].totalPnl += t.pnl || 0;

        const lowerPf = pf.toLowerCase();
        if (
          lowerPf.includes("tam") ||
          lowerPf.includes("a+") ||
          lowerPf === "a" ||
          lowerPf.includes("kusursuz") ||
          lowerPf.includes("disiplinli") ||
          lowerPf.includes("yüksek") ||
          lowerPf.includes("high") ||
          lowerPf.includes("ideal")
        ) {
          highQualityCount++;
          if (t.status === "WIN") highQualityWins++;
          else if (t.status === "LOSS") highQualityLosses++;
          highQualityR += t.rr || 0;
        } else {
          lowQualityCount++;
          if (t.status === "WIN") lowQualityWins++;
          else if (t.status === "LOSS") lowQualityLosses++;
          lowQualityR += t.rr || 0;
        }
      }
    });

    const defaultOptions = ["Tam", "Kısmen", "FOMO"];
    const baseList = (planFidelities && planFidelities.length > 0) ? planFidelities : defaultOptions;
    
    // Merge configured options with any options found in trades while preserving unique order
    const allOptionNames: string[] = [];
    baseList.forEach(item => {
      const trimmed = (item || "").trim();
      if (trimmed && !allOptionNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
        allOptionNames.push(trimmed);
      }
    });
    Object.keys(planFidelityMap).forEach(key => {
      const trimmed = (key || "").trim();
      if (trimmed && !allOptionNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
        allOptionNames.push(trimmed);
      }
    });

    const getOptionTheme = (name: string): { border: string; bg: string; text: string; bar: string; badge: string; type: 'positive' | 'negative' | 'neutral' } => {
      const lower = name.toLowerCase();
      if (
        lower === "tam" ||
        lower.includes("tam") ||
        lower.includes("a+") ||
        lower === "a" ||
        lower.includes("kusursuz") ||
        lower.includes("disiplinli") ||
        lower.includes("yüksek") ||
        lower.includes("high") ||
        lower.includes("ideal") ||
        lower.includes("uygun")
      ) {
        return {
          border: "border-emerald-500/25 hover:border-emerald-500/50",
          bg: "bg-zinc-950/60 hover:bg-emerald-950/20",
          text: "text-emerald-400",
          bar: "bg-emerald-500",
          badge: "text-emerald-400/80",
          type: 'positive'
        };
      }
      if (
        lower === "kısmen" ||
        lower.includes("kısmen") ||
        lower.includes("kısmi") ||
        lower.includes("partial") ||
        lower.includes("orta") ||
        lower === "b" ||
        lower.includes("medium")
      ) {
        return {
          border: "border-amber-500/25 hover:border-amber-500/50",
          bg: "bg-zinc-950/60 hover:bg-amber-950/20",
          text: "text-amber-400",
          bar: "bg-amber-500",
          badge: "text-amber-400/80",
          type: 'neutral'
        };
      }
      if (
        lower === "fomo" ||
        lower.includes("fomo") ||
        lower.includes("ihlal") ||
        lower.includes("disiplinsiz") ||
        lower.includes("intikam") ||
        lower.includes("düşük") ||
        lower === "c" ||
        lower.includes("low") ||
        lower.includes("revenge")
      ) {
        return {
          border: "border-rose-500/25 hover:border-rose-500/50",
          bg: "bg-zinc-950/60 hover:bg-rose-950/20",
          text: "text-rose-400",
          bar: "bg-rose-500",
          badge: "text-rose-400/80",
          type: 'negative'
        };
      }
      return {
        border: "border-purple-500/25 hover:border-purple-500/50",
        bg: "bg-zinc-950/60 hover:bg-purple-950/20",
        text: "text-purple-400",
        bar: "bg-purple-500",
        badge: "text-purple-400/80",
        type: 'neutral'
      };
    };

    const options = allOptionNames.map(name => {
      let data = planFidelityMap[name];
      if (!data) {
        const foundKey = Object.keys(planFidelityMap).find(k => k.toLowerCase() === name.toLowerCase());
        if (foundKey) {
          data = planFidelityMap[foundKey];
        }
      }
      const count = data?.count || 0;
      const wins = data?.wins || 0;
      const losses = data?.losses || 0;
      const be = data?.be || 0;
      const totalR = data?.totalR || 0;
      const totalPnl = data?.totalPnl || 0;
      const winRate = count > 0 ? (wins / count) * 100 : 0;
      const ratio = totalWithFidelity > 0 ? (count / totalWithFidelity) * 100 : 0;
      const theme = getOptionTheme(name);

      return {
        name,
        count,
        wins,
        losses,
        be,
        totalR,
        totalPnl,
        winRate,
        ratio,
        theme
      };
    });

    const planFidelityEntries = Object.entries(planFidelityMap).sort((a, b) => b[1].count - a[1].count);
    const highQualityWinRate = highQualityCount > 0 ? (highQualityWins / highQualityCount) * 100 : 0;
    const lowQualityWinRate = lowQualityCount > 0 ? (lowQualityWins / lowQualityCount) * 100 : 0;
    const highQualityRatio = totalWithFidelity > 0 ? (highQualityCount / totalWithFidelity) * 100 : 0;

    const planFidelityStats = {
      totalWithFidelity,
      highQualityCount,
      highQualityWins,
      highQualityWinRate,
      highQualityRatio,
      lowQualityCount,
      lowQualityWins,
      lowQualityWinRate,
      options,
      entries: planFidelityEntries
    };

    const longStats = {
      count: longCount,
      wins: longWins,
      winRate: longCount > 0 ? (longWins / longCount) * 100 : 0,
      pnl: longPnl,
    };

    const shortStats = {
      count: shortCount,
      wins: shortWins,
      winRate: shortCount > 0 ? (shortWins / shortCount) * 100 : 0,
      pnl: shortPnl,
    };

    const assetAnalysis = Object.entries(assetMap)
      .map(([asset, data]) => ({
        asset,
        count: data.count,
        wins: data.wins,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        longCount: data.longCount,
        longWins: data.longWins,
        longWinRate: data.longCount > 0 ? (data.longWins / data.longCount) * 100 : 0,
        shortCount: data.shortCount,
        shortWins: data.shortWins,
        shortWinRate: data.shortCount > 0 ? (data.shortWins / data.shortCount) * 100 : 0,
        pnl: data.pnl,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const winsList = closedTrades.filter((t) => t.status === "WIN");
    const lossesList = closedTrades.filter((t) => t.status === "LOSS");

    const totalWinsAmount = winsList.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalLossesAmount = Math.abs(lossesList.reduce((acc, t) => acc + (t.pnl || 0), 0));

    const totalWinRR = toRR(winsList.reduce((acc, t) => acc + (t.rr || 0), 0));
    const totalLossRR = toRR(Math.abs(lossesList.reduce((acc, t) => acc + (t.rr || 0), 0)));

    const profitFactor = calculateProfitFactor(totalWinRR, totalLossRR);

    const avgWinAmount = winsList.length > 0 ? totalWinsAmount / winsList.length : 0;
    const avgLossAmount = lossesList.length > 0 ? totalLossesAmount / lossesList.length : 0;

    const avgWinRR = toRR(winsList.length > 0 ? totalWinRR / winsList.length : 0);
    const avgLossRR = toRR(lossesList.length > 0 ? totalLossRR / lossesList.length : 0);

    const leakageIndex = totalWinRR > 0 ? (totalLossRR / totalWinRR) * 100 : 0;

    const winRateDecimal = closedTrades.length > 0 ? winsList.length / closedTrades.length : 0;
    const lossRateDecimal = closedTrades.length > 0 ? lossesList.length / closedTrades.length : 0;
    const expectancy = calculateExpectancy(winRateDecimal, lossRateDecimal, avgWinRR, avgLossRR);
    const kelly = calculateKellyCriterion(winRateDecimal, lossRateDecimal, avgWinRR, avgLossRR);

    const rList = closedTrades.map((t) => toRR(t.rr || 0));
    const avgR = toRR(rList.length > 0 ? rList.reduce((acc, r) => acc + r, 0) / rList.length : 0);
    const negativeRs = rList.filter((r) => r < 0);
    const sortinoRatio = calculateSortinoRatio(avgR, negativeRs, rList.length);

    const pnlList = closedTrades.map((t) => t.pnl || 0);
    const avgPnl = pnlList.length > 0 ? pnlList.reduce((acc, val) => acc + val, 0) / pnlList.length : 0;
    const negativePnls = pnlList.filter((val) => val < 0);
    const realSortinoRatio = calculateSortinoRatio(avgPnl as any, negativePnls as any, pnlList.length);

    const kellyR = calculateKellyCriterion(winRateDecimal, lossRateDecimal, avgWinRR, avgLossRR);
    const realKelly = calculateKellyCriterion(winRateDecimal, lossRateDecimal, avgWinAmount as any, avgLossAmount as any);

    const sqn = calculateSQN(rList);
    const realSqn = calculateSQN(pnlList as any);

    const outcomesStatus = closedTrades.map((t) => (t.status === "WIN" ? 1 : 0));
    let runChangeCount = 0;
    if (outcomesStatus.length > 0) {
      runChangeCount = 1;
      for (let i = 1; i < outcomesStatus.length; i++) {
        if (outcomesStatus[i] !== outcomesStatus[i - 1]) {
          runChangeCount++;
        }
      }
    }
    const totalN = outcomesStatus.length;
    const totalWinScore = outcomesStatus.filter((x) => x === 1).length;
    const totalLossScore = totalN - totalWinScore;
    let zScore = 0;
    let streakDependency = "Rastgele Dağılım";
    if (totalN > 1 && totalWinScore > 0 && totalLossScore > 0) {
      const expectedRuns = (2 * totalWinScore * totalLossScore) / totalN + 1;
      const numZ = 2 * totalWinScore * totalLossScore * (2 * totalWinScore * totalLossScore - totalN);
      const denZ = totalN * totalN * (totalN - 1);
      const varRuns = numZ / denZ;
      if (varRuns > 0) {
        zScore = (runChangeCount - expectedRuns) / Math.sqrt(varRuns);
      }
    }
    if (zScore < -1.64) {
      streakDependency = "Streak Eğilimli";
    } else if (zScore > 1.64) {
      streakDependency = "Kısa Seri Eğilimli";
    }

    let maxPeak = 0;
    let maxDrawdown = 0;
    let maxRealPeak = 0;
    let maxRealDrawdown = 0;
    equityCurve.forEach((pt) => {
      if (pt.cumulativePnl > maxPeak) maxPeak = pt.cumulativePnl;
      const dd = maxPeak - pt.cumulativePnl;
      if (dd > maxDrawdown) maxDrawdown = dd;

      if (pt.cumulativeRealPnl > maxRealPeak) maxRealPeak = pt.cumulativeRealPnl;
      const realDd = maxRealPeak - pt.cumulativeRealPnl;
      if (realDd > maxRealDrawdown) maxRealDrawdown = realDd;
    });

    const statusAnalysis = { win: 0, loss: 0, breakeven: 0, total: 0 };
    const dailyMap: Record<string, { count: number; wins: number; pnl: number; realPnl: number; assets: Set<string>; trades: Trade[]; }> = {};

    closedTrades.forEach((t) => {
      const tDate = new Date(t.createdAt);
      const dKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}-${String(tDate.getDate()).padStart(2, "0")}`;

      if (!dailyMap[dKey]) {
        dailyMap[dKey] = { count: 0, wins: 0, pnl: 0, realPnl: 0, assets: new Set(), trades: [] };
      }
      dailyMap[dKey].count++;
      dailyMap[dKey].pnl += t.rr || 0;
      dailyMap[dKey].realPnl += t.pnl || 0;
      dailyMap[dKey].assets.add(t.asset);
      dailyMap[dKey].trades.push(t);
      if (t.status === "WIN") dailyMap[dKey].wins++;

      statusAnalysis.total++;
      if (t.status === "WIN") statusAnalysis.win++;
      else if (t.status === "LOSS") statusAnalysis.loss++;
      else if (t.status === "BREAKEVEN") statusAnalysis.breakeven++;
    });

    let greenDays = 0;
    let redDays = 0;
    let totalDays = 0;
    let maxDailyLoss = 0;
    let maxRealDailyLoss = 0;
    let maxDailyProfit = 0;
    let maxRealDailyProfit = 0;

    Object.values(dailyMap).forEach((d) => {
      totalDays++;
      if (d.pnl < maxDailyLoss) maxDailyLoss = d.pnl;
      if (d.realPnl < maxRealDailyLoss) maxRealDailyLoss = d.realPnl;
      if (d.pnl > maxDailyProfit) maxDailyProfit = d.pnl;
      if (d.realPnl > maxRealDailyProfit) maxRealDailyProfit = d.realPnl;
      if (d.pnl > 0) greenDays++;
      else if (d.pnl < 0) redDays++;
    });

    let grossPnlSum = 0;
    let grossLossSum = 0;
    let grossRealPnlSum = 0;
    let grossRealLossSum = 0;

    closedTrades.forEach((t) => {
      const valR = t.rr || 0;
      const valPnl = t.pnl || 0;
      if (valR > 0) grossPnlSum += valR;
      else if (valR < 0) grossLossSum += Math.abs(valR);

      if (valPnl > 0) grossRealPnlSum += valPnl;
      else if (valPnl < 0) grossRealLossSum += Math.abs(valPnl);
    });

    const sharpeDailyAvg = totalDays > 0 ? (grossPnlSum - grossLossSum) / totalDays : 0;
    let varSum = 0;
    Object.values(dailyMap).forEach((d: any) => {
      varSum += Math.pow(d.pnl - sharpeDailyAvg, 2);
    });
    const sharpeStdDev = totalDays > 0 ? Math.sqrt(varSum / totalDays) : 0;
    const sharpeRatio = sharpeStdDev > 0 ? (sharpeDailyAvg / sharpeStdDev) * Math.sqrt(252) : 0;

    const totalRealPnl = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const realSharpeDailyAvg = totalDays > 0 ? totalRealPnl / totalDays : 0;
    let realVarSum = 0;
    Object.values(dailyMap).forEach((d: any) => {
      realVarSum += Math.pow(d.realPnl - realSharpeDailyAvg, 2);
    });
    const realSharpeStdDev = totalDays > 0 ? Math.sqrt(realVarSum / totalDays) : 0;
    const realSharpeRatio = realSharpeStdDev > 0 ? (realSharpeDailyAvg / realSharpeStdDev) * Math.sqrt(252) : 0;

    const totalClosedCashPnl = totalWinsAmount - totalLossesAmount;
    const expectancyCash = winRateDecimal * avgWinAmount - lossRateDecimal * avgLossAmount;
    const consistencyR = totalR > 0 ? (maxDailyProfit / totalR) * 100 : 0;
    const realConsistency = totalClosedCashPnl > 0 ? (maxRealDailyProfit / totalClosedCashPnl) * 100 : 0;

    return {
      totalClosedCashPnl,
      expectancyCash,
      totalR,
      winStreak: maxWinStreak,
      lossStreak: maxLossStreak,
      currentWinStreak,
      currentLossStreak,
      avgWinAmount,
      avgLossAmount,
      avgWinRR,
      avgLossRR,
      leakageIndex,
      greenDays,
      redDays,
      totalDays,
      longStats,
      shortStats,
      bestTrade,
      worstTrade,
      profitFactor,
      expectancy,
      kelly,
      maxDrawdown,
      maxDailyLoss,
      maxRealDailyLoss,
      sortinoRatio,
      realSortinoRatio,
      kellyR,
      realKelly,
      sqn,
      realSqn,
      consistencyR,
      realConsistency,
      zScore,
      streakDependency,
      statusAnalysis,
      dayOfWeekStats: dayOfWeekPnL,
      assetAnalysis,
      equityCurve,
      grossPnlSum,
      grossLossSum,
      maxPeak,
      maxRealPeak,
      maxRealDrawdown,
      cumulativePnl: equityCurve[equityCurve.length - 1]?.cumulativePnl || 0,
      cumulativeRealPnl: equityCurve[equityCurve.length - 1]?.cumulativeRealPnl || 0,
      pureProfitFactor: calculateProfitFactor(toRR(grossPnlSum), toRR(grossLossSum)),
      realPureProfitFactor: calculateProfitFactor(toRR(grossRealPnlSum), toRR(grossRealLossSum)),
      recoveryFactor: calculateRecoveryFactor(toRR(totalR), toRR(maxDrawdown)),
      realRecoveryFactor: calculateRecoveryFactor(toRR(totalClosedCashPnl), toRR(maxRealDrawdown)),
      sharpeRatio,
      realSharpeRatio,
      planFidelityStats,
    };
  }, [closedTrades, planFidelities]);

  const chartEquityCurve = useMemo(() => {
    if (!metrics?.equityCurve) return [];
    if (equityFilter === 'trade') {
      return metrics.equityCurve.map((pt) => ({
        ...pt,
        fullTitle: pt.trade 
          ? new Date(pt.trade.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
          : pt.label || 'İşlem Detayı',
        trades: pt.trade ? [pt.trade] : []
      }));
    }

    const grouped: Record<string, any> = {};
    metrics.equityCurve.forEach(pt => {
      const date = new Date(pt.timestamp);
      let key = '';
      let label = '';
      let fullTitle = '';
      
      if (equityFilter === 'daily') {
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        label = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        fullTitle = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (equityFilter === 'weekly') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
        label = `Hafta ${weekNum}`;
        fullTitle = `${date.getFullYear()} Hafta ${weekNum}`;
      } else if (equityFilter === 'monthly') {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        fullTitle = label;
      }

      if (!grouped[key]) {
        grouped[key] = {
          ...pt,
          label,
          fullTitle,
          trades: pt.trade ? [pt.trade] : []
        };
      } else {
        grouped[key].cumulativePnl = pt.cumulativePnl;
        grouped[key].cumulativeRealPnl = pt.cumulativeRealPnl;
        grouped[key].drawdown = pt.drawdown;
        grouped[key].realDrawdown = pt.realDrawdown;
        if (pt.trade) {
          grouped[key].trades.push(pt.trade);
        }
      }
    });

    return Object.values(grouped);
  }, [metrics.equityCurve, equityFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any }
    }
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/70 border border-zinc-700/50  rounded-2xl shadow-sm mt-4">
        <LineChart size={32} className="text-zinc-600 mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-zinc-300 font-sans mb-2">Henüz Yeterli Veri Yok</h3>
        <p className="text-xs text-zinc-500 max-w-sm">Derin analiz yapılabilecek filtre kriterlerinize uygun herhangi bir işlem bulunamadı.</p>
      </div>
    );
  }

  const renderEquityCurve = () => (
    <MemoizedEquityChart 
      chartEquityCurve={chartEquityCurve} 
      isRrMode={isRrMode} 
      currency={currency} 
      equityFilter={equityFilter} 
      setSelectedEquityPoint={setSelectedEquityPoint} 
    />
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      id="deep-analytics-view"
      className="flex flex-col w-full bg-zinc-900/70 border border-zinc-700/50  rounded-2xl shadow-sm overflow-hidden divide-y divide-zinc-800/80 relative"
    >
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 w-full relative z-20">
        {/* Kümülatif Kazanç Oranı */}
        <motion.div 
          variants={itemVariants} 
          className="bg-transparent p-3.5 sm:p-4 hover:bg-zinc-800/20 transition-all duration-200 ease-out flex items-center justify-between cursor-pointer group" 
          onClick={() => handleMetricClick("cumulativeR", isRrMode ? `${metrics.totalR > 0 ? "+" : ""}${metrics.totalR.toFixed(1)} R` : `${metrics.totalClosedCashPnl > 0 ? "+" : ""}${(metrics?.totalClosedCashPnl || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`)}
        >
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans">
                Kümülatif Kazanç
              </span>
            </div>
            <h3
              className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans ${
                (isRrMode ? metrics.totalR : metrics.totalClosedCashPnl) > 0
                  ? "text-emerald-400"
                  : (isRrMode ? metrics.totalR : metrics.totalClosedCashPnl) < 0
                    ? "text-rose-400"
                    : "text-zinc-400"
              }`}
            >
              <ValueTransition modeKey={isRrMode}>
                {isRrMode ? (
                  <div className="flex flex-col">
                    <span className="flex items-baseline gap-1">
                      {metrics.totalR > 0 ? "+" : ""}
                      {metrics.totalR.toFixed(2)}
                      <span className="text-xs text-emerald-400/80 font-bold">R</span>
                    </span>
                    <span className="text-[9.5px] font-sans font-medium text-zinc-400 mt-0.5">
                      ({metrics.totalClosedCashPnl > 0 ? "+" : ""}{(metrics?.totalClosedCashPnl || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currency})
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="flex items-baseline gap-1">
                      {metrics.totalClosedCashPnl > 0 ? "+" : ""}
                      {(metrics?.totalClosedCashPnl || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      <span className="text-xs text-emerald-400/80 font-bold">{currency}</span>
                    </span>
                    <span className="text-[9.5px] font-sans font-medium text-zinc-400 mt-0.5">
                      ({metrics.totalR > 0 ? "+" : ""}{metrics.totalR.toFixed(2)} R)
                    </span>
                  </div>
                )}
              </ValueTransition>
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 transition-transform shrink-0 ml-2">
            <TrendingUp size={17} />
          </div>
        </motion.div>

        {/* LONG VS SHORT PERFORMANSI */}
        <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 transition-all duration-200 ease-out flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Layers size={10} />
              </span>
              Long / Short Dağılımı
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-sans text-[10px]">
            <div 
              className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-2 rounded-xl cursor-pointer hover:bg-emerald-950/10 transition-all"
              onClick={() => handleMetricClick("longPerformance", `%${metrics.longStats.winRate.toFixed(1)} WR`)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">LONG</span>
                <span className="text-zinc-500 text-[8.5px]">{metrics.longStats.count} işlem</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 block font-sans">%{metrics.longStats.winRate.toFixed(1)} WR</span>
            </div>
            <div 
              className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-2 rounded-xl cursor-pointer hover:bg-rose-950/10 transition-all"
              onClick={() => handleMetricClick("shortPerformance", `%${metrics.shortStats.winRate.toFixed(1)} WR`)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px]">SHORT</span>
                <span className="text-zinc-500 text-[8.5px]">{metrics.shortStats.count} işlem</span>
              </div>
              <span className="text-xs font-bold text-rose-400 block font-sans">%{metrics.shortStats.winRate.toFixed(1)} WR</span>
            </div>
          </div>
        </motion.div>

        {/* İŞLEM SONUÇ DAĞILIMI */}
        <motion.div 
          variants={itemVariants} 
          className="bg-transparent p-3.5 sm:p-4 hover:bg-zinc-800/20 transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group" 
          onClick={() => handleMetricClick("winRate", `%${(metrics.statusAnalysis.total ? (metrics.statusAnalysis.win / metrics.statusAnalysis.total) * 100 : 0).toFixed(1)}`)}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Target size={10} />
              </span>
              Sonuç Dağılımı
            </p>
            <span className="text-[9px] font-sans font-bold text-zinc-400 bg-zinc-800/90 px-1.5 py-0.5 rounded-md border border-zinc-700/50">
              %{metrics.statusAnalysis.total ? ((metrics.statusAnalysis.win / metrics.statusAnalysis.total) * 100).toFixed(1) : 0} WR
            </span>
          </div>
          <div className="flex items-center gap-2 font-sans text-[10px] w-full">
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-2">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-emerald-400 font-bold">WIN</span>
                <span className="text-emerald-400 font-bold">{metrics.statusAnalysis.win}</span>
              </div>
              <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${metrics.statusAnalysis.total ? (metrics.statusAnalysis.win / metrics.statusAnalysis.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-2">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-rose-400 font-bold">LOSS</span>
                <span className="text-rose-400 font-bold">{metrics.statusAnalysis.loss}</span>
              </div>
              <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${metrics.statusAnalysis.total ? (metrics.statusAnalysis.loss / metrics.statusAnalysis.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-2">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-zinc-300 font-bold">BE</span>
                <span className="text-zinc-300 font-bold">{metrics.statusAnalysis.breakeven}</span>
              </div>
              <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-zinc-400 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${metrics.statusAnalysis.total ? (metrics.statusAnalysis.breakeven / metrics.statusAnalysis.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SETUP KALİTESİ İSTATİSTİKLERİ */}
        <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 transition-all duration-200 ease-out flex flex-col justify-center relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Crosshair size={10} />
              </span>
              {definitionTitles.planFidelities || "Setup Kalitesi"}
            </p>
            {metrics.planFidelityStats.totalWithFidelity > 0 && (
              <span className="text-[9px] font-sans font-bold text-zinc-400 bg-zinc-800/90 px-1.5 py-0.5 rounded-md border border-zinc-700/50">
                {metrics.planFidelityStats.totalWithFidelity} İşlem
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 font-sans text-[10px] w-full">
            {metrics.planFidelityStats.options.map((opt) => {
              const hasTrades = opt.count > 0;
              return (
                <div 
                  key={opt.name}
                  className={`flex-1 min-w-0 bg-zinc-950/60 border ${opt.theme.border} hover:bg-zinc-900/80 p-2 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden`}
                  onClick={() => {
                    handleMetricClick(
                      `planFidelity_${opt.name}`,
                      hasTrades ? `%${opt.winRate.toFixed(1)} WR (${opt.count} İşlem)` : "Kayıt Yok",
                      {
                        title: `${opt.name} (${definitionTitles.planFidelities || "Setup Kalitesi"})`,
                        description: `"${opt.name}" olarak girilmiş işlemlerin başarı oranı ve kümülatif getiri detayları.`,
                        type: opt.theme.type,
                        icon: Crosshair,
                        formula: `(Kazanılan "${opt.name}" / Toplam "${opt.name}" İşlem) × 100`,
                        details: [
                          `Toplam İşlem: ${opt.count} adet (${opt.ratio.toFixed(1)}% pay)`,
                          `Sonuç Dağılımı: ${opt.wins} Win, ${opt.losses} Loss, ${opt.be} BE`,
                          `Kümülatif Getiri: ${opt.totalR > 0 ? '+' : ''}${opt.totalR.toFixed(2)} R (${opt.totalPnl > 0 ? '+' : ''}${opt.totalPnl.toFixed(1)} ${currency})`,
                          hasTrades 
                            ? `İşlem Başı Ortalama: ${(opt.totalR / opt.count).toFixed(2)} R`
                            : 'Henüz bu setup kalitesinde kapatılmış işlem bulunmamaktadır.'
                        ]
                      }
                    );
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider truncate ${opt.theme.text}`}>
                      {opt.name}
                    </span>
                    <span className="text-[8.5px] font-sans text-zinc-500 font-medium">
                      {opt.count}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-100 font-sans">
                      {hasTrades ? `%${opt.winRate.toFixed(0)}` : "-"}
                    </span>
                    <span className="text-[8px] font-sans text-zinc-500 font-semibold">
                      WR
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${opt.theme.bar} h-full rounded-full transition-all duration-300`}
                      style={{
                        width: `${hasTrades ? Math.min(100, Math.max(0, opt.winRate)) : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Matematiksel Beklenti & Sistem Statüsü & Equity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 w-full border-t border-zinc-800">
        <div className="lg:col-span-2 flex flex-col divide-y divide-zinc-800/80 h-full">
          {/* MATEMATİKSEL BEKLENTİ */}
          <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <TrendingUp size={11} />
                </span>
                Matematiksel Beklenti
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 items-stretch w-full h-full">
              <div 
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-3.5 cursor-pointer hover:bg-emerald-950/10 transition-all duration-200 flex flex-col justify-between" 
                onClick={() => handleMetricClick("averageWin", isRrMode ? "+" + metrics.avgWinRR.toFixed(2) + " R" : "+" + (metrics?.avgWinAmount || 0).toLocaleString() + " " + currency)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-sans">
                    Ort. Kazanç
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400 font-sans tracking-tight mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    {isRrMode ? (
                      <span className="flex flex-col">
                        <span>+{metrics.avgWinRR.toFixed(2)} <span className="text-xs font-bold text-emerald-400/80">R</span></span>
                        <span className="text-[10px] font-sans font-medium text-emerald-400/60 mt-0.5">(+{(metrics?.avgWinAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} {currency})</span>
                      </span>
                    ) : (
                      <span className="flex flex-col">
                        <span>+{(metrics?.avgWinAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} <span className="text-xs font-bold text-emerald-400/80">{currency}</span></span>
                        <span className="text-[10px] font-sans font-medium text-emerald-400/60 mt-0.5">(+{metrics.avgWinRR.toFixed(2)} R)</span>
                      </span>
                    )}
                  </ValueTransition>
                </div>
              </div>
              
              <div 
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-3.5 cursor-pointer hover:bg-rose-950/10 transition-all duration-200 flex flex-col justify-between" 
                onClick={() => handleMetricClick("averageLoss", isRrMode ? "-" + metrics.avgLossRR.toFixed(2) + " R" : "-" + (metrics?.avgLossAmount || 0).toLocaleString() + " " + currency)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-sans">
                    Ort. Kayıp
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-400 font-sans tracking-tight mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    {isRrMode ? (
                      <span className="flex flex-col">
                        <span>-{metrics.avgLossRR.toFixed(2)} <span className="text-xs font-bold text-rose-400/80">R</span></span>
                        <span className="text-[10px] font-sans font-medium text-rose-400/60 mt-0.5">(-{(metrics?.avgLossAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} {currency})</span>
                      </span>
                    ) : (
                      <span className="flex flex-col">
                        <span>-{(metrics?.avgLossAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} <span className="text-xs font-bold text-rose-400/80">{currency}</span></span>
                        <span className="text-[10px] font-sans font-medium text-rose-400/60 mt-0.5">(-{metrics.avgLossRR.toFixed(2)} R)</span>
                      </span>
                    )}
                  </ValueTransition>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SİSTEM STATÜSÜ */}
          <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Activity size={11} />
                </span>
                Sistem Statüsü & Kalitesi
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 items-stretch w-full h-full">
              <div 
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:bg-amber-950/10 hover:border-amber-500/30 transition-all duration-200 ease-out group shadow-xs" 
                onClick={() => handleMetricClick("sqn", (isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn))?.toFixed(2) || "0.00")}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-sans">
                    SQN PUANI
                  </p>
                  {(() => {
                    const s = isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn);
                    if (s < 1.6) return null;
                    return (
                      <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-lg border ${
                        s >= 3 
                          ? "toggle-item-win" 
                          : s >= 2.5 
                            ? "toggle-item-brand" 
                            : "toggle-item-breakeven"
                      }`}>
                        {s < 2.5 ? "Ortalama" : s < 3.0 ? "İyi Sistem" : "Mükemmel"}
                      </span>
                    );
                  })()}
                </div>
                <div className="mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight ${(isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn)) >= 2.5 ? "text-emerald-400" : (isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn)) >= 1.6 ? "text-amber-400" : "text-rose-400"}`}>
                      {(isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn))?.toFixed(2) || "0.00"}
                    </span>
                  </ValueTransition>
                </div>
              </div>

              <div 
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:bg-indigo-950/10 hover:border-indigo-500/30 transition-all duration-200 ease-out group shadow-xs" 
                onClick={() => handleMetricClick("expectancy", isRrMode ? (metrics.expectancy > 0 ? "+" : "") + metrics.expectancy.toFixed(2) + " R" : (metrics.expectancyCash > 0 ? "+" : "") + metrics.expectancyCash.toLocaleString() + " " + currency)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-sans">
                    İşlem Başı Beklenti
                  </p>
                </div>
                <div className="mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight ${metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {isRrMode ? (
                        <span className="flex flex-col">
                          <span>{metrics.expectancy > 0 ? "+" : ""}{metrics.expectancy.toFixed(2)} <span className="text-xs font-bold">R</span></span>
                          <span className="text-[10px] font-sans font-medium text-zinc-400 mt-0.5">
                            ({metrics.expectancyCash >= 0 ? "+" : ""}{(metrics?.expectancyCash || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currency})
                          </span>
                        </span>
                      ) : (
                        <span className="flex flex-col">
                          <span>{metrics.expectancyCash >= 0 ? "+" : ""}{(metrics?.expectancyCash || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-bold">{currency}</span></span>
                          <span className="text-[10px] font-sans font-medium text-zinc-400 mt-0.5">
                            ({metrics.expectancy > 0 ? "+" : ""}{metrics.expectancy.toFixed(2)} R)
                          </span>
                        </span>
                      )}
                    </span>
                  </ValueTransition>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Kümülatif Kâr / Zarar Eğrisi (Equity Curve) */}
        <motion.div
          variants={itemVariants}
          className="bg-transparent p-4 sm:p-5 flex flex-col mt-0 xl:mt-0 hover:bg-zinc-800/20 transition-colors duration-200 ease-out lg:col-span-2 h-full justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 relative">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <LineChart size={14} />
              </div>
              <h3 className="text-xs font-bold text-zinc-100 font-sans tracking-tight">
                Kümülatif Kâr / Zarar Eğrisi
              </h3>
              
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsEquityFilterOpen(!isEquityFilterOpen); }}
                  className={`flex items-center justify-center w-6 h-6 rounded-lg border transition-all duration-150 ${
                    isEquityFilterOpen 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  } shrink-0`}
                >
                  <Filter size={11} /> 
                </button>

                <AnimatePresence>
                  {isEquityFilterOpen && (
                    <motion.div
                      key="equity-filter-dropdown"
                      initial={{ opacity: 0, y: "-50%" }}
                      animate={{ opacity: 1, y: "-50%" }}
                      exit={{ opacity: 0, y: "-50%" }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-full ml-2 top-1/2 flex items-center bg-zinc-950 border border-zinc-800/80 rounded-lg p-0.5 z-30 shadow-xl"
                    >
                      {[
                        { id: 'trade', label: 'İşlem' },
                        { id: 'daily', label: 'Günlük' },
                        { id: 'weekly', label: 'Haftalık' },
                        { id: 'monthly', label: 'Aylık' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEquityFilter(opt.id as any); }}
                          className={`px-2 py-0.5 text-[9px] font-bold font-sans tracking-wider uppercase rounded-lg transition-all duration-150 ${
                            equityFilter === opt.id 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {chartEquityCurve.length > 0 && (
                <span className="text-xs font-sans px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300">
                  Net:{" "}
                  <b className={(isRrMode ? (chartEquityCurve[chartEquityCurve.length - 1]?.cumulativePnl ?? 0) : (chartEquityCurve[chartEquityCurve.length - 1]?.cumulativeRealPnl ?? 0)) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    <ValueTransition modeKey={isRrMode}>
                      {isRrMode ? (
                        `${(chartEquityCurve[chartEquityCurve.length - 1]?.cumulativePnl ?? 0).toFixed(2)} R`
                      ) : (
                        `${(chartEquityCurve[chartEquityCurve.length - 1]?.cumulativeRealPnl ?? 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                      )}
                    </ValueTransition>
                  </b>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {chartEquityCurve.length < 2 ? (
              <div className="h-36 flex flex-1 items-center justify-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-900 text-xs text-zinc-500 font-sans">
                Eğri çizmek için en az 2 tamamlanmış işlem kaydı gereklidir.
              </div>
            ) : renderEquityCurve()}
          </div>
        </motion.div>
      </div>

      <div className="border-t border-zinc-800">
        <NewDeepAnalysisMetrics metrics={metrics as any} currency={currency} isRrMode={isRrMode} onMetricClick={handleMetricClick} />
      </div>

      {/* Takvim & Günlük Analiz Header & Calendar */}
      <div className="w-full border-b border-zinc-800">
        <motion.div
          variants={itemVariants}
          className="flex flex-col bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <CalendarIcon size={15} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-sans tracking-tight">
                  Takvim & Günlük Analiz
                </h3>
              </div>
            </div>
          </div>
          <CalendarView trades={trades} currency={currency} onEdit={onEdit} />
        </motion.div>
      </div>

      {/* Gün İstatistikleri & Ekstrem Değerler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 w-full">
        {/* Kârlı / Zararlı Gün */}
        <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CalendarIcon size={11} />
              </span>
              Gün Performansı
            </p>
          </div>
          {metrics.totalDays === 0 ? (
            <p className="text-center py-5 text-xs text-zinc-600 font-sans">
              Veri yok.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-emerald-950/10 transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); handleMetricClick("profitableDays", metrics.greenDays + " Gün"); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] block uppercase font-bold text-emerald-400 font-sans">Kârlı Gün</span>
                  <CheckCircle2 size={13} className="text-emerald-400/80" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 block font-sans mt-0.5">
                  {metrics.greenDays} <span className="text-xs text-emerald-400/70 font-normal">Gün</span>
                </span>
              </div>
              <div 
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-rose-950/10 transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); handleMetricClick("profitableDays", metrics.redDays + " Gün"); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] block uppercase font-bold text-rose-400 font-sans">Zararlı Gün</span>
                  <XCircle size={13} className="text-rose-400/80" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-rose-400 block font-sans mt-0.5">
                  {metrics.redDays} <span className="text-xs text-rose-400/70 font-normal">Gün</span>
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Maks. Kazanç / Maks. Kayıp */}
        <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Target size={11} />
              </span>
              MAKS. İŞLEMLER
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div 
              className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-emerald-950/10 transition-all duration-200"
              onClick={(e) => { e.stopPropagation(); handleMetricClick("largestWin", isRrMode ? ("+" + (metrics.bestTrade ? (metrics.bestTrade.rr || 0).toFixed(1) : "0") + " R") : ("+" + (metrics.bestTrade?.pnl || 0).toLocaleString() + " " + currency)); }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] block uppercase font-bold text-emerald-400 font-sans">Maks. Kazanç</span>
                <TrendingUp size={13} className="text-emerald-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-400 block font-sans mt-0.5">
                +{(metrics.bestTrade ? (metrics.bestTrade.rr || 0).toFixed(2) : "0")} <span className="text-xs">R</span>
                <span className="text-[10px] text-emerald-400/70 block mt-0.5 font-normal">
                  +{(metrics.bestTrade?.pnl || 0).toLocaleString()} {currency}
                </span>
              </span>
            </div>
            <div 
              className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-rose-950/10 transition-all duration-200"
              onClick={(e) => { e.stopPropagation(); handleMetricClick("largestLoss", isRrMode ? ("-" + (metrics.worstTrade ? Math.abs(metrics.worstTrade.rr || 0).toFixed(1) : "0") + " R") : ("-" + Math.abs(metrics.worstTrade?.pnl || 0).toLocaleString() + " " + currency)); }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] block uppercase font-bold text-rose-400 font-sans">Maks. Kayıp</span>
                <TrendingDown size={13} className="text-rose-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-rose-400 block font-sans mt-0.5">
                -{(metrics.worstTrade ? Math.abs(metrics.worstTrade.rr || 0).toFixed(2) : "0")} <span className="text-xs">R</span>
                <span className="text-[10px] text-rose-400/70 block mt-0.5 font-normal">
                  -{Math.abs(metrics.worstTrade?.pnl || 0).toLocaleString()} {currency}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <AdvancedMetricsDashboard trades={deferredTrades} currency={currency} onMetricClick={handleMetricClick} onEdit={onEdit} sessions={sessions} />
      
      <MetricDetailModal 
        isOpen={!!selectedMetric} 
        onClose={() => setSelectedMetric(null)} 
        metric={selectedMetric} 
        currency={currency}
      />

      <TradeHistoryModal
        isOpen={!!selectedEquityPoint}
        onClose={() => setSelectedEquityPoint(null)}
        title={selectedEquityPoint?.title || ""}
        icon={<LineChart size={16} className="mr-1.5 text-blue-400 shrink-0" />}
        trades={selectedEquityPoint?.trades || []}
        currency={currency}
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedEquityPoint(null);
        }}
        definitionTitles={definitionTitles}
      />

      <PrintReportModal title="Analiz Raporu" isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        trades={printModalState.trades}
        dateRangeText={printModalState.dateRangeText}
        currency={currency}
      />
    </motion.div>
  );
});

export const DeepAnalysis = React.memo((props: DeepAnalysisProps) => {
  return <DeepAnalysisInner {...props} />;
});

export default DeepAnalysis;
