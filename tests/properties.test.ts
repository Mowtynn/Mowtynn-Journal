import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrade } from '../src/lib/tradeModel';
import { calculateComprehensiveStats, breakevenWinRateOf } from '../src/lib/stats';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { computeEdge, edgeFromR, tCrit95, analyzeAsia, computeCoverage, setGlobalTradeOrder } from '../src/lib/asiaAnalytics';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { computeEdgeSummary, validateOutOfSample } from '../src/lib/edgeSummary';
import { buildSetupScorecard, SETUP_DIMENSIONS, DEFAULT_SETUP_DIMENSIONS } from '../src/lib/setupScorecard';
import { simulateRule, ruleOptions } from '../src/lib/ruleSimulator';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { computeAccountMetrics } from '../src/lib/propAccounts';
import { computeWeekReview, weekStartOf, weekDays } from '../src/lib/weeklyReview';
import { nyDateKey, getNyParts, toNyInput, nyInputToTs } from '../src/lib/tradingTime';
import { account, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

/**
 * Özellik (property) testleri: her metrik, kütüphaneden bağımsız yazılmış saf bir "ikinci hesap" ile ve
 * girdinin sırasını / ölçeğini değiştirince sonucun nasıl değişmesi gerektiğiyle karşılaştırılır.
 */

let seed = Number(process.env.PROP_SEED) || 4242;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const shuffle = <T,>(a: T[]): T[] => {
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};

/** `sameTimeEvery` > 0 ise her N işlemde bir, bir öncekiyle AYNI dakikaya düşen işlem üretir */
function make(n: number, sameTimeEvery = 0): Trade[] {
  const used = new Set<number>();
  let prev = 0;
  return Array.from({ length: n }, (_, i) => {
    const status = pick(['WIN', 'LOSS', 'LOSS', 'BREAKEVEN', 'WIN'] as const);
    let createdAt: number;
    if (sameTimeEvery > 0 && i > 0 && i % sameTimeEvery === 0) createdAt = prev;
    else {
      do createdAt = NOW - Math.floor(rnd() * 120) * DAY - Math.floor(rnd() * 1440) * 60_000;
      while (used.has(createdAt));
    }
    used.add(createdAt);
    prev = createdAt;
    const onAcc = rnd() < 0.6;
    return normalizeTrade({
      id: `trade-${1_700_000_000_000 + i}-${i.toString(36)}`,
      asset: pick(['EURUSD', 'GBPUSD', 'XAUUSD']),
      type: pick(['LONG', 'SHORT']),
      status,
      rr: status === 'WIN' ? +(0.5 + rnd() * 3).toFixed(2) : status === 'LOSS' ? -+(0.3 + rnd() * 0.9).toFixed(2) : 0,
      createdAt,
      session: pick(['London', 'NY AM', undefined]),
      asiaRange: pick(['Range', 'Trend', 'Swept', undefined]),
      trend: pick(['Reversal', 'Continuation']),
      entryModels: [pick(['MSS-FVG', 'CISD'])],
      planFidelity: pick(['A+', 'A', 'B-C']),
      stopPips: +(4 + rnd() * 8).toFixed(1),
      tpPips: +(10 + rnd() * 25).toFixed(1),
      asiaRangePips: +(12 + rnd() * 30).toFixed(1),
      management: [pick(['Plana Göre', 'Erken Kapatıldı', 'BE Çekildi', 'Kısmi Kâr'])],
      afterExitTp: pick([true, false, undefined]),
      newsDay: pick([true, false]),
      riskPct: pick([0.5, 0.8, 1]),
      riskAmount: pick([40, 50, 80]),
      accountId: onAcc ? 'acc1' : undefined,
      accountStage: onAcc ? 1 : undefined,
      accountCategory: 'CHALLENGE',
      notes: '',
      screenshot: null,
    } as any);
  });
}

/** İşlem nesnelerini kimliğe indirger (sonuçlar girdi nesnelerine referans tutabilir) */
const plain = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (_k, x) => {
      if (x && typeof x === 'object' && !Array.isArray(x) && typeof (x as any).id === 'string' && typeof (x as any).createdAt === 'number' && 'asset' in (x as any)) return `#${(x as any).id}`;
      if (typeof x === 'number' && !Number.isFinite(x)) return String(x);
      return x;
    }),
  );

function assertClose(a: any, b: any, path: string): void {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) assert.fail(`${path}: ${a} ≠ ${b}`);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    assert.equal(a.length, b.length, `${path}: dizi uzunluğu ${a.length} ≠ ${b.length}`);
    a.forEach((x, i) => assertClose(x, b[i], `${path}[${i}]`));
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) assertClose(a[k], b[k], `${path}.${k}`);
    return;
  }
  assert.equal(a, b, path);
}

/** Tüm analizlerin tek anlık görüntüsü */
function snapshot(trades: Trade[]) {
  setGlobalTradeOrder(trades);
  const week = weekStartOf(nyDateKey(NOW - 10 * DAY));
  const sims: Record<string, unknown> = {};
  for (const d of SETUP_DIMENSIONS) {
    const opts = [...ruleOptions(trades, d.id)].sort();
    if (opts.length) sims[d.id] = simulateRule(trades, [{ dim: d.id, values: [opts[0]] } as any]);
  }
  const acc = account({ dailyLossPct: 4, adjustments: [{ id: 'a1', at: NOW - 40 * DAY, amount: -35, realBalance: 0 }] });
  return plain({
    stats: calculateComprehensiveStats(trades, NOW),
    be: breakevenWinRateOf(trades),
    deep: computeDeepMetrics(trades),
    edge: computeEdge(trades),
    drift: computeEdgeDrift(trades),
    strategy: calculateStrategyAnalytics(trades),
    card: buildSetupScorecard(trades, DEFAULT_SETUP_DIMENSIONS),
    summary: computeEdgeSummary(trades, undefined, NOW),
    oos: validateOutOfSample(trades),
    coverage: computeCoverage(trades),
    // `trades` alanı süzülen girdinin kendisidir (analiz değil): sıra karşılaştırmasına girmez
    asia: { ...analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 5 }), trades: undefined },
    week: computeWeekReview(trades, week),
    prop: computeAccountMetrics(acc, trades),
    sims,
  });
}

for (const [label, every] of [['benzersiz zamanlar', 0], ['aynı dakikaya düşen işlemler', 4]] as const) {
  test(`sıra bağımsızlığı (${label}): işlemler hangi sırayla saklanırsa saklansın tüm analizler aynı çıkar`, () => {
    for (const n of [7, 45, 130]) {
      const trades = make(n, every);
      const base = snapshot(trades);
      for (let k = 0; k < 3; k++) assertClose(snapshot(shuffle(trades)), base, `n=${n}`);
      assertClose(snapshot([...trades].reverse()), base, `n=${n} ters`);
    }
  });
}

/* ---------------- Bağımsız ikinci hesap (oracle) ---------------- */

const NY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
const nyKeyIntl = (ts: number) => NY.format(new Date(ts));
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

test('temel metrikler bağımsız hesapla aynı: net R, WR, PF, ortalamalar, beklenti, pencereler', () => {
  for (const n of [1, 2, 9, 60, 200]) {
    const tr = make(n);
    const s = calculateComprehensiveStats(tr, NOW);
    const rs = tr.map((t) => t.rr as number);
    const wins = tr.filter((t) => t.status === 'WIN');
    const losses = tr.filter((t) => t.status === 'LOSS');
    assertClose(s.netR, sum(rs), 'netR');
    assertClose(s.winRate, (wins.length / n) * 100, 'winRate');
    assertClose(s.expectancyRR, sum(rs) / n, 'expectancy');
    assertClose(s.averageWinRR, wins.length ? sum(wins.map((t) => t.rr as number)) / wins.length : 0, 'avgWin');
    assertClose(s.averageLossRR, losses.length ? -sum(losses.map((t) => t.rr as number)) / losses.length : 0, 'avgLoss');
    const gw = sum(rs.filter((r) => r > 0));
    const gl = -sum(rs.filter((r) => r < 0));
    if (gl > 0) assertClose(s.profitFactorRR, gw / gl, 'PF');
    const w7 = tr.filter((t) => t.createdAt >= NOW - 7 * DAY);
    const w30 = tr.filter((t) => t.createdAt >= NOW - 30 * DAY);
    assert.equal(s.weeklyCount, w7.length);
    assert.equal(s.monthlyCount, w30.length);
    assertClose(s.weeklyR, sum(w7.map((t) => t.rr as number)), 'weeklyR');
    assertClose(s.monthlyR, sum(w30.map((t) => t.rr as number)), 'monthlyR');
    // Beklenti, kazanma oranı ve ortalamalar birbirini tutar: E = WR·ortK − LR·ortZ
    assertClose(s.expectancyRR, (wins.length / n) * s.averageWinRR - (losses.length / n) * s.averageLossRR, 'E = WR·W − LR·L');
    // Başabaş oranında beklenti sıfırdır
    const be = breakevenWinRateOf(tr);
    if (be !== null) {
      const decided = wins.length + losses.length;
      const wAtBe = (be / 100) * n; // başabaş için gereken kazanç sayısı
      assertClose(wAtBe * s.averageWinRR - (decided - wAtBe) * s.averageLossRR, 0, 'başabaşta beklenti 0');
    }
  }
});

test('Detaylı Analiz bağımsız hesapla aynı: max drawdown (her zirve-dip çifti), günler, eğri', () => {
  for (const n of [1, 3, 25, 150]) {
    const tr = make(n);
    const m = computeDeepMetrics(tr);
    const sorted = [...tr].sort((a, b) => a.createdAt - b.createdAt);
    const cum: number[] = [];
    sorted.reduce((s, t) => (cum.push(s + (t.rr as number)), s + (t.rr as number)), 0);
    // Tanımdan: 0 dahil her önceki zirveden her sonraki noktaya düşüşlerin en büyüğü
    let dd = 0;
    for (let j = 0; j < cum.length; j++) {
      let peak = 0;
      for (let i = 0; i < j; i++) peak = Math.max(peak, cum[i]);
      dd = Math.max(dd, peak - cum[j]);
    }
    assertClose(m.maxDrawdown, dd, 'maxDD');
    assertClose(m.totalR, cum[cum.length - 1], 'totalR');
    assertClose(m.equityCurve.map((p) => p.cumulativePnl), cum, 'eğri');
    if (dd > 0) assertClose(m.recoveryFactor, m.totalR / dd, 'recovery');
    const byDay = new Map<string, number>();
    sorted.forEach((t) => byDay.set(nyKeyIntl(t.createdAt), (byDay.get(nyKeyIntl(t.createdAt)) || 0) + (t.rr as number)));
    assert.equal(m.totalDays, byDay.size);
    assert.equal(m.greenDays, [...byDay.values()].filter((v) => v > 1e-9).length);
    assert.equal(m.redDays, [...byDay.values()].filter((v) => v < -1e-9).length);
    const longs = tr.filter((t) => t.type === 'LONG');
    assert.equal(m.longStats.count + m.shortStats.count, n);
    assertClose(m.longStats.pnl + m.shortStats.pnl, m.totalR, 'long + short = toplam');
    assertClose(m.longStats.pnl, sum(longs.map((t) => t.rr as number)), 'long R');
    // Ana Panel ile aynı sayılar
    const s = calculateComprehensiveStats(tr, NOW);
    assertClose(m.avgWinRR, s.averageWinRR, 'ort. kazanç (iki ekran)');
    assertClose(m.avgLossRR, s.averageLossRR, 'ort. kayıp (iki ekran)');
    assertClose(m.pureProfitFactor, s.profitFactorRR, 'PF (iki ekran)');
  }
});

test('edge istatistiği: ortalama, örnek sapma, t-aralığı ve Wilson aralığı tanımlarıyla aynı', () => {
  // t(0.975, sd) tablo değerleri
  const T = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
  T.forEach((v, i) => assert.ok(Math.abs(tCrit95(i + 1) - v) < 0.0006, `t(${i + 1}) = ${tCrit95(i + 1)}`));
  for (const [df, v] of [[40, 2.021], [60, 2.0], [120, 1.98], [1000, 1.962]] as const) assert.ok(Math.abs(tCrit95(df) - v) < 0.001, `t(${df}) = ${tCrit95(df)}`);
  for (const n of [2, 5, 29, 30, 31, 90]) {
    const tr = make(n);
    const e = computeEdge(tr);
    const rs = tr.map((t) => t.rr as number);
    const mean = sum(rs) / n;
    const sd = Math.sqrt(sum(rs.map((r) => (r - mean) ** 2)) / (n - 1));
    assert.ok(Math.abs(e.expectancy - mean) < 0.0006);
    assert.ok(Math.abs(e.sd - sd) < 0.0006);
    const sdCi = n < 30 ? Math.max(sd, 1) : sd; // 30 işlemin altında aralık için sapma en az 1R
    const half = (tCrit95(n - 1) * sdCi) / Math.sqrt(n);
    assert.ok(Math.abs(e.expLo - (mean - half)) < 0.0011, `expLo n=${n}`);
    assert.ok(Math.abs(e.expHi - (mean + half)) < 0.0011, `expHi n=${n}`);
    assert.equal(e.wins + e.losses + e.breakevens, n);
  }
  // Wilson %95: bilinen referans değerler (x / n)
  const w = (x: number, n: number) => {
    const e = edgeFromR(Array.from({ length: n }, (_, i) => (i < x ? 1 : -1)));
    return [e.wrLo, e.wrHi];
  };
  assert.deepEqual(w(5, 10), [23.7, 76.3]);
  assert.deepEqual(w(0, 10), [0, 27.8]);
  assert.deepEqual(w(10, 10), [72.2, 100]);
  assert.deepEqual(w(15, 30), [33.2, 66.8]);
});

test('ölçek ve ekleme özellikleri: R iki katına çıkınca / BE eklenince metrikler beklendiği gibi değişir', () => {
  const tr = make(80);
  const dbl = tr.map((t) => ({ ...t, rr: (t.rr as number) * 2 }));
  const a = computeDeepMetrics(tr);
  const b = computeDeepMetrics(dbl);
  assertClose(b.totalR, a.totalR * 2, 'net R ×2');
  assertClose(b.maxDrawdown, a.maxDrawdown * 2, 'max DD ×2');
  assertClose(b.pureProfitFactor, a.pureProfitFactor, 'PF değişmez');
  assertClose(b.recoveryFactor, a.recoveryFactor, 'recovery değişmez');
  assert.equal(b.greenDays, a.greenDays);
  const sa = calculateComprehensiveStats(tr, NOW);
  const sb = calculateComprehensiveStats(dbl, NOW);
  assertClose(sb.winRate, sa.winRate, 'WR değişmez');
  assertClose(breakevenWinRateOf(dbl) as number, breakevenWinRateOf(tr) as number, 'başabaş WR değişmez');
  // Sona bir BE eklemek: net R, PF, max DD aynı; işlem sayısı +1; WR düşer
  const last = Math.max(...tr.map((t) => t.createdAt));
  const withBe = [...tr, normalizeTrade({ ...tr[0], id: 'trade-9999999999999-be', status: 'BREAKEVEN', rr: 0, createdAt: last + 60_000 } as any)];
  const c = computeDeepMetrics(withBe);
  assertClose(c.totalR, a.totalR, 'BE net R değiştirmez');
  assertClose(c.maxDrawdown, a.maxDrawdown, 'BE max DD değiştirmez');
  assertClose(c.pureProfitFactor, a.pureProfitFactor, 'BE PF değiştirmez');
  const sc = calculateComprehensiveStats(withBe, NOW);
  assert.equal(sc.totalTrades, sa.totalTrades + 1);
  assert.ok(sc.winRate < sa.winRate);
  // İki parçanın toplamı bütüne eşit
  const h1 = tr.slice(0, 33);
  const h2 = tr.slice(33);
  assertClose(calculateComprehensiveStats(h1, NOW).netR + calculateComprehensiveStats(h2, NOW).netR, sa.netR, 'parçalar');
});

test('prop hesabı bağımsız yeniden oynatmayla aynı: bakiye, zirve, statik / trailing taban, günlük limit', () => {
  for (const mode of ['STATIC', 'TRAILING'] as const) {
    for (const n of [0, 1, 12, 90]) {
      const tr = make(n);
      const acc = account({
        drawdownMode: mode,
        dailyLossPct: 3,
        adjustments: [
          { id: 'x1', at: NOW - 60 * DAY, amount: -120, realBalance: 0 },
          { id: 'x2', at: NOW - 20 * DAY, amount: 45.5, realBalance: 0 },
        ],
      });
      const m = computeAccountMetrics(acc, tr);
      const mine = tr.filter((t) => t.accountId === acc.id);
      assert.equal(m.tradeCount, mine.length);
      const ev = [...mine.map((t) => ({ at: t.createdAt, amt: (t.rr as number) * (t.riskAmount as number) })), ...acc.adjustments!.map((x) => ({ at: x.at, amt: x.amount }))].sort((x, y) => x.at - y.at);
      const dd = (acc.size * acc.phaseRules[0].maxDdPct) / 100;
      const daily = (acc.size * 3) / 100;
      let bal = acc.size;
      let peak = acc.size;
      let breached = false;
      let dayBreached = false;
      const dayStart = new Map<string, number>();
      for (const e of ev) {
        const k = nyKeyIntl(e.at);
        if (!dayStart.has(k)) dayStart.set(k, bal);
        bal += e.amt;
        peak = Math.max(peak, bal);
        const floor = mode === 'TRAILING' ? Math.min(acc.size, peak - dd) : acc.size - dd;
        if (bal <= floor) breached = true;
        if (bal <= (dayStart.get(k) as number) - daily) dayBreached = true;
      }
      const floor = mode === 'TRAILING' ? Math.min(acc.size, peak - dd) : acc.size - dd;
      assertClose(m.balance, bal, `${mode} bakiye`);
      assertClose(m.peak, peak, `${mode} zirve`);
      assertClose(m.maxLossFloor, floor, `${mode} taban`);
      assertClose(m.maxLossRemaining, bal - floor, `${mode} kalan`);
      assert.equal(m.maxBreached, breached, `${mode} ihlal`);
      assert.equal(m.dailyBreached, dayBreached, `${mode} günlük ihlal`);
      assertClose(m.netPnl, bal - acc.size, 'net');
    }
  }
});

test('haftalık değerlendirme bağımsız hesapla aynı: hafta Pazartesi başlar, günler NY takvimine göre', () => {
  const tr = make(160);
  for (const back of [0, 7, 21, 63]) {
    const ws = weekStartOf(nyDateKey(NOW - back * DAY));
    assert.equal(new Date(`${ws}T12:00:00Z`).getUTCDay(), 1, 'hafta başı Pazartesi');
    const days = weekDays(ws);
    const w = computeWeekReview(tr, ws);
    const mine = tr.filter((t) => days.includes(nyKeyIntl(t.createdAt)));
    assert.equal(w.totals.n, mine.length);
    assertClose(w.totals.netR, sum(mine.map((t) => t.rr as number)), 'hafta net R');
    assert.equal(w.totals.wins, mine.filter((t) => t.status === 'WIN').length);
    days.forEach((d, i) => {
      const dayTrades = mine.filter((t) => nyKeyIntl(t.createdAt) === d);
      assert.equal(w.days[i].n, dayTrades.length, `gün ${d}`);
      assertClose(w.days[i].netR, sum(dayTrades.map((t) => t.rr as number)), `gün ${d} R`);
    });
    const prevDays = weekDays(weekStartOf(nyDateKey(Date.parse(`${ws}T12:00:00Z`) - 7 * DAY)));
    assert.equal(w.previous.n, tr.filter((t) => prevDays.includes(nyKeyIntl(t.createdAt))).length, 'önceki hafta');
  }
});

test('NY saati: gün anahtarı, saat ve gün adı Intl ile aynı; form girişi ↔ zaman damgası gidiş-dönüş tutarlı', () => {
  const HM = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const start = Date.UTC(2023, 0, 1);
  const span = Date.UTC(2029, 0, 1) - start;
  // Rastgele anlar + yaz saati geçişlerinin çevresi (dakika dakika)
  const samples: number[] = Array.from({ length: 4000 }, () => start + Math.floor((rnd() * span) / 60_000) * 60_000);
  for (const [y, mo, d] of [[2026, 2, 8], [2026, 10, 1], [2027, 2, 14], [2027, 10, 7], [2025, 2, 9], [2025, 10, 2]]) {
    for (let m = -180; m <= 600; m += 7) samples.push(Date.UTC(y, mo, d, 4, 0) + m * 60_000);
  }
  for (const ts of samples) {
    assert.equal(nyDateKey(ts), nyKeyIntl(ts), `gün anahtarı ${new Date(ts).toISOString()}`);
    const parts = HM.formatToParts(new Date(ts));
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    const ny = getNyParts(ts)!;
    assert.equal(ny.hour, Number(get('hour')), `saat ${new Date(ts).toISOString()}`);
    assert.equal(ny.minute, Number(get('minute')));
    assert.equal(ny.weekday, WD.indexOf(get('weekday')), 'gün adı');
    // Gidiş-dönüş: aynı an (geri alınan saatte duvar saati iki ana karşılık gelir: 1 saat fark olabilir)
    const back = nyInputToTs(toNyInput(ts));
    assert.ok(back !== null && (back === ts || Math.abs(back - ts) === 3_600_000), `gidiş-dönüş ${new Date(ts).toISOString()} → ${back}`);
    assert.equal(nyDateKey(back as number), nyDateKey(ts));
  }
});

test('kırılımlar bütünü böler: her boyutta grupların işlem sayısı ve R toplamı bütüne eşit', () => {
  const tr = make(140);
  setGlobalTradeOrder(tr);
  const total = sum(tr.map((t) => t.rr as number));
  for (const d of SETUP_DIMENSIONS) {
    const card = buildSetupScorecard(tr, [d.id], { minSample: 1 });
    assert.equal(sum(card.rows.map((r) => r.edge.n)) + card.unspecifiedCount, tr.length, `${d.id}: sayı`);
    if (card.unspecifiedCount === 0) assertClose(sum(card.rows.map((r) => r.edge.netR)), total, `${d.id}: R`);
    for (const r of card.rows) {
      assert.ok(r.edge.winRate >= 0 && r.edge.winRate <= 100);
      assert.ok(r.edge.expLo <= r.edge.expectancy + 1e-9 && r.edge.expectancy <= r.edge.expHi + 1e-9);
    }
  }
});
