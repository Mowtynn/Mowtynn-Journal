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

/** "02:00", "2:30", "02:00-03:00" -> "02:00-03:00". Returns null when it cannot be parsed. */
export function normalizeEntryHour(raw?: string | null): string | null {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (!Number.isFinite(h) || h < 0 || h > 24) return null;
  return hourToBucket(h === 24 ? 0 : h);
}

/**
 * Entry-hour bucket in NY time. An explicitly selected entry hour wins; otherwise it is derived from
 * the trade timestamp converted to New York (NOT the browser's local hour).
 */
export function getTradeHourBucket(trade: Pick<Trade, 'entryTime' | 'createdAt'>): string {
  const explicit = normalizeEntryHour(trade.entryTime);
  if (explicit) return explicit;
  const ny = getNyParts(trade.createdAt);
  return ny ? hourToBucket(ny.hour) : 'Belirsiz';
}

/** Weekday (0-6) of the trade in NY time; falls back to the local weekday if conversion fails. */
export function getTradeNyWeekday(trade: Pick<Trade, 'createdAt'>): number {
  const ny = getNyParts(trade.createdAt);
  return ny ? ny.weekday : new Date(trade.createdAt).getDay();
}

/** "EUR/USD", "eurusd", "EUR-USD" -> "EURUSD" */
export function normalizePair(asset?: string | null): string {
  if (!asset) return 'BELİRSİZ';
  const clean = String(asset).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean || 'BELİRSİZ';
}

export type SweepSide = 'HIGH' | 'LOW';
/** The Asia model fades the swept side: Asia high swept -> SHORT, Asia low swept -> LONG. */
export function getSweepSide(trade: Pick<Trade, 'type'>): SweepSide {
  return trade.type === 'SHORT' ? 'HIGH' : 'LOW';
}

export type BiasAlignment = 'ALIGNED' | 'COUNTER' | 'NEUTRAL' | 'UNKNOWN';
export function getBiasAlignment(trade: Pick<Trade, 'type' | 'htfBias'>): BiasAlignment {
  if (!trade.htfBias) return 'UNKNOWN';
  if (trade.htfBias === 'NEUTRAL') return 'NEUTRAL';
  if (trade.htfBias === 'BULLISH') return trade.type === 'LONG' ? 'ALIGNED' : 'COUNTER';
  return trade.type === 'SHORT' ? 'ALIGNED' : 'COUNTER';
}
