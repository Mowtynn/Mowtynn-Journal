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
  // yönetim boyutları giriş önerilerine karışmaz
  const m = computeEdgeSummary(Array.from({ length: 12 }, (_, i) => t(i % 3 ? 2 : -1, { management: ["BE Çekildi"] }, i)).concat(Array.from({ length: 12 }, (_, i) => t(-1, { management: ['Plana Göre'] }, i + 20))));
  assert.ok(!m.strengths.concat(m.leaks).some((x) => x.dimension === 'management'));
  assert.ok(m.managementSlices.some((x) => x.dimension === 'management'));
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

test('işlemde kalma süresi: kazanan / kaybeden ortalaması', () => {
  const H = 3600000;
  const list = [
    t(2, { createdAt: NOW - 10 * DAY, exitAt: NOW - 10 * DAY + 2 * H }, 1),
    t(1, { createdAt: NOW - 9 * DAY, exitAt: NOW - 9 * DAY + 4 * H }, 2),
    t(-1, { createdAt: NOW - 8 * DAY, exitAt: NOW - 8 * DAY + H }, 3),
    t(1, {}, 4),
  ];
  const s = computeEdgeSummary(list);
  assert.equal(s.holding.n, 3);
  assert.equal(s.holding.winAvgMs, 3 * H);
  assert.equal(s.holding.lossAvgMs, H);
});
