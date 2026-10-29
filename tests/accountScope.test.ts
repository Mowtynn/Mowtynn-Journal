import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveScope, scopeTrades, scopeKey, scopeLabel, scopeAccountRows, UNLINKED } from '../src/lib/accountScope';
import { applyGlobalFilters, type GlobalTradeFilters } from '../src/lib/tradeFilters';
import { weeklyEntryId, weeklyEntryScope, buildWeeklyEntry, weeklyReviewDue, findWeeklyEntry } from '../src/lib/weeklyReview';
import { nyInputToTs } from '../src/lib/tradingTime';
import { trade, account, NOW, DAY } from './fixtures';

const ch1 = account({ id: 'c1', chainId: 'k1', chainName: 'FTMO 10K', name: 'FTMO 10K · Phase 1', stage: 1 });
const ch2 = account({ id: 'c2', chainId: 'k2', chainName: 'Apex 50K', name: 'Apex 50K · Phase 2', stage: 2, status: 'BLOWN', closedAt: NOW - DAY });
const fu1 = account({ id: 'f1', chainId: 'k3', chainName: 'FTMO 100K', name: 'FTMO 100K · Funded', stage: 0 });
const idle = account({ id: 'c3', chainId: 'k4', chainName: 'Eski', name: 'Eski · Phase 1', stage: 1, status: 'ARCHIVED' });
const accounts = [ch1, ch2, fu1, idle];

const trades = [
  trade({ id: 'a', status: 'WIN', rr: 2, accountId: 'c1', accountStage: 1, accountCategory: 'CHALLENGE' }),
  trade({ id: 'b', status: 'LOSS', rr: -1, accountId: 'c2', accountStage: 2, accountCategory: 'CHALLENGE' }),
  trade({ id: 'c', status: 'WIN', rr: 1, accountId: 'f1', accountStage: 0, accountCategory: 'FUNDED' }),
  trade({ id: 'd', status: 'WIN', rr: 3, accountCategory: 'DEMO' }),
  trade({ id: 'e', status: 'LOSS', rr: -1 }), // eski hesapsız işlem (alan yok) → DEMO
];
const legacyFunded = trade({ id: 'z', status: 'WIN', rr: 1, accountCategory: 'FUNDED', platform: 'Funded' });
const ids = (list: { id: string }[]) => list.map((t) => t.id).sort().join(',');

test('kapsam: kategoriler birbirine karışmaz, tek hesap yalnızca kendi işlemlerini alır', () => {
  // TÜMÜ = prop hesapları; hesapsızlar (d, e) yalnızca HESAPSIZ'da
  assert.equal(ids(scopeTrades(trades, 'ALL', null)), 'a,b,c');
  assert.equal(ids(scopeTrades(trades, 'CHALLENGE', null)), 'a,b');
  assert.equal(ids(scopeTrades(trades, 'FUNDED', null)), 'c');
  assert.equal(ids(scopeTrades(trades, 'DEMO', null)), 'd,e');
  assert.equal(ids(scopeTrades(trades, 'CHALLENGE', ch1)), 'a');
  assert.equal(ids(scopeTrades(trades, 'FUNDED', fu1)), 'c');
});

test('kapsam: silinmiş ya da kategorisi uymayan hesap seçimi kategori düzeyine düşer', () => {
  assert.equal(resolveScope({ category: 'CHALLENGE', accountId: 'yok' }, accounts).account, null);
  assert.deepEqual(resolveScope({ category: 'FUNDED', accountId: 'c1' }, accounts).scope, { category: 'FUNDED', accountId: null });
  assert.equal(resolveScope({ category: 'FUNDED', accountId: 'f1' }, accounts).account?.id, 'f1');
});

test('üst filtre: hesap seçimi diğer filtrelerle birlikte uygulanır', () => {
  const base: GlobalTradeFilters = {
    activeAccountCategory: 'CHALLENGE',
    activeAccount: ch1,
    globalSelectedConfirmations: [],
    globalSelectedPlanFidelity: [],
    globalDateLimit: 'ALL',
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
  assert.equal(ids(applyGlobalFilters(trades, base, NOW)), 'a');
  assert.equal(ids(applyGlobalFilters(trades, { ...base, activeAccount: null }, NOW)), 'a,b');
  assert.equal(ids(applyGlobalFilters(trades, { ...base, activeAccountCategory: 'DEMO', activeAccount: null }, NOW)), 'd,e');
});

test('seçici listesi: kategoriye göre, aktifler önce; işlemsiz kapalı hesap gösterilmez', () => {
  const ch = scopeAccountRows(accounts, trades, 'CHALLENGE');
  assert.deepEqual(ch.rows.map((r) => [r.account.id, r.count]), [['c1', 1], ['c2', 1]]);
  assert.equal(ch.unlinked, 0);
  const fu = scopeAccountRows(accounts, [...trades, legacyFunded], 'FUNDED');
  assert.deepEqual(fu.rows.map((r) => r.account.id), ['f1']);
  assert.equal(fu.unlinked, 1); // kategori toplamı = hesaplar + bağsız
});

test('bağsız işlemler: kategoride olup hiçbir hesaba ait olmayanlar ayrı seçilebilir', () => {
  const all = [...trades, legacyFunded];
  const r = resolveScope({ category: 'FUNDED', accountId: UNLINKED }, accounts);
  assert.equal(r.scope.accountId, UNLINKED);
  assert.equal(ids(scopeTrades(all, 'FUNDED', r.account, r.unlinkedOf)), 'z');
  assert.equal(scopeKey('FUNDED', UNLINKED), 'funded_unlinked');
  assert.equal(resolveScope({ category: 'DEMO', accountId: UNLINKED }, accounts).unlinkedOf, null);
});

test('kapsam anahtarı ve adı', () => {
  assert.equal(scopeKey('ALL', null), '');
  assert.equal(scopeKey('DEMO', null), 'demo');
  assert.equal(scopeKey('FUNDED', 'f1'), 'acc_f1');
  assert.equal(scopeLabel('ALL', null), 'Tüm Prop Hesapları');
  assert.equal(scopeLabel('DEMO', null), 'Hesapsız');
  assert.equal(scopeLabel('FUNDED', fu1), 'Funded · FTMO 100K');
});

test('haftalık değerlendirme kapsam başına ayrı: kimlik, okuma ve hatırlatma', () => {
  assert.equal(weeklyEntryId('2026-10-19'), 'weekly-2026-10-19'); // eski kayıtlarla uyumlu (TÜMÜ)
  assert.equal(weeklyEntryId('2026-10-19', 'acc_f1'), 'weekly-2026-10-19--acc_f1');
  const funded = buildWeeklyEntry('2026-10-19', { good: 'x', avoid: '', focus: '' }, undefined, 'funded', 'Funded');
  assert.equal(weeklyEntryScope(funded), 'funded');
  assert.match(funded.title, /Funded/);
  assert.equal(weeklyEntryScope(buildWeeklyEntry('2026-10-19', { good: 'x', avoid: '', focus: '' })), '');
  assert.equal(findWeeklyEntry([funded], '2026-10-19'), undefined);
  assert.equal(findWeeklyEntry([funded], '2026-10-19', 'funded')?.id, funded.id);

  const sat = nyInputToTs('2026-10-24T12:00')!;
  const wk = [trade({ id: 'w', status: 'WIN', rr: 1, createdAt: nyInputToTs('2026-10-20T09:30')! })];
  assert.equal(weeklyReviewDue(wk, [funded], sat, 'funded'), null); // Funded yazıldı
  assert.equal(weeklyReviewDue(wk, [funded], sat, ''), '2026-10-19'); // TÜMÜ hâlâ bekliyor
});
