import { Trade } from '../types';
import { getTradeAccountCategory } from '../constants/constants';
import { edgeFromR, EdgeStats } from './asiaAnalytics';
import { dimensionValue, verdictFor, DEFAULT_SETUP_DIMENSIONS, SETUP_DIMENSIONS, SETUP_MIN_SAMPLE, UNSPECIFIED, type SetupVerdict } from './setupScorecard';

/**
 * İşlem detayı için içgörü: gerçekleşen R ve kurulumun geçmiş karnesi. Saf fonksiyon, testli.
 */

export interface PricePath {
  realizedR: number;
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
}

export function computePricePath(t: Trade): PricePath {
  const realizedR = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;
  return { realizedR };
}

/** Karşılaştırma havuzu: hesapsız (demo) işlem yalnızca hesapsızlarla, prop işlemi yalnızca prop işlemleriyle (Challenge + Funded) */
export function insightPool(trade: Trade, allTrades: Trade[]): Trade[] {
  const isDemo = getTradeAccountCategory(trade) === 'DEMO';
  return allTrades.filter((t) => (getTradeAccountCategory(t) === 'DEMO') === isDemo);
}

export function computeTradeInsight(trade: Trade, everyTrade: Trade[]): TradeInsight {
  const path = computePricePath(trade);
  const allTrades = insightPool(trade, everyTrade);

  // Kurulum: Asia Range · Trend · Entry Model (kurulum karnesiyle aynı tanım)
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

  return { path, setup };
}
