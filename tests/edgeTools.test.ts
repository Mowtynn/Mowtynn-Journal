import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRangeMultiples, indexTradeOrder, prevTradeBucket, PREV_TRADE_BUCKETS } from '../src/lib/asiaAnalytics';
import { dimensionValue } from '../src/lib/setupScorecard';
import { simulateRule, matchesRule, ruleOptions } from '../src/lib/ruleSimulator';
import { computeEdgeSummary, validateOutOfSample, edgeReportRows } from '../src/lib/edgeSummary';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (200 - i) * DAY, ...p });

test('gün içi önceki işlem: aynı NY gününde bir önceki işlemin sonucu', () => {
  const day = Date.UTC(2026, 9, 21, 12, 0); // 08:00 NY
  const a = t(-1, { createdAt: day });
  const b = t(2, { createdAt: day + 3600_000 });
  const c = t(0, { createdAt: day + 7200_000 });
  const d = t(1, { createdAt: day + 3 * 3600_000 });
  const other = t(1, { createdAt: day + DAY });
  indexTradeOrder([d, c, b, a, other]);
  assert.deepEqual([a, b, c, d, other].map(prevTradeBucket), [PREV_TRADE_BUCKETS[0], 'Önceki Kaybetti', 'Önceki Kazandı', 'Önceki BE', PREV_TRADE_BUCKETS[0]]);
  assert.equal(dimensionValue(b, 'prevTrade'), 'Önceki Kaybetti');
});

test('Asia Range katı: dağılım, ulaşma oranı ve range katı TP simülasyonu', () => {
  const trades = [
    t(1, { asiaRangePips: 20, mfePips: 10, stopPips: 10 }, 1),  // 0.5×
    t(2, { asiaRangePips: 20, mfePips: 30, stopPips: 10 }, 2),  // 1.5×
    t(-1, { asiaRangePips: 20, mfePips: 4, stopPips: 10 }, 3),  // 0.2×
    t(3, { asiaRangePips: 20, mfePips: 50 }, 4),                 // 2.5×, stop yok: simülasyona girmez
  ];
  const r = analyzeRangeMultiples(trades)!;
  assert.equal(r.usable, 4);
  assert.deepEqual(r.distribution.map((b) => b.count), [1, 1, 0, 1, 1]);
  assert.equal(r.reach.find((x) => x.multiple === 1)!.pct, 50);
  assert.equal(r.sim.usable, 3);
  const at1 = r.sim.rows.find((x) => x.label === 'TP 1× Asia Range')!;
  // 1× range = 20 pip = 2R: yalnızca ikinci işlem ulaşır (+2); diğerleri gerçek sonucunu korur (+1, -1)
  assert.equal(at1.netR, 2);
  assert.equal(analyzeRangeMultiples([t(1, {}, 1)]), null);
});

test('kural simülatörü: yalnızca / hariç, çoklu alan, vazgeçilen işlemler ve iki yarı', () => {
  const trades = Array.from({ length: 20 }, (_, i) =>
    t(i % 2 ? 2 : -1, { session: i % 2 ? 'London' : 'NY AM', entryModels: i % 4 === 1 ? ['FVG', 'MSS'] : ['FVG'] }, i),
  );
  assert.ok(matchesRule(trades[1], [{ dim: 'entryModels', values: ['MSS'] }]));
  assert.ok(!matchesRule(trades[1], [{ dim: 'session', values: ['London'], exclude: true }]));
  assert.deepEqual(ruleOptions(trades, 'entryModels'), ['FVG', 'MSS']);

  const r = simulateRule(trades, [{ dim: 'session', values: ['London'] }]);
  assert.equal(r.taken.n, 10);
  assert.equal(r.taken.netR, 20);
  assert.equal(r.skipped.n, 10);
  assert.equal(r.skipped.netR, -10);
  assert.equal(r.all.netR, 10);
  assert.equal(r.curve[r.curve.length - 1].rule, 20);
  assert.equal(r.halves.status, 'CONSISTENT');

  const none = simulateRule(trades, []);
  assert.equal(none.taken.n, 20);
});

test('tesadüf testi: iki yarıda tutan bulgu "Tuttu", yalnızca ilk yarıda olan "Tutmadı"', () => {
  // London her zaman iyi; Trend yalnızca ilk yarıda iyi, ikinci yarıda kötü
  const trades = Array.from({ length: 80 }, (_, i) => {
    const london = i % 2 === 0;
    const trend = i % 4 < 2 ? 'Trend' : 'Range';
    const firstHalf = i < 40;
    let rr = london ? (i % 6 === 0 ? -1 : 2) : i % 6 === 1 ? 1 : -1;
    if (trend === 'Trend') rr = firstHalf ? Math.abs(rr) + 1 : -1;
    return t(rr, { session: london ? 'London' : 'NY AM', asiaRange: trend }, i);
  });
  const o = validateOutOfSample(trades);
  assert.ok(o.ready);
  const trendTake = o.findings.find((f) => f.title === 'Asia Range: Trend' && f.kind === 'TAKE');
  assert.ok(trendTake, 'Trend ilk yarıda güçlü bulgu olmalı');
  assert.equal(trendTake!.status, 'FAILED');
  assert.ok(o.findings.some((f) => f.status === 'HELD'));
  assert.equal(o.held + o.failed + o.untested, o.findings.length);

  assert.equal(validateOutOfSample(trades.slice(0, 20)).ready, false);
  // Kurallar iki yarı bilgisini taşır; Excel raporunda tesadüf testi satırları var
  const s = computeEdgeSummary(trades);
  assert.ok(s.rules.every((r) => r.halves));
  assert.ok(edgeReportRows(trades).some((r) => r.Tür === 'Tesadüf Testi'));
});

test('t kritik değeri: 30 üstünde gerçek t dağılımına yakın (aralık olduğundan dar çıkmaz)', async () => {
  const { tCrit95 } = await import('../src/lib/asiaAnalytics');
  // Gerçek değerler: t(31)=2.0395, t(40)=2.0211, t(60)=2.0003, t(100)=1.9840, t(1000)=1.9623
  for (const [df, v] of [[31, 2.0395], [40, 2.0211], [60, 2.0003], [100, 1.984], [1000, 1.9623]] as const) {
    assert.ok(Math.abs(tCrit95(df) - v) < 0.002, `df=${df}: ${tCrit95(df)}`);
  }
  assert.equal(tCrit95(10), 2.228);
});

test('stop tamponu aynı işlemler üzerinden: MAE ve stop girilmiş kazananlar', async () => {
  const { calculateStrategyAnalytics } = await import('../src/lib/strategyAnalytics');
  const s = calculateStrategyAnalytics([
    t(2, { stopPips: 10, maePips: 2 }, 1),
    t(2, { stopPips: 20, maePips: 8 }, 2),
    t(-1, { stopPips: 100, maePips: 100 }, 3), // kaybeden: tampona girmez
  ]).maeStats;
  assert.equal(s.stopCushionEfficiency, 67); // 1 − 10/30
});

test('P(Edge > 0) küçük örneklemde t dağılımıyla (normal dağılım kadar iyimser değil)', async () => {
  const { edgeFromR } = await import('../src/lib/asiaAnalytics');
  const small = edgeFromR([2, -1, 2, 1.5, -1]);
  // ortalama 0.7, se 0.7 → t = 1.0, df = 4: gerçek olasılık %81.3 (normal yaklaşım %84 verirdi)
  assert.ok(small.pPositive >= 80 && small.pPositive <= 82, String(small.pPositive));
  const big = edgeFromR(Array.from({ length: 200 }, (_, i) => (i % 2 ? 2 : -1)));
  assert.equal(big.pPositive, 100);
});
