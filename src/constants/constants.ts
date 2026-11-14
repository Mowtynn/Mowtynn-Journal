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

/** Hesap türü rozet renkleri — her yerde aynı: Challenge mavi, Funded yeşil, Hesapsız amber */
export const ACCOUNT_CATEGORY_BADGE: Record<PlatformCategory, string> = {
  CHALLENGE: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  FUNDED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  DEMO: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
};

/** İşlemin hesap adı: platform adı; yoksa hesapsızda "Hesapsız", prop işleminde hesap türü */
export function getTradeAccountName(trade: { platform?: string; accountCategory?: PlatformCategory; accountId?: string; accountStage?: number }): string {
  if (trade.platform) return trade.platform;
  return ACCOUNT_CATEGORY_LABELS[getTradeAccountCategory(trade)];
}

/** İşlemin aşama etiketi: "Phase 1", "Funded"; hesapsız işlemde boş */
export function getTradeStageLabel(trade: { accountId?: string; accountStage?: number }): string | null {
  if (!trade.accountId || typeof trade.accountStage !== 'number') return null;
  return trade.accountStage === 0 ? 'Funded' : `Phase ${trade.accountStage}`;
}
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
export const DEFAULT_ASIA_RANGE_FVGS = ["Var", "Yok"];

/** İşlem formundaki hazır risk yüzdeleri (Tanımlamalar > Risk %). Formda tek satıra sığsın diye en fazla 5. */
export const DEFAULT_RISK_PRESETS = ["0.5", "0.75", "1"];
export const MAX_RISK_PRESETS = 5;

/** "0,5" / "%1" / 0.75 → 0.5 / 1 / 0.75; geçersiz ya da (0, 10] dışı → null */
export const parseRiskPreset = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim().replace(",", ".").replace("%", "")) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 10) return null;
  return Math.round(n * 100) / 100;
};

/** Liste değilse varsayılan; değilse geçerli, tekrarsız, en fazla 5 yüzde (sıra korunur) */
export const normalizeRiskPresets = (list: unknown): string[] => {
  if (!Array.isArray(list)) return DEFAULT_RISK_PRESETS;
  const out: number[] = [];
  for (const x of list) {
    const n = parseRiskPreset(x);
    if (n !== null && !out.includes(n)) out.push(n);
    if (out.length >= MAX_RISK_PRESETS) break;
  }
  return out.map(String);
};

/** Listesi olmayan form alanlarının başlıkları: Tanımlamalar > Form Başlıkları'ndan değiştirilir. */
export const FORM_LABEL_KEYS = [
  "basicInfoCard", "financialCard", "notesCard", "direction", "tradeDate",
  "rr", "chartLink", "asiaRange", "sweepTime",
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
// Analizler bu etiketi işlem başına defalarca ister: ham değer değişmedikçe ayrıştırma tekrarlanmaz
let newsLabelCache: { raw: string | null; value: { yes: string; no: string } } | null = null;
let newsStorageMissing = false;
export function getNewsDayLabels(): { yes: string; no: string } {
  let raw: string | null = null;
  if (!newsStorageMissing) {
    try {
      raw = localStorage.getItem("trading_news_days_list");
    } catch (e) {
      // localStorage yok (sunucu / test ortamı): her çağrıda yeniden denenmez
      newsStorageMissing = typeof localStorage === "undefined";
    }
  }
  if (newsLabelCache && newsLabelCache.raw === raw) return newsLabelCache.value;
  let value = { yes: DEFAULT_NEWS_DAYS[0], no: DEFAULT_NEWS_DAYS[1] };
  if (raw) {
    try {
      const [yes, no] = normalizeNewsDays(JSON.parse(raw));
      value = { yes, no };
    } catch (e) {}
  }
  newsLabelCache = { raw, value };
  return value;
}

export const DEFAULT_DEFINITION_TITLES: DefinitionTitles = {
  platforms: "Hesap",
  assets: "Parite",
  sessions: "Session",
  planFidelities: "Setup Kalitesi",
  entryModels: "Entry Model",
  trendTypes: "İşlem Tipi",
  tpTargets: "Target",
  premiumDiscounts: "Confirmations",
  newsDays: "News Day/Bank Holiday",
  asiaRangeFvgs: "Asia Range FVG (1H)",
  riskPresets: "Risk",
  basicInfoCard: "Temel Bilgiler",
  financialCard: "Sonuç",
  notesCard: "Analiz & Notlar",
  direction: "Yön",
  tradeDate: "Tarih",
  rr: "Sonuç R",
  chartLink: "Grafik Linki",
  asiaRange: "Asia Range",
  sweepTime: "POI Sweep Time",
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
  "with", "mowtynn", "testfirm", "pip'", "sharpe", "sortino", "kelly", "sqn", "minimum", "maximum",
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
  // Eski açıklama ekleri "(Varlık)" vb. düşer; zaman dilimi etiketi "(1H)", "(15M)" korunur
  let clean = str.replace(/\s*\((?!\s*\d+\s*[mhdw]\s*\))[^)]*\)/gi, "").trim();
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

  // Sweep Time → POI Sweep Time: kayıtlı eski varsayılan yeni adı alır (kullanıcının kendi verdiği farklı ad korunur)
  if (/^sweep time$/i.test(result.sweepTime || '')) result.sweepTime = DEFAULT_DEFINITION_TITLES.sweepTime;
  // Trend Yapısı → İşlem Tipi (Continuation / Reversal): eski varsayılan ad yenilenir, özel ad korunur
  if (/^trend (yapısı|yapisi|type)$/i.test((result.trendTypes || '').trim())) result.trendTypes = DEFAULT_DEFINITION_TITLES.trendTypes;

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

  if (!result.entryModels || /giriş model/i.test(result.entryModels)) {
    result.entryModels = "Entry Model";
  }

  // Asia Range FVG 1H grafikte okunur: eski varsayılan başlık "Asia Range FVG (1H)" olur (özel başlık korunur)
  if (!result.asiaRangeFvgs || /^asia range fvg$/i.test(result.asiaRangeFvgs.trim())) result.asiaRangeFvgs = DEFAULT_DEFINITION_TITLES.asiaRangeFvgs as string;

  if (!result.newsDays) {
    result.newsDays = DEFAULT_DEFINITION_TITLES.newsDays;
  }

  return result;
};

