import { ASIA_RANGE_TYPES, Trade } from '../types';

/** İşlem durumu R'nin işaretinden gelir (formda ayrıca seçilmez): artı kazanç, eksi kayıp, 0 başabaş */
/**
 * R tek ondalığa yuvarlanır (2.08 → 2.1, 2.04 → 2, -1.25 → -1.3): kayıt, hesap ve görünüm aynı sayıyı kullanır.
 * Yarım değerler sıfırdan uzağa gider (işaretten bağımsız); kayan nokta hatası (2.05 → 20.4999…) küçük payla düzeltilir.
 */
export const roundR = (v: number): number => {
  if (!Number.isFinite(v)) return 0;
  const r = (Math.sign(v) * Math.round(Math.abs(v) * 10 + 1e-9)) / 10;
  return r === 0 ? 0 : r;
};

export const statusOfR = (r: number): Trade['status'] => (r > 0 ? 'WIN' : r < 0 ? 'LOSS' : 'BREAKEVEN');

/** Kaldırılmış "İşlem Yönetimi" alanının eski kayıtlardaki geçerli değerleri (Firestore kuralı bu listeyi denetler) */
const MANAGEMENT_TYPES = ['Plana Göre', 'BE Çekildi', 'Kısmi Kâr', 'Erken Kapatıldı'] as const;

/**
 * Kronolojik sıra (eskiden yeniye). Aynı dakikaya girilmiş işlemlerde sıra kayıt kimliğiyle belirlenir (kimlik kayıt
 * anını içerir: önce kaydedilen önce gelir). Böylece eğri, max drawdown, "günün kaçıncı işlemi" ve "önceki işlemin
 * sonucu" gibi sıraya bağlı analizler işlemlerin saklandığı / buluttan geldiği sıraya göre değişmez.
 */
export const byEntryTime = (a: Pick<Trade, 'createdAt' | 'id'>, b: Pick<Trade, 'createdAt' | 'id'>): number =>
  a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
import { canonicalAsset } from './tradingTime';
import { titleCase } from '../constants/constants';

/**
 * Tek işlem modeli. Eski sürümlerden kalan alanlar (Liquidity Sweep, `entry` metni, 1H bias, spread, çıkış nedeni)
 * okunurken temizlenir; Entry Model her zaman `entryModels` dizisinde tutulur. Yerel depo, bulut snapshot'ı,
 * yedekten yükleme ve kayıt aynı fonksiyondan geçer: istatistikler iki farklı veri biçimini karıştırmaz.
 */
// entryTime: ayrı giriş saati etiketi kaldırıldı; saat her zaman işlem zamanından (NY) türetilir
const LEGACY_KEYS = ['entry', 'liquiditySweep', 'liquiditySweeps', 'concept', 'htfBias', 'spreadPips', 'exitReason', 'entryDate', 'entryTime', 'maePips', 'mfePips'];

const splitList = (v: unknown): string[] =>
  typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];

const cleanList = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  v.forEach((x) => {
    if (typeof x !== 'string') return;
    // Tanım değerleri her kelimenin baş harfi büyük (Order Block, Inverse FVG); harf farkıyla tekrar eden tek kalır
    const t = titleCase(x);
    if (t && !out.some((o) => o.toLocaleLowerCase('tr-TR') === t.toLocaleLowerCase('tr-TR'))) out.push(t);
  });
  return out.length > 0 ? out : undefined;
};

// Paritenin tek biçimi tradingTime.canonicalAsset'te (Asia analizleriyle aynı kural)
export { canonicalAsset };

/** Tanım listesindeki pariteleri tek biçime getirir, yinelenenleri atar (sıra korunur) */
export function canonicalAssetList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const x of list) {
    const c = canonicalAsset(x);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

/** "9:5", "09:05", "0905" → "09:05"; geçersizse undefined */
export function normalizeClock(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const m = v.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function normalizeTrade<T extends Partial<Trade> & Record<string, any>>(raw: T): Trade {
  const t: Record<string, any> = { ...raw };
  const models = cleanList(t.entryModels) ?? cleanList(splitList(t.entry));
  if (models) t.entryModels = models;
  else delete t.entryModels;
  for (const k of ['confirmations', 'tpTargets']) {
    const l = cleanList(t[k]);
    if (l) t[k] = l;
    else delete t[k];
  }
  LEGACY_KEYS.forEach((k) => delete t[k]);
  // Biçim onarımı (yedek/eski kayıt): "long" → LONG, "win" → WIN, metin tarih/sayı → ms, boşluklu parite → kırpılmış
  if (typeof t.type === 'string') t.type = t.type.trim().toUpperCase();
  if (typeof t.status === 'string') t.status = t.status.trim().toUpperCase();
  if (typeof t.asset === 'string') t.asset = canonicalAsset(t.asset);
  if (typeof t.createdAt === 'string') {
    const n = Number(t.createdAt);
    const ms = Number.isFinite(n) ? n : Date.parse(t.createdAt);
    if (Number.isFinite(ms)) t.createdAt = ms;
  }
  // Giriş zamanı bozuksa (NaN / çöp) ve geçerli bir çıkış zamanı varsa o kullanılır. İkisi de yoksa kayıt geçersiz kalır:
  // buluta yazılmaz, Yedek Kurtarma'da görünür ve analizlerden çıkarılır (applyGlobalFilters).
  if ((typeof t.createdAt !== 'number' || !Number.isFinite(t.createdAt)) && typeof t.exitAt === 'number' && Number.isFinite(t.exitAt)) {
    t.createdAt = t.exitAt;
  }
  // R her zaman sonlu bir sayı: metin "2.5" → 2.5; bozuk / sonsuz değer → 0 (istatistikleri NaN/∞ ile bozmasın)
  if (typeof t.rr !== 'number' || !Number.isFinite(t.rr)) {
    const n = Number(t.rr);
    t.rr = Number.isFinite(n) ? n : 0;
  }
  // Tek ondalık: eski kayıtlardaki 2.08 gibi değerler de 2.1 olarak hesaplanır ve görünür.
  // Yuvarlanınca 0 olan küçük sonuç (0.04) başabaştır.
  if (t.rr !== 0) {
    t.rr = roundR(t.rr);
    if (t.rr === 0) t.status = 'BREAKEVEN';
  }
  // Proje R tabanlı: dolar sonucu tutulmaz. BE her zaman 0R.
  delete t.pnl;
  if (t.status === 'BREAKEVEN') t.rr = 0;
  // İşaret durumla tutarlı: WIN pozitif, LOSS negatif (eski / içe aktarılan kayıtta ters işaret istatistiği bozmasın)
  else if (t.status === 'WIN' && t.rr < 0) t.rr = -t.rr;
  else if (t.status === 'LOSS' && t.rr > 0) t.rr = -t.rr;
  if (t.newsDay !== true && t.newsDay !== false) delete t.newsDay;
  // Asia Range: yalnızca Range / Trend / Swept (harf farkı onarılır); Sweep Time: NY saati "HH:mm"
  if (t.asiaRange !== undefined) {
    const v = typeof t.asiaRange === 'string' ? t.asiaRange.trim().toLowerCase() : '';
    const hit = ASIA_RANGE_TYPES.find((x) => x.toLowerCase() === v || (x === 'Swept' && (v === 'sweep' || v === 'sweept')));
    if (hit) t.asiaRange = hit;
    else delete t.asiaRange;
  }
  // Eski kayıtlardaki İşlem Yönetimi: yalnızca tanımlı seçenekler; "Plana Göre" diğerleriyle birlikte olamaz
  if (t.management !== undefined) {
    // Eski adı "BE'ye Çekildi" → "BE Çekildi"
    const norm = (v: string) => v.trim().toLocaleLowerCase('tr-TR').replace("be'ye çekildi", 'be çekildi');
    const list = Array.isArray(t.management)
      ? MANAGEMENT_TYPES.filter((x) => (t.management as unknown[]).some((v) => typeof v === 'string' && norm(v) === x.toLocaleLowerCase('tr-TR')))
      : [];
    const clean = list.includes('Plana Göre') && list.length > 1 ? list.filter((x) => x !== 'Plana Göre') : list;
    if (clean.length) t.management = clean;
    else delete t.management;
  }
  if (t.afterExitTp !== undefined && typeof t.afterExitTp !== 'boolean') delete t.afterExitTp;
  if (t.sweepTime !== undefined) t.sweepTime = normalizeClock(t.sweepTime);
  if (t.sweepTime === undefined) delete t.sweepTime;
  // Çıkış anı: sonlu ve girişten önce olmayan bir zaman damgası; değilse düşer
  if (typeof t.exitAt !== 'number' || !Number.isFinite(t.exitAt) || (typeof t.createdAt === 'number' && t.exitAt < t.createdAt)) delete t.exitAt;
  // İsteğe bağlı alanların türü (Firestore kuralı bunları denetler; bozuk eski kayıt toplu yazımı düşürmesin)
  for (const k of OPTIONAL_TEXT_KEYS) {
    if (t[k] === undefined || (k === 'planFidelity' && t[k] === null)) continue;
    if (typeof t[k] !== 'string') delete t[k];
    else {
      // Girdi / tanım değerleri baş harfleri büyük biçimde (Asia Range, Entry Model); kısaltmalar korunur
      t[k] = titleCase(t[k]);
      if (t[k].length > TEXT_MAX) t[k] = t[k].slice(0, TEXT_MAX);
      if (!t[k]) delete t[k];
    }
  }
  for (const k of OPTIONAL_NUMBER_KEYS) {
    if (t[k] === undefined) continue;
    const n = typeof t[k] === 'number' ? t[k] : t[k] === null || t[k] === '' ? NaN : Number(t[k]);
    if (Number.isFinite(n)) t[k] = n;
    else delete t[k];
  }
  if (t.accountCategory !== undefined && !['FUNDED', 'CHALLENGE', 'DEMO'].includes(t.accountCategory)) delete t.accountCategory;
  if (t.quickEntry !== undefined && typeof t.quickEntry !== 'boolean') delete t.quickEntry;
  if (typeof t.notes !== 'string') t.notes = t.notes == null ? '' : String(t.notes);
  if (t.screenshot !== null && typeof t.screenshot !== 'string') t.screenshot = null;
  // Grafik linki yalnızca http(s) bağlantısı ya da gömülü görsel olabilir: "javascript:" gibi tıklanınca kod
  // çalıştırabilecek değerler (bozuk / kötü niyetli yedekten) düşer; şemasız "www.…" linki https ile tamamlanır.
  if (typeof t.screenshot === 'string') {
    const v = t.screenshot.trim();
    if (!v) t.screenshot = null;
    else if (/^https?:\/\//i.test(v) || /^data:image\//i.test(v) || /^fsimg:[A-Za-z0-9_-]{1,100}$/.test(v)) t.screenshot = v;
    else if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v)) t.screenshot = `https://${v}`;
    else t.screenshot = null;
  }
  return t as Trade;
}

/** Metin alanları için üst sınır (kuraldaki 200 ile aynı) */
const TEXT_MAX = 200;
const OPTIONAL_TEXT_KEYS = ['timeframe', 'htfTimeframe', 'session', 'planFidelity', 'trend', 'premiumDiscount', 'strategy', 'asiaRangeFvg', 'platform'] as const;
const OPTIONAL_NUMBER_KEYS = ['stopPips', 'tpPips', 'asiaRangePips', 'riskPct', 'riskAmount', 'accountStage'] as const;

/**
 * Buluta yazılabilir işlem: Firestore kurallarındaki (firestore.rules · validTrade) zorunlu alanlarla birebir aynı.
 * Kurala uymayan tek kayıt toplu yazımın tamamını düşürdüğü için yazmadan önce burada ayıklanır.
 */
export function isValidTrade(t: unknown): t is Trade {
  if (!t || typeof t !== 'object') return false;
  const x = t as Record<string, any>;
  return (
    typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 128 &&
    typeof x.asset === 'string' && x.asset.length > 0 && x.asset.length <= 64 &&
    (x.type === 'LONG' || x.type === 'SHORT') &&
    (x.status === 'WIN' || x.status === 'LOSS' || x.status === 'BREAKEVEN') &&
    typeof x.createdAt === 'number' && Number.isFinite(x.createdAt) &&
    typeof x.rr === 'number' && Number.isFinite(x.rr) &&
    (x.notes === undefined || x.notes === null || (typeof x.notes === 'string' && x.notes.length <= 50000)) &&
    OPTIONAL_TEXT_KEYS.every((k) => x[k] === undefined || x[k] === null || (typeof x[k] === 'string' && x[k].length <= TEXT_MAX)) &&
    OPTIONAL_NUMBER_KEYS.every((k) => x[k] === undefined || x[k] === null || typeof x[k] === 'number') &&
    (x.accountCategory === undefined || x.accountCategory === null || ['FUNDED', 'CHALLENGE', 'DEMO'].includes(x.accountCategory)) &&
    (x.accountId === undefined || x.accountId === null || (typeof x.accountId === 'string' && x.accountId.length <= 128)) &&
    (x.asiaRange === undefined || x.asiaRange === null || (ASIA_RANGE_TYPES as readonly string[]).includes(x.asiaRange)) &&
    (x.management === undefined || x.management === null || (Array.isArray(x.management) && x.management.every((v: unknown) => (MANAGEMENT_TYPES as readonly unknown[]).includes(v)))) &&
    (x.afterExitTp === undefined || x.afterExitTp === null || typeof x.afterExitTp === 'boolean') &&
    (x.sweepTime === undefined || x.sweepTime === null || (typeof x.sweepTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.sweepTime)))
  );
}

export const normalizeTrades = (list: unknown): Trade[] =>
  Array.isArray(list) ? list.filter((x) => x && typeof x === 'object').map((x) => normalizeTrade(x as any)) : [];
