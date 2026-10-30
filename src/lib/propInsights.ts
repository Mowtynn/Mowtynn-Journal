import { PropAccount, Trade } from '../types';
import { computeAccountMetrics, defaultRiskAmount } from './propAccounts';
import { getTradeAccountCategory } from '../constants/constants';
import { nyDateKey } from './tradingTime';

/**
 * Prop hesabı için R tabanlı canlı özet: hesabın kendi işlemlerinden istatistik,
 * kurallara kalan mesafe (R ve "kaç kayıp / kaç kazanç") ve kendi R dağılımınla
 * Monte Carlo geçme (funded'da ayakta kalma) olasılığı.
 * Saf fonksiyonlar: aynı girdi + aynı tohum → aynı sonuç.
 */

export interface AccountRInsights {
  tradeCount: number;
  wins: number;
  losses: number;
  winRate: number;          // %, BE dahil tüm işlemlere bölünür
  netR: number;
  expectancy: number;       // işlem başına R
  avgWinR: number;
  avgLossR: number;         // pozitif sayı
  /** Bundan sonraki işlemler için varsayılan 1R ($): hesaptaki işlemlerin medyan riski, yoksa hesabın 1R'si */
  riskPerTrade: number;
  /** Max DD sınırına kalan mesafe, R cinsinden */
  ddRemainingR: number;
  /** Hedefe kalan mesafe, R cinsinden (funded'da yok) */
  targetRemainingR?: number;
  /** Ortalama kayıpla (en az 1R) sınıra kaç kayıp kaldı */
  lossesToBreach: number;
  /** Ortalama kazançla hedefe kaç kazanç kaldı */
  winsToTarget?: number;
  /** Simülasyon sonucu (yeterli örneklem yoksa yok) */
  simulation?: {
    /** Değerlendirmede: hedefe sınırdan önce ulaşma olasılığı (%). Funded'da: ufuk boyunca sınıra değmeme olasılığı (%) */
    probability: number;
    kind: 'PASS' | 'SURVIVE';
    horizon: number;        // simüle edilen en fazla işlem sayısı
    sampleSize: number;     // örneklenen R sayısı
    sampleSource: 'ACCOUNT' | 'ALL';
    medianTrades?: number;  // hedefe ulaşanlarda medyan işlem sayısı
  };
  /** Risk seviyelerine göre aynı simülasyon ve önerilen risk % (hesabın drawdown ve hedef kurallarına göre) */
  /** Simülasyonda günlük kayıp limiti uygulandı mı ve günlük işlem varsayımı */
  dailyLimitApplied?: { pct: number; tradesPerDay: number };
  riskAdvice?: {
    levels: { pct: number; probability: number; bustProbability: number; medianTrades?: number }[];
    recommendedPct?: number;
    currentPct?: number;
  };
}

/** Karşılaştırılan risk seviyeleri (hesap boyutunun %'si) */
export const RISK_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2];
/** Değerlendirmede kabul edilen en yüksek hesabı yakma olasılığı (%); bu sınırın altında, geçme olasılığı en yükseğe yakın olan en hızlı seviye önerilir */
export const MAX_BUST_PCT = 15;
/** Funded'da önerilecek seviyenin en az ayakta kalma olasılığı (%) */
export const MIN_SURVIVE_PCT = 90;

const finiteR = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : null);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Sabit tohumlu küçük RNG (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** En az bu kadar R örneği olmadan olasılık gösterilmez */
export const MIN_SIMULATION_SAMPLE = 10;
/** Hesabın kendi işlemleri bu sayıya ulaşınca örneklem hesabın kendisinden alınır */
export const OWN_SAMPLE_THRESHOLD = 20;

export function computeAccountRInsights(
  account: PropAccount,
  allTrades: Trade[],
  options: { runs?: number; horizon?: number; seed?: number } = {},
): AccountRInsights {
  const runs = options.runs ?? 2000;
  const seed = options.seed ?? 7;
  const m = computeAccountMetrics(account, allTrades);
  const own = m.trades.map(finiteR).filter((r): r is number => r !== null);

  const winsR = own.filter((r) => r > 0);
  const lossR = own.filter((r) => r < 0).map((r) => -r);
  const netR = own.reduce((s, r) => s + r, 0);
  const avgWinR = winsR.length ? winsR.reduce((s, r) => s + r, 0) / winsR.length : 0;
  const avgLossR = lossR.length ? lossR.reduce((s, r) => s + r, 0) / lossR.length : 0;

  const riskAmounts = m.trades.map((t) => t.riskAmount).filter((x): x is number => typeof x === 'number' && x > 0);
  const riskPerTrade = riskAmounts.length ? median(riskAmounts) : defaultRiskAmount(account);
  const unit = riskPerTrade > 0 ? riskPerTrade : 1;

  const ddRemainingR = Math.max(0, m.maxLossRemaining) / unit;
  const targetRemainingR = m.targetRemaining !== undefined ? m.targetRemaining / unit : undefined;
  const lossesToBreach = Math.max(0, Math.floor(ddRemainingR / Math.max(1, avgLossR || 1) + 1e-9));
  const winsToTarget =
    targetRemainingR !== undefined ? (targetRemainingR <= 0 ? 0 : avgWinR > 0 ? Math.ceil(targetRemainingR / avgWinR - 1e-9) : undefined) : undefined;

  const result: AccountRInsights = {
    tradeCount: m.trades.length,
    wins: winsR.length,
    losses: lossR.length,
    winRate: m.trades.length ? (m.trades.filter((t) => t.status === 'WIN').length / m.trades.length) * 100 : 0,
    netR,
    expectancy: own.length ? netR / own.length : 0,
    avgWinR,
    avgLossR,
    riskPerTrade,
    ddRemainingR,
    targetRemainingR,
    lossesToBreach,
    winsToTarget,
  };

  // Örneklem: hesabın kendi işlemleri yeterliyse onlar, değilse tüm PROP geçmişin (Challenge + Funded).
  // Hesapsız (demo) işlemler ayrı tutulur; gerçek hesap olasılığına karışmaz.
  const useOwn = own.length >= OWN_SAMPLE_THRESHOLD;
  const sample = useOwn
    ? own
    : allTrades.filter((t) => getTradeAccountCategory(t) !== 'DEMO').map(finiteR).filter((r): r is number => r !== null);
  if (sample.length < MIN_SIMULATION_SAMPLE || m.maxBreached || m.targetReached || account.status !== 'ACTIVE') return result;

  const maxDdAmount = m.maxDdAmount;
  const trailing = account.drawdownMode === 'TRAILING';
  const isPass = m.targetRemaining !== undefined;
  const horizon = options.horizon ?? (isPass ? 300 : 20);
  // Günlük kayıp limiti: gün başı bakiyeden hesap boyutunun %'si. Günlük işlem sayısı geçmişindeki medyandan (en az 1).
  const dailyLimit = account.dailyLossPct && account.dailyLossPct > 0 ? (account.size * account.dailyLossPct) / 100 : 0;
  const dayCounts = new Map<string, number>();
  (useOwn ? m.trades : allTrades.filter((t) => getTradeAccountCategory(t) !== 'DEMO')).forEach((t) => {
    const k = nyDateKey(t.createdAt);
    dayCounts.set(k, (dayCounts.get(k) || 0) + 1);
  });
  const tradesPerDay = Math.max(1, Math.round(median([...dayCounts.values()])));

  // Tek simülasyon: verilen 1R ($) ile; aynı tohum → aynı sonuç (risk seviyeleri adil karşılaştırılır)
  const simulate = (unitAmt: number) => {
    const rand = rng(seed);
    let ok = 0;
    let busted = 0;
    const passed: number[] = [];
    for (let run = 0; run < runs; run++) {
      let balance = m.balance;
      let peak = m.peak;
      let progress = m.netPnl;
      let failed = false;
      let passedAt = -1;
      let dayStart = balance;
      for (let i = 0; i < horizon; i++) {
        if (i % tradesPerDay === 0) dayStart = balance;
        const r = sample[Math.floor(rand() * sample.length)];
        const amt = r * unitAmt;
        balance += amt;
        progress += amt;
        if (balance > peak) peak = balance;
        const floor = trailing ? Math.min(account.size, peak - maxDdAmount) : account.size - maxDdAmount;
        if ((maxDdAmount > 0 && balance <= floor) || (dailyLimit > 0 && balance <= dayStart - dailyLimit)) {
          failed = true;
          break;
        }
        if (isPass && m.target !== undefined && progress >= m.target) {
          passedAt = i + 1;
          break;
        }
      }
      if (failed) busted++;
      if (isPass ? passedAt > 0 : !failed) ok++;
      if (passedAt > 0) passed.push(passedAt);
    }
    return { probability: (ok / runs) * 100, bustProbability: (busted / runs) * 100, medianTrades: passed.length ? median(passed) : undefined };
  };

  const main = simulate(unit);

  // Risk önerisi: hesap boyutuna göre risk seviyeleri; drawdown sınırı ve hedef gerçek hesap kurallarından.
  // Değerlendirmede: hesabı yakma olasılığı ≤ %15 olan seviyeler içinde geçme olasılığı en yükseğe 2 puan yakın
  // olanlardan hedefe en hızlı (medyan işlem) ulaşanı.
  // Funded'da: ufuk boyunca ayakta kalma ≥ %90 olan en yüksek seviye.
  if (account.size > 0) {
    const levels = RISK_LEVELS.map((pct) => ({ pct, ...simulate((account.size * pct) / 100) }));
    let best: (typeof levels)[number] | undefined;
    if (isPass) {
      // Yakma ≤ eşik olanlar içinde geçme olasılığı en yükseğe en fazla 2 puan yakın olanlardan en HIZLI geçeni (medyan işlem)
      const safe = levels.filter((l) => l.bustProbability <= MAX_BUST_PCT);
      const top = Math.max(0, ...safe.map((l) => l.probability));
      for (const l of safe) {
        if (l.probability < top - 2) continue;
        if (!best || (l.medianTrades ?? Infinity) < (best.medianTrades ?? Infinity)) best = l;
      }
    } else {
      for (const l of levels) if (l.probability >= MIN_SURVIVE_PCT) best = l;
    }
    result.riskAdvice = {
      levels: levels.map((l) => ({ pct: l.pct, probability: l.probability, bustProbability: l.bustProbability, medianTrades: l.medianTrades })),
      recommendedPct: best?.pct,
      currentPct: account.size > 0 ? (unit / account.size) * 100 : undefined,
    };
  }

  if (dailyLimit > 0) result.dailyLimitApplied = { pct: account.dailyLossPct as number, tradesPerDay };
  result.simulation = {
    probability: main.probability,
    kind: isPass ? 'PASS' : 'SURVIVE',
    horizon,
    sampleSize: sample.length,
    sampleSource: useOwn ? 'ACCOUNT' : 'ALL',
    medianTrades: main.medianTrades,
  };
  return result;
}
