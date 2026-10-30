import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccountRInsights, MAX_BUST_PCT } from '../src/lib/propInsights';
import { NOW, trade } from './fixtures';
import type { PropAccount } from '../src/types';

const acc = (p: Partial<PropAccount> = {}): PropAccount => ({
  id: 'a1', chainId: 'a1', chainName: 'Test 100K', name: 'Test 100K · Phase 1', size: 100000, drawdownMode: 'STATIC',
  stage: 1, phaseRules: [{ targetPct: 10, maxDdPct: 10 }], fundedMaxDdPct: 10, riskPct: 1, status: 'ACTIVE', createdAt: NOW - 1e9, ...p,
});

test('prop risk önerisi: seviyeler karşılaştırılır, öneri yakma eşiğini aşmaz; günlük limit yakmayı artırır', () => {
  const a = acc();
  const trades = Array.from({ length: 30 }, (_, i) =>
    trade({ id: `t${i}`, status: i % 3 === 0 ? 'LOSS' : 'WIN', rr: i % 3 === 0 ? -1 : 2, createdAt: NOW - (40 - i) * 3600000, accountId: 'a1', accountStage: 1, accountCategory: 'CHALLENGE', riskPct: 0.1, riskAmount: 100 }),
  );
  const ins = computeAccountRInsights(a, trades, { runs: 400 });
  assert.ok(ins.riskAdvice);
  assert.equal(ins.riskAdvice!.levels.length, 6);
  const rec = ins.riskAdvice!.levels.find((l) => l.pct === ins.riskAdvice!.recommendedPct);
  assert.ok(rec && rec.bustProbability <= MAX_BUST_PCT);
  const withDaily = computeAccountRInsights(acc({ dailyLossPct: 1 }), trades, { runs: 400 });
  const lvl = (x: typeof ins, pct: number) => x.riskAdvice!.levels.find((l) => l.pct === pct)!;
  assert.ok(lvl(withDaily, 2).bustProbability >= lvl(ins, 2).bustProbability);
  assert.ok(withDaily.dailyLimitApplied);
});
