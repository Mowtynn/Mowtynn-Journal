import { Trade, TradeStats } from '../types';
import { calculateProfitFactor, toRR } from './statMath';
import { MIN_SAMPLE } from './sampleSize';

/**
 * Tüm istatistikler R cinsindendir. Kazanma oranı = kazanç / tüm işlemler (BE dahil).
 * En verimli / verimsiz parite yalnızca en az `minPairTrades` işlemli pariteler arasından seçilir
 * (1 işlemlik +3R bir pariteyi "en verimli" ilan etmesin).
 */
export const calculateComprehensiveStats = (list: Trade[], now: number = Date.now(), minPairTrades: number = MIN_SAMPLE): TradeStats => {
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
    if ((assetCount[asset] || 0) < minPairTrades) return;
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

/**
 * Başabaş kazanma oranı (%): ortalama kazanç / kayıpla beklentinin sıfır olduğu kazanma oranı, BE işlemleri de
 * paydada olduğu için tüm işlemlere ölçeklenir: Ort. Kayıp ÷ (Ort. Kazanç + Ort. Kayıp) × (kazanç + kayıp) ÷ tüm işlemler.
 * Ortalamalar durumla (WIN / LOSS) hesaplanır; Ana Panel ve PDF raporu aynı fonksiyonu kullanır. Kazanç ya da kayıp yoksa null.
 */
export function breakevenWinRate(wins: number, losses: number, total: number, avgWinR: number, avgLossR: number): number | null {
  if (!(wins > 0 && losses > 0 && total > 0) || !(avgWinR + avgLossR > 0)) return null;
  return (avgLossR / (avgWinR + avgLossR)) * ((wins + losses) / total) * 100;
}

/** İşlem listesinden başabaş kazanma oranı (durum bazlı ortalamalarla) */
export function breakevenWinRateOf(list: Trade[]): number | null {
  let w = 0;
  let l = 0;
  let wR = 0;
  let lR = 0;
  for (const t of list) {
    const r = typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0;
    if (t.status === 'WIN') {
      w++;
      wR += r;
    } else if (t.status === 'LOSS') {
      l++;
      lR += Math.abs(r);
    }
  }
  return breakevenWinRate(w, l, list.length, w ? wR / w : 0, l ? lR / l : 0);
}
