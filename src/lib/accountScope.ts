import type { AccountCategory, PropAccount, Trade } from '../types';
import { getTradeAccountCategory, ACCOUNT_CATEGORY_LABELS } from '../constants/constants';
import { tradeBelongsTo } from './propAccounts';

/**
 * Hesap kapsamı — üst çubuktaki seçici (TÜMÜ / CHALLENGE / FUNDED / HESAPSIZ + tek prop hesabı).
 * TÜMÜ yalnızca prop hesaplarını (Challenge + Funded) kapsar; hesapsız işlemler ayrı tutulur.
 * Tek kaynak: işlem listesi, analiz, günlük ve haftalık değerlendirme aynı kapsamı kullanır.
 * Hesapsız işlemler hiçbir prop kapsamına karışmaz; tek hesap seçiliyse yalnızca o hesabın işlemleri sayılır.
 */

export interface AccountScope {
  category: AccountCategory;
  /** Yalnızca CHALLENGE / FUNDED altında: seçili prop hesabı (PropAccount.id) */
  accountId: string | null;
}


/**
 * Kategoride olup hiçbir mevcut prop hesabına bağlanamayan işlemler (eski kayıtlar, silinmiş hesaplar).
 * Seçicide "Bağlı hesabı yok" olarak ayrı listelenir; böylece kategori toplamı alt satırların toplamına eşit olur.
 */
export const UNLINKED = '__unlinked';

/** Çözümlenmiş kapsam: tek hesap, ya da kategorinin bağsız işlemleri, ya da kategorinin tamamı */
export interface ResolvedScope {
  scope: AccountScope;
  account: PropAccount | null;
  /** Bağsız işlemler seçiliyse kategorideki tüm hesaplar (bunlara ait olmayanlar kapsamdadır) */
  unlinkedOf: PropAccount[] | null;
}

/** Hesabın kategorisi: Funded aşaması FUNDED, değerlendirme aşamaları CHALLENGE */
export const accountCategoryOf = (a: Pick<PropAccount, 'stage'>): 'FUNDED' | 'CHALLENGE' => (a.stage === 0 ? 'FUNDED' : 'CHALLENGE');

/**
 * Kayıtlı kapsamı mevcut hesaplarla doğrular: silinmiş ya da kategorisi uyuşmayan hesap seçiliyse
 * kategori düzeyine düşer (ör. "FUNDED · silinmiş hesap" → "FUNDED").
 */
export function resolveScope(scope: AccountScope, accounts: PropAccount[]): ResolvedScope {
  const categoryOnly = { scope: { category: scope.category, accountId: null }, account: null, unlinkedOf: null };
  if (!scope.accountId) return categoryOnly;
  if (scope.accountId === UNLINKED) {
    if (scope.category !== 'CHALLENGE' && scope.category !== 'FUNDED') return categoryOnly;
    return { scope: { category: scope.category, accountId: UNLINKED }, account: null, unlinkedOf: accounts };
  }
  const account = accounts.find((a) => a.id === scope.accountId) || null;
  if (!account || (scope.category !== 'ALL' && accountCategoryOf(account) !== scope.category)) return categoryOnly;
  return { scope: { category: accountCategoryOf(account), accountId: account.id }, account, unlinkedOf: null };
}

/** Bir işlem bu kapsamda mı? (hesap seçiliyse kesin hesap eşleşmesi, bağsızlar seçiliyse hiçbir hesaba ait olmayanlar, değilse kategori) */
export function inScope(t: Trade, category: AccountCategory, account: PropAccount | null, unlinkedOf: PropAccount[] | null = null): boolean {
  if (account) return tradeBelongsTo(t, account);
  const cat = getTradeAccountCategory(t);
  // TÜMÜ = tüm prop hesapları (Challenge + Funded). Hesapsız işlemler yalnızca HESAPSIZ bilinçli seçilince görünür.
  if (category === 'ALL') return cat !== 'DEMO';
  if (cat !== category) return false;
  if (unlinkedOf) return !unlinkedOf.some((a) => tradeBelongsTo(t, a));
  return true;
}

export function scopeTrades(trades: Trade[], category: AccountCategory, account: PropAccount | null, unlinkedOf: PropAccount[] | null = null): Trade[] {
  return trades.filter((t) => inScope(t, category, account, unlinkedOf));
}

/**
 * Kalıcı anahtar (haftalık değerlendirme kaydının kimliğinde kullanılır).
 * TÜMÜ için boş: eski kayıtlar (weekly-<pazartesi>) olduğu gibi TÜMÜ kapsamına ait kalır.
 */
export function scopeKey(category: AccountCategory, accountId: string | null): string {
  if (accountId === UNLINKED) return `${category.toLowerCase()}_unlinked`;
  if (accountId) return `acc_${accountId}`;
  if (category === 'ALL') return '';
  return category.toLowerCase();
}

/** Ekranda gösterilen ad: "Tüm prop hesapları", "Funded", "Funded · FTMO 100K #3" */
export function scopeLabel(category: AccountCategory, account: PropAccount | null, unlinked = false): string {
  if (unlinked && category !== 'ALL') return `${ACCOUNT_CATEGORY_LABELS[category]} · Bağlı Hesabı Yok`;
  if (account) return `${ACCOUNT_CATEGORY_LABELS[accountCategoryOf(account)]} · ${account.chainName || account.name}`;
  if (category === 'ALL') return 'Tüm Prop Hesapları';
  return ACCOUNT_CATEGORY_LABELS[category];
}

export interface ScopeAccountRow {
  account: PropAccount;
  count: number;
}

export interface ScopeCategoryRows {
  rows: ScopeAccountRow[];
  /** Kategoride olup hiçbir hesaba bağlanamayan işlem sayısı */
  unlinked: number;
}

/**
 * Seçicide listelenecek hesaplar (kategoriye göre): aktifler önce, sonra son etkinliğe göre.
 * İşlemi olmayan kapanmış hesaplar gösterilmez (listeyi kalabalıklaştırmasın).
 */
export function scopeAccountRows(accounts: PropAccount[], trades: Trade[], category: 'FUNDED' | 'CHALLENGE'): ScopeCategoryRows {
  const inCategory = trades.filter((t) => getTradeAccountCategory(t) === category);
  const rows = accounts
    .filter((a) => accountCategoryOf(a) === category)
    .map((account) => ({ account, count: trades.reduce((n, t) => n + (tradeBelongsTo(t, account) ? 1 : 0), 0) }))
    .filter((r) => r.account.status === 'ACTIVE' || r.count > 0)
    .sort(
      (x, y) =>
        Number(y.account.status === 'ACTIVE') - Number(x.account.status === 'ACTIVE') ||
        (y.account.closedAt || y.account.createdAt) - (x.account.closedAt || x.account.createdAt),
    );
  const unlinked = inCategory.filter((t) => !accounts.some((a) => tradeBelongsTo(t, a))).length;
  return { rows, unlinked };
}
