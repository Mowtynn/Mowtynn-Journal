import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeFromR } from '../src/lib/asiaAnalytics';

test('edge kanıtı: alt sınır sıfırın altındaysa en az 1 işlem daha gerekir; kanıtlanmışsa 0', () => {
  const weak = edgeFromR([2.5, 4, 2, -1, 3, -1, 0, 2.5, 2, -1]);
  assert.ok(weak.expLo <= 0);
  assert.ok((weak.tradesNeeded ?? 0) >= 1);
  const strong = edgeFromR([2, 2, 2, -1, 2, 2, 2, 2, -1, 2, 2, 2]);
  assert.ok(strong.expLo > 0);
  assert.equal(strong.tradesNeeded, 0);
  assert.equal(edgeFromR([-1, -1, 1]).tradesNeeded, null);
});

test('edge raporu: her girdi değeri bir satır, kurulumlar dahil', async () => {
  const { edgeReportRows } = await import('../src/lib/edgeSummary');
  const { trade } = await import('./fixtures');
  const rows = edgeReportRows([
    trade({ id: 'a', status: 'WIN', rr: 2, asiaRange: 'Swept', session: 'London', entryModels: ['FVG'], riskPct: 0.5 }),
    trade({ id: 'b', status: 'LOSS', rr: -1, asiaRange: 'Range', session: 'London', entryModels: ['FVG'], riskPct: 0.5 }),
  ]);
  const asia = rows.filter((r) => r.Girdi === 'Asia Range').map((r) => r['Değer']);
  assert.deepEqual(asia, ['Swept', 'Range']);
  assert.ok(rows.some((r) => r.Girdi === 'Risk %' && r['İşlem'] === 2));
  assert.ok(rows.some((r) => String(r.Girdi).startsWith('Kurulum')));
  assert.equal(rows.find((r) => r.Girdi === 'Asia Range')!['Hüküm'], 'Az Veri');
});
