import { Trade, TradeStats } from '../types';
import { calculateProfitFactor, toRR } from './statMath';

/** Tüm istatistikler R cinsindendir. Kazanma oranı = kazanç / tüm işlemler (BE dahil). */
export const calculateComprehensiveStats = (list: Trade[], now: number = Date.now()): TradeStats => {
  const totalTrades = list.length;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let netR = 0;
  let grossWinRR = 0;
  let grossLossRR = 0;
  let largestWinRR = 0;
  let largestLossRR = 0;
  const assetRrMap: { [key: string]: number } = {};
  const assetCount: { [key: string]: number } = {};
  let weeklyCount = 0, weeklyWins = 0, monthlyCount = 0, monthlyWins = 0;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  let weeklyR = 0;
  let monthlyR = 0;

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.status === "WIN") winningTrades++;
    else if (t.status === "LOSS") losingTrades++;
    else if (t.status === "BREAKEVEN") breakevenTrades++;

    const rrVal = t.rr || 0;
    assetRrMap[t.asset] = (assetRrMap[t.asset] || 0) + rrVal;
    assetCount[t.asset] = (assetCount[t.asset] || 0) + 1;
    if (t.createdAt >= weekAgo) { weeklyR += rrVal; weeklyCount++; if (t.status === "WIN") weeklyWins++; }
    if (t.createdAt >= monthAgo) { monthlyR += rrVal; monthlyCount++; if (t.status === "WIN") monthlyWins++; }
    netR += rrVal;
    if (rrVal > 0) {
      grossWinRR += rrVal;
      if (rrVal > largestWinRR) largestWinRR = rrVal;
    } else if (rrVal < 0) {
      const absLossRR = Math.abs(rrVal);
      grossLossRR += absLossRR;
      if (absLossRR > largestLossRR) largestLossRR = absLossRR;
    }
  }

  let bestAsset = "";
  let worstAsset = "";
  let maxValue = -Infinity;
  let minValue = Infinity;
  Object.entries(assetRrMap).forEach(([asset, val]) => {
    if (val > maxValue) {
      maxValue = val;
      bestAsset = val > 0 ? asset : "";
    }
    if (val < minValue) {
      minValue = val;
      worstAsset = val < 0 ? asset : "";
    }
  });

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
    bestAsset,
    worstAsset,
    netR,
    averageWinRR: toRR(winningTrades > 0 ? grossWinRR / winningTrades : 0),
    averageLossRR: toRR(losingTrades > 0 ? grossLossRR / losingTrades : 0),
    profitFactorRR: calculateProfitFactor(toRR(grossWinRR), toRR(grossLossRR)),
    largestWinRR,
    largestLossRR,
    // Beklenti = işlem başına ortalama R (BE işlemleri dahil)
    expectancyRR: totalTrades > 0 ? netR / totalTrades : 0,
    weeklyR,
    monthlyR,
    bestAssetR: bestAsset ? assetRrMap[bestAsset] : 0,
    bestAssetCount: bestAsset ? assetCount[bestAsset] : 0,
    worstAssetR: worstAsset ? assetRrMap[worstAsset] : 0,
    worstAssetCount: worstAsset ? assetCount[worstAsset] : 0,
    weeklyCount,
    weeklyWins,
    monthlyCount,
    monthlyWins,
    grossWinR: grossWinRR,
    grossLossR: grossLossRR,
  };
};
