import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrade, normalizeTrades } from '../src/lib/tradeModel';
import { calculateComprehensiveStats } from '../src/lib/stats';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { computeEdge, analyzeAsia, setGlobalTradeOrder, computeCoverage } from '../src/lib/asiaAnalytics';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { computeEdgeSummary, validateOutOfSample } from '../src/lib/edgeSummary';
import { buildSetupScorecard, DEFAULT_SETUP_DIMENSIONS } from '../src/lib/setupScorecard';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { sanitizePropAccounts, computeAccountMetrics, groupChains, computeBalanceSheet } from '../src/lib/propAccounts';
import { computeAccountRInsights } from '../src/lib/propInsights';
import { nyDateKey, nyInputToTs } from '../src/lib/tradingTime';
import { NOW, DAY, account } from './fixtures';
import type { Trade } from '../src/types';

let seed = 99;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];

function make(n: number): Trade[] {
  return Array.from({ length: n }, (_, i) => {
    const status = pick(['WIN', 'LOSS', 'LOSS', 'BREAKEVEN'] as const);
    return normalizeTrade({
      id: 'id' + i, asset: pick(['EURUSD', 'GBPUSD', 'USDCHF', 'EURCAD']), type: pick(['LONG', 'SHORT']), status,
      rr: status === 'WIN' ? 1 + rnd() * 3 : status === 'LOSS' ? -1 : 0,
      createdAt: NOW - Math.floor(rnd() * 1500) * DAY + Math.floor(rnd() * 5) * 3_600_000, notes: '', screenshot: null,
      session: pick(['London', 'NY AM']), asiaRange: pick(['Range', 'Trend', 'Swept']), trend: pick(['Reversal', 'Continuation']),
      entryModels: [pick(['MSS', 'iFVG', 'Breaker'])], setupQuality: pick(['A+', 'A', 'B-C']), stopPips: 4 + rnd() * 6,
      asiaRangePips: 15 + rnd() * 30, accountId: rnd() < 0.5 ? 'acc1' : undefined, accountStage: 1, riskAmount: 100,
      accountCategory: 'CHALLENGE',
    } as any);
  });
}

test('20.000 işlem: tüm analizler makul sürede biter', () => {
  const trades = make(20_000);
  const t0 = performance.now();
  setGlobalTradeOrder(trades);
  calculateComprehensiveStats(trades, NOW);
  computeDeepMetrics(trades);
  computeEdge(trades);
  computeEdgeDrift(trades);
  calculateStrategyAnalytics(trades);
  buildSetupScorecard(trades, DEFAULT_SETUP_DIMENSIONS);
  computeCoverage(trades);
  analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 5 });
  const tCore = performance.now() - t0;
  const t1 = performance.now();
  computeEdgeSummary(trades, undefined, NOW);
  validateOutOfSample(trades);
  const tLab = performance.now() - t1;
  const t2 = performance.now();
  computeAccountMetrics(account(), trades);
  computeAccountRInsights(account(), trades);
  const tProp = performance.now() - t2;
  console.log(`20k: çekirdek ${tCore.toFixed(0)}ms · lab ${tLab.toFixed(0)}ms · prop ${tProp.toFixed(0)}ms`);
  assert.ok(tCore < 4000, `çekirdek analiz çok yavaş: ${tCore}`);
  assert.ok(tLab < 15000, `lab çok yavaş: ${tLab}`);
  assert.ok(tProp < 4000, `prop çok yavaş: ${tProp}`);
});

test('aynı kimlikli işlemler: sıra indeksi ve analizler çökmez', () => {
  const base = make(40);
  const dup = [...base, ...base.slice(0, 10).map((t) => ({ ...t, rr: 0, status: 'BREAKEVEN' as const }))];
  setGlobalTradeOrder(dup);
  assert.doesNotThrow(() => {
    calculateStrategyAnalytics(dup);
    computeEdgeSummary(dup, undefined, NOW);
    buildSetupScorecard(dup, DEFAULT_SETUP_DIMENSIONS);
  });
});

test('yaz saati geçişi: NY 2 Kasım 2026 01:30 iki kez yaşanır, gün anahtarı doğru kalır', () => {
  // EDT → EST geçişi 1 Kasım 2026 Pazar 02:00 (NY). 01:30 EDT = 05:30Z, 01:30 EST = 06:30Z: ikisi de 1 Kasım
  assert.equal(nyDateKey(Date.UTC(2026, 10, 1, 5, 30)), '2026-11-01');
  assert.equal(nyDateKey(Date.UTC(2026, 10, 1, 6, 30)), '2026-11-01');
  // 8 Mart 2026 02:30 NY yoktur (ileri sarma); girdi yine de sonlu ve doğru güne düşer
  const ts = nyInputToTs('2026-03-08T02:30');
  assert.ok(Number.isFinite(ts));
  assert.equal(nyDateKey(ts), '2026-03-08');
  // Gece yarısı sınırı: 23:59 ve 00:00 farklı günler
  assert.notEqual(nyDateKey(nyInputToTs('2026-06-10T23:59')), nyDateKey(nyInputToTs('2026-06-11T00:00')));
});

test('bozuk prop hesapları: sanitize sonrası hesaplar NaN / çökme üretmez', () => {
  const raw = [
    { id: 'a', size: 0, chainId: 'c', stage: 1, riskPct: 0 },
    { id: 'b', size: 'abc', chainId: 'c2', stage: 99, phaseRules: 'x', riskPct: -5, adjustments: [{ amount: NaN }, null, { amount: 50, at: 'x' }] },
    { id: 'c', size: 1e12, chainId: 'c3', stage: 0, fundedMaxDdPct: 500, certificates: [{ kind: 'PAYOUT', amount: 'çok' }] },
    { id: 'd', size: -10000, drawdownMode: 'TRAILING', stage: 2 },
    null, 5, 'x', { noid: true },
  ];
  const accs = sanitizePropAccounts(raw);
  const trades = make(60).map((t, i) => ({ ...t, accountId: accs[i % Math.max(1, accs.length)]?.id }));
  for (const a of accs) {
    const m = computeAccountMetrics(a, trades);
    for (const [k, v] of Object.entries(m)) if (typeof v === 'number') assert.ok(!Number.isNaN(v), `NaN ${a.id}.${k}`);
    const ins = computeAccountRInsights(a, trades, { runs: 100 });
    assert.ok(ins);
  }
  const sheet = computeBalanceSheet(groupChains(accs));
  for (const v of Object.values(sheet)) if (typeof v === 'number') assert.ok(Number.isFinite(v));
});

test('bozuk yedek: normalizeTrades her şeyi güvenle eler / onarır', () => {
  const junk: any[] = [null, 1, 'x', [], { id: 5 }, { id: 'ok', asset: 'eurusd', type: 'short', status: 'loss', rr: '-1', createdAt: String(NOW) },
    { id: 'big', asset: 'X'.repeat(100000), type: 'LONG', status: 'WIN', rr: 1e308 * 10, createdAt: NOW }];
  const out = normalizeTrades(junk);
  for (const t of out) assert.ok(Number.isFinite(t.rr ?? 0));
  const ok = out.find((t) => t.id === 'ok')!;
  assert.equal(ok.status, 'LOSS');
  assert.equal(ok.rr, -1);
  assert.equal(normalizeTrades({} as any).length, 0);
});

test('prop yüzdeleri 0–100 aralığına sıkıştırılır', () => {
  const [a] = sanitizePropAccounts([{ id: 'x', size: 10000, chainId: 'c', stage: 0, phaseRules: [{ targetPct: 900, maxDdPct: 500 }], fundedMaxDdPct: 500, riskPct: 250 }]);
  assert.equal(a.phaseRules[0].maxDdPct, 100);
  assert.equal(a.phaseRules[0].targetPct, 100);
  assert.equal(a.fundedMaxDdPct, 100);
  assert.equal(a.riskPct, 100);
  const m = computeAccountMetrics(a, []);
  assert.ok(m.maxLossRemaining >= 0 && m.maxLossRemaining <= a.size);
});
