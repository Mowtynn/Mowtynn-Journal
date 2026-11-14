import { Trade } from '../types';
import { byEntryTime } from './tradeModel';
import { indexTradeOrder, prevTradeBucket } from './asiaAnalytics';

/** Bir grup hakkında yorum/kural üretmek için gereken en az işlem sayısı — projenin tek eşiği (src/lib/sampleSize.ts). */
import { MIN_SAMPLE, EDGE_PROOF_MIN } from './sampleSize';
import { formatR } from './format';
export { MIN_SAMPLE };

export interface StrategyAnalyticsResult {
  totalTrades: number;
  
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

  // Gün içi önceki işlem sonucu (kayıp / kazanç sonrası) için işlem sırası bir kez indekslenir
  indexTradeOrder(trades);

  // 18. Streak & Post-Loss / Tilt Analytics
  const sortedChronological = [...trades].sort(byEntryTime);
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;

  // Başabaş (BE) işlem nötrdür: seriyi bozmaz, seriye de sayılmaz. Kayıp serisi ancak bir kazançla biter
  // (L L BE L L → 4'lük kayıp serisi; aradaki BE hesabı toparlamadığı için "2" demek en kötü seriyi küçük gösterirdi).
  for (let i = 0; i < sortedChronological.length; i++) {
    const t = sortedChronological[i];
    if (t.status === 'WIN') {
      tempWin++;
      tempLoss = 0;
    } else if (t.status === 'LOSS') {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    }
  }

  // Mevcut seri: son kazanç / kayıptan beri süren seri (sondaki BE'ler seriyi sıfırlamaz)
  if (tempWin > 0) {
    currentStreakType = 'WIN';
    currentStreakCount = tempWin;
  } else if (tempLoss > 0) {
    currentStreakType = 'LOSS';
    currentStreakCount = tempLoss;
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

  const sR = (v: number) => formatR(v);
  let streakInsight: string;
  if (postLossTiltRisk === 'YÜKSEK') {
    streakInsight = `Dikkat: Aynı gün kayıptan sonra açtığın ${postLossTotal} işlemde kazanma oranın %${postLossWinRate} (genel %${overallWinRate}), işlem başı ${sR(postLossAvgR)} (günün ilk işlemi ${sR(firstTradeAvgR)}). Fark istatistiksel olarak anlamlı: kayıptan sonra o gün durmak hesabını korur.`;
  } else if (postLossTiltRisk === 'ORTA') {
    streakInsight = `Aynı gün kayıptan sonra açtığın ${postLossTotal} işlemde kazanma oranın %${postLossWinRate} (genel %${overallWinRate}), işlem başı ${sR(postLossAvgR)} (günün ilk işlemi ${sR(firstTradeAvgR)}). Fark henüz kesin değil; izlemeye devam et.`;
  } else if (postLossTotal < MIN_SAMPLE) {
    streakInsight = postLossTotal === 0
      ? 'Aynı gün kayıptan sonra hiç işlem açmamışsın: tilt için ölçülecek bir şey yok.'
      : `Aynı gün kayıptan sonra ${postLossTotal} işlem açmışsın (işlem başı ${sR(postLossAvgR)}). Tilt yorumu için en az ${MIN_SAMPLE} işlem gerekir.`;
  } else if (postWinTotal >= EDGE_PROOF_MIN && postWinWinRate > overallWinRate + 10) {
    streakInsight = `Aynı gün kazançtan sonra açtığın ${postWinTotal} işlemde kazanma oranın %${postWinWinRate} (genel %${overallWinRate}).`;
  } else {
    streakInsight = `Aynı gün kayıptan sonra açtığın işlemler genel performansınla uyumlu (${postLossTotal} işlem, işlem başı ${sR(postLossAvgR)}).`;
  }

  return {
    totalTrades,
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
