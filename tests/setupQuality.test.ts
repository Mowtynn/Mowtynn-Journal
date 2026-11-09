import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupQualityTier, isLowQualitySetup } from '../src/lib/setupQuality';

test('düşük kalite tek tanımdan', () => {
  assert.equal(isLowQualitySetup('B-C'), true);
  assert.equal(isLowQualitySetup('FOMO'), true);
  assert.equal(isLowQualitySetup('A'), false);
  assert.equal(isLowQualitySetup(undefined), false);
});

test('setup kalitesi kademesi tek kaynaktan: A+ yüksek, A orta, B-C/B/FOMO düşük', async () => {
  assert.equal(setupQualityTier('A+'), 'high');
  assert.equal(setupQualityTier('A'), 'mid');
  assert.equal(setupQualityTier('B-C'), 'low');
  assert.equal(setupQualityTier('B'), 'low');
  assert.equal(setupQualityTier('FOMO'), 'low');
  assert.equal(setupQualityTier(''), null);
  // Düşük kademe tek tanımdan
  for (const v of ['A+', 'A', 'B-C', 'B', 'C', 'FOMO', 'Kısmen']) {
    assert.equal(setupQualityTier(v) === 'low', isLowQualitySetup(v));
  }
});
