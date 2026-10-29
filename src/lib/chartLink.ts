import { authFetch } from './api';

/**
 * Grafik linki yardımcıları — işlem formu önizlemesi ve işlem detayı aynı çözümlemeyi kullanır.
 * TradingView paylaşım linki (tradingview.com/x/…) bir sayfadır; görsel adresi sunucudaki /api/resolve-tv ile bulunur.
 */

/** Yapıştırılan metni temizler: boşluklar atılır, şemasız "www.…" / "tradingview.com/…" https ile tamamlanır */
export function normalizeChartLink(raw: string): string {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v) || v.startsWith('data:image')) return v;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v)) return `https://${v}`;
  return v;
}

export const isTradingViewShare = (url: string) => /tradingview\.com\/x\//i.test(url);

export const isHttpLink = (url: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(url);

const cache = new Map<string, Promise<string>>();

/** Önizlenecek görsel adresi (TradingView linki çözülür; sonuç bellekte tutulur, hata olursa link aynen döner) */
export function resolveChartImage(url: string): Promise<string> {
  if (!isTradingViewShare(url)) return Promise.resolve(url);
  let p = cache.get(url);
  if (!p) {
    p = authFetch(`/api/resolve-tv?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => (data && typeof data.url === 'string' && data.url ? data.url : url))
      .catch(() => {
        cache.delete(url); // geçici ağ hatası kalıcı olmasın
        return url;
      });
    cache.set(url, p);
  }
  return p;
}
