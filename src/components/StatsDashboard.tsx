import { EASE } from '../lib/motion';
import { MIN_SAMPLE, EDGE_PROOF_MIN } from '../lib/sampleSize';
import React from 'react';
import { motion } from 'motion/react';
import { TradeStats } from '../types';
import type { EdgeStats } from '../lib/asiaAnalytics';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Trophy, 
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';

interface StatsDashboardProps {
  stats: TradeStats;
  /** Beklentinin güven aralığı ve Edge Durumu (filtrelenmiş işlemler) */
  edge?: EdgeStats;
}

const fmtR = (v: number, digits = 2) => `${v > 0 ? '+' : ''}${v.toFixed(digits)} R`;

const StatsDashboard = React.memo(function StatsDashboard({ stats, edge }: StatsDashboardProps) {
  const isPositive = stats.netR > 0;
  const isNegative = stats.netR < 0;

  const rColorClass = stats.netR > 0
    ? 'text-emerald-400'
    : stats.netR < 0
      ? 'text-rose-400'
      : 'text-zinc-400';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { staggerChildren: 0.015 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 4 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.12, ease: EASE }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
    >
      {/* 1. Net Profit Card */}
      <motion.div 
        variants={itemVariants}
        id="stat-net-pnl" 
        className={`cursor-pointer bg-zinc-900/60 border border-zinc-800/80  rounded-2xl p-4 ${
          isPositive 
            ? 'hover:bg-emerald-950/15 hover:border-emerald-500/40' 
            : isNegative 
              ? 'hover:bg-rose-950/15 hover:border-rose-500/40' 
              : 'hover:bg-zinc-800/40 hover:border-zinc-700/60'
        } transition-colors duration-200 ease-out flex flex-col justify-between group shadow-xs`}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
            <span className={`p-1.5 rounded-lg border ${
              isPositive ? 'toggle-item-win' : 
              isNegative ? 'toggle-item-loss' : 
              'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {isPositive ? (
                <TrendingUp size={12} />
              ) : isNegative ? (
                <TrendingDown size={12} />
              ) : (
                <Activity size={12} />
              )}
            </span>
            {"Net R"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-bold ${rColorClass}`}>
              {stats.netR > 0 ? '+' : ''}{stats.netR.toFixed(2)}
            </span>
            <span className={`text-[10px] font-bold ml-0.5 ${isPositive ? 'text-emerald-400/70' : isNegative ? 'text-rose-400/70' : 'text-zinc-400'}`}>R</span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="bg-zinc-800/80 border border-zinc-700/60 py-0.5 px-2 rounded-lg flex items-center gap-1.5 overflow-hidden">
              <span className="text-[10px] font-bold font-sans text-zinc-300">Beklenti {fmtR(stats.expectancyRR)}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-sans flex items-center gap-1">
              <span className="text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded-lg border border-zinc-700">{stats.totalTrades}</span>
              {"İşlem"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Win Rate Gauge */}
      <motion.div 
        variants={itemVariants}
        id="stat-win-rate" 
        className="cursor-pointer bg-zinc-900/60 border border-zinc-800/80  hover:bg-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-4 transition-colors duration-200 ease-out flex flex-col justify-between group shadow-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Percent size={12} />
            </span>
            {"Kazanma Oranı (WR)"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-blue-300">
              %{stats.winRate.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-sans py-0.5 px-2 rounded-lg">
                {stats.winningTrades} {"WIN"}
              </span>
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold font-sans py-0.5 px-2 rounded-lg">
                {stats.losingTrades} {"LOSS"}
              </span>
              {stats.breakevenTrades > 0 && (
                <span className="bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[10px] font-bold font-sans py-0.5 px-2 rounded-lg">
                  {stats.breakevenTrades} {"BE"}
                </span>
              )}
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
        className="cursor-pointer bg-zinc-900/60 border border-zinc-800/80  hover:bg-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-4 transition-colors duration-200 ease-out flex flex-col justify-between group shadow-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp size={12} />
            </span>
            {"PROFIT FACTOR"}
          </p>
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-bold ${stats.profitFactorRR > 1.5 ? "text-emerald-400" : "text-blue-400"}`}>
              {stats.profitFactorRR >= 999 ? '∞' : stats.profitFactorRR.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="bg-zinc-800/80 border border-zinc-700/60 py-0.5 px-2 rounded-lg flex items-center gap-1.5">
              <span className="text-[10px] font-sans font-bold text-zinc-300">
                {stats.profitFactorRR >= 2.0 
                  ? ('⭐ Harika')
                  : stats.profitFactorRR >= 1.5 
                    ? ('🏆 Sürdürülebilir')
                    : stats.profitFactorRR >= 1.0 
                      ? ('📈 Kazançta')
                      : ('🚨 Riskli')}
              </span>
            </div>
            <span className="text-[10px] font-sans font-bold tabular-nums truncate" title="Brüt kazanç / brüt kayıp (R)">
              <span className="text-emerald-400">+{stats.grossWinR.toFixed(1)}R</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-rose-400">−{stats.grossLossR.toFixed(1)}R</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* 4. Edge durumu — ort. kazanç/kayıp Derin Analiz'de; burada yalnızca beklenti ve kanıt durumu (diğer kartlarla aynı yükseklik) */}
      <motion.div 
        variants={itemVariants}
        id="stat-win-loss-ratio" 
        className="cursor-pointer bg-zinc-900/60 border border-zinc-800/80  hover:bg-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-4 transition-colors duration-200 ease-out flex flex-col justify-between group shadow-xs"
        title={edge && edge.n >= 2 ? `Beklenti %95 güven aralığı: [${edge.expLo.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}; ${edge.expHi.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}] R · ${edge.n} işlem` : undefined}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={12} />
            </span>
            {"Edge Durumu"}
          </p>
        </div>
        <EdgeProof edge={edge} expectancy={stats.expectancyRR} />
      </motion.div>

      {/* Secondary Row: Insights */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden col-span-1 sm:col-span-2 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700/80 bg-zinc-900/60 border border-zinc-800/80  rounded-2xl p-4 shadow-xs transition-colors duration-200 ease-out flex flex-col justify-between group"
      >
        <div className="flex justify-between items-center mb-3">
          <p className="heading-3 tracking-wider text-zinc-400 font-sans flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy size={12} />
            </span>
            {"Parite Başarı Analizi"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="flex flex-col justify-between transition-colors">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold font-sans">{"En Verimli Parite"}</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 font-sans truncate">{stats.bestAsset || '—'}</p>
            <p className="text-[10px] text-zinc-500 font-sans tabular-nums mt-0.5 truncate">
              {stats.bestAsset ? `${fmtR(stats.bestAssetR)} · ${stats.bestAssetCount} işlem` : 'Pozitif parite yok'}
            </p>
          </div>
          <div className="flex flex-col justify-between transition-colors border-l border-zinc-800/80 pl-4">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold font-sans">{"En Verimsiz Parite"}</p>
            <p className="text-xs sm:text-sm font-bold text-rose-400 mt-1 font-sans truncate">{stats.worstAsset || '—'}</p>
            <p className="text-[10px] text-zinc-500 font-sans tabular-nums mt-0.5 truncate">
              {stats.worstAsset ? `${fmtR(stats.worstAssetR)} · ${stats.worstAssetCount} işlem` : 'Negatif parite yok'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden col-span-1 sm:col-span-2 cursor-pointer hover:bg-zinc-800/50 hover:border-zinc-700/80 bg-zinc-900/60 border border-zinc-800/80  rounded-2xl p-4 shadow-xs transition-colors duration-200 ease-out flex flex-col justify-between group"
      >
        <div className="flex justify-between items-center mb-3">
          <p className="heading-3 tracking-wider text-zinc-400 font-sans flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Calendar size={12} />
            </span>
            {"Dönemsel Performans"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-auto">
          {/* Haftalık Kâr */}
          <div className="font-sans transition-colors">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">{"Son 7 gün"}</p>
            <p className={`text-xs sm:text-sm font-bold mt-1 truncate ${
              stats.weeklyR > 0 ? 'text-emerald-400' : stats.weeklyR < 0 ? 'text-rose-400' : 'text-zinc-400'
            }`}>
              {fmtR(stats.weeklyR)}
            </p>
            <p className="text-[10px] text-zinc-500 font-sans tabular-nums mt-0.5 truncate">
              {stats.weeklyCount > 0 ? `${stats.weeklyCount} işlem · %${((stats.weeklyWins / stats.weeklyCount) * 100).toFixed(0)} WR` : 'İşlem yok'}
            </p>
          </div>

          {/* Aylık Kâr */}
          <div className="font-sans transition-colors border-l border-zinc-800/80 pl-4">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">{"Son 30 gün"}</p>
            <p className={`text-xs sm:text-sm font-bold mt-1 truncate ${
              stats.monthlyR > 0 ? 'text-emerald-400' : stats.monthlyR < 0 ? 'text-rose-400' : 'text-zinc-400'
            }`}>
              {fmtR(stats.monthlyR)}
            </p>
            <p className="text-[10px] text-zinc-500 font-sans tabular-nums mt-0.5 truncate">
              {stats.monthlyCount > 0 ? `${stats.monthlyCount} işlem · %${((stats.monthlyWins / stats.monthlyCount) * 100).toFixed(0)} WR` : 'İşlem yok'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

/**
 * Edge Durumu: işlem başı beklenti, %95 güven aralığı ve alt sınırın sıfırı geçmesi için gereken ek işlem
 * (mevcut ortalama ve oynaklık sürerse). Kazanma oranı tek başına yanıltıcıdır; kanıt aralıktadır.
 */
function EdgeProof({ edge, expectancy }: { edge?: EdgeStats; expectancy: number }) {
  const f = (v: number) => v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  let badge = 'text-zinc-300';
  // Hüküm eşiği proje geneliyle aynı (lib/sampleSize · MIN_SAMPLE)
  const n = edge?.n ?? 0;
  let text = `Az örneklem · ${n}/${MIN_SAMPLE} işlem`;
  let pct = (n / MIN_SAMPLE) * 100 * 0.25;
  // "Kanıtlandı" için hem güven aralığının alt sınırı sıfırın üstünde olmalı hem de en az EDGE_PROOF_MIN işlem
  if (edge && edge.n >= MIN_SAMPLE) {
    if (edge.expLo > 0 && edge.n >= EDGE_PROOF_MIN) {
      badge = 'text-emerald-300';
      text = '✓ Kanıtlandı';
      pct = 100;
    } else if (edge.expLo > 0) {
      badge = 'text-blue-300';
      text = `Umut verici · ${edge.n}/${EDGE_PROOF_MIN} işlem`;
      pct = (edge.n / EDGE_PROOF_MIN) * 100;
    } else if (edge.expectancy > 0 && edge.tradesNeeded !== null) {
      const need = Math.max(edge.tradesNeeded, EDGE_PROOF_MIN - edge.n);
      badge = 'text-blue-300';
      text = `~${need} işlem daha`;
      pct = (edge.n / (edge.n + need)) * 100;
    } else if (edge.n >= EDGE_PROOF_MIN) {
      badge = 'text-rose-300';
      text = 'Edge yok';
    } else {
      badge = 'text-rose-300';
      text = `Şu an negatif · ${edge.n}/${EDGE_PROOF_MIN} işlem`;
      pct = (edge.n / EDGE_PROOF_MIN) * 100;
    }
  }
  return (
    <div className="flex flex-col gap-1 mt-auto pt-1">
      <div className="flex items-baseline gap-1">
        <span className={`text-lg sm:text-xl font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtR(expectancy)}</span>
        <span className="text-[10px] text-zinc-500 font-sans">/işlem</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="bg-zinc-800/80 border border-zinc-700/60 py-0.5 px-2 rounded-lg flex items-center gap-1.5 min-w-0">
          <span className={`text-[10px] font-sans font-bold truncate ${badge}`}>{text}</span>
        </div>
        {edge && edge.n >= MIN_SAMPLE && (
          <span className="text-[10px] text-zinc-500 font-sans tabular-nums truncate">GA [{f(edge.expLo)}; {f(edge.expHi)}]</span>
        )}
      </div>
      <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden mt-0.5" aria-hidden="true">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : edge && edge.expectancy > 0 ? 'bg-blue-500' : 'bg-rose-500/60'}`}
          style={{ width: `${Math.max(pct > 0 ? 4 : 0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

export default StatsDashboard;

