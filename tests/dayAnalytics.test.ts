import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeFromR, edgeOfTrades, indexTradeOrder, CLUSTER_MIN_DAYS } from '../src/lib/asiaAnalytics';
import { dimensionValue, buildSetupScorecard } from '../src/lib/setupScorecard';
import { simulateDailyRules, computeSameDayStats } from '../src/lib/dayAnalytics';
import { scanDimensionsFor } from '../src/lib/edgeSummary';
import { trade, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

const HOUR = 3600000;
const t = (rr: number, at: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, prop: true, createdAt: at, ...p });
// NY gününün ortası (12:00 UTC ≈ 08:00 NY): gün içi saatler aynı NY gününde kalır
const day = (i: number, h = 0) => NOW - i * DAY + h * HOUR;

test('güven aralığı gün bazında: aynı gün birlikte kazanıp kaybeden işlemler aralığı genişletir', () => {
  // 20 gün × 2 işlem, iki işlem her gün aynı sonuç (tek karar)
  const paired: Trade[] = [];
  const single: Trade[] = [];
  for (let i = 0; i < 20; i++) {
    const r = i % 3 === 0 ? -1 : 1.5;
    paired.push(t(r, day(i, 0), { asset: 'EURUSD' }), t(r, day(i, 1), { asset: 'DXY' }));
  }
  for (let i = 0; i < 40; i++) single.push(t(i % 3 === 0 ? -1 : 1.5, day(i)));
  const iid = edgeFromR(paired.map((x) => x.rr), paired.map((x) => x.status));
  const cl = edgeOfTrades(paired);
  assert.equal(cl.days, 20);
  assert.ok(cl.dayInflation && cl.dayInflation > 1.3, `katsayı ${cl.dayInflation}`);
  assert.ok(cl.expHi - cl.expLo > (iid.expHi - iid.expLo) * 1.3);
  assert.equal(cl.expectancy, iid.expectancy);
  // Her gün tek işlem: düzeltme yok
  const s = edgeOfTrades(single);
  const sIid = edgeFromR(single.map((x) => x.rr), single.map((x) => x.status));
  assert.equal(s.expLo, sIid.expLo);
  assert.equal(s.dayInflation, undefined);
  // Az günde (CLUSTER_MIN_DAYS altı) bağımsız sayılır
  const few = paired.slice(0, (CLUSTER_MIN_DAYS - 1) * 2);
  assert.equal(edgeOfTrades(few).expLo, edgeFromR(few.map((x) => x.rr), few.map((x) => x.status)).expLo);
  // Kurulum Karnesi de aynı düzeltmeyi kullanır
  const card = buildSetupScorecard(paired, ['type'], { minSample: 1 });
  assert.equal(card.rows[0].edge.expLo, cl.expLo);
});

test('seri ve hesap durumu boyutları işlemden önceki duruma göre', () => {
  // K, K, Z(+3), BE, K  (kronolojik)
  const list = [t(-1, day(5)), t(-1, day(4)), t(3, day(3)), t(0, day(2)), t(-1, day(1))];
  indexTradeOrder(list);
  assert.deepEqual(list.map((x) => dimensionValue(x, 'streakBefore')), ['Belirtilmemiş', '1 kayıp sonrası', '2+ kayıp serisi sonrası', 'Kazanç sonrası', 'Kazanç sonrası']);
  // Kümülatif: 0 → −1 → −2 → +1 (zirve) → +1 → (BE) +1 ; zirveden uzaklık işlemden önce
  assert.deepEqual(list.map((x) => dimensionValue(x, 'ddState')), ['Zirvede', 'Düşüşte (2R altı)', 'Derin düşüşte (2R+)', 'Zirvede', 'Zirvede']);
  // Prop ve Hesapsız ayrı seri
  const mixed = [t(-1, day(3)), t(-1, day(2), { prop: false, accountCategory: 'DEMO' }), t(1, day(1))];
  indexTradeOrder(mixed);
  assert.equal(dimensionValue(mixed[1], 'streakBefore'), 'Belirtilmemiş');
  assert.equal(dimensionValue(mixed[2], 'streakBefore'), '1 kayıp sonrası');
  // Edge Özeti taramasında
  assert.ok(scanDimensionsFor(list, 1).includes('streakBefore') && scanDimensionsFor(list, 1).includes('ddState'));
});

test('hazır günlük kurallar: vazgeçilen işlemler ve hüküm', () => {
  const list: Trade[] = [];
  // 12 gün: ilk işlem +2R, ikinci −1R, üçüncü −1R (gün içi kayıp sonrası işlemler hep kaybediyor)
  for (let i = 0; i < 12; i++) list.push(t(i % 2 ? 2 : -1, day(i, 0)), t(-1, day(i, 1)), t(-1, day(i, 2)));
  const rows = Object.fromEntries(simulateDailyRules(list).map((r) => [r.id, r]));
  assert.equal(rows.max1.skipped.n, 24);
  assert.equal(rows.max2.skipped.n, 12);
  // İlk kayıptan sonra dur: kayıpla başlayan 6 günde 2, kazançla başlayan 6 günde 1 işlem vazgeçilir
  assert.equal(rows.stopAfterLoss.skipped.n, 6 * 2 + 6 * 1);
  assert.equal(rows.stopAfterWin.skipped.n, 12);
  assert.equal(rows.dayLoss2R.skipped.n, 6 * 1 + 0);
  assert.ok(rows.max1.netDelta > 0 && rows.max1.verdict.endsWith('HELPS'));
  assert.equal(rows.max1.netDelta, Math.round(-rows.max1.skipped.netR * 1e6) / 1e6);
  // Tek işlemli günlerde kural etkisiz
  const solo = Array.from({ length: 6 }, (_, i) => t(1, day(i)));
  assert.ok(simulateDailyRules(solo).filter((r) => r.id !== 'cooldown3').every((r) => r.verdict === 'NO_EFFECT'));
});

test('3 kayıp serisinden sonra 1 gün ara', () => {
  // gün 4: K K K → gün 3 atlanır; gün 2 ve 1 alınır
  const list = [t(-1, day(4, 0)), t(-1, day(4, 1)), t(-1, day(4, 2)), t(2, day(3)), t(2, day(3, 1)), t(1, day(2)), t(-1, day(1))];
  const r = simulateDailyRules(list).find((x) => x.id === 'cooldown3')!;
  assert.equal(r.skipped.n, 2);
  assert.equal(r.skipped.netR, 4);
});

test('aynı gün çoklu işlem: birlikte hareket, etkin örneklem, gün başı R', () => {
  const list: Trade[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 1 : -1;
    list.push(t(r, day(i, 0)), t(r, day(i, 1)));
  }
  for (let i = 10; i < 20; i++) list.push(t(i % 2 ? 2 : -1, day(i)));
  const s = computeSameDayStats(list);
  assert.equal(s.days, 20);
  assert.equal(s.multiDays, 10);
  assert.equal(s.allLost, 5);
  assert.equal(s.allWon, 5);
  assert.ok(s.correlation !== null && s.correlation > 0.5, `korelasyon ${s.correlation}`);
  assert.ok(s.effectiveN < s.total && s.effectiveN >= 20);
  assert.equal(s.singleDay.n, 10);
  assert.equal(s.multiDay.n, 10);
  assert.equal(s.multiDay.expectancy, 0);
});
