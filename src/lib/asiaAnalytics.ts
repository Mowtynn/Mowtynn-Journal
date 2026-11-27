import { byEntryTime, tradeConfirmations } from './tradeModel';
import { Trade } from '../types';
import { getTradeAccountKind } from '../constants/constants';
import { calculateProfitFactor, toRR } from './statMath';
import { EDGE_PROOF_MIN } from './sampleSize';
import {
  hourToBucket,
  nyDateKey,
  normalizePair,
} from './tradingTime';

/* ------------------------------------------------------------------ */
/* Dataset selection                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Statistics helpers                                                  */
/* ------------------------------------------------------------------ */

const T_CRIT_95 = [
  Infinity, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
  2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];
/**
 * Student-t %95 (iki yönlü) kritik değeri. 30 serbestlik derecesine kadar tablo, üstünde Cornish–Fisher açılımı
 * (hata < 0.001). Eskiden 31–60 arası sabit 2.0, 60 üstü 1.96 kullanılıyordu: aralıklar olduğundan dar çıkıyordu
 * (ör. 40 işlemde t = 2.023, 100 işlemde 1.984).
 */
export const tCrit95 = (df: number): number => {
  if (df <= 0) return Infinity;
  if (df <= 30) return T_CRIT_95[df];
  const z = 1.959964;
  const z3 = z * z * z;
  const z5 = z3 * z * z;
  return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df);
};

const round = (v: number, digits = 2): number => {
  if (!Number.isFinite(v)) return 0;
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
};

/**
 * EdgeStats değerleri 6 basamakla saklanır (yalnızca kayan nokta gürültüsü temizlenir); ekranlar kendi basamağına tek
 * seferde yuvarlar. Eskiden değerler 1–3 basamağa yuvarlanıp ekranda daha az basamakla gösteriliyordu: çifte yuvarlama
 * (örn. 11/31 = %35.48 → 35.5 → "%36", 0.6249R → 0.625 → "0.63R") bazı değerleri bir birim yukarı gösteriyordu.
 */
const KEEP = 6;

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
  tradesNeeded: number | null; // extra trades for the CI lower bound to clear 0 at the current mean/sd
  /** Bağımsız karar sayısı (farklı NY günü × hesap türü); yalnızca gün kümesi verildiyse */
  days?: number;
  /** Aynı gün işlemlerin birbirine bağlılığı yüzünden güven aralığının genişleme katsayısı (≥ 1; yalnızca > 1 ise) */
  dayInflation?: number;
}

const EMPTY_EDGE: EdgeStats = {
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
  tradesNeeded: null,
};

/**
 * Gün kümesi düzeltmesinin devreye girdiği en az farklı gün sayısı. Kümeli varyans az kümede güvenilmez
 * (birkaç günlük veri aralığı rastgele daraltıp genişletir); bu sayının altında işlemler bağımsız sayılır.
 */
export const CLUSTER_MIN_DAYS = 10;

/**
 * `clusters` (isteğe bağlı): her işlemin gün anahtarı (dayClusterKey). Aynı gün aynı fikirle açılan işlemler
 * (ör. EURUSD ve DXY) birlikte kazanır / kaybeder; bağımsız sayılırsa örneklem olduğundan büyük görünür ve güven
 * aralığı fazla dar çıkar. Verilirse beklentinin standart hatası gün kümelerine göre (CR1) hesaplanır ve bağımsız
 * hesaptan küçükse bağımsız hesap kullanılır (düzeltme aralığı yalnızca genişletir). Her gün tek işlemse sonuç aynıdır.
 */
export function edgeFromR(rs: number[], statuses?: Array<Trade['status']>, clusters?: string[]): EdgeStats {
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
  // Küçük örneklemde (EDGE_PROOF_MIN altı) sonuçlar neredeyse aynıysa (ör. −1, −1, −1, −1, −0.95R) örnek sapma ~0 çıkar
  // ve güven aralığı tek noktaya çöker: birkaç ardışık kayıp "kesin sızıntı" sayılırdı. Aralık için sapma en az 1R
  // alınır (stop'a sadık bir R sisteminde gerçekçi alt sınır); 30+ işlemde gerçek sapma kullanılır. Gösterilen sd değişmez.
  const sdCi = n > 1 && n < EDGE_PROOF_MIN ? Math.max(sd, 1) : sd;
  let se = n > 1 ? sdCi / Math.sqrt(n) : 0;
  let df = n - 1;
  let days: number | undefined;
  let dayInflation: number | undefined;
  if (clusters && clusters.length === n && n > 1) {
    const sums = new Map<string, number>();
    rs.forEach((r, i) => sums.set(clusters[i], (sums.get(clusters[i]) || 0) + (r - mean)));
    const G = sums.size;
    days = G;
    if (G >= CLUSTER_MIN_DAYS && G < n) {
      let ss = 0;
      sums.forEach((v) => (ss += v * v));
      const seCl = Math.sqrt((ss / (n * n)) * (G / (G - 1)));
      if (seCl > se) {
        dayInflation = se > 0 ? seCl / se : undefined;
        se = seCl;
        df = G - 1;
      }
    }
  }
  const tc = tCrit95(df);
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
    // Aynı gün bağımlılığı: her işlem bir bağımsız işlemden daha az bilgi taşır (etkin örneklem n / katsayı²)
    if (tradesNeeded && dayInflation && !(n > 1 && expLo > 0)) tradesNeeded = Math.max(1, Math.ceil((tradesNeeded + n) * dayInflation * dayInflation) - n);
  }

  return {
    n,
    wins,
    losses,
    breakevens,
    winRate: round(p * 100, KEEP),
    wrLo: round(Math.max(0, center - half) * 100, KEEP),
    wrHi: round(Math.min(1, center + half) * 100, KEEP),
    netR: round(netR, KEEP),
    expectancy: round(mean, KEEP),
    sd: round(sd, KEEP),
    expLo: round(expLo, KEEP),
    expHi: round(expHi, KEEP),
    profitFactor: round(calculateProfitFactor(toRR(posR), toRR(negR)), KEEP),
    avgWin: winners.length ? round(winners.reduce((s, r) => s + r, 0) / winners.length, KEEP) : 0,
    avgLoss: losers.length ? round(losers.reduce((s, r) => s + r, 0) / losers.length, KEEP) : 0,
    maxDrawdownR: round(maxDD, KEEP),
    tradesNeeded,
    ...(days !== undefined ? { days } : {}),
    ...(dayInflation && dayInflation > 1 ? { dayInflation: round(dayInflation, KEEP) } : {}),
  };
}

/** Bağımsız karar birimi: NY takvim günü × hesap türü (aynı gün Prop ve Hesapsız işlemleri ayrı kararlar) */
const dayKeyCache = new WeakMap<Trade, string>();
export function dayClusterKey(t: Trade): string {
  let k = dayKeyCache.get(t);
  if (k === undefined) {
    k = Number.isFinite(t.createdAt) ? `${nyDateKey(t.createdAt)}|${getTradeAccountKind(t)}` : `id:${t.id}`;
    dayKeyCache.set(t, k);
  }
  return k;
}

const rValue = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
/** İşlem listesinin edge'i, gün kümesi düzeltmesiyle (liste sırası korunur; drawdown için kronolojik ver) */
export function edgeOfTrades(list: Trade[]): EdgeStats {
  return edgeFromR(list.map(rValue), list.map((t) => t.status), list.map(dayClusterKey));
}

const chronological = (trades: Trade[]): Trade[] => [...trades].sort(byEntryTime);

export function computeEdge(trades: Trade[]): EdgeStats {
  return edgeOfTrades(chronological(trades));
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

interface GroupRow {
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

/* ------------------------------------------------------------------ */
/* Data completeness                                                   */
/* ------------------------------------------------------------------ */

interface CoverageRow {
  field: string;
  label: string;
  filled: number;
  /** Payda: alanın sorulduğu işlem sayısı (çoğu alanda tüm işlemler) */
  base: number;
  pct: number;
  unlocks: string;
}

/** POI Sweep saati (NY) 30 dakikalık dönemlere: 02:15 → "02:00–02:30", 02:40 → "02:30–03:00"; geçersizse null */
export function sweepHourBucket(v?: string): string | null {
  const m = typeof v === 'string' ? v.match(/^(\d{2}):(\d{2})$/) : null;
  if (!m) return null;
  const start = Number(m[1]) * 60 + (Number(m[2]) < 30 ? 0 : 30);
  const fmt = (x: number) => `${String(Math.floor((x % 1440) / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  return `${fmt(start)}–${fmt(start + 30)}`;
}

/** POI Sweep saati (NY) 1 saatlik dönemlere: 02:15 → "02:00–03:00"; geçersizse null (az veride 30 dk dilimler çok dağılır) */
export function sweepHour1hBucket(v?: string): string | null {
  const m = typeof v === 'string' ? v.match(/^(\d{2}):(\d{2})$/) : null;
  if (!m) return null;
  const h = Number(m[1]);
  if (!(h >= 0 && h < 24)) return null;
  return `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`;
}

/** Bu kadar POI Sweep saati girilmiş işlemden sonra 30 dakikalık dilimler kullanılır; öncesinde 1 saatlik (örneklem dağılmasın) */
export const SWEEP_FINE_MIN = 120;

/** Dönemleri işlem günü akışına göre sıralar: Asia akşamı (18:00 NY) → London → NY */
export function sweepBucketOrder(key: string): number {
  const m = key.match(/^(\d{2}):(\d{2})/);
  if (!m) return 9999;
  return (Number(m[1]) * 60 + Number(m[2]) - 18 * 60 + 1440) % 1440;
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
    if (!Number.isFinite(t.createdAt)) continue; // zamanı bozuk kayıt sıraya / gün sayacına girmez
    // Gün içi sıra hesap türü içinde: hesapsız işlemler prop işlemlerinin "günün kaçıncı işlemi" sayacına karışmaz
    const k = `${nyDateKey(t.createdAt)}|${getTradeAccountKind(t)}`;
    (byDay.get(k) || byDay.set(k, []).get(k)!).push(t);
  }
  prevResult.clear();
  streakBefore.clear();
  ddBefore.clear();
  // Hesap durumu: hesap türü içinde kronolojik (gün fark etmeksizin) seri ve zirveden uzaklık, işlemden ÖNCE
  const byKind = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!Number.isFinite(t.createdAt)) continue;
    const k = getTradeAccountKind(t);
    (byKind.get(k) || byKind.set(k, []).get(k)!).push(t);
  }
  byKind.forEach((list) => {
    let losses = 0; // ardışık kayıp (BE seriyi bozmaz)
    let last: 'WIN' | 'LOSS' | null = null;
    let equity = 0;
    let peak = 0;
    for (const t of [...list].sort(byEntryTime)) {
      if (last) streakBefore.set(t.id, last === 'WIN' ? STREAK_BUCKETS[0] : losses >= 2 ? STREAK_BUCKETS[2] : STREAK_BUCKETS[1]);
      const dd = peak - equity;
      ddBefore.set(t.id, dd < 1e-9 ? DD_BUCKETS[0] : dd < DD_DEEP_R ? DD_BUCKETS[1] : DD_BUCKETS[2]);
      if (t.status === 'WIN') {
        losses = 0;
        last = 'WIN';
      } else if (t.status === 'LOSS') {
        losses++;
        last = 'LOSS';
      }
      equity += typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;
      if (equity > peak) peak = equity;
    }
  });
  byDay.forEach((list) =>
    list
      .sort(byEntryTime)
      .forEach((t, i) => {
        tradeOrder.set(t.id, i + 1);
        const prev = i > 0 ? list[i - 1] : null;
        prevResult.set(t.id, !prev ? PREV_TRADE_BUCKETS[0] : prev.status === 'WIN' ? PREV_TRADE_BUCKETS[1] : prev.status === 'LOSS' ? PREV_TRADE_BUCKETS[2] : PREV_TRADE_BUCKETS[3]);
      }),
  );
}
export function tradeOfDayBucket(t: Pick<Trade, 'id'>): string | null {
  const n = tradeOrder.get(t.id);
  return n === undefined ? null : n === 1 ? '1. İşlem' : n === 2 ? '2. İşlem' : '3.+ İşlem';
}

/**
 * Gün içi önceki işlemin sonucu (NY günü, aynı veri seti; prop hesapları kendi aralarında birlikte): kayıptan / kazançtan sonraki işlemin edge'i.
 * "Kayıptan sonra dur" kuralının veriye dayanıp dayanmadığını gösterir.
 */
export const PREV_TRADE_BUCKETS = ['Günün İlk İşlemi', 'Önceki Kazandı', 'Önceki Kaybetti', 'Önceki BE'] as const;
const prevResult = new Map<string, (typeof PREV_TRADE_BUCKETS)[number]>();
export function prevTradeBucket(t: Pick<Trade, 'id'>): string | null {
  return prevResult.get(t.id) ?? null;
}

/**
 * Önceki sonuç serisi (hesap türü içinde, gün fark etmeksizin; BE seriyi bozmaz): kayıp serisinden sonra edge düşüyor mu?
 * İlk işlem (öncesinde kazanç / kayıp yok) boş kalır.
 */
export const STREAK_BUCKETS = ['Kazanç sonrası', '1 kayıp sonrası', '2+ kayıp serisi sonrası'] as const;
const streakBefore = new Map<string, (typeof STREAK_BUCKETS)[number]>();
export function streakBeforeBucket(t: Pick<Trade, 'id'>): string | null {
  return streakBefore.get(t.id) ?? null;
}

/** Hesap durumu: işlemden önce kümülatif R zirvesinden uzaklık (hesap türü içinde). Düşüşteyken edge değişiyor mu? */
export const DD_DEEP_R = 2;
export const DD_BUCKETS = ['Zirvede', `Düşüşte (${DD_DEEP_R}R altı)`, `Derin düşüşte (${DD_DEEP_R}R+)`] as const;
const ddBefore = new Map<string, (typeof DD_BUCKETS)[number]>();
export function ddStateBucket(t: Pick<Trade, 'id'>): string | null {
  return ddBefore.get(t.id) ?? null;
}

/**
 * Veri eksiği panosu: formdaki her girdinin doluluk oranı (form sırasıyla) ve o girdinin açtığı analiz.
 * Yalnızca belirli işlemlerde sorulan alanlar kendi paydasıyla ölçülür (asked).
 */
export function computeCoverage(trades: Trade[]): CoverageRow[] {
  const defs: Array<{ field: string; label: string; unlocks: string; ok: (t: Trade) => boolean; asked?: (t: Trade) => boolean }> = [
    { field: 'asiaRange', label: 'Asia Range', unlocks: 'Range / Trend kıyası', ok: (t) => !!t.asiaRange },
    { field: 'trend', label: 'İşlem Tipi', unlocks: 'Continuation / Reversal kıyası, reversal maliyeti', ok: (t) => !!t.trend },
    { field: 'sweepTime', label: 'POI Sweep Time', unlocks: 'POI Sweep saati (30 dk), POI Sweep saati × parite tablosu', ok: (t) => !!t.sweepTime },
    { field: 'session', label: 'Session', unlocks: 'Session ve Session × Yön kıyası; POI Sweep saatinden otomatik gelir, formda değiştirilebilir', ok: (t) => !!t.session },
    { field: 'poiTimeframe', label: 'POI Timeframe', unlocks: 'POI zaman dilimine göre edge, Kurulum Karnesi boyutu', ok: (t) => !!t.poiTimeframe },
    { field: 'premiumDiscount', label: 'Confirmations', unlocks: 'Confirmations × Yön kıyası', ok: (t) => tradeConfirmations(t).length > 0 },
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

interface HourPairCell {
  n: number;
  expectancy: number;
  netR: number;
}

export interface AsiaLabResult {
  trades: Trade[];
  overall: EdgeStats;
  hourPair: { hours: string[]; pairs: string[]; cells: Record<string, HourPairCell> };
  rolling: Array<{ index: number; date: string; expectancy: number }>;
  coverage: CoverageRow[];
}

interface AsiaLabOptions {
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
    if (opts.pair !== 'ALL' && normalizePair(t.asset) !== opts.pair) return false;
    return true;
  });

  indexTradeOrder(trades);
  const overall = computeEdge(trades);

  const pairRows = groupTrades(trades, (t) => normalizePair(t.asset));

  // Saat ekseni sweep saatidir (giriş saati artık tutulmuyor); sweep saati girilmemiş işlem tabloda yer almaz
  const sweepHour = (t: Trade): string | null => {
    const m = typeof t.sweepTime === 'string' ? t.sweepTime.match(/^(\d{2}):\d{2}$/) : null;
    return m ? hourToBucket(Number(m[1])) : null;
  };
  const hours = groupTrades(trades, (t) => sweepHour(t)).sort((a, b) => sweepBucketOrder(a.key) - sweepBucketOrder(b.key));

  // Hour x pair matrix
  const pairKeys = pairRows.map((p) => p.key);
  const hourKeys = hours.map((h) => h.key);
  // Saat × parite: tek geçişte gruplanır (eskiden her hücre için tüm işlemler yeniden süzülüyordu)
  const cells: Record<string, HourPairCell> = {};
  const cellLists = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const h = sweepHour(t);
    if (h === null) return;
    const k = `${h}|${normalizePair(t.asset)}`;
    (cellLists.get(k) || cellLists.set(k, []).get(k)!).push(t);
  });
  cellLists.forEach((list, k) => {
    const e = computeEdge(list);
    cells[k] = { n: e.n, expectancy: e.expectancy, netR: e.netR };
  });


  // Rolling expectancy (edge stability), window of 20 trades
  const sorted = chronological(trades);
  const WINDOW = 20;
  const rolling: AsiaLabResult['rolling'] = [];
  for (let i = WINDOW; i <= sorted.length; i++) {
    const slice = sorted.slice(i - WINDOW, i);
    const exp = slice.reduce((s, t) => s + (t.rr || 0), 0) / WINDOW;
    const last = slice[slice.length - 1];
    rolling.push({ index: i, date: nyDateKey(last.createdAt), expectancy: round(exp, KEEP) });
  }

  return {
    trades,
    overall,
    hourPair: { hours: hourKeys, pairs: pairKeys, cells },
    rolling: rolling.slice(-80),
    coverage: computeCoverage(trades),
  };
}
