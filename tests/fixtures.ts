import { PropAccount, Trade } from '../src/types';

/** Testlerde sabit "şimdi": 22 Ekim 2026 12:00 UTC */
export const NOW = Date.UTC(2026, 9, 22, 12, 0, 0);
export const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
/** Zorunlu alanları dolduran işlem üreticisi */
export function trade(p: Partial<Trade> & Pick<Trade, 'status' | 'rr'>): Trade {
  seq += 1;
  return {
    id: `t${seq}`,
    asset: 'EURUSD',
    type: 'LONG',
    notes: '',
    screenshot: null,
    createdAt: NOW - DAY,
    ...p,
  };
}

export function account(p: Partial<PropAccount> = {}): PropAccount {
  return {
    id: 'acc1',
    chainId: 'chain1',
    chainName: 'Test 10K',
    name: 'Test 10K · Phase 1',
    size: 10000,
    drawdownMode: 'STATIC',
    stage: 1,
    phaseRules: [
      { targetPct: 10, maxDdPct: 10 },
      { targetPct: 5, maxDdPct: 10 },
    ],
    fundedMaxDdPct: 10,
    riskPct: 1,
    status: 'ACTIVE',
    createdAt: NOW - 30 * DAY,
    ...p,
  };
}
