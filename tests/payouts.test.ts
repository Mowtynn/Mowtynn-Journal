import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePayouts, payoutsFromLegacyAccounts, summarizePayouts, mergePayouts } from '../src/lib/payouts';

test('payout doğrulama: geçersiz tarih / tutar / firma atılır, aynı kimlik bir kez, yeniden eskiye sıralı', () => {
  const list = sanitizePayouts([
    { id: 'a', date: '2026-03-01', amount: 1200, firm: 'ftmo', createdAt: 1 },
    { id: 'b', date: '2026-05-10', amount: '850.5', firm: 'The5ers', note: '  ilk  ' },
    { id: 'a', date: '2026-04-01', amount: 10, firm: 'X' }, // tekrar eden kimlik
    { id: 'c', date: '2026/05/10', amount: 100, firm: 'X' }, // bozuk tarih
    { id: 'd', date: '2026-05-10', amount: -5, firm: 'X' }, // eksi tutar
    { id: 'e', date: '2026-05-10', amount: 50, firm: '  ' }, // firma yok
    null,
  ]);
  assert.deepEqual(list.map((p) => p.id), ['b', 'a']);
  assert.equal(list[0].amount, 850.5);
  assert.equal(list[0].note, 'ilk');
  assert.equal(list[1].firm, 'FTMO');
  assert.deepEqual(sanitizePayouts('bozuk'), []);
});

test('eski prop hesaplarındaki payout sertifikaları taşınır (funded sertifikaları değil)', () => {
  const legacy = [
    {
      id: 'acc1', firm: 'FTMO', chainName: 'FTMO 100K', name: 'FTMO 100K · Funded',
      certificates: [
        { id: 'c1', kind: 'PAYOUT', date: '2026-06-01', amount: 2000, note: 'ilk payout', createdAt: 5 },
        { id: 'c2', kind: 'FUNDED', date: '2026-05-01' },
      ],
    },
    { id: 'acc2', chainName: 'Apex 50K', certificates: [{ id: 'c3', kind: 'PAYOUT', date: '2026-07-01', amount: 700 }] },
    { id: 'acc3' },
  ];
  const list = payoutsFromLegacyAccounts(legacy);
  assert.deepEqual(list.map((p) => [p.id, p.firm, p.amount]), [['c3', 'Apex 50K', 700], ['c1', 'FTMO', 2000]]);
  assert.equal(list[1].note, 'ilk payout');
  assert.deepEqual(payoutsFromLegacyAccounts(undefined), []);
});

test('özet: toplam, ortalama, en büyük, yıla / firmaya / aya göre', () => {
  const s = summarizePayouts(
    sanitizePayouts([
      { id: '1', date: '2025-12-20', amount: 500, firm: 'FTMO' },
      { id: '2', date: '2026-01-15', amount: 1000.25, firm: 'FTMO' },
      { id: '3', date: '2026-01-30', amount: 300, firm: 'Apex' },
    ]),
  );
  assert.equal(s.total, 1800.25);
  assert.equal(s.count, 3);
  assert.equal(s.average, 600.08);
  assert.equal(s.largest, 1000.25);
  assert.deepEqual(s.byYear.map((g) => [g.key, g.total, g.count]), [['2026', 1300.25, 2], ['2025', 500, 1]]);
  assert.deepEqual(s.byFirm.map((g) => [g.key, g.total]), [['FTMO', 1500.25], ['Apex', 300]]);
  assert.deepEqual(s.byMonth.map((g) => g.key), ['2026-01', '2025-12']);
  assert.equal(s.lastDate, '2026-01-30');
  const empty = summarizePayouts([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.lastDate, null);
});

test('birleştirme: yedekteki aynı kimlikli kayıt yereldekinin yerine geçer', () => {
  const local = sanitizePayouts([{ id: 'a', date: '2026-01-01', amount: 100, firm: 'X' }, { id: 'b', date: '2026-02-01', amount: 200, firm: 'Y' }]);
  const merged = mergePayouts(local, sanitizePayouts([{ id: 'a', date: '2026-01-01', amount: 150, firm: 'X' }]));
  assert.deepEqual(merged.map((p) => [p.id, p.amount]), [['b', 200], ['a', 150]]);
});
