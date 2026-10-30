import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeFromR, analyzeAsia, computeEdge, setGlobalTradeOrder, tCrit95 } from '../src/lib/asiaAnalytics';
import { calculateComprehensiveStats } from '../src/lib/stats';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { buildSetupScorecard, SETUP_DIMENSIONS, dimensionValue, UNSPECIFIED } from '../src/lib/setupScorecard';
import { computeEdgeSummary, scanPairs } from '../src/lib/edgeSummary';
import { simulateRule } from '../src/lib/ruleSimulator';
import { calculateSQN } from '../src/utils/math';
import { tradeSummaryRows } from '../src/utils/exportTrades';
import type { Trade } from '../src/types';

/**
 * Bağımsız doğrulama: (1) temel formüller elle hesaplanmış / ders kitabı değerleriyle,
 * (2) aynı ölçü farklı modüllerde aynı sonucu veriyor mu, (3) rastgele verilerde matematiksel değişmezler.
 */

const close = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} ≠ ${b}`);

test('temel formüller: elle hesaplanan örnek', () => {
  // R: +2, −1, +3, 0, −1 → net 3, ortalama 0.6
  const e = edgeFromR([2, -1, 3, 0, -1], ['WIN', 'LOSS', 'WIN', 'BREAKEVEN', 'LOSS']);
  assert.equal(e.n, 5);
  assert.equal(e.netR, 3);
  assert.equal(e.expectancy, 0.6);
  // örneklem std: Σ(r−0.6)² = 1.96+2.56+5.76+0.36+2.56 = 13.2 → /4 = 3.3 → √ = 1.8166
  close(e.sd, 1.817, 0.001, 'sd');
  // %95 aralık: 0.6 ± 2.776 × 1.8166/√5 = 0.6 ± 2.2553
  close(e.expLo, -1.655, 0.001, 'expLo');
  close(e.expHi, 2.855, 0.001, 'expHi');
  // PF = 5 / 2
  assert.equal(e.profitFactor, 2.5);
  // Kazanma %40; Wilson %95: [11.8, 76.9]
  assert.equal(e.winRate, 40);
  close(e.wrLo, 11.8, 0.1, 'wrLo');
  close(e.wrHi, 76.9, 0.1, 'wrHi');
  // Sermaye: 2, 1, 4, 4, 3 → zirve 4, max DD 1 (2→1), şu anki DD 1
  assert.equal(e.maxDrawdownR, 1);
  assert.equal(e.currentDrawdownR, 1);
  assert.equal(e.avgWin, 2.5);
  assert.equal(e.avgLoss, -1);
  // SQN = √5 × 0.6 / 1.8166 = 0.7385
  close(calculateSQN([2, -1, 3, 0, -1]), 0.7385, 0.001, 'SQN');
});

test('kanıt için gereken işlem: önerilen toplamda aralık gerçekten sıfırın üstüne çıkar, bir eksiğinde çıkmaz', () => {
  const rs = [2, -1, 2, -1, -1, 2, 1, -1, 2, -1];
  const e = edgeFromR(rs);
  assert.ok(e.tradesNeeded !== null && e.tradesNeeded > 0);
  const k = rs.length + (e.tradesNeeded as number);
  // aynı ortalama ve std ile: k işlemde alt sınır > 0, k − 1'de ≤ 0 (aralıkla aynı t-değeri)
  const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / (rs.length - 1));
  const lo = (m: number) => mean - tCrit95(m - 1) * (sd / Math.sqrt(m));
  assert.ok(lo(k) > 0, `k=${k}`);
  assert.ok(lo(k - 1) <= 0, `k−1=${k - 1}`);
});

/* ---------------- rastgele veri ---------------- */

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
function dataset(n: number): Trade[] {
  return Array.from({ length: n }, (_, i) => {
    const u = rnd();
    const rr = u < 0.42 ? Math.round((0.5 + rnd() * 3) * 100) / 100 : u < 0.55 ? 0 : -1;
    const t0 = Date.UTC(2025, 0, 2) + i * 0.6 * 86400000 + Math.floor(rnd() * 10) * 3600000;
    return {
      id: `r${n}_${i}`, asset: pick(['EURUSD', 'GBPUSD']), type: pick(['LONG', 'SHORT']),
      status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: t0, notes: '', screenshot: null,
      session: rnd() < 0.9 ? pick(['London', 'NY AM']) : undefined, asiaRange: pick(['Range', 'Trend', 'Swept']),
      entryModels: rnd() < 0.3 ? ['FVG', 'MSS'] : [pick(['FVG', 'MSS'])], planFidelity: pick(['A+', 'A', 'B-C']),
      stopPips: 8 + rnd() * 10, tpPips: 15 + rnd() * 20, maePips: rnd() * 12, mfePips: rnd() * 35, asiaRangePips: 15 + rnd() * 25,
      newsDay: rnd() < 0.2,
    } as Trade;
  });
}

for (const n of [7, 60, 250]) {
  test(`tutarlılık ve değişmezler (${n} işlem)`, () => {
    const trades = dataset(n);
    setGlobalTradeOrder(trades);
    const rs = trades.map((t) => t.rr);
    const net = rs.reduce((s, r) => s + r, 0);
    const wins = trades.filter((t) => t.status === 'WIN').length;
    const pos = rs.filter((r) => r > 0).reduce((s, r) => s + r, 0);
    const neg = -rs.filter((r) => r < 0).reduce((s, r) => s + r, 0);

    // Aynı ölçü her modülde aynı
    const stats = calculateComprehensiveStats(trades);
    const deep = computeDeepMetrics(trades);
    const edge = computeEdge(trades);
    const strat = calculateStrategyAnalytics(trades);
    const summaryRow = Object.fromEntries(tradeSummaryRows(trades).map((r) => [r.Metrik, r.Değer]));
    for (const [label, v] of [['stats', stats.netR], ['deep', deep.totalR], ['edge', edge.netR], ['strategy', strat.overallScore.netR], ['excel', summaryRow['Toplam Net R']]] as const) close(Number(v), net, 0.011, `net R ${label}`);
    for (const [label, v] of [['stats', stats.winRate], ['edge', edge.winRate], ['strategy', strat.overallScore.winRate], ['excel', summaryRow['Kazanma Oranı (%)']]] as const) close(Number(v), (wins / n) * 100, 0.06, `WR ${label}`);
    for (const [label, v] of [['stats', stats.expectancyRR], ['deep', deep.expectancy], ['edge', edge.expectancy], ['strategy', strat.overallScore.expectancy]] as const) close(Number(v), net / n, 0.006, `beklenti ${label}`);
    const pf = neg > 0 ? pos / neg : 999;
    for (const [label, v] of [['stats', stats.profitFactorRR], ['deep', deep.pureProfitFactor], ['edge', edge.profitFactor], ['strategy', strat.overallScore.profitFactor]] as const) close(Number(v), pf, 0.006, `PF ${label}`);
    close(deep.maxDrawdown, edge.maxDrawdownR, 0.006, 'max DD');
    close(deep.sqn, calculateSQN(rs), 1e-9, 'SQN');

    // Güven aralıkları sıralı ve tutarlı
    for (const e of [edge, ...analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 3 }).pairs.map((p) => p.stats)]) {
      assert.ok(e.expLo <= e.expectancy + 1e-9 && e.expectancy <= e.expHi + 1e-9, 'expLo ≤ exp ≤ expHi');
      assert.ok(e.wrLo <= e.winRate + 0.05 && e.winRate <= e.wrHi + 0.05, 'Wilson sırası');
      assert.ok(e.currentDrawdownR <= e.maxDrawdownR + 1e-9, 'şu anki DD ≤ max DD');
      assert.ok(e.pPositive >= 0 && e.pPositive <= 100);
      assert.equal(e.wins + e.losses + e.breakevens, e.n);
    }

    // Tek değerli alanlarda gruplar tüm işlemleri bölüştürür: toplamlar korunur
    for (const d of SETUP_DIMENSIONS.filter((x) => !['entryModels', 'tpTargets', 'confirmations', 'management'].includes(x.id))) {
      const card = buildSetupScorecard(trades, [d.id], { includeUnspecified: true });
      const sumN = card.rows.reduce((s, r) => s + r.edge.n, 0);
      const sumR = card.rows.reduce((s, r) => s + r.edge.netR, 0);
      assert.equal(sumN, n, `${d.label} işlem sayısı`);
      close(sumR, net, 0.02 * card.rows.length + 0.01, `${d.label} net R`);
    }

    // Kural simülatörü: alınan + vazgeçilen = tümü
    const sim = simulateRule(trades, [{ dim: 'session', values: ['London'] }]);
    assert.equal(sim.taken.n + sim.skipped.n, n);
    close(sim.taken.netR + sim.skipped.netR, net, 0.02, 'kural net R');
    close(sim.curve[sim.curve.length - 1].all, net, 1e-6, 'eğri sonu');

    // Saat × parite ısı tablosu hücreleri tüm işlemleri bölüştürür
    const lab = analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 3 });
    const cellN = Object.values(lab.hourPair.cells).reduce((s, c) => s + c.n, 0);
    assert.equal(cellN, n, 'ısı tablosu');
    // Kombinasyonlar en az eşik kadar işlemli ve sıralı (alt sınıra göre azalan)
    lab.combos.forEach((c, i) => {
      assert.ok(c.stats.n >= 3);
      if (i) assert.ok(lab.combos[i - 1].stats.expLo >= c.stats.expLo - 1e-9, 'kombinasyon sırası');
    });

    // İkili birleşim taraması: her birleşimin işlem sayısı doğrudan sayımla aynı, lift tanıma uygun
    const pairs = scanPairs(trades, 3);
    for (const p of pairs.slice(0, 40)) {
      const list = trades.filter((t) => dimensionValue(t, p.dims[0]) === p.values[0] && dimensionValue(t, p.dims[1]) === p.values[1]);
      assert.equal(p.edge.n, list.length, p.title);
      close(p.edge.netR, list.reduce((s, t) => s + t.rr, 0), 0.011, p.title);
    }

    // Edge Özeti: güçlü yanlar pozitif, sızıntılar negatif beklentili; değerler belirtilmiş
    const s = computeEdgeSummary(trades);
    s.strengths.forEach((x) => assert.ok(x.edge.expectancy > 0 && x.value !== UNSPECIFIED));
    s.leaks.forEach((x) => assert.ok(x.edge.expectancy < 0 && x.value !== UNSPECIFIED));
    s.rules.forEach((r) => assert.ok(r.kind === 'TAKE' ? r.edge.expectancy > 0 : r.edge.expectancy < 0, r.title));
  });
}

test('zamanla değişim: z değeri iki ortalamanın Welch standart hatasıyla', async () => {
  const { driftFromR } = await import('../src/lib/edgeDrift');
  const before = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? -1 : 2));
  const recent = Array.from({ length: 20 }, (_, i) => (i % 2 ? -1 : 0.5));
  const d = driftFromR([...before, ...recent], [...before, ...recent].map((r) => (r > 0 ? 'WIN' : 'LOSS')), 20, 40);
  const m = (a: number[]) => a.reduce((s, r) => s + r, 0) / a.length;
  const v = (a: number[]) => a.reduce((s, r) => s + (r - m(a)) ** 2, 0) / (a.length - 1);
  const z = (m(recent) - m(before)) / Math.sqrt(v(recent) / recent.length + v(before) / before.length);
  close(d.z, z, 0.01, 'z');
  assert.equal(d.direction, 'WEAKENING');
  assert.equal(d.strength, 'CONFIRMED');
});

test('disiplin: kurala uyan + ihlal eden = gerçekleşen; ihlal maliyeti tanımla uyumlu', async () => {
  const { analyzeDiscipline } = await import('../src/lib/discipline');
  const trades = dataset(120);
  const rep = analyzeDiscipline(trades);
  close(rep.cleanEdge.netR + rep.violatingEdge.netR, rep.actualNetR, 0.03, 'temiz + ihlal');
  close(rep.allRulesNetR, rep.cleanEdge.netR, 0.011, 'kurallara uyulsaydı');
  for (const r of rep.rules) {
    close(r.costR + r.withoutNetR, rep.actualNetR, 1e-6, r.title);
    assert.equal(r.violations, r.tradeIds.length);
  }
});

test('strateji laboratuvarı alt tabloları işlemleri eksiksiz bölüştürür', () => {
  const trades = dataset(150);
  const s = calculateStrategyAnalytics(trades);
  const n = trades.length;
  const net = trades.reduce((a, t) => a + t.rr, 0);
  const sum = (xs: Array<{ total: number; netR: number }>) => [xs.reduce((a, x) => a + x.total, 0), xs.reduce((a, x) => a + x.netR, 0)];
  for (const [label, rows] of [['saat', s.hourlyStats], ['seans × yön', s.sessionDirectionStats], ['parite', s.assetStats], ['kalite', s.setupQualityStats.ranking], ['hesap türü', s.accountCategoryStats], ['trend', s.trendStats.ranking]] as const) {
    const [cnt, r] = sum(rows as any);
    assert.equal(cnt, n, label);
    close(r, net, 0.05, label);
  }
  // Hafta içi günleri: hafta sonu işlemleri hariç toplam ≤ n
  assert.ok(s.dayOfWeekStats.reduce((a, d) => a + d.total, 0) <= n);
  // Asia range dilimleri: aralığı girilmiş işlemleri bölüştürür
  const b = s.asiaRangeStats.brackets;
  assert.equal(b.tight.count + b.medium.count + b.wide.count, trades.filter((t) => (t.asiaRangePips || 0) > 0).length);
  // Seri: en uzun seriler toplamı aşmaz, kayıp sonrası WR 0–100
  assert.ok(s.streakStats.maxWinStreak <= s.totalTrades && s.streakStats.postLossWinRate >= 0 && s.streakStats.postLossWinRate <= 100);
});

test('prop simülasyonu: uç durumlarda olasılıklar doğru yönde', async () => {
  const { computeAccountRInsights } = await import('../src/lib/propInsights');
  const acc = { id: 'p', chainId: 'p', chainName: 'T', name: 'T · Phase 1', size: 100000, drawdownMode: 'STATIC', stage: 1, phaseRules: [{ targetPct: 10, maxDdPct: 10 }], fundedMaxDdPct: 10, riskPct: 1, status: 'ACTIVE', createdAt: 0 } as any;
  const mk = (rr: number, i: number) => ({ id: `p${i}`, asset: 'EURUSD', type: 'LONG', status: rr > 0 ? 'WIN' : 'LOSS', rr, createdAt: Date.UTC(2026, 0, 1) + i * 86400000, notes: '', screenshot: null, accountId: 'p', accountStage: 1, riskAmount: 1000 }) as Trade;
  const good = computeAccountRInsights(acc, Array.from({ length: 30 }, (_, i) => mk(i % 4 === 0 ? -1 : 2, i)).slice(0, 4), { runs: 500 });
  // 4 işlem: +... hesabın kendi örneklemi az → tüm prop geçmişi (aynı 4 işlem) < 10: olasılık gösterilmez
  assert.equal(good.simulation, undefined);
  // 15 işlem, net +5R (hedef 10R'ye ulaşılmadı), işlem başına +0.33R: geçme olasılığı yüksek olmalı
  const winners = computeAccountRInsights(acc, Array.from({ length: 15 }, (_, i) => mk(i % 3 === 0 ? -1 : 1, i)), { runs: 800 });
  assert.equal(winners.targetRemainingR, 5);
  assert.ok(winners.simulation && winners.simulation.kind === 'PASS' && winners.simulation.probability > 80, String(winners.simulation?.probability));
  const losers = computeAccountRInsights(acc, Array.from({ length: 6 }, (_, i) => mk(i % 3 === 0 ? 1 : -1, i)).concat(Array.from({ length: 6 }, (_, i) => mk(-1, i + 6))), { runs: 800 });
  assert.ok(losers.simulation === undefined || losers.simulation.probability < 10, String(losers.simulation?.probability));
  // DD'ye kalan R: (10.000$ − kayıp) / 1R
  close(losers.ddRemainingR, (10000 + losers.netR * 1000) / 1000, 1e-6, 'DD R');
});
