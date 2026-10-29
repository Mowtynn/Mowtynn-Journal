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

export interface NyParts {
  date: string;     // YYYY-MM-DD (NY calendar date)
  hour: number;     // 0-23
  minute: number;   // 0-59
  weekday: number;  // 0 = Sunday ... 6 = Saturday
}

const nyCache = new Map<number, NyParts | null>();

export function getNyParts(timestamp: number): NyParts | null {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
  const cached = nyCache.get(timestamp);
  if (cached !== undefined) return cached;

  let result: NyParts | null = null;
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

/**
 * Giriş saati dilimi (NY). Tek kaynak işlem zamanıdır (formda NY saatiyle girilir); ayrı "Entry Time"
 * alanı kaldırıldı. Yaz/kış saati geçişleri Intl ile doğru çözülür.
 */
export function getTradeHourBucket(trade: Pick<Trade, 'createdAt'>): string {
  const ny = getNyParts(trade.createdAt);
  return ny ? hourToBucket(ny.hour) : 'Belirsiz';
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

export type SweepSide = 'HIGH' | 'LOW';
/** The Asia model fades the swept side: Asia high swept -> SHORT, Asia low swept -> LONG. */
export function getSweepSide(trade: Pick<Trade, 'type'>): SweepSide {
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

/** Süre biçimi: "45 dk", "2 sa 10 dk", "1 g 3 sa" */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  if (h < 24) return rm ? `${h} sa ${rm} dk` : `${h} sa`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} g ${rh} sa` : `${d} g`;
}
