import { Trade } from '../types';
import { getTradeAccountKind } from '../constants/constants';

/**
 * İşlem detayı için içgörü: gerçekleşen R ve hesabın ortalama R beklentisi. Saf fonksiyon, testli.
 */

interface PricePath {
  realizedR: number;
}

/** Aynı hesap türündeki diğer işlemlerin ortalama R'si (beklenti); en az EXPECTANCY_MIN_N işlem olunca */
export interface Expectancy {
  avgR: number;
  n: number;
}
export const EXPECTANCY_MIN_N = 3;

export interface TradeInsight {
  path: PricePath;
  /** Bu işlem HARİÇ, aynı hesap türündeki işlemlerin ortalama R'si; yeterli işlem yoksa null */
  expectancy: Expectancy | null;
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

export function computeTradeInsight(trade: Trade, everyTrade: Trade[]): TradeInsight {
  return { path: computePricePath(trade), expectancy: computeExpectancy(trade, insightPool(trade, everyTrade)) };
}
