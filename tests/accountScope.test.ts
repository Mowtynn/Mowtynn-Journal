import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scopeTrades, scopeKey, scopeLabel } from '../src/lib/accountScope';
import { applyGlobalFilters, type GlobalTradeFilters } from '../src/lib/tradeFilters';
import { weeklyEntryId, weeklyEntryScope, buildWeeklyEntry, weeklyReviewDue, findWeeklyEntry } from '../src/lib/weeklyReview';
import { nyInputToTs } from '../src/lib/tradingTime';
import { trade, NOW } from './fixtures';

const trades = [
  // Eski hesap takibinden kalan kayıtlar (Challenge / Funded, hesap bağı) Prop sayılır
  trade({ id: 'a', status: 'WIN', rr: 2, accountId: 'c1', accountStage: 1, accountCategory: 'CHALLENGE' }),
  trade({ id: 'b', status: 'LOSS', rr: -1, accountId: 'c2' }),
  trade({ id: 'c', status: 'WIN', rr: 1, accountCategory: 'FUNDED', platform: 'Funded' }),
  // Yeni kayıtlar
  trade({ id: 'p', status: 'WIN', rr: 1, prop: true }),
  trade({ id: 'd', status: 'WIN', rr: 3, accountCategory: 'DEMO' }),
  trade({ id: 'e', status: 'LOSS', rr: -1 }), // eski hesapsız işlem (alan yok) → Hesapsız
];
const ids = (list: { id: string }[]) => list.map((t) => t.id).sort().join(',');

test('kapsam: Prop ve Hesapsız birbirine karışmaz; eski Challenge / Funded kayıtları Prop', () => {
  assert.equal(ids(scopeTrades(trades, 'PROP')), 'a,b,c,p');
  assert.equal(ids(scopeTrades(trades, 'DEMO')), 'd,e');
  // Hesapsız işaretli kayıt başka alanlarla Prop'a kaymaz
  assert.equal(ids(scopeTrades([trade({ id: 'x', status: 'WIN', rr: 1, accountCategory: 'DEMO', accountId: 'eski' })], 'DEMO')), 'x');
});

test('üst filtre: hesap türü diğer filtrelerle birlikte uygulanır', () => {
  const base: GlobalTradeFilters = {
    activeAccountCategory: 'PROP',
    globalDateLimit: 'ALL',
    globalSelectedAssets: [],
    globalSelectedSessions: [],
    globalSelectedStatuses: [],
    globalSelectedTypes: [],
    globalSelectedTrendTypes: [],
  };
  assert.equal(ids(applyGlobalFilters(trades, base, NOW)), 'a,b,c,p');
  assert.equal(ids(applyGlobalFilters(trades, { ...base, globalSelectedStatuses: ['WIN'] }, NOW)), 'a,c,p');
  assert.equal(ids(applyGlobalFilters(trades, { ...base, activeAccountCategory: 'DEMO' }, NOW)), 'd,e');
});

test('kapsam anahtarı ve adı', () => {
  assert.equal(scopeKey('PROP'), '');
  assert.equal(scopeKey('DEMO'), 'demo');
  assert.equal(scopeLabel('PROP'), 'Prop');
  assert.equal(scopeLabel('DEMO'), 'Hesapsız');
});

test('haftalık değerlendirme kapsam başına ayrı: kimlik, okuma ve hatırlatma', () => {
  assert.equal(weeklyEntryId('2026-10-19'), 'weekly-2026-10-19'); // Prop (eski "tüm prop" kayıtlarıyla uyumlu)
  assert.equal(weeklyEntryId('2026-10-19', 'demo'), 'weekly-2026-10-19--demo');
  const demo = buildWeeklyEntry('2026-10-19', { good: 'x', avoid: '', focus: '' }, undefined, 'demo', 'Hesapsız');
  assert.equal(weeklyEntryScope(demo), 'demo');
  assert.match(demo.title, /Hesapsız/);
  assert.equal(weeklyEntryScope(buildWeeklyEntry('2026-10-19', { good: 'x', avoid: '', focus: '' })), '');
  assert.equal(findWeeklyEntry([demo], '2026-10-19'), undefined);
  assert.equal(findWeeklyEntry([demo], '2026-10-19', 'demo')?.id, demo.id);

  const sat = nyInputToTs('2026-10-24T12:00')!;
  const wk = [trade({ id: 'w', status: 'WIN', rr: 1, createdAt: nyInputToTs('2026-10-20T09:30')! })];
  assert.equal(weeklyReviewDue(wk, [demo], sat, 'demo'), null); // Hesapsız yazıldı
  assert.equal(weeklyReviewDue(wk, [demo], sat, ''), '2026-10-19'); // Prop hâlâ bekliyor
});
