import { DefinitionTitles } from "../types";

export const DEFAULT_PLATFORMS = ["Binance", "Bybit", "MetaTrader 4", "TradingView"];
export const DEFAULT_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D"];
export const DEFAULT_HTF_TIMEFRAMES = ["15m", "1h", "4h", "1D", "1W", "1M"];
export const DEFAULT_CONFIRMATIONS = ["FVG", "Orderblock", "Likidite Alımı", "BOS", "CHoCH"];
export const DEFAULT_CONCEPTS = ["Scalping", "Day Trading", "Swing Trading", "Position Trading"];
export const DEFAULT_SESSIONS = ["London", "New York", "Tokyo", "Sydney", "Asian", "Overlap"];
export const DEFAULT_ASSETS = ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD", "NQ100"];
export const DEFAULT_PLAN_FIDELITIES = ["Tam", "Kısmen", "FOMO"];
export const DEFAULT_ENTRY_MODELS = [
  "IFVG",
  "FVG",
  "Orderblock",
  "Liquidity Sweep",
  "Breaker Block",
  "CE (%50 FVG)",
  "BPR"
];
export const DEFAULT_TREND_TYPES = [
  "Continuation",
  "Reversal"
];

export const DEFAULT_DEFINITION_TITLES: DefinitionTitles = {
  platforms: "Platform",
  assets: "Parite",
  concepts: "Konsept",
  confirmations: "PD ARRAY",
  timeframes: "Entry Timeframe",
  htfTimeframes: "Timeframe",
  sessions: "Session",
  planFidelities: "Setup Kalitesi",
  entryModels: "Entry Model",
  trendTypes: "Trend Yapısı",
};

export const cleanDefinitionTitleString = (str?: string): string => {
  if (!str) return "";
  let clean = str.replace(/\s*\([^)]*\)/g, "").trim();
  if (/varlık/i.test(clean)) return "Parite";
  return clean;
};

export function normalizeSearchString(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .toLowerCase()
    .trim();
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

  if (!result.concepts || result.concepts === "Konseptler") {
    result.concepts = "Konsept";
  }

  if (!result.sessions || /oturum|seans/i.test(result.sessions)) {
    result.sessions = "Session";
  }

  if (!result.htfTimeframes || result.htfTimeframes === "HTF" || /üst zaman/i.test(result.htfTimeframes)) {
    result.htfTimeframes = "Timeframe";
  }

  if (!result.confirmations || result.confirmations === "Onaylar" || result.confirmations === "Onay" || /htf pd array/i.test(result.confirmations)) {
    result.confirmations = "PD ARRAY";
  }

  if (!result.timeframes || result.timeframes === "ETF" || /giriş zamanı/i.test(result.timeframes)) {
    result.timeframes = "Entry Timeframe";
  }

  if (!result.entryModels || /giriş model/i.test(result.entryModels)) {
    result.entryModels = "Entry Model";
  }

  return result;
};

