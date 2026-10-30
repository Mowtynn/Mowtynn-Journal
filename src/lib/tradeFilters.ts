import { Trade, AccountCategory, PropAccount } from '../types';
import { inScope } from './accountScope';
import { normalizeSearchString } from '../constants/constants';
import { canonicalAsset } from './tradeModel';

/** Varsayılan tarih aralığı: tüm zamanlar (sayılar üst menüdeki hesap sayılarıyla tutarlı kalsın) */
export const DEFAULT_DATE_LIMIT = "all";

/** Tarih filtresinin alt sınırı ("all" → 0) */
export const getMinTimestamp = (limit: string, now: number = Date.now()): number => {
  switch (limit) {
    case "1w":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "1m":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "3m":
      return now - 90 * 24 * 60 * 60 * 1000;
    case "6m":
      return now - 180 * 24 * 60 * 60 * 1000;
    case "1y":
      return now - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0; // "all"
  }
};

/** Sonradan eklenen alanların filtreleri (Asia Range, News day, P/D, TP target, Asia FVG, risk %, hızlı kayıt) */
export interface ExtraTradeFilters {
  /** Range / Trend / Swept */
  asiaRanges: string[];
  premiumDiscounts: string[];
  tpTargets: string[];
  asiaRangeFvgs: string[];
  /** ALL = hepsi, YES = haber günü, NO = haber yok (girilmemişler YES/NO'da elenir) */
  newsDay: 'ALL' | 'YES' | 'NO';
  riskPcts: number[];
  /** Yalnızca hızlı kayıtla girilip ayrıntısı tamamlanmamış işlemler */
  onlyIncomplete: boolean;
}

export const EMPTY_EXTRA_FILTERS: ExtraTradeFilters = {
  asiaRanges: [],
  premiumDiscounts: [],
  tpTargets: [],
  asiaRangeFvgs: [],
  newsDay: 'ALL',
  riskPcts: [],
  onlyIncomplete: false,
};

/** Kalıcı depodan gelen değeri güvenli hale getirir */
export function sanitizeExtraFilters(v: any): ExtraTradeFilters {
  const strs = (x: any) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()) : []);
  return {
    asiaRanges: strs(v?.asiaRanges),
    premiumDiscounts: strs(v?.premiumDiscounts),
    tpTargets: strs(v?.tpTargets),
    asiaRangeFvgs: strs(v?.asiaRangeFvgs),
    newsDay: v?.newsDay === 'YES' || v?.newsDay === 'NO' ? v.newsDay : 'ALL',
    riskPcts: Array.isArray(v?.riskPcts) ? v.riskPcts.filter((n: any) => typeof n === 'number' && Number.isFinite(n) && n > 0) : [],
    onlyIncomplete: v?.onlyIncomplete === true,
  };
}

/** Kaç ek filtre etkin (rozet sayısı için) */
export function countExtraFilters(e: ExtraTradeFilters | undefined): number {
  if (!e) return 0;
  return (
    (e.asiaRanges.length ? 1 : 0) +
    (e.premiumDiscounts.length ? 1 : 0) +
    (e.tpTargets.length ? 1 : 0) +
    (e.asiaRangeFvgs.length ? 1 : 0) +
    (e.newsDay !== 'ALL' ? 1 : 0) +
    (e.riskPcts.length ? 1 : 0) +
    (e.onlyIncomplete ? 1 : 0)
  );
}

/** Risk yüzdelerini kıyaslamak için (0.5 ile 0.50 aynı) */
const riskKey = (n: number) => Math.round(n * 1000) / 1000;

export interface GlobalTradeFilters {
  activeAccountCategory: AccountCategory;
  /** Üst seçicide tek prop hesabı seçiliyse o hesap (kategori filtresinin yerine geçer) */
  activeAccount?: PropAccount | null;
  /** "Bağlı hesabı yok" seçiliyse tüm prop hesapları (bunlardan hiçbirine ait olmayanlar kalır) */
  activeUnlinkedOf?: PropAccount[] | null;
  globalSelectedConfirmations: string[];
  globalSelectedPlanFidelity: string[];
  globalDateLimit: string;
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedTimeframes: string[];
  globalSelectedHtfTimeframes: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalSelectedEntryModels: string[];
  globalSelectedTrendTypes: string[];
  globalMinAsiaRangePips: number | undefined;
  globalMaxAsiaRangePips: number | undefined;
  globalMinMaePips: number | undefined;
  globalMaxMaePips: number | undefined;
  globalMinMfePips: number | undefined;
  globalMaxMfePips: number | undefined;
  /** İsteğe bağlı: sonradan eklenen alanların filtreleri */
  globalExtra?: ExtraTradeFilters;
}

/**
 * Üst filtreler (hesap kapsamı, tarih, parite, seans, …) — App'teki listenin tek kaynağı.
 * Saf fonksiyon: aynı girdi her zaman aynı sonucu verir (testlerde `now` sabitlenir).
 */
export function applyGlobalFilters(trades: Trade[], filters: GlobalTradeFilters, now: number = Date.now()): Trade[] {
  const {
    activeAccountCategory,
    activeAccount = null,
    activeUnlinkedOf = null,
    globalSelectedConfirmations,
    globalSelectedPlanFidelity,
    globalDateLimit,
    globalSelectedAssets,
    globalSelectedSessions,
    globalSelectedTimeframes,
    globalSelectedHtfTimeframes,
    globalSelectedStatuses,
    globalSelectedTypes,
    globalSelectedEntryModels,
    globalSelectedTrendTypes,
    globalMinAsiaRangePips,
    globalMaxAsiaRangePips,
    globalMinMaePips,
    globalMaxMaePips,
    globalMinMfePips,
    globalMaxMfePips,
    globalExtra,
  } = filters;
    const extra = globalExtra || EMPTY_EXTRA_FILTERS;
    const minTime = getMinTimestamp(globalDateLimit, now);

    const hasConfirmations = globalSelectedConfirmations.length > 0;
    const hasPlanFidelity = globalSelectedPlanFidelity.length > 0;
    const hasAssets = globalSelectedAssets.length > 0;
    const hasSessions = globalSelectedSessions.length > 0;
    const hasTimeframes = globalSelectedTimeframes.length > 0;
    const hasHtfTimeframes = globalSelectedHtfTimeframes.length > 0;
    const hasStatuses = globalSelectedStatuses.length > 0;
    const hasTypes = globalSelectedTypes.length > 0;
    const hasEntryModels = globalSelectedEntryModels.length > 0;
    const hasTrendTypes = globalSelectedTrendTypes.length > 0;
    const hasMinAsia = globalMinAsiaRangePips !== undefined;
    const hasMaxAsia = globalMaxAsiaRangePips !== undefined;
    const hasMinMae = globalMinMaePips !== undefined;
    const hasMaxMae = globalMaxMaePips !== undefined;
    const hasMinMfe = globalMinMfePips !== undefined;
    const hasMaxMfe = globalMaxMfePips !== undefined;
    // Kapsam her zaman uygulanır: TÜMÜ de hesapsız işlemleri dışarıda bırakır
    const hasCategory = true;
    const hasMinTime = minTime > 0;
    const hasExtra = countExtraFilters(extra) > 0;

    const hasAnyFilter =
      hasConfirmations ||
      hasPlanFidelity ||
      hasAssets ||
      hasSessions ||
      hasTimeframes ||
      hasHtfTimeframes ||
      hasStatuses ||
      hasTypes ||
      hasEntryModels ||
      hasTrendTypes ||
      hasMinAsia ||
      hasMaxAsia ||
      hasMinMae ||
      hasMaxMae ||
      hasMinMfe ||
      hasMaxMfe ||
      hasCategory ||
      hasMinTime ||
      hasExtra;

    if (!hasAnyFilter) {
      return trades;
    }

    const confirmationSet = hasConfirmations ? new Set(globalSelectedConfirmations.map(normalizeSearchString)) : null;
    const planFidelitySet = hasPlanFidelity ? new Set(globalSelectedPlanFidelity.map(normalizeSearchString)) : null;
    const assetSet = hasAssets ? new Set(globalSelectedAssets.map(canonicalAsset)) : null;
    const sessionSet = hasSessions ? new Set(globalSelectedSessions.map(normalizeSearchString)) : null;
    const timeframeSet = hasTimeframes ? new Set(globalSelectedTimeframes.map(normalizeSearchString)) : null;
    const htfTimeframeSet = hasHtfTimeframes ? new Set(globalSelectedHtfTimeframes.map(normalizeSearchString)) : null;
    const statusSet = hasStatuses ? new Set(globalSelectedStatuses.map(normalizeSearchString)) : null;
    const typeSet = hasTypes ? new Set(globalSelectedTypes.map(normalizeSearchString)) : null;
    const entrySet = hasEntryModels ? new Set(globalSelectedEntryModels.map(normalizeSearchString)) : null;
    const trendSet = hasTrendTypes ? new Set(globalSelectedTrendTypes.map(normalizeSearchString)) : null;
    const asiaRangeSet = extra.asiaRanges.length ? new Set(extra.asiaRanges.map(normalizeSearchString)) : null;
    const pdSet = extra.premiumDiscounts.length ? new Set(extra.premiumDiscounts.map(normalizeSearchString)) : null;
    const tpSet = extra.tpTargets.length ? new Set(extra.tpTargets.map(normalizeSearchString)) : null;
    const fvgSet = extra.asiaRangeFvgs.length ? new Set(extra.asiaRangeFvgs.map(normalizeSearchString)) : null;
    const riskSet = extra.riskPcts.length ? new Set(extra.riskPcts.map(riskKey)) : null;

    return trades.filter((t: Trade) => {
      // 1. Numeric and temporal checks first (fastest)
      if (hasMinTime && (!t.createdAt || t.createdAt < minTime)) {
        return false;
      }
      if (hasMinAsia) {
        if (t.asiaRangePips === undefined || t.asiaRangePips === null || t.asiaRangePips < globalMinAsiaRangePips!) {
          return false;
        }
      }
      if (hasMaxAsia) {
        if (t.asiaRangePips === undefined || t.asiaRangePips === null || t.asiaRangePips > globalMaxAsiaRangePips!) {
          return false;
        }
      }
      if (hasMinMae) {
        if (t.maePips === undefined || t.maePips === null || t.maePips < globalMinMaePips!) {
          return false;
        }
      }
      if (hasMaxMae) {
        if (t.maePips === undefined || t.maePips === null || t.maePips > globalMaxMaePips!) {
          return false;
        }
      }
      if (hasMinMfe) {
        if (t.mfePips === undefined || t.mfePips === null || t.mfePips < globalMinMfePips!) {
          return false;
        }
      }
      if (hasMaxMfe) {
        if (t.mfePips === undefined || t.mfePips === null || t.mfePips > globalMaxMfePips!) {
          return false;
        }
      }
      if (hasCategory && !inScope(t, activeAccountCategory, activeAccount, activeUnlinkedOf)) {
        return false;
      }
      // 2. Simple enum string checks
      if (statusSet && (!t.status || !statusSet.has(normalizeSearchString(t.status)))) {
        return false;
      }
      if (typeSet && (!t.type || !typeSet.has(normalizeSearchString(t.type)))) {
        return false;
      }
      // 3. String & array lookups
      if (assetSet && (!t.asset || !assetSet.has(canonicalAsset(t.asset)))) {
        return false;
      }
      if (sessionSet && (!t.session || !sessionSet.has(normalizeSearchString(t.session)))) {
        return false;
      }
      if (timeframeSet && (!t.timeframe || !timeframeSet.has(normalizeSearchString(t.timeframe)))) {
        return false;
      }
      if (htfTimeframeSet && (!t.htfTimeframe || !htfTimeframeSet.has(normalizeSearchString(t.htfTimeframe)))) {
        return false;
      }
      if (planFidelitySet && (!t.planFidelity || !planFidelitySet.has(normalizeSearchString(t.planFidelity)))) {
        return false;
      }
      if (trendSet && (!t.trend || !trendSet.has(normalizeSearchString(t.trend)))) {
        return false;
      }
      if (confirmationSet && (!t.confirmations || !t.confirmations.some(tc => confirmationSet.has(normalizeSearchString(tc))))) {
        return false;
      }
      if (entrySet) {
        if (!t.entryModels || !t.entryModels.some(em => entrySet.has(normalizeSearchString(em)))) return false;
      }
      // 4. Sonradan eklenen alanlar
      if (extra.onlyIncomplete && t.quickEntry !== true) return false;
      if (extra.newsDay !== 'ALL' && t.newsDay !== (extra.newsDay === 'YES')) return false;
      if (asiaRangeSet && (!t.asiaRange || !asiaRangeSet.has(normalizeSearchString(t.asiaRange)))) return false;
      if (pdSet && (!t.premiumDiscount || !pdSet.has(normalizeSearchString(t.premiumDiscount)))) return false;
      if (fvgSet && (!t.asiaRangeFvg || !fvgSet.has(normalizeSearchString(t.asiaRangeFvg)))) return false;
      if (tpSet && (!t.tpTargets || !t.tpTargets.some((x) => tpSet.has(normalizeSearchString(x))))) return false;
      if (riskSet && (typeof t.riskPct !== 'number' || !riskSet.has(riskKey(t.riskPct)))) return false;
      return true;
    });
}
