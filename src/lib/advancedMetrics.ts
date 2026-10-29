import { Trade } from '../types';

import { calculateProfitFactor, toRR } from './statMath';
import { nyWallDate } from './tradingTime';

/**
 * Gelişmiş metrikler panelinin hesapları (R tabanlı):
 * - deadZone: parite × seans matrisi (işlem, kazanç, toplam R)
 * - optimalFreq: haftalık işlem hacmi (1-3 / 4-7 / 8+) ile verimlilik
 * Ekranda gösterilmeyen eski metrikler (SQN, Sharpe, iflas olasılığı, su altı süresi …) kaldırıldı.
 */

export interface DeadZoneCell {
  count: number;
  wins: number;
  rr: number;
}

export interface FrequencyBucket {
  label: string;
  /** Bu hacimdeki haftaların toplam profit factor'ü (R) */
  avgPF: number;
  weeksCount: number;
  /** İşlem başına ortalama R */
  avgR: number;
}

export interface AdvancedMetrics {
  deadZone: Record<string, Record<string, DeadZoneCell>>;
  optimalFreq: FrequencyBucket[];
}

const advancedMetricsCache = new WeakMap<Trade[], AdvancedMetrics | null>();

/** Aynı işlem dizisi için sonucu önbellekler (sekme değişince yeniden hesaplanmaz). */
export const calculateAdvancedMetrics = (closedTrades: Trade[]): AdvancedMetrics | null => {
  const hit = advancedMetricsCache.get(closedTrades);
  if (hit !== undefined) return hit;
  const result = computeAdvancedMetrics(closedTrades);
  advancedMetricsCache.set(closedTrades, result);
  return result;
};

/** ISO hafta anahtarı, New York takvim gününe göre (tarayıcının saat diliminden bağımsız) */
export function nyIsoWeekKey(ts: number): string {
  const d = nyWallDate(ts);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${week}`;
}

const BUCKETS = ['1-3 İşlem', '4-7 İşlem', '8+ İşlem'] as const;
const bucketOf = (n: number) => (n >= 8 ? BUCKETS[2] : n >= 4 ? BUCKETS[1] : BUCKETS[0]);

function computeAdvancedMetrics(closedTrades: Trade[]): AdvancedMetrics | null {
  if (closedTrades.length === 0) return null;

  const deadZone: AdvancedMetrics['deadZone'] = {};
  const weeks: Record<string, { c: number; p: number; l: number; totalR: number }> = {};

  for (const t of closedTrades) {
    const r = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;

    if (t.asset) {
      const session = t.session || 'Belirtilmemiş';
      const row = (deadZone[t.asset] ??= {});
      const cell = (row[session] ??= { count: 0, wins: 0, rr: 0 });
      cell.count++;
      if (t.status === 'WIN') cell.wins++;
      cell.rr += r;
    }

    const w = (weeks[nyIsoWeekKey(t.createdAt)] ??= { c: 0, p: 0, l: 0, totalR: 0 });
    w.c++;
    if (r > 0) w.p += r;
    else if (r < 0) w.l += -r;
    w.totalR += r;
  }

  const agg: Record<string, { p: number; l: number; weeks: number; trades: number; totalR: number }> = {};
  BUCKETS.forEach((b) => (agg[b] = { p: 0, l: 0, weeks: 0, trades: 0, totalR: 0 }));
  Object.values(weeks).forEach((w) => {
    const b = agg[bucketOf(w.c)];
    b.p += w.p;
    b.l += w.l;
    b.weeks++;
    b.trades += w.c;
    b.totalR += w.totalR;
  });

  const optimalFreq: FrequencyBucket[] = BUCKETS.map((label) => {
    const v = agg[label];
    return {
      label,
      avgPF: calculateProfitFactor(toRR(v.p), toRR(v.l)),
      weeksCount: v.weeks,
      avgR: v.trades > 0 ? v.totalR / v.trades : 0,
    };
  });

  return { deadZone, optimalFreq };
}
