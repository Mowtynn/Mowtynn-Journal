import { Trade } from '../src/types';

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
