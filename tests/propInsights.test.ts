import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccountRInsights } from '../src/lib/propInsights';
import { NOW, DAY, trade, account } from './fixtures';

const linked = (status: 'WIN' | 'LOSS' | 'BREAKEVEN', rr: number, i: number, riskAmount?: number) =>
  trade({ status, rr, accountId: 'acc1', createdAt: NOW - (40 - i) * DAY / 2, riskAmount });

test('R özeti: kazanma oranı, beklenti, ortalama kazanç/kayıp', () => {
  const acc = account();
  const ts = [linked('WIN', 2, 1), linked('LOSS', -1, 2), linked('WIN', 3, 3), linked('BREAKEVEN', 0, 4)];
  const r = computeAccountRInsights(acc, ts);
  assert.equal(r.tradeCount, 4);
  assert.equal(r.wins, 2);
  assert.equal(r.losses, 1);
  assert.equal(r.winRate, 50);
  assert.equal(r.netR, 4);
  assert.equal(r.expectancy, 1);
  assert.equal(r.avgWinR, 2.5);
  assert.equal(r.avgLossR, 1);
});

test('kurallara kalan mesafe R cinsinden; kayıp ve kazanç sayısı', () => {
  const acc = account(); // 10K, %10 hedef, %10 DD, 1R = 100$
  const ts = [linked('WIN', 2, 1), linked('LOSS', -1, 2)]; // net +100$
  const r = computeAccountRInsights(acc, ts);
  assert.equal(r.riskPerTrade, 100);
  assert.equal(r.ddRemainingR, 11);      // bakiye 10100, taban 9000
  assert.equal(r.targetRemainingR, 9);   // 1000 − 100
  assert.equal(r.lossesToBreach, 11);
  assert.equal(r.winsToTarget, 5);       // 9 / 2 → 5
});

test('risk tutarı girilmişse 1R = hesaptaki medyan risk', () => {
  const acc = account();
  const ts = [linked('LOSS', -1, 1, 50), linked('LOSS', -1, 2, 50), linked('WIN', 1, 3, 200)];
  const r = computeAccountRInsights(acc, ts);
  assert.equal(r.riskPerTrade, 50);
});

test('örneklem azsa simülasyon yok; yeterliyse tohumla tekrarlanabilir', () => {
  const acc = account();
  const few = [linked('WIN', 2, 1), linked('LOSS', -1, 2)];
  assert.equal(computeAccountRInsights(acc, few).simulation, undefined);

  const many = Array.from({ length: 20 }, (_, i) => (i % 2 ? linked('WIN', 1.5, i) : linked('LOSS', -1, i))); // net +5R
  const a = computeAccountRInsights(acc, many, { runs: 500 });
  const b = computeAccountRInsights(acc, many, { runs: 500 });
  assert.ok(a.simulation);
  assert.equal(a.simulation!.kind, 'PASS');
  assert.equal(a.simulation!.sampleSource, 'ACCOUNT');
  assert.equal(a.simulation!.probability, b.simulation!.probability);
  assert.ok(a.simulation!.probability > 50, 'pozitif beklentide geçme olasılığı yüksek olmalı');
});

test('negatif beklentide geçme olasılığı düşük; funded hesapta ayakta kalma ölçülür', () => {
  const losing = Array.from({ length: 20 }, (_, i) => (i % 3 === 0 ? linked('WIN', 1, i) : linked('LOSS', -1, i))); // net −6R
  const pass = computeAccountRInsights(account(), losing, { runs: 500 });
  assert.ok(pass.simulation && pass.simulation.probability < 10);

  const funded = computeAccountRInsights(account({ stage: 0 }), losing, { runs: 500 });
  assert.equal(funded.targetRemainingR, undefined);
  assert.equal(funded.simulation?.kind, 'SURVIVE');
  assert.equal(funded.simulation?.horizon, 20);
});

test('sınır aşılmış ya da hesap kapalıysa simülasyon yapılmaz', () => {
  const many = Array.from({ length: 24 }, (_, i) => linked('LOSS', -1, i));
  assert.equal(computeAccountRInsights(account(), many).simulation, undefined); // 24R kayıp > %10 DD
  const ok = Array.from({ length: 24 }, (_, i) => (i % 2 ? linked('WIN', 2, i) : linked('LOSS', -1, i)));
  assert.equal(computeAccountRInsights(account({ status: 'BLOWN' }), ok).simulation, undefined);
});
