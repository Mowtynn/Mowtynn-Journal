import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { computeEdgeSummary } from '../src/lib/edgeSummary';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, i: number, p: Partial<Trade> = {}) =>
  trade({ id: `t${i}`, status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (300 - i) * DAY, ...p });

test('zamanla değişim: 40 işlemden önce kapalı, son 20 belirgin kötüleşince zayıflama', () => {
  assert.equal(computeEdgeDrift(Array.from({ length: 39 }, (_, i) => t(1, i))).ready, false);
  const list = [
    ...Array.from({ length: 30 }, (_, i) => t(i % 4 === 0 ? -1 : 2, i)),
    ...Array.from({ length: 20 }, (_, i) => t(i % 4 === 0 ? 2 : -1, i + 30)),
  ];
  const d = computeEdgeDrift(list);
  assert.equal(d.ready, true);
  assert.equal(d.recent!.n, 20);
  assert.equal(d.direction, 'WEAKENING');
  assert.equal(d.strength, 'CONFIRMED');
  const flat = computeEdgeDrift(Array.from({ length: 50 }, (_, i) => t(i % 2 ? 2 : -1, i)));
  assert.equal(flat.direction, 'STABLE');
});

test('birbirine bağlı alanlar: Swept işlemlerinin çoğu London ise bulguya örtüşme notu düşer', () => {
  const list = [
    ...Array.from({ length: 12 }, (_, i) => t(i % 4 === 0 ? -1 : 2, i, { asiaRange: 'Swept', session: 'London' })),
    ...Array.from({ length: 12 }, (_, i) => t(i % 3 === 0 ? 1 : -1, i + 20, { asiaRange: 'Range', session: i % 2 ? 'London' : 'NY AM' })),
  ];
  const s = computeEdgeSummary(list);
  const swept = s.strengths.find((x) => x.value === 'Swept');
  assert.ok(swept);
  assert.equal(swept!.overlap?.label, 'Session: London');
  assert.equal(swept!.overlap?.pct, 1);
});

test('kombinasyon: tek başına nötr iki alan birlikte belirgin iyi olunca bulunur', () => {
  const list: Trade[] = [];
  let i = 0;
  // Swept + London: güçlü; Swept + NY AM ve Range + London: zayıf → alanlar tek başına ortalama
  for (let k = 0; k < 12; k++) list.push(t(k % 4 === 0 ? -1 : 2, i++, { asiaRange: 'Swept', session: 'London' }));
  for (let k = 0; k < 12; k++) list.push(t(k % 2 ? 1 : -1, i++, { asiaRange: 'Swept', session: 'NY AM' }));
  for (let k = 0; k < 12; k++) list.push(t(k % 2 ? 1 : -1, i++, { asiaRange: 'Range', session: 'London' }));
  const s = computeEdgeSummary(list);
  const best = s.bestPairs.find((p) => p.title.includes('Swept') && p.title.includes('London'));
  assert.ok(best, 'Swept + London bulunmalı');
  assert.ok(best!.lift >= 0.25);
  assert.equal(best!.edge.n, 12);
});
