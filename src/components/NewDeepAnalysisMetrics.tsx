import { EASE } from '../lib/motion';
import React from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowDownRight, RefreshCw, TrendingUp, TrendingDown, Sigma } from 'lucide-react';
import type { DeepMetrics } from '../lib/deepMetrics';
import { formatPF } from '../lib/statMath';
import { MIN_SAMPLE } from '../lib/sampleSize';
import { rnum, rsigned } from '../lib/format';

/**
 * Detaylı Analiz metrik kartları.
 * - variant="kpi": üst sıradaki performans kartları (Kümülatif R, Profit Factor, Ort. Kazanç, Ort. Kayıp)
 * - variant="risk": R eğrisinin yanındaki risk kartları (Max Drawdown, Recovery Factor, DD Toparlanma)
 * Kartlar parça (fragment) olarak döner; ızgarayı çağıran taraf kurar.
 */

// Projedeki diğer R değerleriyle aynı biçim (nokta, 2 basamak)
const fmtR = (v: number) => rnum(v);

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15, ease: EASE } },
};

type Tone = 'emerald' | 'rose' | 'blue' | 'zinc';
const TONE: Record<Tone, { icon: string; hover: string; value: string; unit: string }> = {
  emerald: { icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', hover: 'hover:bg-emerald-950/10 hover:border-emerald-500/30', value: 'text-emerald-400', unit: 'text-emerald-400/70' },
  rose: { icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400', hover: 'hover:bg-rose-950/10 hover:border-rose-500/30', value: 'text-rose-400', unit: 'text-rose-400/70' },
  blue: { icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400', hover: 'hover:bg-blue-950/10 hover:border-blue-500/30', value: 'text-blue-300', unit: 'text-zinc-400' },
  zinc: { icon: 'bg-zinc-800 border-zinc-700 text-zinc-300', hover: 'hover:bg-zinc-900 hover:border-zinc-700', value: 'text-zinc-200', unit: 'text-zinc-400' },
};
const toneOf = (v: number): Tone => (v > 0 ? 'emerald' : v < 0 ? 'rose' : 'zinc');

function MetricCard({
  label,
  icon: Icon,
  tone,
  value,
  unit,
  sub,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: Tone;
  value: string;
  unit?: string;
  sub?: string;
  onClick?: () => void;
}) {
  const t = TONE[tone];
  return (
    <motion.div
      variants={itemVariants}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`min-w-0 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl px-3.5 py-2 ${t.hover} transition-ui duration-200 ease-out flex flex-col justify-between gap-1.5 cursor-pointer shadow-xs`}
    >
      <span className="heading-3 text-zinc-400 tracking-wider font-sans flex items-center gap-1.5 min-w-0">
        <span className={`p-1.5 rounded-lg border shrink-0 ${t.icon}`}>
          <Icon size={11} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-baseline gap-1 min-w-0">
        <span className={`text-lg sm:text-xl font-bold font-sans tracking-tight tabular-nums ${t.value}`}>{value}</span>
        {unit && <span className={`text-[10px] font-bold font-sans ${t.unit}`}>{unit}</span>}
        {sub && <span className="ml-auto text-[10px] text-zinc-500 font-sans truncate">{sub}</span>}
      </div>
    </motion.div>
  );
}

export const NewDeepAnalysisMetrics = React.memo(
  ({
    metrics,
    variant,
    onMetricClick,
  }: {
    metrics: DeepMetrics;
    variant: 'kpi' | 'risk';
    onMetricClick?: (id: string, val: string | number) => void;
  }) => {
    const click = (id: string, val: string) => () => onMetricClick?.(id, val);
    const total = metrics.statusAnalysis.total;
    // Az işlemde oran metrikleri (PF, Recovery) tek bir sonuca çok bağlıdır: değer gösterilir ama "az veri" diye işaretlenir
    const thin = total < MIN_SAMPLE;

    if (variant === 'kpi') {
      const pf = metrics.pureProfitFactor;
      return (
        <>
          <MetricCard
            label="Kümülatif R"
            icon={Sigma}
            tone={toneOf(metrics.totalR)}
            value={rsigned(metrics.totalR)}
            unit="R"
            sub={`${total} işlem`}
            onClick={click('cumulativeR', `${rsigned(metrics.totalR)}R`)}
          />
          <MetricCard
            label="Profit Factor"
            icon={TrendingUp}
            tone={pf > 1.5 ? 'emerald' : pf >= 1 ? 'blue' : 'rose'}
            value={formatPF(pf)}
            sub={thin ? 'az veri' : undefined}
            onClick={click('pureProfitFactor', formatPF(pf))}
          />
          <MetricCard
            label="Ort. Kazanç"
            icon={TrendingUp}
            tone={metrics.avgWinRR > 0 ? 'emerald' : 'zinc'}
            value={metrics.avgWinRR > 0 ? `+${fmtR(metrics.avgWinRR)}` : '—'}
            unit={metrics.avgWinRR > 0 ? 'R' : undefined}
            sub={`${metrics.statusAnalysis.win} kazanç`}
            onClick={click('averageWin', metrics.avgWinRR > 0 ? `+${fmtR(metrics.avgWinRR)}R` : '—')}
          />
          <MetricCard
            label="Ort. Kayıp"
            icon={TrendingDown}
            tone={metrics.avgLossRR > 0 ? 'rose' : 'zinc'}
            value={metrics.avgLossRR > 0 ? `-${fmtR(metrics.avgLossRR)}` : '—'}
            unit={metrics.avgLossRR > 0 ? 'R' : undefined}
            sub={`${metrics.statusAnalysis.loss} kayıp`}
            onClick={click('averageLoss', metrics.avgLossRR > 0 ? `-${fmtR(metrics.avgLossRR)}R` : '—')}
          />
        </>
      );
    }

    const dd = metrics.maxDrawdown;
    const recovery = dd > 0 ? metrics.recoveryFactor.toFixed(2) : '—';
    const recoveryTrades = metrics.avgRecoveryTrades === null ? '—' : metrics.avgRecoveryTrades.toFixed(1);
    return (
      <>
        <MetricCard
          label="Max Drawdown"
          icon={ArrowDownRight}
          tone={dd > 0 ? 'rose' : 'zinc'}
          value={`${dd > 0 ? '-' : ''}${fmtR(dd)}`}
          unit="R"
          onClick={click('maxDrawdown', `${dd > 0 ? '-' : ''}${fmtR(dd)}R`)}
        />
        <MetricCard
          label="Recovery Factor"
          icon={RefreshCw}
          tone="blue"
          value={recovery}
          sub={thin ? 'az veri' : 'Net R ÷ Max DD'}
          onClick={click('recoveryFactor', recovery)}
        />
        <MetricCard
          label="DD Toparlanma"
          icon={Activity}
          tone="blue"
          value={recoveryTrades}
          unit="İşlem"
          sub={metrics.recoveredDrawdowns === 0 ? 'tamamlanmış düşüş yok' : `${metrics.recoveredDrawdowns} düşüş ort.${metrics.recoveredDrawdowns < MIN_SAMPLE ? ' · az veri' : ''}`}
          onClick={click('avgRecoveryTrades', recoveryTrades)}
        />
      </>
    );
  },
);

NewDeepAnalysisMetrics.displayName = 'NewDeepAnalysisMetrics';
