import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { trade } from './fixtures';

const DAY = 86400000;
const D0 = Date.UTC(2026, 5, 1, 7, 0);

test('tilt: "kayıp sonrası" yalnızca aynı NY günündeki sonraki işlem; ertesi günün işlemi sayılmaz', () => {
  // Her gün tek işlem: önceki gün kaybetmek tilt sayılmaz
  const daily = Array.from({ length: 40 }, (_, i) => trade({ id: 'd' + i, status: i % 2 ? 'LOSS' : 'WIN', rr: i % 2 ? -1 : 2, createdAt: D0 + i * DAY }));
  const a = calculateStrategyAnalytics(daily).streakStats;
  assert.equal(a.postLossTotal, 0);
  assert.equal(a.postWinTotal, 0);
  assert.equal(a.postLossTiltRisk, 'DÜŞÜK');
  assert.equal(a.maxLossStreak, 1, 'seri tüm geçmişten sayılır');
  // Aynı gün: kayıp → ikinci işlem
  const sameDay = Array.from({ length: 10 }, (_, i) => [
    trade({ id: 's' + i + 'a', status: 'LOSS', rr: -1, createdAt: D0 + i * DAY }),
    trade({ id: 's' + i + 'b', status: i < 3 ? 'WIN' : 'LOSS', rr: i < 3 ? 2 : -1, createdAt: D0 + i * DAY + 3600000 }),
  ]).flat();
  const b = calculateStrategyAnalytics(sameDay).streakStats;
  assert.equal(b.postLossTotal, 10);
  assert.equal(b.postLossWinRate, 30);
  assert.equal(b.postLossAvgR, -0.1);
  assert.equal(b.firstTradeAvgR, -1);
});

test('güven aralığı: aynı sonuçlu birkaç işlem (5 × −1R) "kesin sızıntı" sayılmaz; uzun seri sayılır', async () => {
  const { edgeFromR } = await import('../src/lib/asiaAnalytics');
  const { signalStrength } = await import('../src/lib/setupScorecard');
  const five = edgeFromR([-1, -1, -1, -1, -1]);
  assert.equal(signalStrength(five), 'EARLY');
  assert.equal(five.sd, 0, 'gösterilen sapma değişmez');
  const twelve = edgeFromR(Array(12).fill(-1));
  assert.equal(signalStrength(twelve), 'CONFIRMED');
});

test('güven aralığı: neredeyse aynı 5 kayıp (−0.95 dahil) da "kesin" sayılmaz', async () => {
  const { edgeFromR } = await import('../src/lib/asiaAnalytics');
  const { signalStrength } = await import('../src/lib/setupScorecard');
  assert.equal(signalStrength(edgeFromR([-1, -1, -1, -1, -0.95])), 'EARLY');
});

test('Edge Özeti: kârlı sistemde "daha çok yap" geri kalandan iyi olanlar; AL kuralı ortalamanın altındaki gruptan çıkmaz', async () => {
  const { computeEdgeSummary } = await import('../src/lib/edgeSummary');
  // EURUSD: 60 işlem +0.5R ort. · GBPUSD: 40 işlem +1.4R ort. (genel ~+0.86R)
  const eu = Array.from({ length: 60 }, (_, i) => trade({ id: 'e' + i, asset: 'EURUSD', status: i % 2 ? 'WIN' : 'LOSS', rr: i % 2 ? 2 : -1, createdAt: D0 + i * DAY }));
  const gb = Array.from({ length: 40 }, (_, i) => trade({ id: 'g' + i, asset: 'GBPUSD', status: i % 5 ? 'WIN' : 'LOSS', rr: i % 5 ? 2 : -1, createdAt: D0 + (100 + i) * DAY }));
  const s = computeEdgeSummary([...eu, ...gb]);
  assert.ok(!s.strengths.some((x) => x.dimension === 'asset' && x.value === 'EURUSD'), 'ortalamanın altındaki parite daha çok yap listesinde değil');
  assert.ok(s.strengths.some((x) => x.dimension === 'asset' && x.value === 'GBPUSD'));
  assert.ok(!s.rules.some((r) => r.kind === 'TAKE' && r.title === 'Parite: EURUSD'));
});

test('Tesadüf Testi: ALMA bulgusu da ikinci yarının geri kalanıyla kıyaslanır (zararlı tabanda kendiliğinden "Tuttu" olmaz)', async () => {
  const { validateOutOfSample } = await import('../src/lib/edgeSummary');
  // Bilgi taşımayan alanlarla zararlı bir taban: her işlem −0.3R civarı
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const list = Array.from({ length: 200 }, (_, i) => {
    const win = rnd() < 0.25;
    return trade({ id: 'z' + i, asset: rnd() < 0.5 ? 'EURUSD' : 'GBPUSD', type: rnd() < 0.5 ? 'LONG' : 'SHORT', planFidelity: ['A+', 'A', 'B-C'][Math.floor(rnd() * 3)], status: win ? 'WIN' : 'LOSS', rr: win ? 1.8 : -1, createdAt: D0 + i * DAY });
  });
  const r = validateOutOfSample(list);
  const avoid = r.findings.filter((f) => f.kind === 'AVOID' && f.status !== 'UNTESTED');
  const held = avoid.filter((f) => f.status === 'HELD').length;
  assert.ok(avoid.length === 0 || held / avoid.length < 0.8, `ALMA tutma oranı şişmemeli (${held}/${avoid.length})`);
});
