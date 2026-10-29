import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTradeAccountCategory, getTradeStageLabel, smartUpper, sanitizeDefinitionTitles } from '../src/constants/constants';

test('hesap tipi: kayıtlı tip öncelikli; yoksa hesap + aşamadan; hiçbiri yoksa Hesapsız', () => {
  assert.equal(getTradeAccountCategory({ accountCategory: 'FUNDED', accountId: 'a', accountStage: 1 }), 'FUNDED');
  assert.equal(getTradeAccountCategory({ accountId: 'a', accountStage: 0 }), 'FUNDED');
  assert.equal(getTradeAccountCategory({ accountId: 'a', accountStage: 2 }), 'CHALLENGE');
  assert.equal(getTradeAccountCategory({}), 'DEMO');
});

test('aşama etiketi: Phase N / Funded; hesapsızda yok', () => {
  assert.equal(getTradeStageLabel({ accountId: 'a', accountStage: 0 }), 'Funded');
  assert.equal(getTradeStageLabel({ accountId: 'a', accountStage: 2 }), 'Phase 2');
  assert.equal(getTradeStageLabel({ accountStage: 1 }), null);
  assert.equal(getTradeStageLabel({ accountId: 'a' }), null);
});

test('büyük harf: Türkçe kelimeler tr kuralıyla, İngilizce terimler standart', () => {
  assert.equal(smartUpper('Strateji'), 'STRATEJİ');
  assert.equal(smartUpper('Session'), 'SESSION');
  assert.equal(smartUpper('İşlem Durumu'), 'İŞLEM DURUMU');
  assert.equal(smartUpper('Entry Timeframe'), 'ENTRY TIMEFRAME');
  assert.equal(smartUpper('Strateji'), 'STRATEJİ'); // önbellekten aynı sonuç
  assert.equal(smartUpper(undefined), '');
});

test('eski başlıklar R tabanlı adlara göç eder; PnL başlığı silinir', () => {
  const t = sanitizeDefinitionTitles({ platforms: 'Platform', rr: 'R:R Oranı', financialCard: 'Finansal Sonuç', pnl: 'PNL' } as any) as any;
  assert.equal(t.platforms, 'Hesap');
  assert.equal(t.rr, 'Sonuç R');
  assert.equal(t.financialCard, 'Sonuç');
  assert.equal('pnl' in t, false);
});

test('kullanıcının kendi başlıkları korunur', () => {
  const t = sanitizeDefinitionTitles({ platforms: 'Hesaplarım', rr: 'Getiri (R)' });
  assert.equal(t.platforms, 'Hesaplarım');
  assert.equal(t.rr, 'Getiri'); // parantezli ekler temizlenir
});

test('TP Target başlığı Target olur (çıkış hedefi); özel başlık korunur', async () => {
  const { sanitizeDefinitionTitles } = await import('../src/constants/constants');
  assert.equal(sanitizeDefinitionTitles({ tpTargets: 'TP Target' }).tpTargets, 'Target');
  assert.equal(sanitizeDefinitionTitles({ tpTargets: 'tp target' }).tpTargets, 'Target');
  assert.equal(sanitizeDefinitionTitles({}).tpTargets, 'Target');
  assert.equal(sanitizeDefinitionTitles({ tpTargets: 'Likidite Hedefi' }).tpTargets, 'Likidite Hedefi');
});

test('Premium / Discount başlığı Confirmations olur; özel başlık korunur', () => {
  assert.equal(sanitizeDefinitionTitles({ premiumDiscounts: 'Premium / Discount' }).premiumDiscounts, 'Confirmations');
  assert.equal(sanitizeDefinitionTitles({}).premiumDiscounts, 'Confirmations');
  assert.equal(sanitizeDefinitionTitles({ premiumDiscounts: 'Bölge' }).premiumDiscounts, 'Bölge');
});

test('kaldırılan Entry Time başlığı kayıttan düşer', () => {
  const out = sanitizeDefinitionTitles({ entryHours: 'Entry Time' } as any) as any;
  assert.equal('entryHours' in out, false);
});

test('büyük harf: Türkçe varsayılan, bilinen İngilizce terimler I ile, kısaltmalar olduğu gibi', () => {
  assert.equal(smartUpper('Timeframe (HTF) x Entry Timeframe Sinerjisi'), 'TIMEFRAME (HTF) X ENTRY TIMEFRAME SİNERJİSİ');
  assert.equal(smartUpper('Veri Yok'), 'VERİ YOK');
  assert.equal(smartUpper('Win Rate'), 'WIN RATE');
  assert.equal(smartUpper('3. Giriş modeli'), '3. GİRİŞ MODELİ');
  assert.equal(smartUpper('NY AM'), 'NY AM');
});

test('baş harf büyük: girdiler ve tanımlar her kelimenin ilk harfi büyük, kısaltmalar korunur', async () => {
  const { titleCase, titleCaseList } = await import('../src/constants/constants');
  assert.equal(titleCase('asia range'), 'Asia Range');
  assert.equal(titleCase('entry model'), 'Entry Model');
  assert.equal(titleCase('giriş modeli'), 'Giriş Modeli');
  assert.equal(titleCase('inverse fvg'), 'Inverse FVG');
  assert.equal(titleCase('iFVG'), 'iFVG');
  assert.equal(titleCase('NY AM'), 'NY AM');
  assert.equal(titleCase('5M'), '5M');
  assert.equal(titleCase('continuation vs reversal'), 'Continuation vs Reversal');
  assert.deepEqual(titleCaseList(['order block', 'Order Block', 'fvg']), ['Order Block', 'FVG']);
});

test('baş harf büyük: işlem alanları okunurken düzelir', async () => {
  const { normalizeTrade } = await import('../src/lib/tradeModel');
  const t = normalizeTrade({ id: 'a', asset: 'eurusd', type: 'LONG', status: 'WIN', rr: 1, createdAt: 1, notes: '', screenshot: null, session: 'london kz', strategy: 'asia range', entryModels: ['breaker', 'inverse fvg'] } as any);
  assert.equal(t.session, 'London KZ');
  assert.equal(t.strategy, 'Asia Range');
  assert.deepEqual(t.entryModels, ['Breaker', 'Inverse FVG']);
});
