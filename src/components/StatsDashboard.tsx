import { EASE } from '../lib/motion';
import { MIN_SAMPLE, EDGE_PROOF_MIN } from '../lib/sampleSize';
import React from 'react';
import { motion } from 'motion/react';
import { TradeStats } from '../types';
import type { EdgeStats } from '../lib/asiaAnalytics';
import type { EdgeDrift } from '../lib/edgeDrift';
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
  /** Son 20 işlem ↔ öncesi */
  drift?: EdgeDrift;
}

const fmtR = (v: number, digits = 2) => `${v > 0 ? '+' : ''}${v.toFixed(digits)} R`;

const StatsDashboard = React.memo(function StatsDashboard({ stats, edge, drift }: StatsDashboardProps) {
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
            <span className="text-[10px] text-zinc-500 font-sans truncate">Toplam sonuç</span>
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

      {/* 3. Edge Durumu — iki sütun genişliğinde: beklenti + kanıt durumu + güven aralığı + zamanla değişim */}
      <motion.div 
        variants={itemVariants}
        id="stat-edge" 
        className="col-span-1 sm:col-span-2 bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-4 transition-colors duration-200 ease-out flex flex-col justify-between gap-2 shadow-xs"
      >
        <p className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5">
          <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Layers size={12} />
          </span>
          {"Edge Durumu"}
        </p>
        <EdgePanel edge={edge} expectancy={stats.expectancyRR} drift={drift} />
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
 * Edge Durumu paneli. Sol: işlem başı beklenti, hüküm ve kanıta ilerleme.
 * Sağ: gerçek beklentinin %95 olasılıkla bulunduğu aralık (sıfır çizgisine göre) ve son 20 işlem ↔ öncesi.
 */
function verdictOf(edge?: EdgeStats) {
  const n = edge?.n ?? 0;
  if (!edge || n < MIN_SAMPLE) {
    return { label: 'Az Veri', tone: 'text-zinc-300 border-zinc-700 bg-zinc-800/60', hint: `Hüküm için en az ${MIN_SAMPLE} işlem gerekli.`, pct: (n / EDGE_PROOF_MIN) * 100, bar: 'bg-zinc-600' };
  }
  if (edge.expLo > 0 && n >= EDGE_PROOF_MIN) {
    return { label: 'Kanıtlı Edge', tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10', hint: 'Beklenti %95 güvenle pozitif ve yeterli işlem var.', pct: 100, bar: 'bg-emerald-500' };
  }
  if (edge.expectancy > 0) {
    const need = Math.max(edge.tradesNeeded ?? 0, EDGE_PROOF_MIN - n);
    return {
      label: 'Umut Verici',
      tone: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
      hint: need > 0 ? `Pozitif ama henüz kanıtlı değil · kanıt için ~${need} işlem daha.` : 'Pozitif ama aralık hâlâ sıfırı kapsıyor.',
      pct: (n / (n + Math.max(need, 0) || 1)) * 100,
      bar: 'bg-blue-500',
    };
  }
  if (edge.expHi < 0) return { label: 'Sızıntı', tone: 'text-rose-300 border-rose-500/30 bg-rose-500/10', hint: 'Beklenti %95 güvenle negatif: bu haliyle sistem kaybettiriyor.', pct: 100, bar: 'bg-rose-500' };
  return { label: n >= EDGE_PROOF_MIN ? 'Edge Yok' : 'Şu An Negatif', tone: 'text-rose-300 border-rose-500/30 bg-rose-500/10', hint: 'Beklenti sıfır ya da negatif, henüz kesin değil.', pct: (n / EDGE_PROOF_MIN) * 100, bar: 'bg-rose-500/60' };
}

function EdgePanel({ edge, expectancy, drift }: { edge?: EdgeStats; expectancy: number; drift?: EdgeDrift }) {
  const f = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const v = verdictOf(edge);
  const n = edge?.n ?? 0;
  const hasCI = !!edge && n >= MIN_SAMPLE;
  // Aralık görseli: sıfır ve aralık uçları aynı ölçekte
  const lo = hasCI ? edge!.expLo : 0;
  const hi = hasCI ? edge!.expHi : 0;
  const span = Math.max(Math.abs(lo), Math.abs(hi), Math.abs(expectancy), 0.5) * 1.15;
  const pos = (x: number) => `${((x + span) / (2 * span)) * 100}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 font-sans">
      {/* Sol: beklenti + hüküm + ilerleme */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg sm:text-xl font-bold tabular-nums ${expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtR(expectancy)}</span>
          <span className="text-[10px] text-zinc-500">/işlem</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase shrink-0 ${v.tone}`}>{v.label}</span>
          <span className="text-[10px] text-zinc-400 tabular-nums truncate">{Math.min(n, EDGE_PROOF_MIN)}/{EDGE_PROOF_MIN} işlem</span>
        </div>
        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${Math.max(n > 0 ? 4 : 0, Math.min(100, v.pct))}%` }} />
        </div>
      </div>

      {/* Sağ: güven aralığı + zamanla değişim */}
      <div className="flex flex-col justify-between gap-2 min-w-0 sm:border-l sm:border-zinc-800/80 sm:pl-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate">%95 Beklenti Aralığı</span>
            {hasCI && <span className="text-[11px] text-zinc-300 tabular-nums whitespace-nowrap shrink-0">{f(lo)} – {f(hi)} R</span>}
          </div>
          {hasCI ? (
            <div className="relative h-2.5 rounded-full bg-zinc-800/80">
              <div className={`absolute top-0 h-full rounded-full ${lo > 0 ? 'bg-emerald-500/50' : hi < 0 ? 'bg-rose-500/50' : 'bg-blue-500/40'}`} style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
              <div className="absolute -top-0.5 h-3.5 w-px bg-zinc-400" style={{ left: pos(0) }} />
              <div className="absolute top-0.5 h-1.5 w-1.5 -ml-[3px] rounded-full bg-white" style={{ left: pos(expectancy) }} />
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600">{MIN_SAMPLE} işlemden sonra görünür.</p>
          )}
        </div>

        {drift && (
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 truncate shrink-0">Son 20 İşlem</span>
            {!drift.ready ? (
              <span className="text-[10px] text-zinc-600 tabular-nums truncate">{drift.need} işlemde açılır ({drift.n}/{drift.need})</span>
            ) : (
              <DriftRow drift={drift} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DriftRow({ drift }: { drift: EdgeDrift }) {
  const r = drift.recent!;
  const b = drift.before!;
  const tone = drift.direction === 'WEAKENING' ? 'text-rose-300' : drift.direction === 'IMPROVING' ? 'text-emerald-300' : 'text-zinc-300';
  const arrow = drift.direction === 'WEAKENING' ? '↓' : drift.direction === 'IMPROVING' ? '↑' : '→';
  const label =
    drift.direction === 'STABLE'
      ? 'Stabil'
      : drift.direction === 'WEAKENING'
        ? drift.strength === 'CONFIRMED' ? 'Edge zayıflıyor' : 'Zayıflama sinyali'
        : drift.strength === 'CONFIRMED' ? 'Edge güçleniyor' : 'Güçlenme sinyali';
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] tabular-nums min-w-0 truncate"
    >
      <b className={tone}>{fmtR(r.expectancy)}</b>
      <span className="text-zinc-500">← {fmtR(b.expectancy)}</span>
      <b className={tone}>{arrow} {label}</b>
    </span>
  );
}

export default StatsDashboard;

