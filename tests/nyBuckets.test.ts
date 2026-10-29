import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAdvancedMetrics, nyIsoWeekKey } from '../src/lib/advancedMetrics';
import { nyInputToTs } from '../src/lib/tradingTime';
import { normalizeTrade } from '../src/lib/tradeModel';
import { trade } from './fixtures';

test('haftalık hacim ve parite×seans matrisi: hafta NY takvimine göre; tarayıcının saat dilimi (İstanbul) kaydırmaz', () => {
  const prevTz = process.env.TZ;
  process.env.TZ = 'Europe/Istanbul';
  try {
    // Pazar 20:00 NY = Pazartesi 03:00 İstanbul: NY'de bir önceki haftaya aittir
    const sun = nyInputToTs('2026-10-18T20:00')!;
    const mon = nyInputToTs('2026-10-19T09:30')!;
    assert.notEqual(nyIsoWeekKey(sun), nyIsoWeekKey(mon));
    const m = calculateAdvancedMetrics([
      trade({ id: 'a', status: 'WIN', rr: 2, asset: 'EURUSD', session: 'London', createdAt: mon }),
      trade({ id: 'b', status: 'LOSS', rr: -1, asset: 'EURUSD', session: 'London', createdAt: mon + 3600000 }),
    ])!;
    assert.deepEqual(m.deadZone.EURUSD.London, { count: 2, wins: 1, rr: 1 });
    const one = m.optimalFreq.find((f) => f.label === '1-3 İşlem')!;
    assert.equal(one.weeksCount, 1);
    assert.equal(one.avgPF, 2);
    assert.equal(one.avgR, 0.5);
  } finally {
    if (prevTz === undefined) delete process.env.TZ;
    else process.env.TZ = prevTz;
  }
});

test('R işareti durumla tutarlı: ters işaretli eski kayıt düzeltilir', () => {
  assert.equal(normalizeTrade({ ...trade({ status: 'LOSS', rr: 1 }) }).rr, -1);
  assert.equal(normalizeTrade({ ...trade({ status: 'WIN', rr: -2 }) }).rr, 2);
  assert.equal(normalizeTrade({ ...trade({ status: 'BREAKEVEN', rr: 3 }) }).rr, 0);
});

test('isteğe bağlı alanların türü onarılır (bulut kuralıyla uyumlu)', () => {
  const t = normalizeTrade({ ...trade({ status: 'WIN', rr: 1 }), session: 5 as any, stopPips: '12' as any, maePips: 'x' as any, accountCategory: 'X' as any, notes: undefined as any });
  assert.equal('session' in t, false);
  assert.equal(t.stopPips, 12);
  assert.equal('maePips' in t, false);
  assert.equal('accountCategory' in t, false);
  assert.equal(t.notes, '');
});

