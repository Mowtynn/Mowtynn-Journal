import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCoverage, indexTradeOrder, RANGE_SIZE_BUCKETS } from '../src/lib/asiaAnalytics';
import { dimensionValue, UNSPECIFIED } from '../src/lib/setupScorecard';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (100 - i) * DAY, ...p });

test('Asia Range büyüklüğü, gün ve giriş saati boyutları', () => {
  // Girişten önce bilinen: her işlem, paritenin ÖNCEKİ (en az 5) range'lerinin medyanına (30) göre: 20 → Dar, 30 → Normal, 45 → Geniş.
  // İlk 5 işlemin öncesinde yeterli range yok: sınıflanmaz.
  const hist = [30, 28, 32, 30, 30].map((p, i) => t(1, { asiaRangePips: p }, i));
  const list = [20, 30, 45].map((p, i) => t(1, { asiaRangePips: p }, 5 + i));
  const noRange = t(1, {}, 9);
  indexTradeOrder([...hist, ...list, noRange]);
  assert.deepEqual(hist.map((x) => dimensionValue(x, 'rangeSize')), Array(5).fill(UNSPECIFIED));
  assert.deepEqual(list.map((x) => dimensionValue(x, 'rangeSize')), [RANGE_SIZE_BUCKETS[0], RANGE_SIZE_BUCKETS[1], RANGE_SIZE_BUCKETS[2]]);
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
  for (const f of ['planFidelity', 'trend', 'newsDay', 'asiaRangeFvg', 'asiaRange', 'sweepTime', 'session', 'htfTimeframe', 'confirmations', 'timeframe', 'entryModels', 'tpTargets', 'premiumDiscount', 'management', 'afterExitTp', 'riskPct', 'exitAt', 'stopPips', 'tpPips', 'asiaRangePips']) {
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

