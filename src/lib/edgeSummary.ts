import { Trade } from '../types';
import { edgeFromR, EdgeStats, indexTradeOrder, managementMissedR } from './asiaAnalytics';
import { computeEdgeDrift, DRIFT_RECENT } from './edgeDrift';
import { formatDuration } from './tradingTime';
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
 * Kurulum karnesi + tek boyutlu sızıntı/güç taraması + risk % ve News day etkisi.
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
  /** Yönetim edge'i: işlem yönetimi, çıkış sonrası TP, işlem süresi (en az minSample işlemli değerler) */
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
 * Yönetim / sonuç boyutları: işleme girdikten sonra belirlenir (süre, yönetim, çıkış sonrası TP).
 * Giriş kararlarıyla aynı listede "daha çok yap" önerisi üretmezler; ayrı bölümde gösterilir.
 */
export const MANAGEMENT_DIMENSIONS: SetupDimension[] = ['management', 'afterExitTp', 'holdTime'];

/** Sızıntı / güç taramasında bakılan tekil alanlar (yalnızca işleme girmeden önce bilinenler) */
const SCAN_DIMENSIONS: SetupDimension[] = [
  'asiaRange',
  'sweepHour',
  'sweepDelay',
  'planFidelity',
  'plannedRR',
  'stopToRange',
  'tradeOfDay',
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
  'type',
  'asset',
];

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
const edgeOf = (list: Trade[]) => edgeFromR(list.map(rOf), list.map((t) => t.status));
const labelOf = (d: SetupDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;

export function computeEdgeSummary(trades: Trade[], minSample = SETUP_MIN_SAMPLE): EdgeSummary {
  const valid = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr));
  const sorted = [...valid].sort((a, b) => a.createdAt - b.createdAt);
  indexTradeOrder(sorted);

  const card = buildSetupScorecard(sorted, DEFAULT_SETUP_DIMENSIONS, { minSample });
  const judged = card.rows.filter((r) => r.verdict !== 'LOW_SAMPLE');
  const bestSetups = judged.filter((r) => r.edge.expectancy > 0).slice(0, 3);
  const worstSetups = [...judged].reverse().filter((r) => r.edge.expectancy < 0).slice(0, 3);

  const scan = (dims: SetupDimension[]): DimensionSlice[] => {
  const slices: DimensionSlice[] = [];
  for (const d of dims) {
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
  const overlapOf = (x: DimensionSlice): DimensionSlice['overlap'] => {
    const list = sorted.filter((t) => dimensionValue(t, x.dimension) === x.value);
    let best: DimensionSlice['overlap'];
    for (const d of SCAN_DIMENSIONS) {
      if (d === x.dimension) continue;
      const counts = new Map<string, number>();
      for (const t of list) {
        const v = dimensionValue(t, d);
        if (v !== UNSPECIFIED) counts.set(v, (counts.get(v) || 0) + 1);
      }
      counts.forEach((c, v) => {
        const pct = c / list.length;
        const overall = sorted.filter((t) => dimensionValue(t, d) === v).length / sorted.length;
        if (pct >= 0.7 && pct - overall >= 0.2 && (!best || pct > best.pct)) best = { label: `${labelOf(d)}: ${v}`, pct };
      });
    }
    return best;
  };
  [...leaks, ...strengths].forEach((x) => (x.overlap = overlapOf(x)));

  const pairs = scanPairs(sorted, minSample);
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
    rules: buildRules(sorted, card.rows, slices, pairs),
    timeToTarget: computeTimeToTarget(sorted),
    bestPairs,
    worstPairs,
    missed: managementMissedR(sorted),
    testedSlices: slices.length + pairs.length,
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

function buildRules(sorted: Trade[], setupRows: SetupRow[], slices: DimensionSlice[], pairs: PairSlice[]): EdgeRule[] {
  const rules: EdgeRule[] = [];
  const add = (kind: EdgeRule['kind'], title: string, source: EdgeRule['source'], edge: EdgeStats, match: (t: Trade) => boolean) =>
    rules.push({ kind, title, source, edge, match });
  setupRows.forEach((r) => {
    const match = (t: Trade) => DEFAULT_SETUP_DIMENSIONS.every((d, i) => dimensionValue(t, d) === r.labels[i]);
    if (r.verdict === 'EDGE') add('TAKE', r.labels.join(' · '), 'Kurulum', r.edge, match);
    else if (r.verdict === 'LEAK') add('AVOID', r.labels.join(' · '), 'Kurulum', r.edge, match);
  });
  slices.forEach((x) => {
    if (signalStrength(x.edge) !== 'CONFIRMED') return;
    const match = (t: Trade) => dimensionValue(t, x.dimension) === x.value;
    add(x.edge.expectancy > 0 ? 'TAKE' : 'AVOID', `${x.dimensionLabel}: ${x.value}`, 'Alan', x.edge, match);
  });
  pairs.forEach((p) => {
    if (Math.abs(p.lift) < PAIR_MIN_LIFT || signalStrength(p.edge) !== 'CONFIRMED') return;
    const match = (t: Trade) => dimensionValue(t, p.dims[0]) === p.values[0] && dimensionValue(t, p.dims[1]) === p.values[1];
    add(p.edge.expectancy > 0 ? 'TAKE' : 'AVOID', p.title, 'Kombinasyon', p.edge, match);
  });
  // Alma kuralları: son 7 günde kurala uymayan işlemler
  const last = sorted.length ? sorted[sorted.length - 1].createdAt : 0;
  const recent = sorted.filter((t) => t.createdAt > last - 7 * DAY_MS);
  rules.forEach((r) => {
    if (r.kind !== 'AVOID') return;
    const hit = recent.filter(r.match);
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
export function scanPairs(trades: Trade[], minSample = SETUP_MIN_SAMPLE): PairSlice[] {
  const need = minSample * 2;
  const singles = new Map<string, { n: number; exp: number }>();
  const single = (d: SetupDimension, v: string) => {
    const k = `${d}=${v}`;
    let x = singles.get(k);
    if (!x) {
      const list = trades.filter((t) => dimensionValue(t, d) === v);
      const e = edgeOf(list);
      x = { n: e.n, exp: e.expectancy };
      singles.set(k, x);
    }
    return x;
  };
  const out: PairSlice[] = [];
  for (let i = 0; i < SCAN_DIMENSIONS.length; i++) {
    for (let j = i + 1; j < SCAN_DIMENSIONS.length; j++) {
      const a = SCAN_DIMENSIONS[i];
      const b = SCAN_DIMENSIONS[j];
      const groups = new Map<string, { va: string; vb: string; list: Trade[] }>();
      for (const t of trades) {
        const va = dimensionValue(t, a);
        const vb = dimensionValue(t, b);
        if (va === UNSPECIFIED || vb === UNSPECIFIED) continue;
        const k = `${va}\u0000${vb}`;
        const g = groups.get(k);
        if (g) g.list.push(t);
        else groups.set(k, { va, vb, list: [t] });
      }
      groups.forEach(({ va, vb, list }) => {
        if (list.length < need) return;
        const sa = single(a, va);
        const sb = single(b, vb);
        if (list.length === sa.n || list.length === sb.n) return; // birleşim alanlardan biriyle aynı işlemler
        const edge = edgeOf(list);
        const lift = edge.expectancy >= 0 ? edge.expectancy - Math.max(sa.exp, sb.exp) : edge.expectancy - Math.min(sa.exp, sb.exp);
        out.push({ dims: [a, b], values: [va, vb], title: `${labelOf(a)}: ${va} + ${labelOf(b)}: ${vb}`, edge, lift });
      });
    }
  }
  return out;
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
  for (const d of SETUP_DIMENSIONS) {
    const groups = new Map<string, Trade[]>();
    for (const t of valid) {
      const v = dimensionValue(t, d.id);
      if (v === UNSPECIFIED) continue;
      (groups.get(v) || groups.set(v, []).get(v)!).push(t);
    }
    [...groups.entries()]
      .sort((a, b) => edgeOf(b[1]).expectancy - edgeOf(a[1]).expectancy)
      .forEach(([value, list]) => push(d.label, value, list, MANAGEMENT_DIMENSIONS.includes(d.id) ? 'Yönetim' : d.id === 'accountStage' ? 'Bağlam' : 'Giriş'));
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
    rows.push({ Tür: 'Yönetim', Girdi: 'İşlem Yönetimi', Değer: "Kaçırılan R (Çıkış Sonrası TP'ye Giden)", 'İşlem': miss.n, 'Net R': -round(miss.missedR), 'Hüküm': miss.measured < miss.n ? `${miss.n - miss.measured} işlemde TP/Stop pip yok` : '-' });
  }
  // Kurallarım ve hedefe ulaşma süresi (ekrandaki Edge Özeti ile aynı)
  const summary = computeEdgeSummary(valid, minSample);
  summary.rules.forEach((r) => {
    push(r.kind === 'TAKE' ? 'Kural · AL' : 'Kural · ALMA', r.title, valid.filter(r.match), 'Kural');
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
  const pairs = scanPairs(valid, minSample).filter((p) => Math.abs(p.lift) >= PAIR_MIN_LIFT);
  const pushPair = (p: PairSlice, label: string) => {
    const [a, b] = p.dims;
    const [va, vb] = p.values;
    push(label, p.title, valid.filter((t) => dimensionValue(t, a) === va && dimensionValue(t, b) === vb), 'Kombinasyon');
  };
  pairs.filter((p) => p.lift > 0).sort((a, b) => b.edge.expectancy - a.edge.expectancy).forEach((p) => pushPair(p, 'Kombinasyon · En İyi'));
  pairs.filter((p) => p.lift < 0).sort((a, b) => a.edge.netR - b.edge.netR).forEach((p) => pushPair(p, 'Kombinasyon · En Kötü'));
  // Kurulumlar (varsayılan boyutların birleşimi)
  buildSetupScorecard(valid, DEFAULT_SETUP_DIMENSIONS, { minSample }).rows.forEach((r) => {
    const list = valid.filter((t) => DEFAULT_SETUP_DIMENSIONS.map((d) => dimensionValue(t, d)).join(' | ') === r.key);
    push('Kurulum (Asia Range · Session · Entry Model)', r.labels.join(' · '), list, 'Kurulum');
  });
  return rows;
}
