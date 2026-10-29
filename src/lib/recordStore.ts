import type { JournalEntry, Note, Trade } from '../types';
import { titleCase } from '../constants/constants';

/**
 * Kayıt (işlem / not / günlük) listeleri üzerindeki saf işlemler.
 * App bu fonksiyonlarla iyimser güncelleme, hata durumunda geri alma ve bulut eşitlemesi yapar;
 * mantık burada olduğu için testlerle korunur (eskiden App.tsx içinde, test edilemeyen yerdeydi).
 */

type WithId = { id: string };

export const byCreatedDesc = <T extends Pick<Trade, 'createdAt'>>(a: T, b: T) => (b.createdAt || 0) - (a.createdAt || 0);
export const byUpdatedDesc = <T extends Pick<Note, 'updatedAt'>>(a: T, b: T) => (b.updatedAt || 0) - (a.updatedAt || 0);
/** Günlük: YYYY-MM-DD metin sırası tarih sırasıdır (saat dilimine bağlı Date ayrıştırması yok); aynı günde son güncellenen önce */
export const byJournalDateDesc = <T extends Pick<JournalEntry, 'date' | 'updatedAt'>>(a: T, b: T) =>
  (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0);

/** Kaydı ekler ya da aynı kimliklinin yerine koyar; sıralama verilirse uygulanır */
export function upsertById<T extends WithId>(list: T[], item: T, sort?: (a: T, b: T) => number): T[] {
  const exists = list.some((x) => x.id === item.id);
  const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
  return sort ? next.sort(sort) : next;
}

export const removeById = <T extends WithId>(list: T[], id: string): T[] => list.filter((x) => x.id !== id);

/**
 * Başarısız bulut yazımının geri alınması: yeni kayıt listeden çıkar, düzenleme önceki haline döner.
 * (Bu arada başka bir değişiklikle kayıt silinmişse geri getirilmez.)
 */
export function rollbackUpsert<T extends WithId>(list: T[], id: string, previous: T | undefined): T[] {
  if (!previous) return removeById(list, id);
  return list.map((x) => (x.id === id ? previous : x));
}

/** Başarısız bulut silmesinin geri alınması: kayıt listede yoksa geri eklenir */
export function restoreDeleted<T extends WithId>(list: T[], item: T | undefined, sort?: (a: T, b: T) => number): T[] {
  if (!item || list.some((x) => x.id === item.id)) return list;
  const next = [...list, item];
  return sort ? next.sort(sort) : next;
}

/** Tanımsız değerli alanlar düşer (Firestore ve JSON'da "alan yok" ile "undefined" aynı olsun) */
export const dropUndefined = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * İşlem kaydı hazırlığı. Düzenlemede mevcut kayıt + formdan gelen değerler birleşir; formun
 * bilerek boşalttığı (undefined gönderdiği) alanlar kayıttan düşer.
 */
export function prepareTradeSave(
  list: Trade[],
  data: Partial<Trade> & { id?: string; createdAt?: number },
  now: number,
  newId: () => string,
): { trade: Trade; isNew: boolean; previous: Trade | undefined } {
  const previous = data.id ? list.find((t) => t.id === data.id) : undefined;
  const id = data.id || newId();
  const isNew = !previous;
  const merged = isNew ? { ...data, id, createdAt: data.createdAt || now } : { ...previous, ...data, id };
  return { trade: dropUndefined(merged) as Trade, isNew, previous };
}

/**
 * Günlük kaydı hazırlığı. "Yeni mi" kimliğin verilip verilmediğine değil kaydın listede olup
 * olmadığına bakar: sabit kimlikli kayıtlar (haftalık değerlendirme) ilk kez eklenirken listeye girer.
 * Var olan kaydın oluşturulma zamanı korunur, güncelleme zamanı yenilenir.
 */
export function prepareJournalSave(
  list: JournalEntry[],
  data: Partial<JournalEntry> & { id?: string },
  now: number,
  newId: () => string,
): { entry: JournalEntry; isNew: boolean; previous: JournalEntry | undefined } {
  const id = data.id || newId();
  const previous = list.find((j) => j.id === id);
  const entry = dropUndefined({
    ...data,
    ...(typeof data.title === 'string' ? { title: titleCase(data.title) } : {}),
    id,
    createdAt: previous?.createdAt || data.createdAt || now,
    updatedAt: now,
  }) as JournalEntry;
  return { entry, isNew: !previous, previous };
}

/** Not kaydı hazırlığı (kimlik yoksa yeni) */
export function prepareNoteSave(
  list: Note[],
  data: Note,
  newId: () => string,
): { note: Note; isNew: boolean; previous: Note | undefined } {
  const id = data.id || newId();
  const previous = list.find((n) => n.id === id);
  // Başlıkta her kelimenin ilk harfi büyük; içerik olduğu gibi kalır
  return { note: { ...data, title: titleCase(data.title), id }, isNew: !previous, previous };
}

/**
 * Bulut anlık görüntüsü ile yerel listenin birleştirilmesi.
 * - İlk sunucu görüntüsünde: yerelde olup bulutta olmayan kayıtlar korunur ve buluta yüklenmek üzere döner.
 * - Sonrasında bulut tek doğru kaynaktır; yalnızca yazımı hâlâ süren kayıtlar korunur
 *   (başka cihazda silinen kayıt bu cihazdan geri yüklenmez).
 */
export function mergeCloudSnapshot<T extends WithId>(
  cloud: T[],
  local: T[],
  opts: { initial: boolean; pendingIds: ReadonlySet<string>; sort: (a: T, b: T) => number },
): { list: T[]; toUpload: T[] } {
  const cloudIds = new Set(cloud.map((x) => x.id));
  const localOnly = local.filter((x) => !cloudIds.has(x.id));
  const keep = opts.initial ? localOnly : localOnly.filter((x) => opts.pendingIds.has(x.id));
  return { list: [...cloud, ...keep].sort(opts.sort), toUpload: opts.initial ? localOnly : [] };
}

/* ---------- okuma onarımı (yerel kopya, bulut, yedek) ---------- */

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const ts = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
const MOODS = ['excellent', 'good', 'neutral', 'bad', 'terrible'] as const;

/** Bozuk / eksik alanlı not kaydını onarır; kimliği yoksa null (liste ve sıralama çökmesin) */
export function normalizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const createdAt = ts(r.createdAt, 0);
  const updatedAt = ts(r.updatedAt, createdAt);
  return dropUndefined({
    id: r.id,
    title: titleCase(str(r.title)),
    content: str(r.content),
    createdAt: createdAt || updatedAt,
    updatedAt,
    isPinned: r.isPinned === true ? true : undefined,
  });
}

/** Bozuk / eksik alanlı günlük kaydını onarır; kimliği ya da geçerli tarihi yoksa null */
export function normalizeJournal(raw: unknown): JournalEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const createdAt = ts(r.createdAt, 0);
  const updatedAt = ts(r.updatedAt, createdAt);
  const w = r.weekly && typeof r.weekly === 'object' ? (r.weekly as Record<string, unknown>) : null;
  return dropUndefined({
    id: r.id,
    date: r.date,
    title: titleCase(str(r.title)),
    content: str(r.content),
    mood: MOODS.includes(r.mood as (typeof MOODS)[number]) ? (r.mood as JournalEntry['mood']) : undefined,
    tags: Array.isArray(r.tags) ? r.tags.filter((x): x is string => typeof x === 'string') : undefined,
    isFavorite: r.isFavorite === true ? true : undefined,
    weekly: w ? { good: str(w.good), avoid: str(w.avoid), focus: str(w.focus) } : undefined,
    createdAt: createdAt || updatedAt,
    updatedAt,
  });
}

export const normalizeNotes = (v: unknown): Note[] =>
  Array.isArray(v) ? v.map(normalizeNote).filter((x): x is Note => x !== null) : [];
export const normalizeJournals = (v: unknown): JournalEntry[] =>
  Array.isArray(v) ? v.map(normalizeJournal).filter((x): x is JournalEntry => x !== null) : [];
