import test from 'node:test';
import assert from 'node:assert/strict';
import { fixed, signed, formatR, formatRAbs, formatPct, formatMoney, trPossessive } from '../src/lib/format';

test('biçim: R değeri işaretli, sabit ondalık, eksi sıfır yok', () => {
  assert.equal(formatR(1.85), '+1.85R');
  assert.equal(formatR(-0.5), '-0.50R');
  assert.equal(formatR(0), '0.00R');
  assert.equal(formatR(-0.004), '0.00R');
  assert.equal(formatR(0.004), '0.00R');
  assert.equal(formatR(0.8, 1), '+0.8R');
  assert.equal(formatR(NaN), '0.00R');
  assert.equal(formatR(Infinity), '0.00R');
  assert.equal(signed(-1e-12), '0.00');
  assert.equal(fixed(-0.001), '0.00');
  assert.equal(formatRAbs(-5.5), '5.50R');
});

test('biçim: yüzde ve dolar', () => {
  assert.equal(formatPct(55.44), '%55.4');
  assert.equal(formatPct(-12.5), '-%12.5');
  assert.equal(formatPct(-0.01), '%0.0');
  assert.equal(formatMoney(55517.5), '$55,517.50');
  assert.equal(formatMoney(-540), '-$540');
  assert.equal(formatMoney(0), '$0');
  assert.equal(formatMoney(-0.001), '$0');
  assert.equal(formatMoney(NaN), '$0');
});

test('biçim: sayıdan sonra iyelik eki Türkçe okunuşa uyar', () => {
  const expected: Record<number, string> = {
    0: 'ı', 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u',
    10: 'u', 20: 'si', 30: 'u', 40: 'ı', 50: 'si', 60: 'ı', 70: 'i', 80: 'i', 90: 'ı',
    100: 'ü', 25: 'i', 92: 'si', 66: 'sı', 73: 'ü',
  };
  for (const [n, suffix] of Object.entries(expected)) assert.equal(trPossessive(Number(n)), suffix, `%${n}`);
});
