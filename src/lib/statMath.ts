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

/** Kayıp yokken PF 999 döner; ekranda ∞ gösterilir. */
export const formatPF = (pf: number, digits = 2): string => {
  if (!Number.isFinite(pf) || pf >= 999) return '∞';
  return pf.toFixed(digits);
};

// Recovery Factor (Toparlanma Faktörü)
export const calculateRecoveryFactor = (netRR: RMultiple, maxDrawdownRR: RMultiple): number => {
  if (!isFinite(netRR) || !isFinite(maxDrawdownRR)) return 0;
  const absDrawdown = Math.abs(maxDrawdownRR);
  if (absDrawdown === 0) return 0;
  return netRR / absDrawdown;
};
