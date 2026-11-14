import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeEdgeSummary } from '../src/lib/edgeSummary';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (200 - i) * DAY, ...p });

test('sızıntı ve güç: yeterli örneklemli tekil alan değerleri', () => {
  const list = [
    ...Array.from({ length: 10 }, (_, i) => t(i % 4 === 0 ? -1 : 2, { session: 'London', riskPct: 0.5 }, i - 2)),
    ...Array.from({ length: 8 }, (_, i) => t(i === 0 ? 1 : -1, { session: 'NY PM', riskPct: 1 }, i + 10)),
    t(5, { session: 'Asia' }, 30), // az örneklem: listede yok
  ];
  const s = computeEdgeSummary(list);
  assert.equal(s.total, 19);
  assert.equal(s.leaks[0].value, 'NY PM');
  assert.equal(s.leaks[0].edge.netR, -6);
  assert.equal(s.strengths[0].value, 'London');
  assert.ok(!s.leaks.concat(s.strengths).some((x) => x.value === 'Asia'));
  // olumlu bulguya yüksek eşik: kanıtlanmamış 8 işlemli pozitif alan "daha çok yap"a girmez
  const few = computeEdgeSummary(list.filter((x) => x.session !== 'London' || x.createdAt > NOW - 200 * DAY));
  assert.ok(!few.strengths.some((x) => x.value === 'London'));
  assert.deepEqual(s.riskSlices.map((r) => [r.riskPct, r.edge.n]), [[0.5, 10], [1, 8]]);
});

test('News day etkisi ve bilinmeyenler', () => {
  const list = [t(2, { newsDay: false }, 1), t(-1, { newsDay: true }, 2), t(1, {}, 3)];
  const s = computeEdgeSummary(list);
  assert.equal(s.news.yes.netR, -1);
  assert.equal(s.news.no.netR, 2);
  assert.equal(s.news.unknown, 1);
});

test('boş liste güvenli', () => {
  const s = computeEdgeSummary([]);
  assert.equal(s.total, 0);
  assert.deepEqual(s.leaks, []);
  assert.deepEqual(s.bestSetups, []);
});


test('kural zamanları: kaldırılan girdiler temizlenir, Sweep Saati → POI Sweep Saati (birleşik kurallarda da)', async () => {
  const { migrateRuleSince } = await import('../src/lib/ruleSince');
  const out = migrateRuleSince({
    'TAKE|Sweep Saati (NY, 30 dk): 02:00–02:30': 5,
    'TAKE|POI Sweep Saati (NY, 30 dk): 02:00–02:30': 7,
    'TAKE|Entry TF: 5M': 1,
    'AVOID|Trend: Reversal + Sweep Saati (NY, 30 dk): 03:00–03:30': 3,
    'AVOID|Trend: Reversal + PD Array: Premium': 4,
    'TAKE|Session: London': 2,
    bozuk: 'x',
  });
  assert.deepEqual(out, {
    'TAKE|POI Sweep Saati (NY, 30 dk): 02:00–02:30': 5,
    'AVOID|Trend: Reversal + POI Sweep Saati (NY, 30 dk): 03:00–03:30': 3,
    'TAKE|Session: London': 2,
  });
  assert.deepEqual(migrateRuleSince(null), {});
});
