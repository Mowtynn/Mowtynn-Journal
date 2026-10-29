import { Trade } from '../types';
import { edgeFromR, EdgeStats } from './asiaAnalytics';
import {
  buildSetupScorecard,
  signalStrength,
  dimensionValue,
  DEFAULT_SETUP_DIMENSIONS,
  SETUP_DIMENSIONS,
  SETUP_MIN_SAMPLE,
  UNSPECIFIED,
  type SetupDimension,
  type SetupRow,
} from './setupScorecard';

/**
 * Edge özeti: Derin Analiz'in en üstünde tek bakışta "neyi daha çok, neyi hiç yapmamalıyım".
 * Kurulum karnesi + tek boyutlu sızıntı/güç taraması + risk % ve News day etkisi.
 */

export interface DimensionSlice {
  dimension: SetupDimension;
  dimensionLabel: string;
  value: string;
  edge: EdgeStats;
}

export interface RiskSlice {
  riskPct: number;
  edge: EdgeStats;
}

export interface EdgeSummary {
  total: number;
  overall: EdgeStats;
  bestSetups: SetupRow[];
  worstSetups: SetupRow[];
  /** Negatif beklentili, yeterli örneklemli tekil alan değerleri (en çok R kaybettiren önce) */
  leaks: DimensionSlice[];
  /** Pozitif beklentili, yeterli örneklemli tekil alan değerleri (en güçlü önce) */
  strengths: DimensionSlice[];
  riskSlices: RiskSlice[];
  news: { yes: EdgeStats; no: EdgeStats; unknown: number };
  /** İşlemde kalma süresi (çıkış saati girilmiş işlemler) */
  holding: { n: number; avgMs: number | null; winAvgMs: number | null; lossAvgMs: number | null };
}

/** Sızıntı / güç taramasında bakılan tekil alanlar */
const SCAN_DIMENSIONS: SetupDimension[] = [
  'strategy',
  'session',
  'entryModels',
  'premiumDiscount',
  'timeframe',
  'htfTimeframe',
  'trend',
  'tpTargets',
  'asiaRangeFvg',
  'type',
  'asset',
];

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
const edgeOf = (list: Trade[]) => edgeFromR(list.map(rOf), list.map((t) => t.status));
const labelOf = (d: SetupDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;

export function computeEdgeSummary(trades: Trade[], minSample = SETUP_MIN_SAMPLE): EdgeSummary {
  const valid = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr));
  const sorted = [...valid].sort((a, b) => a.createdAt - b.createdAt);

  const card = buildSetupScorecard(sorted, DEFAULT_SETUP_DIMENSIONS, { minSample });
  const judged = card.rows.filter((r) => r.verdict !== 'LOW_SAMPLE');
  const bestSetups = judged.filter((r) => r.edge.expectancy > 0).slice(0, 3);
  const worstSetups = [...judged].reverse().filter((r) => r.edge.expectancy < 0).slice(0, 3);

  const slices: DimensionSlice[] = [];
  for (const d of SCAN_DIMENSIONS) {
    const groups = new Map<string, Trade[]>();
    for (const t of sorted) {
      const v = dimensionValue(t, d);
      if (v === UNSPECIFIED) continue;
      const g = groups.get(v);
      if (g) g.push(t);
      else groups.set(v, [t]);
    }
    // Tek değerli alan karşılaştırma vermez
    if (groups.size < 2) continue;
    groups.forEach((list, value) => {
      if (list.length < minSample) return;
      slices.push({ dimension: d, dimensionLabel: labelOf(d), value, edge: edgeOf(list) });
    });
  }
  const leaks = slices
    .filter((s) => s.edge.expectancy < 0)
    // kesinleşmiş sızıntılar önce, sonra en çok R kaybettiren
    .sort((a, b) => Number(signalStrength(b.edge) === 'CONFIRMED') - Number(signalStrength(a.edge) === 'CONFIRMED') || a.edge.netR - b.edge.netR)
    .slice(0, 4);
  const strengths = slices
    .filter((s) => s.edge.expectancy > 0)
    .sort((a, b) => Number(signalStrength(b.edge) === 'CONFIRMED') - Number(signalStrength(a.edge) === 'CONFIRMED') || b.edge.expLo - a.edge.expLo || b.edge.netR - a.edge.netR)
    .slice(0, 4);

  const byRisk = new Map<number, Trade[]>();
  for (const t of sorted) {
    if (typeof t.riskPct !== 'number' || !(t.riskPct > 0)) continue;
    const k = Math.round(t.riskPct * 1000) / 1000;
    const g = byRisk.get(k);
    if (g) g.push(t);
    else byRisk.set(k, [t]);
  }
  const riskSlices = [...byRisk.entries()].sort((a, b) => a[0] - b[0]).map(([riskPct, list]) => ({ riskPct, edge: edgeOf(list) }));

  const yes = sorted.filter((t) => t.newsDay === true);
  const no = sorted.filter((t) => t.newsDay === false);

  const held = sorted.filter((t) => typeof t.exitAt === 'number' && t.exitAt >= t.createdAt);
  const avg = (list: Trade[]) => (list.length ? list.reduce((s, t) => s + ((t.exitAt as number) - t.createdAt), 0) / list.length : null);

  return {
    holding: {
      n: held.length,
      avgMs: avg(held),
      winAvgMs: avg(held.filter((t) => rOf(t) > 0)),
      lossAvgMs: avg(held.filter((t) => rOf(t) < 0)),
    },
    total: sorted.length,
    overall: edgeOf(sorted),
    bestSetups,
    worstSetups,
    leaks,
    strengths,
    riskSlices,
    news: { yes: edgeOf(yes), no: edgeOf(no), unknown: sorted.length - yes.length - no.length },
  };
}
