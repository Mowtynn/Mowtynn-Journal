import type { Trade } from '../types';
import { calculateProfitFactor, calculateRecoveryFactor, toRR } from './statMath';
import { calculateSQN } from '../utils/math';
import { nyDateKey, nyWallDate } from './tradingTime';

/**
 * Detaylı Analiz ekranının sayıları (R tabanlı, saf fonksiyon, testli).
 * Yalnızca ekranda gösterilen değerler hesaplanır.
 */

export interface EquityPoint {
  timestamp: number;
  label: string;
  cumulativePnl: number;
  /** Zirveden uzaklık (≤ 0) */
  drawdown: number;
  trade: Trade;
}

export interface SideStats {
  count: number;
  wins: number;
  winRate: number;
  pnl: number;
}

export interface DeepMetrics {
  totalR: number;
  equityCurve: EquityPoint[];
  longStats: SideStats;
  shortStats: SideStats;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  avgWinRR: number;
  avgLossRR: number;
  /** İşlem başına ortalama R (BE dahil) */
  expectancy: number;
  sqn: number;
  statusAnalysis: { win: number; loss: number; breakeven: number; total: number };
  /** NY takvim günü bazında: günlük toplam R > 0 / < 0 */
  greenDays: number;
  redDays: number;
  totalDays: number;
  /** En büyük zirveden düşüş (R, pozitif sayı) */
  maxDrawdown: number;
  /** Net R ÷ Max DD */
  recoveryFactor: number;
  /** Brüt kazanç R ÷ brüt kayıp R */
  pureProfitFactor: number;
  /** Tamamlanmış düşüşlerde zirveye geri dönmek için geçen ortalama işlem sayısı; tamamlanmış düşüş yoksa null */
  avgRecoveryTrades: number | null;
  /** Tamamlanmış düşüş sayısı */
  recoveredDrawdowns: number;
  /** Son 10 işlem: brüt kazanç / kayıp ve işlem başına ortalama R */
  last10: { n: number; grossProfit: number; grossLoss: number; avgR: number };
}

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);

const side = (list: Trade[]): SideStats => {
  const wins = list.filter((t) => t.status === 'WIN').length;
  return { count: list.length, wins, winRate: list.length ? (wins / list.length) * 100 : 0, pnl: list.reduce((s, t) => s + rOf(t), 0) };
};

export function computeDeepMetrics(trades: Trade[]): DeepMetrics {
  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt);

  // Sermaye eğrisi, max DD ve toparlanma süresi tek geçişte
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let ddStartIdx: number | null = null;
  const recoveries: number[] = [];
  const equityCurve: EquityPoint[] = sorted.map((t, i) => {
    equity += rOf(t);
    if (equity < peak) {
      if (ddStartIdx === null) ddStartIdx = i;
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    } else {
      if (ddStartIdx !== null) {
        recoveries.push(i - ddStartIdx + 1); // düşüşe giren işlemden zirveyi geri alan işleme kadar
        ddStartIdx = null;
      }
      peak = equity;
    }
    return {
      timestamp: t.createdAt,
      label: nyWallDate(t.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      cumulativePnl: equity,
      drawdown: equity - peak,
      trade: t,
    };
  });

  const wins = sorted.filter((t) => t.status === 'WIN');
  const losses = sorted.filter((t) => t.status === 'LOSS');
  const bes = sorted.filter((t) => t.status === 'BREAKEVEN');
  const winR = wins.reduce((s, t) => s + rOf(t), 0);
  const lossR = Math.abs(losses.reduce((s, t) => s + rOf(t), 0));
  const totalR = equity;
  const rList = sorted.map(rOf);

  let grossPos = 0;
  let grossNeg = 0;
  rList.forEach((r) => (r > 0 ? (grossPos += r) : r < 0 ? (grossNeg += -r) : 0));

  let bestTrade: Trade | null = null;
  let worstTrade: Trade | null = null;
  sorted.forEach((t) => {
    if (!bestTrade || rOf(t) > rOf(bestTrade)) bestTrade = t;
    if (!worstTrade || rOf(t) < rOf(worstTrade)) worstTrade = t;
  });

  const daily = new Map<string, number>();
  sorted.forEach((t) => {
    const k = nyDateKey(t.createdAt);
    daily.set(k, (daily.get(k) || 0) + rOf(t));
  });
  let greenDays = 0;
  let redDays = 0;
  daily.forEach((v) => (v > 1e-9 ? greenDays++ : v < -1e-9 ? redDays++ : 0));

  const last = sorted.slice(-10).map(rOf);
  const last10 = {
    n: last.length,
    grossProfit: last.filter((r) => r > 0).reduce((s, r) => s + r, 0),
    grossLoss: Math.abs(last.filter((r) => r < 0).reduce((s, r) => s + r, 0)),
    avgR: last.length ? last.reduce((s, r) => s + r, 0) / last.length : 0,
  };

  return {
    totalR,
    equityCurve,
    longStats: side(sorted.filter((t) => t.type === 'LONG')),
    shortStats: side(sorted.filter((t) => t.type !== 'LONG')),
    bestTrade,
    worstTrade,
    avgWinRR: wins.length ? winR / wins.length : 0,
    avgLossRR: losses.length ? lossR / losses.length : 0,
    expectancy: sorted.length ? totalR / sorted.length : 0,
    sqn: calculateSQN(rList),
    statusAnalysis: { win: wins.length, loss: losses.length, breakeven: bes.length, total: sorted.length },
    greenDays,
    redDays,
    totalDays: daily.size,
    maxDrawdown,
    recoveryFactor: calculateRecoveryFactor(toRR(totalR), toRR(maxDrawdown)),
    pureProfitFactor: calculateProfitFactor(toRR(grossPos), toRR(grossNeg)),
    avgRecoveryTrades: recoveries.length ? recoveries.reduce((s, n) => s + n, 0) / recoveries.length : null,
    recoveredDrawdowns: recoveries.length,
    last10,
  };
}
