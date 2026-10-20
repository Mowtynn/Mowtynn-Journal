import { DefinitionTitles, PlatformCategory } from "../types";

export const FUNDED_PLATFORMS = ["Funded", "Live", "Binance", "Bybit", "MetaTrader 4", "TradingView"];
export const CHALLENGE_PLATFORMS = ["Challenge", "Evaluation", "Phase 1", "Phase 2", "FTMO", "MFF", "FundingPips"];
export const DEMO_PLATFORMS = ["Demo", "LiveTest", "Paper Trading", "Backtest"];

export const DEFAULT_PLATFORMS = [
  "Funded",
  "Challenge",
  "Demo",
  "Live",
  "LiveTest",
  "Binance",
  "Bybit",
  "MetaTrader 4",
  "TradingView"
];

let cachedCategories: Record<string, PlatformCategory> | null = null;

export function getStoredPlatformCategories(): Record<string, PlatformCategory> {
  if (cachedCategories) return cachedCategories;
  try {
    const raw = localStorage.getItem('tj_platform_categories');
    if (raw) {
      cachedCategories = JSON.parse(raw);
      return cachedCategories!;
    }
  } catch (e) {}
  cachedCategories = {};
  return cachedCategories;
}

export function savePlatformCategory(platform: string, category: PlatformCategory): void {
  try {
    const current = getStoredPlatformCategories();
    current[platform.trim()] = category;
    cachedCategories = { ...current };
    localStorage.setItem('tj_platform_categories', JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('tj_platform_categories_updated'));
  } catch (e) {}
}

export function replacePlatformCategories(map: Record<string, PlatformCategory>): void {
  try {
    const clean: Record<string, PlatformCategory> = {};
    Object.entries(map || {}).forEach(([k, v]) => {
      if (v === 'FUNDED' || v === 'CHALLENGE' || v === 'DEMO') clean[k.trim()] = v;
    });
    cachedCategories = { ...clean };
    if (Object.keys(clean).length === 0) localStorage.removeItem('tj_platform_categories');
    else localStorage.setItem('tj_platform_categories', JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('tj_platform_categories_updated'));
  } catch (e) {}
}

export function isChallengePlatform(platform?: string, customCategories?: Record<string, PlatformCategory>): boolean {
  if (!platform) return false;
  const clean = platform.trim();
  const cats = customCategories || getStoredPlatformCategories();
  if (cats[clean]) {
    return cats[clean] === 'CHALLENGE';
  }
  const p = clean.toLowerCase();
  return (
    p.includes("challenge") ||
    p.includes("challange") ||
    p.includes("eval") ||
    p.includes("phase") ||
    p.includes("ftmo") ||
    p.includes("mff") ||
    p.includes("fundingpips") ||
    p.includes("prop")
  );
}

export function isDemoPlatform(platform?: string, customCategories?: Record<string, PlatformCategory>): boolean {
  if (!platform) return false;
  const clean = platform.trim();
  const cats = customCategories || getStoredPlatformCategories();
  if (cats[clean]) {
    return cats[clean] === 'DEMO';
  }
  const p = clean.toLowerCase();
  if (isChallengePlatform(platform, customCategories)) return false;
  return (
    p.includes("demo") ||
    p.includes("livetest") ||
    p.includes("paper") ||
    p.includes("backtest") ||
    p.includes("pratik") ||
    (p.includes("test") && !p.includes("livetest"))
  );
}

export function isFundedPlatform(platform?: string, customCategories?: Record<string, PlatformCategory>): boolean {
  if (!platform) return true;
  const clean = platform.trim();
  const cats = customCategories || getStoredPlatformCategories();
  if (cats[clean]) {
    return cats[clean] === 'FUNDED';
  }
  if (isChallengePlatform(platform, customCategories)) return false;
  if (isDemoPlatform(platform, customCategories)) return false;
  return true;
}

export function getTradeAccountCategory(
  trade: { accountCategory?: PlatformCategory; platform?: string },
  customCategories?: Record<string, PlatformCategory>
): PlatformCategory {
  if (trade.accountCategory === 'FUNDED' || trade.accountCategory === 'CHALLENGE' || trade.accountCategory === 'DEMO') {
    return trade.accountCategory;
  }
  if (isChallengePlatform(trade.platform, customCategories)) {
    return 'CHALLENGE';
  }
  if (isDemoPlatform(trade.platform, customCategories)) {
    return 'DEMO';
  }
  return 'FUNDED';
}
export const DEFAULT_TIMEFRAMES = ["3M", "5M", "15M"];
export const DEFAULT_HTF_TIMEFRAMES = ["1H", "4H", "D", "W", "M"];
export const DEFAULT_CONFIRMATIONS = ["FVG", "OB"];
export const DEFAULT_ENTRY_HOURS = [
  "00:00-01:00",
  "01:00-02:00",
  "02:00-03:00",
  "03:00-04:00",
  "04:00-05:00",
  "08:00-09:00"
];
export const DEFAULT_LIQUIDITY_SWEEPS = [
  "PDH / PDL",
  "PWH / PWL",
  "Asia High / Low",
  "EQH / EQL",
  "Session High / Low",
  "Internal Range",
  "External Range",
  "Trendline Liquidity"
];
export const DEFAULT_CONCEPTS = DEFAULT_LIQUIDITY_SWEEPS;
export const DEFAULT_SESSIONS = ["London", "NY AM"];
export const DEFAULT_ASSETS = ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD", "NQ100"];
export const DEFAULT_PLAN_FIDELITIES = ["A+", "A", "B-C"];
export const DEFAULT_ENTRY_MODELS = [
  "Breaker",
  "Mitigation",
  "FVG",
  "IFVG"
];
export const DEFAULT_TREND_TYPES = [
  "Continuation",
  "Reversal"
];
export const DEFAULT_TP_TARGETS = [
  "PDH / PDL",
  "PWH / PWL",
  "Asia High / Low",
  "Session High / Low",
  "EQH / EQL",
  "HTF PD Array"
];
export const DEFAULT_PREMIUM_DISCOUNTS = [
  "Premium",
  "Discount",
  "Equilibrium / OTE"
];

/**
 * News Day / Bank Holiday: sabit iki durumlu alan. Liste her zaman tam 2 öğedir:
 * [0] = "Var" (true), [1] = "Yok" (false, varsayılan). Tanımlamalar'dan yalnızca etiketleri yeniden adlandırılır;
 * işlemde etiket değil boolean saklanır, böylece yeniden adlandırma geçmiş kayıtları bozmaz.
 */
export const DEFAULT_STRATEGIES = ["Asia Range"];
export const DEFAULT_ASIA_RANGE_FVGS = ["Var", "Yok"];

/** Listesi olmayan form alanlarının başlıkları: Tanımlamalar > Form Başlıkları'ndan değiştirilir. */
export const FORM_LABEL_KEYS = [
  "basicInfoCard", "financialCard", "notesCard", "direction", "tradeDate", "tradeStatus",
  "stopPips", "tpPips", "maePips", "mfePips", "asiaRangePips", "rr", "pnl", "chartLink",
] as const;

export const DEFAULT_NEWS_DAYS = ["Var", "Yok"];

export const normalizeNewsDays = (list?: unknown): string[] => {
  const arr = Array.isArray(list) ? list : [];
  const yes = typeof arr[0] === "string" && arr[0].trim() ? arr[0].trim() : DEFAULT_NEWS_DAYS[0];
  let no = typeof arr[1] === "string" && arr[1].trim() ? arr[1].trim() : DEFAULT_NEWS_DAYS[1];
  if (no.toLowerCase() === yes.toLowerCase()) no = yes === DEFAULT_NEWS_DAYS[1] ? DEFAULT_NEWS_DAYS[0] : DEFAULT_NEWS_DAYS[1];
  return [yes, no];
};

export const NEWS_DAYS_EVENT = "tj_news_days_updated";

/** Analiz ekranları için güncel Var / Yok etiketleri (localStorage'dan okunur). */
export function getNewsDayLabels(): { yes: string; no: string } {
  try {
    const raw = localStorage.getItem("trading_news_days_list");
    if (raw) {
      const [yes, no] = normalizeNewsDays(JSON.parse(raw));
      return { yes, no };
    }
  } catch (e) {}
  return { yes: DEFAULT_NEWS_DAYS[0], no: DEFAULT_NEWS_DAYS[1] };
}

export const DEFAULT_DEFINITION_TITLES: DefinitionTitles = {
  platforms: "Platform",
  assets: "Parite",
  liquiditySweeps: "Liquidity Sweep",
  concepts: "Liquidity Sweep",
  confirmations: "PD ARRAY",
  timeframes: "Entry Timeframe",
  htfTimeframes: "Timeframe",
  sessions: "Session",
  planFidelities: "Setup Kalitesi",
  entryModels: "Entry Model",
  trendTypes: "Trend Yapısı",
  tpTargets: "TP Target",
  premiumDiscounts: "Premium / Discount",
  entryHours: "Entry Time",
  newsDays: "News Day/Bank Holiday",
  strategies: "Strateji",
  asiaRangeFvgs: "Asia Range FVG",
  basicInfoCard: "Temel Bilgiler",
  financialCard: "Finansal Sonuç",
  notesCard: "Analiz & Notlar",
  direction: "Yön",
  tradeDate: "Tarih",
  tradeStatus: "İşlem Durumu",
  stopPips: "Stop Pip",
  tpPips: "TP Pip",
  maePips: "MAE Pip",
  mfePips: "MFE Pip",
  asiaRangePips: "Asia Range Pip",
  rr: "R:R Oranı",
  pnl: "PNL",
  chartLink: "Grafik Linki",
};

export const cleanDefinitionTitleString = (str?: string): string => {
  if (!str) return "";
  let clean = str.replace(/\s*\([^)]*\)/g, "").trim();
  if (/varlık/i.test(clean)) return "Parite";
  return clean;
};

const normalizeCache = new Map<string, string>();

export function normalizeSearchString(str: string | undefined | null): string {
  if (!str) return "";
  const cached = normalizeCache.get(str);
  if (cached !== undefined) return cached;
  const res = String(str)
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .toLowerCase()
    .trim();
  if (normalizeCache.size > 3000) {
    normalizeCache.clear();
  }
  normalizeCache.set(str, res);
  return res;
}

export function caseInsensitiveMatch(text: string | undefined | null, query: string | undefined | null): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;
  const normalizedText = normalizeSearchString(text);
  const normalizedQuery = normalizeSearchString(query);
  return normalizedText.includes(normalizedQuery);
}

export function caseInsensitiveEquals(a: string | undefined | null, b: string | undefined | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return normalizeSearchString(a) === normalizeSearchString(b);
}

export const sanitizeDefinitionTitles = (raw: Partial<DefinitionTitles> = {}): DefinitionTitles => {
  const result: DefinitionTitles = {
    ...DEFAULT_DEFINITION_TITLES,
    ...raw,
  };

  (Object.keys(result) as (keyof DefinitionTitles)[]).forEach((key) => {
    if (result[key]) {
      result[key] = cleanDefinitionTitleString(result[key]);
    }
  });

  if (!result.assets || /varlık/i.test(result.assets)) {
    result.assets = "Parite";
  }

  if (!result.liquiditySweeps || /konsept|likidite sweep/i.test(result.liquiditySweeps)) {
    result.liquiditySweeps = "Liquidity Sweep";
  }
  result.concepts = result.liquiditySweeps;

  if (!result.sessions || /oturum|seans/i.test(result.sessions)) {
    result.sessions = "Session";
  }

  if (!result.htfTimeframes || result.htfTimeframes === "HTF" || /üst zaman/i.test(result.htfTimeframes)) {
    result.htfTimeframes = "Timeframe";
  }

  if (!result.confirmations || result.confirmations === "Onaylar" || result.confirmations === "Onay" || /htf pd array/i.test(result.confirmations)) {
    result.confirmations = "PD ARRAY";
  }

  if (!result.timeframes || result.timeframes === "ETF" || result.timeframes === "Entry Time" || /giriş zamanı/i.test(result.timeframes) || /işlem zaman dilimi/i.test(result.timeframes)) {
    result.timeframes = "Entry Timeframe";
  }

  if (!result.entryModels || /giriş model/i.test(result.entryModels)) {
    result.entryModels = "Entry Model";
  }

  if (!result.newsDays) {
    result.newsDays = DEFAULT_DEFINITION_TITLES.newsDays;
  }

  return result;
};

