import { DefinitionTitles, PlatformCategory } from "../types";

/** İşlemin hesap tipi: kayıt anındaki hesaba göre Challenge / Funded; hesabı olmayan işlem DEMO (hesapsız) sayılır */
export function getTradeAccountCategory(trade: { accountCategory?: PlatformCategory; accountId?: string; accountStage?: number }): PlatformCategory {
  if (trade.accountCategory === 'FUNDED' || trade.accountCategory === 'CHALLENGE' || trade.accountCategory === 'DEMO') {
    return trade.accountCategory;
  }
  if (trade.accountId) return trade.accountStage === 0 ? 'FUNDED' : 'CHALLENGE';
  return 'DEMO';
}

/** Hesap tipi etiketleri (üst filtre, işlem listesi) */
export const ACCOUNT_CATEGORY_LABELS: Record<PlatformCategory, string> = {
  CHALLENGE: 'Challenge',
  FUNDED: 'Funded',
  DEMO: 'Hesapsız',
};

/** İşlemin aşama etiketi: "Phase 1", "Funded"; hesapsız işlemde boş */
export function getTradeStageLabel(trade: { accountId?: string; accountStage?: number }): string | null {
  if (!trade.accountId || typeof trade.accountStage !== 'number') return null;
  return trade.accountStage === 0 ? 'Funded' : `Phase ${trade.accountStage}`;
}
export const DEFAULT_TIMEFRAMES = ["3M", "5M", "15M"];
export const DEFAULT_HTF_TIMEFRAMES = ["1H", "4H", "D", "W", "M"];
export const DEFAULT_CONFIRMATIONS = ["FVG", "OB"];
export const DEFAULT_SESSIONS = ["London", "NY AM"];
export const DEFAULT_ASSETS = ["EURUSD", "GBPUSD", "XAUUSD", "NQ100", "BTCUSDT"];
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
  "stopPips", "tpPips", "maePips", "mfePips", "asiaRangePips", "rr", "chartLink",
] as const;

export const DEFAULT_NEWS_DAYS = ["Var", "Yok"];

export const normalizeNewsDays = (list?: unknown): string[] => {
  const arr = Array.isArray(list) ? list : [];
  const yes = typeof arr[0] === "string" && arr[0].trim() ? titleCase(arr[0]) : DEFAULT_NEWS_DAYS[0];
  let no = typeof arr[1] === "string" && arr[1].trim() ? titleCase(arr[1]) : DEFAULT_NEWS_DAYS[1];
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
  platforms: "Hesap",
  assets: "Parite",
  confirmations: "PD ARRAY",
  timeframes: "Entry Timeframe",
  htfTimeframes: "Timeframe",
  sessions: "Session",
  planFidelities: "Setup Kalitesi",
  entryModels: "Entry Model",
  trendTypes: "Trend Yapısı",
  tpTargets: "Target",
  premiumDiscounts: "Confirmations",
  newsDays: "News Day/Bank Holiday",
  strategies: "Strateji",
  asiaRangeFvgs: "Asia Range FVG",
  basicInfoCard: "Temel Bilgiler",
  financialCard: "Sonuç",
  notesCard: "Analiz & Notlar",
  direction: "Yön",
  tradeDate: "Tarih",
  tradeStatus: "İşlem Durumu",
  stopPips: "Stop Pip",
  tpPips: "TP Pip",
  maePips: "MAE Pip",
  mfePips: "MFE Pip",
  asiaRangePips: "Asia Range Pip",
  rr: "Sonuç R",
  chartLink: "Grafik Linki",
};

/**
 * Uygulamada geçen İngilizce terimler (i → I). Listede olmayan kelimeler Türkçe kabul edilir (i → İ):
 * arayüz Türkçe olduğu için varsayılan Türkçedir; tamamı zaten büyük harf olan kısaltmalar (FVG, NY AM) olduğu gibi kalır.
 */
const EN_WORDS = new Set([
  "asia", "high", "low", "session", "sessions", "timeframe", "timeframes", "time", "entry", "model", "models", "target", "targets",
  "confirmation", "confirmations", "continuation", "reversal", "premium", "discount", "equilibrium", "mitigation", "breaker",
  "holiday", "news", "day", "bank", "win", "wins", "rate", "profit", "factor", "loss", "drawdown", "recovery", "range", "fvg",
  "ifvg", "liquidity", "sweep", "trend", "setup", "live", "test", "backtest", "funded", "challenge", "phase", "stop", "pip", "pips",
  "trading", "journal", "iphone", "ipad", "order", "block", "fair", "value", "gap", "inverse", "displacement", "market", "structure",
  "shift", "break", "silver", "bullet", "judas", "swing", "london", "york", "new", "tokyo", "sydney", "firm", "kill", "zone", "killzone",
  "edge", "lab", "filter", "filters", "link", "chart", "tradingview", "breakeven", "short", "long", "limit", "ratio",
  "matrix", "insight", "insights", "high/low", "pdh", "pdl", "ote", "smt", "mss", "bos", "choch", "sibi", "bisi", "silver",
  "with", "mowtynn", "testfirm", "pip'", "sharpe", "sortino", "kelly", "sqn", "mae", "mfe", "minimum", "maximum",
  "imbalance", "rejection", "retest", "internal", "external", "intraday", "daily", "weekly", "monthly", "open", "close", "midnight",
  "unicorn", "turtle", "soup", "power", "three", "consolidation", "expansion", "retracement", "accumulation", "manipulation",
  "distribution", "previous", "week", "inside", "outside", "candle", "wick", "body", "level", "levels", "point", "points", "pivot",
  "fib", "fibonacci", "volume", "profile", "vwap", "trendline", "channel", "flag", "wedge", "triangle", "double", "top", "bottom",
  "head", "shoulders", "engulfing", "pin", "bar", "doji", "hammer", "star", "morning", "evening", "deep", "shallow", "fill", "filled",
  "mitigated", "unmitigated", "valid", "invalid", "confluence", "bias", "bullish", "bearish", "neutral", "scalp", "swing", "position",
  "first", "second", "third", "pullback", "spike", "mitigation block", "propulsion", "vacuum", "void", "institutional", "algorithm",
  "silver bullet", "macro", "quarter", "quarterly", "theory", "in", "out", "is",
]);

/** Her zaman büyük harf yazılan kısaltmalar (girdi küçük yazılsa da): fvg → FVG, ny am → NY AM */
const ABBREVIATIONS = new Set([
  "fvg", "ifvg", "ob", "bb", "mb", "rb", "mss", "bos", "choch", "smt", "ote", "pdh", "pdl", "pwh", "pwl", "pmh", "pml", "ny", "am", "pm",
  "kz", "htf", "ltf", "ict", "eq", "cisd", "sibi", "bisi", "bpr", "rr", "tp", "sl", "be", "nq", "es", "ym", "dxy", "usd", "eur", "gbp",
  "jpy", "chf", "cad", "aud", "nzd", "xau", "xag", "btc", "eth", "ftmo", "ote", "nwog", "ndog", "rth", "eth", "cpi", "nfp", "fomc",
  "ppi", "gdp", "pmi", "ecb", "boe", "fed", "ath", "atl", "adr", "atr", "sma", "ema", "rsi", "macd", "vwap", "poi", "ssl", "bsl",
  "erl", "irl", "pd", "mt4", "mt5", "tv", "kpi", "roi", "pnl", "id", "bos/choch",
]);
/** Küçük kalan bağlaçlar (başlıkta ilk kelime değilse) */
const CONNECTORS = new Set(["ve", "veya", "ile", "ya", "da", "de", "ki", "vs", "vs.", "x", "of", "and", "or", "the", "to", "for", "on", "at", "by"]);

/**
 * Girdiler, tanımlar, özel isimler ve başlıklar için her kelimenin ilk harfi büyük (Türkçe / İngilizce kurallı):
 * "asia range" → "Asia Range", "giriş modeli" → "Giriş Modeli", "inverse fvg" → "Inverse FVG".
 * Kasıtlı büyük harfler korunur (FVG, iFVG, NY AM, A+, B-C, PD ARRAY); rakamla başlayan parçalar (5M, 10K) aynen kalır.
 */
const titleCache = new Map<string, string>();
export function titleCase(text: string | undefined | null): string {
  if (typeof text !== "string") return "";
  const key = text;
  const hit = titleCache.get(key);
  if (hit !== undefined) return hit;
  let wordIndex = 0;
  const res = key
    .trim()
    .replace(/\s+/g, " ")
    .split(/([\s/\-()&,+:·|]+)/)
    .map((part) => {
      if (!part || /^[\s/\-()&,+:·|]+$/.test(part)) return part;
      const first = wordIndex === 0;
      wordIndex++;
      const m = part.match(/^([^A-Za-zÇĞİÖŞÜçğıöşü]*)([A-Za-zÇĞİÖŞÜçğıöşü])(.*)$/);
      if (!m) return part; // rakam / sembol
      const [, lead, ch, rest] = m;
      if (lead && /\d/.test(lead)) return part; // 5M, 10K, 3.
      const lower = part.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/gi, "");
      const enLower = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Kasıtlı büyük harf (FVG, iFVG, PnL) korunur
      if (/[A-ZÇĞİÖŞÜ]/.test(rest)) return part;
      if (ABBREVIATIONS.has(enLower) || ABBREVIATIONS.has(lower)) return lead + (ch + rest).toUpperCase();
      if (!first && CONNECTORS.has(part.toLocaleLowerCase("tr-TR"))) return part.toLocaleLowerCase("tr-TR");
      const isEn = EN_WORDS.has(enLower) || !/[çğıöşüÇĞİÖŞÜ]/.test(part) && EN_WORDS.has(part.toLowerCase());
      const up = isEn ? ch.toUpperCase() : ch.toLocaleUpperCase("tr-TR");
      return lead + up + rest;
    })
    .join("");
  if (titleCache.size > 2000) titleCache.clear();
  titleCache.set(key, res);
  return res;
}

/** Listeyi baş harfleri büyük biçime çevirir; büyük/küçük harf farkıyla tekrar eden öğeler tek kalır */
export function titleCaseList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  list.forEach((x) => {
    if (typeof x !== "string") return;
    const v = titleCase(x);
    const k = v.toLocaleLowerCase("tr-TR");
    if (v && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  });
  return out;
}
// Aynı başlıklar her çizimde tekrar dönüştürülmesin: sonuçlar önbellekte (başlık sayısı sınırlı; taşmaya karşı üst sınır)
const upperCache = new Map<string, string>();
/** Türkçe / İngilizce karışık metni doğru büyük harfe çevirir: Giriş → GİRİŞ, Timeframe → TIMEFRAME, Strateji → STRATEJİ */
export function smartUpper(text: string | undefined | null): string {
  if (!text) return "";
  const key = String(text);
  const hit = upperCache.get(key);
  if (hit !== undefined) return hit;
  const res = key
    .split(/(\s+|\/|-|\(|\)|,|&|\.|:)/)
    .map((w) => {
      if (!w) return w;
      if (/[çğıöşüÇĞİÖŞÜ]/.test(w)) return w.toLocaleUpperCase("tr-TR");
      if (w === w.toUpperCase()) return w; // FVG, NY, A+ …
      return EN_WORDS.has(w.toLowerCase()) ? w.toUpperCase() : w.toLocaleUpperCase("tr-TR");
    })
    .join("");
  if (upperCache.size > 500) upperCache.clear();
  upperCache.set(key, res);
  return res;
}

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
  // Yalnızca bilinen başlık anahtarları ve metin değerler alınır (bozuk / yabancı yedek ekranı çökertmez)
  const picked: Partial<DefinitionTitles> = {};
  if (raw && typeof raw === 'object') {
    (Object.keys(DEFAULT_DEFINITION_TITLES) as (keyof DefinitionTitles)[]).forEach((key) => {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === 'string' && v.trim()) picked[key] = titleCase(v).slice(0, 60);
    });
  }
  const result: DefinitionTitles = {
    ...DEFAULT_DEFINITION_TITLES,
    ...picked,
  };

  (Object.keys(result) as (keyof DefinitionTitles)[]).forEach((key) => {
    if (result[key]) {
      result[key] = cleanDefinitionTitleString(result[key]);
    }
  });

  if (!result.assets || /varlık/i.test(result.assets)) {
    result.assets = "Parite";
  }

  // Kaldırılan Liquidity Sweep başlıkları eski kayıtlardan düşer
  delete (result as any).liquiditySweeps;
  delete (result as any).concepts;
  delete (result as any).pnl;
  // Entry Time kaldırıldı (giriş saati işlem zamanından gelir)
  delete (result as any).entryHours;

  // R tabanlı model: platform listesi yerine hesap; dolar sonucu yok
  if (!result.platforms || /platform/i.test(result.platforms)) result.platforms = "Hesap";
  // TP Target → Target: alan artık çıkış hedefini (işlemden nerede çıkılacağını) anlatır
  if (!result.tpTargets || /^tp[\s_-]*target$/i.test(result.tpTargets.trim())) result.tpTargets = "Target";
  // Premium / Discount → Confirmations (özel başlık verildiyse korunur)
  if (!result.premiumDiscounts || /^premium\s*\/?\s*discount$/i.test(result.premiumDiscounts.trim())) result.premiumDiscounts = "Confirmations";
  if (!result.financialCard || /finansal/i.test(result.financialCard)) result.financialCard = "Sonuç";
  if (!result.rr || /^r\s*:\s*r( oranı)?$/i.test(result.rr.trim())) result.rr = "Sonuç R";

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

