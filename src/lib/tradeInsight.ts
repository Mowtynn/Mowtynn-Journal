import { Trade } from '../types';
import { getTradeAccountKind } from '../constants/constants';
import { edgeFromR, EdgeStats } from './asiaAnalytics';
import { dimensionValue, verdictFor, DEFAULT_SETUP_DIMENSIONS, SETUP_DIMENSIONS, SETUP_MIN_SAMPLE, UNSPECIFIED, type SetupVerdict } from './setupScorecard';

/**
 * İşlem detayı için içgörü: gerçekleşen R ve kurulumun geçmiş karnesi. Saf fonksiyon, testli.
 */

interface PricePath {
  realizedR: number;
}

interface SetupHistory {
  labels: { dimension: string; value: string }[];
  /** Bu işlem HARİÇ aynı kurulumdaki işlemler */
  others: EdgeStats;
  verdict: SetupVerdict;
}

/** Aynı hesap türündeki diğer işlemlerin ortalama R'si (beklenti); en az EXPECTANCY_MIN_N işlem olunca */
export interface Expectancy {
  avgR: number;
  n: number;
}
export const EXPECTANCY_MIN_N = 3;

export interface TradeInsight {
  path: PricePath;
  setup: SetupHistory | null;
  /** Bu işlem HARİÇ, aynı hesap türündeki işlemlerin ortalama R'si; yeterli işlem yoksa null */
  expectancy: Expectancy | null;
}

/** Ortalama R beklentisi: bu işlem hariç, sonucu sayı olan işlemlerin R ortalaması */
export function computeExpectancy(trade: Trade, pool: Trade[]): Expectancy | null {
  let sum = 0;
  let n = 0;
  for (const t of pool) {
    if (t.id === trade.id || typeof t.rr !== 'number' || !Number.isFinite(t.rr)) continue;
    sum += t.rr;
    n++;
  }
  if (n < EXPECTANCY_MIN_N) return null;
  return { avgR: Math.round((sum / n) * 100) / 100, n };
}

export function computePricePath(t: Trade): PricePath {
  const realizedR = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;
  return { realizedR };
}

/** Karşılaştırma havuzu: hesapsız (demo) işlem yalnızca hesapsızlarla, prop işlemi yalnızca prop işlemleriyle */
function insightPool(trade: Trade, allTrades: Trade[]): Trade[] {
  const kind = getTradeAccountKind(trade);
  return allTrades.filter((t) => getTradeAccountKind(t) === kind);
}

export function computeTradeInsight(trade: Trade, everyTrade: Trade[]): TradeInsight {
  const path = computePricePath(trade);
  const allTrades = insightPool(trade, everyTrade);

  // Kurulum: Asia Range · İşlem Tipi (kurulum karnesiyle aynı tanım)
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

  return { path, setup, expectancy: computeExpectancy(trade, allTrades) };
}
