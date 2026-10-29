import toast from 'react-hot-toast';

/**
 * Firebase (Firestore / Storage / Auth) hatalarını kullanıcıya anlaşılır Türkçe mesajla bildirir.
 * Aynı türden hata kısa sürede tekrar gelirse (ör. her snapshot'ta) tek bildirim gösterilir.
 */

const MESSAGES: Record<string, string> = {
  'permission-denied': 'Bulut erişimi reddedildi. Oturumu kapatıp yeniden giriş yapın; sorun sürerse Firebase kurallarını yayınladığınızdan emin olun.',
  'unauthenticated': 'Oturum süresi doldu. Verilerin buluta yazılması için yeniden giriş yapın.',
  'unavailable': 'Buluta şu an ulaşılamıyor. Değişiklikler cihazda tutuluyor, bağlantı gelince eşitlenecek.',
  'deadline-exceeded': 'Bulut yanıt vermedi (zaman aşımı). Bağlantı gelince tekrar denenecek.',
  'resource-exhausted': 'Firebase kotası doldu. Bir süre sonra tekrar deneyin.',
  'invalid-argument': 'Kayıt bulutun kabul etmediği bir değer içeriyor (çok büyük not/görsel ya da geçersiz alan).',
  'failed-precondition': 'Bulut işlemi şu an yapılamıyor (başka sekme/cihaz çakışması). Sayfayı yenileyin.',
  'storage/unauthorized': 'Görsel yüklenemedi: yalnızca kendi klasörünüze, 5 MB altı görsel yüklenebilir.',
  'storage/quota-exceeded': 'Görsel depolama kotası doldu.',
  'storage/retry-limit-exceeded': 'Görsel yüklenemedi: bağlantı çok yavaş ya da kesik.',
  'storage/canceled': 'Görsel yükleme iptal edildi.',
};

const lastShown = new Map<string, number>();
let authErrorsMutedUntil = 0;

/** Çıkış / hesap değişimi sırasında kapanan dinleyicilerin "erişim reddedildi" hataları bildirim göstermez */
export function muteAuthErrors(ms = 5000): void {
  authErrorsMutedUntil = Date.now() + ms;
}
const DEDUPE_MS = 15_000;

/** Hata kodunu (Firestore: "permission-denied", Storage: "storage/unauthorized") ayıklar */
export function cloudErrorCode(err: unknown): string {
  const raw = (err as { code?: unknown })?.code;
  if (typeof raw !== 'string') return 'unknown';
  return raw.replace(/^firestore\//, '');
}

/** Kullanıcıya gösterilecek açıklama */
export function describeCloudError(err: unknown, fallback = 'Bulut işlemi başarısız oldu.'): string {
  return MESSAGES[cloudErrorCode(err)] ?? fallback;
}

/**
 * Hata kaydı + (gerekirse) bildirim. `context` konsolda nerede olduğunu gösterir.
 * Bağlantı yokluğu (unavailable) çevrimdışı kullanımın doğal hâli olduğu için bildirim göstermez.
 */
export function reportCloudError(context: string, err: unknown, fallback?: string): void {
  console.error(`[cloud] ${context}:`, err);
  const code = cloudErrorCode(err);
  if (code === 'unavailable' || code === 'cancelled') return;
  const now = Date.now();
  if ((code === 'permission-denied' || code === 'unauthenticated') && now < authErrorsMutedUntil) return;
  const prev = lastShown.get(code) ?? 0;
  if (now - prev < DEDUPE_MS) return;
  lastShown.set(code, now);
  toast.error(describeCloudError(err, fallback), { id: `cloud-${code}` });
}
