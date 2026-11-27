import { Trade } from '../types';
import { byEntryTime, tradeConfirmations } from './tradeModel';
import { edgeFromR, EdgeStats, sweepHourBucket, sweepHour1hBucket, tradeOfDayBucket, indexTradeOrder, prevTradeBucket, streakBeforeBucket, ddStateBucket, dayClusterKey } from './asiaAnalytics';
import { getTradeNyWeekday, getSweepSide, WEEKDAY_NAMES_TR } from './tradingTime';
import { EDGE_PROOF_MIN, MIN_SAMPLE } from './sampleSize';
import { driftFromR, type EdgeDrift } from './edgeDrift';

/**
 * Kurulum karnesi: işlemleri seçilen boyutların birleşimine (ör. Asia Range + İşlem Tipi + Session)
 * göre "kurulum" olarak gruplar; her kurulumun R karnesini ve güven aralığına dayalı hükmünü verir.
 */

/** Tek bir confirmation'ın varlığı (ör. "conf:SMT Divergence" → Var / Yok); Edge Özeti işlemlerdeki etiketlerden üretir */
export type ConfDimension = `conf:${string}`;

export type SetupDimension =
  | 'asiaRange'
  | 'sweptSide'
  | 'sweepHour'
  | 'sweepHour1h'
  | 'poiTimeframe'
  | 'tradeOfDay'
  | 'prevTrade'
  | 'streakBefore'
  | 'ddState'
  | 'session'
  | 'premiumDiscount'
  | 'confCount'
  | 'trend'
  | 'weekday'
  | 'type'
  | 'asset'
  | ConfDimension;

export const SETUP_DIMENSIONS: { id: SetupDimension; label: string }[] = [
  { id: 'asiaRange', label: 'Asia Range' },
  { id: 'sweptSide', label: 'Süpürülen Asia Tarafı' },
  { id: 'sweepHour1h', label: 'POI Sweep Saati (NY, 1 saat)' },
  { id: 'sweepHour', label: 'POI Sweep Saati (NY, 30 dk)' },
  { id: 'poiTimeframe', label: 'POI Timeframe' },
  { id: 'tradeOfDay', label: 'Günün İşlemi' },
  { id: 'prevTrade', label: 'Gün İçi Önceki İşlem' },
  { id: 'streakBefore', label: 'Önceki Sonuç Serisi' },
  { id: 'ddState', label: 'Hesap Durumu (Zirveye Göre)' },
  { id: 'session', label: 'Session' },
  { id: 'premiumDiscount', label: 'Confirmations' },
  { id: 'confCount', label: 'Confirmation Sayısı' },
  { id: 'trend', label: 'İşlem Tipi' },
  { id: 'weekday', label: 'Gün' },
  { id: 'type', label: 'Yön' },
  { id: 'asset', label: 'Parite' },
];

/**
 * Varsayılan "kurulum" tanımı: Asia Range (Range / Trend) · İşlem Tipi (Continuation / Reversal).
 * Strateji iki moda dayanır (reversal Asia high/low süpürmesi ister, continuation istemez); işlemler tek seansta
 * (London) alındığı için Session kurulumu ayırt etmiyordu. Kurulum Karnesi'nde boyutlar yine elle değiştirilebilir.
 */
export const DEFAULT_SETUP_DIMENSIONS: SetupDimension[] = ['asiaRange', 'trend'];
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

export const confDimension = (tag: string): ConfDimension => `conf:${tag.trim()}`;
export const isConfDimension = (d: string): d is ConfDimension => d.startsWith('conf:');
/** Boyutun ekranda görünen adı (tek confirmation boyutları dahil) */
export function dimensionLabel(d: SetupDimension): string {
  if (isConfDimension(d)) return `Confirmation: ${d.slice(5)}`;
  return SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;
}

const joinList = (xs?: string[]) => {
  const v = (xs || []).map((x) => x.trim()).filter(Boolean);
  return v.length ? [...new Set(v)].sort((a, b) => a.localeCompare(b, 'tr')).join(' + ') : UNSPECIFIED;
};

/**
 * Zaman dilimi değerlerinin küçükten büyüğe sırası (15M < 1H < 4H < Daily < Weekly); tanınmayan değerler sona.
 * Filtre ve tablolarda POI Timeframe seçenekleri bu sırayla dizilir.
 */
export function timeframeOrder(v: string): number {
  const s = v.trim().toLowerCase();
  const m = /^(\d+)\s*(m|min|dk|h|s|saat|d|g|w|mo|ay)?$/.exec(s);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2] || 'm';
    const mult = unit === 'h' || unit === 's' || unit === 'saat' ? 60 : unit === 'd' || unit === 'g' ? 1440 : unit === 'w' ? 10080 : unit === 'mo' || unit === 'ay' ? 43200 : 1;
    return n * mult;
  }
  if (/^(d|daily|günlük|1d)$/.test(s)) return 1440;
  if (/^(w|weekly|haftalık)$/.test(s)) return 10080;
  if (/^(m|monthly|aylık)$/.test(s)) return 43200;
  return Number.MAX_SAFE_INTEGER;
}

export function dimensionValue(t: Trade, d: SetupDimension): string {
  switch (d) {
    case 'premiumDiscount':
      return joinList(tradeConfirmations(t));
    case 'sweepHour':
      return sweepHourBucket(t.sweepTime) ?? UNSPECIFIED;
    case 'sweepHour1h':
      return sweepHour1hBucket(t.sweepTime) ?? UNSPECIFIED;
    case 'confCount': {
      // Confirmation girilmemiş işlem (ör. hızlı kayıt) bilinmiyor sayılır, "0" değil
      const n = tradeConfirmations(t).length;
      return n === 0 ? UNSPECIFIED : n >= 3 ? '3+ confirmation' : `${n} confirmation`;
    }
    case 'sweptSide': {
      // Yalnızca Reversal işlemlerde: short → Asia High, long → Asia Low (Continuation'da anlamsız)
      const side = getSweepSide(t);
      return side === 'HIGH' ? 'Asia High' : side === 'LOW' ? 'Asia Low' : UNSPECIFIED;
    }
    case 'tradeOfDay':
      return tradeOfDayBucket(t) ?? UNSPECIFIED;
    case 'prevTrade':
      return prevTradeBucket(t) ?? UNSPECIFIED;
    case 'streakBefore':
      return streakBeforeBucket(t) ?? UNSPECIFIED;
    case 'ddState':
      return ddStateBucket(t) ?? UNSPECIFIED;
    case 'weekday': {
      const d = getTradeNyWeekday(t);
      return Number.isInteger(d) ? WEEKDAY_NAMES_TR[d] : UNSPECIFIED;
    }
    case 'type':
      return t.type === 'SHORT' ? 'Short' : 'Long';
    default: {
      if (isConfDimension(d)) {
        // Confirmation hiç girilmemişse bilinmiyor; girilmişse bu etiket var mı
        const tags = tradeConfirmations(t);
        if (!tags.length) return UNSPECIFIED;
        const want = d.slice(5).trim().toLocaleLowerCase('tr');
        return tags.some((x) => x.trim().toLocaleLowerCase('tr') === want) ? 'Var' : 'Yok';
      }
      const v = (t as unknown as Record<string, unknown>)[d];
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
type SignalStrength = 'CONFIRMED' | 'EARLY';
export function signalStrength(e: Pick<EdgeStats, 'n' | 'expLo' | 'expHi' | 'expectancy'>): SignalStrength {
  if (e.expectancy > 0) return e.n >= EDGE_PROOF_MIN && e.expLo > 0 ? 'CONFIRMED' : 'EARLY';
  if (e.expectancy < 0) return e.n > 1 && e.expHi < 0 ? 'CONFIRMED' : 'EARLY';
  return 'EARLY';
}

interface ScorecardOptions {
  minSample?: number;
  /** Tüm boyutları "Belirtilmemiş" olan grubu dahil et (varsayılan: hayır) */
  includeUnspecified?: boolean;
}

interface ScorecardResult {
  rows: SetupRow[];          // puana göre azalan
  total: number;             // gruplanan işlem sayısı
  unspecifiedCount: number;  // hiçbir boyutu girilmemiş işlem sayısı
}

/** Değeri işlemlerin sırasından türetilen boyutlar (indexTradeOrder gerekir) */
export const ORDER_DIMS = new Set<SetupDimension>(['tradeOfDay', 'prevTrade', 'streakBefore', 'ddState']);

export function buildSetupScorecard(trades: Trade[], dims: SetupDimension[], options: ScorecardOptions = {}): ScorecardResult {
  const minSample = options.minSample ?? SETUP_MIN_SAMPLE;
  const useDims = dims.length ? dims : DEFAULT_SETUP_DIMENSIONS;
  const groups = new Map<string, { labels: string[]; rs: number[]; st: Trade['status'][]; days: string[]; lastAt: number }>();
  let unspecifiedCount = 0;
  let total = 0;

  // R sırası için kronolojik
  const sorted = [...trades].sort(byEntryTime);
  if (useDims.some((d) => ORDER_DIMS.has(d))) indexTradeOrder(sorted);
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
    const g = groups.get(key) || { labels, rs: [], st: [], days: [], lastAt: 0 };
    g.rs.push(t.rr);
    g.st.push(t.status);
    g.days.push(dayClusterKey(t));
    g.lastAt = Math.max(g.lastAt, t.createdAt);
    groups.set(key, g);
  }

  const rows: SetupRow[] = [...groups.entries()].map(([key, g]) => {
    const edge = edgeFromR(g.rs, g.st, g.days);
    const score = (edge.expectancy * edge.n) / (edge.n + minSample);
    return { key, labels: g.labels, edge, verdict: verdictFor(edge, minSample), score, lastAt: g.lastAt, drift: driftFromR(g.rs, g.st, 10, 20) };
  });
  rows.sort((a, b) => b.score - a.score || b.edge.n - a.edge.n || a.key.localeCompare(b.key, 'tr'));
  return { rows, total, unspecifiedCount };
}
