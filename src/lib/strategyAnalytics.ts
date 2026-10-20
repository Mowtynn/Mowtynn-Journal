import { Trade } from '../types';
import { calculateProfitFactor, toRR } from './statMath';
import { getTradeAccountCategory, getNewsDayLabels } from '../constants/constants';
import { getTradeHourBucket, getTradeNyWeekday } from './tradingTime';
import { bucketAsiaRanges } from './asiaAnalytics';

export interface StrategyAnalyticsResult {
  totalTrades: number;
  overallScore: {
    score: number; // 0-100
    grade: 'A+' | 'A' | 'B' | 'C' | 'D';
    winRate: number;
    profitFactor: number;
    netR: number;
    expectancy: number;
  };
  
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

  // 5. Entry Models Performance (Breaker, Mitigation, FVG, IFVG)
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

  // 7. Timeframe Matrix (HTF + LTF / Entry Timeframe)
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

  // 8. Entry Hour Edge (00:00-01:00, etc.)
  hourlyStats: Array<{
    hour: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
    profitFactor: number;
  }>;

  // 9. TP Target Analytics
  tpTargetStats: {
    hasData: boolean;
    ranking: Array<{
      target: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    insight: string;
  };

  // 10b. News Day / Bank Holiday Analytics (Var vs Yok)
  newsDayStats: {
    hasData: boolean;
    ranking: Array<{
      label: string;
      isNews: boolean;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    unknownCount: number; // News Day bilgisi girilmemiş (eski) işlem sayısı — kıyasa dahil edilmez
    insight: string;
  };

  // 10. Premium / Discount Zone Analytics
  premiumDiscountStats: {
    hasData: boolean;
    ranking: Array<{
      zone: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    zoneDirectionMatrix: Array<{
      zone: string;
      direction: 'LONG' | 'SHORT';
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    insight: string;
  };

  // 11. PD Array / Confirmations Performance
  confirmationStats: {
    hasData: boolean;
    ranking: Array<{
      confirmation: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    multiConfirmationWinRate: number;
  };

  // 12. Setup Quality / Plan Fidelity Breakdown (A+, A, B-C)
  setupQualityStats: {
    ranking: Array<{
      quality: string;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    onlyAPlusNetR: number;
    onlyAPlusWinRate: number;
    bCEliminationBoostR: number;
  };

  // 13. Session & Direction Cross Matrix (London, NY AM x Long/Short)
  sessionDirectionStats: Array<{
    session: string;
    direction: 'LONG' | 'SHORT';
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
    profitFactor: number;
  }>;

  // 14. Discipline Alpha (Setup Quality / Plan Fidelity)
  disciplineStats: {
    highQualityTradesCount: number;
    highQualityNetR: number;
    highQualityWinRate: number;
    lowQualityTradesCount: number;
    lowQualityNetR: number;
    disciplineAlphaR: number; // Potential R saved by avoiding low quality/FOMO trades
  };

  // 15. Confluence Factor Matrix (0-2 vs 3-4 vs 5+ Confluences)
  confluenceStats: {
    hasData: boolean;
    brackets: Array<{
      label: string;
      count: number;
      total: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    sweetSpotInsight: string;
  };

  // 16. Day of the Week Edge (Pazartesi - Cuma)
  dayOfWeekStats: Array<{
    dayIndex: number;
    dayName: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
    profitFactor: number;
  }>;

  // 17. Stop Size Volatility Brackets (<10p, 10-25p, >25p)
  stopSizeStats: {
    hasData: boolean;
    brackets: Array<{
      label: string;
      total: number;
      count: number;
      wins: number;
      winRate: number;
      netR: number;
      avgR: number;
      profitFactor: number;
    }>;
    insight: string;
  };

  // 18. Streak & Post-Loss / Tilt Analytics
  streakStats: {
    currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
    maxWinStreak: number;
    maxLossStreak: number;
    postWinWinRate: number;
    postLossWinRate: number;
    postLossTiltRisk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
    insight: string;
  };

  // 19. Monte Carlo Prop Firm & Drawdown Risk Simulation
  monteCarloSimulation: {
    hasData: boolean;
    simulatedDrawdownRisk4Percent: number; // % prob of 4R DD
    simulatedDrawdownRisk8Percent: number; // % prob of 8R DD
    simulatedProbHitting10R: number; // % prob of +10R target
    expectedMaxLosingStreak: number;
    medianFinalR: number;
    simulatedCurves: number[][]; // sample equity paths
    insight: string;
  };

  // 20. Negative Edge Bleed / Kırmızı Bayraklar (Otomatik Eliminasyon Kuralları)
  redFlagRules: Array<{
    id: string;
    severity: 'CRITICAL' | 'WARNING';
    rule: string;
    lossR: number;
    tradeCount: number;
    recommendation: string;
  }>;

  // 21. Golden Setup & Actionable Recommendations
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

  // 22. Detailed Mistake & Loss Leak Breakdown (Hata ve Sızıntı Analizi)
  mistakeStats: {
    totalLeakR: number;
    bCLeakR: number;
    counterTrendLeakR: number;
    wrongZoneLeakR: number;
    lowConfluenceLeakR: number;
    preventableLeakTotalR: number;
    potentialNetR: number;
    potentialWinRate: number;
    leaks: Array<{
      category: string;
      title: string;
      count: number;
      lostR: number;
      winRate: number;
      fixAdvice: string;
    }>;
  };

  // 23. Asset & Instrument Edge (Parite Bazında Performans)
  assetStats: Array<{
    asset: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
    profitFactor: number;
  }>;

  // 24. Account Category Discipline (Funded vs Challenge vs Demo)
  accountCategoryStats: Array<{
    category: string;
    total: number;
    wins: number;
    winRate: number;
    netR: number;
    avgR: number;
    profitFactor: number;
  }>;
}

export function calculateStrategyAnalytics(trades: Trade[]): StrategyAnalyticsResult {
  const totalTrades = trades.length;

  const defaultEmptyResult: StrategyAnalyticsResult = {
    totalTrades: 0,
    overallScore: { score: 0, grade: 'C', winRate: 0, profitFactor: 0, netR: 0, expectancy: 0 },
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
        tight: { label: 'Dar (< 0.8× parite medyanı)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
        medium: { label: 'Normal (0.8× – 1.25×)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
        wide: { label: 'Geniş (> 1.25× parite medyanı)', count: 0, wins: 0, winRate: 0, netR: 0, avgR: 0, profitFactor: 0 },
      },
      bestBracket: '-',
      insight: 'Asia Range verisi bulunamadı.',
    },
    liquiditySweepStats: {
      hasData: false,
      ranking: [],
      multiSweepEdge: { singleSweepWinRate: 0, singleSweepNetR: 0, multiSweepWinRate: 0, multiSweepNetR: 0, diffR: 0 },
    },
    entryModelStats: { hasData: false, ranking: [] },
    trendStats: { hasData: false, ranking: [], reversalCostR: 0, continuationEdgeR: 0 },
    timeframeMatrix: [],
    hourlyStats: [],
    tpTargetStats: { hasData: false, ranking: [], insight: 'TP Target verisi bulunamadı.' },
    premiumDiscountStats: { hasData: false, ranking: [], zoneDirectionMatrix: [], insight: 'Zone verisi bulunamadı.' },
    newsDayStats: { hasData: false, ranking: [], unknownCount: 0, insight: 'News Day / Bank Holiday verisi bulunamadı.' },
    confirmationStats: { hasData: false, ranking: [], multiConfirmationWinRate: 0 },
    setupQualityStats: { ranking: [], onlyAPlusNetR: 0, onlyAPlusWinRate: 0, bCEliminationBoostR: 0 },
    sessionDirectionStats: [],
    disciplineStats: {
      highQualityTradesCount: 0,
      highQualityNetR: 0,
      highQualityWinRate: 0,
      lowQualityTradesCount: 0,
      lowQualityNetR: 0,
      disciplineAlphaR: 0,
    },
    confluenceStats: { hasData: false, brackets: [], sweetSpotInsight: 'Yeterli konfluans verisi yok.' },
    dayOfWeekStats: [],
    stopSizeStats: { hasData: false, brackets: [], insight: 'Stop pip verisi yok.' },
    streakStats: {
      currentStreak: { type: 'NONE', count: 0 },
      maxWinStreak: 0,
      maxLossStreak: 0,
      postWinWinRate: 0,
      postLossWinRate: 0,
      postLossTiltRisk: 'DÜŞÜK',
      insight: 'İşlem geçmişi yetersiz.',
    },
    monteCarloSimulation: {
      hasData: false,
      simulatedDrawdownRisk4Percent: 0,
      simulatedDrawdownRisk8Percent: 0,
      simulatedProbHitting10R: 0,
      expectedMaxLosingStreak: 0,
      medianFinalR: 0,
      simulatedCurves: [],
      insight: 'Simülasyon için en az 5 işlem gereklidir.',
    },
    redFlagRules: [],
    goldenSetup: { hasFormula: false, description: 'Yeterli işlem verisi yok.', winRate: 0, netR: 0, sampleSize: 0 },
    actionableInsights: [],
    mistakeStats: {
      totalLeakR: 0,
      bCLeakR: 0,
      counterTrendLeakR: 0,
      wrongZoneLeakR: 0,
      lowConfluenceLeakR: 0,
      preventableLeakTotalR: 0,
      potentialNetR: 0,
      potentialWinRate: 0,
      leaks: [],
    },
    assetStats: [],
    accountCategoryStats: [],
  };

  if (totalTrades === 0) return defaultEmptyResult;

  // General Performance
  const totalWins = trades.filter(t => t.status === 'WIN').length;
  const overallWinRate = Math.round((totalWins / totalTrades) * 1000) / 10;
  const overallNetR = Math.round(trades.reduce((s, t) => s + (t.rr || 0), 0) * 100) / 100;
  const posR = trades.filter(t => (t.rr || 0) > 0).reduce((s, t) => s + (t.rr || 0), 0);
  const negR = Math.abs(trades.filter(t => (t.rr || 0) < 0).reduce((s, t) => s + (t.rr || 0), 0));
  const overallProfitFactor = Math.round(calculateProfitFactor(toRR(posR), toRR(negR)) * 100) / 100;
  const overallExpectancy = Math.round((overallNetR / totalTrades) * 100) / 100;

  // Score calculation (0-100)
  let baseScore = 50;
  baseScore += (overallWinRate - 50) * 0.6;
  baseScore += Math.min(25, Math.max(-25, (overallProfitFactor - 1) * 20));
  baseScore += Math.min(15, Math.max(-15, overallExpectancy * 15));
  const normalizedScore = Math.min(100, Math.max(0, Math.round(baseScore)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (normalizedScore >= 85) grade = 'A+';
  else if (normalizedScore >= 70) grade = 'A';
  else if (normalizedScore >= 55) grade = 'B';
  else if (normalizedScore >= 40) grade = 'C';
  else grade = 'D';

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

  let stopCushionEfficiency = 0;
  if (avgStopPips > 0 && avgMaeWins > 0 && avgStopPips >= avgMaeWins) {
    stopCushionEfficiency = ((avgStopPips - avgMaeWins) / avgStopPips) * 100;
  }

  let earlyEntryCount = 0;
  tradesWithMae.forEach(t => {
    if (t.status === 'WIN' && t.stopPips && t.stopPips > 0 && t.maePips) {
      if (t.maePips / t.stopPips >= 0.75) earlyEntryCount++;
    }
  });

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
      insight: `İşlemlerinizin %50'si en az ${medianMfe.toFixed(1)} Pip lehte hareket üretiyor. Masada ortalama ${leftOnTheTablePips.toFixed(1)} Pip bırakıyorsunuz; kısmi kâr alma (Partial TP) veya trailing stop net kârınızı koruyacaktır.`,
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
    const pR = bucketTrades.filter(t => (t.rr || 0) > 0).reduce((s, t) => s + (t.rr || 0), 0);
    const nR = Math.abs(bucketTrades.filter(t => (t.rr || 0) < 0).reduce((s, t) => s + (t.rr || 0), 0));
    const profitFactor = calculateProfitFactor(toRR(pR), toRR(nR));
    return { label, count, total: count, wins, winRate: Math.round(winRate * 10) / 10, netR, avgR, profitFactor: Math.round(profitFactor * 100) / 100 };
  };

  // Brackets are relative to each pair's own median Asia range (EURCAD and EURUSD ranges differ structurally)
  const asiaBucketMap = bucketAsiaRanges(tradesWithAsia);
  const tightTrades = tradesWithAsia.filter(t => asiaBucketMap.get(t.id) === 'NARROW');
  const mediumTrades = tradesWithAsia.filter(t => asiaBucketMap.get(t.id) === 'NORMAL');
  const wideTrades = tradesWithAsia.filter(t => asiaBucketMap.get(t.id) === 'WIDE');

  const asiaBrackets = {
    tight: calcBucket(tightTrades, 'Dar (< 0.8× parite medyanı)'),
    medium: calcBucket(mediumTrades, 'Normal (0.8× – 1.25×)'),
    wide: calcBucket(wideTrades, 'Geniş (> 1.25× parite medyanı)'),
  };

  let bestAsiaBracket = '-';
  let asiaInsight = 'Yeterli Asia Range verisi yok.';
  if (tradesWithAsia.length >= 3) {
    const list = [asiaBrackets.tight, asiaBrackets.medium, asiaBrackets.wide].filter(b => b.count > 0);
    list.sort((a, b) => b.netR - a.netR);
    if (list.length > 0) {
      bestAsiaBracket = list[0].label;
      if (asiaBrackets.tight.winRate > asiaBrackets.wide.winRate && asiaBrackets.tight.count >= 2) {
        asiaInsight = `Dar Asia Range günlerinde (parite medyanının altında) kazanma oranınız %${asiaBrackets.tight.winRate} ile zirve yapıyor.`;
      } else {
        asiaInsight = `En yüksek getiri ${bestAsiaBracket} aralığında (+${list[0].netR} R) gerçekleşti.`;
      }
    }
  }

  // Helper for ranking calculation
  const buildRankings = (groupBy: (t: Trade) => string[]) => {
    const map: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
    trades.forEach(t => {
      const keys = groupBy(t);
      const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
      const valR = t.rr || 0;
      const isWin = t.status === 'WIN';

      uniqueKeys.forEach(k => {
        if (!map[k]) map[k] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
        map[k].total++;
        if (isWin) map[k].wins++;
        map[k].netR += valR;
        if (valR > 0) map[k].posR += valR;
        if (valR < 0) map[k].negR += Math.abs(valR);
      });
    });

    return Object.entries(map).map(([key, data]) => {
      const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
      const avgR = data.total > 0 ? data.netR / data.total : 0;
      const pf = calculateProfitFactor(toRR(data.posR), toRR(data.negR));
      return {
        key,
        total: data.total,
        wins: data.wins,
        winRate: Math.round(winRate * 10) / 10,
        netR: Math.round(data.netR * 100) / 100,
        avgR: Math.round(avgR * 100) / 100,
        profitFactor: Math.round(pf * 100) / 100,
      };
    }).sort((a, b) => b.netR - a.netR);
  };

  // 4. Liquidity Sweeps Breakdown
  let singleSweepCount = 0;
  let singleSweepWins = 0;
  let singleSweepNetR = 0;
  let multiSweepCount = 0;
  let multiSweepWins = 0;
  let multiSweepNetR = 0;

  trades.forEach(t => {
    const sweeps: string[] = [];
    if (Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0) sweeps.push(...t.liquiditySweeps);
    else if (t.liquiditySweep) sweeps.push(t.liquiditySweep);
    else if (t.concept) sweeps.push(t.concept);

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
  });

  const sweepRanking = buildRankings(t => {
    if (Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0) return t.liquiditySweeps;
    if (t.liquiditySweep) return [t.liquiditySweep];
    if (t.concept) return [t.concept];
    return [];
  }).map(r => ({ sweep: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  // 5. Entry Models Breakdown
  const entryModelRanking = buildRankings(t => {
    if (Array.isArray(t.entryModels) && t.entryModels.length > 0) return t.entryModels;
    if (t.entry) return [t.entry];
    return [];
  }).map(r => ({ model: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  // 6. Trend Structure Breakdown
  const trendRanking = buildRankings(t => [t.trend || 'Belirtilmemiş'])
    .map(r => ({ trend: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  let reversalCostR = 0;
  let continuationEdgeR = 0;
  trendRanking.forEach(t => {
    const lower = t.trend.toLowerCase();
    if (lower.includes('reversal') || lower.includes('dönüş') || lower.includes('counter')) {
      if (t.netR < 0) reversalCostR += Math.abs(t.netR);
    } else if (lower.includes('continuation') || lower.includes('devam') || lower.includes('pro-trend')) {
      continuationEdgeR += t.netR;
    }
  });

  // 7. Timeframe Matrix (HTF + LTF / Entry Timeframe)
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
  const hourMap: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    // NY-time hour bucket (explicit entry hour wins, otherwise converted from the trade timestamp)
    const hourStr = getTradeHourBucket(t);
    if (!hourMap[hourStr]) hourMap[hourStr] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    hourMap[hourStr].total++;
    if (t.status === 'WIN') hourMap[hourStr].wins++;
    hourMap[hourStr].netR += valR;
    if (valR > 0) hourMap[hourStr].posR += valR;
    if (valR < 0) hourMap[hourStr].negR += Math.abs(valR);
  });

  const hourlyStats = Object.entries(hourMap)
    .map(([hour, data]) => ({
      hour,
      total: data.total,
      wins: data.wins,
      winRate: Math.round((data.wins / data.total) * 1000) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round((data.netR / data.total) * 100) / 100,
      profitFactor: Math.round(calculateProfitFactor(toRR(data.posR), toRR(data.negR)) * 100) / 100,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // 9. TP Target Analytics
  const tpTargetTrades = trades.filter(t => Array.isArray(t.tpTargets) && t.tpTargets.length > 0);
  const tpTargetRanking = buildRankings(t => (Array.isArray(t.tpTargets) ? t.tpTargets : []))
    .map(r => ({ target: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  let tpTargetInsight = 'İşlem eklerken TP Target seçtiğinizde hangi hedefin size kazandırdığı burada görünecektir.';
  if (tpTargetRanking.length > 0) {
    const topTp = tpTargetRanking[0];
    tpTargetInsight = `En yüksek kârlılık TP Target "${topTp.target}" hedefinde (${topTp.netR >= 0 ? '+' : ''}${topTp.netR} R, %${topTp.winRate} WR) yakalandı.`;
  }

  // 10. Premium / Discount Zone Analytics
  const zoneRanking = buildRankings(t => [t.premiumDiscount || ''])
    .map(r => ({ zone: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  const zoneDirMap: Record<string, { zone: string; direction: 'LONG' | 'SHORT'; total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    if (!t.premiumDiscount) return;
    const key = `${t.premiumDiscount}__${t.type}`;
    if (!zoneDirMap[key]) zoneDirMap[key] = { zone: t.premiumDiscount, direction: t.type, total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    zoneDirMap[key].total++;
    if (t.status === 'WIN') zoneDirMap[key].wins++;
    zoneDirMap[key].netR += valR;
    if (valR > 0) zoneDirMap[key].posR += valR;
    if (valR < 0) zoneDirMap[key].negR += Math.abs(valR);
  });

  const zoneDirectionMatrix = Object.values(zoneDirMap).map(d => ({
    zone: d.zone,
    direction: d.direction,
    total: d.total,
    wins: d.wins,
    winRate: Math.round((d.wins / d.total) * 1000) / 10,
    netR: Math.round(d.netR * 100) / 100,
    avgR: Math.round((d.netR / d.total) * 100) / 100,
    profitFactor: Math.round(calculateProfitFactor(toRR(d.posR), toRR(d.negR)) * 100) / 100,
  })).sort((a, b) => b.netR - a.netR);

  let zoneInsight = 'Premium / Discount alanı girildikçe en avantajlı alış-satış bölgeleri burada listelenir.';
  const discountLong = zoneDirectionMatrix.find(z => z.zone.toLowerCase().includes('discount') && z.direction === 'LONG');
  const premiumShort = zoneDirectionMatrix.find(z => z.zone.toLowerCase().includes('premium') && z.direction === 'SHORT');
  if (discountLong || premiumShort) {
    zoneInsight = `ICT Kuralı Onaylandı: Discount Long (%${discountLong?.winRate || 0} WR) ve Premium Short (%${premiumShort?.winRate || 0} WR) optimum getiri sağlıyor.`;
  }

  // 10b. News Day / Bank Holiday (Var vs Yok). Bilgisi olmayan eski işlemler kıyasa katılmaz.
  const newsLabels = getNewsDayLabels();
  const newsKnownTrades = trades.filter(t => typeof t.newsDay === 'boolean');
  const newsRankingRaw = buildRankings(t => (typeof t.newsDay === 'boolean' ? [t.newsDay ? newsLabels.yes : newsLabels.no] : []));
  const newsRanking = [newsLabels.yes, newsLabels.no]
    .map(label => newsRankingRaw.find(r => r.key === label))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map(r => ({ label: r.key, isNews: r.key === newsLabels.yes, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));
  const newsYesRow = newsRanking.find(r => r.isNews);
  const newsNoRow = newsRanking.find(r => !r.isNews);
  let newsInsight = 'İşlem eklerken News Day / Bank Holiday seçtiğinizde haber günlerinin performansı burada görünür.';
  if (newsYesRow && newsNoRow) {
    const diff = Math.round((newsYesRow.avgR - newsNoRow.avgR) * 100) / 100;
    const small = Math.min(newsYesRow.total, newsNoRow.total) < 10;
    newsInsight = `${newsLabels.yes}: işlem başına ${newsYesRow.avgR >= 0 ? '+' : ''}${newsYesRow.avgR} R (%${newsYesRow.winRate} WR, ${newsYesRow.total} işlem) — ${newsLabels.no}: ${newsNoRow.avgR >= 0 ? '+' : ''}${newsNoRow.avgR} R (%${newsNoRow.winRate} WR, ${newsNoRow.total} işlem). Fark ${diff >= 0 ? '+' : ''}${diff} R.${small ? ' Gruplardan biri 10 işlemden az; sonuç henüz güvenilir değil.' : ''}`;
  } else if (newsYesRow || newsNoRow) {
    const only = (newsYesRow || newsNoRow)!;
    newsInsight = `Yalnızca "${only.label}" grubunda işlem var (${only.total}). Kıyas için diğer gruptan da işlem gerekir.`;
  }

  // 11. PD Array / Confirmations Performance
  const confirmationRanking = buildRankings(t => t.confirmations || [])
    .map(r => ({ confirmation: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  const multiConfTrades = trades.filter(t => Array.isArray(t.confirmations) && t.confirmations.length >= 2);
  const multiConfWins = multiConfTrades.filter(t => t.status === 'WIN').length;
  const multiConfirmationWinRate = multiConfTrades.length > 0 ? Math.round((multiConfWins / multiConfTrades.length) * 1000) / 10 : 0;

  // 12. Setup Quality / Plan Fidelity Breakdown (A+, A, B-C)
  const qualityMap: Record<string, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    const q = t.planFidelity || 'Belirtilmemiş';
    if (!qualityMap[q]) qualityMap[q] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    qualityMap[q].total++;
    if (t.status === 'WIN') qualityMap[q].wins++;
    qualityMap[q].netR += valR;
    if (valR > 0) qualityMap[q].posR += valR;
    if (valR < 0) qualityMap[q].negR += Math.abs(valR);
  });

  const setupQualityRanking = Object.entries(qualityMap).map(([quality, data]) => ({
    quality,
    total: data.total,
    wins: data.wins,
    winRate: Math.round((data.wins / data.total) * 1000) / 10,
    netR: Math.round(data.netR * 100) / 100,
    avgR: Math.round((data.netR / data.total) * 100) / 100,
    profitFactor: Math.round(calculateProfitFactor(toRR(data.posR), toRR(data.negR)) * 100) / 100,
  })).sort((a, b) => b.netR - a.netR);

  const aPlusData = setupQualityRanking.find(q => q.quality.toLowerCase() === 'a+');
  const onlyAPlusNetR = aPlusData ? aPlusData.netR : 0;
  const onlyAPlusWinRate = aPlusData ? aPlusData.winRate : 0;
  const bcTrades = trades.filter(t => (t.planFidelity || '').toLowerCase().includes('b-c') || (t.planFidelity || '').toLowerCase() === 'fomo' || (t.planFidelity || '').toLowerCase() === 'c');
  const bcNetR = bcTrades.reduce((s, t) => s + (t.rr || 0), 0);
  const bCEliminationBoostR = bcNetR < 0 ? Math.abs(Math.round(bcNetR * 100) / 100) : 0;

  // 13. Session & Direction Cross Matrix
  const sessDirMap: Record<string, { session: string; direction: 'LONG' | 'SHORT'; total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  trades.forEach(t => {
    const sess = t.session || 'Genel';
    const key = `${sess}__${t.type}`;
    if (!sessDirMap[key]) sessDirMap[key] = { session: sess, direction: t.type, total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    sessDirMap[key].total++;
    if (t.status === 'WIN') sessDirMap[key].wins++;
    sessDirMap[key].netR += valR;
    if (valR > 0) sessDirMap[key].posR += valR;
    if (valR < 0) sessDirMap[key].negR += Math.abs(valR);
  });

  const sessionDirectionStats = Object.values(sessDirMap).map(d => ({
    session: d.session,
    direction: d.direction,
    total: d.total,
    wins: d.wins,
    winRate: Math.round((d.wins / d.total) * 1000) / 10,
    netR: Math.round(d.netR * 100) / 100,
    avgR: Math.round((d.netR / d.total) * 100) / 100,
    profitFactor: Math.round(calculateProfitFactor(toRR(d.posR), toRR(d.negR)) * 100) / 100,
  })).sort((a, b) => b.netR - a.netR);

  // 14. Discipline Alpha
  let highQualityCount = 0;
  let highQualityWins = 0;
  let highQualityNetR = 0;
  let lowQualityCount = 0;
  let lowQualityNetR = 0;

  trades.forEach(t => {
    const pf = (t.planFidelity || '').toLowerCase();
    const valR = t.rr || 0;
    const isWin = t.status === 'WIN';
    const isHigh = pf === 'a+' || pf === 'a' || pf === 'tam' || pf.includes('sadık') || pf.includes('uygun') || pf.includes('kusursuz');
    const isLow = pf === 'b-c' || pf === 'c' || pf === 'fomo' || pf.includes('ihlal') || pf.includes('disiplinsiz') || pf.includes('intikam');

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

  // 15. Confluence Factor Analysis
  const countConfluences = (t: Trade): number => {
    let score = 0;
    if (t.liquiditySweeps && t.liquiditySweeps.length > 0) score += t.liquiditySweeps.length;
    else if (t.liquiditySweep) score += 1;
    if (t.confirmations && t.confirmations.length > 0) score += t.confirmations.length;
    if (t.premiumDiscount) score += 1;
    if (t.trend && (t.trend.toLowerCase().includes('continuation') || t.trend.toLowerCase().includes('devam'))) score += 1;
    if (t.planFidelity && (t.planFidelity.toLowerCase() === 'a+' || t.planFidelity.toLowerCase() === 'tam')) score += 1;
    return score;
  };

  const confGroup1 = trades.filter(t => countConfluences(t) <= 1);
  const confGroup2 = trades.filter(t => countConfluences(t) === 2 || countConfluences(t) === 3);
  const confGroup3 = trades.filter(t => countConfluences(t) >= 4);

  const confluenceBrackets = [
    { label: 'Düşük Onay (0 - 1 Onay)', ...calcBucket(confGroup1, 'Düşük Onay (0 - 1 Onay)') },
    { label: 'Orta Onay (2 - 3 Onay)', ...calcBucket(confGroup2, 'Orta Onay (2 - 3 Onay)') },
    { label: 'Yüksek Onay (4+ Onay)', ...calcBucket(confGroup3, 'Yüksek Onay (4+ Onay)') },
  ];

  let sweetSpotInsight = 'Konfluans sayısı arttıkça başarı oranınız burada test edilir.';
  if (confGroup3.length >= 2 && confGroup1.length >= 2) {
    const highWR = confluenceBrackets[2].winRate;
    const lowWR = confluenceBrackets[0].winRate;
    sweetSpotInsight = `4 ve üzeri onay ile girilen işlemlerde kazanma oranınız %${highWR} seviyesine çıkarken, tek onaylı işlemlerde %${lowWR} seviyesinde kalıyor.`;
  }

  // 16. Day of the Week Analytics
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const dayMap: Record<number, { total: number; wins: number; netR: number; posR: number; negR: number }> = {};
  
  trades.forEach(t => {
    const day = getTradeNyWeekday(t);
    if (!dayMap[day]) dayMap[day] = { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const valR = t.rr || 0;
    dayMap[day].total++;
    if (t.status === 'WIN') dayMap[day].wins++;
    dayMap[day].netR += valR;
    if (valR > 0) dayMap[day].posR += valR;
    if (valR < 0) dayMap[day].negR += Math.abs(valR);
  });

  const dayOfWeekStats = [1, 2, 3, 4, 5].map(dayIndex => {
    const data = dayMap[dayIndex] || { total: 0, wins: 0, netR: 0, posR: 0, negR: 0 };
    const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
    const avgR = data.total > 0 ? data.netR / data.total : 0;
    const pf = calculateProfitFactor(toRR(data.posR), toRR(data.negR));
    return {
      dayIndex,
      dayName: dayNames[dayIndex],
      total: data.total,
      wins: data.wins,
      winRate: Math.round(winRate * 10) / 10,
      netR: Math.round(data.netR * 100) / 100,
      avgR: Math.round(avgR * 100) / 100,
      profitFactor: Math.round(pf * 100) / 100,
    };
  });

  // 17. Stop Size Volatility Brackets (<10p, 10-25p, >25p)
  const tightStopTrades = trades.filter(t => (t.stopPips || 0) > 0 && (t.stopPips || 0) < 10);
  const mediumStopTrades = trades.filter(t => (t.stopPips || 0) >= 10 && (t.stopPips || 0) <= 25);
  const wideStopTrades = trades.filter(t => (t.stopPips || 0) > 25);

  const stopSizeBrackets = [
    { label: 'Sıkı Stop (< 10 Pip)', ...calcBucket(tightStopTrades, 'Sıkı Stop (< 10 Pip)') },
    { label: 'Standart Stop (10 - 25 Pip)', ...calcBucket(mediumStopTrades, 'Standart Stop (10 - 25 Pip)') },
    { label: 'Geniş Stop (> 25 Pip)', ...calcBucket(wideStopTrades, 'Geniş Stop (> 25 Pip)') },
  ];

  let stopSizeInsight = 'Stop mesafesi dağılımı inceleniyor.';
  if (tightStopTrades.length >= 2 && mediumStopTrades.length >= 2) {
    if (stopSizeBrackets[0].avgR > stopSizeBrackets[1].avgR) {
      stopSizeInsight = `Sıkı Stop (<10 Pip) işlemleri ortalama ${stopSizeBrackets[0].avgR} R getiri ile en yüksek risk/ödül verimliliğine sahip.`;
    }
  }

  // 18. Streak & Post-Loss / Tilt Analytics
  const sortedChronological = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;

  let postWinTotal = 0;
  let postWinWins = 0;
  let postLossTotal = 0;
  let postLossWins = 0;

  for (let i = 0; i < sortedChronological.length; i++) {
    const t = sortedChronological[i];
    if (t.status === 'WIN') {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWinStreak) maxWinStreak = tempWin;
    } else if (t.status === 'LOSS') {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    } else {
      tempWin = 0;
      tempLoss = 0;
    }

    if (i > 0) {
      const prev = sortedChronological[i - 1];
      if (prev.status === 'WIN') {
        postWinTotal++;
        if (t.status === 'WIN') postWinWins++;
      } else if (prev.status === 'LOSS') {
        postLossTotal++;
        if (t.status === 'WIN') postLossWins++;
      }
    }
  }

  if (sortedChronological.length > 0) {
    const last = sortedChronological[sortedChronological.length - 1];
    if (last.status === 'WIN') {
      currentStreakType = 'WIN';
      currentStreakCount = tempWin;
    } else if (last.status === 'LOSS') {
      currentStreakType = 'LOSS';
      currentStreakCount = tempLoss;
    }
  }

  const postWinWinRate = postWinTotal > 0 ? Math.round((postWinWins / postWinTotal) * 1000) / 10 : overallWinRate;
  const postLossWinRate = postLossTotal > 0 ? Math.round((postLossWins / postLossTotal) * 1000) / 10 : overallWinRate;

  let postLossTiltRisk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' = 'DÜŞÜK';
  if (postLossTotal >= 3) {
    if (postLossWinRate < overallWinRate - 15) postLossTiltRisk = 'YÜKSEK';
    else if (postLossWinRate < overallWinRate - 5) postLossTiltRisk = 'ORTA';
  }

  let streakInsight = 'Kayıp ve galibiyet ardışıklık dinamikleriniz dengeli.';
  if (postLossTiltRisk === 'YÜKSEK') {
    streakInsight = `Dikkat: Mağlubiyet sonrasında aldığınız işlemlerde kazanma oranınız %${postLossWinRate} seviyesine çakılıyor! Kayıp sonrası ekran başından kalkıp mola vermek hesabınızı koruyacaktır.`;
  } else if (postWinWinRate > overallWinRate + 10) {
    streakInsight = `Kazanç serisi momentumunuz yüksek: Kazanç sonrası işlemlerinizin %${postWinWinRate}'i yine galibiyetle sonuçlanıyor.`;
  }

  // 19. Monte Carlo Prop Firm & Drawdown Risk Simulation (500 runs of 50 trades)
  let monteCarloSimulation: StrategyAnalyticsResult['monteCarloSimulation'] = {
    hasData: false,
    simulatedDrawdownRisk4Percent: 0,
    simulatedDrawdownRisk8Percent: 0,
    simulatedProbHitting10R: 0,
    expectedMaxLosingStreak: 0,
    medianFinalR: 0,
    simulatedCurves: [],
    insight: 'En az 5 işlem verisi gereklidir.',
  };

  if (trades.length >= 5) {
    // Bootstrap directly from the recorded R outcomes (wins, losses AND breakevens) so the win rate and payoff
    // distribution stay consistent. A seeded PRNG keeps the result stable between renders.
    const rDistribution = trades.map(t => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0));
    let seed = (trades.length * 2654435761 + Math.round(rDistribution.reduce((a, b) => a + b, 0) * 1000)) >>> 0;
    const rand = () => {
      seed = (seed + 0x6D2B79F5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    let dd4Count = 0;
    let dd8Count = 0;
    let hit10RCount = 0;
    const finalRs: number[] = [];
    const maxLossStreaks: number[] = [];
    const sampleCurves: number[][] = [];

    const RUNS = 400;
    const STEPS = 50;

    for (let r = 0; r < RUNS; r++) {
      let equity = 0;
      let peak = 0;
      let maxDD = 0;
      let curLossStreak = 0;
      let maxLossRun = 0;
      let hit10 = false;
      const curve: number[] = [0];

      for (let s = 0; s < STEPS; s++) {
        const delta = rDistribution[Math.floor(rand() * rDistribution.length)];
        if (delta < 0) {
          curLossStreak++;
          if (curLossStreak > maxLossRun) maxLossRun = curLossStreak;
        } else {
          curLossStreak = 0;
        }

        equity += delta;
        curve.push(Math.round(equity * 10) / 10);
        if (equity > peak) peak = equity;
        const dd = peak - equity;
        if (dd > maxDD) maxDD = dd;
        if (equity >= 10) hit10 = true;
      }

      if (maxDD >= 4) dd4Count++;
      if (maxDD >= 8) dd8Count++;
      if (hit10) hit10RCount++;
      finalRs.push(equity);
      maxLossStreaks.push(maxLossRun);

      if (r < 5) sampleCurves.push(curve);
    }

    finalRs.sort((a, b) => a - b);
    maxLossStreaks.sort((a, b) => a - b);

    const medianR = finalRs[Math.floor(finalRs.length * 0.5)];
    const medianLossRun = maxLossStreaks[Math.floor(maxLossStreaks.length * 0.5)];
    const probDD4 = Math.round((dd4Count / RUNS) * 100);
    const probDD8 = Math.round((dd8Count / RUNS) * 100);
    const probHit10 = Math.round((hit10RCount / RUNS) * 100);

    monteCarloSimulation = {
      hasData: true,
      simulatedDrawdownRisk4Percent: probDD4,
      simulatedDrawdownRisk8Percent: probDD8,
      simulatedProbHitting10R: probHit10,
      expectedMaxLosingStreak: medianLossRun,
      medianFinalR: Math.round(medianR * 10) / 10,
      simulatedCurves: sampleCurves,
      insight: `Monte Carlo analizi (kayıtlı R dağılımından): gelecek 50 işlemde 8R'lik bir drawdown görme olasılığınız %${probDD8}, +10R'ye ulaşma olasılığınız %${probHit10}. R'yi hesap yüzdesine çevirmek için risk oranınızla çarpın (örn. %0.75 risk ile 8R ≈ %6).`,
    };
  }

  // 20. Negative Edge Bleed / Kırmızı Bayraklar (Otomatik Eliminasyon Kuralları)
  const redFlagRules: StrategyAnalyticsResult['redFlagRules'] = [];

  // Check Reversals
  if (reversalCostR >= 1.5) {
    redFlagRules.push({
      id: 'no_reversal',
      severity: 'CRITICAL',
      rule: 'Trend Tersi (Reversal) İşlemleri Yasakla',
      lossR: reversalCostR,
      tradeCount: trendRanking.find(t => t.trend.toLowerCase().includes('reversal'))?.total || 0,
      recommendation: 'Sadece trend yönü (Continuation) işlemlerine izin verin; dönüş kovalamayın.',
    });
  }

  // Check B-C setups
  if (bCEliminationBoostR >= 1.5) {
    redFlagRules.push({
      id: 'no_bc_setups',
      severity: 'CRITICAL',
      rule: 'B-C / FOMO Kalitesindeki Setupları Tamamen Ele',
      lossR: bCEliminationBoostR,
      tradeCount: bcTrades.length,
      recommendation: 'Yalnızca A+ ve A kalitedeki disiplinli kurgulara emir girin.',
    });
  }

  // Check Worst Session / Worst Asset
  const worstSession = sessionDirectionStats.find(s => s.netR <= -2.0 && s.total >= 2);
  if (worstSession) {
    redFlagRules.push({
      id: 'toxic_session',
      severity: 'WARNING',
      rule: `${worstSession.session} ${worstSession.direction} İşlemlerini Durdur`,
      lossR: Math.abs(worstSession.netR),
      tradeCount: worstSession.total,
      recommendation: `${worstSession.session} seansında ${worstSession.direction} yönlü istatistiğiniz negatif; bu seansı pas geçin.`,
    });
  }

  // Check Wide Asia Range if negative
  if (asiaBrackets.wide.count >= 2 && asiaBrackets.wide.netR < 0) {
    redFlagRules.push({
      id: 'wide_asia_filter',
      severity: 'WARNING',
      rule: 'Geniş Asia Range (parite medyanının >1.25 katı) Günlerinde İşlem Alma',
      lossR: Math.abs(asiaBrackets.wide.netR),
      tradeCount: asiaBrackets.wide.count,
      recommendation: 'Geniş Asia range günlerinde bu veride beklenti negatif; örneklem küçükse yeni veriyle doğrula, ardından filtre olarak düşün.',
    });
  }

  // 21. Golden Setup
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

  // Generate top actionable insights
  const actionableInsights: StrategyAnalyticsResult['actionableInsights'] = [];

  if (tightStopRecommendation) {
    actionableInsights.push({
      type: 'opportunity',
      title: 'Stop Loss Optimizasyonu (MAE)',
      description: tightStopRecommendation.insight,
      metricTag: `+${tightStopRecommendation.potentialRrBoostPercent}% Potansiyel R/R`,
    });
  }

  if (missedProfitTrades.length > 0) {
    const totalLostFromMissed = missedProfitTrades.reduce((s, t) => s + Math.abs(t.rr || 0), 0);
    actionableInsights.push({
      type: 'warning',
      title: 'Masada Bırakılan Kâr & Trailing Stop Eksikliği',
      description: `${missedProfitTrades.length} adet işlemde fiyat lehinize derin gitmesine rağmen (yüksek MFE) işlem kârsız kapandı. Kısmi kâr (Partial TP) almak veya başabaşa çekme (BE) kurallarını netleştirmek sizi korur.`,
      metricTag: `${missedProfitTrades.length} İşlem Sızıntısı (-${totalLostFromMissed.toFixed(1)}R)`,
    });
  }

  if (tpTargetRanking.length > 0) {
    const bestTp = tpTargetRanking[0];
    if (bestTp.total >= 2 && bestTp.netR > 0) {
      actionableInsights.push({
        type: 'positive',
        title: 'TP Target Kenarı',
        description: `"${bestTp.target}" hedefine yönelttiğiniz işlemler %${bestTp.winRate} kazanma oranı ve +${bestTp.netR} R getiri üretiyor!`,
        metricTag: `+%${bestTp.winRate} WR`,
      });
    }
  }

  if (confluenceBrackets[2].count >= 2 && confluenceBrackets[2].winRate >= 60) {
    actionableInsights.push({
      type: 'positive',
      title: 'Yüksek Konfluans Gücü (4+ Onay)',
      description: sweetSpotInsight,
      metricTag: `%${confluenceBrackets[2].winRate} Win Rate`,
    });
  }

  if (disciplineAlphaR > 0.5) {
    actionableInsights.push({
      type: 'opportunity',
      title: 'B-C / FOMO Filtreleme Kazancı',
      description: `B-C kalitesindeki ya da plan dışı işlemleri tamamen elerseniz hesabınız tam +${disciplineAlphaR.toFixed(1)}R daha kârda olacaktı!`,
      metricTag: `+${disciplineAlphaR.toFixed(1)}R Disiplin Deltası`,
    });
  }

  // 22. Asset Stats (Parite Bazında Edge)
  const assetRanking = buildRankings(t => [t.asset || 'Belirtilmemiş']).map(r => ({
    asset: r.key,
    total: r.total,
    wins: r.wins,
    winRate: r.winRate,
    netR: r.netR,
    avgR: r.avgR,
    profitFactor: r.profitFactor,
  }));

  // 23. Account Category Stats (Funded vs Challenge vs Demo)
  const accountCategoryRanking = buildRankings(t => [t.accountCategory || (t.platform ? getTradeAccountCategory({ platform: t.platform }) : 'FUNDED')]).map(r => ({
    category: r.key,
    total: r.total,
    wins: r.wins,
    winRate: r.winRate,
    netR: r.netR,
    avgR: r.avgR,
    profitFactor: r.profitFactor,
  }));

  // 24. Detailed Mistake & Loss Leak Breakdown
  const bCTrades = trades.filter(t => (t.planFidelity || '').toUpperCase() === 'B-C');
  const bCLossTrades = bCTrades.filter(t => (t.rr || 0) < 0);
  const bCLeakR = Math.round(Math.abs(bCLossTrades.reduce((s, t) => s + (t.rr || 0), 0)) * 100) / 100;

  const counterTrendTrades = trades.filter(t => (t.trend || '').toLowerCase() === 'reversal');
  const counterTrendLossTrades = counterTrendTrades.filter(t => (t.rr || 0) < 0);
  const counterTrendLeakR = Math.round(Math.abs(counterTrendLossTrades.reduce((s, t) => s + (t.rr || 0), 0)) * 100) / 100;

  const wrongZoneTrades = trades.filter(t => {
    const z = (t.premiumDiscount || '').toLowerCase();
    return (t.type === 'LONG' && z.includes('premium')) || (t.type === 'SHORT' && z.includes('discount'));
  });
  const wrongZoneLossTrades = wrongZoneTrades.filter(t => (t.rr || 0) < 0);
  const wrongZoneLeakR = Math.round(Math.abs(wrongZoneLossTrades.reduce((s, t) => s + (t.rr || 0), 0)) * 100) / 100;

  const lowConfTrades = trades.filter(t => countConfluences(t) <= 1);
  const lowConfLossTrades = lowConfTrades.filter(t => (t.rr || 0) < 0);
  const lowConfluenceLeakR = Math.round(Math.abs(lowConfLossTrades.reduce((s, t) => s + (t.rr || 0), 0)) * 100) / 100;

  const preventableLossTradeIds = new Set<string>();
  [...bCLossTrades, ...counterTrendLossTrades, ...wrongZoneLossTrades, ...lowConfLossTrades].forEach(t => {
    if (t.id) preventableLossTradeIds.add(t.id);
  });
  const preventableLossTrades = trades.filter(t => preventableLossTradeIds.has(t.id));
  const preventableLeakTotalR = Math.round(Math.abs(preventableLossTrades.reduce((s, t) => s + (t.rr || 0), 0)) * 100) / 100;

  const cleanTrades = trades.filter(t => !preventableLossTradeIds.has(t.id));
  const potentialNetR = Math.round(cleanTrades.reduce((s, t) => s + (t.rr || 0), 0) * 100) / 100;
  const potentialWins = cleanTrades.filter(t => t.status === 'WIN').length;
  const potentialWinRate = cleanTrades.length > 0 ? Math.round((potentialWins / cleanTrades.length) * 1000) / 10 : overallWinRate;

  const leakCategories = [
    {
      category: 'Düşük Kalite Kurulum',
      title: 'B-C / Zorlama Setup Girişleri',
      count: bCTrades.length,
      lostR: bCLeakR,
      winRate: bCTrades.length > 0 ? Math.round((bCTrades.filter(t => t.status === 'WIN').length / bCTrades.length) * 1000) / 10 : 0,
      fixAdvice: 'Yalnızca A+ ve A kalite setup şartları sağlandığında pozisyona girin; B-C kurulumları derhal filtreleyin.',
    },
    {
      category: 'Ters Trend Girişi',
      title: 'Trende Karşı Erken Bıçak Tutma',
      count: counterTrendTrades.length,
      lostR: counterTrendLeakR,
      winRate: counterTrendTrades.length > 0 ? Math.round((counterTrendTrades.filter(t => t.status === 'WIN').length / counterTrendTrades.length) * 1000) / 10 : 0,
      fixAdvice: 'Dönüş (reversal) yerine ana trend devamı (continuation) kurulumlarına odaklanarak kazanma oranınızı koruyun.',
    },
    {
      category: 'Yanlış Fiyat Bölgesi',
      title: 'Premiumda Long / Discountta Short',
      count: wrongZoneTrades.length,
      lostR: wrongZoneLeakR,
      winRate: wrongZoneTrades.length > 0 ? Math.round((wrongZoneTrades.filter(t => t.status === 'WIN').length / wrongZoneTrades.length) * 1000) / 10 : 0,
      fixAdvice: 'Pahalı (Premium) bölgede Long, ucuz (Discount) bölgede Short arama hatasından kaçının; daima likidite havuzunu bekleyin.',
    },
    {
      category: 'Yetersiz Konfluans',
      title: '0-1 Onayla Acele Pozisyona Girme',
      count: lowConfTrades.length,
      lostR: lowConfluenceLeakR,
      winRate: lowConfTrades.length > 0 ? Math.round((lowConfTrades.filter(t => t.status === 'WIN').length / lowConfTrades.length) * 1000) / 10 : 0,
      fixAdvice: 'En az 3 bağımsız ICT teyidi (HTF + Likidite Süpürmesi + FVG/IFVG) oluşmadan tetiğe basmayın.',
    },
  ];

  const totalLeakR = Math.round((bCLeakR + counterTrendLeakR + wrongZoneLeakR + lowConfluenceLeakR) * 100) / 100;

  const mistakeStats = {
    totalLeakR,
    bCLeakR,
    counterTrendLeakR,
    wrongZoneLeakR,
    lowConfluenceLeakR,
    preventableLeakTotalR,
    potentialNetR,
    potentialWinRate,
    leaks: leakCategories,
  };

  return {
    totalTrades,
    overallScore: {
      score: normalizedScore,
      grade,
      winRate: overallWinRate,
      profitFactor: overallProfitFactor,
      netR: overallNetR,
      expectancy: overallExpectancy,
    },
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
    tpTargetStats: {
      hasData: tpTargetTrades.length > 0,
      ranking: tpTargetRanking,
      insight: tpTargetInsight,
    },
    premiumDiscountStats: {
      hasData: zoneRanking.length > 0,
      ranking: zoneRanking,
      zoneDirectionMatrix,
      insight: zoneInsight,
    },
    newsDayStats: {
      hasData: newsKnownTrades.length > 0,
      ranking: newsRanking,
      unknownCount: trades.length - newsKnownTrades.length,
      insight: newsInsight,
    },
    confirmationStats: {
      hasData: confirmationRanking.length > 0,
      ranking: confirmationRanking,
      multiConfirmationWinRate,
    },
    setupQualityStats: {
      ranking: setupQualityRanking,
      onlyAPlusNetR: Math.round(onlyAPlusNetR * 100) / 100,
      onlyAPlusWinRate: Math.round(onlyAPlusWinRate * 10) / 10,
      bCEliminationBoostR,
    },
    sessionDirectionStats,
    disciplineStats: {
      highQualityTradesCount: highQualityCount,
      highQualityNetR: Math.round(highQualityNetR * 100) / 100,
      highQualityWinRate: highQualityCount > 0 ? Math.round((highQualityWins / highQualityCount) * 1000) / 10 : 0,
      lowQualityTradesCount: lowQualityCount,
      lowQualityNetR: Math.round(lowQualityNetR * 100) / 100,
      disciplineAlphaR,
    },
    confluenceStats: {
      hasData: trades.length >= 2,
      brackets: confluenceBrackets,
      sweetSpotInsight,
    },
    dayOfWeekStats,
    stopSizeStats: {
      hasData: tradesWithStop.length > 0,
      brackets: stopSizeBrackets,
      insight: stopSizeInsight,
    },
    streakStats: {
      currentStreak: { type: currentStreakType, count: currentStreakCount },
      maxWinStreak,
      maxLossStreak,
      postWinWinRate,
      postLossWinRate,
      postLossTiltRisk,
      insight: streakInsight,
    },
    monteCarloSimulation,
    redFlagRules,
    goldenSetup,
    actionableInsights,
    assetStats: assetRanking,
    accountCategoryStats: accountCategoryRanking,
    mistakeStats,
  };
}
