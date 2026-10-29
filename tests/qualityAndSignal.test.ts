import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { setupQualityTier } from '../src/lib/discipline';
import { signalStrength } from '../src/lib/setupScorecard';
import { edgeFromR } from '../src/lib/asiaAnalytics';
import { trade, NOW } from './fixtures';

test('setup kalitesi tek tanım: A+ yüksek, A orta, B-C düşük — her ekranda aynı', () => {
  assert.equal(setupQualityTier('A+'), 'high');
  assert.equal(setupQualityTier('A'), 'mid');
  assert.equal(setupQualityTier('B-C'), 'low');
  const list = [
    trade({ id: '1', status: 'WIN', rr: 2, planFidelity: 'A+' }),
    trade({ id: '2', status: 'LOSS', rr: -1, planFidelity: 'A' }),
    trade({ id: '3', status: 'LOSS', rr: -1, planFidelity: 'B-C' }),
  ];
  const d = calculateStrategyAnalytics(list).disciplineStats;
  assert.deepEqual([d.highQualityTradesCount, d.midQualityTradesCount, d.lowQualityTradesCount], [1, 1, 1]);
  assert.equal(d.highQualityNetR, 2);
  assert.equal(d.midQualityNetR, -1);
});

test('bulgu güveni: olumlu bulgu 30 işlemden önce kesin sayılmaz; açık sızıntı beklemez', () => {
  const pos = (n: number) => edgeFromR(Array.from({ length: n }, (_, i) => (i % 3 === 2 ? -1 : 2)), Array.from({ length: n }, (_, i) => (i % 3 === 2 ? 'LOSS' : 'WIN')));
  assert.equal(signalStrength(pos(9)), 'EARLY');
  assert.equal(signalStrength(pos(30)), 'CONFIRMED');
  const leak = edgeFromR([-1, -1, -1, -1, -1, -1], ['LOSS', 'LOSS', 'LOSS', 'LOSS', 'LOSS', 'LOSS']);
  assert.equal(signalStrength({ ...leak, expHi: -0.5 }), 'CONFIRMED');
  const mixed = edgeFromR([-1, 2, -1, -1, 1], ['LOSS', 'WIN', 'LOSS', 'LOSS', 'WIN']);
  assert.equal(signalStrength(mixed), 'EARLY');
});

test('tilt: birkaç işlemlik dalgalanma "YÜKSEK" sayılmaz', () => {
  // 5 kayıp sonrası işlemin 1'i kazanç (%20) — genel oran ~%50; aralık geniş, kesin değil
  const seq = ['W', 'L', 'W', 'L', 'L', 'W', 'L', 'L', 'W', 'L', 'W', 'W', 'W'];
  const list = seq.map((s, i) => trade({ id: 't' + i, status: s === 'W' ? 'WIN' : 'LOSS', rr: s === 'W' ? 1 : -1, createdAt: NOW - (seq.length - i) * 3600000 }));
  assert.notEqual(calculateStrategyAnalytics(list).streakStats.postLossTiltRisk, 'YÜKSEK');
});
