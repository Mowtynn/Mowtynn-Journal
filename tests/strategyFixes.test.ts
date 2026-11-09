import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStrategyAnalytics } from '../src/lib/strategyAnalytics';
import { bucketAsiaRanges } from '../src/lib/asiaAnalytics';
import { trade } from './fixtures';

const DAY = 86400000;
const D0 = Date.UTC(2026, 5, 1, 7, 0);

test('stop grupları: hepsi 10 pip altındaki stoplar paritenin kendi medyanına göre ayrışır; az verili parite sınıflanmaz', () => {
  const eu = [5, 6, 7, 7, 7, 8, 9, 6, 7, 8].map((sp, i) => trade({ id: 'e' + i, asset: 'EURUSD', stopPips: sp, status: 'WIN', rr: 2, createdAt: D0 + i * DAY }));
  const xau = [40, 45, 50].map((sp, i) => trade({ id: 'x' + i, asset: 'XAUUSD', stopPips: sp, status: 'LOSS', rr: -1, createdAt: D0 + (20 + i) * DAY }));
  const s = calculateStrategyAnalytics([...eu, ...xau]).stopSizeStats;
  const [tight, normal, wide] = s.brackets.map((b) => b.count);
  // medyan 7 pip → sıkı < 5.6, geniş > 8.75: eski sabit eşikte (< 10 pip) hepsi "Sıkı" olurdu
  assert.deepEqual([tight, normal, wide], [1, 8, 1]);
  assert.equal(tight + normal + wide, eu.length, 'XAUUSD (3 işlem) sınıflanmaz');
  assert.equal(s.unclassified, 3);
  assert.deepEqual(s.pairMedians, [{ pair: 'EURUSD', median: 7 }]);
});

test('Asia Range büyüklüğü: yeni paritenin ilk işlemleri ortak medyana göre yanlış sınıflanmaz', () => {
  const eu = [20, 22, 25, 24, 23, 21, 40].map((r, i) => trade({ id: 'e' + i, asset: 'EURUSD', status: 'WIN', rr: 1, asiaRangePips: r, createdAt: D0 + i * DAY }));
  const xau = trade({ id: 'x', asset: 'XAUUSD', status: 'WIN', rr: 1, asiaRangePips: 300, createdAt: D0 + 10 * DAY });
  const m = bucketAsiaRanges([...eu, xau]);
  assert.equal(m.has('x'), false, 'yeni paritenin ilk işlemi sınıflanmaz');
  // EURUSD: yalnızca önünde en az 5 range olan işlemler; 40 pip, önceki medyanın (22.5) 1.25 katından büyük → Geniş
  assert.deepEqual([...m.keys()].sort(), ['e5', 'e6']);
  assert.equal(m.get('e6'), 'WIDE');
  // Sonraki işlemler eski etiketi değiştirmez (girişten önce bilinen)
  const later = bucketAsiaRanges([...eu, trade({ id: 'e7', asset: 'EURUSD', status: 'WIN', rr: 1, asiaRangePips: 90, createdAt: D0 + 20 * DAY })]);
  assert.equal(later.get('e5'), m.get('e5'));
});

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

test('prop: günlük kayıp limiti aşımı ayrıca tespit edilir', async () => {
  const { computeAccountMetrics } = await import('../src/lib/propAccounts');
  const { account } = await import('./fixtures');
  const a = account({ id: 'acc1', size: 10000, riskPct: 1, dailyLossPct: 5, phaseRules: [{ targetPct: 10, maxDdPct: 10 }], stage: 1 });
  const day = (i: number, h: number) => D0 + i * DAY + h * 3600000;
  const mk = (n: number, d: number, p: string) => Array.from({ length: n }, (_, i) => trade({ id: p + i, accountId: 'acc1', status: 'LOSS', rr: -1, riskAmount: 100, createdAt: day(d, i + 1) }));
  // Her gün −400$: limit (−500$) hiçbir gün aşılmaz; toplam −800$ max DD'nin (−1000$) içinde
  const spread = computeAccountMetrics(a, [...mk(4, 0, 'a'), ...mk(4, 1, 'b')]);
  assert.equal(spread.dailyBreached, false);
  assert.equal(spread.maxBreached, false);
  // Tek günde −500$: günlük limit aşıldı, max DD aşılmadı
  const oneDay = computeAccountMetrics(a, mk(5, 0, 'c'));
  assert.equal(oneDay.dailyBreached, true);
  assert.equal(oneDay.maxBreached, false);
});

test('hedefe ulaşma süresi: %90 süre için en az 10 kazanan gerekir', async () => {
  const { computeTimeToTarget, TTT_MIN_WINNERS } = await import('../src/lib/edgeSummary');
  assert.equal(TTT_MIN_WINNERS, 10);
  const mk = (n: number) => Array.from({ length: n }, (_, i) => trade({ id: 'w' + i, status: 'WIN', rr: 2, createdAt: D0 + i * DAY, exitAt: D0 + i * DAY + (30 + i) * 60000 }));
  assert.equal(computeTimeToTarget(mk(9)).overall, null);
  assert.equal(computeTimeToTarget(mk(10)).overall?.winners, 10);
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

test('prop: kart ve canlı özet aynı 1R birimini kullanır (işlemlerdeki risk medyanı)', async () => {
  const { computeAccountMetrics } = await import('../src/lib/propAccounts');
  const { computeAccountRInsights } = await import('../src/lib/propInsights');
  const { account } = await import('./fixtures');
  const a = account({ id: 'acc1', size: 10000, riskPct: 1 });
  const list = [1, 2, 3].map((i) => trade({ id: 'q' + i, accountId: 'acc1', status: 'LOSS', rr: -1, riskAmount: 50, createdAt: D0 + i * DAY }));
  assert.equal(computeAccountMetrics(a, list).rUnit, 50);
  assert.equal(computeAccountRInsights(a, list).riskPerTrade, 50);
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
