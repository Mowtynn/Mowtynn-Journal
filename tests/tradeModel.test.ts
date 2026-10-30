import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrade, normalizeTrades, isValidTrade, canonicalAssetList } from '../src/lib/tradeModel';
import { trade } from './fixtures';

test('dolar sonucu (pnl) kayıttan düşer', () => {
  const t = normalizeTrade({ id: '1', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 2, pnl: 500, notes: '', screenshot: null, createdAt: 1 } as any);
  assert.equal('pnl' in t, false);
  assert.equal(t.rr, 2);
});

test('BE her zaman 0R', () => {
  const t = normalizeTrade({ id: '1', status: 'BREAKEVEN', rr: 0.4 } as any);
  assert.equal(t.rr, 0);
});

test('R metin/bozuk gelirse sayıya çevrilir', () => {
  assert.equal(normalizeTrade({ id: '1', status: 'WIN', rr: '2.5' } as any).rr, 2.5);
  assert.equal(normalizeTrade({ id: '1', status: 'WIN', rr: 'abc' } as any).rr, 0);
  assert.equal(normalizeTrade({ id: '1', status: 'WIN', rr: Infinity } as any).rr, 0);
});

test('eski "entry" metni Entry Model dizisine çevrilir, eski alanlar silinir', () => {
  const t = normalizeTrade({ id: '1', status: 'WIN', rr: 1, entry: 'Breaker, MSS ,', htfBias: 'Bull', spreadPips: 1, liquiditySweep: 'x' } as any) as any;
  assert.deepEqual(t.entryModels, ['Breaker', 'MSS']);
  for (const k of ['entry', 'htfBias', 'spreadPips', 'liquiditySweep']) assert.equal(k in t, false, k);
});

test('listeler temizlenir: boşluk kırpılır, büyük/küçük harf tekrarı atılır, boş liste silinir', () => {
  const t = normalizeTrade({ id: '1', status: 'WIN', rr: 1, confirmations: [' FVG', 'fvg', 'OB', 3, ''], tpTargets: [] } as any) as any;
  assert.deepEqual(t.confirmations, ['FVG', 'OB']);
  assert.equal('tpTargets' in t, false);
});

test('News Day yalnızca true/false olarak tutulur', () => {
  assert.equal('newsDay' in normalizeTrade({ id: '1', status: 'WIN', rr: 1, newsDay: 'Var' } as any), false);
  assert.equal(normalizeTrade({ id: '1', status: 'WIN', rr: 1, newsDay: false } as any).newsDay, false);
});

test('liste normalizasyonu bozuk öğeleri atar', () => {
  assert.equal(normalizeTrades([null, 5, { id: 'a', status: 'WIN', rr: 1 }]).length, 1);
  assert.deepEqual(normalizeTrades('x'), []);
});

test('çıkış anı: sonlu ve girişten sonra olmalı, değilse düşer', () => {
  const ok = normalizeTrade({ id: 'x', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 1, notes: '', screenshot: null, createdAt: 1000, exitAt: 5000 });
  assert.equal(ok.exitAt, 5000);
  const before = normalizeTrade({ id: 'y', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 1, notes: '', screenshot: null, createdAt: 5000, exitAt: 1000 });
  assert.equal('exitAt' in before, false);
  const bad = normalizeTrade({ id: 'z', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 1, notes: '', screenshot: null, createdAt: 5000, exitAt: 'x' as any });
  assert.equal('exitAt' in bad, false);
});

test('buluta yazılabilir işlem: kurallardaki zorunlu alanlar; biçim onarımı', () => {
  const ok = normalizeTrade({ id: 't1', asset: ' EURUSD ', type: 'long', status: 'win', rr: '2', createdAt: '1792624020000', notes: '', screenshot: null } as any);
  assert.equal(ok.asset, 'EURUSD');
  assert.equal(ok.type, 'LONG');
  assert.equal(ok.status, 'WIN');
  assert.equal(ok.createdAt, 1792624020000);
  assert.equal(isValidTrade(ok), true);
  assert.equal(isValidTrade(normalizeTrade({ id: 't2', asset: '', type: 'LONG', status: 'WIN', rr: 1, createdAt: 1 } as any)), false);
  assert.equal(isValidTrade(normalizeTrade({ id: 't3', asset: 'X', type: 'LONG', status: 'OPEN', rr: 1, createdAt: 1 } as any)), false);
  assert.equal(isValidTrade(normalizeTrade({ id: 't4', asset: 'X', type: 'LONG', status: 'WIN', rr: 1 } as any)), false);
});

test('parite tek biçim: EUR/USD, eur-usd, "EUR USD" → EURUSD; liste tekilleşir', () => {
  assert.equal(normalizeTrade({ id: 'a', asset: 'EUR/USD', type: 'LONG', status: 'WIN', rr: 1, createdAt: 1 } as any).asset, 'EURUSD');
  assert.equal(normalizeTrade({ id: 'b', asset: ' eur-usd ', type: 'LONG', status: 'WIN', rr: 1, createdAt: 1 } as any).asset, 'EURUSD');
  assert.deepEqual(canonicalAssetList(['EUR/USD', 'EURUSD', 'xau/usd', 'XAUUSD', '', 'NQ100']), ['EURUSD', 'XAUUSD', 'NQ100']);
});

test('grafik linki: yalnızca http(s) ya da gömülü görsel; tehlikeli şema düşer, şemasız link tamamlanır', async () => {
  const { normalizeTrade: n } = await import('../src/lib/tradeModel');
  const base = { id: 'x', asset: 'EURUSD', type: 'LONG', status: 'WIN', rr: 1, notes: '', createdAt: 1 } as any;
  assert.equal(n({ ...base, screenshot: 'javascript:alert(1)' }).screenshot, null);
  assert.equal(n({ ...base, screenshot: '  https://www.tradingview.com/x/abc/ ' }).screenshot, 'https://www.tradingview.com/x/abc/');
  assert.equal(n({ ...base, screenshot: 'www.tradingview.com/x/abc/' }).screenshot, 'https://www.tradingview.com/x/abc/');
  assert.equal(n({ ...base, screenshot: 'data:image/png;base64,AAA' }).screenshot, 'data:image/png;base64,AAA');
  assert.equal(n({ ...base, screenshot: '' }).screenshot, null);
});

test('görsel referansı (fsimg:) kabul edilir; bozuk referans düşer', () => {
  assert.equal(normalizeTrade({ ...trade({ id: 'g', status: 'WIN', rr: 1 }), screenshot: 'fsimg:img_abc_123' } as any).screenshot, 'fsimg:img_abc_123');
  assert.equal(normalizeTrade({ ...trade({ id: 'h', status: 'WIN', rr: 1 }), screenshot: 'fsimg:../x y' } as any).screenshot, null);
});
