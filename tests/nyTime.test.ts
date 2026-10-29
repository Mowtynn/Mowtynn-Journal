import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNyInput, nyInputToTs, nyDateKey, formatDuration, getTradeHourBucket } from '../src/lib/tradingTime';

test('NY duvar saati ↔ zaman damgası: kış (UTC−5) ve yaz (UTC−4)', () => {
  const winter = nyInputToTs('2026-01-15T09:30')!;
  assert.equal(new Date(winter).toISOString(), '2026-01-15T14:30:00.000Z');
  assert.equal(toNyInput(winter), '2026-01-15T09:30');
  const summer = nyInputToTs('2026-07-01T09:30')!;
  assert.equal(new Date(summer).toISOString(), '2026-07-01T13:30:00.000Z');
  assert.equal(toNyInput(summer), '2026-07-01T09:30');
});

test('yaz saati geçiş haftası (ABD ile Avrupa farklı) doğru', () => {
  // 2026-03-09: ABD yaz saatinde, Avrupa henüz değil
  const ts = nyInputToTs('2026-03-09T08:00')!;
  assert.equal(new Date(ts).toISOString(), '2026-03-09T12:00:00.000Z');
  assert.equal(getTradeHourBucket({ createdAt: ts }), '08:00-09:00');
});

test('NY günü: gece yarısı sınırı', () => {
  // 2026-10-22 02:00 UTC = NY 21 Ekim 22:00
  assert.equal(nyDateKey(Date.UTC(2026, 9, 22, 2, 0)), '2026-10-21');
  assert.equal(nyInputToTs('bozuk'), null);
});

test('süre biçimi', () => {
  assert.equal(formatDuration(45 * 60000), '45 dk');
  assert.equal(formatDuration(130 * 60000), '2 sa 10 dk');
  assert.equal(formatDuration(27 * 3600000), '1 g 3 sa');
  assert.equal(formatDuration(-1), '—');
});

test('saat ileri alınınca (mart) var olmayan 02:30 → 03:30 EDT; uyarı için geçersiz sayılır', async () => {
  const { isNyWallTimeValid } = await import('../src/lib/tradingTime');
  const ts = nyInputToTs('2026-03-08T02:30')!;
  assert.equal(new Date(ts).toISOString(), '2026-03-08T07:30:00.000Z');
  assert.equal(toNyInput(ts), '2026-03-08T03:30');
  assert.equal(isNyWallTimeValid('2026-03-08T02:30'), false);
  assert.equal(isNyWallTimeValid('2026-03-08T03:30'), true);
  // 01:30 ile 02:30 aynı ana düşmez (çakışma yok)
  assert.notEqual(nyInputToTs('2026-03-08T01:30'), ts);
});

test('saat geri alınınca (kasım) iki kez yaşanan 01:30 → ilk geçiş (EDT); gidiş-dönüş tutarlı', () => {
  const ts = nyInputToTs('2026-11-01T01:30')!;
  assert.equal(new Date(ts).toISOString(), '2026-11-01T05:30:00.000Z');
  assert.equal(toNyInput(ts), '2026-11-01T01:30');
  assert.equal(new Date(nyInputToTs('2026-11-01T02:30')!).toISOString(), '2026-11-01T07:30:00.000Z');
  // Geçiş gecesi süresi gerçek zamandan hesaplanır: 00:30 → 02:30 = 3 saat (01:xx iki kez yaşandı)
  assert.equal((nyInputToTs('2026-11-01T02:30')! - nyInputToTs('2026-11-01T00:30')!) / 3600000, 3);
});
