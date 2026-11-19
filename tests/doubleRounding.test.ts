import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeFromR } from '../src/lib/asiaAnalytics';
import { computeEdgeDrift } from '../src/lib/edgeDrift';
import { fixed } from '../src/lib/format';
import { NOW, DAY, trade } from './fixtures';

// Değerler önce 1–3 basamağa yuvarlanıp sonra ekranda daha az basamakla gösterilince "çifte yuvarlama" oluşuyordu
// (üst yarıya düşmeyen değer bir birim yukarı görünüyordu). EdgeStats artık ham değere yakın saklanır.

test('kazanma oranı: 11/31 = %35.48 → ekranda %35 (eskiden 35.5 → %36)', () => {
  const e = edgeFromR([...Array(11).fill(1), ...Array(20).fill(-1)]);
  assert.equal(fixed(e.winRate, 0), '35');
  assert.equal(fixed(e.winRate, 1), '35.5');
});

test('beklenti: 0.6245R → "0.62" (eskiden 0.625 → "0.63")', () => {
  const e = edgeFromR([...Array(1249).fill(1), ...Array(751).fill(0)]);
  assert.ok(e.expectancy > 0.6244 && e.expectancy < 0.6246, `beklenti ${e.expectancy}`);
  assert.equal(fixed(e.expectancy, 2), '0.62');
});

test('zamanla değişim (drift) çalışır, profit factor tam değerini korur', () => {
  const list = Array.from({ length: 60 }, (_, i) =>
    trade({ id: `d${i}`, rr: i % 3 === 0 ? -1 : 1.3, status: i % 3 === 0 ? 'LOSS' : 'WIN', createdAt: NOW - (60 - i) * DAY }),
  );
  const d = computeEdgeDrift(list);
  assert.ok(d.ready);
  // 40 kazanç × 1.3 = 52, 20 kayıp × 1 = 20 → PF 2.6; gösterilen 2 basamak tek yuvarlama
  const e = edgeFromR(list.map((t) => t.rr), list.map((t) => t.status));
  assert.equal(e.profitFactor, 2.6);
  assert.equal(fixed(e.profitFactor, 2), '2.60');
});
