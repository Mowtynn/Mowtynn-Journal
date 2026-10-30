import { EASE } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useMemo, useEffect } from "react";
import { nyIsoWeekKey } from "../lib/advancedMetrics";

// Sermaye eğrisi her noktada tarih yazar: biçimleyiciler bir kez kurulur (toLocaleDateString her çağrıda yenisini kurar)
const TR_LONG = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const TR_SHORT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const TR_MONTH = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
import { motion, AnimatePresence } from "motion/react";
import { computeDeepMetrics } from "../lib/deepMetrics";
import { Trade, DefinitionTitles } from "../types";
import { DEFAULT_DEFINITION_TITLES, DEFAULT_PLAN_FIDELITIES } from "../constants/constants";
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
import { lazyWithPreload, named } from "../lib/lazyWithPreload";
import { Deferred } from "./common/Deferred";

// Gelişmiş metrikler + strateji laboratuvarı ayrı parçada; sekmenin üst kısmı önce çizilir
const AdvancedMetricsDashboard = lazyWithPreload(() => named(import("./AdvancedMetricsDashboard"), "AdvancedMetricsDashboard"));
import { CalendarView } from "./CalendarView";
import { TradeHistoryModal } from "./TradeHistoryModal";
import { MemoizedEquityChart } from './deepAnalysis/EquityChart';
import { nyWallDate } from '../lib/tradingTime';
import { setupQualityTier } from '../lib/discipline';

interface DeepAnalysisProps {
  trades: Trade[];
  onViewDetails: (trade: Trade, list?: Trade[]) => void;
  onEdit?: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  sessions?: string[];
  definitionTitles?: DefinitionTitles;
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
}


const DeepAnalysisInner = React.memo(function DeepAnalysisInner({
  trades,
  onEdit,
  sessions = [],
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  planFidelities = [],
}: DeepAnalysisProps) {

  const [selectedMetric, setSelectedMetric] = useState<MetricDetail | null>(null);
  const [equityFilter, setEquityFilter] = useState<'trade' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [isEquityFilterOpen, setIsEquityFilterOpen] = useState(false);
  const [selectedEquityPoint, setSelectedEquityPoint] = useState<{ title: string; trades: Trade[] } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEquityPoint) {
          setSelectedEquityPoint(null);
        } else if (selectedMetric) {
          setSelectedMetric(null);
        } else if (isEquityFilterOpen) {
          setIsEquityFilterOpen(false);
        }
      }
    };
    if (selectedEquityPoint || selectedMetric || isEquityFilterOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEquityPoint, selectedMetric, isEquityFilterOpen]);

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

  const metrics = useMemo(
    () => ({ ...computeDeepMetrics(closedTrades), planFidelityStats: buildPlanFidelityStats(closedTrades, planFidelities) }),
    [closedTrades, planFidelities],
  );

  const chartEquityCurve = useMemo(() => {
    if (!metrics?.equityCurve) return [];
    if (equityFilter === 'trade') {
      return metrics.equityCurve.map((pt) => ({
        ...pt,
        fullTitle: pt.trade 
          ? TR_LONG.format(nyWallDate(pt.trade.createdAt))
          : pt.label || 'İşlem Detayı',
        trades: pt.trade ? [pt.trade] : []
      }));
    }

    const grouped: Record<string, any> = {};
    metrics.equityCurve.forEach(pt => {
      const date = nyWallDate(pt.timestamp);
      let key = '';
      let label = '';
      let fullTitle = '';
      
      if (equityFilter === 'daily') {
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        label = TR_SHORT.format(date);
        fullTitle = TR_LONG.format(date);
      } else if (equityFilter === 'weekly') {
        // ISO hafta (Pazartesi–Pazar, NY günü): projedeki diğer haftalık hesaplarla aynı tanım
        key = nyIsoWeekKey(pt.timestamp);
        const [wy, wn] = key.split('-W');
        label = `Hafta ${wn}`;
        fullTitle = `${wy} Hafta ${wn}`;
      } else if (equityFilter === 'monthly') {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = TR_MONTH.format(date);
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
        grouped[key].drawdown = pt.drawdown;
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
      transition: { duration: 0.3, ease: EASE as any }
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
          className="bg-transparent p-3.5 sm:p-4 hover:bg-zinc-800/20 transition-ui duration-200 ease-out flex items-center justify-between cursor-pointer group" 
          onClick={() => handleMetricClick("cumulativeR", `${metrics.totalR > 0 ? "+" : ""}${metrics.totalR.toFixed(1)} R`)}
        >
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans">
                {smartUpper("Kümülatif Kazanç")}
              </span>
            </div>
            <h3
              className={`text-lg sm:text-xl font-bold tracking-tight leading-none font-sans ${
                (metrics.totalR) > 0
                  ? "text-emerald-400"
                  : (metrics.totalR) < 0
                    ? "text-rose-400"
                    : "text-zinc-400"
              }`}
            >
                {(
                  <div className="flex flex-col">
                    <span className="flex items-baseline gap-1">
                      {metrics.totalR > 0 ? "+" : ""}
                      {metrics.totalR.toFixed(2)}
                      <span className="text-xs text-emerald-400/80 font-bold">R</span>
                    </span>
                  </div>
                )}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 transition-transform shrink-0 ml-2">
            <TrendingUp size={17} />
          </div>
        </motion.div>

        {/* LONG VS SHORT PERFORMANSI */}
        <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 transition-ui duration-200 ease-out flex flex-col justify-center">
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
              className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-2 rounded-xl cursor-pointer hover:bg-emerald-950/10 transition-ui"
              onClick={() => handleMetricClick("longPerformance", `%${metrics.longStats.winRate.toFixed(1)} WR`)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">LONG</span>
                <span className="text-zinc-500 text-[8.5px]">{metrics.longStats.count} işlem</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 block font-sans">%{metrics.longStats.winRate.toFixed(1)} WR</span>
            </div>
            <div 
              className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-2 rounded-xl cursor-pointer hover:bg-rose-950/10 transition-ui"
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
          className="bg-transparent p-3.5 sm:p-4 hover:bg-zinc-800/20 transition-ui duration-200 ease-out flex flex-col justify-center cursor-pointer group" 
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
                  className="bg-emerald-500 h-full rounded-full transition-[width] duration-300"
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
                  className="bg-rose-500 h-full rounded-full transition-[width] duration-300"
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
                  className="bg-zinc-400 h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${metrics.statusAnalysis.total ? (metrics.statusAnalysis.breakeven / metrics.statusAnalysis.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SETUP KALİTESİ İSTATİSTİKLERİ */}
        <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 transition-ui duration-200 ease-out flex flex-col justify-center relative">
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
                  className={`flex-1 min-w-0 bg-zinc-950/60 border ${opt.theme.border} hover:bg-zinc-900/80 p-2 rounded-xl flex flex-col justify-between cursor-pointer transition-ui duration-200 group relative overflow-hidden`}
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
                          `Kümülatif Getiri: ${opt.totalR > 0 ? '+' : ''}${opt.totalR.toFixed(2)} R`,
                          hasTrades 
                            ? `İşlem Başı Ortalama: ${(opt.totalR / opt.count).toFixed(2)} R`
                            : 'Henüz bu Setup Kalitesinde kapatılmış işlem bulunmamaktadır.'
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
                      className={`${opt.theme.bar} h-full rounded-full transition-[width] duration-300`}
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
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-3.5 cursor-pointer hover:bg-emerald-950/10 transition-ui duration-200 flex flex-col justify-between" 
                onClick={() => handleMetricClick("averageWin", "+" + metrics.avgWinRR.toFixed(2) + " R")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-sans">
                    Ort. Kazanç
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400 font-sans tracking-tight mt-1">
                    {(
                      <span className="flex flex-col">
                        <span>+{metrics.avgWinRR.toFixed(2)} <span className="text-xs font-bold text-emerald-400/80">R</span></span>
                      </span>
                    )}
                </div>
              </div>
              
              <div 
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-3.5 cursor-pointer hover:bg-rose-950/10 transition-ui duration-200 flex flex-col justify-between" 
                onClick={() => handleMetricClick("averageLoss", "-" + metrics.avgLossRR.toFixed(2) + " R")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-sans">
                    Ort. Kayıp
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-400 font-sans tracking-tight mt-1">
                    {(
                      <span className="flex flex-col">
                        <span>-{metrics.avgLossRR.toFixed(2)} <span className="text-xs font-bold text-rose-400/80">R</span></span>
                      </span>
                    )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* SİSTEM STATÜSÜ */}
          <motion.div variants={itemVariants} className="bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out flex flex-col justify-center flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
                <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Activity size={11} />
                </span>
                Sistem Statüsü & Kalitesi
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 items-stretch w-full h-full">
              <div 
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:bg-amber-950/10 hover:border-amber-500/30 transition-ui duration-200 ease-out group shadow-xs" 
                onClick={() => handleMetricClick("sqn", (metrics.sqn)?.toFixed(2) || "0.00")}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-sans">
                    SQN PUANI
                  </p>
                  {(() => {
                    const s = metrics.sqn;
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
                    <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight ${(metrics.sqn) >= 2.5 ? "text-emerald-400" : (metrics.sqn) >= 1.6 ? "text-amber-400" : "text-rose-400"}`}>
                      {(metrics.sqn)?.toFixed(2) || "0.00"}
                    </span>
                </div>
              </div>

              <div 
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer hover:bg-blue-950/10 hover:border-blue-500/30 transition-ui duration-200 ease-out group shadow-xs" 
                onClick={() => handleMetricClick("expectancy", (metrics.expectancy > 0 ? "+" : "") + metrics.expectancy.toFixed(2) + " R")}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold font-sans">
                    İşlem Başı Beklenti
                  </p>
                </div>
                <div className="mt-1">
                    <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight ${metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {(
                        <span className="flex flex-col">
                          <span>{metrics.expectancy > 0 ? "+" : ""}{metrics.expectancy.toFixed(2)} <span className="text-xs font-bold">R</span></span>
                        </span>
                      )}
                    </span>
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
                Kümülatif R Eğrisi
              </h3>
              
              <div className="relative ml-1">
                <button aria-label="Filtrele" title="Filtrele"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsEquityFilterOpen(!isEquityFilterOpen); }}
                  className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-ui duration-150 ${
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
                      transition={{ duration: 0.15, ease: EASE }}
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
                          className={`px-2 py-0.5 text-[9px] font-bold font-sans tracking-wider uppercase rounded-lg transition-ui duration-150 ${
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
                  <b className={((chartEquityCurve[chartEquityCurve.length - 1]?.cumulativePnl ?? 0)) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {(
                        `${(chartEquityCurve[chartEquityCurve.length - 1]?.cumulativePnl ?? 0).toFixed(2)} R`
                      )}
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
        <NewDeepAnalysisMetrics metrics={metrics} onMetricClick={handleMetricClick} />
      </div>

      {/* Takvim & Günlük Analiz Header & Calendar */}
      <div className="w-full border-b border-zinc-800">
        <motion.div
          variants={itemVariants}
          className="flex flex-col bg-transparent p-4 sm:p-5 transition-colors duration-200 ease-out w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <CalendarIcon size={15} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-sans tracking-tight">
                  Takvim & Günlük Analiz
                </h3>
              </div>
            </div>
          </div>
          <CalendarView trades={trades} onEdit={onEdit} />
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
                className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-emerald-950/10 transition-ui duration-200"
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
                className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-rose-950/10 transition-ui duration-200"
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
              className="bg-zinc-950/60 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-emerald-950/10 transition-ui duration-200"
              onClick={(e) => { e.stopPropagation(); handleMetricClick("largestWin", ("+" + (metrics.bestTrade ? (metrics.bestTrade.rr || 0).toFixed(1) : "0") + " R")); }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] block uppercase font-bold text-emerald-400 font-sans">Maks. Kazanç</span>
                <TrendingUp size={13} className="text-emerald-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-400 block font-sans mt-0.5">
                +{(metrics.bestTrade ? (metrics.bestTrade.rr || 0).toFixed(2) : "0")} <span className="text-xs">R</span>
              </span>
            </div>
            <div 
              className="bg-zinc-950/60 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl cursor-pointer hover:bg-rose-950/10 transition-ui duration-200"
              onClick={(e) => { e.stopPropagation(); handleMetricClick("largestLoss", ("-" + (metrics.worstTrade ? Math.abs(metrics.worstTrade.rr || 0).toFixed(1) : "0") + " R")); }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] block uppercase font-bold text-rose-400 font-sans">Maks. Kayıp</span>
                <TrendingDown size={13} className="text-rose-400/80" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-rose-400 block font-sans mt-0.5">
                -{(metrics.worstTrade ? Math.abs(metrics.worstTrade.rr || 0).toFixed(2) : "0")} <span className="text-xs">R</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>



      <Deferred minHeight={900} idleMs={600}>
        <AdvancedMetricsDashboard trades={trades} onMetricClick={handleMetricClick} onEdit={onEdit} sessions={sessions} />
      </Deferred>
      
      <MetricDetailModal 
        isOpen={!!selectedMetric} 
        onClose={() => setSelectedMetric(null)} 
        metric={selectedMetric} 
      />

      <TradeHistoryModal
        isOpen={!!selectedEquityPoint}
        onClose={() => setSelectedEquityPoint(null)}
        title={selectedEquityPoint?.title || ""}
        icon={<LineChart size={16} className="mr-1.5 text-blue-400 shrink-0" />}
        trades={selectedEquityPoint?.trades || []}
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedEquityPoint(null);
        }}
        definitionTitles={definitionTitles}
      />

    </motion.div>
  );
});


// Renk kademesi tek kaynaktan (lib/discipline · setupQualityTier)
type OptionTheme = { border: string; bg: string; text: string; bar: string; badge: string; type: 'positive' | 'negative' | 'neutral' };
const optionTheme = (name: string): OptionTheme => {
  const tier = setupQualityTier(name);
  if (tier === 'high') return { border: "border-emerald-500/25 hover:border-emerald-500/50", bg: "bg-zinc-950/60 hover:bg-emerald-950/20", text: "text-emerald-400", bar: "bg-emerald-500", badge: "text-emerald-400/80", type: 'positive' };
  if (tier === 'low') return { border: "border-rose-500/25 hover:border-rose-500/50", bg: "bg-zinc-950/60 hover:bg-rose-950/20", text: "text-rose-400", bar: "bg-rose-500", badge: "text-rose-400/80", type: 'negative' };
  if (tier === 'mid') return { border: "border-blue-500/25 hover:border-blue-500/50", bg: "bg-zinc-950/60 hover:bg-blue-950/20", text: "text-blue-300", bar: "bg-blue-500", badge: "text-blue-300/80", type: 'neutral' };
  return { border: "border-purple-500/25 hover:border-purple-500/50", bg: "bg-zinc-950/60 hover:bg-purple-950/20", text: "text-purple-400", bar: "bg-purple-500", badge: "text-purple-400/80", type: 'neutral' };
};

/**
 * Setup Kalitesi kartları: tanımlı seçenekler + işlemlerde geçen diğer değerler.
 * Büyük/küçük harf farkı aynı seçenek sayılır ("a+" ile "A+" tek satırda toplanır).
 */
function buildPlanFidelityStats(trades: Trade[], planFidelities: string[]) {
  const map = new Map<string, { label: string; count: number; wins: number; losses: number; be: number; totalR: number }>();
  let totalWithFidelity = 0;
  trades.forEach((t) => {
    const pf = (t.planFidelity || "").trim();
    if (!pf) return;
    totalWithFidelity++;
    const key = pf.toLocaleLowerCase("tr");
    const row = map.get(key) || { label: pf, count: 0, wins: 0, losses: 0, be: 0, totalR: 0 };
    row.count++;
    if (t.status === "WIN") row.wins++;
    else if (t.status === "LOSS") row.losses++;
    else row.be++;
    row.totalR += typeof t.rr === "number" && Number.isFinite(t.rr) ? t.rr : 0;
    map.set(key, row);
  });

  const names: string[] = [];
  const seen = new Set<string>();
  const push = (n: string) => {
    const v = (n || "").trim();
    const k = v.toLocaleLowerCase("tr");
    if (v && !seen.has(k)) {
      seen.add(k);
      names.push(v);
    }
  };
  (planFidelities.length > 0 ? planFidelities : DEFAULT_PLAN_FIDELITIES).forEach(push);
  map.forEach((row) => push(row.label));

  const options = names.map((name) => {
    const d = map.get(name.toLocaleLowerCase("tr"));
    const count = d?.count || 0;
    return {
      name,
      count,
      wins: d?.wins || 0,
      losses: d?.losses || 0,
      be: d?.be || 0,
      totalR: d?.totalR || 0,
      winRate: count > 0 ? ((d?.wins || 0) / count) * 100 : 0,
      ratio: totalWithFidelity > 0 ? (count / totalWithFidelity) * 100 : 0,
      theme: optionTheme(name),
    };
  });
  return { totalWithFidelity, options };
}

export const DeepAnalysis = React.memo((props: DeepAnalysisProps) => {
  return <DeepAnalysisInner {...props} />;
});

export default DeepAnalysis;
