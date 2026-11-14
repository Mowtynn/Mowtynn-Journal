import test from 'node:test';
import assert from 'node:assert/strict';
import { fixed, signed, formatR, rnum, rsigned, formatPct, formatMoney, trPossessive, formatDateKey } from '../src/lib/format';
import { roundR, normalizeTrade } from '../src/lib/tradeModel';

test('biçim: R değeri işaretli, gereksiz sıfırsız, eksi sıfır yok', () => {
  assert.equal(formatR(1.85), '+1.85R');
  assert.equal(formatR(2), '+2R');
  assert.equal(formatR(2.1), '+2.1R');
  assert.equal(formatR(-0.5), '-0.5R');
  assert.equal(formatR(0), '0R');
  assert.equal(formatR(-0.004), '0R');
  assert.equal(formatR(0.004), '0R');
  assert.equal(formatR(0.86, 1), '+0.9R');
  assert.equal(formatR(NaN), '0R');
  assert.equal(formatR(Infinity), '0R');
  assert.equal(rnum(2.0), '2');
  assert.equal(rsigned(-1e-12), '0');
  assert.equal(signed(-1e-12), '0.00');
  assert.equal(fixed(-0.001), '0.00');
});

test('işlem R tek ondalığa yuvarlanır: 2.08 → 2.1, 2.04 → 2, yarımda sıfırdan uzağa', () => {
  assert.equal(roundR(2.08), 2.1);
  assert.equal(roundR(2.04), 2);
  assert.equal(roundR(2.05), 2.1);
  assert.equal(roundR(-1.25), -1.3);
  assert.equal(roundR(-0.04), 0);
  assert.ok(!Object.is(roundR(-0.04), -0));
  assert.equal(roundR(NaN), 0);
  // Eski kayıt: normalize sonrası hesap da görünüm de aynı sayıyı kullanır; 0'a yuvarlanan kazanç başabaş olur
  assert.equal(normalizeTrade({ id: 'a', createdAt: 1, asset: 'X', type: 'LONG', status: 'WIN', rr: 2.08 } as any).rr, 2.1);
  const be = normalizeTrade({ id: 'b', createdAt: 1, asset: 'X', type: 'LONG', status: 'WIN', rr: 0.04 } as any);
  assert.equal(be.rr, 0);
  assert.equal(be.status, 'BREAKEVEN');
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

test('biçim: tarih anahtarı diğer ekranlardaki gibi yazılır', () => {
  assert.equal(formatDateKey('2026-11-11'), '11 Kas 2026');
  assert.equal(formatDateKey('2026-01-05'), '5 Oca 2026');
  assert.equal(formatDateKey('2026-13-05'), '2026-13-05');
  assert.equal(formatDateKey('bozuk'), 'bozuk');
  assert.equal(formatDateKey(''), '');
});
