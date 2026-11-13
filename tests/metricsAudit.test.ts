import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateComprehensiveStats, breakevenWinRate, breakevenWinRateOf } from '../src/lib/stats';
import { computeEdgeSummary } from '../src/lib/edgeSummary';
import { computeAccountMetrics } from '../src/lib/propAccounts';
import { NOW, DAY, trade, account } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, ...p });

test('başabaş kazanma oranı: Ana Panel ve PDF raporu aynı sonucu verir, beklenti 0 iken WR ile çakışır', () => {
  // 2 kazanç (3R), 4 kayıp (-1R), 2 BE: beklenti = (6 - 4) / 8 > 0
  const list = [t(3), t(3), t(-1), t(-1), t(-1), t(-1), t(0), t(0)];
  const s = calculateComprehensiveStats(list, NOW);
  const fromStats = breakevenWinRate(s.winningTrades, s.losingTrades, s.totalTrades, s.averageWinRR, s.averageLossRR);
  const fromList = breakevenWinRateOf(list);
  assert.ok(fromStats !== null && fromList !== null);
  assert.equal(fromStats!.toFixed(6), fromList!.toFixed(6));
  // 1 ÷ (3 + 1) × 6/8 = %18.75
  assert.equal(fromList!.toFixed(2), '18.75');
  // Beklentisi tam 0 olan sistemde WR, başabaş oranına eşit
  const flat = [t(2), t(-1), t(-1), t(0)];
  assert.equal(calculateComprehensiveStats(flat, NOW).expectancyRR, 0);
  assert.equal(breakevenWinRateOf(flat)!.toFixed(6), ((1 / 4) * 100).toFixed(6));
  // Kazanç ya da kayıp yoksa tanımsız
  assert.equal(breakevenWinRateOf([t(2), t(0)]), null);
  assert.equal(breakevenWinRateOf([]), null);
});

test('Kurallarım: "son 7 gün" ihlalleri son işleme göre değil bugüne göre sayılır', () => {
  // 30+ işlemlik kesin kaybettiren alan (ALMA kuralı), en son işlem 20 gün önce
  const old = Array.from({ length: 36 }, (_, i) =>
    t(i % 2 ? -1 : -0.8, { session: 'NY PM', createdAt: NOW - (60 - i) * DAY }),
  ).concat(Array.from({ length: 36 }, (_, i) => t(i % 3 ? 2 : -1, { session: 'London', createdAt: NOW - (58 - i) * DAY })));
  const s = computeEdgeSummary(old, undefined, NOW);
  const avoid = s.rules.find((r) => r.kind === 'AVOID' && r.title.includes('NY PM'));
  assert.ok(avoid, 'NY PM ALMA kuralı oluşmalı');
  // Son işlemler 20+ gün önce: bugüne göre son 7 günde ihlal yok
  assert.equal(avoid!.recentViolations?.n, 0);
  // Bugünden 2 gün önce yapılan bir NY PM işlemi ihlal sayılır
  const fresh = computeEdgeSummary([...old, t(-1, { session: 'NY PM', createdAt: NOW - 2 * DAY })], undefined, NOW);
  const avoid2 = fresh.rules.find((r) => r.kind === 'AVOID' && r.title.includes('NY PM'));
  assert.equal(avoid2!.recentViolations?.n, 1);
  assert.equal(avoid2!.recentViolations?.r, -1);
});

test('prop: 0 tutarlı bakiye kontrolü bakiyeyi ve drawdown takibini değiştirmez', () => {
  const a = account({ adjustments: [{ id: 'adj1', at: NOW - DAY, amount: 0, realBalance: 10000 }] });
  const b = account();
  const trades = [t(-1, { accountId: 'acc1', accountStage: 1, riskAmount: 100, createdAt: NOW - 2 * DAY })];
  const ma = computeAccountMetrics(a, trades);
  const mb = computeAccountMetrics(b, trades);
  assert.equal(ma.balance, mb.balance);
  assert.equal(ma.maxLossRemaining, mb.maxLossRemaining);
  assert.equal(ma.adjustmentsTotal, 0);
});

test('zamanı bozuk kayıt: çıkış zamanı varsa onarılır, yoksa geçersiz kalır ve analizlere girmez', async () => {
  const { normalizeTrade, isValidTrade } = await import('../src/lib/tradeModel');
  const { applyGlobalFilters } = await import('../src/lib/tradeFilters');
  const fixed = normalizeTrade({ id: 'x', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 2, createdAt: NaN, exitAt: NOW } as any);
  assert.equal(fixed.createdAt, NOW);
  const broken = normalizeTrade({ id: 'y', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 2, createdAt: 'çöp', accountCategory: 'CHALLENGE' } as any);
  assert.equal(isValidTrade(broken), false);
  const ok = t(1, { id: 'z', accountCategory: 'CHALLENGE' });
  const base: any = {
    activeAccountCategory: 'ALL', activeAccount: null, globalSelectedConfirmations: [], globalSelectedPlanFidelity: [], globalDateLimit: 'all',
    globalSelectedAssets: [], globalSelectedSessions: [], globalSelectedTimeframes: [], globalSelectedHtfTimeframes: [], globalSelectedStatuses: [],
    globalSelectedTypes: [], globalSelectedEntryModels: [], globalSelectedTrendTypes: [], globalMinAsiaRangePips: undefined, globalMaxAsiaRangePips: undefined,
  };
  const out = applyGlobalFilters([ok, broken], base, NOW);
  assert.deepEqual(out.map((x) => x.id), ['z']);
});

test('Çıkış Sonrası TP metni: cevap varsa Evet / Hayır, soru sorulmuyorsa "Erken Çıkılmadı", bilinmiyorsa boş', async () => {
  const { afterExitTpText, afterExitTpApplies } = await import('../src/lib/asiaAnalytics');
  // Plana göre kapanan kazanç: erken çıkış yok
  assert.deepEqual(afterExitTpText({ status: 'WIN', management: ['Plana Göre'] }), { text: 'Erken Çıkılmadı', answered: false });
  // Yalnız kısmi kâr: soru sorulmaz
  assert.deepEqual(afterExitTpText({ status: 'WIN', management: ['Kısmi Kâr'] }), { text: 'Erken Çıkılmadı', answered: false });
  // Erken kapatıldı + cevap
  assert.deepEqual(afterExitTpText({ status: 'WIN', management: ['Erken Kapatıldı'], afterExitTp: false }), { text: 'Hayır', answered: true });
  assert.deepEqual(afterExitTpText({ status: 'BREAKEVEN', afterExitTp: true }), { text: 'Evet', answered: true });
  // Soru sorulur ama cevap girilmemiş → boş (tire)
  assert.equal(afterExitTpText({ status: 'WIN', management: ['BE Çekildi'] }), undefined);
  // Yönetim hiç girilmemiş → bilinmiyor
  assert.equal(afterExitTpText({ status: 'LOSS' }), undefined);
  assert.equal(afterExitTpApplies('LOSS', ['Plana Göre']), false);
  assert.equal(afterExitTpApplies('BREAKEVEN', undefined), true);
});

test('seriler: BE nötrdür — seriyi bozmaz, sayılmaz; kayıp serisi ancak kazançla biter', async () => {
  const { calculateStrategyAnalytics } = await import('../src/lib/strategyAnalytics');
  const seq = (codes: string) =>
    codes.split('').map((c, i) => t(c === 'W' ? 2 : c === 'L' ? -1 : 0, { id: `s${i}`, createdAt: NOW - (100 - i) * DAY }));
  // L L BE L L → 4'lük kayıp serisi (eskiden BE seriyi kesip 2 gösteriyordu)
  let s = calculateStrategyAnalytics(seq('WLLBLLW')).streakStats;
  assert.equal(s.maxLossStreak, 4);
  assert.deepEqual(s.currentStreak, { type: 'WIN', count: 1 });
  // Kazanç seriyi bitirir
  s = calculateStrategyAnalytics(seq('LLWLLL')).streakStats;
  assert.equal(s.maxLossStreak, 3);
  assert.deepEqual(s.currentStreak, { type: 'LOSS', count: 3 });
  // Sondaki BE mevcut seriyi sıfırlamaz
  s = calculateStrategyAnalytics(seq('LWWB')).streakStats;
  assert.deepEqual(s.currentStreak, { type: 'WIN', count: 2 });
  s = calculateStrategyAnalytics(seq('WLLBB')).streakStats;
  assert.deepEqual(s.currentStreak, { type: 'LOSS', count: 2 });
  // Yalnızca BE: seri yok
  s = calculateStrategyAnalytics(seq('BBB')).streakStats;
  assert.deepEqual(s.currentStreak, { type: 'NONE', count: 0 });
  assert.equal(s.maxLossStreak, 0);
});
