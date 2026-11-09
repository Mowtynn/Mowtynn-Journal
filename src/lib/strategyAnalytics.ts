import { Trade } from '../types';
import { calculateProfitFactor, toRR } from './statMath';
import { bucketByPairMedian, PAIR_MEDIAN_MIN, indexTradeOrder, asiaRangeBucketOf, prevTradeBucket } from './asiaAnalytics';

/** Bir grup hakkında yorum/kural üretmek için gereken en az işlem sayısı — projenin tek eşiği (src/lib/sampleSize.ts). */
import { MIN_SAMPLE, EDGE_PROOF_MIN } from './sampleSize';
export { MIN_SAMPLE };

export interface StrategyAnalyticsResult {
  totalTrades: number;
  
  // Asia Range Volatility Matrix
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

  // Stop büyüklüğü: paritenin kendi medyan stop'una göre Sıkı / Normal / Geniş
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
    /** Paritelerin medyan stop'u (pip) — eşikler bunlardan türetilir */
    pairMedians: Array<{ pair: string; median: number }>;
    /** Paritesinde henüz PAIR_MEDIAN_MIN stop birikmediği için sınıflanmayan işlem sayısı */
    unclassified: number;
    insight: string;
  };

  // Seri ve aynı gün kayıp / kazanç sonrası (tilt) analizi
  streakStats: {
    currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
    maxLossStreak: number;
    /** Aynı NY günü içinde kazançtan / kayıptan sonra açılan işlemler */
    postWinTotal: number;
    postLossTotal: number;
    postWinWinRate: number;
    postLossWinRate: number;
    postWinAvgR: number;
    postLossAvgR: number;
    /** Karşılaştırma tabanı: günün ilk işlemleri */
    firstTradeWinRate: number;
    firstTradeAvgR: number;
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
    stopSizeStats: { hasData: false, brackets: [], pairMedians: [], unclassified: 0, insight: 'Stop Pip verisi yok.' },
    streakStats: {
      currentStreak: { type: 'NONE', count: 0 },
      maxLossStreak: 0,
      postWinTotal: 0,
      postLossTotal: 0,
      postWinWinRate: 0,
      postLossWinRate: 0,
      postWinAvgR: 0,
      postLossAvgR: 0,
      firstTradeWinRate: 0,
      firstTradeAvgR: 0,
      postLossTiltRisk: 'DÜŞÜK',
      insight: 'İşlem geçmişi yetersiz.',
    },
  };

  if (totalTrades === 0) return defaultEmptyResult;

  // General Performance
  const totalWins = trades.filter(t => t.status === 'WIN').length;
  const overallWinRate = Math.round((totalWins / totalTrades) * 1000) / 10;

  const tradesWithStop = trades.filter(t => typeof t.stopPips === 'number' && !isNaN(t.stopPips) && t.stopPips > 0);

  // Asia Range Volatility Matrix
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
  // Kurulum Karnesi / Edge Özeti ile aynı etiket: girişten önce bilinen (önceki işlemlerin medyanına göre) sınıf.
  // Uygulamada tüm işlemler üzerinden bir kez indekslenir; burada yalnızca okunur.
  indexTradeOrder(trades);
  const tightTrades = tradesWithAsia.filter(t => asiaRangeBucketOf(t) === 'NARROW');
  const mediumTrades = tradesWithAsia.filter(t => asiaRangeBucketOf(t) === 'NORMAL');
  const wideTrades = tradesWithAsia.filter(t => asiaRangeBucketOf(t) === 'WIDE');

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

  // Stop büyüklüğü: sabit pip eşiği (10 / 25) yerine her paritenin kendi medyan stop'una oran.
  // Sıkı stop kullanan biri için işlemler tek gruba yığılmaz; XAUUSD ile EURUSD aynı pip ölçeğinde karışmaz.
  const stopBuckets = bucketByPairMedian(tradesWithStop, (t) => t.stopPips);
  const stopIn = (k: 'NARROW' | 'NORMAL' | 'WIDE') => tradesWithStop.filter((t) => stopBuckets.buckets.get(t.id) === k);
  const STOP_LABELS = { NARROW: 'Sıkı (< 0.8× parite medyanı)', NORMAL: 'Normal (0.8× – 1.25×)', WIDE: 'Geniş (> 1.25× parite medyanı)' } as const;
  const stopSizeBrackets = (['NARROW', 'NORMAL', 'WIDE'] as const).map((k) => ({ ...calcBucket(stopIn(k), STOP_LABELS[k]), label: STOP_LABELS[k] }));
  const pairMedians = [...stopBuckets.medians.entries()]
    .map(([pair, m]) => ({ pair, median: Math.round(m * 10) / 10 }))
    .sort((x, y) => x.pair.localeCompare(y.pair));
  const unclassified = tradesWithStop.length - stopBuckets.buckets.size;
  const medianText = pairMedians.length ? ` Medyan stop: ${pairMedians.map((p) => `${p.pair} ${p.median} pip`).join(' · ')}.` : '';
  const pendingText = unclassified > 0 ? ` ${unclassified} işlemin paritesinde henüz ${PAIR_MEDIAN_MIN} stop yok; sınıflanmadı.` : '';

  let stopSizeInsight = `Gruplar her paritenin kendi medyan stop'una göre.${medianText}${pendingText} Her grupta en az ${MIN_SAMPLE} işlem olunca yorum yapılır.`;
  const stopReliable = stopSizeBrackets.filter(b => b.count >= MIN_SAMPLE).sort((a, b) => b.avgR - a.avgR);
  if (stopReliable.length >= 2) {
    stopSizeInsight = `İşlem başına en yüksek beklenti ${stopReliable[0].label} grubunda (${stopReliable[0].avgR} R, ${stopReliable[0].count} işlem).${earlyNote(stopReliable[0].count)}${medianText}${pendingText}`;
  }

  // 18. Streak & Post-Loss / Tilt Analytics
  const sortedChronological = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;

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

  // Tilt aynı seansın olgusudur: "kayıptan sonraki işlem" yalnızca AYNI NY günündeki bir sonraki işlemdir.
  // (Eskiden tüm geçmişte bir sonraki işlem alınıyordu; günde 1–2 işlem açan biri için bu çoğunlukla ertesi günün işlemiydi.)
  // Seri (maks. kayıp serisi, mevcut seri) ise tüm geçmiş üzerinden sayılmaya devam eder.
  // Edge Özeti'ndeki "Gün İçi Önceki İşlem" ile aynı tanım (aynı NY günü, aynı veri seti; hesaplar arası birlikte)
  const first: Trade[] = [];
  const afterWin: Trade[] = [];
  const afterLoss: Trade[] = [];
  for (const t of sortedChronological) {
    const b = prevTradeBucket(t);
    if (b === 'Günün İlk İşlemi') first.push(t);
    else if (b === 'Önceki Kazandı') afterWin.push(t);
    else if (b === 'Önceki Kaybetti') afterLoss.push(t);
  }
  const rate = (l: Trade[]) => (l.length > 0 ? Math.round((l.filter((t) => t.status === 'WIN').length / l.length) * 1000) / 10 : 0);
  const avg = (l: Trade[]) => (l.length > 0 ? Math.round((l.reduce((s2, t) => s2 + (t.rr || 0), 0) / l.length) * 100) / 100 : 0);
  const postWinTotal = afterWin.length;
  const postLossTotal = afterLoss.length;
  const postLossWins = afterLoss.filter((t) => t.status === 'WIN').length;
  const postWinWinRate = rate(afterWin);
  const postLossWinRate = rate(afterLoss);
  const postWinAvgR = avg(afterWin);
  const postLossAvgR = avg(afterLoss);
  const firstTradeWinRate = rate(first);
  const firstTradeAvgR = avg(first);

  let postLossTiltRisk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' = 'DÜŞÜK';
  // YÜKSEK yalnızca istatistiksel olarak anlamlıysa: aynı gün kayıp sonrası kazanma oranının %95 üst sınırı bile genel oranın altında.
  // Birkaç işlemlik dalgalanma (5 işlemde 1 işlem = 20 puan) tilt sayılmaz.
  if (postLossTotal >= MIN_SAMPLE) {
    if (wilsonUpper(postLossWins, postLossTotal) * 100 < overallWinRate) postLossTiltRisk = 'YÜKSEK';
    else if (postLossWinRate < overallWinRate - 10 || postLossAvgR < firstTradeAvgR - 0.3) postLossTiltRisk = 'ORTA';
  }

  const sR = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)} R`;
  let streakInsight: string;
  if (postLossTiltRisk === 'YÜKSEK') {
    streakInsight = `Dikkat: Aynı gün kayıptan sonra açtığın ${postLossTotal} işlemde kazanma oranın %${postLossWinRate} (genel %${overallWinRate}), işlem başı ${sR(postLossAvgR)} (günün ilk işlemi ${sR(firstTradeAvgR)}). Fark istatistiksel olarak anlamlı: kayıptan sonra o gün durmak hesabını korur.`;
  } else if (postLossTiltRisk === 'ORTA') {
    streakInsight = `Aynı gün kayıp sonrası ${postLossTotal} işlem: kazanma %${postLossWinRate} (genel %${overallWinRate}), işlem başı ${sR(postLossAvgR)} (günün ilk işlemi ${sR(firstTradeAvgR)}). Fark henüz kesin değil; izlemeye devam et.`;
  } else if (postLossTotal < MIN_SAMPLE) {
    streakInsight = postLossTotal === 0
      ? 'Aynı gün kayıptan sonra hiç işlem açmamışsın: tilt için ölçülecek bir şey yok.'
      : `Aynı gün kayıptan sonra ${postLossTotal} işlem açmışsın (işlem başı ${sR(postLossAvgR)}). Tilt yorumu için en az ${MIN_SAMPLE} işlem gerekir.`;
  } else if (postWinTotal >= EDGE_PROOF_MIN && postWinWinRate > overallWinRate + 10) {
    streakInsight = `Aynı gün kazançtan sonraki işlemlerin %${postWinWinRate}'i yine kazanç (genel %${overallWinRate}, ${postWinTotal} işlem).`;
  } else {
    streakInsight = `Aynı gün kayıp sonrası işlemlerin genel performansınla uyumlu (${postLossTotal} işlem, işlem başı ${sR(postLossAvgR)}).`;
  }

  return {
    totalTrades,
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
      pairMedians,
      unclassified,
      insight: stopSizeInsight,
    },
    streakStats: {
      currentStreak: { type: currentStreakType, count: currentStreakCount },
      maxLossStreak,
      postWinTotal,
      postLossTotal,
      postWinWinRate,
      postLossWinRate,
      postWinAvgR,
      postLossAvgR,
      firstTradeWinRate,
      firstTradeAvgR,
      postLossTiltRisk,
      insight: streakInsight,
    },
  };
}
