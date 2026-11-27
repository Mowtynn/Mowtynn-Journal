import { isImageRef, loadImage } from './imageStore';
import { authFetch } from './api';

/**
 * Grafik linki yardımcıları — işlem formu önizlemesi ve işlem detayı aynı çözümlemeyi kullanır.
 * TradingView (tradingview.com/x/…) ve OpenMarket (share.openmarket.xyz/… ya da eski k6a.ai/…) paylaşım linkleri birer sayfadır; görsel adresi sunucudaki
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
// OpenMarket: eski kısa link k6a.ai/<kimlik>, yeni paylaşım linki share.openmarket.xyz/<kimlik>
const isOpenMarketShare = (url: string) =>
  /^https?:\/\/(www\.)?k6a\.ai\/[^\s/?#]+/i.test(url) || /^https?:\/\/share\.openmarket\.xyz\/[^\s/?#]+/i.test(url);

/** Sayfa olarak paylaşılan, görseli sunucuda çözülen grafik linki mi (TradingView / OpenMarket) */
export const isChartShareLink = (url: string) => isTradingViewShare(url) || isOpenMarketShare(url);

export const isHttpLink = (url: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(url);

const cache = new Map<string, Promise<string>>();

/* ---- Kalıcı önbellek: paylaşım linki → doğrudan görsel adresi (TradingView). Sayfa yenilense de çözümleme beklenmez. ---- */
const URL_CACHE_KEY = 'tj_chart_url_cache_v1';
const URL_CACHE_MAX = 400;
let urlCache: Record<string, string> | null = null;
const readUrlCache = (): Record<string, string> => {
  if (urlCache) return urlCache;
  try {
    const raw = localStorage.getItem(URL_CACHE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    urlCache = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    urlCache = {};
  }
  return urlCache!;
};
const rememberUrl = (link: string, image: string) => {
  if (!/^https:\/\//i.test(image) || image === link) return;
  const c = readUrlCache();
  if (c[link] === image) return;
  c[link] = image;
  const keys = Object.keys(c);
  if (keys.length > URL_CACHE_MAX) keys.slice(0, keys.length - URL_CACHE_MAX).forEach((k) => delete c[k]);
  try {
    localStorage.setItem(URL_CACHE_KEY, JSON.stringify(c));
  } catch {
    /* depolama dolu / kapalı: bellek önbelleği yeter */
  }
};

/* ---- CORS kipi: CORS başlığı göndermeyen görsel sunucusu bir kez hatırlanır; sonraki açılışlarda görsel tek istekte gelir ---- */
const NO_CORS_KEY = 'tj_chart_nocors_hosts_v1';
let noCorsHosts: Set<string> | null = null;
const hostOf = (u: string) => {
  try {
    return new URL(u).host;
  } catch {
    return '';
  }
};
const readNoCors = (): Set<string> => {
  if (noCorsHosts) return noCorsHosts;
  try {
    const v = JSON.parse(localStorage.getItem(NO_CORS_KEY) || '[]');
    noCorsHosts = new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  } catch {
    noCorsHosts = new Set();
  }
  return noCorsHosts!;
};
/** Görselin crossOrigin kipi: blob / data adresi ya da CORS'suz bilinen sunucu → yok; diğerleri "anonymous" (PNG indirmede grafik görünsün) */
export function chartCrossOrigin(src: string): 'anonymous' | undefined {
  if (!/^https?:\/\//i.test(src)) return undefined;
  return readNoCors().has(hostOf(src)) ? undefined : 'anonymous';
}
/** Görsel CORS ile yüklenemedi: sunucusu hatırlanır */
export function markChartNoCors(src: string) {
  const h = hostOf(src);
  if (!h) return;
  const set = readNoCors();
  if (set.has(h)) return;
  set.add(h);
  try {
    localStorage.setItem(NO_CORS_KEY, JSON.stringify([...set].slice(-50)));
  } catch {
    /* yok say */
  }
}

/** Paylaşım sayfasındaki görsel adresini sunucuya buldurur (hata olursa fırlatır) */
const resolveViaPage = (url: string): Promise<string> =>
  authFetch(`/api/resolve-tv?url=${encodeURIComponent(url)}`)
    .then((res) => res.json())
    .then((data) => {
      const image = data && typeof data.url === 'string' && data.url ? data.url : url;
      rememberUrl(url, image);
      return image;
    });

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
  if (!p && !isOpenMarketShare(url)) {
    // Daha önce çözülmüş TradingView linki: sunucuya gitmeden doğrudan görsel adresi
    const known = readUrlCache()[url];
    if (known) {
      p = Promise.resolve(known);
      cache.set(url, p);
    }
  }
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

/* ---- Ön yükleme: açılması muhtemel grafikler (listede üzerine gelinen, detayda önceki / sonraki işlem) arka planda indirilir ---- */
const preloaded = new Map<string, HTMLImageElement>();
const PRELOAD_MAX = 24;
export function prefetchChart(link?: string | null) {
  const url = normalizeChartLink(link || '');
  if (!url || typeof window === 'undefined' || typeof Image === 'undefined') return;
  if (!isChartShareLink(url) && !isHttpLink(url)) return;
  resolveChartImage(url)
    .then((src) => {
      if (!src || preloaded.has(src)) return;
      const img = new Image();
      const co = chartCrossOrigin(src);
      if (co) img.crossOrigin = co;
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.src = src;
      preloaded.set(src, img);
      if (preloaded.size > PRELOAD_MAX) preloaded.delete(preloaded.keys().next().value as string);
    })
    .catch(() => {});
}
