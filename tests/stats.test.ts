import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateComprehensiveStats } from '../src/lib/stats';
import { calculateProfitFactor, toRR } from '../src/lib/statMath';
import { NOW, DAY, trade } from './fixtures';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

const sample = [
  trade({ asset: 'EURUSD', status: 'WIN', rr: 3, createdAt: NOW - 1 * DAY }),
  trade({ asset: 'EURUSD', status: 'LOSS', rr: -1, createdAt: NOW - 2 * DAY }),
  trade({ asset: 'USDJPY', status: 'LOSS', rr: -2, createdAt: NOW - 3 * DAY }),
  trade({ asset: 'GBPUSD', status: 'WIN', rr: 2, createdAt: NOW - 10 * DAY }),
  trade({ asset: 'GBPUSD', status: 'LOSS', rr: -1, createdAt: NOW - 20 * DAY }),
  trade({ asset: 'XAUUSD', status: 'BREAKEVEN', rr: 0, createdAt: NOW - 40 * DAY }),
];

test('sayımlar: WIN / LOSS / BE ayrı sayılır', () => {
  const s = calculateComprehensiveStats(sample, NOW);
  assert.equal(s.totalTrades, 6);
  assert.equal(s.winningTrades, 2);
  assert.equal(s.losingTrades, 3);
  assert.equal(s.breakevenTrades, 1);
});

test('kazanma oranı BE dahil tüm işlemlere bölünür', () => {
  close(calculateComprehensiveStats(sample, NOW).winRate, (2 / 6) * 100);
});

test('Net R, ortalama kazanç/kayıp, en büyükler', () => {
  const s = calculateComprehensiveStats(sample, NOW);
  close(s.netR, 1);
  close(s.averageWinRR, 2.5);
  close(s.averageLossRR, 4 / 3); // kayıp ortalaması pozitif büyüklük olarak tutulur
  assert.equal(s.largestWinRR, 3);
  assert.equal(s.largestLossRR, 2);
});

test('profit factor = brüt kazanç R ÷ brüt kayıp R', () => {
  close(calculateComprehensiveStats(sample, NOW).profitFactorRR, 5 / 4);
});

test('beklenti = Net R ÷ tüm işlemler (BE dahil)', () => {
  close(calculateComprehensiveStats(sample, NOW).expectancyRR, 1 / 6);
});

test('son 7 / 30 gün R pencereleri "şimdi"ye göre', () => {
  const s = calculateComprehensiveStats(sample, NOW);
  close(s.weeklyR, 3 - 1 - 2);
  close(s.monthlyR, 3 - 1 - 2 + 2 - 1);
});

test('en verimli / verimsiz parite R toplamına göre', () => {
  const s = calculateComprehensiveStats(sample, NOW);
  assert.equal(s.bestAsset, 'EURUSD');
  assert.equal(s.worstAsset, 'USDJPY');
});

test('boş liste: her şey sıfır, NaN yok', () => {
  const s = calculateComprehensiveStats([], NOW);
  assert.equal(s.totalTrades, 0);
  assert.equal(s.winRate, 0);
  assert.equal(s.netR, 0);
  assert.equal(s.expectancyRR, 0);
  assert.equal(s.profitFactorRR, 0);
  assert.equal(s.bestAsset, '');
  assert.equal(s.worstAsset, '');
});

test('yalnızca BE işlemler: kazanç/kayıp yok, en iyi/kötü parite boş', () => {
  const s = calculateComprehensiveStats([trade({ status: 'BREAKEVEN', rr: 0 }), trade({ status: 'BREAKEVEN', rr: 0 })], NOW);
  assert.equal(s.breakevenTrades, 2);
  assert.equal(s.netR, 0);
  assert.equal(s.bestAsset, '');
  assert.equal(s.worstAsset, '');
});

test('profit factor sınırları: kayıp yoksa 999, kazanç yoksa 0, bozuk girdi 0', () => {
  assert.equal(calculateProfitFactor(toRR(5), toRR(0)), 999);
  assert.equal(calculateProfitFactor(toRR(0), toRR(0)), 0);
  assert.equal(calculateProfitFactor(toRR(0), toRR(3)), 0);
  assert.equal(calculateProfitFactor(toRR(NaN), toRR(3)), 0);
  assert.equal(toRR(undefined), 0);
  assert.equal(toRR(Infinity), 0);
});

test('kart ayrıntıları: parite R/işlem sayısı, dönem işlem/kazanç, brüt kazanç/kayıp', () => {
  const s = calculateComprehensiveStats([
    trade({ asset: 'EURUSD', rr: 2, status: 'WIN', createdAt: NOW - 1 * DAY }),
    trade({ asset: 'EURUSD', rr: 1, status: 'WIN', createdAt: NOW - 10 * DAY }),
    trade({ asset: 'GBPUSD', rr: -1, status: 'LOSS', createdAt: NOW - 2 * DAY }),
  ], NOW);
  assert.equal(s.bestAsset, 'EURUSD');
  assert.equal(s.bestAssetR, 3);
  assert.equal(s.bestAssetCount, 2);
  assert.equal(s.worstAssetR, -1);
  assert.equal(s.weeklyCount, 2);
  assert.equal(s.weeklyWins, 1);
  assert.equal(s.monthlyCount, 3);
  assert.equal(s.grossWinR, 3);
  assert.equal(s.grossLossR, 1);
});
