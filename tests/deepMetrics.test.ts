import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDeepMetrics } from '../src/lib/deepMetrics';
import { formatPF } from '../src/lib/statMath';
import { trade, NOW } from './fixtures';

const seq = (rs: number[]) =>
  rs.map((r, i) => trade({ id: 't' + i, status: r > 0 ? 'WIN' : r < 0 ? 'LOSS' : 'BREAKEVEN', rr: r, createdAt: NOW - (rs.length - i) * 86400000 }));

test('detaylı analiz: max düşüş, toparlanma faktörü ve toparlanma süresi', () => {
  // +2, -1, -1 (zirve 2, dip 0 → DD 2), +3 (yeni zirve: 3 işlemde toparlandı), -1 (devam eden düşüş, sayılmaz)
  const m = computeDeepMetrics(seq([2, -1, -1, 3, -1]));
  assert.equal(m.totalR, 2);
  assert.equal(m.maxDrawdown, 2);
  assert.equal(m.recoveryFactor, 1);
  assert.equal(m.avgRecoveryTrades, 3);
  assert.equal(m.recoveredDrawdowns, 1);
  assert.equal(m.equityCurve.at(-1)!.drawdown, -1);
});

test('detaylı analiz: son 10 işlem gerçekten hesaplanır; hiç düşüş yoksa toparlanma yok', () => {
  const m = computeDeepMetrics(seq([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1]));
  assert.equal(m.last10.n, 10);
  assert.equal(m.last10.grossProfit, 9);
  assert.equal(m.last10.grossLoss, 1);
  assert.equal(m.last10.avgR, 0.8);
  const up = computeDeepMetrics(seq([1, 2]));
  assert.equal(up.avgRecoveryTrades, null);
  assert.equal(up.maxDrawdown, 0);
  assert.equal(formatPF(up.pureProfitFactor), '∞');
});

test('detaylı analiz: kârlı / zararlı gün NY takvim gününe göre, 0R gün hiçbirine girmez', () => {
  const d = NOW - 5 * 86400000;
  const m = computeDeepMetrics([
    trade({ id: 'a', status: 'WIN', rr: 1, createdAt: d }),
    trade({ id: 'b', status: 'LOSS', rr: -1, createdAt: d + 60000 }),
    trade({ id: 'c', status: 'WIN', rr: 2, createdAt: d + 86400000 }),
  ]);
  assert.equal(m.totalDays, 2);
  assert.equal(m.greenDays, 1);
  assert.equal(m.redDays, 0);
});
