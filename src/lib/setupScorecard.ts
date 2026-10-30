import { Trade } from '../types';
import { edgeFromR, EdgeStats, sweepHourBucket, sweepDelayBucket, holdBucket, stageBucket, plannedRRBucket, stopToRangeBucket, tradeOfDayBucket, managementBucket, afterExitBucket, indexTradeOrder, rangeSizeBucket } from './asiaAnalytics';
import { getTradeHourBucket, getTradeNyWeekday, WEEKDAY_NAMES_TR } from './tradingTime';
import { getNewsDayLabels } from '../constants/constants';
import { EDGE_PROOF_MIN, MIN_SAMPLE } from './sampleSize';
import { driftFromR, type EdgeDrift } from './edgeDrift';

/**
 * Kurulum karnesi: işlemleri seçilen boyutların birleşimine (ör. Asia Range + seans + giriş modeli)
 * göre "kurulum" olarak gruplar; her kurulumun R karnesini ve güven aralığına dayalı hükmünü verir.
 */

export type SetupDimension =
  | 'asiaRange'
  | 'sweepHour'
  | 'sweepDelay'
  | 'planFidelity'
  | 'holdTime'
  | 'plannedRR'
  | 'stopToRange'
  | 'tradeOfDay'
  | 'management'
  | 'afterExitTp'
  | 'accountStage'
  | 'session'
  | 'entryModels'
  | 'confirmations'
  | 'premiumDiscount'
  | 'trend'
  | 'timeframe'
  | 'htfTimeframe'
  | 'tpTargets'
  | 'asiaRangeFvg'
  | 'newsDay'
  | 'rangeSize'
  | 'weekday'
  | 'entryHour'
  | 'type'
  | 'asset';

export const SETUP_DIMENSIONS: { id: SetupDimension; label: string }[] = [
  { id: 'asiaRange', label: 'Asia Range' },
  { id: 'sweepHour', label: 'Sweep Saati (NY, 30 dk)' },
  { id: 'sweepDelay', label: 'Sweep→Giriş' },
  { id: 'planFidelity', label: 'Setup Kalitesi' },
  { id: 'holdTime', label: 'İşlem Süresi' },
  { id: 'plannedRR', label: 'Planlanan R:R' },
  { id: 'stopToRange', label: 'Stop / Asia Range' },
  { id: 'tradeOfDay', label: 'Günün İşlemi' },
  { id: 'management', label: 'İşlem Yönetimi' },
  { id: 'afterExitTp', label: 'Çıkış Sonrası TP' },
  { id: 'accountStage', label: 'Hesap Aşaması' },
  { id: 'session', label: 'Session' },
  { id: 'entryModels', label: 'Entry Model' },
  { id: 'confirmations', label: 'PD Array' },
  { id: 'premiumDiscount', label: 'Confirmations' },
  { id: 'trend', label: 'Trend' },
  { id: 'timeframe', label: 'Entry TF' },
  { id: 'htfTimeframe', label: 'HTF' },
  { id: 'tpTargets', label: 'Target' },
  { id: 'asiaRangeFvg', label: 'Asia Range FVG' },
  { id: 'newsDay', label: 'News Day' },
  { id: 'rangeSize', label: 'Asia Range Büyüklüğü' },
  { id: 'weekday', label: 'Gün' },
  { id: 'entryHour', label: 'Giriş Saati (NY)' },
  { id: 'type', label: 'Yön' },
  { id: 'asset', label: 'Parite' },
];

export const DEFAULT_SETUP_DIMENSIONS: SetupDimension[] = ['asiaRange', 'session', 'entryModels'];
/** Bu sayıdan az işlemli kurulumlara hüküm verilmez */
export const SETUP_MIN_SAMPLE = MIN_SAMPLE;
export const UNSPECIFIED = 'Belirtilmemiş';

export type SetupVerdict = 'EDGE' | 'PROMISING' | 'WEAK' | 'LEAK' | 'LOW_SAMPLE';

export interface SetupRow {
  key: string;
  labels: string[];          // boyut sırasıyla değerler
  edge: EdgeStats;
  verdict: SetupVerdict;
  /** Sıralama puanı: beklenti, örneklem küçükse sıfıra doğru çekilir */
  score: number;
  lastAt: number;
  /** Son 10 işlem ↔ öncesi (en az 20 işlemli kurulumlarda) */
  drift: EdgeDrift;
}

const joinList = (xs?: string[]) => {
  const v = (xs || []).map((x) => x.trim()).filter(Boolean);
  return v.length ? [...new Set(v)].sort((a, b) => a.localeCompare(b, 'tr')).join(' + ') : UNSPECIFIED;
};

export function dimensionValue(t: Trade, d: SetupDimension): string {
  switch (d) {
    case 'entryModels':
      return joinList(t.entryModels);
    case 'tpTargets':
      return joinList(t.tpTargets);
    case 'confirmations':
      return joinList(t.confirmations);
    case 'sweepHour':
      return sweepHourBucket(t.sweepTime) ?? UNSPECIFIED;
    case 'sweepDelay':
      return sweepDelayBucket(t) ?? UNSPECIFIED;
    case 'plannedRR':
      return plannedRRBucket(t) ?? UNSPECIFIED;
    case 'stopToRange':
      return stopToRangeBucket(t) ?? UNSPECIFIED;
    case 'tradeOfDay':
      return tradeOfDayBucket(t) ?? UNSPECIFIED;
    case 'management':
      return managementBucket(t) ?? UNSPECIFIED;
    case 'afterExitTp':
      return afterExitBucket(t) ?? UNSPECIFIED;
    case 'holdTime':
      return holdBucket(t) ?? UNSPECIFIED;
    case 'accountStage':
      return stageBucket(t) ?? UNSPECIFIED;
    case 'rangeSize':
      return rangeSizeBucket(t) ?? UNSPECIFIED;
    case 'weekday': {
      const d = getTradeNyWeekday(t);
      return Number.isInteger(d) ? WEEKDAY_NAMES_TR[d] : UNSPECIFIED;
    }
    case 'entryHour': {
      const h = getTradeHourBucket(t);
      return h && h !== 'Belirsiz' ? h : UNSPECIFIED;
    }
    case 'newsDay': {
      if (typeof t.newsDay !== 'boolean') return UNSPECIFIED;
      const nl = getNewsDayLabels();
      return t.newsDay ? nl.yes : nl.no;
    }
    case 'type':
      return t.type === 'SHORT' ? 'Short' : 'Long';
    default: {
      const v = t[d];
      return typeof v === 'string' && v.trim() ? v.trim() : UNSPECIFIED;
    }
  }
}

export function verdictFor(e: EdgeStats, minSample = SETUP_MIN_SAMPLE): SetupVerdict {
  if (e.n < minSample) return 'LOW_SAMPLE';
  if (e.expLo > 0) return e.n >= EDGE_PROOF_MIN ? 'EDGE' : 'PROMISING';
  if (e.expHi < 0) return 'LEAK';
  return e.expectancy > 0 ? 'PROMISING' : 'WEAK';
}

/**
 * Bulgunun güveni (tek kaynak): olumlu bulgu ancak %95 aralığın alt sınırı sıfırın üstünde VE en az
 * EDGE_PROOF_MIN işlemle "kesin" sayılır; olumsuz bulgu (sızıntı) aralığın üst sınırı sıfırın altındaysa
 * örneklem büyüklüğünü beklemeden kesindir. Geri kalan her şey "erken sinyal"dir.
 */
export type SignalStrength = 'CONFIRMED' | 'EARLY';
export function signalStrength(e: Pick<EdgeStats, 'n' | 'expLo' | 'expHi' | 'expectancy'>): SignalStrength {
  if (e.expectancy > 0) return e.n >= EDGE_PROOF_MIN && e.expLo > 0 ? 'CONFIRMED' : 'EARLY';
  if (e.expectancy < 0) return e.n > 1 && e.expHi < 0 ? 'CONFIRMED' : 'EARLY';
  return 'EARLY';
}

export interface ScorecardOptions {
  minSample?: number;
  /** Tüm boyutları "Belirtilmemiş" olan grubu dahil et (varsayılan: hayır) */
  includeUnspecified?: boolean;
}

export interface ScorecardResult {
  rows: SetupRow[];          // puana göre azalan
  total: number;             // gruplanan işlem sayısı
  unspecifiedCount: number;  // hiçbir boyutu girilmemiş işlem sayısı
}

export function buildSetupScorecard(trades: Trade[], dims: SetupDimension[], options: ScorecardOptions = {}): ScorecardResult {
  const minSample = options.minSample ?? SETUP_MIN_SAMPLE;
  const useDims = dims.length ? dims : DEFAULT_SETUP_DIMENSIONS;
  const groups = new Map<string, { labels: string[]; rs: number[]; st: Trade['status'][]; lastAt: number }>();
  let unspecifiedCount = 0;
  let total = 0;

  // R sırası için kronolojik
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  if (useDims.includes('tradeOfDay') || useDims.includes('rangeSize')) indexTradeOrder(sorted);
  for (const t of sorted) {
    if (typeof t.rr !== 'number' || !Number.isFinite(t.rr)) continue;
    const labels = useDims.map((d) => dimensionValue(t, d));
    const allUnspecified = labels.every((l) => l === UNSPECIFIED);
    if (allUnspecified) {
      unspecifiedCount++;
      if (!options.includeUnspecified) continue;
    }
    total++;
    const key = labels.join(' | ');
    const g = groups.get(key) || { labels, rs: [], st: [], lastAt: 0 };
    g.rs.push(t.rr);
    g.st.push(t.status);
    g.lastAt = Math.max(g.lastAt, t.createdAt);
    groups.set(key, g);
  }

  const rows: SetupRow[] = [...groups.entries()].map(([key, g]) => {
    const edge = edgeFromR(g.rs, g.st);
    const score = (edge.expectancy * edge.n) / (edge.n + minSample);
    return { key, labels: g.labels, edge, verdict: verdictFor(edge, minSample), score, lastAt: g.lastAt, drift: driftFromR(g.rs, g.st, 10, 20) };
  });
  rows.sort((a, b) => b.score - a.score || b.edge.n - a.edge.n || a.key.localeCompare(b.key, 'tr'));
  return { rows, total, unspecifiedCount };
}
