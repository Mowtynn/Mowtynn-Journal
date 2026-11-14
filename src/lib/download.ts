/**
 * Tüm dışa aktarımlar (CSV, Excel, PNG) için tek kaydetme yolu.
 * - Masaüstü / Android: Blob adresiyle indirme (adres indirme başladıktan sonra serbest bırakılır).
 * - iPhone / iPad (özellikle ana ekrana eklenmiş PWA): <a download> güvenilir değil; veri adresine gitmek uygulamayı
 *   geri dönülemeyen bir sayfaya götürür. Bunun yerine paylaş menüsü açılır ("Dosyalara Kaydet", AirDrop, Mail…).
 */

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ kendini Mac olarak tanıtır; dokunmatik olması ayırt eder
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
};

const anchorDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Bazı tarayıcılar indirmeyi tıklamadan sonra başlatır; adres hemen iptal edilirse dosya boş iner
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/** Dosyayı kullanıcıya teslim eder. Paylaş menüsü kullanıcı tarafından kapatılırsa sessizce biter. */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (isIOS() && typeof File !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (err) {
      // Kullanıcı paylaş menüsünü kapattı: hata değil
      if ((err as { name?: string })?.name === 'AbortError') return;
      // Paylaşım desteklenmiyor / reddedildi: aşağıdaki indirme yoluna düş
    }
  }
  anchorDownload(blob, filename);
}

/** data:...;base64 adresini Blob'a çevirir (fetch'e gerek duymadan; CSP / çevrimdışı durumda da çalışır) */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(meta)?.[1] || 'application/octet-stream';
  if (/;base64/.test(meta)) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(body)], { type: mime });
}

/** Görsel yakalamadan önce: yazı tipleri yüklenmiş ve düzen boyanmış olsun (yedek yazı tipiyle ölçülen metin taşmasın) */
export async function waitForPaint(): Promise<void> {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* yazı tipi API'si yoksa beklemeden devam */
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}
