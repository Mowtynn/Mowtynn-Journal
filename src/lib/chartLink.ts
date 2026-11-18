import { isImageRef, loadImage } from './imageStore';
import { authFetch } from './api';

/**
 * Grafik linki yardımcıları — işlem formu önizlemesi ve işlem detayı aynı çözümlemeyi kullanır.
 * TradingView (tradingview.com/x/…) ve OpenMarket (k6a.ai/…) paylaşım linkleri birer sayfadır; görsel adresi sunucudaki
 * /api/resolve-tv ile (sayfanın og:image etiketinden) bulunur.
 */

/** Yapıştırılan metni temizler: boşluklar atılır, şemasız "www.…" / "tradingview.com/…" https ile tamamlanır */
export function normalizeChartLink(raw: string): string {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v) || v.startsWith('data:image')) return v;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v)) return `https://${v}`;
  return v;
}

const isTradingViewShare = (url: string) => /tradingview\.com\/x\//i.test(url);
const isOpenMarketShare = (url: string) => /^https?:\/\/(www\.)?k6a\.ai\/[^\s/?#]+/i.test(url);

/** Sayfa olarak paylaşılan, görseli sunucuda çözülen grafik linki mi (TradingView / OpenMarket) */
export const isChartShareLink = (url: string) => isTradingViewShare(url) || isOpenMarketShare(url);

export const isHttpLink = (url: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(url);

const cache = new Map<string, Promise<string>>();

/** Paylaşım sayfasındaki görsel adresini sunucuya buldurur (hata olursa fırlatır) */
const resolveViaPage = (url: string): Promise<string> =>
  authFetch(`/api/resolve-tv?url=${encodeURIComponent(url)}`)
    .then((res) => res.json())
    .then((data) => (data && typeof data.url === 'string' && data.url ? data.url : url));

/** Görseli sunucudan (/api/chart-image) alıp aynı kökenli blob adresine çevirir (hata olursa fırlatır) */
const fetchViaProxy = (url: string): Promise<string> =>
  authFetch(`/api/chart-image?url=${encodeURIComponent(url)}`).then(async (res) => {
    if (!res.ok) throw new Error('chart-image ' + res.status);
    const blob = await res.blob();
    if (!/^image\//i.test(blob.type)) throw new Error('chart-image tür');
    return URL.createObjectURL(blob);
  });

/** Önizlenecek görsel adresi (TradingView / OpenMarket linki çözülür; OpenMarket görseli sunucudan blob olarak alınır; sonuç bellekte tutulur, hata olursa link aynen döner) */
export function resolveChartImage(url: string): Promise<string> {
  // Kayıtlı görsel (eski kayıtlardan) Firestore'dan okunur
  if (isImageRef(url)) return loadImage(url).then((v) => v || '');
  if (!isChartShareLink(url)) return Promise.resolve(url);
  let p = cache.get(url);
  if (!p) {
    // OpenMarket görsel sunucusu CORS başlığı göndermez: görsel sunucumuzdan alınıp aynı kökenli blob adresine çevrilir
    // (indirilen PNG'de grafik görünsün diye). Olmazsa sayfadaki doğrudan görsel adresine, o da olmazsa linke düşülür.
    const first = isOpenMarketShare(url) ? fetchViaProxy(url).catch(() => resolveViaPage(url)) : resolveViaPage(url);
    p = first.catch(() => {
      cache.delete(url); // geçici ağ hatası kalıcı olmasın
      return url;
    });
    cache.set(url, p);
  }
  return p;
}
