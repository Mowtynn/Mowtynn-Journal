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
    riskPct: 0.5, riskAmount: 50, stopPips: 10, tpPips: 30, maePips: 4, mfePips: 28, asiaRangePips: 18,
    asiaRange: 'Trend', sweepTime: '02:15', planFidelity: 'A+', trend: 'Continuation', newsDay: false, asiaRangeFvg: 'Var',
    session: 'London', htfTimeframe: '1H', timeframe: '5M', confirmations: ['FVG', 'OB'], entryModels: ['Breaker'],
    tpTargets: ['PDH / PDL'], premiumDiscount: 'Discount', quickEntry: true,
    notes: 'satır 1\nsatır 2', screenshot: 'https://www.tradingview.com/x/abc/',
  });
  const row = prepareTradeExportRows([t])[0] as Record<string, unknown>;
  const values = Object.values(row).map(String);
  for (const expected of ['XAUUSD', 'SHORT', 'WIN', '2.5', 'FTMO 10K · Phase 1', 'acc1', '0.5', '50', '10', '30', '4', '28', '18',
    'Trend', '02:15', 'A+', 'Continuation', 'Var', 'London', '1H', '5M', 'FVG, OB', 'Breaker', 'PDH / PDL', 'Discount',
    'satır 1\nsatır 2', 'https://www.tradingview.com/x/abc/', '19.10.2026', '09:30']) {
    assert.ok(values.includes(expected), `eksik: ${expected}`);
  }
  assert.equal(row['Süre'], '1 sa 15 dk');
  assert.match(String(row['Hızlı Kayıt']), /Evet/);
  // kullanıcının başlıkları sütun adı olur
  const titled = prepareTradeExportRows([t], { confirmations: 'PD Dizisi' })[0] as Record<string, unknown>;
  assert.equal(titled['PD Dizisi'], 'FVG, OB');
  assert.ok(!Object.keys(row).some((k) => /NY/.test(k)), 'sütun adlarında NY etiketi yok');
});

test('Excel hücre sınırı: çok uzun metin kısaltılır', () => {
  assert.equal(fitCell('abc'), 'abc');
  assert.ok(fitCell('x'.repeat(40000)).endsWith('(kısaltıldı)'));
});

test('dışa aktarım: aynı başlık verilen iki alan birbirini ezmez', () => {
  const t = trade({ id: 'x', status: 'WIN', rr: 1, htfTimeframe: '1H', timeframe: '5M' });
  const row = prepareTradeExportRows([t], { htfTimeframes: 'Timeframe', timeframes: 'Timeframe' })[0] as Record<string, unknown>;
  const vals = Object.values(row);
  assert.ok(vals.includes('1H') && vals.includes('5M'), 'iki timeframe de var');
  const clash = prepareTradeExportRows([t], { assets: 'Saat' })[0] as Record<string, unknown>;
  assert.ok(Object.values(clash).includes(t.asset) && typeof clash['Saat'] === 'string' && /\d{2}:\d{2}/.test(String(clash['Saat'])));
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
