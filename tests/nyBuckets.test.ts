import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nyInputToTs, nyIsoWeekKey } from '../src/lib/tradingTime';
import { normalizeTrade } from '../src/lib/tradeModel';
import { trade } from './fixtures';

test('haftalık gruplama: hafta NY takvimine göre; tarayıcının saat dilimi (İstanbul) kaydırmaz', () => {
  const prevTz = process.env.TZ;
  process.env.TZ = 'Europe/Istanbul';
  try {
    // Pazar 20:00 NY = Pazartesi 03:00 İstanbul: NY'de bir önceki haftaya aittir
    const sun = nyInputToTs('2026-10-18T20:00')!;
    const mon = nyInputToTs('2026-10-19T09:30')!;
    assert.notEqual(nyIsoWeekKey(sun), nyIsoWeekKey(mon));
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

