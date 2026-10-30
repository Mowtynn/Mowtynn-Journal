import { getNyParts } from './tradingTime';
import { Trade } from '../types';
import { getTradeAccountCategory, getNewsDayLabels, getTradeStageLabel } from '../constants/constants';
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
  /** Payda: alanın sorulduğu işlem sayısı (çoğu alanda tüm işlemler) */
  base: number;
  pct: number;
  unlocks: string;
}

/** Sweep saati (NY) 30 dakikalık dönemlere: 02:15 → "02:00–02:30", 02:40 → "02:30–03:00"; geçersizse null */
export function sweepHourBucket(v?: string): string | null {
  const m = typeof v === 'string' ? v.match(/^(\d{2}):(\d{2})$/) : null;
  if (!m) return null;
  const start = Number(m[1]) * 60 + (Number(m[2]) < 30 ? 0 : 30);
  const fmt = (x: number) => `${String(Math.floor((x % 1440) / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  return `${fmt(start)}–${fmt(start + 30)}`;
}

/** Dönemleri işlem günü akışına göre sıralar: Asia akşamı (18:00 NY) → London → NY */
export function sweepBucketOrder(key: string): number {
  const m = key.match(/^(\d{2}):(\d{2})/);
  if (!m) return 9999;
  return (Number(m[1]) * 60 + Number(m[2]) - 18 * 60 + 1440) % 1440;
}

/** Sweep'ten girişe geçen süre (dk, NY; gece yarısını aşabilir: Asia'daki sweep → London/NY girişi). 18 saatten uzaksa null. */
export function sweepToEntryMinutes(t: Pick<Trade, 'createdAt' | 'sweepTime'>): number | null {
  const m = typeof t.sweepTime === 'string' ? t.sweepTime.match(/^(\d{2}):(\d{2})$/) : null;
  const p = getNyParts(t.createdAt);
  if (!m || !p) return null;
  const d = p.hour * 60 + p.minute - (Number(m[1]) * 60 + Number(m[2]));
  const diff = d < 0 ? d + 1440 : d;
  return diff <= 1080 ? diff : null;
}

export const SWEEP_DELAY_BUCKETS = ['0–15 dk', '15–30 dk', '30–60 dk', '1–2 sa', '2–4 sa', '4–8 sa', '8 sa+'] as const;
export function sweepDelayBucket(t: Pick<Trade, 'createdAt' | 'sweepTime'>): string | null {
  const d = sweepToEntryMinutes(t);
  if (d === null) return null;
  return SWEEP_DELAY_BUCKETS[d < 15 ? 0 : d < 30 ? 1 : d < 60 ? 2 : d < 120 ? 3 : d < 240 ? 4 : d < 480 ? 5 : 6];
}

/** İşlemde kalma süresi dilimi (çıkış saati girilmiş işlemler) */
export const HOLD_BUCKETS = ['<15 dk', '15–30 dk', '30–60 dk', '1–2 sa', '2–4 sa', '4 sa+'] as const;
export function holdBucket(t: Pick<Trade, 'createdAt' | 'exitAt'>): string | null {
  if (typeof t.exitAt !== 'number' || !Number.isFinite(t.exitAt) || t.exitAt < t.createdAt) return null;
  const m = (t.exitAt - t.createdAt) / 60000;
  return HOLD_BUCKETS[m < 15 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : m < 240 ? 4 : 5];
}

/** Hesap aşaması: Phase 1 / Phase 2 / Funded; hesapsız işlemler bu boyutta yer almaz */
export function stageBucket(t: Pick<Trade, 'accountId' | 'accountStage'>): string | null {
  return getTradeStageLabel(t) || null;
}

/** Planlanan R:R = TP pip ÷ Stop pip */
export const PLANNED_RR_BUCKETS = ['< 1:1.5', '1:1.5–2', '1:2–3', '1:3–4', '1:4+'] as const;
export function plannedRR(t: Pick<Trade, 'tpPips' | 'stopPips'>): number | null {
  return typeof t.tpPips === 'number' && typeof t.stopPips === 'number' && t.tpPips > 0 && t.stopPips > 0 ? t.tpPips / t.stopPips : null;
}
export function plannedRRBucket(t: Pick<Trade, 'tpPips' | 'stopPips'>): string | null {
  const r = plannedRR(t);
  if (r === null) return null;
  return PLANNED_RR_BUCKETS[r < 1.5 ? 0 : r < 2 ? 1 : r < 3 ? 2 : r < 4 ? 3 : 4];
}

/** Stop büyüklüğü ÷ o günün Asia Range büyüklüğü (%) */
export const STOP_RANGE_BUCKETS = ['< %20', '%20–35', '%35–50', '%50–75', '%75+'] as const;
export function stopToRangeBucket(t: Pick<Trade, 'stopPips' | 'asiaRangePips'>): string | null {
  if (!(typeof t.stopPips === 'number' && t.stopPips > 0 && typeof t.asiaRangePips === 'number' && t.asiaRangePips > 0)) return null;
  const p = (t.stopPips / t.asiaRangePips) * 100;
  return STOP_RANGE_BUCKETS[p < 20 ? 0 : p < 35 ? 1 : p < 50 ? 2 : p < 75 ? 3 : 4];
}

/**
 * Günün kaçıncı işlemi (NY takvim günü). İşlem sırası, analiz edilen listeye göre bir kez indekslenir
 * (indexTradeOrder); indekslenmemiş işlem için boyut boş kalır.
 */
const tradeOrder = new Map<string, number>();
// Uygulamada sıra, hesaptan bağımsız olarak tüm işlemler üzerinden bir kez kurulur (setGlobalTradeOrder);
// analiz fonksiyonları o zaman yeniden indekslemez. Testlerde / tek başına kullanımda liste üzerinden indekslenir.
let globalOrder = false;
export function setGlobalTradeOrder(all: Trade[]): void {
  buildOrder(all);
  globalOrder = true;
}
export function indexTradeOrder(trades: Trade[]): void {
  if (globalOrder) return;
  buildOrder(trades);
}
function buildOrder(trades: Trade[]): void {
  tradeOrder.clear();
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = nyDateKey(t.createdAt);
    (byDay.get(k) || byDay.set(k, []).get(k)!).push(t);
  }
  byDay.forEach((list) => list.sort((x, y) => x.createdAt - y.createdAt).forEach((t, i) => tradeOrder.set(t.id, i + 1)));
  // Asia Range büyüklüğü de aynı listeye göre (paritenin kendi medyanına oranla) bir kez sınıflanır
  rangeIndex = bucketAsiaRanges(trades);
}
export function tradeOfDayBucket(t: Pick<Trade, 'id'>): string | null {
  const n = tradeOrder.get(t.id);
  return n === undefined ? null : n === 1 ? '1. İşlem' : n === 2 ? '2. İşlem' : '3.+ İşlem';
}

/** Asia Range büyüklüğü (paritenin medyanına göre): kurulum karnesi, Edge Özeti ve filtrelerde tek tanım */
let rangeIndex = new Map<string, RangeBucket>();
export const RANGE_SIZE_BUCKETS = ['Dar (< 0.8×)', 'Normal (0.8–1.25×)', 'Geniş (> 1.25×)'] as const;
const RANGE_SIZE_LABEL: Record<RangeBucket, (typeof RANGE_SIZE_BUCKETS)[number]> = {
  NARROW: RANGE_SIZE_BUCKETS[0],
  NORMAL: RANGE_SIZE_BUCKETS[1],
  WIDE: RANGE_SIZE_BUCKETS[2],
};
export function rangeSizeBucket(t: Pick<Trade, 'id'>): string | null {
  const b = rangeIndex.get(t.id);
  return b ? RANGE_SIZE_LABEL[b] : null;
}

/** İşlem yönetimi: seçilen yönetim adımları birleşik ("BE Çekildi + Kısmi Kâr") */
export function managementBucket(t: Pick<Trade, 'management'>): string | null {
  return Array.isArray(t.management) && t.management.length ? [...t.management].join(' + ') : null;
}
export function afterExitBucket(t: Pick<Trade, 'afterExitTp'>): string | null {
  return typeof t.afterExitTp === 'boolean' ? (t.afterExitTp ? "Çıkış Sonrası TP'ye Gitti" : "Çıkış Sonrası TP'ye Gitmedi") : null;
}

/**
 * Yönetimle kaçırılan R: çıkıştan sonra TP'ye ulaşan işlemlerde planlanan R ile gerçekleşen R farkı.
 * Planlanan R yoksa (TP / stop pip girilmemiş) işlem sayılır ama R'ı hesaba katılmaz.
 */
export function managementMissedR(trades: Trade[]): { n: number; measured: number; missedR: number } {
  let n = 0;
  let measured = 0;
  let missedR = 0;
  for (const t of trades) {
    if (t.afterExitTp !== true) continue;
    n++;
    const p = plannedRR(t);
    if (p === null) continue;
    measured++;
    missedR += Math.max(0, p - (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0));
  }
  return { n, measured, missedR };
}

/**
 * Veri eksiği panosu: formdaki her girdinin doluluk oranı (form sırasıyla) ve o girdinin açtığı analiz.
 * Yalnızca belirli işlemlerde sorulan alanlar kendi paydasıyla ölçülür (ör. Risk % hesaplı işlemlerde,
 * Çıkış Sonrası TP yalnızca BE / erken kapanış / BE Çekildi işlemlerinde).
 */
export function computeCoverage(trades: Trade[]): CoverageRow[] {
  const list = (v?: string[]) => Array.isArray(v) && v.length > 0;
  const defs: Array<{ field: string; label: string; unlocks: string; ok: (t: Trade) => boolean; asked?: (t: Trade) => boolean }> = [
    { field: 'planFidelity', label: 'Setup Kalitesi', unlocks: 'A+ / A / B-C kıyası, düşük kalitenin maliyeti', ok: (t) => !!t.planFidelity },
    { field: 'trend', label: 'Trend', unlocks: 'Trend kıyası, reversal maliyeti', ok: (t) => !!t.trend },
    { field: 'newsDay', label: 'News Day', unlocks: 'Haber günü – normal gün kıyası', ok: (t) => typeof t.newsDay === 'boolean' },
    { field: 'asiaRangeFvg', label: 'Asia Range FVG', unlocks: 'Asia Range FVG kıyası', ok: (t) => !!t.asiaRangeFvg },
    { field: 'asiaRange', label: 'Asia Range', unlocks: 'Range / Trend / Swept kıyası', ok: (t) => !!t.asiaRange },
    { field: 'sweepTime', label: 'Sweep Time', unlocks: 'Sweep saati (30 dk) ve Sweep → Giriş süresi', ok: (t) => !!t.sweepTime },
    { field: 'session', label: 'Session', unlocks: 'Session ve Session × Yön kıyası', ok: (t) => !!t.session },
    { field: 'htfTimeframe', label: 'HTF', unlocks: 'HTF kıyası, HTF × Entry TF matrisi', ok: (t) => !!t.htfTimeframe },
    { field: 'confirmations', label: 'PD Array', unlocks: 'PD Array türü kıyası', ok: (t) => list(t.confirmations) },
    { field: 'timeframe', label: 'Entry TF', unlocks: 'Entry TF kıyası, HTF × Entry TF matrisi', ok: (t) => !!t.timeframe },
    { field: 'entryModels', label: 'Entry Model', unlocks: 'Entry Model kıyası', ok: (t) => list(t.entryModels) },
    { field: 'tpTargets', label: 'Target', unlocks: 'Çıkış hedefi kıyası', ok: (t) => list(t.tpTargets) },
    { field: 'premiumDiscount', label: 'Confirmations', unlocks: 'Confirmations × Yön kıyası', ok: (t) => !!t.premiumDiscount },
    { field: 'management', label: 'İşlem Yönetimi', unlocks: "Yönetim edge'i", ok: (t) => list(t.management) },
    { field: 'afterExitTp', label: 'Çıkış Sonrası TP', unlocks: 'Yönetimle kaçırılan R (sorulduğu işlemlerde)', ok: (t) => typeof t.afterExitTp === 'boolean', asked: (t) => t.status === 'BREAKEVEN' || (Array.isArray(t.management) && (t.management.includes('Erken Kapatıldı') || t.management.includes('BE Çekildi'))) },
    { field: 'riskPct', label: 'Risk %', unlocks: 'Risk seviyesine göre edge, aşırı risk uyarısı (hesaplı işlemlerde)', ok: (t) => hasNum(t.riskPct) && t.riskPct > 0, asked: (t) => !!t.accountId },
    { field: 'exitAt', label: 'Çıkış Saati', unlocks: 'İşlem süresi, hedefe ulaşma süresi', ok: (t) => hasNum(t.exitAt) && t.exitAt >= t.createdAt },
    { field: 'stopPips', label: 'Stop Pip', unlocks: 'Stop simülatörü, Stop / Asia Range, Planlanan R:R', ok: (t) => hasNum(t.stopPips) && t.stopPips > 0 },
    { field: 'tpPips', label: 'TP Pip', unlocks: 'Planlanan R:R, hedef tamamlama, kaçırılan R', ok: (t) => hasNum(t.tpPips) && t.tpPips > 0 },
    { field: 'maePips', label: 'MAE Pip', unlocks: 'Stop daraltma simülatörü', ok: (t) => hasNum(t.maePips) },
    { field: 'mfePips', label: 'MFE Pip', unlocks: 'TP simülatörü, potansiyel R, MFE yakalama', ok: (t) => hasNum(t.mfePips) },
    { field: 'asiaRangePips', label: 'Asia Range Pip', unlocks: 'Range büyüklüğü (parite bazlı), Stop / Asia Range', ok: (t) => hasNum(t.asiaRangePips) && t.asiaRangePips > 0 },
  ];
  return defs.map((d) => {
    const pool = d.asked ? trades.filter(d.asked) : trades;
    const filled = pool.filter(d.ok).length;
    return { field: d.field, label: d.label, filled, base: pool.length, pct: pool.length > 0 ? Math.round((filled / pool.length) * 100) : 0, unlocks: d.unlocks };
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
  sweepDelay: GroupRow[];
  holdTime: GroupRow[];
  plannedRR: GroupRow[];
  stopToRange: GroupRow[];
  tradeOfDay: GroupRow[];
  management: GroupRow[];
  afterExit: GroupRow[];
  missedByManagement: { n: number; measured: number; missedR: number };
  stages: GroupRow[];
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

  indexTradeOrder(trades);
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
  // Sweep saati (NY) 30 dakikalık dönemlere, Asia → London → NY sırasıyla
  const order = (list: readonly string[]) => (x: GroupRow, y: GroupRow) => list.indexOf(x.key) - list.indexOf(y.key);
  const plannedRRRows = groupTrades(trades, (t) => plannedRRBucket(t)).sort(order(PLANNED_RR_BUCKETS));
  const stopToRange = groupTrades(trades, (t) => stopToRangeBucket(t)).sort(order(STOP_RANGE_BUCKETS));
  const tradeOfDay = groupTrades(trades, (t) => tradeOfDayBucket(t)).sort((x, y) => x.key.localeCompare(y.key));
  const management = groupTrades(trades, (t) => managementBucket(t));
  const afterExit = groupTrades(trades, (t) => afterExitBucket(t));
  const holdTime = groupTrades(trades, (t) => holdBucket(t)).sort((x, y) => HOLD_BUCKETS.indexOf(x.key as any) - HOLD_BUCKETS.indexOf(y.key as any));
  const stages = groupTrades(trades, (t) => stageBucket(t));
  const sweepDelay = groupTrades(trades, (t) => sweepDelayBucket(t)).sort((x, y) => SWEEP_DELAY_BUCKETS.indexOf(x.key as any) - SWEEP_DELAY_BUCKETS.indexOf(y.key as any));
  const sweepHours = groupTrades(trades, (t) => sweepHourBucket(t.sweepTime)).sort((x, y) => sweepBucketOrder(x.key) - sweepBucketOrder(y.key));
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

  // Kombinasyon bulucu (iki alan): yalnızca işleme girmeden ÖNCE bilinen alanlar (Edge Özeti taramasıyla aynı ilke).
  // İşlem süresi / yönetim gibi sonradan belirlenen alanlar "bunu daha çok yap" kombinasyonu üretemez.
  // Çoklu seçimli alanlar (PD Array, Entry Model, Target) birleşik değer olarak sayılır: bir işlem iki kez sayılmaz.
  const joined = (xs?: string[]) => {
    const v = (xs || []).map((x) => x.trim()).filter(Boolean);
    return v.length ? [...new Set(v)].sort((a, b) => a.localeCompare(b, 'tr')).join(' + ') : null;
  };
  const dims: Array<{ name: string; get: (t: Trade) => string | null }> = [
    { name: 'Parite', get: (t) => normalizePair(t.asset) },
    { name: 'Saat', get: (t) => getTradeHourBucket(t) },
    { name: 'Gün', get: (t) => WEEKDAY_NAMES_TR[getTradeNyWeekday(t)] },
    { name: 'Yön', get: (t) => (getSweepSide(t) === 'HIGH' ? 'High→Short' : 'Low→Long') },
    { name: 'Session', get: (t) => t.session || null },
    { name: 'Asia Range', get: (t) => t.asiaRange || null },
    { name: 'Sweep Saati', get: (t) => sweepHourBucket(t.sweepTime) },
    { name: 'Sweep→Giriş', get: (t) => sweepDelayBucket(t) },
    { name: 'Setup Kalitesi', get: (t) => t.planFidelity || null },
    { name: 'Trend', get: (t) => t.trend || null },
    { name: 'HTF', get: (t) => t.htfTimeframe || null },
    { name: 'PD Array', get: (t) => joined(t.confirmations) },
    { name: 'Entry TF', get: (t) => t.timeframe || null },
    { name: 'Entry Model', get: (t) => joined(t.entryModels) },
    { name: 'Target', get: (t) => joined(t.tpTargets) },
    { name: 'Confirmations', get: (t) => t.premiumDiscount || null },
    { name: 'Asia Range FVG', get: (t) => t.asiaRangeFvg || null },
    { name: 'News Day', get: (t) => (typeof t.newsDay === 'boolean' ? (t.newsDay ? nl.yes : nl.no) : null) },
    { name: 'Planlanan R:R', get: (t) => plannedRRBucket(t) },
    { name: 'Stop / Asia Range', get: (t) => stopToRangeBucket(t) },
    { name: 'Günün İşlemi', get: (t) => tradeOfDayBucket(t) },
    { name: 'Hesap Aşaması', get: (t) => stageBucket(t) },
  ];
  const comboMap = new Map<string, { a: string; b: string; list: Trade[] }>();
  const singleCount = new Map<string, number>();
  trades.forEach((t) => {
    const vals = dims.map((d) => d.get(t));
    vals.forEach((v, i) => {
      if (v) singleCount.set(`${i}=${v}`, (singleCount.get(`${i}=${v}`) || 0) + 1);
    });
    for (let a = 0; a < dims.length; a++) {
      const va = vals[a];
      if (!va) continue;
      for (let b = a + 1; b < dims.length; b++) {
        const vb = vals[b];
        if (!vb) continue;
        const key = `${dims[a].name}: ${va}  +  ${dims[b].name}: ${vb}`;
        const g = comboMap.get(key);
        if (g) g.list.push(t);
        else comboMap.set(key, { a: `${a}=${va}`, b: `${b}=${vb}`, list: [t] });
      }
    }
  });
  const combos: ComboRow[] = Array.from(comboMap.entries())
    .filter(([, g]) => g.list.length >= Math.max(3, opts.minSample))
    // Birleşim, alanlardan birinin tüm işlemleriyle aynıysa yeni bilgi taşımaz (ör. tek parite süzülmüşken "Parite + X")
    .filter(([, g]) => g.list.length !== singleCount.get(g.a) && g.list.length !== singleCount.get(g.b))
    .map(([label, g]) => ({ label, stats: computeEdge(g.list) }))
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
    sweepDelay,
    holdTime,
    plannedRR: plannedRRRows,
    stopToRange,
    tradeOfDay,
    management,
    afterExit,
    missedByManagement: managementMissedR(trades),
    stages,
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
