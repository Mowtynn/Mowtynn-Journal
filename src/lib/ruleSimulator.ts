import type { Trade } from '../types';
import { edgeFromR, indexTradeOrder, type EdgeStats } from './asiaAnalytics';
import { dimensionValue, UNSPECIFIED, type SetupDimension } from './setupScorecard';

/**
 * Kural simülatörü: "yalnızca şu koşullarla işlem alsaydım" sorusu. Koşullar birlikte (VE) uygulanır;
 * her koşul seçilen değerlerden herhangi biriyle eşleşir ("Yalnızca") ya da onları dışarıda bırakır ("Hariç").
 * Sonuç: kurala uyan işlemlerin edge'i, vazgeçilen işlemler, sermaye eğrisi ve iki yarıda tutarlılık. Saf fonksiyon.
 */

export interface RuleCondition {
  dim: SetupDimension;
  values: string[];
  /** true: seçilen değerler hariç; false: yalnızca seçilen değerler */
  exclude?: boolean;
}

/** Çoklu seçimli alanlar tek tek değerlere ayrılır (Entry Model: FVG seçilince FVG içeren her işlem) */
const MULTI: Partial<Record<SetupDimension, (t: Trade) => string[] | undefined>> = {
  entryModels: (t) => t.entryModels,
  confirmations: (t) => t.confirmations,
  tpTargets: (t) => t.tpTargets,
};

export function ruleValues(t: Trade, dim: SetupDimension): string[] {
  const get = MULTI[dim];
  if (get) {
    const list = (get(t) || []).map((x) => x.trim()).filter(Boolean);
    return list.length ? list : [UNSPECIFIED];
  }
  return [dimensionValue(t, dim)];
}

export function matchesRule(t: Trade, conds: RuleCondition[]): boolean {
  return conds.every((c) => {
    if (!c.values.length) return true;
    const hit = ruleValues(t, c.dim).some((v) => c.values.includes(v));
    return c.exclude ? !hit : hit;
  });
}

/** Bir alanın işlemlerde görülen değerleri (en sık önce) */
export function ruleOptions(trades: Trade[], dim: SetupDimension): string[] {
  const counts = new Map<string, number>();
  trades.forEach((t) => ruleValues(t, dim).forEach((v) => v !== UNSPECIFIED && counts.set(v, (counts.get(v) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr')).map(([v]) => v);
}

export interface RuleSimResult {
  total: number;
  all: EdgeStats;
  taken: EdgeStats;
  skipped: EdgeStats;
  /** Kronolojik kümülatif R: tüm işlemler ve yalnızca kurala uyanlar (en fazla 240 nokta) */
  curve: Array<{ all: number; rule: number }>;
  /** Kurala uyan işlemlerin ilk ve ikinci yarıdaki edge'i (zamana göre, tüm işlemlerin ortasından bölünür) */
  halves: { first: EdgeStats; second: EdgeStats; status: HalfStatus };
}

/** İki yarı testi: CONSISTENT = iki yarıda da aynı yönde; MIXED = yönler ayrışıyor (şans olabilir); THIN = yarılardan birinde < 5 işlem */
export type HalfStatus = 'CONSISTENT' | 'MIXED' | 'THIN';
export const HALF_MIN = 5;

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);
const edgeOf = (list: Trade[]) => edgeFromR(list.map(rOf), list.map((t) => t.status));

export function halfStatus(first: EdgeStats, second: EdgeStats, sign: number): HalfStatus {
  if (first.n < HALF_MIN || second.n < HALF_MIN) return 'THIN';
  return Math.sign(first.expectancy) === sign && Math.sign(second.expectancy) === sign ? 'CONSISTENT' : 'MIXED';
}

export function simulateRule(trades: Trade[], conds: RuleCondition[]): RuleSimResult {
  const sorted = trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr)).sort((a, b) => a.createdAt - b.createdAt);
  indexTradeOrder(sorted);
  const taken: Trade[] = [];
  const skipped: Trade[] = [];
  const firstHalf: Trade[] = [];
  const secondHalf: Trade[] = [];
  const mid = Math.floor(sorted.length / 2);
  const raw: Array<{ all: number; rule: number }> = [];
  let cumAll = 0;
  let cumRule = 0;
  sorted.forEach((t, i) => {
    const r = rOf(t);
    cumAll += r;
    if (matchesRule(t, conds)) {
      taken.push(t);
      (i < mid ? firstHalf : secondHalf).push(t);
      cumRule += r;
    } else skipped.push(t);
    raw.push({ all: cumAll, rule: cumRule });
  });
  const step = Math.max(1, Math.ceil(raw.length / 240));
  const curve = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
  const takenEdge = edgeOf(taken);
  const first = edgeOf(firstHalf);
  const second = edgeOf(secondHalf);
  return {
    total: sorted.length,
    all: edgeOf(sorted),
    taken: takenEdge,
    skipped: edgeOf(skipped),
    curve,
    halves: { first, second, status: halfStatus(first, second, Math.sign(takenEdge.expectancy) || 1) },
  };
}
