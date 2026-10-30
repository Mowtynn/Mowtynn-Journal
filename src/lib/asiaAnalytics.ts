import { Trade } from '../types';
import { getTradeAccountCategory, getNewsDayLabels } from '../constants/constants';
import { calculateProfitFactor, toRR } from './statMath';
import {
  getSweepSide,
  getTradeHourBucket,
  nyDateKey,
  getTradeNyWeekday,
  normalizePair,
  WEEKDAY_NAMES_TR,
} from './tradingTime';

/* ------------------------------------------------------------------ */
/* Dataset selection                                                   */
/* ------------------------------------------------------------------ */

export type DatasetKey = 'ALL' | 'BACKTEST' | 'LIVETEST' | 'REAL';

export const DATASET_LABELS: Record<DatasetKey, string> = {
  ALL: 'Tüm Veri',
  BACKTEST: 'Backtest',
  LIVETEST: 'Live-Test / Demo',
  REAL: 'Funded & Challenge',
};

export function getTradeDataset(t: Trade): Exclude<DatasetKey, 'ALL'> {
  const platform = (t.platform || '').toLowerCase();
  if (platform.includes('backtest')) return 'BACKTEST';
  const cat = getTradeAccountCategory(t);
  if (cat === 'DEMO') return 'LIVETEST';
  return 'REAL';
}

/* ------------------------------------------------------------------ */
/* Statistics helpers                                                  */
/* ------------------------------------------------------------------ */

const T_CRIT_95 = [
  Infinity, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
  2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];
const tCrit95 = (df: number): number => {
  if (df <= 0) return Infinity;
  if (df <= 30) return T_CRIT_95[df];
  if (df <= 60) return 2.0;
  return 1.96;
};

const normCdf = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

const round = (v: number, digits = 2): number => {
  if (!Number.isFinite(v)) return 0;
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
};

export interface EdgeStats {
  n: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // %
  wrLo: number; // % — Wilson 95% lower bound
  wrHi: number; // % — Wilson 95% upper bound
  netR: number;
  expectancy: number; // average R per trade
  sd: number; // std-dev of R
  expLo: number; // 95% CI lower bound of expectancy
  expHi: number; // 95% CI upper bound of expectancy
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdownR: number;
  currentDrawdownR: number;
  pPositive: number; // approx. probability that the true expectancy is > 0 (%)
  tradesNeeded: number | null; // extra trades for the CI lower bound to clear 0 at the current mean/sd
}

export const EMPTY_EDGE: EdgeStats = {
  n: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  winRate: 0,
  wrLo: 0,
  wrHi: 0,
  netR: 0,
  expectancy: 0,
  sd: 0,
  expLo: 0,
  expHi: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  maxDrawdownR: 0,
  currentDrawdownR: 0,
  pPositive: 0,
  tradesNeeded: null,
};

export function edgeFromR(rs: number[], statuses?: Array<Trade['status']>): EdgeStats {
  const n = rs.length;
  if (n === 0) return { ...EMPTY_EDGE };

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  rs.forEach((r, i) => {
    const st = statuses ? statuses[i] : r > 0 ? 'WIN' : r < 0 ? 'LOSS' : 'BREAKEVEN';
    if (st === 'WIN') wins++;
    else if (st === 'LOSS') losses++;
    else breakevens++;
  });

  const netR = rs.reduce((s, r) => s + r, 0);
  const mean = netR / n;
  const variance = n > 1 ? rs.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const se = n > 1 ? sd / Math.sqrt(n) : 0;
  const tc = tCrit95(n - 1);
  const expLo = n > 1 && Number.isFinite(tc) ? mean - tc * se : mean;
  const expHi = n > 1 && Number.isFinite(tc) ? mean + tc * se : mean;

  const p = wins / n;
  const z = 1.96;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;

  const posR = rs.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const negR = Math.abs(rs.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const winners = rs.filter((r) => r > 0);
  const losers = rs.filter((r) => r < 0);

  let equity = 0;
  let peak = 0;
  let maxDD = 0;
  rs.forEach((r) => {
    equity += r;
    if (equity > peak) peak = equity;
    if (peak - equity > maxDD) maxDD = peak - equity;
  });

  let pPositive = 0;
  if (n > 1 && se > 0) pPositive = normCdf(mean / se) * 100;
  else if (n > 1) pPositive = mean > 0 ? 100 : 0;

  // Güven aralığının alt sınırı sıfırı geçsin diye gereken toplam işlem: aralıkla AYNI t-değeriyle aranır
  // (eskiden z=1.96 kullanılıyordu; küçük örneklemde "0 işlem daha" deyip aralık hâlâ sıfırı kapsayabiliyordu)
  let tradesNeeded: number | null = null;
  if (mean > 0 && sd > 0) {
    if (n > 1 && expLo > 0) {
      tradesNeeded = 0;
    } else {
      let k = Math.max(2, n + 1, Math.ceil(Math.pow((1.96 * sd) / mean, 2)));
      if (k > 10000) {
        tradesNeeded = k - n;
      } else {
        while (k < 10000 && mean - tCrit95(k - 1) * (sd / Math.sqrt(k)) <= 0) k++;
        tradesNeeded = Math.max(1, k - n);
      }
    }
  }

  return {
    n,
    wins,
    losses,
    breakevens,
    winRate: round(p * 100, 1),
    wrLo: round(Math.max(0, center - half) * 100, 1),
    wrHi: round(Math.min(1, center + half) * 100, 1),
    netR: round(netR, 2),
    expectancy: round(mean, 3),
    sd: round(sd, 3),
    expLo: round(expLo, 3),
    expHi: round(expHi, 3),
    profitFactor: round(calculateProfitFactor(toRR(posR), toRR(negR)), 2),
    avgWin: winners.length ? round(winners.reduce((s, r) => s + r, 0) / winners.length, 2) : 0,
    avgLoss: losers.length ? round(losers.reduce((s, r) => s + r, 0) / losers.length, 2) : 0,
    maxDrawdownR: round(maxDD, 2),
    currentDrawdownR: round(Math.max(0, peak - equity), 2),
    pPositive: round(pPositive, 0),
    tradesNeeded,
  };
}

const chronological = (trades: Trade[]): Trade[] => [...trades].sort((a, b) => a.createdAt - b.createdAt);

export function computeEdge(trades: Trade[]): EdgeStats {
  const sorted = chronological(trades);
  return edgeFromR(
    sorted.map((t) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0)),
    sorted.map((t) => t.status),
  );
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

export interface GroupRow {
  key: string;
  stats: EdgeStats;
}

function groupTrades(trades: Trade[], keyFn: (t: Trade) => string | string[] | null): GroupRow[] {
  const map = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const raw = keyFn(t);
    if (raw === null) return;
    const keys = Array.from(new Set((Array.isArray(raw) ? raw : [raw]).filter(Boolean)));
    keys.forEach((k) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
  });
  return Array.from(map.entries())
    .map(([key, list]) => ({ key, stats: computeEdge(list) }))
    .sort((a, b) => b.stats.expectancy - a.stats.expectancy);
}

const hasNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ */
/* Simulators (what-if on recorded MAE / MFE)                          */
/* ------------------------------------------------------------------ */

export interface SimRow {
  label: string;
  n: number;
  winRate: number;
  netR: number;
  expectancy: number;
  profitFactor: number;
  deltaVsActual: number; // expectancy minus actual expectancy on the SAME subset
}

function simRow(label: string, rs: number[], actualExp: number): SimRow {
  const e = edgeFromR(rs);
  return {
    label,
    n: e.n,
    winRate: e.winRate,
    netR: e.netR,
    expectancy: e.expectancy,
    profitFactor: e.profitFactor,
    deltaVsActual: round(e.expectancy - actualExp, 3),
  };
}

/**
 * Fixed-R take-profit simulator.
 * A trade that recorded MFE >= k * stop is scored +k R. A trade that did not get there keeps its actual result,
 * except winners/breakevens whose MAE reached the stop (they would have been stopped) which score -1R.
 * Assumes MFE was recorded before the original exit — see the caveat shown in the UI.
 */
export function simulateFixedTp(trades: Trade[]): { rows: SimRow[]; usable: number } {
  const usable = trades.filter((t) => hasNum(t.stopPips) && t.stopPips > 0 && hasNum(t.mfePips) && t.mfePips >= 0);
  if (usable.length === 0) return { rows: [], usable: 0 };

  const actualRs = usable.map((t) => t.rr || 0);
  const actualExp = actualRs.reduce((s, r) => s + r, 0) / actualRs.length;
  const rows: SimRow[] = [simRow('Gerçekleşen (mevcut çıkış)', actualRs, actualExp)];

  const scoreAt = (t: Trade, k: number, targetPips: number | null): number => {
    const stop = t.stopPips as number;
    const mfe = t.mfePips as number;
    const need = targetPips !== null ? targetPips : k * stop;
    const rrAtTarget = targetPips !== null ? targetPips / stop : k;
    if (mfe >= need) return rrAtTarget;
    if (t.status !== 'LOSS' && hasNum(t.maePips) && t.maePips >= stop) return -1;
    return t.rr || 0;
  };

  [1, 1.5, 2, 2.5, 3, 4, 5].forEach((k) => {
    rows.push(simRow(`Sabit ${k}R TP`, usable.map((t) => scoreAt(t, k, null)), actualExp));
  });

  const withTp = usable.filter((t) => hasNum(t.tpPips) && t.tpPips > 0);
  if (withTp.length >= 3) {
    const actualTp = withTp.map((t) => t.rr || 0);
    const actualTpExp = actualTp.reduce((s, r) => s + r, 0) / actualTp.length;
    rows.push(
      simRow(
        `Karşı Asia ucu (TP mesafesi, ${withTp.length} işlem)`,
        withTp.map((t) => scoreAt(t, 0, t.tpPips as number)),
        actualTpExp,
      ),
    );
  }

  return { rows, usable: usable.length };
}

/**
 * Stop-tightening simulator. A tighter stop (factor f of the original) stops out every trade whose MAE reached it (-1R),
 * and re-scales surviving trades' R by 1/f because the same pip result is now measured against a smaller risk.
 */
export function simulateStopFactor(trades: Trade[]): { rows: SimRow[]; usable: number } {
  const usable = trades.filter((t) => hasNum(t.stopPips) && t.stopPips > 0 && hasNum(t.maePips) && t.maePips >= 0);
  if (usable.length === 0) return { rows: [], usable: 0 };

  const actualRs = usable.map((t) => t.rr || 0);
  const actualExp = actualRs.reduce((s, r) => s + r, 0) / actualRs.length;
  const rows: SimRow[] = [simRow('Mevcut stop (%100)', actualRs, actualExp)];

  [0.9, 0.8, 0.7, 0.6, 0.5].forEach((f) => {
    const rs = usable.map((t) => {
      const newStop = (t.stopPips as number) * f;
      if ((t.maePips as number) >= newStop) return -1;
      return (t.rr || 0) / f;
    });
    rows.push(simRow(`Stop %${Math.round(f * 100)}`, rs, actualExp));
  });

  return { rows, usable: usable.length };
}

/* ------------------------------------------------------------------ */
/* Range size normalisation (per pair)                                 */
/* ------------------------------------------------------------------ */

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export type RangeBucket = 'NARROW' | 'NORMAL' | 'WIDE';

export const RANGE_BUCKET_LABELS: Record<RangeBucket, string> = {
  NARROW: 'Dar (< 0.8× parite medyanı)',
  NORMAL: 'Normal (0.8× – 1.25×)',
  WIDE: 'Geniş (> 1.25×)',
};

/** Classifies each trade's Asia range relative to that pair's own median, so EURCAD and EURUSD are not judged by one pip scale. */
export function bucketAsiaRanges(trades: Trade[]): Map<string, RangeBucket> {
  const withRange = trades.filter((t) => hasNum(t.asiaRangePips) && t.asiaRangePips > 0);
  const byPair = new Map<string, number[]>();
  withRange.forEach((t) => {
    const p = normalizePair(t.asset);
    if (!byPair.has(p)) byPair.set(p, []);
    byPair.get(p)!.push(t.asiaRangePips as number);
  });
  const globalMedian = median(withRange.map((t) => t.asiaRangePips as number));
  const out = new Map<string, RangeBucket>();
  withRange.forEach((t) => {
    const list = byPair.get(normalizePair(t.asset)) || [];
    const ref = list.length >= 5 ? median(list) : globalMedian;
    if (ref <= 0) return;
    const ratio = (t.asiaRangePips as number) / ref;
    out.set(t.id, ratio < 0.8 ? 'NARROW' : ratio > 1.25 ? 'WIDE' : 'NORMAL');
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Data completeness                                                   */
/* ------------------------------------------------------------------ */

export interface CoverageRow {
  field: string;
  label: string;
  filled: number;
  pct: number;
  unlocks: string;
}

/** "HH:mm" → "HH:00–HH+1:00" (NY); geçersizse null */
export function sweepHourBucket(v?: string): string | null {
  const m = typeof v === 'string' ? v.match(/^(\d{2}):\d{2}$/) : null;
  if (!m) return null;
  const h = Number(m[1]);
  return `${m[1]}:00–${String((h + 1) % 24).padStart(2, '0')}:00`;
}

export function computeCoverage(trades: Trade[]): CoverageRow[] {
  const n = trades.length;
  const defs: Array<{ field: string; label: string; unlocks: string; ok: (t: Trade) => boolean }> = [
    { field: 'stopPips', label: 'Stop (pip)', unlocks: 'TP & stop simülatörü', ok: (t) => hasNum(t.stopPips) && t.stopPips > 0 },
    { field: 'tpPips', label: 'TP mesafesi (pip)', unlocks: 'Hedefe ulaşma oranı, karşı Asia ucu simülasyonu', ok: (t) => hasNum(t.tpPips) && t.tpPips > 0 },
    { field: 'maePips', label: 'MAE (pip)', unlocks: 'Stop daraltma simülatörü', ok: (t) => hasNum(t.maePips) },
    { field: 'mfePips', label: 'MFE (pip)', unlocks: 'TP simülatörü, hedef tamamlama dağılımı', ok: (t) => hasNum(t.mfePips) },
    { field: 'asiaRangePips', label: 'Asia range (pip)', unlocks: 'Range büyüklüğü edge analizi (parite bazlı)', ok: (t) => hasNum(t.asiaRangePips) && t.asiaRangePips > 0 },
    { field: 'htfTimeframe', label: 'PD array zaman dilimi', unlocks: '1H / 4H / D kıyası', ok: (t) => !!t.htfTimeframe },
    { field: 'confirmations', label: 'PD array türü', unlocks: 'FVG / OB / seviye kıyası', ok: (t) => Array.isArray(t.confirmations) && t.confirmations.length > 0 },
    { field: 'asiaRange', label: 'Asia Range', unlocks: 'Range / Trend / Sweept edge kıyası', ok: (t) => !!t.asiaRange },
    { field: 'sweepTime', label: 'Sweep Time', unlocks: 'Sweep saatine göre edge kıyası', ok: (t) => !!t.sweepTime },
    { field: 'asiaRangeFvg', label: 'Asia Range FVG', unlocks: 'Asia Range FVG türü kıyası', ok: (t) => !!t.asiaRangeFvg },
    { field: 'newsDay', label: 'News Day / Bank Holiday', unlocks: 'Haber günü – normal gün edge kıyası', ok: (t) => typeof t.newsDay === 'boolean' },
    { field: 'entryModels', label: 'Giriş modeli', unlocks: 'MSS / Breaker / IFVG kıyası', ok: (t) => Array.isArray(t.entryModels) && t.entryModels.length > 0 },
  ];
  return defs.map((d) => {
    const filled = trades.filter(d.ok).length;
    return { field: d.field, label: d.label, filled, pct: n > 0 ? Math.round((filled / n) * 100) : 0, unlocks: d.unlocks };
  });
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export interface HourPairCell {
  n: number;
  expectancy: number;
  netR: number;
}

export interface ComboRow {
  label: string;
  stats: EdgeStats;
}

export interface AsiaLabResult {
  trades: Trade[];
  overall: EdgeStats;
  pairs: GroupRow[];
  hours: GroupRow[];
  weekdays: Array<{ day: string; stats: EdgeStats }>;
  hourPair: { hours: string[]; pairs: string[]; cells: Record<string, HourPairCell> };
  sweepSide: GroupRow[];
  pdTimeframe: GroupRow[];
  pdType: GroupRow[];
  entryModels: GroupRow[];
  newsDay: { rows: GroupRow[]; unknown: number };
  asiaRanges: GroupRow[];
  sweepHours: GroupRow[];
  asiaRangeFvgs: GroupRow[];
  rangeSize: Array<{ key: RangeBucket; label: string; stats: EdgeStats }>;
  targetReach: { usable: number; buckets: Array<{ label: string; count: number; pct: number }>; reachedPct: number } | null;
  tpSim: { rows: SimRow[]; usable: number };
  stopSim: { rows: SimRow[]; usable: number };
  rolling: Array<{ index: number; date: string; expectancy: number }>;
  combos: ComboRow[];
  coverage: CoverageRow[];
}

export interface AsiaLabOptions {
  dataset: DatasetKey;
  pair: string; // 'ALL' or normalized pair
  minSample: number;
}

export function listPairs(trades: Trade[]): string[] {
  const counts = new Map<string, number>();
  trades.forEach((t) => {
    const p = normalizePair(t.asset);
    counts.set(p, (counts.get(p) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
}

export function analyzeAsia(allTrades: Trade[], opts: AsiaLabOptions): AsiaLabResult {
  const trades = allTrades.filter((t) => {
    if (opts.dataset !== 'ALL' && getTradeDataset(t) !== opts.dataset) return false;
    if (opts.pair !== 'ALL' && normalizePair(t.asset) !== opts.pair) return false;
    return true;
  });

  const overall = computeEdge(trades);

  const pairRows = groupTrades(trades, (t) => normalizePair(t.asset));

  const hours = groupTrades(trades, (t) => getTradeHourBucket(t)).sort((a, b) => a.key.localeCompare(b.key));

  const weekdays = [1, 2, 3, 4, 5].map((d) => ({
    day: WEEKDAY_NAMES_TR[d],
    stats: computeEdge(trades.filter((t) => getTradeNyWeekday(t) === d)),
  }));

  // Hour x pair matrix
  const pairKeys = pairRows.map((p) => p.key);
  const hourKeys = hours.map((h) => h.key);
  const cells: Record<string, HourPairCell> = {};
  hourKeys.forEach((h) => {
    pairKeys.forEach((p) => {
      const list = trades.filter((t) => getTradeHourBucket(t) === h && normalizePair(t.asset) === p);
      if (list.length > 0) {
        const e = computeEdge(list);
        cells[`${h}|${p}`] = { n: e.n, expectancy: e.expectancy, netR: e.netR };
      }
    });
  });

  const sweepSide = groupTrades(trades, (t) => (getSweepSide(t) === 'HIGH' ? 'Asia High süpürüldü → SHORT' : 'Asia Low süpürüldü → LONG'));

  const pdTimeframe = groupTrades(trades, (t) => (t.htfTimeframe ? t.htfTimeframe : null));
  const pdType = groupTrades(trades, (t) => (Array.isArray(t.confirmations) && t.confirmations.length > 0 ? t.confirmations : null));
  const entryModels = groupTrades(trades, (t) => (Array.isArray(t.entryModels) && t.entryModels.length > 0 ? t.entryModels : null));

  // News Day / Bank Holiday: bilgisi olmayan (eski) işlemler kıyasa girmez
  const nl = getNewsDayLabels();
  const newsGroups = groupTrades(trades, (t) => (typeof t.newsDay === 'boolean' ? (t.newsDay ? nl.yes : nl.no) : null));
  const newsDay = {
    rows: [nl.yes, nl.no].map((k) => newsGroups.find((g) => g.key === k)).filter((g): g is GroupRow => !!g),
    unknown: trades.filter((t) => typeof t.newsDay !== 'boolean').length,
  };

  const asiaRanges = groupTrades(trades, (t) => t.asiaRange || null);
  // Sweep saati (NY) saatlik dilimlere: 02:15 → "02:00–03:00"
  const sweepHours = groupTrades(trades, (t) => sweepHourBucket(t.sweepTime)).sort((x, y) => x.key.localeCompare(y.key));
  const asiaRangeFvgs = groupTrades(trades, (t) => t.asiaRangeFvg || null);

  // Range size (pair-normalised)
  const bucketMap = bucketAsiaRanges(trades);
  const rangeSize = (['NARROW', 'NORMAL', 'WIDE'] as RangeBucket[])
    .map((key) => ({ key, label: RANGE_BUCKET_LABELS[key], stats: computeEdge(trades.filter((t) => bucketMap.get(t.id) === key)) }))
    .filter((r) => r.stats.n > 0);

  // Target reach distribution: how far into the TP distance did price travel?
  let targetReach: AsiaLabResult['targetReach'] = null;
  const reachTrades = trades.filter((t) => hasNum(t.tpPips) && t.tpPips > 0 && hasNum(t.mfePips) && t.mfePips >= 0);
  if (reachTrades.length > 0) {
    const edges = [
      { label: '< %25', test: (r: number) => r < 0.25 },
      { label: '%25 – %50', test: (r: number) => r >= 0.25 && r < 0.5 },
      { label: '%50 – %75', test: (r: number) => r >= 0.5 && r < 0.75 },
      { label: '%75 – %100', test: (r: number) => r >= 0.75 && r < 1 },
      { label: 'Hedefe ulaştı (≥ %100)', test: (r: number) => r >= 1 },
    ];
    const ratios = reachTrades.map((t) => (t.mfePips as number) / (t.tpPips as number));
    const buckets = edges.map((e) => {
      const count = ratios.filter(e.test).length;
      return { label: e.label, count, pct: Math.round((count / ratios.length) * 100) };
    });
    targetReach = {
      usable: reachTrades.length,
      buckets,
      reachedPct: Math.round((ratios.filter((r) => r >= 1).length / ratios.length) * 100),
    };
  }

  const tpSim = simulateFixedTp(trades);
  const stopSim = simulateStopFactor(trades);

  // Rolling expectancy (edge stability), window of 20 trades
  const sorted = chronological(trades);
  const WINDOW = 20;
  const rolling: AsiaLabResult['rolling'] = [];
  for (let i = WINDOW; i <= sorted.length; i++) {
    const slice = sorted.slice(i - WINDOW, i);
    const exp = slice.reduce((s, t) => s + (t.rr || 0), 0) / WINDOW;
    const last = slice[slice.length - 1];
    rolling.push({ index: i, date: nyDateKey(last.createdAt), expectancy: round(exp, 3) });
  }

  // Combination finder (two-factor), ranked for reliability — not by raw expectancy alone
  const dims: Array<{ name: string; get: (t: Trade) => string | null }> = [
    { name: 'Parite', get: (t) => normalizePair(t.asset) },
    { name: 'Saat', get: (t) => getTradeHourBucket(t) },
    { name: 'PD TF', get: (t) => t.htfTimeframe || null },
    { name: 'Yön', get: (t) => (getSweepSide(t) === 'HIGH' ? 'High→Short' : 'Low→Long') },
    { name: 'Gün', get: (t) => WEEKDAY_NAMES_TR[getTradeNyWeekday(t)] },
    { name: 'Asia Range', get: (t) => t.asiaRange || null },
    { name: 'News Day', get: (t) => (typeof t.newsDay === 'boolean' ? (t.newsDay ? nl.yes : nl.no) : null) },
  ];
  const comboMap = new Map<string, Trade[]>();
  trades.forEach((t) => {
    for (let a = 0; a < dims.length; a++) {
      const va = dims[a].get(t);
      if (!va) continue;
      for (let b = a + 1; b < dims.length; b++) {
        const vb = dims[b].get(t);
        if (!vb) continue;
        const key = `${dims[a].name}: ${va}  +  ${dims[b].name}: ${vb}`;
        if (!comboMap.has(key)) comboMap.set(key, []);
        comboMap.get(key)!.push(t);
      }
    }
  });
  const combos: ComboRow[] = Array.from(comboMap.entries())
    .filter(([, list]) => list.length >= Math.max(3, opts.minSample))
    .map(([label, list]) => ({ label, stats: computeEdge(list) }))
    .sort((a, b) => b.stats.expLo - a.stats.expLo || b.stats.expectancy - a.stats.expectancy)
    .slice(0, 12);

  return {
    trades,
    overall,
    pairs: pairRows,
    hours,
    weekdays,
    hourPair: { hours: hourKeys, pairs: pairKeys, cells },
    sweepSide,
    pdTimeframe,
    pdType,
    entryModels,
    newsDay,
    asiaRanges,
    sweepHours,
    asiaRangeFvgs,
    rangeSize,
    targetReach,
    tpSim,
    stopSim,
    rolling: rolling.slice(-80),
    combos,
    coverage: computeCoverage(trades),
  };
}
