import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGlobalFilters, getMinTimestamp, GlobalTradeFilters } from '../src/lib/tradeFilters';
import { NOW, DAY, trade } from './fixtures';

const none: GlobalTradeFilters = {
  activeAccountCategory: 'ALL',
  globalSelectedConfirmations: [],
  globalSelectedPlanFidelity: [],
  globalDateLimit: 'all',
  globalSelectedAssets: [],
  globalSelectedSessions: [],
  globalSelectedTimeframes: [],
  globalSelectedHtfTimeframes: [],
  globalSelectedStatuses: [],
  globalSelectedTypes: [],
  globalSelectedEntryModels: [],
  globalSelectedTrendTypes: [],
  globalMinAsiaRangePips: undefined,
  globalMaxAsiaRangePips: undefined,
  globalMinMaePips: undefined,
  globalMaxMaePips: undefined,
  globalMinMfePips: undefined,
  globalMaxMfePips: undefined,
};
const f = (p: Partial<GlobalTradeFilters>) => ({ ...none, ...p });

const p1 = trade({ status: 'WIN', rr: 3, accountId: 'a', accountStage: 1, accountCategory: 'CHALLENGE', platform: 'FTMO 10K · Phase 1', createdAt: NOW - 2 * DAY, maePips: 4 });
const p2 = trade({ status: 'LOSS', rr: -1, accountId: 'b', accountStage: 2, accountCategory: 'CHALLENGE', platform: 'FTMO 10K · Phase 2', createdAt: NOW - 10 * DAY });
const fu = trade({ status: 'WIN', rr: 2, accountId: 'c', accountStage: 0, accountCategory: 'FUNDED', platform: 'FTMO 10K · Funded', createdAt: NOW - 40 * DAY, maePips: 12 });
const demo = trade({ status: 'BREAKEVEN', rr: 0, accountCategory: 'DEMO', createdAt: NOW - DAY, session: 'London KZ' });
const legacy = trade({ status: 'WIN', rr: 1, createdAt: NOW - DAY }); // eski kayıt: hesap bilgisi yok
const all = [p1, p2, fu, demo, legacy];
const ids = (list: { id: string }[]) => list.map((t) => t.id);

test('TÜMÜ yalnızca prop hesaplarını kapsar; hesapsız ve hesap bilgisi olmayan eski kayıt dışarıda', () => {
  assert.deepEqual(ids(applyGlobalFilters(all, none, NOW)), ids([p1, p2, fu]));
});

test('Hesap Türü: Challenge / Funded / Hesapsız', () => {
  assert.deepEqual(ids(applyGlobalFilters(all, f({ activeAccountCategory: 'CHALLENGE' }), NOW)), ids([p1, p2]));
  assert.deepEqual(ids(applyGlobalFilters(all, f({ activeAccountCategory: 'FUNDED' }), NOW)), ids([fu]));
  // hesap bilgisi olmayan eski kayıt Hesapsız sayılır
  assert.deepEqual(ids(applyGlobalFilters(all, f({ activeAccountCategory: 'DEMO' }), NOW)), ids([demo, legacy]));
});

test('tarih aralığı "şimdi"ye göre', () => {
  assert.deepEqual(ids(applyGlobalFilters(all, f({ globalDateLimit: '1w' }), NOW)), ids([p1]));
  assert.deepEqual(ids(applyGlobalFilters(all, f({ activeAccountCategory: 'DEMO', globalDateLimit: '1w' }), NOW)), ids([demo, legacy]));
  assert.deepEqual(ids(applyGlobalFilters(all, f({ globalDateLimit: '1m' }), NOW)), ids([p1, p2]));
  assert.equal(getMinTimestamp('all', NOW), 0);
  assert.equal(getMinTimestamp('1w', NOW), NOW - 7 * DAY);
});

test('sayısal aralık: değeri girilmemiş işlem aralık filtresinden geçmez', () => {
  assert.deepEqual(ids(applyGlobalFilters(all, f({ globalMinMaePips: 5 }), NOW)), ids([fu]));
  assert.deepEqual(ids(applyGlobalFilters(all, f({ globalMaxMaePips: 5 }), NOW)), ids([p1]));
});

test('filtreler birlikte VE ile çalışır', () => {
  const out = applyGlobalFilters(all, f({ activeAccountCategory: 'CHALLENGE', globalSelectedStatuses: ['WIN'] }), NOW);
  assert.deepEqual(ids(out), ids([p1]));
  assert.deepEqual(applyGlobalFilters(all, f({ activeAccountCategory: 'FUNDED', globalSelectedStatuses: ['LOSS'] }), NOW), []);
});

test('seans filtresi metin normalizasyonuyla eşleşir', () => {
  assert.deepEqual(ids(applyGlobalFilters(all, f({ activeAccountCategory: 'DEMO', globalSelectedSessions: ['LONDON KZ'] }), NOW)), ids([demo]));
});

test('ek alan filtreleri: strateji, News day, P/D, TP target, Asia FVG, risk %, hızlı kayıt', async () => {
  const { EMPTY_EXTRA_FILTERS, countExtraFilters, sanitizeExtraFilters } = await import('../src/lib/tradeFilters');
  const a = trade({ status: 'WIN', rr: 2, asiaRange: 'Swept', newsDay: true, premiumDiscount: 'Discount', tpTargets: ['PDH / PDL'], asiaRangeFvg: 'Var', riskPct: 0.5 });
  const b = trade({ status: 'LOSS', rr: -1, asiaRange: 'Range', newsDay: false, premiumDiscount: 'Premium', tpTargets: ['Asia High / Low'], riskPct: 1, quickEntry: true });
  const c = trade({ status: 'WIN', rr: 1 }); // alanlar girilmemiş
  const list = [a, b, c];
  // a, b, c hesapsız işlemler: HESAPSIZ kapsamında süzülür
  const x = (p: Partial<typeof EMPTY_EXTRA_FILTERS>) => f({ activeAccountCategory: 'DEMO', globalExtra: { ...EMPTY_EXTRA_FILTERS, ...p } });

  assert.deepEqual(ids(applyGlobalFilters(list, x({}), NOW)), ids(list), 'boş ek filtre listeyi değiştirmez');
  assert.deepEqual(ids(applyGlobalFilters(list, x({ asiaRanges: ['swept'] }), NOW)), [a.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ newsDay: 'YES' }), NOW)), [a.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ newsDay: 'NO' }), NOW)), [b.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ premiumDiscounts: ['Premium'] }), NOW)), [b.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ tpTargets: ['PDH / PDL'] }), NOW)), [a.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ asiaRangeFvgs: ['Var'] }), NOW)), [a.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ riskPcts: [0.50] }), NOW)), [a.id]);
  assert.deepEqual(ids(applyGlobalFilters(list, x({ onlyIncomplete: true }), NOW)), [b.id]);
  assert.equal(countExtraFilters({ ...EMPTY_EXTRA_FILTERS, newsDay: 'NO', riskPcts: [1], onlyIncomplete: true }), 3);
  assert.deepEqual(sanitizeExtraFilters({ newsDay: 'X', riskPcts: [1, 'a', -2], asiaRanges: ['A', 3] }), { ...EMPTY_EXTRA_FILTERS, riskPcts: [1], asiaRanges: ['A'] });
});
