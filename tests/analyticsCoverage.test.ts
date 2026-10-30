import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAsia, computeCoverage, indexTradeOrder, RANGE_SIZE_BUCKETS } from '../src/lib/asiaAnalytics';
import { dimensionValue, UNSPECIFIED } from '../src/lib/setupScorecard';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (100 - i) * DAY, ...p });

test('Asia Range büyüklüğü, gün ve giriş saati boyutları', () => {
  // Paritenin medyanı 30 pip: 20 → Dar, 30 → Normal, 45 → Geniş
  const list = [20, 30, 30, 30, 45].map((p, i) => t(1, { asiaRangePips: p }, i));
  const noRange = t(1, {}, 9);
  indexTradeOrder([...list, noRange]);
  assert.deepEqual(list.map((x) => dimensionValue(x, 'rangeSize')), [RANGE_SIZE_BUCKETS[0], RANGE_SIZE_BUCKETS[1], RANGE_SIZE_BUCKETS[1], RANGE_SIZE_BUCKETS[1], RANGE_SIZE_BUCKETS[2]]);
  assert.equal(dimensionValue(noRange, 'rangeSize'), UNSPECIFIED);

  // 21 Ekim 2026 Çarşamba, 08:15 NY (EDT, UTC−4) → 12:15 UTC
  const wed = t(1, { createdAt: Date.UTC(2026, 9, 21, 12, 15) });
  assert.equal(dimensionValue(wed, 'weekday'), 'Çarşamba');
  assert.match(dimensionValue(wed, 'entryHour'), /^08:00/);
});

test('veri eksiği panosu: her girdi var; yalnızca sorulan işlemlerde ölçülen alanların paydası kendi kümesi', () => {
  const trades = [
    t(0, { management: ['Plana Göre'] }, 1),                                   // BE → Çıkış Sonrası TP soruldu, cevap yok
    t(1, { management: ['BE Çekildi'], afterExitTp: true, accountId: 'a1', riskPct: 1 }, 2),
    t(2, { management: ['Plana Göre'], accountId: 'a1' }, 3),                  // sorulmadı; hesaplı ama risk yok
    t(-1, {}, 4),
  ];
  const cov = Object.fromEntries(computeCoverage(trades).map((c) => [c.field, c]));
  for (const f of ['planFidelity', 'trend', 'newsDay', 'asiaRangeFvg', 'asiaRange', 'sweepTime', 'session', 'htfTimeframe', 'confirmations', 'timeframe', 'entryModels', 'tpTargets', 'premiumDiscount', 'management', 'afterExitTp', 'riskPct', 'exitAt', 'stopPips', 'tpPips', 'maePips', 'mfePips', 'asiaRangePips']) {
    assert.ok(cov[f], `${f} panoda yok`);
  }
  assert.equal(cov.management.base, 4);
  assert.equal(cov.management.filled, 3);
  assert.equal(cov.afterExitTp.base, 2);
  assert.equal(cov.afterExitTp.filled, 1);
  assert.equal(cov.afterExitTp.pct, 50);
  assert.equal(cov.riskPct.base, 2);
  assert.equal(cov.riskPct.filled, 1);
});

test('Asia Lab kombinasyon bulucu yalnızca girişten önce bilinen alanları kullanır, gereksiz birleşimi atar', () => {
  const trades = Array.from({ length: 24 }, (_, i) =>
    t(i % 3 === 0 ? -1 : 2, {
      session: i < 12 ? 'London' : 'NY AM',
      asiaRange: i % 2 ? 'Range' : 'Trend',
      entryModels: i % 3 === 2 ? ['FVG'] : ['MSS', 'FVG'],
      exitAt: NOW - (100 - i) * DAY + 30 * 60000,
      management: ['BE Çekildi'],
    }, i),
  );
  const r = analyzeAsia(trades, { dataset: 'ALL', pair: 'ALL', minSample: 5 });
  assert.ok(r.combos.length > 0);
  assert.ok(r.combos.every((c) => !c.label.includes('İşlem Süresi') && !c.label.includes('İşlem Yönetimi')));
  assert.ok(r.combos.some((c) => c.label.includes('Session: London')));
  // Tek parite: "Parite: EURUSD + X" birleşimi X'in kendisiyle aynı işlemler → listelenmez
  assert.ok(r.combos.every((c) => !c.label.startsWith('Parite:')));
  // Çoklu seçim birleşik değer olarak sayılır (işlem iki kez sayılmaz)
  assert.ok(r.combos.some((c) => c.label.includes('Entry Model: FVG + MSS')));
});

test('MFE yakalama ve masada kalan kâr aynı işlemler üzerinden (MFE + TP girilmiş kazananlar)', () => {
  const trades = [
    t(2, { tpPips: 20, mfePips: 40 }, 1),   // 20/40 yakalandı, 20 pip masada
    t(2, { tpPips: 20, mfePips: 20 }, 2),   // tamamı yakalandı
    t(-1, { tpPips: 60, mfePips: 5 }, 3),   // kaybeden: bu ölçüye girmez
    t(1, { mfePips: 30 }, 4),               // TP yok: bu ölçüye girmez
  ];
  const s = calculateStrategyAnalytics(trades).mfeStats;
  assert.equal(s.mfeRealizationRate, 67); // 40 / 60
  assert.equal(s.leftOnTheTablePips, 10); // (20 + 0) / 2
});
