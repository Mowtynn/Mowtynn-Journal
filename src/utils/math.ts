import { trNow, nyWallDate } from '../lib/tradingTime';
/** Tarih nesnesinin kendi (duvar saati) alanlarından YYYY-MM-DD. Varsayılan: bugün, Türkiye günü. */
export function localDateKey(input: number | Date = trNow()): string {
  const d = input instanceof Date ? input : nyWallDate(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
