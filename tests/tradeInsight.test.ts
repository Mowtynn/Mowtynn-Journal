import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePricePath, computeTradeInsight } from '../src/lib/tradeInsight';
import { trade, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, ...p });

test('sonuç: gerçekleşen R; plan R:R artık hesaplanmaz', () => {
  const p = computePricePath(t(2, { stopPips: 10, tpPips: 30 }));
  assert.equal(p.realizedR, 2);
  assert.ok(!('plannedRR' in p));
  assert.equal(computePricePath(t(-1, {})).realizedR, -1);
});

test('kurulum geçmişi bu işlemi hariç tutar', () => {
  const setup = { asiaRange: 'Range' as const, session: 'London', entryModels: ['FVG'] };
  const hist = Array.from({ length: 6 }, (_, i) => t(i % 3 === 0 ? -1 : 2, { ...setup, createdAt: NOW - (20 - i) * DAY }));
  const me = t(-1, { ...setup, planFidelity: 'B-C', createdAt: NOW - DAY });
  const ins = computeTradeInsight(me, [...hist, me]);
  assert.equal(ins.setup?.others.n, 6);
  assert.equal(ins.setup?.others.netR, 6);
  assert.equal(ins.setup?.verdict === 'LOW_SAMPLE', false);

  const bare = computeTradeInsight(t(1), [t(1)]);
  assert.equal(bare.setup, null);
});

test('işlem içgörüsü: hesapsız işlemler prop işleminin kurulum geçmişine karışmaz', () => {
  const base = { asiaRange: 'Trend', session: 'London', entryModels: ['FVG'] } as any;
  const prop = trade({ id: 'p', status: 'WIN', rr: 2, accountCategory: 'FUNDED', accountId: 'f1', accountStage: 0, ...base });
  const demos = [1, 2, 3, 4, 5].map((i) => trade({ id: 'd' + i, status: 'LOSS', rr: -1, accountCategory: 'DEMO', createdAt: prop.createdAt - i * 60000, ...base }));
  const ins = computeTradeInsight(prop, [prop, ...demos]);
  assert.equal(ins.setup?.others.n ?? 0, 0);
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
