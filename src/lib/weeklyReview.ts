import type { JournalEntry, Trade, WeeklyAnswers } from '../types';
import { nyDateKey, getNyParts } from './tradingTime';
import { analyzeDiscipline, type DisciplineRuleId } from './discipline';
import { dimensionValue, DEFAULT_SETUP_DIMENSIONS, UNSPECIFIED } from './setupScorecard';

/**
 * Haftalık değerlendirme — saf hesaplar (arayüzden bağımsız, test edilebilir).
 * Hafta = New York takvim günüyle Pazartesi–Pazar (projedeki tüm gün/saat hesaplarıyla aynı).
 * İstatistik saklanmaz: her açılışta işlemlerden yeniden hesaplanır; yalnızca kullanıcının cevapları
 * günlük kaydı olarak (sabit kimlik: weekly-<pazartesi>) tutulur.
 */

export const WEEKLY_TAG = 'haftalik';
/**
 * Kayıt kimliği: weekly-<pazartesi>[--<kapsam>]. TÜMÜ kapsamı ekisizdir (eski kayıtlarla uyumlu);
 * Challenge / Funded / Hesapsız ve tek hesap kendi değerlendirmesini ayrı tutar.
 */
export const weeklyEntryId = (weekStart: string, scope = '') => `weekly-${weekStart}${scope ? `--${scope}` : ''}`;

/** Kaydın kapsamı (kimlikten okunur; TÜMÜ için boş) */
export const weeklyEntryScope = (e: Pick<JournalEntry, 'id'>) => {
  const i = e.id.indexOf('--');
  return e.id.startsWith('weekly-') && i > 0 ? e.id.slice(i + 2) : '';
};

/* ---------- Takvim (YYYY-MM-DD üzerinde, saat diliminden bağımsız) ---------- */

const toUtc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
};
const fromUtc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
export const addDays = (key: string, n: number) => fromUtc(toUtc(key) + n * 86_400_000);

/** Verilen NY gününün haftasının Pazartesi'si */
export function weekStartOf(dateKey: string): string {
  const dow = new Date(toUtc(dateKey)).getUTCDay(); // 0 = Pazar
  return addDays(dateKey, dow === 0 ? -6 : 1 - dow);
}

/** Şu anın (NY) haftasının Pazartesi'si */
export const currentWeekStart = (now = Date.now()) => weekStartOf(nyDateKey(now));

/** Haftanın 7 günü (Pzt…Paz) */
export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
/** "20–26 Eki 2026" / "27 Eki – 2 Kas 2026" */
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const [y1, m1, d1] = weekStart.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  if (m1 === m2 && y1 === y2) return `${d1}–${d2} ${MONTHS_TR[m2 - 1]} ${y2}`;
  return `${d1} ${MONTHS_TR[m1 - 1]} – ${d2} ${MONTHS_TR[m2 - 1]} ${y2}`;
}

/* ---------- İstatistik ---------- */

const rOf = (t: Trade) => (typeof t.rr === 'number' && Number.isFinite(t.rr) ? t.rr : 0);

export interface WeekTotals {
  n: number;
  netR: number;
  wins: number;
  losses: number;
  breakevens: number;
  /** Kazanma oranı (%) — projedeki tanımla aynı: kazanç / tüm işlemler */
  winRate: number;
  expectancy: number;
}

const totals = (list: Trade[]): WeekTotals => {
  const n = list.length;
  const netR = list.reduce((s, t) => s + rOf(t), 0);
  const wins = list.filter((t) => t.status === 'WIN').length;
  const losses = list.filter((t) => t.status === 'LOSS').length;
  return {
    n,
    netR,
    wins,
    losses,
    breakevens: n - wins - losses,
    winRate: n ? (wins / n) * 100 : 0,
    expectancy: n ? netR / n : 0,
  };
};

export interface WeekDay {
  key: string;
  /** 0 = Pazartesi … 6 = Pazar */
  index: number;
  n: number;
  netR: number;
}

export interface WeekSetup {
  label: string;
  n: number;
  netR: number;
}

export interface WeekViolation {
  id: DisciplineRuleId;
  title: string;
  count: number;
  costR: number;
  tradeIds: string[];
}

export interface WeekReview {
  weekStart: string;
  label: string;
  trades: Trade[];
  totals: WeekTotals;
  previous: WeekTotals;
  days: WeekDay[];
  best: WeekSetup | null;
  worst: WeekSetup | null;
  violations: WeekViolation[];
  cleanCount: number;
}

const setupLabel = (t: Trade) => {
  const parts = DEFAULT_SETUP_DIMENSIONS.map((d) => dimensionValue(t, d)).filter((v) => v && v !== UNSPECIFIED);
  return parts.length ? parts.join(' · ') : '';
};

/** Haftanın tüm istatistikleri. Disiplin ihlalleri tüm geçmişle değerlendirilir (gün içi sayaçlar doğru kalsın), sonra haftaya süzülür. */
export function computeWeekReview(allTrades: Trade[], weekStart: string): WeekReview {
  const days = weekDays(weekStart);
  const inWeek = new Set(days);
  const prevDays = new Set(weekDays(addDays(weekStart, -7)));
  const trades = allTrades.filter((t) => inWeek.has(nyDateKey(t.createdAt))).sort((a, b) => a.createdAt - b.createdAt);
  const prevTrades = allTrades.filter((t) => prevDays.has(nyDateKey(t.createdAt)));

  const dayRows: WeekDay[] = days.map((key, index) => {
    const list = trades.filter((t) => nyDateKey(t.createdAt) === key);
    return { key, index, n: list.length, netR: list.reduce((s, t) => s + rOf(t), 0) };
  });

  // Kurulumlar (strateji · seans · giriş modeli) — haftalık R'ye göre en iyi / en kötü
  const groups = new Map<string, WeekSetup>();
  trades.forEach((t) => {
    const label = setupLabel(t);
    if (!label) return;
    const g = groups.get(label) || { label, n: 0, netR: 0 };
    g.n += 1;
    g.netR += rOf(t);
    groups.set(label, g);
  });
  const ranked = [...groups.values()].sort((a, b) => b.netR - a.netR || b.n - a.n);
  const best = ranked.length && ranked[0].netR > 0 ? ranked[0] : null;
  const worstCandidate = ranked.length ? ranked[ranked.length - 1] : null;
  const worst = worstCandidate && worstCandidate.netR < 0 ? worstCandidate : null;

  const weekIds = new Set(trades.map((t) => t.id));
  const report = analyzeDiscipline(allTrades);
  const violatingIds = new Set<string>();
  const violations: WeekViolation[] = report.rules
    .filter((r) => r.measurable)
    .map((r) => {
      const ids = r.tradeIds.filter((id) => weekIds.has(id));
      ids.forEach((id) => violatingIds.add(id));
      const costR = trades.filter((t) => ids.includes(t.id)).reduce((s, t) => s + rOf(t), 0);
      return { id: r.id, title: r.title, count: ids.length, costR, tradeIds: ids };
    })
    .filter((v) => v.count > 0);

  return {
    weekStart,
    label: weekLabel(weekStart),
    trades,
    totals: totals(trades),
    previous: totals(prevTrades),
    days: dayRows,
    best,
    worst,
    violations,
    cleanCount: trades.length - violatingIds.size,
  };
}

/* ---------- Kayıt ---------- */

export const isWeeklyEntry = (e: Pick<JournalEntry, 'id' | 'tags'>) =>
  e.id.startsWith('weekly-') || (Array.isArray(e.tags) && e.tags.includes(WEEKLY_TAG));

export const findWeeklyEntry = (entries: JournalEntry[], weekStart: string, scope = '') =>
  entries.find((e) => e.id === weeklyEntryId(weekStart, scope));

export const isAnswered = (a?: WeeklyAnswers | null) => !!a && !!(a.good.trim() || a.avoid.trim() || a.focus.trim());

/** Günlük kaydı: cevaplar yapısal alanda; içerik metni aramada ve dışa aktarımda okunur kalsın diye cevaplardan üretilir */
export function buildWeeklyEntry(
  weekStart: string,
  answers: WeeklyAnswers,
  existing?: JournalEntry,
  scope = '',
  scopeName = '',
): JournalEntry {
  const content = [
    `Bu hafta neyi iyi yaptım?\n${answers.good.trim() || '—'}`,
    `Neyi tekrar etmemeliyim?\n${answers.avoid.trim() || '—'}`,
    `Gelecek haftanın tek odağı\n${answers.focus.trim() || '—'}`,
  ].join('\n\n');
  return {
    ...(existing || {}),
    id: weeklyEntryId(weekStart, scope),
    date: weekStart,
    title: `Haftalık değerlendirme · ${scopeName ? `${scopeName} · ` : ''}${weekLabel(weekStart)}`,
    content,
    tags: [WEEKLY_TAG],
    weekly: { good: answers.good, avoid: answers.avoid, focus: answers.focus },
    createdAt: existing?.createdAt ?? 0,
    updatedAt: existing?.updatedAt ?? 0,
  } as JournalEntry;
}

/**
 * Hatırlatma: Cuma NY 17:00 sonrası ve hafta sonu, bu hafta (seçili kapsamda) işlem varsa ve
 * o kapsamın değerlendirmesi yazılmamışsa haftanın Pazartesi'si; aksi halde null.
 */
export function weeklyReviewDue(trades: Trade[], entries: JournalEntry[], now = Date.now(), scope = ''): string | null {
  const p = getNyParts(now);
  if (!p) return null;
  const afterFridayClose = (p.weekday === 5 && p.hour >= 17) || p.weekday === 6 || p.weekday === 0;
  if (!afterFridayClose) return null;
  const ws = weekStartOf(p.date);
  const days = new Set(weekDays(ws));
  const hasTrades = trades.some((t) => days.has(nyDateKey(t.createdAt)));
  if (!hasTrades) return null;
  return isAnswered(findWeeklyEntry(entries, ws, scope)?.weekly) ? null : ws;
}
