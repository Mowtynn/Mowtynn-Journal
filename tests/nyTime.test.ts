import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNyInput, nyInputToTs, nyDateKey, getNyParts } from '../src/lib/tradingTime';

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
  assert.equal(getNyParts(ts)?.hour, 8);
});

test('NY günü: gece yarısı sınırı', () => {
  // 2026-10-22 02:00 UTC = NY 21 Ekim 22:00
  assert.equal(nyDateKey(Date.UTC(2026, 9, 22, 2, 0)), '2026-10-21');
  assert.equal(nyInputToTs('bozuk'), null);
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

test('yeni işlem tarihi: gün ve saat Türkiye takviminden, kayıt seçilen güne düşer', async () => {
  const { newTradeDateInput, istanbulDateKey, nyInputToTs, nyDateKey, istanbulWallDate } = await import('../src/lib/tradingTime');
  // 15 Kasım 2026 01:30 Türkiye = 14 Kasım 17:30 NY: form 15 Kasım'ı gösterir
  const ts = Date.UTC(2026, 10, 14, 22, 30);
  assert.equal(istanbulDateKey(ts), '2026-11-15');
  const v = newTradeDateInput(ts);
  assert.equal(v, '2026-11-15T01:30');
  // Kaydedilen an seçilen tarihli NY gününe düşer (listede / takvimde / gün analizinde seçilen gün)
  assert.equal(nyDateKey(nyInputToTs(v)!), '2026-11-15');
  // Öğlen Türkiye
  assert.equal(newTradeDateInput(Date.UTC(2026, 10, 14, 9, 0)), '2026-11-14T12:00');
  // Aynı Türkiye gününde gece ve sabah girilen iki işlem giriliş sırasını korur (eski NY saatli yöntemde ters dönüyordu)
  const night = nyInputToTs(newTradeDateInput(Date.UTC(2026, 10, 14, 22, 30)))!; // 15 Kasım 01:30 TR
  const morning = nyInputToTs(newTradeDateInput(Date.UTC(2026, 10, 15, 7, 0)))!; // 15 Kasım 10:00 TR
  assert.ok(night < morning);
  assert.equal(nyDateKey(night), nyDateKey(morning));
  // Türkiye duvar saati
  const w = istanbulWallDate(ts);
  assert.deepEqual([w.getFullYear(), w.getMonth() + 1, w.getDate(), w.getHours(), w.getMinutes()], [2026, 11, 15, 1, 30]);
});

test('session önerisi: NY saati bilinen session aralığına düşerse o ad döner', async () => {
  const { sessionForNyTime } = await import('../src/lib/sessions');
  const list = ['London', 'Lunch', 'NY AM'];
  assert.equal(sessionForNyTime('03:15', list), 'London');
  assert.equal(sessionForNyTime('05:00', list), null);
  assert.equal(sessionForNyTime('08:30', list), 'NY AM');
  assert.equal(sessionForNyTime('12:10', list), 'Lunch');
  assert.equal(sessionForNyTime('21:00', list), null); // Asia tanımlı değil
  assert.equal(sessionForNyTime('21:00', ['Asia']), 'Asia');
  assert.equal(sessionForNyTime('bozuk', list), null);
  assert.equal(sessionForNyTime('03:00', ['Kendi Seansım']), null);
});

test('otomatik session: kill zone dışındaki saatler session bloğuna düşer', async () => {
  const { autoSessionForNyTime } = await import('../src/lib/sessions');
  const list = ['London', 'NY AM'];
  assert.equal(autoSessionForNyTime('03:15', list), 'London');
  assert.equal(autoSessionForNyTime('05:30', list), 'London');
  assert.equal(autoSessionForNyTime('00:00', list), 'London');
  assert.equal(autoSessionForNyTime('07:00', list), 'NY AM');
  assert.equal(autoSessionForNyTime('10:45', list), 'NY AM');
  assert.equal(autoSessionForNyTime('12:10', list), null); // Lunch tanımlı değil
  assert.equal(autoSessionForNyTime('12:10', ['London', 'Lunch', 'NY AM']), 'Lunch');
  assert.equal(autoSessionForNyTime('19:00', list), null);
  assert.equal(autoSessionForNyTime('', list), null);
  assert.equal(autoSessionForNyTime('03:00', ['Kendi Seansım']), null);
});
