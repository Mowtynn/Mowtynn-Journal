import { Trade } from '../types';
import { calculateProfitFactor, toRR } from './statMath';
import { getTradeAccountCategory, getNewsDayLabels } from '../constants/constants';
import { getTradeHourBucket, getTradeNyWeekday } from './tradingTime';
import { bucketAsiaRanges, edgeFromR } from './asiaAnalytics';
import { isLowQualitySetup, setupQualityTier } from './discipline';

/** Bir grup hakkında yorum/kural üretmek için gereken en az işlem sayısı — projenin tek eşiği (src/lib/sampleSize.ts). */
import { MIN_SAMPLE, EDGE_PROOF_MIN } from './sampleSize';
import { signalStrength } from './setupScorecard';
export { MIN_SAMPLE };

export interface StrategyAnalyticsResult {
  totalTrades: number;
  overallScore: {
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
    missedProfitTradesCount: number; // MFE ≥ 1R (stop mesafesi) ama BE / Loss kapanan işlemler
    missedProfitTrades: Trade[];
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

  // 9. Target (çıkış hedefi) analizi
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
    midQualityTradesCount: number;
    midQualityNetR: number;
    lowQualityTradesCount: number;
    lowQualityNetR: number;
    disciplineAlphaR: number; // Potential R saved by avoiding low quality/FOMO trades
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
    /** %95 aralık sıfırın üstünde VE en az EDGE_PROOF_MIN işlem: kanıtlı; değilse erken sinyal */
    confirmed: boolean;
  };
  actionableInsights: Array<{
    type: 'positive' | 'warning' | 'opportunity';
    title: string;
    description: string;
    metricTag: string;
  }>;

  // 23. Asset & Instrument Edge (Parite Bazında Performans)
  assetStats: Array<{
    asset: string;
    total: number;
    wins: number;
    losses: number;
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

/** Küçük örneklemli sıralama cümlelerine eklenen not (EDGE_PROOF_MIN altı = erken sinyal) */
const earlyNote = (n: number) => (n < EDGE_PROOF_MIN ? ` Erken sinyal (${n}/${EDGE_PROOF_MIN} işlem): kural yapmadan önce doğrula.` : '');

/** Wilson %95 aralığının üst sınırı (oran 0–1) */
const wilsonUpper = (wins: number, n: number) => {
  if (n <= 0) return 1;
  const z = 1.96, p = wins / n, d = 1 + (z * z) / n;
  return Math.min(1, ((p + (z * z) / (2 * n)) + z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d);
};

export function calculateStrategyAnalytics(trades: Trade[]): StrategyAnalyticsResult {
  const totalTrades = trades.length;

  const defaultEmptyResult: StrategyAnalyticsResult = {
    totalTrades: 0,
    overallScore: { winRate: 0, profitFactor: 0, netR: 0, expectancy: 0 },
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
    entryModelStats: { hasData: false, ranking: [] },
    trendStats: { hasData: false, ranking: [], reversalCostR: 0, continuationEdgeR: 0 },
    timeframeMatrix: [],
    hourlyStats: [],
    tpTargetStats: { hasData: false, ranking: [], insight: 'Target (çıkış hedefi) verisi bulunamadı.' },
    premiumDiscountStats: { hasData: false, ranking: [], zoneDirectionMatrix: [], insight: 'Zone verisi bulunamadı.' },
    newsDayStats: { hasData: false, ranking: [], unknownCount: 0, insight: 'News Day / Bank Holiday verisi bulunamadı.' },
    confirmationStats: { hasData: false, ranking: [], multiConfirmationWinRate: 0 },
    setupQualityStats: { ranking: [], onlyAPlusNetR: 0, onlyAPlusWinRate: 0, bCEliminationBoostR: 0 },
    sessionDirectionStats: [],
    disciplineStats: {
      highQualityTradesCount: 0,
      highQualityNetR: 0,
      highQualityWinRate: 0,
      midQualityTradesCount: 0,
      midQualityNetR: 0,
      lowQualityTradesCount: 0,
      lowQualityNetR: 0,
      disciplineAlphaR: 0,
    },
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
    redFlagRules: [],
    goldenSetup: { hasFormula: false, description: 'Yeterli işlem verisi yok.', winRate: 0, netR: 0, sampleSize: 0, confirmed: false },
    actionableInsights: [],
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

  // 2. MFE Analytics
  // MFE = 0 da geçerli bir ölçüm: dışarıda bırakılırsa ortalama MFE olduğundan yüksek çıkar
  const tradesWithMfe = trades.filter(t => typeof t.mfePips === 'number' && !isNaN(t.mfePips) && t.mfePips >= 0);
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

  // Yakalama oranı ve masada kalan kâr aynı işlemler üzerinden: hem MFE hem TP'si girilmiş kazananlar.
  // (Eskiden tüm işlemlerin TP ortalaması, yalnızca kazananların MFE ortalamasına bölünüyordu; iki farklı küme.)
  const pairedWins = mfeWins.filter(t => typeof t.tpPips === 'number' && t.tpPips > 0 && (t.mfePips || 0) > 0);
  const pairedMfe = pairedWins.reduce((s, t) => s + (t.mfePips || 0), 0);
  const pairedTp = pairedWins.reduce((s, t) => s + Math.min(t.tpPips || 0, t.mfePips || 0), 0);
  const mfeRealizationRate = pairedMfe > 0 ? Math.min(100, Math.round((pairedTp / pairedMfe) * 100)) : 0;
  const leftOnTheTablePips = pairedWins.length > 0
    ? Math.round((pairedWins.reduce((s, t) => s + Math.max(0, (t.mfePips || 0) - (t.tpPips || 0)), 0) / pairedWins.length) * 10) / 10
    : 0;

  // Kârsız kapanan ama en az 1R (kendi stop mesafesi kadar) lehte gitmiş işlemler. Sabit pip eşiği pariteler arasında anlamsızdı.
  const missedProfitTrades = tradesWithMfe.filter(t => {
    const isBeOrLoss = t.status === 'BREAKEVEN' || t.status === 'LOSS';
    return isBeOrLoss && typeof t.stopPips === 'number' && t.stopPips > 0 && (t.mfePips || 0) >= t.stopPips;
  });

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
  if (tradesWithAsia.length >= MIN_SAMPLE) {
    const list = [asiaBrackets.tight, asiaBrackets.medium, asiaBrackets.wide].filter(b => b.count >= MIN_SAMPLE);
    list.sort((a, b) => b.avgR - a.avgR);
    if (list.length > 0) {
      bestAsiaBracket = list[0].label;
      asiaInsight = `İşlem başına en yüksek beklenti ${bestAsiaBracket} aralığında (${list[0].avgR >= 0 ? '+' : ''}${list[0].avgR} R, ${list[0].count} işlem).${earlyNote(list[0].count)} Güven aralıkları için Asia Edge Lab'e bakın.`;
    } else {
      asiaInsight = `Her aralıkta en az ${MIN_SAMPLE} işlem birikince kıyas yapılır.`;
    }
  }

  // Helper for ranking calculation
  const buildRankings = (groupBy: (t: Trade) => string[]) => {
    const map: Record<string, { total: number; wins: number; losses: number; netR: number; posR: number; negR: number }> = {};
    trades.forEach(t => {
      const keys = groupBy(t);
      const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
      const valR = t.rr || 0;
      const isWin = t.status === 'WIN';

      uniqueKeys.forEach(k => {
        if (!map[k]) map[k] = { total: 0, wins: 0, losses: 0, netR: 0, posR: 0, negR: 0 };
        map[k].total++;
        if (isWin) map[k].wins++;
        else if (t.status === 'LOSS') map[k].losses++;
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
        losses: data.losses,
        winRate: Math.round(winRate * 10) / 10,
        netR: Math.round(data.netR * 100) / 100,
        avgR: Math.round(avgR * 100) / 100,
        profitFactor: Math.round(pf * 100) / 100,
      };
    }).sort((a, b) => b.netR - a.netR);
  };

  // 5. Entry Models Breakdown
  const entryModelRanking = buildRankings(t => (Array.isArray(t.entryModels) ? t.entryModels : [])).map(r => ({ model: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

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

  // 9. Target (çıkış hedefi) analizi
  const tpTargetTrades = trades.filter(t => Array.isArray(t.tpTargets) && t.tpTargets.length > 0);
  const tpTargetRanking = buildRankings(t => (Array.isArray(t.tpTargets) ? t.tpTargets : []))
    .map(r => ({ target: r.key, total: r.total, wins: r.wins, winRate: r.winRate, netR: r.netR, avgR: r.avgR, profitFactor: r.profitFactor }));

  let tpTargetInsight = 'İşlem eklerken Target (çıkış hedefi) seçtiğinizde hangi çıkış hedefinin size kazandırdığı burada görünecektir.';
  const tpReliable = tpTargetRanking.filter(r => r.total >= MIN_SAMPLE).sort((a, b) => b.avgR - a.avgR);
  if (tpReliable.length > 0) {
    const topTp = tpReliable[0];
    tpTargetInsight = `En az ${MIN_SAMPLE} işlemli hedefler içinde işlem başına en yüksek beklenti "${topTp.target}" (${topTp.avgR >= 0 ? '+' : ''}${topTp.avgR} R, %${topTp.winRate} WR, ${topTp.total} işlem).${earlyNote(topTp.total)}`;
  } else if (tpTargetRanking.length > 0) {
    tpTargetInsight = `Hiçbir çıkış hedefi (Target) ${MIN_SAMPLE} işleme ulaşmadı; sıralama henüz güvenilir değil.`;
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

  let zoneInsight = 'Confirmations alanı girildikçe değer × yön performansı burada listelenir.';
  const zoneReliable = zoneDirectionMatrix.filter(z => z.total >= MIN_SAMPLE).sort((a, b) => b.avgR - a.avgR);
  if (zoneReliable.length > 0) {
    const z = zoneReliable[0];
    zoneInsight = `En az ${MIN_SAMPLE} işlemli gruplar içinde en yüksek beklenti: ${z.zone} ${z.direction} (${z.avgR >= 0 ? '+' : ''}${z.avgR} R/işlem, %${z.winRate} WR, ${z.total} işlem).${earlyNote(z.total)}`;
  } else if (zoneDirectionMatrix.length > 0) {
    zoneInsight = `Hiçbir bölge × yön grubu ${MIN_SAMPLE} işleme ulaşmadı; kıyas henüz güvenilir değil.`;
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
    const small = Math.min(newsYesRow.total, newsNoRow.total) < EDGE_PROOF_MIN;
    newsInsight = `${newsLabels.yes}: işlem başına ${newsYesRow.avgR >= 0 ? '+' : ''}${newsYesRow.avgR} R (%${newsYesRow.winRate} WR, ${newsYesRow.total} işlem) — ${newsLabels.no}: ${newsNoRow.avgR >= 0 ? '+' : ''}${newsNoRow.avgR} R (%${newsNoRow.winRate} WR, ${newsNoRow.total} işlem). Fark ${diff >= 0 ? '+' : ''}${diff} R.${small ? ` Gruplardan biri ${EDGE_PROOF_MIN} işlemden az; fark henüz erken sinyal.` : ''}`;
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

  // "Yalnızca yüksek kalite": kademe tanımıyla (A+, Tam, Kusursuz …) — etiket yazımına bağlı değil
  const highTrades = trades.filter(t => setupQualityTier(t.planFidelity) === 'high');
  const onlyAPlusNetR = highTrades.reduce((s, t) => s + (t.rr || 0), 0);
  const onlyAPlusWinRate = highTrades.length ? (highTrades.filter(t => t.status === 'WIN').length / highTrades.length) * 100 : 0;
  // Düşük kalite: Disiplin paneliyle AYNI tanım (tek kaynak)
  const isLowQuality = (t: Trade) => isLowQualitySetup(t.planFidelity);
  const bcTrades = trades.filter(isLowQuality);
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

  let midQualityCount = 0;
  let midQualityNetR = 0;
  // Kademe tek kaynaktan (setupQualityTier): A+ yüksek · A orta · B-C / FOMO düşük
  trades.forEach(t => {
    const tier = setupQualityTier(t.planFidelity);
    const valR = t.rr || 0;
    if (tier === 'high') {
      highQualityCount++;
      if (t.status === 'WIN') highQualityWins++;
      highQualityNetR += valR;
    } else if (tier === 'mid') {
      midQualityCount++;
      midQualityNetR += valR;
    } else if (tier === 'low') {
      lowQualityCount++;
      lowQualityNetR += valR;
    }
  });

  const disciplineAlphaR = lowQualityNetR < 0 ? Math.abs(Math.round(lowQualityNetR * 100) / 100) : 0;

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

  let stopSizeInsight = `Pip eşikleri sabittir; farklı volatilitedeki pariteleri karıştırıyorsan Asia Edge Lab'i parite filtresiyle kullan. Her grupta en az ${MIN_SAMPLE} işlem olunca yorum yapılır.`;
  const stopReliable = stopSizeBrackets.filter(b => b.count >= MIN_SAMPLE).sort((a, b) => b.avgR - a.avgR);
  if (stopReliable.length >= 2) {
    stopSizeInsight = `İşlem başına en yüksek beklenti ${stopReliable[0].label} grubunda (${stopReliable[0].avgR} R, ${stopReliable[0].count} işlem).${earlyNote(stopReliable[0].count)}`;
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
  // YÜKSEK yalnızca istatistiksel olarak anlamlıysa: kayıp sonrası kazanma oranının %95 üst sınırı bile genel oranın altında.
  // Birkaç işlemlik dalgalanma (5 işlemde 1 işlem = 20 puan) tilt sayılmaz.
  if (postLossTotal >= MIN_SAMPLE) {
    if (wilsonUpper(postLossWins, postLossTotal) * 100 < overallWinRate) postLossTiltRisk = 'YÜKSEK';
    else if (postLossWinRate < overallWinRate - 10) postLossTiltRisk = 'ORTA';
  }

  let streakInsight = 'Kayıp ve galibiyet ardışıklık dinamikleriniz dengeli.';
  if (postLossTiltRisk === 'YÜKSEK') {
    streakInsight = `Dikkat: Kayıp sonrası işlemlerde kazanma oranın %${postLossWinRate} (genel %${overallWinRate}, ${postLossTotal} işlem) ve fark istatistiksel olarak anlamlı. Kayıptan sonra mola vermek hesabını korur.`;
  } else if (postLossTiltRisk === 'ORTA') {
    streakInsight = `Kayıp sonrası kazanma oranın %${postLossWinRate} (genel %${overallWinRate}, ${postLossTotal} işlem). Fark henüz kesin değil; izlemeye devam et.`;
  } else if (postWinTotal >= EDGE_PROOF_MIN && postWinWinRate > overallWinRate + 10) {
    streakInsight = `Kazanç serisi momentumunuz yüksek: Kazanç sonrası işlemlerinizin %${postWinWinRate}'i yine galibiyetle sonuçlanıyor.`;
  }

  // 19. (Monte Carlo kaldırıldı: geçme / ayakta kalma olasılığı Prop kartında, hesabın kendi kurallarıyla hesaplanır)

  // 20. Kırmızı Bayraklar: yalnızca en az MIN_SAMPLE işlemli ve NET beklentisi negatif gruplar (kazananlar dahil).
  // Eskiden 2 işlemle "yasakla" kuralı üretiliyor, kaybeden işlemler tek başına toplanıyordu.
  const redFlagRules: StrategyAnalyticsResult['redFlagRules'] = [];
  const groupNet = (list: Trade[]) => {
    const e = edgeFromR(list.map(t => t.rr || 0), list.map(t => t.status));
    return { n: e.n, netR: e.netR, avgR: e.expectancy, expHi: e.expHi };
  };
  const pushFlag = (id: string, rule: string, list: Trade[], recommendation: string) => {
    const g = groupNet(list);
    if (g.n < MIN_SAMPLE || g.netR >= 0) return;
    redFlagRules.push({
      id,
      // %95 aralığın üst sınırı da negatifse kritik, değilse uyarı
      severity: g.expHi < 0 ? 'CRITICAL' : 'WARNING',
      rule,
      lossR: Math.round(Math.abs(g.netR) * 100) / 100,
      tradeCount: g.n,
      recommendation: `${recommendation} (işlem başına ${g.avgR} R, ${g.n} işlem${g.expHi < 0 ? '; %95 güvenle negatif' : '; henüz kesin değil, yeni veriyle doğrula'})`,
    });
  };

  pushFlag('no_reversal', 'Trend tersi (Reversal) işlemleri', trades.filter(t => /reversal|dönüş|counter/i.test(t.trend || '')), 'Bu veride reversal işlemlerinin net getirisi negatif');
  pushFlag('no_bc_setups', 'Düşük kalite (B-C / FOMO) setuplar', bcTrades, 'Düşük kaliteli setupların net getirisi negatif');
  sessionDirectionStats
    .filter(sd => sd.session !== 'Genel')
    .forEach(sd => pushFlag(
      `session_${sd.session}_${sd.direction}`,
      `${sd.session} ${sd.direction} işlemleri`,
      trades.filter(t => (t.session || 'Genel') === sd.session && t.type === sd.direction),
      `${sd.session} seansında ${sd.direction} yönlü işlemlerin net getirisi negatif`,
    ));
  pushFlag('wide_asia_filter', 'Geniş Asia Range (parite medyanının >1.25 katı) günleri', wideTrades, 'Geniş Asia range günlerinde net getiri negatif');

  // 21. En iyi kombinasyon: parite + seans + Asia Range + giriş modeli; en az MIN_SAMPLE işlem, güven aralığı alt sınırına göre
  const comboMap: Record<string, { list: Trade[]; sampleDesc: string }> = {};
  trades.forEach(t => {
    const asset = t.asset || 'Genel';
    const session = t.session || 'Genel';
    const asiaRange = t.asiaRange || 'Asia Range yok';
    const model = Array.isArray(t.entryModels) && t.entryModels.length > 0 ? t.entryModels.join(' + ') : 'Model yok';
    const key = `${asset} | ${session} | ${asiaRange} | ${model}`;
    if (!comboMap[key]) comboMap[key] = { list: [], sampleDesc: `${asset} · ${session} · ${asiaRange} · ${model}` };
    comboMap[key].list.push(t);
  });

  const comboList = Object.values(comboMap)
    .filter(c => c.list.length >= MIN_SAMPLE)
    .map(c => ({ ...c, edge: edgeFromR(c.list.map(t => t.rr || 0), c.list.map(t => t.status)) }))
    .sort((a, b) => b.edge.expLo - a.edge.expLo);

  let goldenSetup = {
    hasFormula: false,
    description: `Aynı parite, seans, Asia Range ve giriş modeliyle en az ${MIN_SAMPLE} işlem biriktiğinde en güçlü kombinasyon burada görünür.`,
    winRate: 0,
    netR: 0,
    sampleSize: 0,
    confirmed: false,
  };

  if (comboList.length > 0 && comboList[0].edge.expectancy > 0) {
    const top = comboList[0];
    goldenSetup = {
      hasFormula: true,
      description: `${top.sampleDesc} — işlem başına ${top.edge.expectancy} R (%95 aralık ${top.edge.expLo} – ${top.edge.expHi})`,
      winRate: top.edge.winRate,
      netR: top.edge.netR,
      sampleSize: top.edge.n,
      confirmed: signalStrength(top.edge) === 'CONFIRMED',
    };
  }

  // Öneriler: yalnızca yeterli örneklemli bulgular
  const actionableInsights: StrategyAnalyticsResult['actionableInsights'] = [];

  if (missedProfitTrades.length > 0) {
    const totalLostFromMissed = missedProfitTrades.reduce((s, t) => s + Math.min(0, t.rr || 0), 0);
    actionableInsights.push({
      type: 'warning',
      title: 'Lehine 1R gidip kârsız kapanan işlemler',
      description: `${missedProfitTrades.length} işlemde fiyat en az stop mesafesi kadar lehine gitti ama işlem zararla veya başabaşta kapandı. Başabaşa çekme / kısmi kâr kuralını Asia Edge Lab'deki TP simülatörüyle test et.`,
      metricTag: `${missedProfitTrades.length} işlem (${Math.round(totalLostFromMissed * 100) / 100} R)`,
    });
  }

  if (tpReliable.length > 0 && tpReliable[0].avgR > 0) {
    const bestTp = tpReliable[0];
    const tpList = trades.filter(t => Array.isArray(t.tpTargets) && t.tpTargets.includes(bestTp.target));
    const tpConfirmed = signalStrength(edgeFromR(tpList.map(t => t.rr || 0), tpList.map(t => t.status))) === 'CONFIRMED';
    actionableInsights.push({
      type: 'positive',
      title: tpConfirmed ? 'Çıkış hedefi (Target) kenarı' : 'Çıkış hedefi (Target) · erken sinyal',
      description: `"${bestTp.target}" hedefli işlemler: %${bestTp.winRate} kazanma, işlem başına +${bestTp.avgR} R (${bestTp.total} işlem).${tpConfirmed ? '' : ` Henüz kesin değil: kanıt için en az ${EDGE_PROOF_MIN} işlem ve sıfırın üstünde güven aralığı gerekir.`}`,
      metricTag: `+${bestTp.avgR} R/işlem`,
    });
  }

  if (lowQualityCount >= MIN_SAMPLE && disciplineAlphaR > 0) {
    actionableInsights.push({
      type: 'opportunity',
      title: 'Düşük kalite setupların maliyeti',
      description: `B-C / plan dışı ${lowQualityCount} işlemin net sonucu -${disciplineAlphaR.toFixed(1)} R. Setup kalitesini girişten ÖNCE işaretliyorsan bu filtre gerçek bir kazanç; sonradan işaretliyorsan sonuç yanlıdır.`,
      metricTag: `-${disciplineAlphaR.toFixed(1)} R`,
    });
  }

  // 22. Asset Stats (Parite Bazında Edge)
  const assetRanking = buildRankings(t => [t.asset || 'Belirtilmemiş']).map(r => ({
    asset: r.key,
    total: r.total,
    wins: r.wins,
    losses: r.losses,
    winRate: r.winRate,
    netR: r.netR,
    avgR: r.avgR,
    profitFactor: r.profitFactor,
  }));

  // 23. Account Category Stats (Funded vs Challenge vs Demo)
  const accountCategoryRanking = buildRankings(t => [getTradeAccountCategory(t)]).map(r => ({
    category: r.key,
    total: r.total,
    wins: r.wins,
    winRate: r.winRate,
    netR: r.netR,
    avgR: r.avgR,
    profitFactor: r.profitFactor,
  }));

  return {
    totalTrades,
    overallScore: {
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
    },
    asiaRangeStats: {
      hasData: tradesWithAsia.length > 0,
      tradeCount: tradesWithAsia.length,
      brackets: asiaBrackets,
      bestBracket: bestAsiaBracket,
      insight: asiaInsight,
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
      midQualityTradesCount: midQualityCount,
      midQualityNetR: Math.round(midQualityNetR * 100) / 100,
      lowQualityTradesCount: lowQualityCount,
      lowQualityNetR: Math.round(lowQualityNetR * 100) / 100,
      disciplineAlphaR,
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
    redFlagRules,
    goldenSetup,
    actionableInsights,
    assetStats: assetRanking,
    accountCategoryStats: accountCategoryRanking,
  };
}
