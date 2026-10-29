import { nyNow, nyWallDate } from '../lib/tradingTime';
export function calculateSQN(rrValues: number[]): number {
  if (!rrValues || !Array.isArray(rrValues) || rrValues.length < 2) return 0;
  
  const validRRs = rrValues.filter(r => isFinite(r));
  const totalTrades = validRRs.length;
  
  // N-1 varyans hesabı için en az 2 işlem zorunludur
  if (totalTrades < 2) return 0;

  const sum = validRRs.reduce((acc, r) => acc + r, 0);
  const avg = sum / totalTrades;
  
  const variance = validRRs.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / (totalTrades - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0 || !isFinite(stdDev)) return 0;
  
  const sqnN = Math.min(totalTrades, 100);
  return (avg / stdDev) * Math.sqrt(sqnN);
}



/** Tarih nesnesinin kendi (duvar saati) alanlarından YYYY-MM-DD. Varsayılan: bugün, New York günü. */
export function localDateKey(input: number | Date = nyNow()): string {
  const d = input instanceof Date ? input : nyWallDate(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
