import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetupScorecard, dimensionValue, UNSPECIFIED } from '../src/lib/setupScorecard';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (100 - i) * DAY, ...p });

test('boyut değerleri: çoklu alanlar sıralı birleşir, boşlar Belirtilmemiş', () => {
  const x = t(1, { entryModels: ['OB', 'FVG', 'FVG'], session: '  London ' });
  assert.equal(dimensionValue(x, 'entryModels'), 'FVG + OB');
  assert.equal(dimensionValue(x, 'session'), 'London');
  assert.equal(dimensionValue(x, 'asiaRange'), UNSPECIFIED);
  assert.equal(dimensionValue(x, 'tpTargets'), UNSPECIFIED);
  assert.equal(dimensionValue(t(1, { type: 'SHORT' }), 'type'), 'Short');
});

test('kurulumlar gruplanır, puana göre sıralanır ve hüküm alır', () => {
  const a = { asiaRange: 'Range', session: 'London' } satisfies Partial<Trade>;
  const b = { asiaRange: 'Trend', session: 'NY' } satisfies Partial<Trade>;
  const trades = [
    ...Array.from({ length: 12 }, (_, i) => t(i % 4 === 0 ? -1 : 2, a, i)),   // güçlü pozitif
    ...Array.from({ length: 12 }, (_, i) => t(i === 0 ? 1 : -1, b, i + 20)), // güçlü negatif
    t(3, { asiaRange: 'Swept', session: 'Asia' }, 50),                             // az örneklem
  ];
  const res = buildSetupScorecard(trades, ['asiaRange', 'session']);
  assert.equal(res.total, 25);
  assert.equal(res.rows.length, 3);
  assert.deepEqual(res.rows[0].labels, ['Range', 'London']);
  // 12 işlem: aralık sıfırın üstünde ama kanıt eşiği (30) dolmadı
  assert.equal(res.rows[0].verdict, 'PROMISING');
  assert.equal(res.rows[0].edge.n, 12);
  assert.equal(res.rows[res.rows.length - 1].labels[0], 'Trend');
  assert.equal(res.rows[res.rows.length - 1].verdict, 'LEAK');
  assert.equal(res.rows.find((r) => r.labels[0] === 'Swept')!.verdict, 'LOW_SAMPLE');
});

test('hiçbir boyutu girilmemiş işlemler varsayılan olarak ayrı sayılır', () => {
  const trades = [t(1, {}, 1), t(-1, {}, 2), t(2, { asiaRange: 'Range' }, 3)];
  const res = buildSetupScorecard(trades, ['asiaRange', 'session']);
  assert.equal(res.unspecifiedCount, 2);
  assert.equal(res.total, 1);
  const all = buildSetupScorecard(trades, ['asiaRange', 'session'], { includeUnspecified: true });
  assert.equal(all.total, 3);
  assert.equal(all.rows.length, 2);
});

test('küçük örneklemde puan sıfıra çekilir: 1 işlemlik +3R, 12 işlemlik +1R/işlemi geçemez', () => {
  const trades = [
    t(3, { asiaRange: 'Range' }, 1),
    ...Array.from({ length: 12 }, (_, i) => t(1, { asiaRange: 'Trend' }, i + 2)),
  ];
  const res = buildSetupScorecard(trades, ['asiaRange']);
  assert.equal(res.rows[0].labels[0], 'Trend');
});

test('kanıtlı edge en az 30 işlem ister; zarar uyarısı eşiği beklemez', () => {
  const a = { asiaRange: 'Range', session: 'London' } satisfies Partial<Trade>;
  const many = Array.from({ length: 30 }, (_, i) => t(i % 4 === 0 ? -1 : 2, a, i));
  assert.equal(buildSetupScorecard(many, ['asiaRange', 'session']).rows[0].verdict, 'EDGE');
  const losing = Array.from({ length: 12 }, (_, i) => t(i === 0 ? 1 : -1, a, i));
  assert.equal(buildSetupScorecard(losing, ['asiaRange', 'session']).rows[0].verdict, 'LEAK');
});

test('sweep saati ve sweep→giriş gecikmesi boyutları', async () => {
  const { sweepToEntryMinutes } = await import('../src/lib/asiaAnalytics');
  const created = Date.UTC(2026, 9, 20, 7, 40); // 03:40 NY (EDT)
  const x = t(1, { sweepTime: '03:15', createdAt: created });
  assert.equal(sweepToEntryMinutes(x), 25);
  assert.equal(dimensionValue(x, 'sweepHour'), '03:00–03:30');
  assert.equal(dimensionValue(t(1, { sweepTime: '23:45' }), 'sweepHour'), '23:30–00:00');
  assert.equal(dimensionValue(x, 'sweepDelay'), '15–30 dk');
  assert.equal(dimensionValue(t(1), 'sweepDelay'), UNSPECIFIED);
});

test('işlem süresi ve hesap aşaması boyutları', () => {
  const x = t(1, { createdAt: NOW, exitAt: NOW + 45 * 60000, accountId: 'a', accountStage: 0 });
  assert.equal(dimensionValue(x, 'holdTime'), '30–60 dk');
  assert.notEqual(dimensionValue(x, 'accountStage'), UNSPECIFIED);
  assert.equal(dimensionValue(t(1), 'holdTime'), UNSPECIFIED);
  assert.equal(dimensionValue(t(1, { accountCategory: 'DEMO' }), 'accountStage'), UNSPECIFIED);
});

test('PD Array boyutu', () => {
  assert.equal(dimensionValue(t(1, { confirmations: ['OB', 'FVG'] }), 'confirmations'), 'FVG + OB');
});

test('Asia içindeki sweep → NY AM girişi gece yarısını aşsa da ölçülür', async () => {
  const { sweepToEntryMinutes, sweepDelayBucket } = await import('../src/lib/asiaAnalytics');
  const entry = Date.UTC(2026, 9, 20, 13, 45); // 09:45 NY
  assert.equal(sweepToEntryMinutes({ createdAt: entry, sweepTime: '20:15' }), 810);
  assert.equal(sweepDelayBucket({ createdAt: entry, sweepTime: '20:15' }), '8 sa+');
  assert.equal(sweepDelayBucket({ createdAt: entry, sweepTime: '08:30' }), '1–2 sa');
});

test('planlanan R:R, stop / Asia range, günün işlemi, işlem yönetimi', async () => {
  const { managementMissedR, indexTradeOrder } = await import('../src/lib/asiaAnalytics');
  const { normalizeTrade } = await import('../src/lib/tradeModel');
  const x = t(1, { stopPips: 10, tpPips: 25, asiaRangePips: 40 });
  assert.equal(dimensionValue(x, 'plannedRR'), '1:2–3');
  assert.equal(dimensionValue(x, 'stopToRange'), '%20–35');
  const a = t(1, { id: 'a', createdAt: NOW });
  const b = t(-1, { id: 'b', createdAt: NOW + 3600000 });
  indexTradeOrder([b, a]);
  assert.equal(dimensionValue(a, 'tradeOfDay'), '1. İşlem');
  assert.equal(dimensionValue(b, 'tradeOfDay'), '2. İşlem');
  const n = normalizeTrade({ ...x, management: ['Plana Göre', "be'ye çekildi", 'x'] } as any);
  assert.deepEqual(n.management, ["BE'ye Çekildi"]);
  const be = t(0, { status: 'BREAKEVEN', stopPips: 10, tpPips: 30, afterExitTp: true, management: ["BE'ye Çekildi"] });
  assert.deepEqual(managementMissedR([be, x]), { n: 1, measured: 1, missedR: 3 });
  assert.equal(dimensionValue(be, 'afterExitTp'), "Çıkış Sonrası TP'ye Gitti");
});

test('günün işlemi: uygulama genelinde tüm hesaplar birlikte sayılır', async () => {
  const { setGlobalTradeOrder, indexTradeOrder } = await import('../src/lib/asiaAnalytics');
  const a = t(1, { id: 'g1', createdAt: NOW, accountId: 'acc1' });
  const b = t(1, { id: 'g2', createdAt: NOW + 60000, accountId: 'acc2' });
  setGlobalTradeOrder([a, b]);
  indexTradeOrder([b]); // hesap filtresiyle daraltılmış liste sırayı değiştirmez
  assert.equal(dimensionValue(b, 'tradeOfDay'), '2. İşlem');
});
