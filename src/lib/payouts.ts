import type { Payout } from '../types';
import { titleCase } from '../constants/constants';

/**
 * Payout kayıtları: Prop sekmesinde yalnızca alınan payout'lar tutulur (tarih, tutar, firma, not).
 * Yerelde PAYOUTS_KEY, bulutta ayar belgesinin `payouts` alanı.
 */
export const PAYOUTS_KEY = 'tj_payouts';
/** Eski prop hesap takibinin yerel anahtarı: yalnızca içindeki payout'ları taşımak için okunur (silinmez) */
export const LEGACY_PROP_ACCOUNTS_KEY = 'tj_prop_accounts';
/** Bulut kuralındaki liste sınırıyla aynı */
export const MAX_PAYOUTS = 2000;

export const newPayoutId = () => `po_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** Ham listeyi doğrular: geçersiz tarih / tutar / firması olmayan kayıtlar atılır, aynı kimlik bir kez kalır. */
export function sanitizePayouts(raw: unknown): Payout[] {
  if (!Array.isArray(raw)) return [];
  const out: Payout[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    const amount = Number(r.amount);
    const firm = titleCase(text(r.firm, 120));
    if (!isDateKey(r.date) || !Number.isFinite(amount) || amount <= 0 || !firm) continue;
    const id = text(r.id, 128) || newPayoutId();
    if (seen.has(id)) continue;
    seen.add(id);
    const createdAt = Number(r.createdAt);
    out.push({
      id,
      date: r.date,
      amount: Math.round(amount * 100) / 100,
      firm,
      note: text(r.note, 2000),
      createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    });
    if (out.length >= MAX_PAYOUTS) break;
  }
  return sortPayouts(out);
}

/** Yeniden eskiye (tarih, sonra giriliş sırası) */
export function sortPayouts(list: Payout[]): Payout[] {
  return [...list].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.createdAt - a.createdAt));
}

/**
 * Eski prop hesaplarındaki payout sertifikaları → payout listesi. Firma: hesabın firması, yoksa zincir / hesap adı.
 * Kimlik sertifikanınki: taşıma birden çok kez çalışsa da kayıt çoğalmaz.
 */
export function payoutsFromLegacyAccounts(raw: unknown): Payout[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object' || !Array.isArray((a as any).certificates)) continue;
    const acc = a as Record<string, any>;
    const firm = text(acc.firm, 120) || text(acc.chainName, 120) || text(acc.name, 120) || 'Prop';
    for (const c of acc.certificates) {
      if (!c || c.kind !== 'PAYOUT') continue;
      out.push({ id: c.id, date: c.date, amount: c.amount, firm, note: c.note, createdAt: c.createdAt });
    }
  }
  return sanitizePayouts(out);
}

/** Yerel payout listesi; hiç kaydedilmemişse eski prop hesaplarından taşınır (migrated = true → kaydedilmeli) */
export function loadPayouts(): { list: Payout[]; migrated: boolean } {
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    if (raw !== null) return { list: sanitizePayouts(JSON.parse(raw)), migrated: false };
    const legacy = localStorage.getItem(LEGACY_PROP_ACCOUNTS_KEY);
    const list = legacy ? payoutsFromLegacyAccounts(JSON.parse(legacy)) : [];
    return { list, migrated: list.length > 0 };
  } catch {
    return { list: [], migrated: false };
  }
}

/** İki listeyi kimliğe göre birleştirir (incoming aynı kimliği ezer) */
export function mergePayouts(base: Payout[], incoming: Payout[]): Payout[] {
  const ids = new Set(incoming.map((p) => p.id));
  return sanitizePayouts([...incoming, ...base.filter((p) => !ids.has(p.id))]);
}

export interface PayoutGroup {
  key: string;
  total: number;
  count: number;
}

export interface PayoutSummary {
  total: number;
  count: number;
  average: number;
  largest: number;
  /** Yıla göre (yeniden eskiye) */
  byYear: PayoutGroup[];
  /** Firmaya göre (toplamı büyükten küçüğe) */
  byFirm: PayoutGroup[];
  /** Ay anahtarı YYYY-MM (yeniden eskiye) */
  byMonth: PayoutGroup[];
  lastDate: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function groupBy(list: Payout[], keyOf: (p: Payout) => string): PayoutGroup[] {
  const m = new Map<string, PayoutGroup>();
  for (const p of list) {
    const k = keyOf(p);
    const g = m.get(k) || { key: k, total: 0, count: 0 };
    g.total = round2(g.total + p.amount);
    g.count += 1;
    m.set(k, g);
  }
  return [...m.values()];
}

export function summarizePayouts(list: Payout[]): PayoutSummary {
  const total = round2(list.reduce((s, p) => s + p.amount, 0));
  const count = list.length;
  const byFirm = groupBy(list, (p) => p.firm).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key, 'tr'));
  const desc = (a: PayoutGroup, b: PayoutGroup) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0);
  return {
    total,
    count,
    average: count ? round2(total / count) : 0,
    largest: count ? Math.max(...list.map((p) => p.amount)) : 0,
    byYear: groupBy(list, (p) => p.date.slice(0, 4)).sort(desc),
    byFirm,
    byMonth: groupBy(list, (p) => p.date.slice(0, 7)).sort(desc),
    lastDate: count ? list.reduce((m, p) => (p.date > m ? p.date : m), list[0].date) : null,
  };
}
