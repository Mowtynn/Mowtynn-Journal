import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNyParts } from '../src/lib/tradingTime';

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
const W: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const intl = (ts: number) => {
  const p = fmt.formatToParts(new Date(ts));
  const g = (k: string) => p.find((x) => x.type === k)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) % 24, minute: Number(g('minute')), weekday: W[g('weekday')] };
};

test('NY saat dönüşümü (hızlı yol) Intl ile birebir aynı: rastgele anlar ve yaz saati geçişleri', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const samples: number[] = [];
  for (let i = 0; i < 20000; i++) samples.push(Date.UTC(2007, 0, 1) + Math.floor(rnd() * 30 * 365.25 * 86400000));
  // Geçiş anlarının hemen öncesi / sonrası (dakika hassasiyetinde)
  for (let y = 2007; y <= 2036; y++) {
    for (const [m, d0] of [[2, 1], [10, 1]] as const) {
      for (let d = d0; d < d0 + 14; d++) for (let h = 5; h <= 8; h++) for (const min of [0, 59]) samples.push(Date.UTC(y, m, d, h, min));
    }
  }
  for (const ts of samples) assert.deepEqual(getNyParts(ts), intl(ts), new Date(ts).toISOString());
});
