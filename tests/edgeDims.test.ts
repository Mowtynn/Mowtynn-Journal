import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensionValue, dimensionLabel, confDimension, buildSetupScorecard, UNSPECIFIED } from '../src/lib/setupScorecard';
import { scanDimensionsFor, computeEdgeSummary, scanPairs } from '../src/lib/edgeSummary';
import { SWEEP_FINE_MIN } from '../src/lib/asiaAnalytics';
import { trade, NOW, DAY } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}) => trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, prop: true, ...p });

test('yeni boyutlar: confirmation sayısı, tek confirmation, süpürülen Asia tarafı, 1 saatlik sweep', () => {
  const a = t(1, { confirmationTags: ['Discount', 'SMT Divergence'] });
  const none = t(1, {});
  assert.equal(dimensionValue(a, 'confCount'), '2 confirmation');
  assert.equal(dimensionValue(t(1, { confirmationTags: ['A', 'B', 'C', 'D'] }), 'confCount'), '3+ confirmation');
  assert.equal(dimensionValue(none, 'confCount'), UNSPECIFIED);
  assert.equal(dimensionValue(a, confDimension('smt divergence')), 'Var');
  assert.equal(dimensionValue(a, confDimension('1H POI')), 'Yok');
  assert.equal(dimensionValue(none, confDimension('Discount')), UNSPECIFIED);
  assert.equal(dimensionLabel(confDimension('Discount')), 'Confirmation: Discount');
  assert.equal(dimensionValue(t(1, { trend: 'Reversal', type: 'SHORT' }), 'sweptSide'), 'Asia High');
  assert.equal(dimensionValue(t(1, { trend: 'Reversal', type: 'LONG' }), 'sweptSide'), 'Asia Low');
  assert.equal(dimensionValue(t(1, { trend: 'Continuation', type: 'LONG' }), 'sweptSide'), UNSPECIFIED);
  assert.equal(dimensionValue(t(1, { sweepTime: '02:45' }), 'sweepHour1h'), '02:00–03:00');
  assert.equal(dimensionValue(t(1, { sweepTime: '23:10' }), 'sweepHour1h'), '23:00–00:00');
  // Tek değerli boyutlar bütünü böler
  const list = [a, none, t(-1, { confirmationTags: ['Discount'] })];
  for (const d of ['confCount', 'sweptSide', 'sweepHour1h', confDimension('Discount')] as const) {
    const card = buildSetupScorecard(list, [d], { minSample: 1, includeUnspecified: true });
    assert.equal(card.rows.reduce((s, r) => s + r.edge.n, 0), list.length, d);
  }
});

test('tarama alanları: az veride 1 saatlik sweep, sık confirmation\'lar ayrı ayrı taranır', () => {
  const trades: Trade[] = [];
  for (let i = 0; i < 40; i++) {
    trades.push(t(i % 2 ? 2 : -1, { id: 'x' + i, sweepTime: '02:15', createdAt: NOW - i * DAY, confirmationTags: i % 2 ? ['SMT Divergence', 'Discount'] : ['Discount'] }));
  }
  const dims = scanDimensionsFor(trades, 10);
  assert.ok(dims.includes('sweepHour1h') && !dims.includes('sweepHour'));
  // SMT: 20 var / 20 yok → taranır; Discount her işlemde var ("yok" grubu boş) → taranmaz
  assert.ok(dims.includes(confDimension('SMT Divergence')));
  assert.ok(!dims.includes(confDimension('Discount')));
  // Çok veride 30 dakikalık dilimlere geçer
  const many = Array.from({ length: SWEEP_FINE_MIN }, (_, i) => t(1, { id: 'm' + i, sweepTime: '03:40', createdAt: NOW - i * 3600000 }));
  const d2 = scanDimensionsFor(many, 10);
  assert.ok(d2.includes('sweepHour') && !d2.includes('sweepHour1h'));
  // Edge Özeti tek confirmation farkını yakalar: SMT olan işlemler +2R, olmayanlar −1R
  const s = computeEdgeSummary(trades, 10, NOW);
  const smt = [...s.strengths, ...s.leaks].find((x) => x.dimension === confDimension('SMT Divergence'));
  assert.ok(smt, 'SMT boyutu bulguda');
  assert.equal(smt!.dimensionLabel, 'Confirmation: SMT Divergence');
});

test('birleşim taraması: aynı işlemleri kapsayan birleşimler tek kez listelenir', () => {
  const trades: Trade[] = [];
  // Confirmations (Discount / Discount + SMT), Confirmation Sayısı (1 / 2) ve SMT (Yok / Var) aynı işlemleri ayırır
  for (let i = 0; i < 40; i++) {
    const smt = i % 2 === 1;
    trades.push(t(i % 3 === 0 ? 2 : -1, { id: 'p' + i, type: Math.floor(i / 2) % 2 ? 'LONG' : 'SHORT', createdAt: NOW - i * DAY, confirmationTags: smt ? ['Discount', 'SMT Divergence'] : ['Discount'] }));
  }
  const pairs = scanPairs(trades, 5, undefined, 0);
  const withType = pairs.filter((p) => p.dims.includes('type'));
  assert.ok(withType.length > 0);
  const sigs = pairs.map((p) => trades.filter((x) => dimensionValue(x, p.dims[0]) === p.values[0] && dimensionValue(x, p.dims[1]) === p.values[1]).map((x) => x.id).join(','));
  assert.equal(new Set(sigs).size, sigs.length, 'tekrar eden birleşim yok');
  // Alan sırasında önce gelen (Confirmations) kalır; eşdeğer Confirmation Sayısı / SMT birleşimleri düşer
  assert.ok(withType.some((p) => p.dims.includes('premiumDiscount')));
  assert.ok(!withType.some((p) => p.dims.includes('confCount') || p.dims.some((d) => d.startsWith('conf:'))));
});
