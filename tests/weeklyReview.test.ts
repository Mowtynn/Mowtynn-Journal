import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  weekStartOf,
  weekLabel,
  computeWeekReview,
  buildWeeklyEntry,
  weeklyReviewDue,
  weeklyEntryId,
  isWeeklyEntry,
} from '../src/lib/weeklyReview';
import { nyInputToTs } from '../src/lib/tradingTime';
import { trade } from './fixtures';
import type { JournalEntry } from '../src/types';

const ny = (s: string) => nyInputToTs(s)!;

test('hafta sınırları: NY günüyle Pazartesi–Pazar; ay ve yıl geçişi', () => {
  assert.equal(weekStartOf('2026-10-22'), '2026-10-19'); // Perşembe → Pazartesi
  assert.equal(weekStartOf('2026-10-19'), '2026-10-19'); // Pazartesi kendisi
  assert.equal(weekStartOf('2026-10-25'), '2026-10-19'); // Pazar aynı haftada
  assert.equal(weekStartOf('2027-01-01'), '2026-12-28'); // yıl geçişi
  assert.equal(addDays('2026-10-26', 6), '2026-11-01');
  assert.equal(weekLabel('2026-10-19'), '19–25 Eki 2026');
  assert.equal(weekLabel('2026-10-26'), '26 Eki – 1 Kas 2026');
});

test('haftalık özet: toplamlar, gün şeridi, önceki hafta, en iyi / en kötü kurulum', () => {
  const trades = [
    // bu hafta (19–25 Eki 2026, NY)
    trade({ id: 'a', status: 'WIN', rr: 2, createdAt: ny('2026-10-19T09:30'), asiaRange: 'Range', session: 'London', entryModels: ['Breaker'] }),
    trade({ id: 'b', status: 'LOSS', rr: -1, createdAt: ny('2026-10-20T09:30'), asiaRange: 'Range', session: 'NY AM', entryModels: ['FVG'] }),
    trade({ id: 'c', status: 'BREAKEVEN', rr: 0, createdAt: ny('2026-10-20T11:00') }),
    // NY'de Pazar akşamı: aynı hafta (İstanbul'da Pazartesi olsa bile)
    trade({ id: 'd', status: 'WIN', rr: 1, createdAt: ny('2026-10-25T20:00'), asiaRange: 'Range', session: 'London', entryModels: ['Breaker'] }),
    // geçen hafta
    trade({ id: 'p', status: 'LOSS', rr: -1, createdAt: ny('2026-10-14T10:00') }),
  ];
  const r = computeWeekReview(trades, '2026-10-19');
  assert.equal(r.totals.n, 4);
  assert.equal(r.totals.netR, 2);
  assert.equal(r.totals.wins, 2);
  assert.equal(r.totals.losses, 1);
  assert.equal(r.totals.breakevens, 1);
  assert.equal(r.totals.winRate, 50);
  assert.equal(r.previous.n, 1);
  assert.equal(r.previous.netR, -1);
  assert.equal(r.days[0].netR, 2);
  assert.equal(r.days[1].n, 2);
  assert.equal(r.days[6].n, 1); // Pazar
  assert.equal(r.best?.label, 'Asia Range · London · Breaker');
  assert.equal(r.best?.netR, 3);
  assert.equal(r.worst?.netR, -1);
});

test('kayıt: sabit kimlik, etiket, okunur içerik; mevcut kaydın oluşturulma zamanı korunur', () => {
  const e = buildWeeklyEntry('2026-10-19', { good: 'Plana uydum', avoid: '', focus: 'Günde 2 işlem' });
  assert.equal(e.id, weeklyEntryId('2026-10-19'));
  assert.equal(e.date, '2026-10-19');
  assert.ok(isWeeklyEntry(e));
  assert.match(e.content, /Plana uydum/);
  assert.match(e.content, /Günde 2 işlem/);
  const again = buildWeeklyEntry('2026-10-19', { good: 'x', avoid: 'y', focus: 'z' }, { ...e, createdAt: 123, updatedAt: 456 });
  assert.equal(again.createdAt, 123);
});

test('hatırlatma: Cuma 17:00 NY öncesi yok; sonrası işlem varsa ve yazılmadıysa var; yazılınca kalkar', () => {
  const trades = [trade({ id: 'x', status: 'WIN', rr: 1, createdAt: ny('2026-10-20T09:30') })];
  assert.equal(weeklyReviewDue(trades, [], ny('2026-10-23T16:59')), null); // Cuma kapanış öncesi
  assert.equal(weeklyReviewDue(trades, [], ny('2026-10-23T17:00')), '2026-10-19');
  assert.equal(weeklyReviewDue(trades, [], ny('2026-10-25T12:00')), '2026-10-19'); // Pazar
  assert.equal(weeklyReviewDue([], [], ny('2026-10-24T12:00')), null); // bu hafta işlem yok
  const written = buildWeeklyEntry('2026-10-19', { good: 'iyi', avoid: '', focus: '' }) as JournalEntry;
  assert.equal(weeklyReviewDue(trades, [written], ny('2026-10-24T12:00')), null);
});
