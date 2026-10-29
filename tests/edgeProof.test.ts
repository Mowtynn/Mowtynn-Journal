import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeFromR } from '../src/lib/asiaAnalytics';

test('edge kanıtı: alt sınır sıfırın altındaysa en az 1 işlem daha gerekir; kanıtlanmışsa 0', () => {
  const weak = edgeFromR([2.5, 4, 2, -1, 3, -1, 0, 2.5, 2, -1]);
  assert.ok(weak.expLo <= 0);
  assert.ok((weak.tradesNeeded ?? 0) >= 1);
  const strong = edgeFromR([2, 2, 2, -1, 2, 2, 2, 2, -1, 2, 2, 2]);
  assert.ok(strong.expLo > 0);
  assert.equal(strong.tradesNeeded, 0);
  assert.equal(edgeFromR([-1, -1, 1]).tradesNeeded, null);
});
