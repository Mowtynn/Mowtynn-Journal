import { Trade } from '../types';
import { calculateProfitFactor, toRR } from './statMath';
import { bucketAsiaRanges } from './asiaAnalytics';

/** Bir grup hakkında yorum/kural üretmek için gereken en az işlem sayısı — projenin tek eşiği (src/lib/sampleSize.ts). */
import { MIN_SAMPLE, EDGE_PROOF_MIN } from './sampleSize';
export { MIN_SAMPLE };

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
    maxLossStreak: number;
    postWinWinRate: number;
    postLossWinRate: number;
    postLossTiltRisk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
    insight: string;
  };

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
    stopSizeStats: { hasData: false, brackets: [], insight: 'Stop Pip verisi yok.' },
    streakStats: {
      currentStreak: { type: 'NONE', count: 0 },
      maxLossStreak: 0,
      postWinWinRate: 0,
      postLossWinRate: 0,
      postLossTiltRisk: 'DÜŞÜK',
      insight: 'İşlem geçmişi yetersiz.',
    },
  };

  if (totalTrades === 0) return defaultEmptyResult;

  // General Performance
  const totalWins = trades.filter(t => t.status === 'WIN').length;
  const overallWinRate = Math.round((totalWins / totalTrades) * 1000) / 10;

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

  // Stop tamponu: kazananlarda stop'un kullanılmayan kısmı. Aynı işlemler üzerinden (MAE ve stop'u girilmiş kazananlar);
  // eskiden tüm işlemlerin stop ortalaması ile yalnızca kazananların MAE ortalaması karşılaştırılıyordu.
  const cushionWins = maeWins.filter(t => typeof t.stopPips === 'number' && t.stopPips > 0);
  const cushionStop = cushionWins.reduce((s, t) => s + (t.stopPips || 0), 0);
  const cushionMae = cushionWins.reduce((s, t) => s + Math.min(t.maePips || 0, t.stopPips || 0), 0);
  const stopCushionEfficiency = cushionStop > 0 ? ((cushionStop - cushionMae) / cushionStop) * 100 : 0;

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

  // Brackets are relative to each pair's own median Asia Range (EURCAD and EURUSD ranges differ structurally)
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
      asiaInsight = `İşlem başına en yüksek beklenti ${bestAsiaBracket} aralığında (${list[0].avgR >= 0 ? '+' : ''}${list[0].avgR} R, ${list[0].count} işlem).${earlyNote(list[0].count)} Güven aralıkları için Kurulum Karnesi'nde Asia Range Büyüklüğü alanına bakın.`;
    } else {
      asiaInsight = `Her aralıkta en az ${MIN_SAMPLE} işlem birikince kıyas yapılır.`;
    }
  }

  // 17. Stop Size Volatility Brackets (<10p, 10-25p, >25p)
  const tightStopTrades = trades.filter(t => (t.stopPips || 0) > 0 && (t.stopPips || 0) < 10);
  const mediumStopTrades = trades.filter(t => (t.stopPips || 0) >= 10 && (t.stopPips || 0) <= 25);
  const wideStopTrades = trades.filter(t => (t.stopPips || 0) > 25);

  const stopSizeBrackets = [
    { label: 'Sıkı Stop (< 10 Pip)', ...calcBucket(tightStopTrades, 'Sıkı Stop (< 10 Pip)') },
    { label: 'Standart Stop (10 - 25 Pip)', ...calcBucket(mediumStopTrades, 'Standart Stop (10 - 25 Pip)') },
    { label: 'Geniş Stop (> 25 Pip)', ...calcBucket(wideStopTrades, 'Geniş Stop (> 25 Pip)') },
  ];

  let stopSizeInsight = `Pip eşikleri sabittir; farklı volatilitedeki pariteleri karıştırıyorsan Kurulum Karnesi'ndeki Stop / Asia Range alanına bak. Her grupta en az ${MIN_SAMPLE} işlem olunca yorum yapılır.`;
  const stopReliable = stopSizeBrackets.filter(b => b.count >= MIN_SAMPLE).sort((a, b) => b.avgR - a.avgR);
  if (stopReliable.length >= 2) {
    stopSizeInsight = `İşlem başına en yüksek beklenti ${stopReliable[0].label} grubunda (${stopReliable[0].avgR} R, ${stopReliable[0].count} işlem).${earlyNote(stopReliable[0].count)}`;
  }

  // 18. Streak & Post-Loss / Tilt Analytics
  const sortedChronological = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
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
    stopSizeStats: {
      hasData: tradesWithStop.length > 0,
      brackets: stopSizeBrackets,
      insight: stopSizeInsight,
    },
    streakStats: {
      currentStreak: { type: currentStreakType, count: currentStreakCount },
      maxLossStreak,
      postWinWinRate,
      postLossWinRate,
      postLossTiltRisk,
      insight: streakInsight,
    },
  };
}
