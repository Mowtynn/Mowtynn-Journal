import React from 'react';
import { motion } from 'motion/react';
import { TradeStats } from '../types';
import { useMetricMode } from '../context/MetricContext';
import { useAppStore } from '../store/useAppStore';
import { ValueTransition } from './ValueTransition';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Trophy, 
  Calendar,
  Layers,
  Percent,
  Sparkles,
} from 'lucide-react';

interface StatsDashboardProps {
  stats: TradeStats;
  currency: string;
}

const StatsDashboard = React.memo(function StatsDashboard({ stats, currency }: StatsDashboardProps) {
  const { isRrMode } = useMetricMode();
  const { isQuantMode } = useAppStore();
  
  const isPnlPositive = stats.netPnl > 0;
  const isPnlNegative = stats.netPnl < 0;

  const pnlColorClass = isPnlPositive 
    ? 'text-emerald-400'
    : isPnlNegative 
      ? 'text-rose-400'
      : 'text-zinc-400';

  const rColorClass = stats.netR > 0
    ? 'text-emerald-400'
    : stats.netR < 0
      ? 'text-rose-400'
      : 'text-zinc-400';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.15, ease: "easeOut" as any } 
    },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5"
    >
      {/* 1. Net Profit Card */}
      <motion.div 
        variants={itemVariants}
        id="stat-net-pnl" 
        className={`bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 ${
          isPnlPositive 
            ? 'hover:bg-emerald-950/10 hover:border-emerald-500/30' 
            : isPnlNegative 
              ? 'hover:bg-rose-950/10 hover:border-rose-500/30' 
              : 'hover:bg-zinc-800/30 hover:border-zinc-700'
        } transition-all duration-200 ease-out flex flex-col justify-between group shadow-sm`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
            <span className={`p-1 rounded-md border ${
              isPnlPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
              isPnlNegative ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
              'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {isPnlPositive ? (
                <TrendingUp size={11} className="group-hover:scale-110 transition-transform" />
              ) : isPnlNegative ? (
                <TrendingDown size={11} className="group-hover:scale-110 transition-transform" />
              ) : (
                <Activity size={11} className="group-hover:scale-110 transition-transform" />
              )}
            </span>
            {isQuantMode ? "CUMULATIVE DELTA OUTPUT" : "Net Kâr / Zarar"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <ValueTransition modeKey={isRrMode}>
              {isRrMode ? (
                <>
                  <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${rColorClass}`}>
                    {stats.netR > 0 ? '+' : ''}{stats.netR.toFixed(2)}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ml-0.5 ${isPnlPositive ? 'text-emerald-400/70' : isPnlNegative ? 'text-rose-400/70' : 'text-zinc-400'}`}>R</span>
                </>
              ) : (
                <>
                  <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${pnlColorClass}`}>
                    {stats.netPnl > 0 ? '+' : ''}{(stats?.netPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ml-0.5 ${isPnlPositive ? 'text-emerald-400/70' : isPnlNegative ? 'text-rose-400/70' : 'text-zinc-400'}`}>{currency}</span>
                </>
              )}
            </ValueTransition>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="bg-zinc-900 border border-zinc-800 py-0.5 px-2 rounded-lg flex items-center gap-1.5">
              <span className={`text-[10px] font-bold font-mono ${isPnlPositive ? 'text-emerald-400' : isPnlNegative ? 'text-rose-400' : 'text-zinc-400'}`}>
                {isRrMode 
                  ? `${stats.netPnl > 0 ? '+' : ''}${(stats?.netPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                  : `${stats.netR > 0 ? '+' : ''}${stats.netR.toFixed(2)} R`
                }
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              <span className="text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">{stats.closedTrades}</span>
              {isQuantMode ? "Model Samples" : "İşlem"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Win Rate Gauge */}
      <motion.div 
        variants={itemVariants}
        id="stat-win-rate" 
        className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 hover:bg-blue-950/10 hover:border-blue-500/30 transition-all duration-200 ease-out flex flex-col justify-between group shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Percent size={11} className="group-hover:scale-110 transition-transform" />
            </span>
            {isQuantMode ? "MODEL HIT RATE" : "Kazanma Oranı (WR)"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-blue-300 font-mono tracking-tight">
              %{stats.winRate.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono py-0.5 px-2 rounded-lg">
                {stats.winningTrades} {isQuantMode ? "Validated" : "Win"}
              </span>
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold font-mono py-0.5 px-2 rounded-lg">
                {stats.losingTrades} {isQuantMode ? "Null" : "Loss"}
              </span>
            </div>
            
            <div className="p-1 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
              <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 transform -rotate-90">
                  <circle 
                    cx="7" 
                    cy="7" 
                    r="5.5" 
                    className="stroke-zinc-800" 
                    strokeWidth="1.8" 
                    fill="transparent" 
                  />
                  <circle 
                    cx="7" 
                    cy="7" 
                    r="5.5" 
                    className="stroke-blue-400 transition-colors duration-200" 
                    strokeWidth="1.8" 
                    fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 5.5}`}
                    strokeDashoffset={`${2 * Math.PI * 5.5 * (1 - (stats.winRate || 0) / 100)}`}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Profit Factor Card */}
      <motion.div 
        variants={itemVariants}
        id="stat-profit-factor" 
        className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 hover:bg-emerald-950/10 hover:border-emerald-500/30 transition-all duration-200 ease-out flex flex-col justify-between group shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp size={11} className="group-hover:scale-110 transition-transform" />
            </span>
            {isQuantMode ? "EFFICIENCY INDEX" : "Profit Factor"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight ${stats.profitFactor > 1.5 ? "text-emerald-400" : "text-blue-400"}`}>
              {stats.profitFactor === Infinity ? 'Sonsuz' : stats.profitFactor.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="bg-zinc-900 border border-zinc-800 py-0.5 px-2 rounded-lg flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-zinc-300">
                {stats.profitFactor >= 2.0 
                  ? (isQuantMode ? '⭐ Optimal Convergence' : '⭐ Harika')
                  : stats.profitFactor >= 1.5 
                    ? (isQuantMode ? '🏆 Sustainable' : '🏆 Sürdürülebilir')
                    : stats.profitFactor >= 1.0 
                      ? (isQuantMode ? '📈 Profitable' : '📈 Kazançta')
                      : (isQuantMode ? '🚨 High Risk' : '🚨 Riskli')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Win/Loss Ratio & Averages */}
      <motion.div 
        variants={itemVariants}
        id="stat-win-loss-ratio" 
        className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 hover:bg-indigo-950/10 hover:border-indigo-500/30 transition-all duration-200 ease-out flex flex-col justify-between group shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={11} className="group-hover:scale-110 transition-transform" />
            </span>
            {isQuantMode ? "ALGORITHMIC EXPECTANCY" : "Ortalama Beklenti"}
          </p>
        </div>

        <div className="mt-auto space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-zinc-400">{isQuantMode ? "Avg. Validated:" : "Ort. Win:"}</span>
            <span className="text-emerald-400 font-bold overflow-hidden">
              <ValueTransition modeKey={isRrMode}>
                {isRrMode 
                  ? `+${stats.averageWinRR.toFixed(1)} R`
                  : `+${stats.averageWin.toFixed(0)} ${currency}`
                }
              </ValueTransition>
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-zinc-400">{isQuantMode ? "Avg. Deviation:" : "Ort. Loss:"}</span>
            <span className="text-rose-400 font-bold overflow-hidden">
              <ValueTransition modeKey={isRrMode}>
                {isRrMode
                  ? `-${Math.abs(stats.averageLossRR).toFixed(1)} R`
                  : `-${Math.abs(stats.averageLoss).toFixed(0)} ${currency}`
                }
              </ValueTransition>
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono border-t border-zinc-800/80 pt-1">
            <span className="text-zinc-400 font-bold">{isQuantMode ? "Net Expectancy:" : "Beklenti:"}</span>
            <span className={`font-black overflow-hidden flex flex-col items-end ${stats.expectancyRR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <ValueTransition modeKey={isRrMode}>
                {isRrMode
                   ? `${stats.expectancyRR > 0 ? '+' : ''}${stats.expectancyRR.toFixed(2)} R`
                   : `${stats.expectancyCash > 0 ? '+' : ''}${(stats.expectancyCash || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${currency}`
                }
              </ValueTransition>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Secondary Row: Insights */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden col-span-1 md:col-span-2 bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/30 hover:bg-amber-950/10 rounded-xl p-3.5 shadow-sm transition-all duration-200 ease-out flex flex-col justify-between group"
      >
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy size={11} className="group-hover:scale-110 transition-transform" />
            </span>
            {isQuantMode ? "ASSET CORRELATION" : "Parite Başarı Analizi"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="bg-zinc-900 border border-emerald-500/20 rounded-lg p-2.5 flex flex-col justify-between group-hover:border-emerald-500/30 transition-all">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold font-mono">{isQuantMode ? "OPTIMAL DATA STREAM" : "En Verimli Parite"}</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 font-mono truncate">{stats.bestAsset || '—'}</p>
          </div>
          <div className="bg-zinc-900 border border-rose-500/20 rounded-lg p-2.5 flex flex-col justify-between group-hover:border-rose-500/30 transition-all">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold font-mono">{isQuantMode ? "SUBOPTIMAL DATA STREAM" : "En Verimsiz Parite"}</p>
            <p className="text-xs sm:text-sm font-bold text-rose-400 mt-1 font-mono truncate">{stats.worstAsset || '—'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden col-span-1 md:col-span-2 bg-zinc-950/60 border border-zinc-800/80 hover:border-blue-500/30 hover:bg-blue-950/10 rounded-xl p-3.5 shadow-sm transition-all duration-200 ease-out flex flex-col justify-between group"
      >
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Calendar size={11} className="group-hover:scale-110 transition-transform" />
            </span>
            {isQuantMode ? "TEMPORAL DELTA OUTPUT" : "Dönemsel Performans"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {/* Haftalık Kâr */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 font-mono group-hover:border-zinc-700 transition-all">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isQuantMode ? "WEEKLY DELTA OUTPUT" : "Haftalık Kâr / Zarar"}</p>
            <p className={`text-xs sm:text-sm font-bold mt-1 truncate ${
              stats.weeklyPnl > 0 ? 'text-emerald-400' : stats.weeklyPnl < 0 ? 'text-rose-400' : 'text-zinc-400'
            }`}>
              {stats.weeklyPnl > 0 ? '+' : ''}{(stats?.weeklyPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </p>
          </div>

          {/* Aylık Kâr */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 font-mono group-hover:border-zinc-700 transition-all">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{isQuantMode ? "MONTHLY DELTA OUTPUT" : "Aylık Kâr / Zarar"}</p>
            <p className={`text-xs sm:text-sm font-bold mt-1 truncate ${
              stats.monthlyPnl > 0 ? 'text-emerald-400' : stats.monthlyPnl < 0 ? 'text-rose-400' : 'text-zinc-400'
            }`}>
              {stats.monthlyPnl > 0 ? '+' : ''}{(stats?.monthlyPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default StatsDashboard;

