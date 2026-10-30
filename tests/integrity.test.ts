import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingFields, logicProblem } from '../src/lib/integrity';
import { trade } from './fixtures';

const complete = {
  stopPips: 10, tpPips: 30, maePips: 3, mfePips: 35, asiaRangePips: 20,
  asiaRange: 'Sweept' as const, trend: 'Continuation', newsDay: false, entryModels: ['Breaker'],
};

test('tam kayıtta eksik yok', () => {
  assert.deepEqual(missingFields(trade({ status: 'WIN', rr: 2, accountId: 'a', riskPct: 0.5, ...complete })), []);
  assert.deepEqual(missingFields(trade({ status: 'WIN', rr: 2, accountCategory: 'DEMO', ...complete })), []);
});

test('hesap seçimi zorunlu: ne prop hesabı ne Hesapsız seçilmişse "Hesap" eksik', () => {
  assert.ok(missingFields(trade({ status: 'WIN', rr: 2, ...complete })).includes('Hesap'));
  assert.ok(missingFields(trade({ status: 'WIN', rr: 2, accountCategory: 'FUNDED', ...complete })).includes('Hesap'));
});

test('prop hesabındaki işlemde risk yüzdesi zorunlu; hesapsızda aranmaz', () => {
  assert.ok(missingFields(trade({ status: 'WIN', rr: 2, accountId: 'a', ...complete })).includes('Risk %'));
  assert.ok(!missingFields(trade({ status: 'WIN', rr: 2, accountCategory: 'DEMO', ...complete })).includes('Risk %'));
});

test('analiz alanları eksikse listelenir', () => {
  const m = missingFields(trade({ status: 'WIN', rr: 2, accountCategory: 'DEMO' }));
  for (const k of ['Stop pip', 'TP pip', 'MAE', 'MFE', 'Asia Range Pip', 'Asia Range', 'Trend', 'News Day', 'Entry model']) assert.ok(m.includes(k), k);
});

test('mantık hataları: durum ile R işareti çelişirse', () => {
  assert.equal(logicProblem(trade({ status: 'WIN', rr: -1 })), 'WIN işlemde R negatif');
  assert.equal(logicProblem(trade({ status: 'LOSS', rr: 1 })), 'LOSS işlemde R pozitif');
  assert.equal(logicProblem(trade({ status: 'BREAKEVEN', rr: 0.5 })), 'BE işlemde R sıfır değil');
  assert.equal(logicProblem(trade({ status: 'WIN', rr: 2 })), null);
  assert.equal(logicProblem(trade({ status: 'WIN', rr: 2, asset: '' })), 'Parite veya durum eksik');
});
