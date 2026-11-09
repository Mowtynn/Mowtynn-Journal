import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePricePath, computeTradeInsight } from '../src/lib/tradeInsight';
import { trade, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, ...p });

test('sonuç: plan R:R = TP / Stop; stop yoksa plan yok', () => {
  assert.equal(computePricePath(t(2, { stopPips: 10, tpPips: 30 })).plannedRR, 3);
  assert.equal(computePricePath(t(2, { tpPips: 30 })).plannedRR, null);
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
