import { Trade } from '../types';
import { getTradeAccountCategory } from '../constants/constants';
import { edgeFromR, EdgeStats } from './asiaAnalytics';
import { dimensionValue, verdictFor, DEFAULT_SETUP_DIMENSIONS, SETUP_DIMENSIONS, SETUP_MIN_SAMPLE, UNSPECIFIED, type SetupVerdict } from './setupScorecard';
import { analyzeDiscipline, type DisciplineOptions, type DisciplineRuleId } from './discipline';

/**
 * İşlem detayı için içgörü: plan ↔ gerçekleşen, fiyat yolu (MAE/MFE stop'a göre),
 * kurulumun geçmiş karnesi ve bu işlemin çiğnediği kurallar. Saf fonksiyon, testli.
 */

export interface PricePath {
  /** Planlanan R:R = TP Pip / Stop Pip */
  plannedRR: number | null;
  realizedR: number;
  /** MAE stop'un yüzde kaçı (100 = stop'a değdi) */
  maePctOfStop: number | null;
  /** MAE R cinsinden (negatif yön, pozitif sayı) */
  maeR: number | null;
  /** MFE R cinsinden */
  mfeR: number | null;
  /** Masada bırakılan R: MFE − gerçekleşen (yalnızca pozitifse) */
  leftOnTableR: number | null;
  /** Gerçekleşenin MFE'ye oranı (%): hareketin ne kadarını aldın */
  captureRate: number | null;
}

export interface SetupHistory {
  labels: { dimension: string; value: string }[];
  /** Bu işlem HARİÇ aynı kurulumdaki işlemler */
  others: EdgeStats;
  verdict: SetupVerdict;
}

export interface TradeInsight {
  path: PricePath;
  setup: SetupHistory | null;
  violations: { id: DisciplineRuleId; title: string; hint: string }[];
  /** En az bir kural ölçülebildi mi (ihlal yoksa "kurallara uygun" denebilir) */
  rulesMeasured: boolean;
}

const pos = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const nonNeg = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function computePricePath(t: Trade): PricePath {
  const stop = pos(t.stopPips);
  const tp = pos(t.tpPips);
  const mae = nonNeg(t.maePips);
  const mfe = nonNeg(t.mfePips);
  const realizedR = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;
  const mfeR = stop && mfe !== null ? round(mfe / stop) : null;
  const left = mfeR !== null ? round(mfeR - realizedR) : null;
  return {
    plannedRR: stop && tp ? round(tp / stop) : null,
    realizedR,
    maePctOfStop: stop && mae !== null ? Math.round((mae / stop) * 100) : null,
    maeR: stop && mae !== null ? round(mae / stop) : null,
    mfeR,
    leftOnTableR: left !== null && left > 0 ? left : left !== null ? 0 : null,
    captureRate: mfeR && mfeR > 0 ? Math.round(Math.max(0, Math.min(1, realizedR / mfeR)) * 100) : null,
  };
}

/** Karşılaştırma havuzu: hesapsız (demo) işlem yalnızca hesapsızlarla, prop işlemi yalnızca prop işlemleriyle (Challenge + Funded) */
export function insightPool(trade: Trade, allTrades: Trade[]): Trade[] {
  const isDemo = getTradeAccountCategory(trade) === 'DEMO';
  return allTrades.filter((t) => (getTradeAccountCategory(t) === 'DEMO') === isDemo);
}

export function computeTradeInsight(trade: Trade, everyTrade: Trade[], disciplineOptions: DisciplineOptions = {}): TradeInsight {
  const path = computePricePath(trade);
  const allTrades = insightPool(trade, everyTrade);

  // Kurulum: Asia Range · Seans · Entry Model (kurulum karnesiyle aynı tanım)
  const values = DEFAULT_SETUP_DIMENSIONS.map((d) => dimensionValue(trade, d));
  let setup: SetupHistory | null = null;
  if (!values.every((v) => v === UNSPECIFIED)) {
    const others = allTrades.filter(
      (t) => t.id !== trade.id && typeof t.rr === 'number' && DEFAULT_SETUP_DIMENSIONS.every((d, i) => dimensionValue(t, d) === values[i]),
    );
    const edge = edgeFromR(others.map((t) => t.rr), others.map((t) => t.status));
    setup = {
      labels: DEFAULT_SETUP_DIMENSIONS.map((d, i) => ({ dimension: SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d, value: values[i] })),
      others: edge,
      verdict: verdictFor(edge, SETUP_MIN_SAMPLE),
    };
  }

  const list = allTrades.some((t) => t.id === trade.id) ? allTrades : [...allTrades, trade];
  const rep = analyzeDiscipline(list, disciplineOptions);
  const violations = rep.rules
    .filter((r) => r.measurable && r.tradeIds.includes(trade.id))
    .map((r) => ({ id: r.id, title: r.title, hint: r.hint }));

  return { path, setup, violations, rulesMeasured: rep.rules.some((r) => r.measurable) };
}
