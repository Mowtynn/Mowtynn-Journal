import { nyNow, nyWallDate } from '../lib/tradingTime';
/** Tarih nesnesinin kendi (duvar saati) alanlarından YYYY-MM-DD. Varsayılan: bugün, New York günü. */
export function localDateKey(input: number | Date = nyNow()): string {
  const d = input instanceof Date ? input : nyWallDate(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
