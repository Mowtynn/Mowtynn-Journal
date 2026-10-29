import { Trade } from '../types';
import { edgeFromR, EdgeStats } from './asiaAnalytics';
import { nyDateKey } from './tradingTime';

/**
 * Disiplin / kural ihlali takibi.
 * Her kural, işlemleri "ihlal etti / etmedi" diye ayırır; ihlal eden işlemlerin R sonucu ve
 * "bu kuralı hiç çiğnemeseydin" senaryosu hesaplanır. Saf fonksiyonlar, testli.
 */

export type DisciplineRuleId = 'LOW_QUALITY' | 'NEWS_DAY' | 'OVER_RISK' | 'OVERTRADING' | 'AFTER_DAILY_STOP';

/** Sabit kurallar (ayar yok): günde en fazla 2 işlem; gün içi −2R'ye inince o gün durulur */
export interface DisciplineOptions {
  maxTradesPerDay?: number;
  dailyStopR?: number;
}

export const DEFAULT_DISCIPLINE: Required<DisciplineOptions> = {
  maxTradesPerDay: 2,
  dailyStopR: -2,
};

/**
 * Düşük kalite setup — projenin TEK tanımı (Disiplin paneli, işlem detayı ve Strateji laboratuvarı aynı ölçüyü kullanır):
 * B-C / B / C / FOMO ya da "ihlal", "disiplinsiz", "intikam", "düşük" içeren kalite etiketleri.
 */
export function isLowQualitySetup(planFidelity?: string | null): boolean {
  const pf = (planFidelity || '').trim().toLocaleLowerCase('tr');
  if (!pf) return false;
  return pf === 'b-c' || pf === 'b' || pf === 'c' || pf === 'fomo' || pf.includes('ihlal') || pf.includes('disiplinsiz') || pf.includes('intikam') || pf.includes('düşük');
}

/** Setup kalitesi kademesi — renkler ve rozetler için TEK kaynak (düşük kademe = isLowQualitySetup) */
export type SetupQualityTier = 'high' | 'mid' | 'low';
export function setupQualityTier(planFidelity?: string | null): SetupQualityTier | null {
  const pf = (planFidelity || '').trim().toLocaleLowerCase('tr');
  if (!pf) return null;
  if (isLowQualitySetup(pf)) return 'low';
  if (pf === 'a+' || pf === 'tam' || ['uygun', 'sadık', 'kusursuz', 'disiplinli', 'disciplined', 'yüksek', 'high', 'ideal'].some((w) => pf.includes(w))) return 'high';
  if (pf === 'a' || pf === 'kısmen' || ['kısmi', 'partial', 'orta', 'medium'].some((w) => pf.includes(w))) return 'mid';
  return null;
}

export const RULE_META: Record<DisciplineRuleId, { title: string; hint: (o: Required<DisciplineOptions>) => string }> = {
  LOW_QUALITY: { title: 'Düşük kalite setup', hint: () => 'Setup kalitesi B-C / FOMO (plan dışı) olan işlemler' },
  NEWS_DAY: { title: 'Haber günü işlemi', hint: () => 'News day / bank holiday olarak işaretlenen günlerdeki işlemler' },
  OVER_RISK: { title: 'Normalden yüksek risk', hint: () => 'Risk %\'si senin en sık kullandığın riskin üstünde olan işlemler' },
  OVERTRADING: { title: 'Günlük işlem sınırı', hint: (o) => `NY günü içinde ${o.maxTradesPerDay}. işlemden sonra açılanlar` },
  AFTER_DAILY_STOP: { title: 'Günlük stop sonrası', hint: (o) => `Gün içi toplam ${o.dailyStopR}R'ye inince açılmaya devam eden işlemler` },
};

export interface RuleResult {
  id: DisciplineRuleId;
  title: string;
  hint: string;
  /** Kural ölçülebiliyor mu (ör. hiç risk % girilmemişse OVER_RISK ölçülemez) */
  measurable: boolean;
  violations: number;
  violationEdge: EdgeStats;
  /** İhlal eden işlemlerin toplam R'si (negatifse: bu kuralın maliyeti) */
  costR: number;
  /** Bu kural hiç çiğnenmeseydi net R ve beklenti */
  withoutNetR: number;
  withoutExpectancy: number;
  tradeIds: string[];
}

export interface DisciplineReport {
  total: number;
  rules: RuleResult[];
  /** Hiçbir kuralı çiğnemeyen işlemlerin oranı (%) */
  cleanRate: number;
  cleanEdge: EdgeStats;
  violatingEdge: EdgeStats;
  actualNetR: number;
  /** Tüm ölçülebilir kurallara uyulsaydı net R */
  allRulesNetR: number;
  options: Required<DisciplineOptions>;
  /** En sık kullanılan risk % (OVER_RISK eşiği) */
  typicalRiskPct: number | null;
}

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);

function mode(values: number[]): number | null {
  if (!values.length) return null;
  const c = new Map<number, number>();
  values.forEach((v) => c.set(v, (c.get(v) || 0) + 1));
  let best: number | null = null;
  let bestN = -1;
  c.forEach((n, v) => {
    if (n > bestN || (n === bestN && best !== null && v < best)) {
      best = v;
      bestN = n;
    }
  });
  return best;
}

export function analyzeDiscipline(trades: Trade[], opts: DisciplineOptions = {}): DisciplineReport {
  const o: Required<DisciplineOptions> = { ...DEFAULT_DISCIPLINE, ...opts };
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  const riskVals = sorted.map((t) => t.riskPct).filter((x): x is number => typeof x === 'number' && x > 0).map((x) => Math.round(x * 1000) / 1000);
  const typicalRiskPct = mode(riskVals);

  const flags = new Map<DisciplineRuleId, Set<string>>();
  (Object.keys(RULE_META) as DisciplineRuleId[]).forEach((id) => flags.set(id, new Set()));

  // Gün bazlı akış (NY günü): günlük işlem sınırı, günlük stop
  let day = '';
  let dayCount = 0;
  let dayR = 0;
  for (const t of sorted) {
    const k = nyDateKey(t.createdAt); // işlem günü New York takvimine göre
    if (k !== day) {
      day = k;
      dayCount = 0;
      dayR = 0;
    }
    dayCount++;
    if (dayCount > o.maxTradesPerDay) flags.get('OVERTRADING')!.add(t.id);
    if (dayR <= o.dailyStopR) flags.get('AFTER_DAILY_STOP')!.add(t.id);

    if (isLowQualitySetup(t.planFidelity)) flags.get('LOW_QUALITY')!.add(t.id);
    if (t.newsDay === true) flags.get('NEWS_DAY')!.add(t.id);
    if (typicalRiskPct !== null && typeof t.riskPct === 'number' && Math.round(t.riskPct * 1000) / 1000 > typicalRiskPct) flags.get('OVER_RISK')!.add(t.id);

    dayR += rOf(t);
  }

  const measurable: Record<DisciplineRuleId, boolean> = {
    LOW_QUALITY: sorted.some((t) => !!t.planFidelity),
    NEWS_DAY: sorted.some((t) => typeof t.newsDay === 'boolean'),
    OVER_RISK: typicalRiskPct !== null,
    OVERTRADING: sorted.length > 1,
    AFTER_DAILY_STOP: sorted.length > 1,
  };

  const actualNetR = sorted.reduce((s, t) => s + rOf(t), 0);
  const rules: RuleResult[] = (Object.keys(RULE_META) as DisciplineRuleId[]).map((id) => {
    const ids = flags.get(id)!;
    const viol = sorted.filter((t) => ids.has(t.id));
    const rest = sorted.filter((t) => !ids.has(t.id));
    const restNet = rest.reduce((s, t) => s + rOf(t), 0);
    return {
      id,
      title: RULE_META[id].title,
      hint: RULE_META[id].hint(o),
      measurable: measurable[id],
      violations: viol.length,
      violationEdge: edgeFromR(viol.map(rOf), viol.map((t) => t.status)),
      costR: viol.reduce((s, t) => s + rOf(t), 0),
      withoutNetR: restNet,
      withoutExpectancy: rest.length ? restNet / rest.length : 0,
      tradeIds: viol.map((t) => t.id),
    };
  });

  const anyViol = new Set<string>();
  rules.filter((r) => r.measurable).forEach((r) => r.tradeIds.forEach((id) => anyViol.add(id)));
  const clean = sorted.filter((t) => !anyViol.has(t.id));
  const dirty = sorted.filter((t) => anyViol.has(t.id));

  // En pahalı kural önce (en negatif maliyet), sonra ihlal sayısı
  rules.sort((a, b) => Number(b.measurable) - Number(a.measurable) || a.costR - b.costR || b.violations - a.violations);

  return {
    total: sorted.length,
    rules,
    cleanRate: sorted.length ? (clean.length / sorted.length) * 100 : 0,
    cleanEdge: edgeFromR(clean.map(rOf), clean.map((t) => t.status)),
    violatingEdge: edgeFromR(dirty.map(rOf), dirty.map((t) => t.status)),
    actualNetR,
    allRulesNetR: clean.reduce((s, t) => s + rOf(t), 0),
    options: o,
    typicalRiskPct,
  };
}
