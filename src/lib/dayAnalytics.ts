import type { Trade } from '../types';
import { byEntryTime } from './tradeModel';
import { dayClusterKey, edgeFromR, edgeOfTrades, type EdgeStats } from './asiaAnalytics';
import { getTradeAccountKind } from '../constants/constants';
import { signalStrength } from './setupScorecard';
import { halfStatus, type HalfStatus } from './ruleSimulator';

/**
 * Gün bazlı analizler (yalnızca mevcut girdilerden: tarih/saat, sonuç R):
 * - Hazır günlük disiplin kuralları: "günde en fazla 1 işlem", "ilk kayıptan sonra dur", "−2R'de dur" … geçmişte
 *   uygulansaydı ne olurdu? Kural ancak vazgeçtirdiği işlemler kaybettiriyorsa işe yarar; hüküm bunun güvenine bakar.
 * - Aynı gün çoklu işlem: aynı gün açılan işlemler birlikte mi kazanıp kaybediyor (bağımlılık), çok işlemli günler
 *   tek işlemli günlerden iyi mi?
 * Gün = NY takvim günü × hesap türü (dayClusterKey). Saf fonksiyonlar.
 */

/** Gün toplamları kendi başına bağımsız birimdir (kümeleme gerekmez) */
const edgeFromDays = (rs: number[], st: Trade['status'][]) => edgeFromR(rs, st);
const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);

export type DailyRuleId = 'max1' | 'max2' | 'stopAfterLoss' | 'stopAfter2Loss' | 'stopAfterWin' | 'dayLoss2R' | 'dayGain2R' | 'cooldown3';

export const DAILY_RULES: Array<{ id: DailyRuleId; title: string; desc: string }> = [
  { id: 'max1', title: 'Günde en fazla 1 işlem', desc: 'Günün ilk işleminden sonrakiler alınmaz.' },
  { id: 'max2', title: 'Günde en fazla 2 işlem', desc: 'Günün üçüncü ve sonraki işlemleri alınmaz.' },
  { id: 'stopAfterLoss', title: 'İlk kayıptan sonra günü bitir', desc: 'Gün içinde bir kayıptan sonraki işlemler alınmaz (BE saymaz).' },
  { id: 'stopAfter2Loss', title: '2 kayıptan sonra günü bitir', desc: 'Gün içinde ikinci kayıptan sonraki işlemler alınmaz.' },
  { id: 'stopAfterWin', title: 'İlk kazançtan sonra günü bitir', desc: 'Gün içinde bir kazançtan sonraki işlemler alınmaz.' },
  { id: 'dayLoss2R', title: 'Günlük −2R limitinde dur', desc: 'Günün toplamı −2R ya da altına inince o gün başka işlem alınmaz.' },
  { id: 'dayGain2R', title: 'Günlük +2R hedefinde dur', desc: 'Günün toplamı +2R ya da üstüne çıkınca o gün başka işlem alınmaz.' },
  { id: 'cooldown3', title: '3 kayıp serisinden sonra 1 gün ara', desc: 'Üst üste 3 kayıpla biten günün ardından gelen işlem günü atlanır.' },
];

/** Kuralın hükmü: vazgeçilen işlemlerin sonucuna göre (kural yalnızca onları değiştirir) */
export type DailyRuleVerdict = 'HELPS' | 'LIKELY_HELPS' | 'LIKELY_HURTS' | 'HURTS' | 'NO_EFFECT';

export interface DailyRuleResult {
  id: DailyRuleId;
  title: string;
  desc: string;
  taken: EdgeStats;
  skipped: EdgeStats;
  all: EdgeStats;
  /** Kuralla net R − tüm işlemlerin net R'ı (= −vazgeçilenlerin net R'ı) */
  netDelta: number;
  /** Kuralla max drawdown − tüm işlemlerin max drawdown'ı (negatifse kural düşüşü azaltır) */
  ddDelta: number;
  verdict: DailyRuleVerdict;
  /** Vazgeçilenlerin ilk / ikinci yarıdaki sonucu aynı yönde mi (zamana göre, tüm işlemlerin ortasından) */
  halves: HalfStatus;
}

function valid(trades: Trade[]): Trade[] {
  return trades.filter((t) => typeof t.rr === 'number' && Number.isFinite(t.rr) && Number.isFinite(t.createdAt)).sort(byEntryTime);
}

/** Kuralın aldığı işlemler (kronolojik liste üzerinde; gün içi sıra ve hesap türü korunur) */
function takenBy(rule: DailyRuleId, sorted: Trade[]): Set<Trade> {
  const taken = new Set<Trade>();
  const day = new Map<string, { n: number; losses: number; wins: number; r: number; stop: boolean }>();
  // cooldown3: hesap türü içinde ardışık kayıp ve atlanacak gün
  const streak = new Map<string, { losses: number; lastDay: string | null; skipNext: boolean; skipDay: string | null }>();
  for (const t of sorted) {
    const dk = dayClusterKey(t);
    const d = day.get(dk) || { n: 0, losses: 0, wins: 0, r: 0, stop: false };
    day.set(dk, d);
    let take = true;
    if (rule === 'cooldown3') {
      const kind = getTradeAccountKind(t);
      const s = streak.get(kind) || { losses: 0, lastDay: null, skipNext: false, skipDay: null };
      streak.set(kind, s);
      if (s.lastDay !== dk) {
        // yeni gün: önceki gün 3+ kayıp serisiyle bittiyse bu gün atlanır
        s.skipDay = s.skipNext ? dk : null;
        s.skipNext = false;
        s.lastDay = dk;
      }
      take = s.skipDay !== dk;
      if (take) {
        if (t.status === 'LOSS') s.losses++;
        else if (t.status === 'WIN') s.losses = 0;
        s.skipNext = s.losses >= 3;
      } else s.losses = 0; // ara verildi: seri sıfırlanır
    } else {
      if (d.stop) take = false;
      else if (rule === 'max1') take = d.n < 1;
      else if (rule === 'max2') take = d.n < 2;
    }
    if (take) {
      taken.add(t);
      d.n++;
      const r = rOf(t);
      d.r += r;
      if (t.status === 'LOSS') d.losses++;
      if (t.status === 'WIN') d.wins++;
      if (rule === 'stopAfterLoss' && d.losses >= 1) d.stop = true;
      if (rule === 'stopAfter2Loss' && d.losses >= 2) d.stop = true;
      if (rule === 'stopAfterWin' && d.wins >= 1) d.stop = true;
      if (rule === 'dayLoss2R' && d.r <= -2 + 1e-9) d.stop = true;
      if (rule === 'dayGain2R' && d.r >= 2 - 1e-9) d.stop = true;
    }
  }
  return taken;
}

function verdictOf(skipped: EdgeStats): DailyRuleVerdict {
  if (!skipped.n) return 'NO_EFFECT';
  const sure = signalStrength(skipped) === 'CONFIRMED';
  if (skipped.expectancy < 0) return sure ? 'HELPS' : 'LIKELY_HELPS';
  if (skipped.expectancy > 0) return sure ? 'HURTS' : 'LIKELY_HURTS';
  return 'NO_EFFECT';
}

export function simulateDailyRules(trades: Trade[]): DailyRuleResult[] {
  const sorted = valid(trades);
  const all = edgeOfTrades(sorted);
  const mid = Math.floor(sorted.length / 2);
  const pos = new Map(sorted.map((t, i) => [t, i]));
  return DAILY_RULES.map((def) => {
    const set = takenBy(def.id, sorted);
    const takenList = sorted.filter((t) => set.has(t));
    const skippedList = sorted.filter((t) => !set.has(t));
    const taken = edgeOfTrades(takenList);
    const skipped = edgeOfTrades(skippedList);
    const first = edgeOfTrades(skippedList.filter((t) => pos.get(t)! < mid));
    const second = edgeOfTrades(skippedList.filter((t) => pos.get(t)! >= mid));
    return {
      ...def,
      taken,
      skipped,
      all,
      netDelta: Math.round((taken.netR - all.netR) * 1e6) / 1e6,
      ddDelta: Math.round((taken.maxDrawdownR - all.maxDrawdownR) * 1e6) / 1e6,
      verdict: verdictOf(skipped),
      halves: halfStatus(first, second, Math.sign(skipped.expectancy) || -1),
    };
  });
}

export interface SameDayStats {
  /** İşlem olan gün sayısı */
  days: number;
  /** 2+ işlemli gün sayısı ve bu günlerdeki işlem sayısı */
  multiDays: number;
  multiTrades: number;
  /** Çok işlemli günlerde: tüm işlemler kayıp / tüm işlemler kazanç / karışık */
  allLost: number;
  allWon: number;
  mixed: number;
  /** Aynı gün işlemlerin sonuç benzerliği (gün içi korelasyon, −1…1; yeterli çok işlemli gün yoksa null) */
  correlation: number | null;
  /** Bağımsız karar sayısı (etkin örneklem): işlem sayısı ÷ (1 + (gün başı ort. işlem − 1) × korelasyon) */
  effectiveN: number;
  total: number;
  /** Gün başına toplam R: tek işlemli günler / çok işlemli günler */
  singleDay: EdgeStats;
  multiDay: EdgeStats;
}

/** Gün içi korelasyon için en az bu kadar çok işlemli gün gerekir */
export const SAME_DAY_MIN_DAYS = 5;

export function computeSameDayStats(trades: Trade[]): SameDayStats {
  const sorted = valid(trades);
  const byDay = new Map<string, Trade[]>();
  for (const t of sorted) {
    const k = dayClusterKey(t);
    (byDay.get(k) || byDay.set(k, []).get(k)!).push(t);
  }
  const n = sorted.length;
  const mean = n ? sorted.reduce((s, t) => s + rOf(t), 0) / n : 0;
  let allLost = 0;
  let allWon = 0;
  let mixed = 0;
  let multiDays = 0;
  let multiTrades = 0;
  // Gün içi korelasyon (çiftler üzerinden, ortak ortalamaya göre): Σ_gün Σ_i≠j (r_i−m)(r_j−m) / Σ_çift ÷ varyans
  let pairSum = 0;
  let pairs = 0;
  let varSum = 0;
  const singleR: number[] = [];
  const singleSt: Trade['status'][] = [];
  const multiR: number[] = [];
  const multiSt: Trade['status'][] = [];
  byDay.forEach((list) => {
    const dayR = list.reduce((s, t) => s + rOf(t), 0);
    if (list.length < 2) {
      singleR.push(dayR);
      singleSt.push(dayR > 0 ? 'WIN' : dayR < 0 ? 'LOSS' : 'BREAKEVEN');
      return;
    }
    multiDays++;
    multiTrades += list.length;
    multiR.push(dayR);
    multiSt.push(dayR > 0 ? 'WIN' : dayR < 0 ? 'LOSS' : 'BREAKEVEN');
    const decided = list.filter((t) => t.status !== 'BREAKEVEN');
    if (decided.length >= 2 && decided.every((t) => t.status === 'LOSS')) allLost++;
    else if (decided.length >= 2 && decided.every((t) => t.status === 'WIN')) allWon++;
    else mixed++;
    const dev = list.map((t) => rOf(t) - mean);
    const s = dev.reduce((a, b) => a + b, 0);
    const sq = dev.reduce((a, b) => a + b * b, 0);
    pairSum += s * s - sq; // Σ_i≠j d_i d_j
    pairs += list.length * (list.length - 1);
  });
  sorted.forEach((t) => (varSum += (rOf(t) - mean) ** 2));
  const variance = n > 1 ? varSum / n : 0;
  const correlation = multiDays >= SAME_DAY_MIN_DAYS && pairs > 0 && variance > 0 ? Math.max(-1, Math.min(1, pairSum / pairs / variance)) : null;
  const m = byDay.size ? n / byDay.size : 1;
  const deff = 1 + (m - 1) * Math.max(0, correlation ?? 0);
  return {
    days: byDay.size,
    multiDays,
    multiTrades,
    allLost,
    allWon,
    mixed,
    correlation: correlation === null ? null : Math.round(correlation * 1000) / 1000,
    effectiveN: Math.round(n / deff),
    total: n,
    singleDay: edgeFromDays(singleR, singleSt),
    multiDay: edgeFromDays(multiR, multiSt),
  };
}
