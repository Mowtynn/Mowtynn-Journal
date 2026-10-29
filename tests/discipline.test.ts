import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDiscipline, setupQualityTier, isLowQualitySetup } from '../src/lib/discipline';
import { trade } from './fixtures';
import type { Trade } from '../src/types';

import { nyInputToTs } from '../src/lib/tradingTime';

// Sabit NY günü: 10 Ekim 2026 09:00 (NY) itibarıyla dakika ofsetleri — makinenin saat diliminden bağımsız
const BASE = nyInputToTs('2026-10-10T09:00')!;
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const t = (rr: number, at: number, p: Partial<Trade> = {}) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: BASE + at, ...p });

const get = (rep: ReturnType<typeof analyzeDiscipline>, id: string) => rep.rules.find((r) => r.id === id)!;

test('günlük 2 işlem sınırı ve günlük stop NY gününe göre sıfırlanır', () => {
  const list = [t(-1, 0), t(-1, 120 * MIN), t(1, 240 * MIN), t(1, DAY), t(1, DAY + 300 * MIN)];
  const rep = analyzeDiscipline(list);
  assert.deepEqual(get(rep, 'OVERTRADING').tradeIds, [list[2].id]);
  assert.deepEqual(get(rep, 'AFTER_DAILY_STOP').tradeIds, [list[2].id]); // gün −2R'ye indikten sonra
});

test('düşük kalite, haber günü ve yüksek risk; ölçülemeyen kural işaretlenir', () => {
  const list = [
    t(-1, 0, { planFidelity: 'B-C', riskPct: 1 }),
    t(2, DAY, { planFidelity: 'A+', newsDay: true, riskPct: 0.5 }),
    t(1, 2 * DAY, { planFidelity: 'A', newsDay: false, riskPct: 0.5 }),
  ];
  const rep = analyzeDiscipline(list);
  assert.deepEqual(get(rep, 'LOW_QUALITY').tradeIds, [list[0].id]);
  assert.deepEqual(get(rep, 'NEWS_DAY').tradeIds, [list[1].id]);
  assert.equal(rep.typicalRiskPct, 0.5);
  assert.deepEqual(get(rep, 'OVER_RISK').tradeIds, [list[0].id]);
  assert.equal(get(rep, 'LOW_QUALITY').withoutNetR, 3);

  const bare = analyzeDiscipline([t(1, 0), t(1, DAY)]);
  assert.equal(get(bare, 'OVER_RISK').measurable, false);
  assert.equal(get(bare, 'LOW_QUALITY').measurable, false);
});

test('temiz işlem oranı ve tüm kurallara uyulsaydı net R', () => {
  const list = [t(-1, 0, { planFidelity: 'B-C' }), t(2, DAY, { planFidelity: 'A' }), t(1, 2 * DAY, { planFidelity: 'A' })];
  const rep = analyzeDiscipline(list);
  assert.equal(rep.actualNetR, 2);
  assert.equal(rep.allRulesNetR, 3);
  assert.ok(Math.abs(rep.cleanRate - 66.666) < 0.01);
  assert.equal(rep.rules[0].id, 'LOW_QUALITY', 'en pahalı kural önce');
});

test('intikam kuralı yok; düşük kalite tek tanımdan', async () => {
  const { isLowQualitySetup } = await import('../src/lib/discipline');
  const rep = analyzeDiscipline([t(-1, 0), t(-1, 10 * MIN)]);
  assert.equal(rep.rules.some((r) => (r.id as string) === 'REVENGE'), false);
  assert.equal(isLowQualitySetup('B-C'), true);
  assert.equal(isLowQualitySetup('FOMO'), true);
  assert.equal(isLowQualitySetup('A'), false);
  assert.equal(isLowQualitySetup(undefined), false);
});

test('setup kalitesi kademesi tek kaynaktan: A+ yüksek, A orta, B-C/B/FOMO düşük', async () => {
  assert.equal(setupQualityTier('A+'), 'high');
  assert.equal(setupQualityTier('A'), 'mid');
  assert.equal(setupQualityTier('B-C'), 'low');
  assert.equal(setupQualityTier('B'), 'low');
  assert.equal(setupQualityTier('FOMO'), 'low');
  assert.equal(setupQualityTier(''), null);
  // Düşük kademe ile disiplin kuralı aynı tanımı kullanır
  for (const v of ['A+', 'A', 'B-C', 'B', 'C', 'FOMO', 'Kısmen']) {
    assert.equal(setupQualityTier(v) === 'low', isLowQualitySetup(v));
  }
});
