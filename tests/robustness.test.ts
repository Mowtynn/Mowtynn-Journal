import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateComprehensiveStats } from '../src/lib/stats';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { computeEdgeSummary, validateOutOfSample, edgeReportRows, computeTimeToTarget } from '../src/lib/edgeSummary';
import { computeAccountMetrics } from '../src/lib/propAccounts';
import { computeAccountRInsights } from '../src/lib/propInsights';
import { buildSetupScorecard, SETUP_DIMENSIONS } from '../src/lib/setupScorecard';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { simulateRule } from '../src/lib/ruleSimulator';
import { analyzeAsia, computeEdge } from '../src/lib/asiaAnalytics';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { computeTradeInsight } from '../src/lib/tradeInsight';
import { computeWeekReview, currentWeekStart } from '../src/lib/weeklyReview';
import { trade, account, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

/**
 * Sağlamlık: eksik / bozuk / uç değerli işlemlerle bütün analiz motorları hata vermeden çalışmalı
 * ve ekrana gidecek sayılar sonlu (NaN / Infinity değil) olmalı.
 */
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const maybe = <T,>(v: T) => (rnd() < 0.3 ? undefined : v);

function messyTrades(n: number): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < n; i++) {
    const status = pick(['WIN', 'LOSS', 'BREAKEVEN'] as const);
    const rr = status === 'WIN' ? rnd() * 4 : status === 'LOSS' ? -rnd() * 1.2 : 0;
    out.push(trade({
      status,
      rr: rnd() < 0.03 ? (NaN as number) : rr,
      createdAt: NOW - Math.floor(rnd() * 200) * DAY + Math.floor(rnd() * 86400000),
      exitAt: maybe(NOW - Math.floor(rnd() * 200) * DAY),
      asset: pick(['EURUSD', 'GBPUSD', 'eur/usd', '', 'XAUUSD']),
      type: pick(['LONG', 'SHORT'] as const),
      session: maybe(pick(['London', 'NY AM', ''])),
      asiaRange: maybe(pick(['Range', 'Trend', 'Swept'])),
      sweepTime: maybe(pick(['02:30', '03:15', '25:99', ''])),
      stopPips: maybe(pick([0, 5, 12, 30, -3])),
      tpPips: maybe(pick([0, 10, 25, 60])),
      asiaRangePips: maybe(pick([0, 15, 30, 55])),
      riskPct: maybe(pick([0, 0.5, 1, 12])),
      planFidelity: maybe(pick(['A+', 'A', 'B', 'C'])),
      entryModels: maybe(pick([[], ['FVG'], ['FVG', 'MSS']])),
      confirmations: maybe(pick([[], ['OB'], ['FVG', 'OB']])),
      management: maybe(pick([[], ['BE Çekildi']])),
      newsDay: maybe(pick([true, false])),
    } as Partial<Trade> & Pick<Trade, 'status' | 'rr'>));
  }
  return out;
}

const finiteDeep = (v: unknown, path = 'root', seen = new Set<unknown>()): void => {
  if (typeof v === 'number') {
    assert.ok(!Number.isNaN(v), `${path} NaN`);
    return;
  }
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  if ('status' in (v as object) && 'createdAt' in (v as object)) return; // ham işlem nesnesi (bilerek bozuk alan içerir)
  seen.add(v);
  if (Array.isArray(v)) v.slice(0, 60).forEach((x, i) => finiteDeep(x, `${path}[${i}]`, seen));
  else Object.entries(v as Record<string, unknown>).forEach(([k, x]) => {
    if (k === 'trades' || k === 'trade') return; // ham işlem nesneleri (bilerek bozuk alan içerir)
    finiteDeep(x, `${path}.${k}`, seen);
  });
};

for (const size of [0, 1, 2, 7, 60, 400]) {
  test(`analiz motorları ${size} bozuk/eksik alanlı işlemle çökmez ve NaN üretmez`, () => {
    const trades = messyTrades(size);
    finiteDeep(calculateComprehensiveStats(trades, NOW), 'stats');
    finiteDeep(computeDeepMetrics(trades), 'deep');
    finiteDeep(computeEdgeSummary(trades), 'edgeSummary');
    finiteDeep(validateOutOfSample(trades), 'oos');
    finiteDeep(edgeReportRows(trades), 'reportRows');
    for (const d of SETUP_DIMENSIONS) finiteDeep(buildSetupScorecard(trades, [d.id], { includeUnspecified: true }), `card.${d.id}`);
    finiteDeep(computeEdgeDrift(trades), 'drift');
    finiteDeep(simulateRule(trades, []), 'rule');
    finiteDeep(analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 3 }), 'asia');
    finiteDeep(computeEdge(trades), 'edge');
    finiteDeep(calculateStrategyAnalytics(trades), 'strategy');
    finiteDeep(computeWeekReview(trades, currentWeekStart(NOW)), 'week');
    if (trades.length) finiteDeep(computeTradeInsight(trades[0], trades), 'insight');
    finiteDeep(computeTimeToTarget(trades), 'ttt');
    const acc = account({ id: 'acc1', size: 10000, riskPct: 1, dailyLossPct: 5 });
    const accTrades = trades.map((t) => ({ ...t, accountId: 'acc1' }));
    finiteDeep(computeAccountMetrics(acc, accTrades), 'propMetrics');
    finiteDeep(computeAccountRInsights(acc, accTrades, { runs: 50 }), 'propInsights');
  });
}
