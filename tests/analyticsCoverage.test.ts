import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCoverage } from '../src/lib/asiaAnalytics';
import { dimensionValue } from '../src/lib/setupScorecard';
import { NOW, DAY, trade } from './fixtures';
import type { Trade } from '../src/types';

const t = (rr: number, p: Partial<Trade> = {}, i = 0) =>
  trade({ status: rr > 0 ? 'WIN' : rr < 0 ? 'LOSS' : 'BREAKEVEN', rr, createdAt: NOW - (100 - i) * DAY, ...p });

test('gün boyutu NY gününe göre', () => {
  // 21 Ekim 2026 Çarşamba, 08:15 NY (EDT, UTC−4) → 12:15 UTC
  const wed = t(1, { createdAt: Date.UTC(2026, 9, 21, 12, 15) });
  assert.equal(dimensionValue(wed, 'weekday'), 'Çarşamba');
});

test('veri eksiği panosu: kalan girdiler var, kaldırılanlar yok; Risk % yalnızca hesaplı işlemlerde sorulur', () => {
  const trades = [
    t(0, {}, 1),
    t(2, { accountId: 'a1', riskPct: 1 }, 2),
    t(2, { accountId: 'a1' }, 3), // hesaplı ama risk yok
    t(-1, {}, 4),
  ];
  const cov = Object.fromEntries(computeCoverage(trades).map((c) => [c.field, c]));
  for (const f of ['planFidelity', 'trend', 'newsDay', 'asiaRangeFvg', 'asiaRange', 'sweepTime', 'session', 'entryModels', 'tpTargets', 'premiumDiscount', 'riskPct']) {
    assert.ok(cov[f], `${f} panoda yok`);
  }
  for (const f of ['htfTimeframe', 'confirmations', 'timeframe', 'management', 'exitAt', 'stopPips', 'tpPips', 'afterExitTp', 'asiaRangePips']) {
    assert.ok(!cov[f], `${f} kaldırıldı ama panoda`);
  }
  assert.equal(cov.riskPct.base, 2);
  assert.equal(cov.riskPct.filled, 1);
  assert.equal(cov.riskPct.pct, 50);
});

