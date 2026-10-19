import { Trade } from '../types';
import { calculateProfitFactor, toRR } from './statMath';

export interface StrategyAnalyticsResult {
  totalTrades: number;
  
  // 1. MAE (Maximum Adverse Excursion) Analytics
  maeStats: {
    hasData: boolean;
    tradeCount: number;
    avgMaeAll: number;
    avgMaeWins: number;
    avgMaeLosses: number;
    avgStopPips: number;
    stopCushionEfficiency: number; // % of stop unused on winners
    earlyEntryWarningCount: number; // trades with MAE > 75% of stop that still won
    tightStopRecommendation?: {
      suggestedStopPips: number;
      potentialRrBoostPercent: number;
      insight: string;
    };
  };

  // 2. MFE (Maximum Favorable Excursion) Analytics
  mfeStats: {
    hasData: boolean;
    tradeCount: number;
    avgMfeAll: number;
    avgMfeWins: number;
    avgTpPips: number;
    mfeRealizationRate: number; // % of MFE captured (TP / MFE)
    leftOnTheTablePips: number;
    missedProfitTradesCount: number; // High MFE but ended BE or Loss
    missedProfitTrades: Trade[];
    optimalTpRecommendation?: {
      suggestedTpPips: number;
      insight: string;
    };
  };

  // 3. Asia Range Volatility Matrix
  asiaRangeStats: {
    hasData: boolean;
    tradeCount: number;
    brackets: {
      tight: { label: string; count: number; wins: number; winRate: number; netR: number; avgR: number; profitFactor: number };
      medium: { label: string; count: number; wins: number; winRate: number; netR: number; avgR: number; profitFactor: number };
      wide: { label: string; count: number; wins: number; winRate: number; netR: number; avgR: number; profitFactor: number };
    };
    bestBracket: string;
    insight: string;
  };

  // 4. ICT Liquidity Sweeps Performance
  liquiditySweepStats: {
    hasData: boolean;
    ranking: Array<{
      sweep: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    multiSweepEdge: {
      singleSweepWinRate: number;
      singleSweepNetR: number;
      multiSweepWinRate: number;
      multiSweepNetR: number;
      diffR: number;
    };
  };

  // 5. Entry Models Performance
  entryModelStats: {
    hasData: boolean;
    ranking: Array<{
      model: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
  };

  // 6. Trend Structure (Continuation vs Reversal)
  trendStats: {
    hasData: boolean;
    ranking: Array<{
      trend: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    reversalCostR: number; // If negative, how much was lost on reversals
    continuationEdgeR: number;
  };

  // 7. Timeframe Matrix (HTF + LTF)
  timeframeMatrix: Array<{
    pair: string;
    htf: string;
    ltf: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
  }>;

  // 8. Entry Hour Edge
  hourlyStats: Array<{
    hour: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
  }>;

  // 9. Discipline Alpha (Setup Quality / Plan Fidelity)
  disciplineStats: {
    highQualityTradesCount: number;
    highQualityNetR: number;
    highQualityWinRate: number;
    lowQualityTradesCount: number;
    lowQualityNetR: number;
    disciplineAlphaR: number; // Potential R saved by avoiding low quality/FOMO trades
  };

  // 10. Golden Setup & Top 3 Actionable Recommendations
  goldenSetup: {
    hasFormula: boolean;
    description: string;
    winRate: number;
    netR: number;
    sampleSize: number;
  };
  actionableInsights: Array<{
    type: 'positive' | 'warning' | 'opportunity';
    title: string;
    description: string;
    metricTag: string;
  }>;
}

export function calculateStrategyAnalytics(trades: Trade[]): StrategyAnalyticsResult {
  const totalTrades = trades.length;

  // Helper for empty result
  const defaultEmptyResult: StrategyAnalyticsResult = {
    totalTrades: 0,
    maeStats: {
      hasData: false,
      tradeCount: 0,
      avgMaeAll: 0,
      avgMaeWins: 0,
      avgMaeLosses: 0,
      avgStopPips: 0,
      stopCushionEfficiency: 0,
      earlyEntryWarningCount: 0,
    },
    mfeStats: {
      hasData: false,
      tradeCount: 0,
      avgMfeAll: 0,
      avgMfeWins: 0,
      avgTpPips: 0,
      mfeRealizationRate: 0,
      leftOnTheTablePips: 0,
      missedProfitTradesCount: 0,
      missedProfitTrades: [],
    },
    asiaRangeStats: {
      hasData: false,
      tradeCount: 0,
      brackets: {
        tight: { label: 'Dar (< 20 Pip)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
        medium: { label: 'Normal (20 - 35 Pip)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
        wide: { label: 'Geniş (> 35 Pip)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
      },
      bestBracket: '-',
      insight: 'Asia Range verisi bulunamadı.',
    },
    liquiditySweepStats: {
      hasData: false,
      ranking: [],
      multiSweepEdge: {
        singleSweepWinRate: 0,
        singleSweepNetR: 0,
        multiSweepWinRate: 0,
        multiSweepNetR: 0,
        diffR: 0,
      },
    },
    entryModelStats: {
      hasData: false,
      ranking: [],
    },
    trendStats: {
      hasData: false,
      ranking: [],
      reversalCostR: 0,
      continuationEdgeR: 0,
    },
    timeframeMatrix: [],
    hourlyStats: [],
    disciplineStats: {
      highQualityTradesCount: 0,
      highQualityNetR: 0,
      highQualityWinRate: 0,
      lowQualityTradesCount: 0,
      lowQualityNetR: 0,
      disciplineAlphaR: 0,
    },
    goldenSetup: {
      hasFormula: false,
      description: 'Yeterli işlem verisi yok.',
      winRate: 0,
      netR: 0,
      sampleSize: 0,
    },
    actionableInsights: [],
  };

  if (totalTrades === 0) return defaultEmptyResult;

  // 1. MAE Analytics
  const tradesWithMae = trades.filter(t => typeof t.maePips === 'number' && !isNaN(t.maePips) && t.maePips >= 0);
  const maeWins = tradesWithMae.filter(t => t.status === 'WIN');
  const maeLosses = tradesWithMae.filter(t => t.status === 'LOSS');
  const tradesWithStop = trades.filter(t => typeof t.stopPips === 'number' && !isNaN(t.stopPips) && t.stopPips > 0);

  const avgMaeAll = tradesWithMae.length > 0 
    ? tradesWithMae.reduce((s, t) => s + (t.maePips || 0), 0) / tradesWithMae.length 
    : 0;
  const avgMaeWins = maeWins.length > 0 
    ? maeWins.reduce((s, t) => s + (t.maePips || 0), 0) / maeWins.length 
    : 0;
  const avgMaeLosses = maeLosses.length > 0 
    ? maeLosses.reduce((s, t) => s + (t.maePips || 0), 0) / maeLosses.length 
    : 0;
  const avgStopPips = tradesWithStop.length > 0 
    ? tradesWithStop.reduce((s, t) => s + (t.stopPips || 0), 0) / tradesWithStop.length 
    : 0;

  // Stop cushion efficiency: How much of the stop was NEVER touched in winning trades?
  let stopCushionEfficiency = 0;
  if (avgStopPips > 0 && avgMaeWins > 0 && avgStopPips >= avgMaeWins) {
    stopCushionEfficiency = ((avgStopPips - avgMaeWins) / avgStopPips) * 100;
  }

  // Early entry warning: trades where MAE approached >75% of stop before recovering
  let earlyEntryCount = 0;
  tradesWithMae.forEach(t => {
    if (t.status === 'WIN' && t.stopPips && t.stopPips > 0 && t.maePips) {
      if (t.maePips / t.stopPips >= 0.75) {
        earlyEntryCount++;
      }
    }
  });

  // Calculate 85th percentile of MAE on winning trades to suggest optimal stop loss
  let tightStopRecommendation: StrategyAnalyticsResult['maeStats']['tightStopRecommendation'] = undefined;
  if (maeWins.length >= 3 && avgStopPips > 0) {
    const sortedWinningMae = maeWins.map(t => t.maePips || 0).sort((a, b) => a - b);
    const p85Index = Math.min(sortedWinningMae.length - 1, Math.floor(sortedWinningMae.length * 0.85));
    const suggestedStop = Math.max(3, Math.round((sortedWinningMae[p85Index] * 1.25) * 10) / 10);
    
    if (suggestedStop < avgStopPips * 0.85) {
      const boost = Math.round(((avgStopPips / suggestedStop) - 1) * 100);
      tightStopRecommendation = {
        suggestedStopPips: suggestedStop,
        potentialRrBoostPercent: boost,
        insight: `Kazanan işlemlerinizin %85'i en fazla ${sortedWinningMae[p85Index]} Pip drawdown gördü. Stop mesafenizi ortalama ${avgStopPips.toFixed(1)} Pip'ten ${suggestedStop} Pip'e çekerseniz, aynı hedeflerde R:R kazancınız yaklaşık %${boost} artabilir!`,
      };
    }
  }

  // 2. MFE Analytics
  const tradesWithMfe = trades.filter(t => typeof t.mfePips === 'number' && !isNaN(t.mfePips) && t.mfePips > 0);
  const mfeWins = tradesWithMfe.filter(t => t.status === 'WIN');
  const tradesWithTp = trades.filter(t => typeof t.tpPips === 'number' && !isNaN(t.tpPips) && t.tpPips > 0);

  const avgMfeAll = tradesWithMfe.length > 0 
    ? tradesWithMfe.reduce((s, t) => s + (t.mfePips || 0), 0) / tradesWithMfe.length 
    : 0;
  const avgMfeWins = mfeWins.length > 0 
    ? mfeWins.reduce((s, t) => s + (t.mfePips || 0), 0) / mfeWins.length 
    : 0;
  const avgTpPips = tradesWithTp.length > 0 
    ? tradesWithTp.reduce((s, t) => s + (t.tpPips || 0), 0) / tradesWithTp.length 
    : 0;

  let mfeRealizationRate = 0;
  if (avgMfeWins > 0 && avgTpPips > 0) {
    mfeRealizationRate = Math.min(100, Math.round((avgTpPips / avgMfeWins) * 100));
  }

  const leftOnTheTablePips = Math.max(0, Math.round((avgMfeWins - avgTpPips) * 10) / 10);

  // Missed profit: MFE was strong (e.g. >= 15 pips or >= 1.5x avg stop) but trade was closed at BE or LOSS
  const missedProfitTrades = tradesWithMfe.filter(t => {
    const isBeOrLoss = t.status === 'BREAKEVEN' || t.status === 'LOSS';
    const significantMfe = (t.mfePips || 0) >= Math.max(12, avgStopPips * 1.2);
    return isBeOrLoss && significantMfe;
  });

  let optimalTpRecommendation: StrategyAnalyticsResult['mfeStats']['optimalTpRecommendation'] = undefined;
  if (tradesWithMfe.length >= 3) {
    const sortedMfe = tradesWithMfe.map(t => t.mfePips || 0).sort((a, b) => a - b);
    const medianMfe = sortedMfe[Math.floor(sortedMfe.length * 0.5)];
    optimalTpRecommendation = {
      suggestedTpPips: Math.round(medianMfe * 10) / 10,
      insight: `İşlemlerinizin %50'si en az ${medianMfe.toFixed(1)} Pip lehte hareket üretiyor. Masada ortalama ${leftOnTheTablePips.toFixed(1)} Pip bırakıyorsunuz; kısmi kâr alma (Partial TP) veya trailing stop eklemek net kârınızı koruyacaktır.`,
    };
  }

  // 3. Asia Range Volatility Matrix
  const tradesWithAsia = trades.filter(t => typeof t.asiaRangePips === 'number' && !isNaN(t.asiaRangePips) && t.asiaRangePips > 0);
  
  const calcBucket = (bucketTrades: Trade[], label: string) => {
    const count = bucketTrades.length;
    const wins = bucketTrades.filter(t => t.status === 'WIN').length;
    const winRate = count > 0 ? (wins / count) * 100 : 0;
    const netR = Math.round(bucketTrades.reduce((s, t) => s + (t.rr || 0), 0) * 100) / 100;
    const avgR = count > 0 ? Math.round((netR / count) * 100) / 100 : 0;
    const posR = bucketTrades.filter(t => (t.rr || 0) > 0).reduce((s, t) => s + (t.rr || 0), 0);
    const negR = Math.abs(bucketTrades.filter(t => (t.rr || 0) < 0).reduce((s, t) => s + (t.rr || 0), 0));
    const profitFactor = calculateProfitFactor(toRR(posR), toRR(negR));
    return { label, count, wins, winRate: Math.round(winRate * 10) / 10, netR, avgR, profitFactor: Math.round(profitFactor * 100) / 100 };
  };

  const tightTrades = tradesWithAsia.filter(t => (t.asiaRangePips || 0) < 20);
  const mediumTrades = tradesWithAsia.filter(t => (t.asiaRangePips || 0) >= 20 && (t.asiaRangePips || 0) <= 35);
  const wideTrades = tradesWithAsia.filter(t => (t.asiaRangePips || 0) > 35);

  const asiaBrackets = {
    tight: calcBucket(tightTrades, 'Dar (< 20 Pip)'),
    medium: calcBucket(mediumTrades, 'Normal (20 - 35 Pip)'),
    wide: calcBucket(wideTrades, 'Geniş (> 35 Pip)'),
  };

  let bestAsiaBracket = '-';
  let asiaInsight = 'Yeterli Asia Range verisi yok.';
  if (tradesWithAsia.length >= 3) {
    const list = [asiaBrackets.tight, asiaBrackets.medium, asiaBrackets.wide].filter(b => b.count > 0);
    list.sort((a, b) => b.netR - a.netR);
    if (list.length > 0) {
      bestAsiaBracket = list[0].label;
      if (asiaBrackets.tight.winRate > asiaBrackets.wide.winRate && asiaBrackets.tight.count >= 2) {
        asiaInsight = `Dar Asia Range (<20 Pip) günlerinde kazanma oranınız %${asiaBrackets.tight.winRate} ile zirve yapıyor! Geniş (>35 Pip) günlerde piyasa hacmini tükettiği için geniş günleri filtrelemek stratejinizi korur.`;
      } else {
        asiaInsight = `En yüksek getiri ${bestAsiaBracket} aralığında (+${list[0].netR} R) gerçekleşti.`;
      }
    }
  }

  // 4. Liquidity Sweeps Breakdown
  const sweepMap: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  let singleSweepCount = 0;
  let singleSweepWins = 0;
  let singleSweepNetR = 0;
  let multiSweepCount = 0;
  let multiSweepWins = 0;
  let multiSweepNetR = 0;

  trades.forEach(t => {
    const sweeps: string[] = [];
    if (Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0) {
      sweeps.push(...t.liquiditySweeps);
    } else if (t.liquiditySweep) {
      sweeps.push(t.liquiditySweep);
    } else if (t.concept) {
      sweeps.push(t.concept);
    }

    const uniqueSweeps = Array.from(new Set(sweeps.filter(Boolean)));
    const valR = t.rr || 0;
    const isWin = t.status === 'WIN';

    if (uniqueSweeps.length === 1) {
      singleSweepCount++;
      if (isWin) singleSweepWins++;
      singleSweepNetR += valR;
    } else if (uniqueSweeps.length > 1) {
      multiSweepCount++;
      if (isWin) multiSweepWins++;
      multiSweepNetR += valR;
    }

    uniqueSweeps.forEach(s => {
      if (!sweepMap[s]) sweepMap[s] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
      sweepMap[s].total++;
      if (isWin) sweepMap[s].wins++;
      sweepMap[s].netR += valR;
      if (valR > 0) sweepMap[s].posR += valR;
      if (valR < 0) sweepMap[s].negR += Math.abs(valR);
    });
  });

  const sweepRanking = Object.entries(sweepMap).map(([sweep, data]) => {
    const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
    const avgR = data.total > 0 ? data.netR / data.total : 0;
    const pf = calculateProfitFactor(toRR(data.posR), toRR(data.negR));
    return {
      sweep,
      total: data.total,
      wins: data.wins,
      winRate: Math.round(winRate * 10) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round(avgR * 100) / 100,
      profitFactor: Math.round(pf * 100) / 100,
    };
  }).sort((a, b) => b.netR - a.netR);

  // 5. Entry Models Breakdown
  const entryModelMap: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    const models: string[] = [];
    if (Array.isArray(t.entryModels) && t.entryModels.length > 0) {
      models.push(...t.entryModels);
    } else if (t.entry) {
      models.push(t.entry);
    }

    const uniqueModels = Array.from(new Set(models.filter(Boolean)));
    const valR = t.rr || 0;
    const isWin = t.status === 'WIN';

    uniqueModels.forEach(m => {
      if (!entryModelMap[m]) entryModelMap[m] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
      entryModelMap[m].total++;
      if (isWin) entryModelMap[m].wins++;
      entryModelMap[m].netR += valR;
      if (valR > 0) entryModelMap[m].posR += valR;
      if (valR < 0) entryModelMap[m].negR += Math.abs(valR);
    });
  });

  const entryModelRanking = Object.entries(entryModelMap).map(([model, data]) => {
    const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
    const avgR = data.total > 0 ? data.netR / data.total : 0;
    const pf = calculateProfitFactor(toRR(data.posR), toRR(data.negR));
    return {
      model,
      total: data.total,
      wins: data.wins,
      winRate: Math.round(winRate * 10) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round(avgR * 100) / 100,
      profitFactor: Math.round(pf * 100) / 100,
    };
  }).sort((a, b) => b.netR - a.netR);

  // 6. Trend Structure Breakdown
  const trendMap: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    const tr = t.trend || 'Belirtilmemiş';
    if (!trendMap[tr]) trendMap[tr] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    trendMap[tr].total++;
    if (t.status === 'WIN') trendMap[tr].wins++;
    trendMap[tr].netR += valR;
    if (valR > 0) trendMap[tr].posR += valR;
    if (valR < 0) trendMap[tr].negR += Math.abs(valR);
  });

  const trendRanking = Object.entries(trendMap).map(([trend, data]) => {
    const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
    const avgR = data.total > 0 ? data.netR / data.total : 0;
    const pf = calculateProfitFactor(toRR(data.posR), toRR(data.negR));
    return {
      trend,
      total: data.total,
      wins: data.wins,
      winRate: Math.round(winRate * 10) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round(avgR * 100) / 100,
      profitFactor: Math.round(pf * 100) / 100,
    };
  }).sort((a, b) => b.netR - a.netR);

  // Reversal cost vs Continuation edge
  let reversalCostR = 0;
  let continuationEdgeR = 0;
  trendRanking.forEach(t => {
    const lower = t.trend.toLowerCase();
    if (lower.includes('reversal') || lower.includes('dönüş') || lower.includes('counter')) {
      if (t.netR < 0) reversalCostR += Math.abs(t.netR);
    } else if (lower.includes('continuation') || lower.includes('devam') || lower.includes('pro')) {
      continuationEdgeR += t.netR;
    }
  });

  // 7. Timeframe Matrix (HTF + LTF)
  const tfMap: Record<string, { htf: string; ltf: string; total: number; wins: number; netR: number }> = {};
  trades.forEach(t => {
    const htf = t.htfTimeframe || 'Genel';
    const ltf = t.timeframe || 'Genel';
    const key = `${htf} + ${ltf}`;
    if (!tfMap[key]) tfMap[key] = { htf, ltf, total: 0, wins: 0, netR: 0 };
    tfMap[key].total++;
    if (t.status === 'WIN') tfMap[key].wins++;
    tfMap[key].netR += (t.rr || 0);
  });

  const timeframeMatrix = Object.entries(tfMap)
    .filter(([_, d]) => d.total >= 1)
    .map(([pair, data]) => ({
      pair,
      htf: data.htf,
      ltf: data.ltf,
      total: data.total,
      wins: data.wins,
      winRate: Math.round((data.wins / data.total) * 1000) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round((data.netR / data.total) * 100) / 100,
    }))
    .sort((a, b) => b.netR - a.netR);

  // 8. Entry Hour Edge
  const hourMap: Record<string, { total: number; wins: number; netR: number }> = {};
  trades.forEach(t => {
    let hourStr = '';
    if (t.entryTime && t.entryTime.includes(':')) {
      hourStr = t.entryTime.split(':')[0] + ':00';
    } else {
      const d = new Date(t.createdAt);
      const h = d.getHours().toString().padStart(2, '0');
      hourStr = `${h}:00`;
    }
    if (!hourMap[hourStr]) hourMap[hourStr] = { total: 0, wins: 0, netR: 0 };
    hourMap[hourStr].total++;
    if (t.status === 'WIN') hourMap[hourStr].wins++;
    hourMap[hourStr].netR += (t.rr || 0);
  });

  const hourlyStats = Object.entries(hourMap)
    .map(([hour, data]) => ({
      hour,
      total: data.total,
      wins: data.wins,
      winRate: Math.round((data.wins / data.total) * 1000) / 10,
      netR: Math.round(data.netR * 100) / 100,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // 9. Discipline Alpha (Setup Quality / Plan Fidelity)
  let highQualityCount = 0;
  let highQualityWins = 0;
  let highQualityNetR = 0;
  let lowQualityCount = 0;
  let lowQualityNetR = 0;

  trades.forEach(t => {
    const pf = (t.planFidelity || '').toLowerCase();
    const valR = t.rr || 0;
    const isWin = t.status === 'WIN';

    const isHigh = pf === 'a+' || pf === 'a' || pf === 'tam' || pf.includes('sadık') || pf.includes('uygun') || pf.includes('kusursuz') || pf.includes('disciplined');
    const isLow = pf === 'c' || pf === 'fomo' || pf.includes('ihlal') || pf.includes('disiplinsiz') || pf.includes('intikam') || pf.includes('erken');

    if (isHigh) {
      highQualityCount++;
      if (isWin) highQualityWins++;
      highQualityNetR += valR;
    } else if (isLow) {
      lowQualityCount++;
      lowQualityNetR += valR;
    }
  });

  const disciplineAlphaR = lowQualityNetR < 0 ? Math.abs(Math.round(lowQualityNetR * 100) / 100) : 0;

  // 10. Golden Setup & Actionable Recommendations
  const comboMap: Record<string, { total: number; wins: number; netR: number; sampleDesc: string }> = {};
  trades.forEach(t => {
    const asset = t.asset || 'Genel';
    const session = t.session || 'Genel';
    const sweep = Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0 
      ? t.liquiditySweeps[0] 
      : (t.liquiditySweep || t.concept || 'Sweep');
    const model = Array.isArray(t.entryModels) && t.entryModels.length > 0 
      ? t.entryModels[0] 
      : (t.entry || 'Model');

    const key = `${asset} | ${session} | ${sweep} | ${model}`;
    if (!comboMap[key]) {
      comboMap[key] = { 
        total: 0, 
        wins: 0, 
        netR: 0, 
        sampleDesc: `${asset} paritesinde ${session} seansı, ${sweep} likidite alımı ve ${model} modeli` 
      };
    }
    comboMap[key].total++;
    if (t.status === 'WIN') comboMap[key].wins++;
    comboMap[key].netR += (t.rr || 0);
  });

  const comboList = Object.values(comboMap).filter(c => c.total >= 2);
  comboList.sort((a, b) => b.netR - a.netR);

  let goldenSetup = {
    hasFormula: false,
    description: 'Yeterli işlem tekrarı yok.',
    winRate: 0,
    netR: 0,
    sampleSize: 0,
  };

  if (comboList.length > 0 && comboList[0].netR > 0) {
    const topCombo = comboList[0];
    goldenSetup = {
      hasFormula: true,
      description: topCombo.sampleDesc,
      winRate: Math.round((topCombo.wins / topCombo.total) * 1000) / 10,
      netR: Math.round(topCombo.netR * 100) / 100,
      sampleSize: topCombo.total,
    };
  }

  // Generate top actionable insights based on all data
  const actionableInsights: StrategyAnalyticsResult['actionableInsights'] = [];

  // Stop Cushion insight
  if (tightStopRecommendation) {
    actionableInsights.push({
      type: 'opportunity',
      title: 'Stop Loss Optimizasyonu (MAE)',
      description: tightStopRecommendation.insight,
      metricTag: `+${tightStopRecommendation.potentialRrBoostPercent}% Potansiyel R/R`,
    });
  }

  // MFE Missed profit insight
  if (missedProfitTrades.length > 0) {
    const totalLostFromMissed = missedProfitTrades.reduce((s, t) => s + Math.abs(t.rr || 0), 0);
    actionableInsights.push({
      type: 'warning',
      title: 'Masada Bırakılan Kâr & Trailing Stop Eksikliği',
      description: `${missedProfitTrades.length} adet işlemde fiyat lehinize derin gitmesine rağmen (yüksek MFE) işlem kârsız kapandı. Kısmi kâr (Partial TP) almak veya başabaşa çekme (BE) kurallarını netleştirmek sizi korur.`,
      metricTag: `${missedProfitTrades.length} İşlem Sızıntısı (-${totalLostFromMissed.toFixed(1)}R)`,
    });
  }

  // Reversal Trend leak insight
  if (reversalCostR > 1.5) {
    actionableInsights.push({
      type: 'warning',
      title: 'Trend Tersi (Reversal) Kan Kaybı',
      description: `Trend tersi / dönüş arayan işlemleriniz stratejinize toplam -${reversalCostR.toFixed(1)}R zarar veriyor. Sadece Trend Yönü (Continuation) setuplarına odaklanmak portföyünüzü doğrudan büyütecektir.`,
      metricTag: `-${reversalCostR.toFixed(1)}R Kurtarılabilir Kayıp`,
    });
  }

  // Multi-sweep edge
  if (multiSweepCount >= 2 && singleSweepCount >= 2) {
    const multiWR = Math.round((multiSweepWins / multiSweepCount) * 1000) / 10;
    const singleWR = Math.round((singleSweepWins / singleSweepCount) * 1000) / 10;
    if (multiWR > singleWR + 5) {
      actionableInsights.push({
        type: 'positive',
        title: 'Çoklu Likidite Süpürmesi Avantajı',
        description: `Birden fazla likidite süpürüldüğünde (Örn: Hem Asia High hem PDH) kazanma oranınız %${multiWR} seviyesine çıkıyor (Tek süpürmede: %${singleWR}). Yüksek olasılıklı A+ işlemlerde en az 2 likidite havuzunun temizlenmesini bekleyin.`,
        metricTag: `+%${Math.round(multiWR - singleWR)} Win Rate Farkı`,
      });
    }
  }

  // Discipline Alpha insight
  if (disciplineAlphaR > 1.0) {
    actionableInsights.push({
      type: 'opportunity',
      title: 'Disiplin & Plan Sadakati Kazancı',
      description: `Plan dışı (FOMO, C-kalite, erken giriş) işlemleri filtreleyip tamamen çöpe atsaydınız kasanız tam +${disciplineAlphaR.toFixed(1)}R daha kârda olacaktı!`,
      metricTag: `+${disciplineAlphaR.toFixed(1)}R Disiplin Deltası`,
    });
  }

  // Asia Range insight
  if (tradesWithAsia.length >= 3 && asiaBrackets.tight.count >= 2 && asiaBrackets.tight.winRate > 60) {
    actionableInsights.push({
      type: 'positive',
      title: 'Asia Range Filtre Avantajı',
      description: asiaInsight,
      metricTag: `%${asiaBrackets.tight.winRate} Dar Asia WR`,
    });
  }

  return {
    totalTrades,
    maeStats: {
      hasData: tradesWithMae.length > 0,
      tradeCount: tradesWithMae.length,
      avgMaeAll: Math.round(avgMaeAll * 10) / 10,
      avgMaeWins: Math.round(avgMaeWins * 10) / 10,
      avgMaeLosses: Math.round(avgMaeLosses * 10) / 10,
      avgStopPips: Math.round(avgStopPips * 10) / 10,
      stopCushionEfficiency: Math.round(stopCushionEfficiency),
      earlyEntryWarningCount: earlyEntryCount,
      tightStopRecommendation,
    },
    mfeStats: {
      hasData: tradesWithMfe.length > 0,
      tradeCount: tradesWithMfe.length,
      avgMfeAll: Math.round(avgMfeAll * 10) / 10,
      avgMfeWins: Math.round(avgMfeWins * 10) / 10,
      avgTpPips: Math.round(avgTpPips * 10) / 10,
      mfeRealizationRate,
      leftOnTheTablePips,
      missedProfitTradesCount: missedProfitTrades.length,
      missedProfitTrades,
      optimalTpRecommendation,
    },
    asiaRangeStats: {
      hasData: tradesWithAsia.length > 0,
      tradeCount: tradesWithAsia.length,
      brackets: asiaBrackets,
      bestBracket: bestAsiaBracket,
      insight: asiaInsight,
    },
    liquiditySweepStats: {
      hasData: sweepRanking.length > 0,
      ranking: sweepRanking,
      multiSweepEdge: {
        singleSweepWinRate: singleSweepCount > 0 ? Math.round((singleSweepWins / singleSweepCount) * 1000) / 10 : 0,
        singleSweepNetR: Math.round(singleSweepNetR * 100) / 100,
        multiSweepWinRate: multiSweepCount > 0 ? Math.round((multiSweepWins / multiSweepCount) * 1000) / 10 : 0,
        multiSweepNetR: Math.round(multiSweepNetR * 100) / 100,
        diffR: Math.round((multiSweepNetR - singleSweepNetR) * 100) / 100,
      },
    },
    entryModelStats: {
      hasData: entryModelRanking.length > 0,
      ranking: entryModelRanking,
    },
    trendStats: {
      hasData: trendRanking.length > 0,
      ranking: trendRanking,
      reversalCostR: Math.round(reversalCostR * 100) / 100,
      continuationEdgeR: Math.round(continuationEdgeR * 100) / 100,
    },
    timeframeMatrix,
    hourlyStats,
    disciplineStats: {
      highQualityTradesCount: highQualityCount,
      highQualityNetR: Math.round(highQualityNetR * 100) / 100,
      highQualityWinRate: highQualityCount > 0 ? Math.round((highQualityWins / highQualityCount) * 1000) / 10 : 0,
      lowQualityTradesCount: lowQualityCount,
      lowQualityNetR: Math.round(lowQualityNetR * 100) / 100,
      disciplineAlphaR,
    },
    goldenSetup,
    actionableInsights,
  };
}
