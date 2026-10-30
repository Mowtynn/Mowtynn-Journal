import { fitDataUrl } from './imageStore';
/**
 * Fotoğrafı okunabilir kalacak şekilde küçültüp sıkıştırır: uzun kenar en fazla 1800 px, WebP (desteklenmezse JPEG).
 * Sertifika ve ekran görüntülerinde yazıların okunması için kalite yüksek tutulur; tipik çıktı 150–500 KB,
 * en fazla ~900 KB (Firestore'da tek belgeye sığar).
 */
const MAX_EDGE = 1800;
const QUALITY = 0.82;

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel okunamadı.'));
    };
    img.src = url;
  });

export async function compressImage(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Yalnızca görsel dosyası yüklenebilir.');
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let data = canvas.toDataURL('image/webp', QUALITY);
  if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', QUALITY);
  // Firestore belge sınırına sığdır (gerekirse boyut / kalite kademeli düşer)
  return fitDataUrl(data);
}
