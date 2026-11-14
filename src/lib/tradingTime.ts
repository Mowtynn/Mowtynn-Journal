import { Trade } from '../types';

/**
 * All session-based analytics (Asia / London / NY AM / NY Lunch) are defined in New York time.
 * The browser runs in the user's local zone, so every hour / weekday used for edge analysis must
 * be converted explicitly. Intl handles the US/EU daylight-saving mismatch weeks correctly.
 */
const NY_ZONE = 'America/New_York';

let nyFormatter: Intl.DateTimeFormat | null = null;
const getNyFormatter = (): Intl.DateTimeFormat => {
  if (!nyFormatter) {
    nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: NY_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
  }
  return nyFormatter;
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const WEEKDAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

interface NyParts {
  date: string;     // YYYY-MM-DD (NY calendar date)
  hour: number;     // 0-23
  minute: number;   // 0-59
  weekday: number;  // 0 = Sunday ... 6 = Saturday
}

const nyCache = new Map<number, NyParts | null>();

/**
 * Hızlı yol: ABD yaz saati kuralı (2007'den beri) — Mart'ın 2. Pazarı 02:00 yerel (07:00 UTC) başlar,
 * Kasım'ın 1. Pazarı 02:00 yerel (06:00 UTC) biter. Intl.formatToParts işlem başına pahalı olduğu için
 * 2007–2099 arası aritmetikle çözülür (Intl ile birebir aynı sonuç, testte doğrulanır); diğer yıllar Intl'e düşer.
 */
const pad2f = (n: number) => (n < 10 ? `0${n}` : String(n));
const dstBounds = new Map<number, [number, number]>();
function fastNyParts(ts: number): NyParts | null {
  const year = new Date(ts).getUTCFullYear();
  if (year < 2007 || year > 2099) return null;
  let b = dstBounds.get(year);
  if (!b) {
    const marDow = new Date(Date.UTC(year, 2, 1)).getUTCDay();
    const novDow = new Date(Date.UTC(year, 10, 1)).getUTCDay();
    b = [Date.UTC(year, 2, 1 + ((7 - marDow) % 7) + 7, 7), Date.UTC(year, 10, 1 + ((7 - novDow) % 7), 6)];
    dstBounds.set(year, b);
  }
  const offsetH = ts >= b[0] && ts < b[1] ? 4 : 5;
  const d = new Date(ts - offsetH * 3_600_000);
  return {
    date: `${d.getUTCFullYear()}-${pad2f(d.getUTCMonth() + 1)}-${pad2f(d.getUTCDate())}`,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

export function getNyParts(timestamp: number): NyParts | null {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
  const cached = nyCache.get(timestamp);
  if (cached !== undefined) return cached;

  let result: NyParts | null = fastNyParts(timestamp);
  if (result) {
    if (nyCache.size > 5000) nyCache.clear();
    nyCache.set(timestamp, result);
    return result;
  }
  try {
    const parts = getNyFormatter().formatToParts(new Date(timestamp));
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    let hour = parseInt(get('hour'), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(get('minute'), 10);
    const weekday = WEEKDAY_INDEX[get('weekday')];
    if (Number.isFinite(hour) && Number.isFinite(minute) && weekday !== undefined) {
      result = { date: `${get('year')}-${get('month')}-${get('day')}`, hour, minute, weekday };
    }
  } catch {
    result = null;
  }

  if (nyCache.size > 5000) nyCache.clear();
  nyCache.set(timestamp, result);
  return result;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function hourToBucket(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return `${pad2(h)}:00-${pad2((h + 1) % 24)}:00`;
}

/** Weekday (0-6) of the trade in NY time; falls back to the local weekday if conversion fails. */
export function getTradeNyWeekday(trade: Pick<Trade, 'createdAt'>): number {
  const ny = getNyParts(trade.createdAt);
  return ny ? ny.weekday : new Date(trade.createdAt).getDay();
}

/**
 * Paritenin projedeki TEK biçimi: harf/rakam dışı her şey atılır, büyük harf.
 * "EUR/USD", "eurusd", "EUR-USD", "EUR USD" -> "EURUSD". Kayıtlar, filtreler ve tüm analizler bunu kullanır.
 */
export function canonicalAsset(asset: unknown): string {
  if (typeof asset !== 'string') return '';
  return asset.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Analizlerde gruplama anahtarı: boş parite "BELİRSİZ" */
export function normalizePair(asset?: string | null): string {
  return canonicalAsset(asset) || 'BELİRSİZ';
}

type SweepSide = 'HIGH' | 'LOW';
/** The Asia model fades the swept side: Asia high swept -> SHORT, Asia low swept -> LONG. */
/**
 * Süpürülen Asia tarafı yalnızca REVERSAL işlemlerde anlamlıdır (Asia high/low alınıp ters yöne dönüş):
 * short → High, long → Low. Continuation işlemlerinde Asia high/low süpürmesi girişle ilgisiz olduğu için null.
 * (Asia Range "Swept" alanından türetilmez; Trend Yapısı alanına bakılır.)
 */
function isReversalTrend(trend?: string | null): boolean {
  const v = (trend || '').toLocaleLowerCase('tr');
  return v.includes('reversal') || v.includes('dönüş') || v.includes('ters');
}
export function getSweepSide(trade: Pick<Trade, 'type' | 'trend'>): SweepSide | null {
  if (!isReversalTrend(trade.trend)) return null;
  return trade.type === 'SHORT' ? 'HIGH' : 'LOW';
}


/* ==========================================================================
   NEW YORK SAATİ: işlem giriş/çıkış saatleri NY saatiyle girilir ve gösterilir.
   Zaman damgası (createdAt / exitAt) gerçek an olarak (UTC ms) saklanır; formda ve ekranda
   NY duvar saatine çevrilir. Gün/hafta/ay gruplamaları da NY takvim gününe göredir.
   ========================================================================== */
const pad = (n: number) => String(n).padStart(2, '0');

/** Zaman damgasının NY duvar saatini "YYYY-MM-DDTHH:mm" olarak verir (form alanı biçimi) */
export function toNyInput(ts: number): string {
  const p = getNyParts(ts);
  if (!p) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${p.date}T${pad(p.hour)}:${pad(p.minute)}`;
}

const IST_DATE_FMT = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return null;
  }
})();

/** Türkiye (Europe/Istanbul) takvim günü "YYYY-MM-DD"; dönüşüm olmazsa yerel gün */
export function istanbulDateKey(ts: number): string {
  if (IST_DATE_FMT) {
    const parts = IST_DATE_FMT.formatToParts(new Date(ts));
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const y = get('year'), m = get('month'), d = get('day');
    if (y && m && d) return `${y}-${m}-${d}`;
  }
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Yeni işlem formunun başlangıç değeri: GÜN Türkiye takvimine göre (gece yarısından sonra yeni gün görünür),
 * günün içindeki an NY saatinden (kayıt sırası girildiği andan gelir). Kayıt seçilen günü NY işlem günü sayar:
 * nyInputToTs bu değeri o NY gününün içinde bir ana çevirir, yani haftanın günü / gün analizleri seçilen güne düşer.
 */
export function newTradeDateInput(ts: number): string {
  const ny = toNyInput(ts);
  return `${istanbulDateKey(ts)}${ny.slice(10)}`;
}

/**
 * NY duvar saati "YYYY-MM-DDTHH:mm" → gerçek zaman damgası. Yaz/kış saati geçişlerine karşı korumalı:
 * - Normal saat: tek karşılığı vardır.
 * - Belirsiz saat (kasımda saat geri alınınca 01:00–01:59 iki kez yaşanır): İLK geçiş (yaz saati, EDT) seçilir.
 * - Var olmayan saat (martta saat ileri alınınca 02:00–02:59 hiç yaşanmaz): geçiş öncesi farkla ileri kaydırılır
 *   (02:30 → 03:30 EDT). Form bu durumda kullanıcıyı uyarır (bkz. isNyWallTimeValid).
 */
export function nyInputToTs(input: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input || '');
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (!Number.isFinite(wallAsUtc)) return null;
  const offsetAt = (ts: number) => {
    const p = getNyParts(ts);
    if (!p) return 0;
    const [py, pm, pd] = p.date.split('-').map(Number);
    return Date.UTC(py, pm - 1, pd, p.hour, p.minute) - ts;
  };
  const DAY = 86400000;
  const wanted = input.slice(0, 16);
  // O gün geçerli olabilecek iki fark (geçişten önce / sonra); her biri için aday an
  const offsets = Array.from(new Set([offsetAt(wallAsUtc - DAY), offsetAt(wallAsUtc + DAY)]));
  const matches = offsets.map((o) => wallAsUtc - o).filter((ts) => toNyInput(ts) === wanted).sort((x, z) => x - z);
  if (matches.length) return matches[0];
  // Var olmayan saat: geçiş öncesi farkla (daha büyük UTC farkı) ileri kaydır
  return wallAsUtc - Math.min(...offsets);
}

/** Girilen NY duvar saati gerçekten yaşanmış mı? (Mart geçişindeki 02:xx yok) */
export function isNyWallTimeValid(input: string): boolean {
  const ts = nyInputToTs(input);
  return ts !== null && toNyInput(ts) === (input || '').slice(0, 16);
}

/**
 * Yerel alanları NY duvar saatine eşit bir Date: getDate/getDay/getHours ve toLocale* (saat dilimi
 * vermeden) NY değerlerini verir. Gruplama ve görüntüleme kodu bu sayede değişmeden NY'ye göre çalışır.
 */
export function nyWallDate(ts: number): Date {
  const p = getNyParts(ts);
  if (!p) return new Date(ts);
  const [y, m, d] = p.date.split('-').map(Number);
  return new Date(y, m - 1, d, p.hour, p.minute);
}

/** Şu an, NY duvar saatiyle (yerel alanlarda okunur). Projede "bugün / şimdi" her yerde budur. */
export const nyNow = (): Date => nyWallDate(Date.now());

/** NY takvim günü "YYYY-MM-DD" */
export function nyDateKey(ts: number): string {
  const p = getNyParts(ts);
  if (p) return p.date;
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO hafta anahtarı, New York takvim gününe göre (tarayıcının saat diliminden bağımsız) */
export function nyIsoWeekKey(ts: number): string {
  const d = nyWallDate(ts);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${week}`;
}
