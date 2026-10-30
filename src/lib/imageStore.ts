import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Görseller Firestore'da, kullanıcıya ait "images" koleksiyonunda saklanır (Firebase Storage kullanılmaz; ücretsiz planda
 * Storage açılamıyor). Kayıtlarda görselin kendisi değil kısa bir referans tutulur: "fsimg:<belge kimliği>".
 * Görsel sıkıştırılmış data URL olarak tek belgede durur (Firestore belge sınırı 1 MB; burada ~900 KB üst sınır).
 *
 * Yazma beklenmez: Firestore yerel önbelleği yazımı hemen uygular, bağlantı gelince buluta gönderir. Böylece
 * çevrimdışıyken de fotoğraf eklenir ve hemen görünür.
 */

export const IMAGE_REF_PREFIX = 'fsimg:';
export const isImageRef = (v: unknown): v is string => typeof v === 'string' && v.startsWith(IMAGE_REF_PREFIX);
export const isDataImage = (v: unknown): v is string => typeof v === 'string' && /^data:image\//i.test(v);

/** Belgeye yazılabilecek en uzun data URL (karakter). Firestore sınırı 1 MiB; alan adları ve kural payı için altında. */
export const MAX_IMAGE_CHARS = 900_000;

const COLLECTION = 'images';
const memory = new Map<string, Promise<string | null>>();

const loadHtmlImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel okunamadı.'));
    img.src = src;
  });

/** Data URL sınırı aşıyorsa boyut ve kaliteyi kademeli düşürerek sığdırır */
export async function fitDataUrl(dataUrl: string, maxChars = MAX_IMAGE_CHARS): Promise<string> {
  if (dataUrl.length <= maxChars) return dataUrl;
  const img = await loadHtmlImage(dataUrl);
  let scale = 1;
  let quality = 0.8;
  for (let i = 0; i < 8; i++) {
    scale *= 0.85;
    quality = Math.max(0.55, quality - 0.04);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let out = canvas.toDataURL('image/webp', quality);
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', quality);
    if (out.length <= maxChars) return out;
  }
  throw new Error('Görsel çok büyük; daha küçük bir görsel seçin.');
}

const newId = () => `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Görseli kaydeder ve referansını döner ("fsimg:…"). Yazma arka planda tamamlanır; hata olursa onError çağrılır. */
export async function saveImage(
  userId: string,
  dataUrl: string,
  kind: 'prop' | 'trade',
  onError?: (err: unknown) => void,
): Promise<string> {
  if (!isDataImage(dataUrl)) {
    if (isImageRef(dataUrl) || /^https?:\/\//i.test(dataUrl)) return dataUrl; // zaten kayıtlı / dış bağlantı
    throw new Error('Geçersiz görsel biçimi.');
  }
  const data = await fitDataUrl(dataUrl);
  const id = newId();
  const ref = IMAGE_REF_PREFIX + id;
  memory.set(ref, Promise.resolve(data));
  setDoc(doc(db, COLLECTION, id), { userId, data, kind, createdAt: Date.now() }).catch((err) => {
    memory.delete(ref);
    onError?.(err);
  });
  return ref;
}

/** Referanstaki görseli data URL olarak verir (bellek + Firestore önbelleği); bulunamazsa null */
export function loadImage(ref: string): Promise<string | null> {
  if (!isImageRef(ref)) return Promise.resolve(ref || null);
  let p = memory.get(ref);
  if (!p) {
    p = getDoc(doc(db, COLLECTION, ref.slice(IMAGE_REF_PREFIX.length)))
      .then((snap) => {
        const d = snap.exists() ? snap.data() : null;
        return d && typeof d.data === 'string' ? (d.data as string) : null;
      })
      .catch(() => {
        memory.delete(ref); // geçici hata kalıcı olmasın
        return null;
      });
    memory.set(ref, p);
  }
  return p;
}

/** Artık kullanılmayan görselleri siler (yalnızca bu sistemin referansları; diğer değerler atlanır) */
export async function deleteImages(refs: Iterable<string>): Promise<void> {
  const ids = Array.from(new Set(Array.from(refs).filter(isImageRef)));
  await Promise.all(
    ids.map((ref) => {
      memory.delete(ref);
      return deleteDoc(doc(db, COLLECTION, ref.slice(IMAGE_REF_PREFIX.length))).catch(() => undefined);
    }),
  );
}

/** Kullanıcının tüm görsellerini siler ("Verileri sıfırla"). Silinen belge sayısını döner. */
export async function deleteAllUserImages(userId: string): Promise<number> {
  const snap = await getDocs(query(collection(db, COLLECTION), where('userId', '==', userId)));
  const refs = snap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  memory.clear();
  return refs.length;
}
