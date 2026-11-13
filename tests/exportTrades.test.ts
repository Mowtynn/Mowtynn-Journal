import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareTradeExportRows, fitCell, csvCell, rowsToCsv, tradeSummaryRows, prepareJournalExportRows } from '../src/utils/exportTrades';
import { nyInputToTs } from '../src/lib/tradingTime';
import { trade } from './fixtures';

test('dışa aktarım: formdaki her girdi bir sütunda, değerler eksiksiz', () => {
  const t = trade({
    id: 'full', status: 'WIN', rr: 2.5, type: 'SHORT', asset: 'XAUUSD',
    createdAt: nyInputToTs('2026-10-19T09:30')!, exitAt: nyInputToTs('2026-10-19T10:45')!,
    platform: 'FTMO 10K · Phase 1', accountId: 'acc1', accountCategory: 'CHALLENGE', accountStage: 1,
    riskPct: 0.5, riskAmount: 50, stopPips: 10, tpPips: 30, asiaRangePips: 18,
    asiaRange: 'Trend', sweepTime: '02:15', planFidelity: 'A+', trend: 'Continuation', newsDay: false, asiaRangeFvg: 'Var',
    session: 'London', htfTimeframe: '1H', timeframe: '5M', confirmations: ['FVG', 'OB'], entryModels: ['Breaker'],
    tpTargets: ['PDH / PDL'], premiumDiscount: 'Discount', quickEntry: true,
    notes: 'satır 1\nsatır 2', screenshot: 'https://www.tradingview.com/x/abc/',
  });
  const row = prepareTradeExportRows([t])[0] as Record<string, unknown>;
  const values = Object.values(row).map(String);
  for (const expected of ['XAUUSD', 'SHORT', 'WIN', '2.5', 'FTMO 10K · Phase 1', 'acc1', '0.5', '50', '18',
    'Trend', '02:15', 'A+', 'Continuation', 'Var', 'London', 'Breaker', 'PDH / PDL', 'Discount',
    'satır 1\nsatır 2', 'https://www.tradingview.com/x/abc/', '19.10.2026']) {
    assert.ok(values.includes(expected), `eksik: ${expected}`);
  }
  // kaldırılan girdiler (saat, çıkış, süre, timeframe'ler, PD Array, stop / TP pip, işlem yönetimi) sütun değildir
  for (const gone of ['Saat', 'Çıkış', 'Süre', 'Giriş Saati (saatlik)', 'Timeframe', 'Entry Timeframe', 'PD Array', 'Stop Pip', 'TP Pip', 'İşlem Yönetimi', 'Planlanan R:R', 'Kaçırılan R']) {
    assert.ok(!(gone in row), `sütun kaldırılmalıydı: ${gone}`);
  }
  assert.ok(!values.includes('09:30') && !values.includes('FVG, OB') && !values.includes('1H'));
  assert.match(String(row['Hızlı Kayıt']), /Evet/);
  // kullanıcının başlıkları sütun adı olur
  const titled = prepareTradeExportRows([t], { sessions: 'Seans' })[0] as Record<string, unknown>;
  assert.equal(titled['Seans'], 'London');
  assert.ok(!Object.keys(row).some((k) => /NY/.test(k)), 'sütun adlarında NY etiketi yok');
});

test('Excel hücre sınırı: çok uzun metin kısaltılır', () => {
  assert.equal(fitCell('abc'), 'abc');
  assert.ok(fitCell('x'.repeat(40000)).endsWith('(kısaltıldı)'));
});

test('dışa aktarım: aynı başlık verilen iki alan birbirini ezmez', () => {
  const t = trade({ id: 'x', status: 'WIN', rr: 1, session: 'London', trend: 'Reversal' });
  const row = prepareTradeExportRows([t], { sessions: 'Bağlam', trendTypes: 'Bağlam' })[0] as Record<string, unknown>;
  const vals = Object.values(row);
  assert.ok(vals.includes('London') && vals.includes('Reversal'), 'iki alan da var');
  const clash = prepareTradeExportRows([t], { assets: 'Gün' })[0] as Record<string, unknown>;
  assert.ok(Object.values(clash).includes(t.asset) && typeof clash['Gün'] === 'string' && clash['Gün'] !== t.asset);
});

test('CSV: Türkçe Excel için ondalık virgül, formül enjeksiyonu engelli, satır sonu korunur', () => {
  assert.equal(csvCell(2.5), '"2,5"');
  assert.equal(csvCell(-1), '"-1"');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('-tehlikeli'), '"\'-tehlikeli"');
  assert.equal(csvCell('a\nb'), '"a\nb"');
  const csv = rowsToCsv([{ A: 1.5, B: 'x;y' }]);
  assert.ok(csv.startsWith('\uFEFF"A";"B"'));
  assert.ok(csv.includes('"1,5";"x;y"'));
});

test('özet sayfası: proje tanımlarıyla aynı; kayıp yoksa PF ∞', () => {
  const rows = tradeSummaryRows([trade({ id: 'a', status: 'WIN', rr: 2 }), trade({ id: 'b', status: 'BREAKEVEN', rr: 0 })]);
  const get = (m: string) => rows.find((r) => r.Metrik === m)?.Değer;
  assert.equal(get('Kazanma Oranı (%)'), 50);
  assert.equal(get('Toplam Net R'), 2);
  assert.equal(get('Kâr Faktörü (R bazlı)'), '∞');
});

test('günlük dışa aktarımı: kayıt saati yoksa 1970 saati yazılmaz', () => {
  const row = prepareJournalExportRows([{ id: 'j', date: '2026-10-19', title: '', content: '', createdAt: 0, updatedAt: 0 }])[0];
  assert.equal(row['Kayıt Saati'], '-');
  assert.equal(row['Son Güncelleme'], '-');
});

test('dışa aktarım: yeni girdiler ve türetilmiş analiz sütunları eksiksiz', async () => {
  const { prepareTradeExportRows } = await import('../src/utils/exportTrades');
  const { trade } = await import('./fixtures');
  const t = trade({
    status: 'BREAKEVEN', rr: 0, asiaRangePips: 40, asiaRange: 'Trend', sweepTime: '02:40',
    afterExitTp: true, createdAt: Date.UTC(2026, 9, 20, 7, 10),
  });
  const row = prepareTradeExportRows([t])[0] as Record<string, unknown>;
  for (const k of ['Asia Range', 'Sweep Time', "Çıkış Sonrası TP'ye Ulaştı", 'Sweep Saati (30 dk)', 'Günün İşlemi', 'Asia Range Pip']) {
    assert.ok(k in row, `sütun yok: ${k}`);
  }
  assert.equal(row['Sweep Saati (30 dk)'], '02:30–03:00');
  assert.equal(row["Çıkış Sonrası TP'ye Ulaştı"], 'Evet');
});

test('dışa aktarım: süpürülen Asia tarafı yalnızca Reversal işlemlerde, yönden', () => {
  const rows = prepareTradeExportRows([
    trade({ id: 'r1', status: 'WIN', rr: 2, type: 'SHORT', trend: 'Reversal', asiaRange: 'Range' }),
    trade({ id: 'r2', status: 'WIN', rr: 2, type: 'LONG', trend: 'Reversal' }),
    trade({ id: 'c1', status: 'WIN', rr: 2, type: 'SHORT', trend: 'Continuation', asiaRange: 'Swept' }),
    trade({ id: 'n1', status: 'WIN', rr: 2, type: 'LONG' }),
  ]) as Record<string, unknown>[];
  assert.deepEqual(rows.map((r) => r['Süpürülen Asia Tarafı']), ['High', 'Low', '-', '-']);
});
