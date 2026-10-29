import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetupScorecard, dimensionValue, UNSPECIFIED } from '../src/lib/setupScorecard';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (100 - i) * DAY, ...p });

test('boyut değerleri: çoklu alanlar sıralı birleşir, boşlar Belirtilmemiş', () => {
  const x = t(1, { entryModels: ['OB', 'FVG', 'FVG'], session: '  London ' });
  assert.equal(dimensionValue(x, 'entryModels'), 'FVG + OB');
  assert.equal(dimensionValue(x, 'session'), 'London');
  assert.equal(dimensionValue(x, 'strategy'), UNSPECIFIED);
  assert.equal(dimensionValue(x, 'tpTargets'), UNSPECIFIED);
  assert.equal(dimensionValue(t(1, { type: 'SHORT' }), 'type'), 'Short');
});

test('kurulumlar gruplanır, puana göre sıralanır ve hüküm alır', () => {
  const a = { strategy: 'A', session: 'London' };
  const b = { strategy: 'B', session: 'NY' };
  const trades = [
    ...Array.from({ length: 12 }, (_, i) => t(i % 4 === 0 ? -1 : 2, a, i)),   // güçlü pozitif
    ...Array.from({ length: 12 }, (_, i) => t(i === 0 ? 1 : -1, b, i + 20)), // güçlü negatif
    t(3, { strategy: 'C', session: 'Asia' }, 50),                             // az örneklem
  ];
  const res = buildSetupScorecard(trades, ['strategy', 'session']);
  assert.equal(res.total, 25);
  assert.equal(res.rows.length, 3);
  assert.deepEqual(res.rows[0].labels, ['A', 'London']);
  // 12 işlem: aralık sıfırın üstünde ama kanıt eşiği (30) dolmadı
  assert.equal(res.rows[0].verdict, 'PROMISING');
  assert.equal(res.rows[0].edge.n, 12);
  assert.equal(res.rows[res.rows.length - 1].labels[0], 'B');
  assert.equal(res.rows[res.rows.length - 1].verdict, 'LEAK');
  assert.equal(res.rows.find((r) => r.labels[0] === 'C')!.verdict, 'LOW_SAMPLE');
});

test('hiçbir boyutu girilmemiş işlemler varsayılan olarak ayrı sayılır', () => {
  const trades = [t(1, {}, 1), t(-1, {}, 2), t(2, { strategy: 'A' }, 3)];
  const res = buildSetupScorecard(trades, ['strategy', 'session']);
  assert.equal(res.unspecifiedCount, 2);
  assert.equal(res.total, 1);
  const all = buildSetupScorecard(trades, ['strategy', 'session'], { includeUnspecified: true });
  assert.equal(all.total, 3);
  assert.equal(all.rows.length, 2);
});

test('küçük örneklemde puan sıfıra çekilir: 1 işlemlik +3R, 12 işlemlik +1R/işlemi geçemez', () => {
  const trades = [
    t(3, { strategy: 'Tek' }, 1),
    ...Array.from({ length: 12 }, (_, i) => t(1, { strategy: 'Çok' }, i + 2)),
  ];
  const res = buildSetupScorecard(trades, ['strategy']);
  assert.equal(res.rows[0].labels[0], 'Çok');
});

test('kanıtlı edge en az 30 işlem ister; zarar uyarısı eşiği beklemez', () => {
  const a = { strategy: 'A', session: 'London' };
  const many = Array.from({ length: 30 }, (_, i) => t(i % 4 === 0 ? -1 : 2, a, i));
  assert.equal(buildSetupScorecard(many, ['strategy', 'session']).rows[0].verdict, 'EDGE');
  const losing = Array.from({ length: 12 }, (_, i) => t(i === 0 ? 1 : -1, a, i));
  assert.equal(buildSetupScorecard(losing, ['strategy', 'session']).rows[0].verdict, 'LEAK');
});
