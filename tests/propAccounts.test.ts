import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultRiskAmount,
  tradeDollarImpact,
  computeAccountMetrics,
  groupChains,
  computeBalanceSheet,
  sanitizePropAccounts,
  stageRule,
  tradeBelongsTo,
} from '../src/lib/propAccounts';
import { NOW, DAY, trade, account } from './fixtures';

test('1R = başlangıç bakiyesi × risk % (kuruşa yuvarlanır)', () => {
  assert.equal(defaultRiskAmount({ size: 10000, riskPct: 1 }), 100);
  assert.equal(defaultRiskAmount({ size: 10000, riskPct: 0.25 }), 25);
  assert.equal(defaultRiskAmount({ size: 11, riskPct: 0.5 }), 0.06);
});

test('işlemin $ etkisi = R × işlemin risk tutarı; yoksa hesabın 1R’si; ikisi de yoksa 0', () => {
  const acc = account();
  assert.equal(tradeDollarImpact(trade({ status: 'WIN', rr: 2, riskAmount: 50 }), acc), 100);
  assert.equal(tradeDollarImpact(trade({ status: 'LOSS', rr: -1 }), acc), -100);
  assert.equal(tradeDollarImpact(trade({ status: 'WIN', rr: 2 })), 0);
  assert.equal(tradeDollarImpact(trade({ status: 'BREAKEVEN', rr: 0, riskAmount: 100 }), acc), 0);
});

test('statik DD: bakiye, hedef ve tabana kalan', () => {
  const acc = account();
  const trades = [
    trade({ accountId: 'acc1', status: 'WIN', rr: 3, riskAmount: 100, createdAt: NOW - 3 * DAY }),
    trade({ accountId: 'acc1', status: 'LOSS', rr: -1, riskAmount: 100, createdAt: NOW - 2 * DAY }),
    trade({ accountId: 'other', status: 'WIN', rr: 10, riskAmount: 100 }), // başka hesap: sayılmaz
    trade({ status: 'WIN', rr: 10, riskAmount: 100 }), // hesapsız: sayılmaz
  ];
  const m = computeAccountMetrics(acc, trades);
  assert.equal(m.tradeCount, 2);
  assert.equal(m.balance, 10200);
  assert.equal(m.netPnl, 200);
  assert.equal(m.target, 1000);
  assert.equal(m.targetRemaining, 800);
  assert.equal(m.targetReached, false);
  assert.equal(m.maxLossFloor, 9000);
  assert.equal(m.maxLossRemaining, 1200);
  assert.equal(m.maxBreached, false);
  assert.equal(m.rUnit, 100);
});

test('bakiye düzeltmesi bakiyeye ve tabana kalana yansır, R istatistiğine girmez', () => {
  const acc = account({ adjustments: [{ id: 'a1', at: NOW - DAY, amount: -350, realBalance: 9850 }] });
  const m = computeAccountMetrics(acc, [trade({ accountId: 'acc1', status: 'WIN', rr: 2, riskAmount: 100, createdAt: NOW - 2 * DAY })]);
  assert.equal(m.balance, 9850);
  assert.equal(m.adjustmentsTotal, -350);
  assert.equal(m.tradeCount, 1);
});

test('statik DD aşımı geçmişte olduysa işaretlenir (sonra toparlansa bile)', () => {
  const acc = account();
  const m = computeAccountMetrics(acc, [
    trade({ accountId: 'acc1', status: 'LOSS', rr: -11, riskAmount: 100, createdAt: NOW - 3 * DAY }),
    trade({ accountId: 'acc1', status: 'WIN', rr: 5, riskAmount: 100, createdAt: NOW - 2 * DAY }),
  ]);
  assert.equal(m.balance, 9400);
  assert.equal(m.maxBreached, true);
});

test('trailing DD: taban zirveyi izler ama başlangıç bakiyesini geçmez', () => {
  const acc = account({ drawdownMode: 'TRAILING' });
  const up = computeAccountMetrics(acc, [
    trade({ accountId: 'acc1', status: 'WIN', rr: 5, riskAmount: 100, createdAt: NOW - 3 * DAY }),
    trade({ accountId: 'acc1', status: 'LOSS', rr: -2, riskAmount: 100, createdAt: NOW - 2 * DAY }),
  ]);
  assert.equal(up.peak, 10500);
  assert.equal(up.maxLossFloor, 9500);
  assert.equal(up.maxLossRemaining, 800);
  const high = computeAccountMetrics(acc, [trade({ accountId: 'acc1', status: 'WIN', rr: 15, riskAmount: 100 })]);
  assert.equal(high.maxLossFloor, 10000);
});

test('Funded aşamasında hedef yok; DD funded kuralından', () => {
  const acc = account({ stage: 0, fundedMaxDdPct: 5 });
  assert.deepEqual(stageRule(acc), { maxDdPct: 5 });
  const m = computeAccountMetrics(acc, []);
  assert.equal(m.target, undefined);
  assert.equal(m.targetReached, false);
  assert.equal(m.maxLossFloor, 9500);
});

test('aşama kuralı: Phase 2 kendi hedefini kullanır, tanımsız aşama son kurala düşer', () => {
  assert.deepEqual(stageRule(account({ stage: 2 })), { targetPct: 5, maxDdPct: 10 });
  assert.deepEqual(stageRule(account({ stage: 3 })), { targetPct: 5, maxDdPct: 10 });
});

test('bağsız eski işlemler yalnızca ad + başlangıç tarihi + kapanıştan önce ise hesaba sayılır', () => {
  const acc = account({ startDate: NOW - 10 * DAY, closedAt: NOW - 2 * DAY });
  assert.equal(tradeBelongsTo(trade({ status: 'WIN', rr: 1, platform: 'test 10k · phase 1', createdAt: NOW - 5 * DAY }), acc), true);
  assert.equal(tradeBelongsTo(trade({ status: 'WIN', rr: 1, platform: 'Test 10K · Phase 1', createdAt: NOW - 20 * DAY }), acc), false);
  assert.equal(tradeBelongsTo(trade({ status: 'WIN', rr: 1, platform: 'Test 10K · Phase 1', createdAt: NOW - DAY }), acc), false);
  assert.equal(tradeBelongsTo(trade({ status: 'WIN', rr: 1, platform: 'Başka', createdAt: NOW - 5 * DAY }), acc), false);
  assert.equal(tradeBelongsTo(trade({ status: 'WIN', rr: 1, accountId: 'x', platform: 'Test 10K · Phase 1', createdAt: NOW - 5 * DAY }), acc), false);
});

test('zincirler: Funded’a ulaşan başarılı, ulaşmadan biten başarısız, aktif olan devam ediyor', () => {
  const payout = { id: 'p', kind: 'PAYOUT' as const, date: '2026-10-20', amount: 300, createdAt: NOW };
  const accounts = [
    account({ id: 'a1', chainId: 'A', stage: 1, status: 'PASSED', fee: 100 }),
    account({ id: 'a2', chainId: 'A', stage: 2, status: 'PASSED' }),
    account({ id: 'a3', chainId: 'A', stage: 0, status: 'BLOWN', certificates: [payout] }),
    account({ id: 'b1', chainId: 'B', chainName: 'B', stage: 1, status: 'BLOWN', fee: 200 }),
    account({ id: 'c1', chainId: 'C', chainName: 'C', stage: 1, status: 'ACTIVE', fee: 300 }),
  ];
  const chains = groupChains(accounts);
  const byId = Object.fromEntries(chains.map((c) => [c.chainId, c]));
  assert.equal(byId.A.outcome, 'FUNDED');
  assert.equal(byId.B.outcome, 'FAILED');
  assert.equal(byId.C.outcome, 'ONGOING');
  assert.deepEqual(byId.A.accounts.map((a) => a.stage), [1, 2, 0]); // aşama sırası: Phase 1, Phase 2, Funded
  assert.equal(byId.A.fee, 100);
  assert.equal(byId.A.payoutTotal, 300);
  assert.equal(chains[0].chainId, 'C'); // aktif zincir önde

  const sheet = computeBalanceSheet(chains);
  assert.equal(sheet.feeTotal, 600);
  assert.equal(sheet.payoutTotal, 300);
  assert.equal(sheet.net, -300);
  assert.equal(sheet.fundedChains, 1);
  assert.equal(sheet.resolvedChains, 2);
  assert.equal(sheet.passRate, 50); // devam eden zincir orana girmez
});

test('sonuçlanan zincir yoksa geçme oranı tanımsız', () => {
  assert.equal(computeBalanceSheet(groupChains([account()])).passRate, undefined);
});

test('yedekten gelen hesaplar doğrulanır: bozuklar atılır, eski biçim çevrilir', () => {
  const out = sanitizePropAccounts([
    null,
    { name: 'kimliksiz', size: 1000 },
    { id: 'zero', size: 0 },
    { id: 'legacy', name: 'Eski Funded', size: 5000, type: 'FUNDED', maxDrawdownPct: 8, profitTargetPct: 6 },
    {
      id: 'new',
      chainName: 'Yeni',
      size: 10000,
      stage: 9,
      phaseRules: [{ targetPct: 10, maxDdPct: 10 }, { targetPct: 5, maxDdPct: 0 }],
      riskPct: -1,
      status: 'WHATEVER',
      images: ['data:image/png;base64,AA', 'javascript:alert(1)', 'https://x/y.png'],
      certificates: [{ kind: 'PAYOUT', amount: 250, date: '2026-10-01' }, { kind: 'BAD' }],
      adjustments: [{ amount: 'x' }, { amount: -50, at: 1 }],
    },
  ]);
  assert.deepEqual(out.map((a) => a.id), ['legacy', 'new']);
  const legacy = out[0];
  assert.equal(legacy.stage, 0);
  assert.equal(legacy.name, 'Eski Funded'); // eski ad korunur (işlemler bu adla bağlı olabilir)
  assert.deepEqual(legacy.phaseRules, [{ targetPct: 6, maxDdPct: 8 }]);
  const n = out[1];
  assert.equal(n.phaseRules.length, 1); // DD'si 0 olan kural atılır
  assert.equal(n.stage, 1); // aşama kural sayısına kısılır
  assert.equal(n.riskPct, 1); // geçersiz risk → varsayılan %1
  assert.equal(n.status, 'ACTIVE');
  assert.equal(n.name, 'Yeni · Phase 1');
  assert.deepEqual(n.images, ['data:image/png;base64,AA', 'https://x/y.png']);
  assert.equal(n.certificates?.length, 1);
  assert.equal(n.certificates?.[0].amount, 250);
  assert.equal(n.adjustments?.length, 1);
  assert.deepEqual(sanitizePropAccounts('bozuk'), []);
});
