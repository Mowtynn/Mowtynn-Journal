import { Trade } from '../types';
import { edgeFromR, EdgeStats, indexTradeOrder, managementMissedR } from './asiaAnalytics';
import { computeEdgeDrift, DRIFT_RECENT } from './edgeDrift';
import { formatDuration } from './tradingTime';
import { halfStatus, HALF_MIN, type HalfStatus } from './ruleSimulator';
import {
  buildSetupScorecard,
  signalStrength,
  verdictFor,
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
 * Kurulum karnesi + tek boyutlu sızıntı/güç taraması + risk % ve News Day etkisi.
 */

export interface DimensionSlice {
  dimension: SetupDimension;
  dimensionLabel: string;
  value: string;
  edge: EdgeStats;
  /** Bu işlemlerin büyük kısmı başka bir alan değeriyle örtüşüyorsa (≥ %70 ve genel orandan belirgin yüksek) */
  overlap?: { label: string; pct: number };
}

export interface RiskSlice {
  riskPct: number;
  edge: EdgeStats;
}

/** İki giriş alanının birleşimi (ör. Asia Range: Swept + Sweep Saati: 02:00–02:30) */
export interface PairSlice {
  dims: [SetupDimension, SetupDimension];
  values: [string, string];
  title: string;
  edge: EdgeStats;
  /** Birleşimin beklentisi − iki alanın tek başına en iyi (iyi kombinasyonda) / en kötü (kötüde) beklentisi */
  lift: number;
}

export const PAIR_MIN_LIFT = 0.25; // R / işlem

/** Kural kartı: kesinleşmiş bulgular "Al" / "Alma" kuralına dönüşür */
export interface EdgeRule {
  kind: 'TAKE' | 'AVOID';
  title: string;
  source: 'Kurulum' | 'Alan' | 'Kombinasyon';
  edge: EdgeStats;
  /** Bu kuralla eşleşen işlemler (Alma kuralında son 7 günde yapılan ihlaller buradan sayılır) */
  match: (t: Trade) => boolean;
  /** Alma kuralı: son 7 günde bu kurala uymayan işlemler ve toplam R'ı */
  recentViolations?: { n: number; r: number };
  /** İki yarı testi: kuralın işlemlerin ilk ve ikinci yarısındaki sonucu (zamana göre) */
  halves?: { first: EdgeStats; second: EdgeStats; status: HalfStatus };
}

/** Hedefe ulaşma süresi: kurulum bazında kazananların girişten çıkışa süresi */
export interface TimeToTargetRow {
  title: string;
  winners: number;
  medianMs: number;
  p90Ms: number;
  loserMedianMs: number | null;
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
  /** Yönetim edge'i: İşlem Yönetimi, Çıkış Sonrası TP, işlem süresi (en az minSample işlemli değerler) */
  managementSlices: DimensionSlice[];
  /** Çıkıştan sonra TP'ye giden işlemlerde kaçırılan R */
  missed: { n: number; measured: number; missedR: number };
  /** Kendi alanlarından belirgin iyi / kötü ikili birleşimler (en az 2 × minSample işlem) */
  bestPairs: PairSlice[];
  worstPairs: PairSlice[];
  rules: EdgeRule[];
  timeToTarget: { overall: TimeToTargetRow | null; setups: TimeToTargetRow[] };
  /** Taramada karşılaştırılan alan değeri sayısı (çoklu karşılaştırma uyarısı için) */
  testedSlices: number;
  news: { yes: EdgeStats; no: EdgeStats; unknown: number };
  /** İşlemde kalma süresi (çıkış saati girilmiş işlemler) */
  holding: { n: number; avgMs: number | null; winAvgMs: number | null; lossAvgMs: number | null };
}

/**
 * Yönetim / sonuç boyutları: işleme girdikten sonra belirlenir (süre, yönetim, Çıkış Sonrası TP).
 * Giriş kararlarıyla aynı listede "daha çok yap" önerisi üretmezler; ayrı bölümde gösterilir.
 */
export const MANAGEMENT_DIMENSIONS: SetupDimension[] = ['management', 'afterExitTp', 'holdTime'];

/** Sızıntı / güç taramasında bakılan tekil alanlar (yalnızca işleme girmeden önce bilinenler) */
export const SCAN_DIMENSIONS: SetupDimension[] = [
  'asiaRange',
  'rangeSize',
  'sweepHour',
  'sweepDelay',
  'planFidelity',
  'plannedRR',
  'stopToRange',
  'tradeOfDay',
  'prevTrade',
  'accountStage',
  'session',
  'entryModels',
  'confirmations',
  'premiumDiscount',
  'timeframe',
  'htfTimeframe',
  'trend',
  'tpTargets',
  'asiaRangeFvg',
  'newsDay',
  'weekday',
  'entryHour',
  'type',
  'asset',
];

type ValueOf = (t: Trade, d: SetupDimension) => string;

/**
 * Boyut değeri tablosu: her işlemin taranan alan değerleri bir kez hesaplanır. Tarama, örtüşme ve ikili birleşimler
 * aynı değeri onlarca kez istediği için (çoklu alanlarda sıralama + birleştirme) bu, Edge Özeti'ni birkaç kat hızlandırır.
 */
function valueTable(trades: Trade[], dims: SetupDimension[]): ValueOf {
  const table = new Map<Trade, Map<SetupDimension, string>>();
  for (const t of trades) {
    const m = new Map<SetupDimension, string>();
    for (const d of dims) m.set(d, dimensionValue(t, d));
    table.set(t, m);
  }
  return (t, d) => table.get(t)?.get(d) ?? dimensionValue(t, d);
}

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
const edgeOf = (list: Trade[]) => edgeFromR(list.map(rOf), list.map((t) => t.status));
const labelOf = (d: SetupDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;

export function computeEdgeSummary(trades: Trade[], minSample = SETUP_MIN_SAMPLE): EdgeSummary {
  const valid = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr));
  const sorted = [...valid].sort((a, b) => a.createdAt - b.createdAt);
  indexTradeOrder(sorted);
  const val = valueTable(sorted, [...SCAN_DIMENSIONS, ...MANAGEMENT_DIMENSIONS]);

  const card = buildSetupScorecard(sorted, DEFAULT_SETUP_DIMENSIONS, { minSample });
  const judged = card.rows.filter((r) => r.verdict !== 'LOW_SAMPLE');
  const bestSetups = judged.filter((r) => r.edge.expectancy > 0).slice(0, 3);
  const worstSetups = [...judged].reverse().filter((r) => r.edge.expectancy < 0).slice(0, 3);

  const scan = (dims: SetupDimension[]): DimensionSlice[] => {
  const slices: DimensionSlice[] = [];
  for (const d of dims) {
    const groups = new Map<string, Trade[]>();
    for (const t of sorted) {
      const v = val(t, d);
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
  return slices;
  };
  const slices = scan(SCAN_DIMENSIONS);
  const managementSlices = scan(MANAGEMENT_DIMENSIONS).sort((a, b) => b.edge.expectancy - a.edge.expectancy);
  const leaks = slices
    .filter((s) => s.edge.expectancy < 0)
    // kesinleşmiş sızıntılar önce, sonra en çok R kaybettiren
    .sort((a, b) => Number(signalStrength(b.edge) === 'CONFIRMED') - Number(signalStrength(a.edge) === 'CONFIRMED') || a.edge.netR - b.edge.netR)
    .slice(0, 4);
  // Çok sayıda alan tarandığı için olumlu bulguya daha yüksek eşik: kanıtlı değilse en az 2 × minSample işlem
  const strengths = slices
    .filter((s) => s.edge.expectancy > 0 && (signalStrength(s.edge) === 'CONFIRMED' || s.edge.n >= minSample * 2))
    .sort((a, b) => Number(signalStrength(b.edge) === 'CONFIRMED') - Number(signalStrength(a.edge) === 'CONFIRMED') || b.edge.expLo - a.edge.expLo || b.edge.netR - a.edge.netR)
    .slice(0, 4);

  // Birbirine bağlı alanlar: bulgu başka bir alanla büyük ölçüde örtüşüyorsa aynı etkiyi iki kez okumamak için not düşülür
  const overallShare = new Map<string, number>();
  const shareOf = (d: SetupDimension, v: string) => {
    const k = `${d}=${v}`;
    let x = overallShare.get(k);
    if (x === undefined) {
      x = sorted.filter((t) => val(t, d) === v).length / sorted.length;
      overallShare.set(k, x);
    }
    return x;
  };
  const overlapOf = (x: DimensionSlice): DimensionSlice['overlap'] => {
    const list = sorted.filter((t) => val(t, x.dimension) === x.value);
    let best: DimensionSlice['overlap'];
    for (const d of SCAN_DIMENSIONS) {
      if (d === x.dimension) continue;
      const counts = new Map<string, number>();
      for (const t of list) {
        const v = val(t, d);
        if (v !== UNSPECIFIED) counts.set(v, (counts.get(v) || 0) + 1);
      }
      counts.forEach((c, v) => {
        const pct = c / list.length;
        // Genel oran yalnızca aday değerler için (eskiden her değer için tüm işlemler süzülüyordu)
        if (pct < 0.7 || (best && pct <= best.pct)) return;
        if (pct - shareOf(d, v) >= 0.2) best = { label: `${labelOf(d)}: ${v}`, pct };
      });
    }
    return best;
  };
  [...leaks, ...strengths].forEach((x) => (x.overlap = overlapOf(x)));

  const pairs = scanPairs(sorted, minSample, val, PAIR_MIN_LIFT);
  const bestPairs = pairs
    .filter((p) => p.edge.expectancy > 0 && p.lift >= PAIR_MIN_LIFT)
    .sort((a, b) => b.edge.expLo - a.edge.expLo || b.lift - a.lift)
    .slice(0, 3);
  const worstPairs = pairs
    .filter((p) => p.edge.expectancy < 0 && p.lift <= -PAIR_MIN_LIFT)
    .sort((a, b) => a.edge.netR - b.edge.netR)
    .slice(0, 3);

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
    managementSlices,
    rules: buildRules(sorted, card.rows, slices, pairs, val),
    timeToTarget: computeTimeToTarget(sorted),
    bestPairs,
    worstPairs,
    missed: managementMissedR(sorted),
    testedSlices: slices.length + pairs.tested,
    news: { yes: edgeOf(yes), no: edgeOf(no), unknown: sorted.length - yes.length - no.length },
  };
}

const VERDICT_TEXT: Record<string, string> = {
  EDGE: 'Kanıtlı Edge',
  PROMISING: 'Umut Verici',
  WEAK: 'Zayıf',
  LEAK: 'Sızıntı',
  LOW_SAMPLE: 'Az Veri',
};
const round = (v: number, d = 2) => (Number.isFinite(v) ? Number(v.toFixed(d)) : v > 0 ? '∞' : 0);

const DAY_MS = 86_400_000;

function buildRules(sorted: Trade[], setupRows: SetupRow[], slices: DimensionSlice[], pairs: PairSlice[], val: ValueOf = dimensionValue): EdgeRule[] {
  const rules: EdgeRule[] = [];
  // Dışarıya verilen eşleştirici dimensionValue ile (her işlemde çalışır); iç hesaplar önceden hesaplanmış tabloyla
  const fast = new Map<EdgeRule, (t: Trade) => boolean>();
  const add = (kind: EdgeRule['kind'], title: string, source: EdgeRule['source'], edge: EdgeStats, match: (t: Trade) => boolean, quick?: (t: Trade) => boolean) => {
    const r: EdgeRule = { kind, title, source, edge, match };
    rules.push(r);
    fast.set(r, quick || match);
  };
  setupRows.forEach((r) => {
    const match = (t: Trade) => DEFAULT_SETUP_DIMENSIONS.every((d, i) => dimensionValue(t, d) === r.labels[i]);
    const quick = (t: Trade) => DEFAULT_SETUP_DIMENSIONS.every((d, i) => val(t, d) === r.labels[i]);
    if (r.verdict === 'EDGE') add('TAKE', r.labels.join(' · '), 'Kurulum', r.edge, match, quick);
    else if (r.verdict === 'LEAK') add('AVOID', r.labels.join(' · '), 'Kurulum', r.edge, match, quick);
  });
  slices.forEach((x) => {
    if (signalStrength(x.edge) !== 'CONFIRMED') return;
    const match = (t: Trade) => dimensionValue(t, x.dimension) === x.value;
    add(x.edge.expectancy > 0 ? 'TAKE' : 'AVOID', `${x.dimensionLabel}: ${x.value}`, 'Alan', x.edge, match, (t) => val(t, x.dimension) === x.value);
  });
  pairs.forEach((p) => {
    if (Math.abs(p.lift) < PAIR_MIN_LIFT || signalStrength(p.edge) !== 'CONFIRMED') return;
    const match = (t: Trade) => dimensionValue(t, p.dims[0]) === p.values[0] && dimensionValue(t, p.dims[1]) === p.values[1];
    add(p.edge.expectancy > 0 ? 'TAKE' : 'AVOID', p.title, 'Kombinasyon', p.edge, match, (t) => val(t, p.dims[0]) === p.values[0] && val(t, p.dims[1]) === p.values[1]);
  });
  // İki yarı testi: tüm işlemler zamana göre ortadan bölünür; kural iki yarıda da aynı yönde mi?
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  rules.forEach((r) => {
    const m = fast.get(r)!;
    const first = edgeOf(firstHalf.filter(m));
    const second = edgeOf(secondHalf.filter(m));
    r.halves = { first, second, status: halfStatus(first, second, r.kind === 'TAKE' ? 1 : -1) };
  });
  // Alma kuralları: son 7 günde kurala uymayan işlemler
  const last = sorted.length ? sorted[sorted.length - 1].createdAt : 0;
  const recent = sorted.filter((t) => t.createdAt > last - 7 * DAY_MS);
  rules.forEach((r) => {
    if (r.kind !== 'AVOID') return;
    const hit = recent.filter(fast.get(r)!);
    r.recentViolations = { n: hit.length, r: hit.reduce((s, t) => s + rOf(t), 0) };
  });
  return rules.sort((a, b) => (a.kind === b.kind ? b.edge.n - a.edge.n : a.kind === 'TAKE' ? -1 : 1));
}

const medianOf = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p90Of = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.9) - 1)];
};
const TTT_MIN_WINNERS = 3;

function timeRow(title: string, list: Trade[]): TimeToTargetRow | null {
  const held = list.filter((t) => typeof t.exitAt === 'number' && t.exitAt >= t.createdAt);
  const win = held.filter((t) => rOf(t) > 0).map((t) => (t.exitAt as number) - t.createdAt);
  if (win.length < TTT_MIN_WINNERS) return null;
  const loss = held.filter((t) => rOf(t) < 0).map((t) => (t.exitAt as number) - t.createdAt);
  return { title, winners: win.length, medianMs: medianOf(win), p90Ms: p90Of(win), loserMedianMs: loss.length ? medianOf(loss) : null };
}

/** Kazananların girişten çıkışa süresi (medyan ve %90'ı): genel ve varsayılan kurulumlar için; en az 3 kazanan gerekir */
export function computeTimeToTarget(sorted: Trade[]): EdgeSummary['timeToTarget'] {
  const groups = new Map<string, Trade[]>();
  for (const t of sorted) {
    const labels = DEFAULT_SETUP_DIMENSIONS.map((d) => dimensionValue(t, d));
    if (labels.every((l) => l === UNSPECIFIED)) continue;
    const k = labels.join(' · ');
    (groups.get(k) || groups.set(k, []).get(k)!).push(t);
  }
  const setups = [...groups.entries()]
    .map(([k, list]) => timeRow(k, list))
    .filter((r): r is TimeToTargetRow => !!r)
    .sort((a, b) => b.winners - a.winners)
    .slice(0, 5);
  return { overall: timeRow('Tüm İşlemler', sorted), setups };
}

/**
 * İkili birleşim taraması: tüm giriş alanı çiftleri, her iki değer de girilmiş işlemler. Yeni bilgi taşımayan birleşim
 * (işlemleri alanlardan biriyle aynı) atlanır. lift = birleşim beklentisi − alanların tek başına beklentisi
 * (pozitifse iki alanın iyisi, negatifse kötüsüyle kıyaslanır).
 */
export function scanPairs(trades: Trade[], minSample = SETUP_MIN_SAMPLE, val: ValueOf = dimensionValue, minLift = 0): PairSlice[] & { tested: number } {
  const need = minSample * 2;
  // Alanların tek başına sonucu tek geçişte (eskiden her yeni değer için tüm işlemler yeniden süzülüyordu)
  const singles = new Map<string, { n: number; exp: number }>();
  {
    const acc = new Map<string, { n: number; sum: number }>();
    for (const t of trades) {
      const r = rOf(t);
      for (const d of SCAN_DIMENSIONS) {
        const k = `${d}=${val(t, d)}`;
        const x = acc.get(k);
        if (x) {
          x.n++;
          x.sum += r;
        } else acc.set(k, { n: 1, sum: r });
      }
    }
    acc.forEach((x, k) => singles.set(k, { n: x.n, exp: Math.round((x.sum / x.n) * 1000) / 1000 }));
  }
  const single = (d: SetupDimension, v: string) => singles.get(`${d}=${v}`) || { n: 0, exp: 0 };
  // Değerler alan başına sayıya çevrilir; her alan çifti için önce sayım (tipli dizi), yalnızca eşiği geçen
  // birleşimlerin işlemleri toplanır. Eskiden her işlem × her çift için metin anahtarlı harita kuruluyordu.
  const D = SCAN_DIMENSIONS.length;
  const N = trades.length;
  const rs = trades.map(rOf);
  let tested = 0;
  const dict: string[][] = SCAN_DIMENSIONS.map(() => []);
  const codes: Int32Array[] = SCAN_DIMENSIONS.map(() => new Int32Array(N));
  SCAN_DIMENSIONS.forEach((d, di) => {
    const index = new Map<string, number>();
    trades.forEach((t, ti) => {
      const v = val(t, d);
      if (v === UNSPECIFIED) {
        codes[di][ti] = -1;
        return;
      }
      let c = index.get(v);
      if (c === undefined) {
        c = dict[di].length;
        dict[di].push(v);
        index.set(v, c);
      }
      codes[di][ti] = c;
    });
  });
  const out: PairSlice[] = [];
  for (let i = 0; i < D; i++) {
    for (let j = i + 1; j < D; j++) {
      const a = SCAN_DIMENSIONS[i];
      const b = SCAN_DIMENSIONS[j];
      const ca = codes[i];
      const cb = codes[j];
      const vb = dict[j].length;
      if (!dict[i].length || !vb) continue;
      const counts = new Uint32Array(dict[i].length * vb);
      const sums = new Float64Array(dict[i].length * vb);
      for (let t = 0; t < N; t++) {
        if (ca[t] < 0 || cb[t] < 0) continue;
        const k = ca[t] * vb + cb[t];
        counts[k]++;
        sums[k] += rs[t];
      }
      const keep = new Map<number, Trade[]>();
      counts.forEach((c, k) => {
        if (c < need) return;
        const va = dict[i][Math.floor(k / vb)];
        const vbv = dict[j][k % vb];
        const sa = single(a, va);
        const sb = single(b, vbv);
        if (c === sa.n || c === sb.n) return; // birleşim alanlardan biriyle aynı işlemler
        tested++;
        // Fark eşiğinin altındaki birleşimler hiçbir yerde gösterilmez: tam istatistik hesaplanmaz
        const exp = Math.round((sums[k] / c) * 1000) / 1000;
        const lift = exp >= 0 ? exp - Math.max(sa.exp, sb.exp) : exp - Math.min(sa.exp, sb.exp);
        if (Math.abs(lift) + 1e-9 < minLift) return;
        keep.set(k, []);
      });
      if (!keep.size) continue;
      for (let t = 0; t < N; t++) {
        if (ca[t] < 0 || cb[t] < 0) continue;
        const list = keep.get(ca[t] * vb + cb[t]);
        if (list) list.push(trades[t]);
      }
      keep.forEach((list, k) => {
        const va = dict[i][Math.floor(k / vb)];
        const vbv = dict[j][k % vb];
        const sa = single(a, va);
        const sb = single(b, vbv);
        const edge = edgeOf(list);
        const lift = edge.expectancy >= 0 ? edge.expectancy - Math.max(sa.exp, sb.exp) : edge.expectancy - Math.min(sa.exp, sb.exp);
        out.push({ dims: [a, b], values: [va, vbv], title: `${labelOf(a)}: ${va} + ${labelOf(b)}: ${vbv}`, edge, lift });
      });
    }
  }
  return Object.assign(out, { tested });
}

/**
 * Edge raporu (dışa aktarım): her girdinin her değeri tek satır — işlem, WR, net R, beklenti ve %95 aralığı, PF, hüküm.
 * Ekrandaki Edge Özeti ile aynı ölçü (güven aralığı + örneklem eşiği). Boyut içinde beklentiye göre sıralı.
 */
export function edgeReportRows(trades: Trade[], minSample = SETUP_MIN_SAMPLE): Record<string, string | number>[] {
  const valid = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr));
  indexTradeOrder(valid);
  const rows: Record<string, string | number>[] = [];
  const push = (dim: string, value: string, list: Trade[], kind = 'Giriş') => {
    const e = edgeOf(list);
    const v = verdictFor(e, minSample);
    rows.push({
      Tür: kind,
      Girdi: dim,
      Değer: value,
      'İşlem': e.n,
      'Kazanma Oranı (%)': round(e.winRate, 1),
      'Net R': round(e.netR),
      'Beklenti (R/İşlem)': round(e.expectancy, 3),
      'Beklenti Alt %95': e.n > 1 ? round(e.expLo, 3) : '-',
      'Beklenti Üst %95': e.n > 1 ? round(e.expHi, 3) : '-',
      'Kâr Faktörü': round(e.profitFactor),
      'Hüküm': VERDICT_TEXT[v] + (v !== 'LOW_SAMPLE' && signalStrength(e) === 'EARLY' ? ' (Erken Sinyal)' : ''),
    });
  };
  const val = valueTable(valid, SETUP_DIMENSIONS.map((d) => d.id));
  for (const d of SETUP_DIMENSIONS) {
    const groups = new Map<string, Trade[]>();
    for (const t of valid) {
      const v = val(t, d.id);
      if (v === UNSPECIFIED) continue;
      (groups.get(v) || groups.set(v, []).get(v)!).push(t);
    }
    // Sıralama için beklenti bir kez hesaplanır (karşılaştırıcıda her seferinde yeniden hesaplanıyordu)
    [...groups.entries()]
      .map(([value, list]) => ({ value, list, exp: edgeOf(list).expectancy }))
      .sort((a, b) => b.exp - a.exp)
      .forEach(({ value, list }) => push(d.label, value, list, MANAGEMENT_DIMENSIONS.includes(d.id) ? 'Yönetim' : d.id === 'accountStage' ? 'Bağlam' : 'Giriş'));
  }
  const byRisk = new Map<number, Trade[]>();
  for (const t of valid) {
    if (typeof t.riskPct !== 'number' || !(t.riskPct > 0)) continue;
    const k = Math.round(t.riskPct * 1000) / 1000;
    (byRisk.get(k) || byRisk.set(k, []).get(k)!).push(t);
  }
  [...byRisk.entries()].sort((a, b) => a[0] - b[0]).forEach(([k, list]) => push('Risk %', `%${k}`, list, 'Risk'));
  // Yönetimle kaçırılan R (çıkıştan sonra TP'ye giden işlemler)
  const miss = managementMissedR(valid);
  if (miss.n) {
    rows.push({ Tür: 'Yönetim', Girdi: 'İşlem Yönetimi', Değer: "Kaçırılan R (Çıkış Sonrası TP'ye Giden)", 'İşlem': miss.n, 'Net R': -round(miss.missedR), 'Hüküm': miss.measured < miss.n ? `${miss.n - miss.measured} işlemde TP/Stop Pip yok` : '-' });
  }
  // Kurallarım ve hedefe ulaşma süresi (ekrandaki Edge Özeti ile aynı)
  const summary = computeEdgeSummary(valid, minSample);
  summary.rules.forEach((r) => {
    push(r.kind === 'TAKE' ? 'Kural · AL' : 'Kural · ALMA', r.title, valid.filter(r.match), 'Kural');
    if (r.halves && r.halves.status !== 'THIN') rows[rows.length - 1]['Hüküm'] = `${rows[rows.length - 1]['Hüküm']} · ${r.halves.status === 'CONSISTENT' ? 'iki yarıda tutarlı' : 'şans olabilir'}`;
    if (r.recentViolations?.n) rows[rows.length - 1]['Hüküm'] = `${rows[rows.length - 1]['Hüküm']} · son 7 gün ${r.recentViolations.n} ihlal (${round(r.recentViolations.r)}R)`;
  });
  [summary.timeToTarget.overall, ...summary.timeToTarget.setups].forEach((r) => {
    if (!r) return;
    rows.push({
      Tür: 'Süre',
      Girdi: 'Hedefe Ulaşma Süresi',
      Değer: r.title,
      'İşlem': r.winners,
      'Hüküm': `Kazanan medyan ${formatDuration(r.medianMs)} · %90 ${formatDuration(r.p90Ms)}${r.loserMedianMs !== null ? ` · kaybeden medyan ${formatDuration(r.loserMedianMs)}` : ''}`,
    });
  });
  // Zamanla değişim: son 20 işlem ↔ öncesi
  const drift = computeEdgeDrift(valid);
  if (drift.ready) {
    const dirText = drift.direction === 'STABLE' ? 'Stabil' : `${drift.direction === 'WEAKENING' ? 'Zayıflıyor' : 'Güçleniyor'}${drift.strength === 'EARLY' ? ' (Erken Sinyal)' : ''}`;
    push('Zamanla Değişim', `Son ${DRIFT_RECENT} İşlem`, [...valid].sort((a, b) => a.createdAt - b.createdAt).slice(-DRIFT_RECENT), 'Zaman');
    rows[rows.length - 1]['Hüküm'] = dirText;
    push('Zamanla Değişim', 'Önceki İşlemler', [...valid].sort((a, b) => a.createdAt - b.createdAt).slice(0, -DRIFT_RECENT), 'Zaman');
  }
  // İkili birleşimler: alanların tek başına sonucundan belirgin farklı olanlar
  // İyi ve kötü kombinasyonlar ayrı bölümler: önce en iyiler (beklentiye göre), sonra en kötüler (en çok R kaybettiren önce)
  const pairs = scanPairs(valid, minSample, val, PAIR_MIN_LIFT).filter((p) => Math.abs(p.lift) >= PAIR_MIN_LIFT);
  const pushPair = (p: PairSlice, label: string) => {
    const [a, b] = p.dims;
    const [va, vb] = p.values;
    push(label, p.title, valid.filter((t) => val(t, a) === va && val(t, b) === vb), 'Kombinasyon');
  };
  pairs.filter((p) => p.lift > 0).sort((a, b) => b.edge.expectancy - a.edge.expectancy).forEach((p) => pushPair(p, 'Kombinasyon · En İyi'));
  pairs.filter((p) => p.lift < 0).sort((a, b) => a.edge.netR - b.edge.netR).forEach((p) => pushPair(p, 'Kombinasyon · En Kötü'));
  // Tesadüf testi: ilk yarıda bulunan bulgular, ikinci yarıdaki sonuçlarıyla
  const oos = validateOutOfSample(valid, minSample);
  const OOS_TEXT: Record<OosStatus, string> = { HELD: 'Tuttu', FAILED: 'Tutmadı', UNTESTED: 'Az Veri' };
  const testHalf = [...valid].sort((a, b) => a.createdAt - b.createdAt).slice(Math.floor(valid.length / 2));
  oos.findings.forEach((f) => {
    push(`Tesadüf Testi · ${f.kind === 'TAKE' ? 'AL' : 'ALMA'}`, f.title, testHalf.filter(f.match), 'Tesadüf Testi');
    rows[rows.length - 1]['Hüküm'] = `${OOS_TEXT[f.status]} (ilk yarı ${round(f.discovery.expectancy, 3)}R/işlem, ${f.discovery.n} işlem → ikinci yarı)`;
  });
  // Kurulumlar (varsayılan boyutların birleşimi)
  buildSetupScorecard(valid, DEFAULT_SETUP_DIMENSIONS, { minSample }).rows.forEach((r) => {
    const list = valid.filter((t) => DEFAULT_SETUP_DIMENSIONS.map((d) => val(t, d)).join(' | ') === r.key);
    push('Kurulum (Asia Range · Session · Entry Model)', r.labels.join(' · '), list, 'Kurulum');
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Tesadüf testi (out-of-sample)                                       */
/* ------------------------------------------------------------------ */

export const OOS_MIN_TOTAL = 40;
export type OosStatus = 'HELD' | 'FAILED' | 'UNTESTED';
export interface OosFinding {
  title: string;
  kind: 'TAKE' | 'AVOID';
  source: 'Kurulum' | 'Alan' | 'Kombinasyon';
  /** İlk yarıda (keşif) */
  discovery: EdgeStats;
  /** İkinci yarıda (sınama): keşifte hiç kullanılmamış işlemler */
  test: EdgeStats;
  status: OosStatus;
  match: (t: Trade) => boolean;
}
export interface OosResult {
  ready: boolean;
  need: number;
  /** İkinci yarının ilk işleminin zamanı */
  splitAt: number | null;
  findings: OosFinding[];
  held: number;
  failed: number;
  untested: number;
}

/**
 * Tesadüf testi: bulgular işlemlerin yalnızca ilk yarısında aranır (Edge Özeti'yle aynı tarama), sonra hiç görülmemiş
 * ikinci yarıda sınanır. Çok sayıda alan / birleşim tarandığında bazı "parlak" sonuçlar şans eseri çıkar; ikinci yarıda
 * aynı yönde tutan bulgu gerçek olma olasılığı yüksek olandır. Tutma oranı, taramanın genel güvenilirliğini gösterir.
 */
export function validateOutOfSample(trades: Trade[], minSample = SETUP_MIN_SAMPLE): OosResult {
  const sorted = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr)).sort((a, b) => a.createdAt - b.createdAt);
  const base: OosResult = { ready: false, need: OOS_MIN_TOTAL, splitAt: null, findings: [], held: 0, failed: 0, untested: 0 };
  if (sorted.length < OOS_MIN_TOTAL) return base;
  indexTradeOrder(sorted);
  const mid = Math.floor(sorted.length / 2);
  const discovery = sorted.slice(0, mid);
  const testSet = sorted.slice(mid);
  const s = computeEdgeSummary(discovery, minSample);
  indexTradeOrder(sorted); // keşif kendi listesini indekslemiş olabilir (uygulamada global sıra varken etkisiz)

  const cands: Array<Omit<OosFinding, 'test' | 'status'>> = [];
  const setupMatch = (labels: string[]) => (t: Trade) => DEFAULT_SETUP_DIMENSIONS.every((d, i) => dimensionValue(t, d) === labels[i]);
  s.bestSetups.forEach((r) => cands.push({ title: r.labels.join(' · '), kind: 'TAKE', source: 'Kurulum', discovery: r.edge, match: setupMatch(r.labels) }));
  s.worstSetups.forEach((r) => cands.push({ title: r.labels.join(' · '), kind: 'AVOID', source: 'Kurulum', discovery: r.edge, match: setupMatch(r.labels) }));
  const sliceMatch = (x: DimensionSlice) => (t: Trade) => dimensionValue(t, x.dimension) === x.value;
  s.strengths.forEach((x) => cands.push({ title: `${x.dimensionLabel}: ${x.value}`, kind: 'TAKE', source: 'Alan', discovery: x.edge, match: sliceMatch(x) }));
  s.leaks.forEach((x) => cands.push({ title: `${x.dimensionLabel}: ${x.value}`, kind: 'AVOID', source: 'Alan', discovery: x.edge, match: sliceMatch(x) }));
  const pairMatch = (p: PairSlice) => (t: Trade) => dimensionValue(t, p.dims[0]) === p.values[0] && dimensionValue(t, p.dims[1]) === p.values[1];
  s.bestPairs.forEach((p) => cands.push({ title: p.title, kind: 'TAKE', source: 'Kombinasyon', discovery: p.edge, match: pairMatch(p) }));
  s.worstPairs.forEach((p) => cands.push({ title: p.title, kind: 'AVOID', source: 'Kombinasyon', discovery: p.edge, match: pairMatch(p) }));

  const findings: OosFinding[] = cands.map((c) => {
    const test = edgeOf(testSet.filter(c.match));
    const sign = c.kind === 'TAKE' ? 1 : -1;
    const status: OosStatus = test.n < HALF_MIN ? 'UNTESTED' : Math.sign(test.expectancy) === sign ? 'HELD' : 'FAILED';
    return { ...c, test, status };
  });
  const order: Record<OosStatus, number> = { FAILED: 0, HELD: 1, UNTESTED: 2 };
  findings.sort((a, b) => order[a.status] - order[b.status] || b.test.n - a.test.n);
  return {
    ready: true,
    need: OOS_MIN_TOTAL,
    splitAt: testSet[0]?.createdAt ?? null,
    findings,
    held: findings.filter((f) => f.status === 'HELD').length,
    failed: findings.filter((f) => f.status === 'FAILED').length,
    untested: findings.filter((f) => f.status === 'UNTESTED').length,
  };
}
