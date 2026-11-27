import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePricePath, computeTradeInsight } from '../src/lib/tradeInsight';
import { trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, ...p });

test('sonuç: gerçekleşen R; plan R:R artık hesaplanmaz', () => {
  const p = computePricePath(t(2, { stopPips: 10, tpPips: 30 }));
  assert.equal(p.realizedR, 2);
  assert.ok(!('plannedRR' in p));
  assert.equal(computePricePath(t(-1, {})).realizedR, -1);
});

test('işlem içgörüsü: kurulum geçmişi yok, yalnızca sonuç ve beklenti', () => {
  const ins = computeTradeInsight(t(1, { id: 'solo' }), [t(1, { id: 'solo' })]);
  assert.ok(!('setup' in ins));
  assert.equal(ins.path.realizedR, 1);
  assert.equal(ins.expectancy, null);
});

test('ortalama R beklentisi: bu işlem hariç, aynı hesap türünde; az işlemde yok', async () => {
  const { computeExpectancy } = await import('../src/lib/tradeInsight');
  const me = t(2, { id: 'me', prop: true });
  const others = [t(1, { id: 'a', prop: true }), t(-1, { id: 'b', prop: true }), t(3, { id: 'c', prop: true }), t(0, { id: 'd', prop: true })];
  const ins = computeTradeInsight(me, [me, ...others]);
  assert.deepEqual(ins.expectancy, { avgR: 0.75, n: 4 });
  // İki işlem yetmez
  assert.equal(computeTradeInsight(me, [me, others[0], others[1]]).expectancy, null);
  // Hesapsız işlemler prop beklentisine karışmaz
  const demos = [1, 2, 3].map((i) => t(-1, { id: 'x' + i, accountCategory: 'DEMO' } as any));
  assert.deepEqual(computeTradeInsight(me, [me, ...others, ...demos]).expectancy, { avgR: 0.75, n: 4 });
  // Bozuk R sayılmaz
  assert.deepEqual(computeExpectancy(me, [...others, { ...others[0], id: 'nan', rr: NaN } as any]), { avgR: 0.75, n: 4 });
});
