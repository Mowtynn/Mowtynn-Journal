import { Trade, AccountCategory } from '../types';
import { inScope } from './accountScope';
import { normalizeSearchString } from '../constants/constants';
import { canonicalAsset, tradeConfirmations } from './tradeModel';
import { dimensionValue, type SetupDimension } from './setupScorecard';

/** Global filtrede türetilmiş / yeni girdiler: değer, kurulum karnesindeki boyut değeriyle aynı (tek tanım) */
export const FILTER_DIMENSIONS = ['sweepHour', 'poiTimeframe', 'tradeOfDay', 'prevTrade', 'weekday'] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number] & SetupDimension;

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

/** Sonradan eklenen alanların filtreleri (Asia Range, Confirmations, hızlı kayıt) */
export interface ExtraTradeFilters {
  /** Range / Trend (eski kayıtlarda Swept) */
  asiaRanges: string[];
  premiumDiscounts: string[];
  /** Yalnızca hızlı kayıtla girilip ayrıntısı tamamlanmamış işlemler */
  onlyIncomplete: boolean;
  /** Türetilmiş boyut filtreleri (POI Sweep Saati, Günün İşlemi, Gün İçi Önceki İşlem, Gün) */
  dims: Partial<Record<FilterDimension, string[]>>;
}

export const EMPTY_EXTRA_FILTERS: ExtraTradeFilters = {
  asiaRanges: [],
  premiumDiscounts: [],
  onlyIncomplete: false,
  dims: {},
};

/** Kalıcı depodan gelen değeri güvenli hale getirir */
export function sanitizeExtraFilters(v: any): ExtraTradeFilters {
  const strs = (x: any) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()) : []);
  return {
    asiaRanges: strs(v?.asiaRanges),
    premiumDiscounts: strs(v?.premiumDiscounts),
    onlyIncomplete: v?.onlyIncomplete === true,
    dims: Object.fromEntries(
      FILTER_DIMENSIONS.map((d) => [d, strs(v?.dims?.[d])]).filter(([, list]) => (list as string[]).length),
    ) as ExtraTradeFilters['dims'],
  };
}

/** Kaç ek filtre etkin (rozet sayısı için) */
export function countExtraFilters(e: ExtraTradeFilters | undefined): number {
  if (!e) return 0;
  return (
    (e.asiaRanges.length ? 1 : 0) +
    (e.premiumDiscounts.length ? 1 : 0) +
    (e.onlyIncomplete ? 1 : 0) +
    Object.values(e.dims || {}).filter((l) => l && l.length).length
  );
}

export interface GlobalTradeFilters {
  /** Üst seçici: Prop ya da Hesapsız */
  activeAccountCategory: AccountCategory;
  globalSelectedPlanFidelity: string[];
  globalDateLimit: string;
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalSelectedTrendTypes: string[];
  /** İsteğe bağlı: sonradan eklenen alanların filtreleri */
  globalExtra?: ExtraTradeFilters;
}

/**
 * Üst filtreler (hesap kapsamı, tarih, parite, seans, …) — App'teki listenin tek kaynağı.
 * Saf fonksiyon: aynı girdi her zaman aynı sonucu verir (testlerde `now` sabitlenir).
 */
const isAnalyzable = (t: Trade): boolean =>
  Number.isFinite(t.createdAt) &&
  (t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAKEVEN') &&
  (t.type === 'LONG' || t.type === 'SHORT');

export function applyGlobalFilters(trades: Trade[], filters: GlobalTradeFilters, now: number = Date.now()): Trade[] {
  const {
    activeAccountCategory,
    globalSelectedPlanFidelity,
    globalDateLimit,
    globalSelectedAssets,
    globalSelectedSessions,
    globalSelectedStatuses,
    globalSelectedTypes,
    globalSelectedTrendTypes,
    globalExtra,
  } = filters;
    const extra = globalExtra || EMPTY_EXTRA_FILTERS;
    const minTime = getMinTimestamp(globalDateLimit, now);

    const hasPlanFidelity = globalSelectedPlanFidelity.length > 0;
    const hasAssets = globalSelectedAssets.length > 0;
    const hasSessions = globalSelectedSessions.length > 0;
    const hasStatuses = globalSelectedStatuses.length > 0;
    const hasTypes = globalSelectedTypes.length > 0;
    const hasTrendTypes = globalSelectedTrendTypes.length > 0;
    // Kapsam her zaman uygulanır: Prop ve Hesapsız işlemler birbirine karışmaz
    const hasCategory = true;
    const hasMinTime = minTime > 0;
    const hasExtra = countExtraFilters(extra) > 0;

    const hasAnyFilter =
      hasPlanFidelity ||
      hasAssets ||
      hasSessions ||
      hasStatuses ||
      hasTypes ||
      hasTrendTypes ||
      hasCategory ||
      hasMinTime ||
      hasExtra;

    // Giriş zamanı, durumu ya da yönü bozuk kayıt (Yedek Kurtarma'da onarılır) analizlere girmez: sıralamayı ve eğriyi
    // NaN ile bozmasın; net R'ye girip WR / Long-Short toplamlarına girmeyen "yarım" kayıt metrikleri tutarsızlaştırmasın.
    const timed = trades.every(isAnalyzable) ? trades : trades.filter(isAnalyzable);
    if (!hasAnyFilter) {
      return timed;
    }

    const planFidelitySet = hasPlanFidelity ? new Set(globalSelectedPlanFidelity.map(normalizeSearchString)) : null;
    const assetSet = hasAssets ? new Set(globalSelectedAssets.map(canonicalAsset)) : null;
    const sessionSet = hasSessions ? new Set(globalSelectedSessions.map(normalizeSearchString)) : null;
    const statusSet = hasStatuses ? new Set(globalSelectedStatuses.map(normalizeSearchString)) : null;
    const typeSet = hasTypes ? new Set(globalSelectedTypes.map(normalizeSearchString)) : null;
    const trendSet = hasTrendTypes ? new Set(globalSelectedTrendTypes.map(normalizeSearchString)) : null;
    const asiaRangeSet = extra.asiaRanges.length ? new Set(extra.asiaRanges.map(normalizeSearchString)) : null;
    const pdSet = extra.premiumDiscounts.length ? new Set(extra.premiumDiscounts.map(normalizeSearchString)) : null;
    const dimSets = Object.entries(extra.dims || {})
      .filter(([, l]) => l && l.length)
      .map(([d, l]) => [d as FilterDimension, new Set(l as string[])] as const);

    return timed.filter((t: Trade) => {
      // 1. Numeric and temporal checks first (fastest)
      if (hasMinTime && (!t.createdAt || t.createdAt < minTime)) {
        return false;
      }
      if (hasCategory && !inScope(t, activeAccountCategory)) {
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
      if (planFidelitySet && (!t.planFidelity || !planFidelitySet.has(normalizeSearchString(t.planFidelity)))) {
        return false;
      }
      if (trendSet && (!t.trend || !trendSet.has(normalizeSearchString(t.trend)))) {
        return false;
      }
      // 4. Sonradan eklenen alanlar
      if (extra.onlyIncomplete && t.quickEntry !== true) return false;
      if (asiaRangeSet && (!t.asiaRange || !asiaRangeSet.has(normalizeSearchString(t.asiaRange)))) return false;
      if (pdSet && !tradeConfirmations(t).some((x) => pdSet.has(normalizeSearchString(x)))) return false;
      for (const [d, set] of dimSets) {
        if (!set.has(dimensionValue(t, d))) return false;
      }
      return true;
    });
}
