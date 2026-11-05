import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRiskPresets, parseRiskPreset, DEFAULT_RISK_PRESETS, MAX_RISK_PRESETS } from '../src/constants/constants';

test('risk yüzdesi: virgül ve % kabul edilir, 0–10 dışı reddedilir', () => {
  assert.equal(parseRiskPreset('0,5'), 0.5);
  assert.equal(parseRiskPreset('%1'), 1);
  assert.equal(parseRiskPreset(0.755), 0.76);
  assert.equal(parseRiskPreset('0'), null);
  assert.equal(parseRiskPreset('11'), null);
  assert.equal(parseRiskPreset('abc'), null);
});

test('risk listesi: geçersiz ve tekrar eden atılır, sıra korunur, en fazla 5; liste değilse varsayılan', () => {
  assert.deepEqual(normalizeRiskPresets(['1', '0.5', '1.0', 'x', '0,25']), ['1', '0.5', '0.25']);
  assert.equal(normalizeRiskPresets(['0.1', '0.2', '0.3', '0.4', '0.5', '0.6']).length, MAX_RISK_PRESETS);
  assert.deepEqual(normalizeRiskPresets(undefined), DEFAULT_RISK_PRESETS);
  assert.deepEqual(normalizeRiskPresets([]), []);
});
