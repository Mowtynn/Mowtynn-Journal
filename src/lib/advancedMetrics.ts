import { Trade } from '../types';

import { calculateProfitFactor, toRR } from './statMath';

export const calculateAdvancedMetrics = (closedTrades: Trade[]) => {
  if (closedTrades.length === 0) return null;

  // Global variables we will accumulate (Calculated entirely on R-multiples!)
  let totalTrades = closedTrades.length;
  let totalWins = 0;
  let totalLosses = 0;
  let grossProfit = 0; // Cumulative Positive R
  let grossLoss = 0;   // Cumulative Absolute Negative R
  
  // Trades ordered by time
  const sorted = [...closedTrades].sort((a, b) => a.createdAt - b.createdAt);
  
  // Equity Curve Arrays (R-Based)
  let equity = 0;
  const equityCurve: number[] = [];
  let peak = 0;
  let inDrawdownTrades = 0;
  
  // Array of wins/losses for Series/Markov/Runs
  const seq: ('W' | 'L' | 'BE')[] = [];
  
  // Phase A (ATH) vs Phase B (DD)
  const phaseA = { count: 0, wins: 0, sumW: 0, sumL: 0 };
  const phaseB = { count: 0, wins: 0, sumW: 0, sumL: 0 };
  
  // Days and Weeks map (R-Based)
  const dailyMap: Record<string, number> = {};
  const weeklyMap: Record<string, { count: number, pnl: number }> = {}; // pnl holds R sum
  
  // Dead Zone Matrix (Asset + Session)
  const deadZone: Record<string, Record<string, { pnl: number, count: number, wins: number, rr: number }>> = {};
  
  // Weekly Bias Matrix
  const weeklyBias: Record<string, Record<string, { count: number, wins: number, pnl: number }>> = {}; // pnl holds R sum
  
  // --- LOOP THROUGH TRADES ---
  sorted.forEach((t) => {
    const isWin = t.status === 'WIN';
    if (isWin) totalWins++;
    else if (t.status === 'LOSS') totalLosses++;
    
    const valR = t.rr || 0;
    
    if (valR > 0) { 
      grossProfit += valR; 
      seq.push('W'); 
    } else if (valR < 0) { 
      grossLoss += Math.abs(valR); 
      seq.push('L'); 
    } else { 
      seq.push('BE'); // BE or 0R as BE for sequence logic
    }
    
    // Check Phase (ATH based on R-equity!)
    if (equity >= peak) {
      phaseA.count++;
      if (valR > 0) { phaseA.wins++; phaseA.sumW += valR; }
      else if (valR < 0) phaseA.sumL += Math.abs(valR);
    } else {
      phaseB.count++;
      inDrawdownTrades++;
      if (valR > 0) { phaseB.wins++; phaseB.sumW += valR; }
      else if (valR < 0) phaseB.sumL += Math.abs(valR);
    }
    
    // Update Equity (R-based)
    equity += valR;
    equityCurve.push(equity);
    if (equity > peak) peak = equity;
    
    // Dates
    const d = new Date(t.createdAt);
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + valR;
    
    // Week string (Year-week)
    const dayDate = new Date(d);
    dayDate.setUTCDate(dayDate.getUTCDate() + 4 - (dayDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(dayDate.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((dayDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekStr = `${dayDate.getUTCFullYear()}-W${weekNum}`;
    if (!weeklyMap[weekStr]) weeklyMap[weekStr] = { count: 0, pnl: 0 };
    weeklyMap[weekStr].count++;
    weeklyMap[weekStr].pnl += valR; // holds R
    
    // Dead Zone
    if (t.asset) {
      let sType = t.session || 'Belirtilmemiş';
      
      if (!deadZone[t.asset]) deadZone[t.asset] = {};
      if (!deadZone[t.asset][sType]) deadZone[t.asset][sType] = { pnl: 0, count: 0, wins: 0, rr: 0 };
      deadZone[t.asset][sType].pnl += (t.pnl || 0); // Stores actual financial Pnl
      deadZone[t.asset][sType].count++;
      if (t.status === 'WIN') deadZone[t.asset][sType].wins++;
      if (t.rr) deadZone[t.asset][sType].rr += t.rr;
    }
    
    // Weekly Bias (Day of week + direction)
    const daysEnToTr: Record<number, string> = { 1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt', 0: 'Paz' };
    const trDay = daysEnToTr[d.getUTCDay()];
    if (trDay && t.type) {
      if (!weeklyBias[trDay]) weeklyBias[trDay] = {};
      if (!weeklyBias[trDay][t.type]) weeklyBias[trDay][t.type] = { count: 0, wins: 0, pnl: 0 };
      weeklyBias[trDay][t.type].count++;
      weeklyBias[trDay][t.type].pnl += valR; // Stores sum of R now
      if (t.status === 'WIN') weeklyBias[trDay][t.type].wins++;
    }
  });

  // 1. Equity Curve R^2 (Büyüme Doğrusallığı - Tüm equity curve üzerinden)
  let rSquared = 0;
  const eqLen = equityCurve.length;
  if (eqLen > 1) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    for (let i = 0; i < eqLen; i++) {
      const x = i + 1;
      const y = equityCurve[i];
      sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; sumYY += y * y;
    }
    const numerator = (eqLen * sumXY - sumX * sumY);
    const denominator = Math.sqrt((eqLen * sumXX - sumX * sumX) * (eqLen * sumYY - sumY * sumY));
    const r = denominator !== 0 ? numerator / denominator : 0;
    rSquared = r > 0 ? r * r : 0;
  }

  // 2. Markov Zinciri (Koşullu Olasılık - Tilt Analizi)
  let ww = 0, wl = 0, lw = 0, ll = 0;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i-1] === 'W' && seq[i] === 'W') ww++;
    if (seq[i-1] === 'W' && seq[i] === 'L') wl++;
    if (seq[i-1] === 'L' && seq[i] === 'W') lw++;
    if (seq[i-1] === 'L' && seq[i] === 'L') ll++;
  }
  const probWafterW = (ww + wl) > 0 ? ww / (ww + wl) : 0;
  const probWafterL = (lw + ll) > 0 ? lw / (lw + ll) : 0;

  // 3. Haftalık İşlem Hacmi ve Verimlilik
  const weekBuckets: Record<string, { p: number, l: number, weeks: number, tradeSum: number, totalR: number }> = {
    '1-3 İşlem': { p: 0, l: 0, weeks: 0, tradeSum: 0, totalR: 0 },
    '4-7 İşlem': { p: 0, l: 0, weeks: 0, tradeSum: 0, totalR: 0 },
    '8+ İşlem': { p: 0, l: 0, weeks: 0, tradeSum: 0, totalR: 0 },
  };
  
  const weeklyDetailMap: Record<string, { c: number, p: number, l: number, totalR: number }> = {};
  sorted.forEach(t => {
    const d = new Date(t.createdAt);
    const dayDate = new Date(d);
    dayDate.setUTCDate(dayDate.getUTCDate() + 4 - (dayDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(dayDate.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((dayDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekStr = `${dayDate.getUTCFullYear()}-W${weekNum}`;
    if (!weeklyDetailMap[weekStr]) weeklyDetailMap[weekStr] = { c: 0, p: 0, l: 0, totalR: 0 };
    weeklyDetailMap[weekStr].c++;
    const valR = t.rr || 0;
    if (valR > 0) weeklyDetailMap[weekStr].p += valR;
    if (valR < 0) weeklyDetailMap[weekStr].l += Math.abs(valR);
    weeklyDetailMap[weekStr].totalR += valR;
  });
  
  Object.values(weeklyDetailMap).forEach(w => {
    let bucket = '1-3 İşlem';
    if (w.c >= 4 && w.c <= 7) bucket = '4-7 İşlem';
    else if (w.c >= 8) bucket = '8+ İşlem';
    
    weekBuckets[bucket].p += w.p;
    weekBuckets[bucket].l += w.l;
    weekBuckets[bucket].weeks++;
    weekBuckets[bucket].tradeSum += w.c;
    weekBuckets[bucket].totalR += w.totalR;
  });

  const optimalFreq = Object.entries(weekBuckets).map(([k, v]) => ({
    label: k,
    avgPF: calculateProfitFactor(toRR(v.p), toRR(v.l)),
    avgTrades: v.weeks > 0 ? v.tradeSum / v.weeks : 0,
    weeksCount: v.weeks,
    avgR: v.tradeSum > 0 ? v.totalR / v.tradeSum : 0
  }));

  // 4. Phase Perf
  const phaseAWR = phaseA.count > 0 ? phaseA.wins / phaseA.count : 0;
  const phaseBWR = phaseB.count > 0 ? phaseB.wins / phaseB.count : 0;
  
  // 5. Outlier Robustness (Calculated on R-multiples!)
  const allRrs = sorted.map(t => t.rr || 0);
  allRrs.sort((a,b) => b - a); // descending
  let robustRrs = allRrs;
  if (allRrs.length > 10) {
    robustRrs = allRrs.slice(2, allRrs.length - 2); // remove top 2 and bottom 2
  }
  const robustP = robustRrs.filter(x => x > 0).reduce((a,b) => a+b, 0);
  const robustL = Math.abs(robustRrs.filter(x => x < 0).reduce((a,b) => a+b, 0));
  const robustPF = calculateProfitFactor(toRR(robustP), toRR(robustL));
  const normalPF = calculateProfitFactor(toRR(grossProfit), toRR(grossLoss));

  // 6. Probability of Ruin (Risk-based account blowing math, robust on R!)
  
  const rArr = sorted.map(t => t.rr || 0);
  const avgRVal = totalTrades > 0 ? rArr.reduce((a, b) => a + b, 0) / totalTrades : 0;
  const rVariance = totalTrades > 1 
    ? rArr.reduce((a, b) => a + Math.pow(b - avgRVal, 2), 0) / (totalTrades - 1) 
    : 0;

  let probOfRuin = 0;
  const U = 10; // R units drawdown for account trouble
  if (avgRVal <= 0 && totalTrades > 0) {
    probOfRuin = 1;
  } else if (avgRVal > 0 && rVariance > 0) {
    probOfRuin = Math.min(1, Math.exp((-2 * avgRVal * U) / rVariance));
  }

  // 7. Session Bleed
  const hourStats: Record<number, { hour: number; count: number; pnl: number }> = {};
  sorted.forEach(t => {
    const d = new Date(t.createdAt);
    const hour = d.getUTCHours();
    if (!hourStats[hour]) hourStats[hour] = { hour, count: 0, pnl: 0 };
    hourStats[hour].count += 1;
    hourStats[hour].pnl += (t.rr || 0); // Accumulates R now
  });
  
  const sessionBleed = Object.values(hourStats)
    .filter(s => s.count > 0)
    .sort((a, b) => a.pnl - b.pnl); // Lists worst performing R sessions first

  // 8. System Quality Number (SQN) (Standard Van Tharp formula)
  const rStdDev = Math.sqrt(Math.max(0, rVariance));
  
  // N değerini maksimum 100 ile sınırlandırma
  const sqnN = Math.min(totalTrades, 100);
  const sqn = (totalTrades < 2 || rStdDev === 0) ? 0 : (avgRVal / rStdDev) * Math.sqrt(sqnN);

  // 9. Time Underwater (Calculated on R-equity recovery)
  let maxEqForTime = 0;
  let lastPeakTime = sorted.length > 0 ? sorted[0].createdAt : 0;
  let maxTimeUnderwaterMs = 0;
  let currentEq = 0;
  
  sorted.forEach(t => {
    currentEq += (t.rr || 0);
    if (currentEq > maxEqForTime) {
      const underWaterTime = t.createdAt - lastPeakTime;
      if (underWaterTime > maxTimeUnderwaterMs) {
        maxTimeUnderwaterMs = underWaterTime;
      }
      maxEqForTime = currentEq;
      lastPeakTime = t.createdAt;
    } else {
      const underWaterTime = t.createdAt - lastPeakTime;
      if (underWaterTime > maxTimeUnderwaterMs) {
         maxTimeUnderwaterMs = underWaterTime;
      }
    }
  });
  const maxTimeUnderwaterDays = maxTimeUnderwaterMs / (1000 * 60 * 60 * 24);

  return {
    sqn,
    maxTimeUnderwaterDays,
    sessionBleed,
    equityRSquared: rSquared,
    markov: { probWafterW, probWafterL },
    optimalFreq,
    phasePerf: { phaseAWR, phaseBWR },
    robustness: { normalPF, robustPF },
    probOfRuin,
    deadZone,
    weeklyBias
  };
};
