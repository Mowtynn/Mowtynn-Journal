// RMultiple definition and Type Guard to strictly disallow PNL values in stats engine
export type RMultiple = number & { readonly __brand: 'RR' };

// Use this to cast valid RR metrics to the strictly checked type
export const toRR = (val: number | undefined | null): RMultiple => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return 0 as RMultiple;
  return val as RMultiple;
};

// 1. Profit Factor (Kârlılık Oranı)
export const calculateProfitFactor = (positiveRR: RMultiple, absoluteNegativeRR: RMultiple): number => {
  if (!isFinite(positiveRR) || !isFinite(absoluteNegativeRR)) return 0;
  const absLoss = Math.abs(absoluteNegativeRR);
  if (absLoss === 0) {
    return positiveRR > 0 ? 999 : 0; // Return 999 instead of Infinity
  }
  const result = Math.max(0, positiveRR) / absLoss;
  return isFinite(result) ? result : 0;
};

// 2. Beklenti (Mathematical Expectancy - EV)
export const calculateExpectancy = (winRateDecimal: number, lossRateDecimal: number, avgWinRR: RMultiple, avgLossRR: RMultiple): number => {
  if (!isFinite(winRateDecimal) || !isFinite(lossRateDecimal) || !isFinite(avgWinRR) || !isFinite(avgLossRR)) return 0;
  if (!winRateDecimal && !avgWinRR && !avgLossRR) return 0;
  return (winRateDecimal * avgWinRR) - (lossRateDecimal * Math.abs(avgLossRR)); // using abs for loss
};


// 3. Recovery Factor (Toparlanma Faktörü)
export const calculateRecoveryFactor = (netRR: RMultiple, maxDrawdownRR: RMultiple): number => {
  if (!isFinite(netRR) || !isFinite(maxDrawdownRR)) return 0;
  const absDrawdown = Math.abs(maxDrawdownRR);
  if (absDrawdown === 0) return 0;
  return netRR / absDrawdown;
};

// 4. Sortino Ratio
export const calculateSortinoRatio = (avgRR: RMultiple, negativeRRs: RMultiple[], totalTrades: number): number => {
  if (!isFinite(avgRR) || !negativeRRs || negativeRRs.length === 0) return avgRR > 0 ? 10 : 0;
  
  // Strict filter for true downside (strictly < 0) and finite
  const validLosses = negativeRRs.filter(r => isFinite(r) && r < 0);
  if (validLosses.length === 0 || !isFinite(totalTrades) || totalTrades <= 0) return avgRR > 0 ? 10 : 0;
  
  // Downside deviation uses target = 0
  const squaredDiffs = validLosses.reduce((sum, r) => sum + Math.pow(r, 2), 0);
  const downsideDev = Math.sqrt(squaredDiffs / totalTrades);
  
  if (downsideDev === 0 || !isFinite(downsideDev)) return avgRR > 0 ? 10 : 0;
  return avgRR / downsideDev;
};

// 5. Kelly Criterion (Genelleştirilmiş Doğru Model)
export const calculateKellyCriterion = (
  winRateDecimal: number,
  lossRateDecimal: number,
  avgWinRR: RMultiple,
  avgLossRR: RMultiple
): number => {
  if (!isFinite(winRateDecimal) || !isFinite(lossRateDecimal) || !isFinite(avgWinRR) || !isFinite(avgLossRR)) return 0;
  
  const absoluteAvgLoss = Math.abs(avgLossRR);
  const winRR = Math.max(0, avgWinRR);
  
  if (absoluteAvgLoss === 0 || winRR === 0 || !isFinite(winRateDecimal) || winRateDecimal <= 0) return 0;
  
  const totalDecisiveTrades = winRateDecimal + lossRateDecimal;
  if (totalDecisiveTrades <= 0) return 0;

  // Pay: Matematiksel Beklenti (EV)
  const edge = (winRateDecimal * winRR) - (lossRateDecimal * absoluteAvgLoss);
  if (edge <= 0) return 0;
  
  // Payda: avgWin * (W + L)
  const odds = winRR * totalDecisiveTrades;
  if (odds <= 0) return 0;
  
  const kelly = edge / odds;
  return Math.max(0, Math.min(100, kelly * 100)); // %0 - %100 aralığına sınırla
};

