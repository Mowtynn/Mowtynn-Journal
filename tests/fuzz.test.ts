import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrade } from '../src/lib/tradeModel';
import { calculateComprehensiveStats, breakevenWinRateOf } from '../src/lib/stats';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { computeEdge, analyzeAsia, computeCoverage, setGlobalTradeOrder } from '../src/lib/asiaAnalytics';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { computeEdgeSummary, validateOutOfSample, edgeReportRows } from '../src/lib/edgeSummary';
import { buildSetupScorecard, SETUP_DIMENSIONS, DEFAULT_SETUP_DIMENSIONS } from '../src/lib/setupScorecard';
import { simulateRule, ruleOptions } from '../src/lib/ruleSimulator';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { computeAccountMetrics } from '../src/lib/propAccounts';
import { computeAccountRInsights } from '../src/lib/propInsights';
import { computeWeekReview, weekStartOf } from '../src/lib/weeklyReview';
import { computeTradeInsight } from '../src/lib/tradeInsight';
import { nyDateKey } from '../src/lib/tradingTime';
import { account, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

let seed = Number(process.env.FUZZ_SEED) || 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const maybe = <T,>(v: T, p = 0.7): T | undefined => (rnd() < p ? v : undefined);

const WEIRD_NUMS = [NaN, Infinity, -Infinity, 0, -0, 1e-12, 1e9, -3.333333, 2.75, null as any, undefined as any, '2.5' as any];

function rawTrade(i: number, weird: boolean): Record<string, any> {
  const status = pick(['WIN', 'LOSS', 'BREAKEVEN', 'WIN', 'LOSS', weird ? 'FOO' : 'WIN']);
  const rr = weird && rnd() < 0.2 ? pick(WEIRD_NUMS) : status === 'WIN' ? +(rnd() * 5).toFixed(2) : status === 'LOSS' ? -+(rnd() * 1.2).toFixed(2) : 0;
  const onAcc = rnd() < 0.5;
  return {
    id: 't' + i,
    asset: pick(['EURUSD', 'GBPUSD', 'eur/usd', 'USDCHF', 'EURCAD', '', weird ? undefined : 'EURUSD']),
    type: pick(['LONG', 'SHORT', weird ? 'X' : 'LONG']),
    status,
    rr,
    createdAt: NOW - Math.floor(rnd() * 200) * DAY - Math.floor(rnd() * 86_400_000) + (weird && rnd() < 0.05 ? NaN : 0),
    exitAt: maybe(NOW - Math.floor(rnd() * 200) * DAY, 0.4),
    session: maybe(pick(['London', 'NY AM', 'NY PM', 'Asia', '']), 0.8),
    asiaRange: maybe(pick(['Range', 'Trend', 'Swept'])),
    trend: maybe(pick(['Reversal', 'Continuation'])),
    entryModels: maybe(pick([['MSS'], ['Breaker', 'FVG'], [], ['iFVG']])),
    setupQuality: maybe(pick(['A+', 'A', 'B-C'])),
    newsDay: maybe(pick([true, false])),
    stopPips: weird ? maybe(pick(WEIRD_NUMS)) : maybe(+(3 + rnd() * 12).toFixed(1)),
    tpPips: maybe(+(10 + rnd() * 30).toFixed(1)),
    asiaRangePips: weird ? maybe(pick(WEIRD_NUMS)) : maybe(+(10 + rnd() * 40).toFixed(1)),
    sweepTime: maybe(pick(['21:30', '02:15', '00:00', '23:59', weird ? '99:99' : '03:00', ''])),
    riskPct: maybe(pick([0.5, 0.75, 0.8, 1])),
    riskAmount: weird ? maybe(pick(WEIRD_NUMS)) : maybe(pick([50, 80, 100])),
    accountId: onAcc ? 'acc1' : undefined,
    accountStage: onAcc ? 1 : undefined,
    accountCategory: onAcc ? 'CHALLENGE' : pick(['DEMO', 'FUNDED', 'CHALLENGE', undefined]),
    isBacktest: rnd() < 0.2,
    management: maybe(pick(['PLAN', 'EARLY', 'PARTIAL'])),
    afterExitTp: maybe(pick([true, false])),
    notes: '',
  };
}

/** Sonuçtaki tüm sayılar sonlu olmalı (Infinity yalnızca bilinçli PF ∞ için izinli) */
function assertFinite(v: unknown, path: string, allowInf: RegExp | null = /profitFactor|pf|PF/): void {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) assert.fail(`NaN @ ${path}`);
    if (!Number.isFinite(v) && !(allowInf && allowInf.test(path))) assert.fail(`Infinity @ ${path}`);
    return;
  }
  if (Array.isArray(v)) return v.forEach((x, i) => assertFinite(x, `${path}[${i}]`, allowInf));
  if (v && typeof v === 'object' && !(v instanceof Map) && !(v instanceof Set) && !(v instanceof Date)) {
    for (const [k, x] of Object.entries(v)) if (typeof x !== 'function') assertFinite(x, `${path}.${k}`, allowInf);
  }
}

for (const weird of [false, true]) {
  for (const size of [0, 1, 2, 5, 31, 140]) {
    test(`fuzz: ${size} işlem${weird ? ' (bozuk değerli)' : ''} — hiçbir analiz NaN / hata üretmez`, () => {
      const all: Trade[] = Array.from({ length: size }, (_, i) => normalizeTrade(rawTrade(i, weird) as any));
      // Uygulamadaki gibi: zamanı bozuk kayıt analizlere girmez (applyGlobalFilters), sıra indeksi tüm kayıtlarla kurulur
      const trades = all.filter((t) => Number.isFinite(t.createdAt));
      // normalize sonrası temel değişmezler
      for (const t of trades) {
        assert.ok(Number.isFinite(t.rr ?? 0), `rr sonlu değil: ${t.rr}`);
        if (t.status === 'WIN') assert.ok((t.rr ?? 0) >= 0);
        if (t.status === 'LOSS') assert.ok((t.rr ?? 0) <= 0);
        if (t.status === 'BREAKEVEN') assert.equal(t.rr ?? 0, 0);
      }
      setGlobalTradeOrder(all);
      const st = calculateComprehensiveStats(trades, NOW);
      assertFinite(st, 'stats');
      const dm = computeDeepMetrics(trades);
      assertFinite(dm, 'deep');
      // çapraz tutarlılık
      const net = trades.reduce((a, t) => a + (t.rr || 0), 0);
      assert.ok(Math.abs(dm.totalR - net) < 1e-9 * Math.max(1, Math.abs(net) * 1e3));
      assert.ok(Math.abs(st.netR - net) < 1e-9 * Math.max(1, Math.abs(net) * 1e3));
      assert.equal(st.totalTrades, trades.length);
      assert.ok(dm.maxDrawdown >= 0);
      if (trades.length) assert.ok(st.winRate >= 0 && st.winRate <= 100);
      const be = breakevenWinRateOf(trades);
      if (be !== null) assert.ok(be >= 0 && be <= 100);
      const e = computeEdge(trades);
      assertFinite(e, 'edge');
      if (e.n > 1) assert.ok(e.expLo <= e.expectancy + 1e-9 && e.expectancy <= e.expHi + 1e-9);
      assertFinite(calculateStrategyAnalytics(trades), 'strategy');
      assertFinite(computeEdgeSummary(trades, undefined, NOW), 'summary');
      assertFinite(validateOutOfSample(trades), 'oos');
      edgeReportRows(trades);
      assertFinite(buildSetupScorecard(trades, DEFAULT_SETUP_DIMENSIONS), 'scorecard');
      for (const d of SETUP_DIMENSIONS.slice(0, 6)) {
        const opts = ruleOptions(trades, d.id);
        if (opts.length) assertFinite(simulateRule(trades, [{ dim: d.id, values: [opts[0]] } as any]), 'rule');
      }
      // Korunum: bölünen parçalar toplama eşit
      const near = (x: number, y: number) => Math.abs(x - y) < 1e-6 * Math.max(1, Math.abs(y));
      const sc = buildSetupScorecard(trades, DEFAULT_SETUP_DIMENSIONS, { minSample: 1 });
      assert.equal(sc.total + sc.unspecifiedCount, trades.length, 'karne: gruplanan + belirsiz = tüm işlemler');
      assert.equal(sc.rows.reduce((a, r) => a + r.edge.n, 0), sc.total, 'karne satırları toplamı');
      for (const r of sc.rows) assert.equal(r.edge.wins + r.edge.losses + r.edge.breakevens, r.edge.n);
      for (const d of SETUP_DIMENSIONS) {
        const opts = ruleOptions(trades, d.id);
        if (!opts.length) continue;
        const sim = simulateRule(trades, [{ dim: d.id, values: [opts[0]] } as any]);
        assert.equal(sim.taken.n + sim.skipped.n, sim.total, `kural ${d.id}: alınan + atlanan`);
        assert.equal(sim.total, trades.length);
        // Her parça ayrı ayrı 2 ondalığa yuvarlandığı için toplamda en fazla 0.01 fark olabilir
        assert.ok(Math.abs(sim.taken.netR + sim.skipped.netR - sim.all.netR) < 0.011 || near(sim.taken.netR + sim.skipped.netR, sim.all.netR), `kural ${d.id}: R korunumu (${sim.taken.netR} + ${sim.skipped.netR} vs ${sim.all.netR}; n ${sim.taken.n}+${sim.skipped.n})`);
      }
      const wk = computeWeekReview(trades, weekStartOf(nyDateKey(NOW)));
      assert.equal(wk.totals.wins + wk.totals.losses + wk.totals.breakevens, wk.totals.n);
      assert.equal(wk.totals.n, wk.trades.length);
      assert.ok(near(wk.totals.netR, wk.trades.reduce((a, t) => a + (t.rr || 0), 0)));
      assert.equal(wk.days.reduce((a, d: any) => a + (d.n ?? d.count ?? 0), 0), wk.totals.n, 'hafta günleri toplamı');
      const sa = calculateStrategyAnalytics(trades);
      assertFinite(sa, 'sa');
      assertFinite(computeEdgeDrift(trades), 'drift');
      assertFinite(computeCoverage(trades), 'coverage');
      assertFinite(analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 5 }), 'asia', /profitFactor|pf/i);
      const acc = account();
      const am = computeAccountMetrics(acc, trades);
      assertFinite(am, 'prop', /profitFactor|pf|Infinity/i);
      assertFinite(computeAccountRInsights(acc, trades, { runs: 200 }), 'propR');
      assertFinite(computeWeekReview(trades, weekStartOf(nyDateKey(NOW))), 'week');
      if (trades.length) assertFinite(computeTradeInsight(trades[0], trades), 'insight');
    });
  }
}
