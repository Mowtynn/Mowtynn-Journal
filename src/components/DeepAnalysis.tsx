import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ValueTransition } from "./ValueTransition";
import { calculateProfitFactor, calculateExpectancy, calculateSortinoRatio, calculateKellyCriterion, calculateRecoveryFactor, toRR } from "../lib/statMath";
import { calculateSQN } from "../utils/math";
import { Trade } from "../types";
import { useMetricMode } from "../context/MetricContext";
import {
  LineChart,
  Target,
  Filter,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Calendar as CalendarIcon,
  Flame,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { MetricDetailModal, MetricDetail } from "./MetricDetailModal";
import { metricDetailsDict } from "../config/metricDetails";
import { NewDeepAnalysisMetrics } from "./NewDeepAnalysisMetrics";
import { AdvancedMetricsDashboard } from "./AdvancedMetricsDashboard";
import { CalendarView } from "./CalendarView";
import TradeDetailModal from "./TradeDetailModal";
import { PrintReportModal } from "./PrintReportModal";

interface DeepAnalysisProps {
  trades: Trade[];
  onViewDetails: (trade: Trade) => void;
  onEdit?: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  currency: string;
  sessions?: string[];
}

export const DeepAnalysis = React.memo(function DeepAnalysis({
  trades,
  onEdit,
  currency,
  sessions = [],
}: DeepAnalysisProps) {
  const { isRrMode } = useMetricMode();
  const [selectedMetric, setSelectedMetric] = useState<MetricDetail | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  const handleMetricClick = (metricId: string, customValue: string | number) => {
    const def = metricDetailsDict[metricId];
    if (def) {
      setSelectedMetric({ id: metricId, value: customValue, ...def });
    }
  };

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

    equityCurve.forEach((pt, idx) => {
      const startIdx = Math.max(0, idx - 9);
      const subset = equityCurve.slice(startIdx, idx + 1);
      
      const sum = subset.reduce((acc, curr) => acc + curr.cumulativePnl, 0);
      pt.sma10 = sum / subset.length;

      const sumReal = subset.reduce((acc, curr) => acc + curr.cumulativeRealPnl, 0);
      pt.realSma10 = sumReal / subset.length;
    });

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
    });

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
    };
  }, [closedTrades]);

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
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-2xl shadow-sm mt-4">
        <LineChart size={32} className="text-zinc-600 mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-zinc-300 font-mono mb-2">Henüz Yeterli Veri Yok</h3>
        <p className="text-[11px] text-zinc-500 max-w-sm">Derin analiz yapılabilecek filtre kriterlerinize uygun herhangi bir işlem bulunamadı.</p>
      </div>
    );
  }

  const renderEquityCurve = () => {
    const values = chartEquityCurve.map((d: any) => isRrMode ? d.cumulativePnl : d.cumulativeRealPnl);
    const allValues = [0, ...values];
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = (maxVal - minVal) || 1;
    const width = 600, height = 180, padding = 20;
    const curveLen = allValues.length > 1 ? allValues.length - 1 : 1;

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

    const hoveredPt = hoveredIndex !== null ? pts[hoveredIndex + 1] : null;
    const hoveredItem = hoveredIndex !== null ? chartEquityCurve[hoveredIndex] : null;

    return (
      <div className="space-y-2 flex-1 flex flex-col relative">
        <div className="relative bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-2xl overflow-visible flex-1 min-h-[180px]">
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
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  left: `${(hoveredPt.x / 600) * 100}%`,
                  top: `${(hoveredPt.y / 180) * 100}%`
                }}
                className={`absolute pointer-events-none z-50 min-w-[160px] bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-lg p-2.5 shadow-2xl flex flex-col gap-1.5 ${
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
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-mono shadow-xs">
                    {equityFilter === 'trade' ? 'İşlem' : equityFilter === 'daily' ? 'Gün' : equityFilter === 'weekly' ? 'Hafta' : 'Ay'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-zinc-400 font-medium font-sans">Kümülatif {isRrMode ? 'RR' : 'PnL'}:</span>
                  <span className={`font-black font-mono text-xs ${(isRrMode ? hoveredItem.cumulativePnl : hoveredItem.cumulativeRealPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                    <div className="flex justify-between items-center text-[11px] pt-1 mt-0.5 border-t border-zinc-800/50">
                      <span className="text-zinc-500 font-medium font-sans">Değişim:</span>
                      <span className={`font-black font-mono text-[11px] ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isRrMode 
                          ? `${isPositive ? '+' : ''}${diffPnl.toFixed(2)} R` 
                          : `${isPositive ? '+' : ''}${diffRealPnl.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                        }
                      </span>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-bold">Drawdown</span>
                  <span className="text-rose-400/80 font-black font-mono">
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
                    <div className="flex justify-between items-center text-[11px] border-t border-zinc-900/60 pt-1.5 mt-0.5">
                      <span className="text-zinc-500 font-bold">İşlemler</span>
                      <span className="text-zinc-300 font-black font-mono">
                        {hoveredItem.trades.length} (<span className="text-emerald-400">{wins}W</span>/<span className="text-rose-400">{losses}L</span>)
                      </span>
                    </div>
                  );
                })()}

                {hoveredItem.trades && hoveredItem.trades.length === 1 && equityFilter !== 'trade' && (
                  <div className="flex justify-between items-center text-[11px] border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-bold">İşlemler</span>
                    <span className="text-zinc-300 font-black font-mono">1</span>
                  </div>
                )}

                {equityFilter === 'trade' && hoveredItem.trades && hoveredItem.trades.length === 1 && (
                  <div className="flex justify-between items-center text-[10px] border-t border-zinc-900/60 pt-1.5 mt-0.5">
                    <span className="text-zinc-500 font-bold">Parite</span>
                    <span className="text-zinc-400 font-bold font-mono">
                      {hoveredItem.trades[0].asset} <span className={hoveredItem.trades[0].type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>({hoveredItem.trades[0].type})</span>
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center text-xs text-zinc-400 font-mono px-1">
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
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      id="deep-analytics-view"
      className="flex flex-col w-full bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden divide-y divide-zinc-800/80 relative"
    >
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80 w-full relative z-20">
        {/* Kümülatif Kazanç Oranı */}
        <motion.div 
          variants={itemVariants} 
          className="bg-transparent p-4 hover:bg-zinc-800/20 transition-all duration-200 ease-out flex items-center justify-between cursor-pointer group" 
          onClick={() => handleMetricClick("cumulativeR", isRrMode ? `${metrics.totalR > 0 ? "+" : ""}${metrics.totalR.toFixed(1)} R` : `${metrics.totalClosedCashPnl > 0 ? "+" : ""}${(metrics?.totalClosedCashPnl || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`)}
        >
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                Kümülatif Kazanç
              </span>
            </div>
            <h3
              className={`text-xl sm:text-2xl font-bold tracking-tight leading-none font-mono ${
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
                    <span className="text-[10px] font-mono font-medium text-zinc-400 mt-0.5">
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
                    <span className="text-[10px] font-mono font-medium text-zinc-400 mt-0.5">
                      ({metrics.totalR > 0 ? "+" : ""}{metrics.totalR.toFixed(2)} R)
                    </span>
                  </div>
                )}
              </ValueTransition>
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 transition-transform shrink-0 ml-2">
            <TrendingUp size={18} />
          </div>
        </motion.div>

        {/* LONG VS SHORT PERFORMANSI */}
        <motion.div variants={itemVariants} className="bg-transparent p-4 transition-all duration-200 ease-out flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Layers size={11} />
              </span>
              Long / Short Dağılımı
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div 
              className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-2.5 rounded-xl cursor-pointer hover:bg-emerald-950/10 transition-all"
              onClick={() => handleMetricClick("longPerformance", `%${metrics.longStats.winRate.toFixed(1)} WR`)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">LONG</span>
                <span className="text-zinc-500 text-[9px]">{metrics.longStats.count} işlem</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 block font-mono">%{metrics.longStats.winRate.toFixed(1)} WR</span>
            </div>
            <div 
              className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-2.5 rounded-xl cursor-pointer hover:bg-rose-950/10 transition-all"
              onClick={() => handleMetricClick("shortPerformance", `%${metrics.shortStats.winRate.toFixed(1)} WR`)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px]">SHORT</span>
                <span className="text-zinc-500 text-[9px]">{metrics.shortStats.count} işlem</span>
              </div>
              <span className="text-xs font-bold text-rose-400 block font-mono">%{metrics.shortStats.winRate.toFixed(1)} WR</span>
            </div>
          </div>
        </motion.div>

        {/* İŞLEM SONUÇ DAĞILIMI */}
        <motion.div 
          variants={itemVariants} 
          className="bg-transparent p-4 hover:bg-zinc-800/20 transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group" 
          onClick={() => handleMetricClick("winRate", `%${(metrics.statusAnalysis.total ? (metrics.statusAnalysis.win / metrics.statusAnalysis.total) * 100 : 0).toFixed(1)}`)}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Target size={11} />
              </span>
              Sonuç Dağılımı
            </p>
            <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-800/90 px-2 py-0.5 rounded-lg border border-zinc-700/50">
              %{metrics.statusAnalysis.total ? ((metrics.statusAnalysis.win / metrics.statusAnalysis.total) * 100).toFixed(1) : 0} WR
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] w-full">
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-1.5">
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
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-1.5">
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
            <div className="flex-1 bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-1.5">
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

        {/* STREAK */}
        <motion.div variants={itemVariants} className="bg-transparent p-4 transition-all duration-200 ease-out flex flex-col justify-center relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Flame size={11} />
              </span>
              Seri Takibi
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex gap-1.5 w-full">
              <div 
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 px-2.5 py-1 rounded-xl flex items-center justify-between flex-1 cursor-pointer hover:bg-emerald-950/10 transition-all" 
                onClick={() => handleMetricClick("winStreak", metrics.winStreak)}
              >
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  MAX WIN
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {metrics.winStreak}
                </span>
              </div>
              <div 
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 px-2.5 py-1 rounded-xl flex items-center justify-between flex-1 cursor-pointer hover:bg-rose-950/10 transition-all" 
                onClick={() => handleMetricClick("lossStreak", metrics.lossStreak)}
              >
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  MAX LOSS
                </span>
                <span className="text-xs font-bold text-rose-400 font-mono">
                  {metrics.lossStreak}
                </span>
              </div>
            </div>

            {(() => {
              const curWin = metrics.currentWinStreak ?? 0;
              const curLoss = metrics.currentLossStreak ?? 0;
              const isGreen = curWin > 0;
              const isRed = curLoss > 0;
              
              let titleClass = "text-zinc-400";
              let badgeText = "NÖTR (SERİ YOK)";
              let streakVal = "0";

              if (isGreen) {
                titleClass = "text-emerald-400";
                badgeText = `${curWin} WIN SERİSİ`;
                streakVal = `+${curWin}`;
              } else if (isRed) {
                titleClass = "text-rose-400";
                badgeText = `${curLoss} LOSS SERİSİ`;
                streakVal = `-${curLoss}`;
              }

              return (
                <div 
                  className={`border px-2.5 py-1.5 rounded-xl flex items-center justify-between w-full transition-all duration-200 cursor-pointer ${
                    isGreen 
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15' 
                      : isRed 
                        ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15' 
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                  onClick={() => handleMetricClick("currentStreak", isGreen ? `Aktif ${curWin} Win` : isRed ? `Aktif ${curLoss} Loss` : "Aktif Seri Yok")}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${titleClass}`}>
                    AKTİF SERİ
                  </span>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={`text-xs font-bold font-mono ${isGreen ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {streakVal}
                    </span>
                    <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-lg border ${
                      isGreen 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : isRed 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}>
                      {badgeText}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>
      </div>

      {/* Matematiksel Beklenti & Sistem Statüsü & Equity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 w-full border-t border-zinc-800">
        <div className="lg:col-span-2 flex flex-col divide-y divide-zinc-800/80 h-full">
          {/* MATEMATİKSEL BEKLENTİ */}
          <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
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
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    Ort. Kazanç
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tracking-tight mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    {isRrMode ? (
                      <span className="flex flex-col">
                        <span>+{metrics.avgWinRR.toFixed(2)} <span className="text-xs font-bold text-emerald-400/80">R</span></span>
                        <span className="text-[10px] font-mono font-medium text-emerald-400/60 mt-0.5">(+{(metrics?.avgWinAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} {currency})</span>
                      </span>
                    ) : (
                      <span className="flex flex-col">
                        <span>+{(metrics?.avgWinAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} <span className="text-xs font-bold text-emerald-400/80">{currency}</span></span>
                        <span className="text-[10px] font-mono font-medium text-emerald-400/60 mt-0.5">(+{metrics.avgWinRR.toFixed(2)} R)</span>
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
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                    Ort. Kayıp
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-400 font-mono tracking-tight mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    {isRrMode ? (
                      <span className="flex flex-col">
                        <span>-{metrics.avgLossRR.toFixed(2)} <span className="text-xs font-bold text-rose-400/80">R</span></span>
                        <span className="text-[10px] font-mono font-medium text-rose-400/60 mt-0.5">(-{(metrics?.avgLossAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} {currency})</span>
                      </span>
                    ) : (
                      <span className="flex flex-col">
                        <span>-{(metrics?.avgLossAmount || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} <span className="text-xs font-bold text-rose-400/80">{currency}</span></span>
                        <span className="text-[10px] font-mono font-medium text-rose-400/60 mt-0.5">(-{metrics.avgLossRR.toFixed(2)} R)</span>
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
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
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
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-mono">
                    SQN PUANI
                  </p>
                  {(() => {
                    const s = isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn);
                    if (s < 1.6) return null;
                    return (
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                        s >= 3 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : s >= 2.5 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {s < 2.5 ? "Ortalama" : s < 3.0 ? "İyi Sistem" : "Mükemmel"}
                      </span>
                    );
                  })()}
                </div>
                <div className="mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${(isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn)) >= 2.5 ? "text-emerald-400" : (isRrMode ? metrics.sqn : (metrics.realSqn ?? metrics.sqn)) >= 1.6 ? "text-amber-400" : "text-rose-400"}`}>
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
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-mono">
                    İşlem Başı Beklenti
                  </p>
                </div>
                <div className="mt-1">
                  <ValueTransition modeKey={isRrMode}>
                    <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {isRrMode ? (
                        <span className="flex flex-col">
                          <span>{metrics.expectancy > 0 ? "+" : ""}{metrics.expectancy.toFixed(2)} <span className="text-xs font-bold">R</span></span>
                          <span className="text-[10px] font-mono font-medium text-zinc-400 mt-0.5">
                            ({metrics.expectancyCash >= 0 ? "+" : ""}{(metrics?.expectancyCash || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currency})
                          </span>
                        </span>
                      ) : (
                        <span className="flex flex-col">
                          <span>{metrics.expectancyCash >= 0 ? "+" : ""}{(metrics?.expectancyCash || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-bold">{currency}</span></span>
                          <span className="text-[10px] font-mono font-medium text-zinc-400 mt-0.5">
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
                          className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider uppercase rounded-lg transition-all duration-150 ${
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
                <span className="text-xs font-mono px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300">
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
              <div className="h-36 flex flex-1 items-center justify-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-900 text-xs text-zinc-500 font-mono">
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
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CalendarIcon size={11} />
              </span>
              Gün Performansı
            </p>
          </div>
          {metrics.totalDays === 0 ? (
            <p className="text-center py-5 text-xs text-zinc-600 font-mono">
              Veri yok.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-emerald-950/10 transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); handleMetricClick("profitableDays", metrics.greenDays + " Gün"); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] block uppercase font-bold text-emerald-400 font-mono">Kârlı Gün</span>
                  <CheckCircle2 size={13} className="text-emerald-400/80" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 block font-mono mt-0.5">
                  {metrics.greenDays} <span className="text-xs text-emerald-400/70 font-normal">Gün</span>
                </span>
              </div>
              <div 
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-rose-950/10 transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); handleMetricClick("profitableDays", metrics.redDays + " Gün"); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] block uppercase font-bold text-rose-400 font-mono">Zararlı Gün</span>
                  <XCircle size={13} className="text-rose-400/80" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-rose-400 block font-mono mt-0.5">
                  {metrics.redDays} <span className="text-xs text-rose-400/70 font-normal">Gün</span>
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Maks. Kazanç / Maks. Kayıp */}
        <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
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
                <span className="text-[10px] block uppercase font-bold text-emerald-400 font-mono">Maks. Kazanç</span>
                <TrendingUp size={13} className="text-emerald-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-400 block font-mono mt-0.5">
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
                <span className="text-[10px] block uppercase font-bold text-rose-400 font-mono">Maks. Kayıp</span>
                <TrendingDown size={13} className="text-rose-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-rose-400 block font-mono mt-0.5">
                -{(metrics.worstTrade ? Math.abs(metrics.worstTrade.rr || 0).toFixed(2) : "0")} <span className="text-xs">R</span>
                <span className="text-[10px] text-rose-400/70 block mt-0.5 font-normal">
                  -{Math.abs(metrics.worstTrade?.pnl || 0).toLocaleString()} {currency}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <AdvancedMetricsDashboard trades={trades} currency={currency} onMetricClick={handleMetricClick} onEdit={onEdit} sessions={sessions} />
      
      <MetricDetailModal 
        isOpen={!!selectedMetric} 
        onClose={() => setSelectedMetric(null)} 
        metric={selectedMetric} 
        currency={currency}
      />

      {createPortal(
        <AnimatePresence>
          {selectedEquityPoint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ willChange: 'opacity' }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setSelectedEquityPoint(null)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ willChange: 'opacity' }}
                className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950/90 border border-zinc-800/80 rounded-xl shadow-2xl relative overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-zinc-950/60 border-b border-zinc-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 flex-1 min-w-0">
                    <div className="bg-blue-500/10 border border-blue-500/20 px-2 sm:px-3 py-1.5 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[10px] sm:text-sm font-black text-blue-400 font-mono tracking-widest uppercase flex items-center justify-center leading-none">
                        <LineChart size={16} className="mr-1.5 text-blue-400 shrink-0" />
                        {selectedEquityPoint.title}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <h2 className="text-zinc-100 font-black text-[10px] sm:text-sm uppercase tracking-wider font-mono leading-none flex items-center whitespace-nowrap">İşlem Geçmişi</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintModalState({
                          isOpen: true,
                          trades: selectedEquityPoint.trades,
                          title: `${selectedEquityPoint.title} İşlem Raporu`,
                          dateRangeText: selectedEquityPoint.title
                        });
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-colors duration-200 ease-out cursor-pointer group shadow-xs shrink-0"
                    >
                      <Download size={18} className="transition-colors" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedEquityPoint(null)}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm/80 rounded-lg transition-colors duration-200 ease-out cursor-pointer group shadow-xs shrink-0"
                    >
                      <X size={18} className="transition-colors" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900 border-b border-zinc-800/80 shrink-0 select-none w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 text-zinc-100 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">TOPLAM:</span>
                      <span className="text-xs font-black text-white font-mono">{selectedEquityPoint.trades.length}</span>
                    </div>
                    {(() => {
                      const longTrades = selectedEquityPoint.trades.filter(t => t.type === 'LONG');
                      const shortTrades = selectedEquityPoint.trades.filter(t => t.type === 'SHORT');
                      
                      const longWins = longTrades.filter(t => t.status === 'WIN').length;
                      const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
                      
                      const shortWins = shortTrades.filter(t => t.status === 'WIN').length;
                      const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;
                      
                      return (
                        <>
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">LONG:</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">{longTrades.length}</span>
                            <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">%{longWinRate.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest font-mono">SHORT:</span>
                            <span className="text-xs font-black text-rose-400 font-mono">{shortTrades.length}</span>
                            <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                            <span className="text-xs font-black text-rose-400 font-mono">%{shortWinRate.toFixed(1)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                    {(() => {
                      const sessionBreakdown = selectedEquityPoint.trades.reduce((acc, t) => {
                        const s = t.session || 'Belirtilmemiş';
                        if (!acc[s]) acc[s] = { pnl: 0, rr: 0 };
                        acc[s].pnl += t.pnl || 0;
                        acc[s].rr += t.rr || 0;
                        return acc;
                      }, {} as Record<string, { pnl: number, rr: number }>);

                      return Object.entries(sessionBreakdown).map(([session, vals]) => {
                        const val = isRrMode ? vals.rr : vals.pnl;
                        if (val === 0) return null;
                        
                        const isProfit = val > 0;
                        const isLoss = val < 0;
                        
                        const textColorClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        const bgClass = isProfit ? 'bg-emerald-500/10 border-emerald-500/20' : isLoss ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-500/10 border-zinc-500/20';
                        const labelClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        
                        return (
                          <div key={session} className={`flex items-center justify-center gap-1 shrink-0 px-2.5 py-1 rounded-lg border leading-none ${bgClass}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest leading-none font-mono ${labelClass}`}>{session}:</span>
                            <span className={`text-[9px] font-black font-mono leading-none ${textColorClass}`}>
                              {isRrMode ? `${val > 0 ? '+' : ''}${val.toFixed(1)}R` : `${val > 0 ? '+' : ''}${val.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[300px] px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                  <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                    <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                      <tr className="text-[9px] text-zinc-400 uppercase tracking-widest relative after:absolute after:inset-0 after:rounded-lg after:border after:border-zinc-800/80 after:pointer-events-none">
                        <th className="py-1.5 px-3 font-mono select-none w-[20%] min-w-[120px] bg-zinc-900 rounded-l-xl text-left">Parite</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[11%] min-w-[65px] bg-zinc-900">Yön</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[11%] min-w-[65px] bg-zinc-900">RR</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-900">Session</th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-900">Sonuç</th>
                        <th className="py-1.5 px-3 text-right font-mono select-none w-[18%] min-w-[95px] bg-zinc-900"><div className="flex items-center justify-end w-full relative"><span>Kâr/Zarar</span></div></th>
                        <th className="py-1.5 px-2 text-center font-mono select-none w-[12%] min-w-[80px] bg-zinc-900 rounded-r-xl">Platform</th>
                      </tr>
                    </thead>
                    <tbody className="block sm:table-row-group">
                      {selectedEquityPoint.trades.slice(0, 100).map((t, idx) => {
                        const isWin = t.status === 'WIN';
                        const isLoss = t.status === 'LOSS';
                        const isBe = t.status === 'BREAKEVEN';
                        let pnlText = '—';
                        let pnlColor = 'text-zinc-400';
                        if (isBe) {
                          pnlText = `0.00 ${currency}`;
                          pnlColor = 'text-zinc-500 font-bold';
                        } else {
                          const pnlValue = t.pnl || 0;
                          const prefix = pnlValue > 0 ? '+' : '';
                          pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                          pnlColor = pnlValue > 0 ? 'text-emerald-400 font-bold' : (pnlValue < 0 ? 'text-rose-400 font-bold' : 'text-zinc-500 font-bold');
                        }
                        
                        return (
                          <tr 
                            key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                            onClick={() => setSelectedTrade(t)}
                            className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-800 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0 align-middle"
                          >
                            <td className="w-1/2 sm:w-[20%] sm:min-w-[120px] flex justify-start items-center sm:table-cell order-1 py-1 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-mono sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-l-xl sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                                <span className="text-white font-bold text-xs sm:text-[10px]">{t.asset}</span>
                                <span className="text-[10px] sm:text-[10px] text-zinc-500 sm:text-zinc-400 transition-colors">{new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                              </div>
                            </td>
                            <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 align-middle">
                              <div className="flex items-center justify-center w-full">
                                {t.type === 'LONG' ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LONG</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">SHORT</span>
                                )}
                              </div>
                            </td>
                            <td className="w-1/2 sm:w-[11%] sm:min-w-[65px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                                <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
                                <div className="flex items-center justify-center w-full h-[18px]">{t.rr !== undefined && t.rr !== null && t.rr !== 0 ? (
                                  t.rr > 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                      +{t.rr}R
                                    </span>
                                  ) : t.rr < 0 ? (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">
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
                                <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.session || 'Diğer'}>
                                  {t.session || 'Diğer'}
                                </span>
                              </div>
                            </td>
                            <td className="w-1/2 sm:w-[14%] sm:min-w-[75px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 align-middle">
                              <div className="flex items-center justify-center w-full h-[18px]">
                                {isWin ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">WIN</span>
                                ) : isLoss ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LOSS</span>
                                ) : isBe ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">BE</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">AÇIK</span>
                                )}
                              </div>
                            </td>
                            <td className={`w-full sm:w-[18%] sm:min-w-[95px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 max-sm:pt-3 max-sm:border-t max-sm:border-zinc-800/50 sm:py-1 align-middle`}>
                              <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end sm:h-[20px]">
                                <span className="text-sm sm:text-[11px] font-bold font-sans inline-flex items-center justify-end h-[20px] leading-none tracking-tight">{pnlText}</span>
                              </div>
                            </td>
                            <td className="w-full sm:w-[12%] sm:min-w-[80px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-2 text-center sm:bg-zinc-900 group-hover:bg-blue-950/10 sm:rounded-r-xl sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0 align-middle">
                              <div className="sm:hidden">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Platform</span>
                              </div>
                              <div className="flex items-center justify-center w-full">
                                {t.platform ? (
                                  <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.platform}>
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
                      {selectedEquityPoint.trades.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">Bu periyot için herhangi bir işlem bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <TradeDetailModal 
        key="deepanalysis-trade-detail"
        trade={selectedTrade} 
        onClose={() => setSelectedTrade(null)} 
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedTrade(null);
          setSelectedEquityPoint(null);
        }}
        currency={currency} 
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

export default DeepAnalysis;
