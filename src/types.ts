/** İşlemin hesap tipi: prop hesabının aşaması (Challenge / Funded) veya hesapsız (demo / backtest) */
export type PlatformCategory = 'FUNDED' | 'CHALLENGE' | 'DEMO';
export type AccountCategory = 'ALL' | 'FUNDED' | 'CHALLENGE' | 'DEMO';

export const ASIA_RANGE_TYPES = ['Range', 'Trend', 'Swept'] as const;
export type AsiaRangeType = (typeof ASIA_RANGE_TYPES)[number];

export const MANAGEMENT_TYPES = ['Plana Göre', "BE Çekildi", 'Kısmi Kâr', 'Erken Kapatıldı'] as const;
export type ManagementType = (typeof MANAGEMENT_TYPES)[number];

export interface Trade {
  id: string;
  asset: string;            // e.g., BTC/USDT, ETH/USDT, AAPL
  type: 'LONG' | 'SHORT';   // Trade direction
  rr: number;               // Sonuç (R). BE her zaman 0.
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'; // Trade result code
  stopPips?: number;        // Stop Loss in pips / ticks / points
  tpPips?: number;          // Take Profit in pips / ticks / points
  asiaRangePips?: number;   // Asia Range in pips (optional)
  maePips?: number;         // MAE (Maximum Adverse Excursion) in pips
  mfePips?: number;         // MFE (Maximum Favorable Excursion) in pips
  notes: string;            // Analysis notes, setup descriptions
  screenshot: string | null; // Base64 data URI of compressed screenshot
  createdAt: number;        // Timestamp of entry
  platform?: string;        // Hesabın kayıt anındaki adı (görüntüleme ve filtre için); hesapsız işlemde boş
  accountCategory?: 'FUNDED' | 'CHALLENGE' | 'DEMO'; // Kayıt anındaki hesap tipi; DEMO = hesapsız
  accountStage?: number;    // Kayıt anındaki aşama: 1, 2, 3 = Phase, 0 = Funded; hesapsızda boş
  timeframe?: string;       // Execution timeframe (e.g., 1m, 5m, 1h)
  htfTimeframe?: string;    // Higher Timeframe (HTF)
  session?: string;         // Trading session (e.g., London, New York)
  confirmations?: string[];      // Array of trading confirmations used (e.g., FVG, Orderblock)
  planFidelity?: string | null; // Setup Kalitesi (Plan fidelity)
  entryModels?: string[];   // Birden fazla Giriş Modeli (Multiple Entry Models)
  trend?: string;           // Trend Yapısı (Trend Type e.g. Continuation, Reversal)
  tpTargets?: string[];     // Target — çıkış hedefi / seviye (e.g. PDH / PDL, Asia High / Low)
  premiumDiscount?: string; // Premium / Discount zone (e.g. Premium, Discount, Equilibrium / OTE)
  /** Eski sürümün strateji alanı: artık formda, filtrelerde ve analizlerde yok; eski kayıtlarda saklı kalır. */
  strategy?: string;
  asiaRange?: AsiaRangeType; // Asia Range davranışı: Range / Trend / Swept
  management?: ManagementType[]; // İşlem Yönetimi: Plana Göre / BE Çekildi / Kısmi Kâr / Erken Kapatıldı
  afterExitTp?: boolean;    // Çıkıştan sonra fiyat TP'ye ulaştı mı (BE / erken kapanan işlemlerde)
  sweepTime?: string;       // Sweep saati, New York saatiyle "HH:mm" (Asia Range seçiminden tamamen bağımsız)
  asiaRangeFvg?: string;    // Asia Range FVG (Tanımlamalar'dan yönetilir)
  newsDay?: boolean;        // News Day / Bank Holiday: true = Var, false = Yok. Girilmemişse tanımsız (bilinmiyor)
  accountId?: string;       // Prop hesap kimliği (PropAccount.id)
  riskPct?: number;         // İşlem başı risk (%), hesabın başlangıç bakiyesine göre
  riskAmount?: number;      // riskPct'nin dolar karşılığı; hesap bakiyesi = R × riskAmount
  quickEntry?: boolean;     // Hızlı kayıtla girildi; ayrıntılar sonra tamamlanacak
  exitAt?: number;          // Çıkış anı (ms). Formda NY saatiyle girilir; işlemde kalma süresi = exitAt − createdAt
}

/**
 * Prop firm hesabı. Bir "zincir" aynı değerlendirmenin aşamalarıdır: Phase 1 → Phase 2 → … → Funded.
 * Her aşama ayrı bir hesap kaydıdır (kendi bakiyesi sıfırdan başlar) ve chainId ile bağlıdır.
 */
export type PropAccountStatus = 'ACTIVE' | 'PASSED' | 'BLOWN' | 'ARCHIVED';

/** Bir aşamanın kuralı (yüzde, hesap boyutuna göre) */
export interface PropStageRule {
  targetPct: number;
  maxDdPct: number;
}

/** "Gerçek bakiyeyi gir" ile oluşan fark kaydı. R istatistiğine girmez; yalnızca bakiye ve drawdown takibini düzeltir. */
export interface PropBalanceAdjustment {
  id: string;
  at: number;
  amount: number;       // eklenen / düşülen fark ($)
  realBalance: number;  // girilen gerçek bakiye ($)
}

export interface PropCertificate {
  id: string;
  kind: 'FUNDED' | 'PAYOUT';
  date: string;         // YYYY-MM-DD
  amount?: number;      // payout: elime geçen net tutar ($)
  image?: string;       // Storage URL'si veya (girişsiz kullanımda) sıkıştırılmış data URL
  note?: string;
  createdAt: number;
}

export interface PropAccount {
  id: string;
  chainId: string;
  chainName: string;            // zincirin adı (ör. "FTMO 100K #3")
  name: string;                 // aşamalı tam ad; işlem formunda platform adı olarak görünür (ör. "FTMO 100K #3 · Phase 1")
  firm?: string;
  size: number;                 // hesap boyutu ($)
  drawdownMode: 'STATIC' | 'TRAILING';
  stage: number;                // 1..phaseRules.length = değerlendirme aşaması, 0 = Funded
  phaseRules: PropStageRule[];  // zincirin aşama kuralları (aşama sayısı = uzunluk)
  fundedMaxDdPct: number;
  /** Günlük kayıp limiti (% hesap boyutu, gün başı bakiyeden); yoksa uygulanmaz */
  dailyLossPct?: number;
  riskPct: number;              // kartta R gösterimi için 1R = boyut × risk %
  fee?: number;                 // challenge ücreti; yalnızca zincirin ilk hesabında
  status: PropAccountStatus;
  createdAt: number;
  closedAt?: number;
  /** Bu günden itibaren, hesaba bağlanmamış ama aynı ad ile kaydedilmiş işlemler de bu hesaba sayılır */
  startDate?: number;
  note?: string;
  images?: string[];
  adjustments?: PropBalanceAdjustment[];
  certificates?: PropCertificate[];
}

export interface WeeklyAnswers {
  good: string;   // Bu hafta neyi iyi yaptım?
  avoid: string;  // Neyi tekrar etmemeliyim?
  focus: string;  // Gelecek haftanın tek odağı
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  content: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags?: string[];
  isFavorite?: boolean;
  /** Haftalık değerlendirme cevapları (yalnızca haftalık kayıtta; istatistikler saklanmaz, işlemlerden hesaplanır) */
  weekly?: WeeklyAnswers;
  createdAt: number;
  updatedAt: number;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;         // Yüzde (kazanç / tüm işlemler)
  bestAsset: string;
  worstAsset: string;
  netR: number;
  averageWinRR: number;
  averageLossRR: number;
  profitFactorRR: number;
  largestWinRR: number;
  largestLossRR: number;
  expectancyRR: number;
  weeklyR: number;        // son 7 gün
  monthlyR: number;       // son 30 gün
  // Kart ayrıntıları
  bestAssetR: number;
  bestAssetCount: number;
  worstAssetR: number;
  worstAssetCount: number;
  weeklyCount: number;
  weeklyWins: number;
  monthlyCount: number;
  monthlyWins: number;
  grossWinR: number;
  grossLossR: number;
}

/** İşlem listesinin kendi süzgeçleri: arama, sıralama, tarih aralığı (diğerleri üstteki Filtreleme Menüsü'nde) */
export interface TradeFilter {
  search: string;
  sortBy: 'dateDes' | 'dateAsc' | 'assetAsc' | 'assetDes' | 'typeAsc' | 'typeDes' | 'rrAsc' | 'rrDes' | 'platformAsc' | 'platformDes';
  startDate?: string;
  endDate?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface DefinitionTitles {
  platforms: string;
  assets: string;
  confirmations: string;
  timeframes: string;
  htfTimeframes: string;
  sessions: string;
  planFidelities: string;
  entryModels?: string;
  trendTypes?: string;
  tpTargets?: string;
  premiumDiscounts?: string;
  newsDays?: string;
  asiaRangeFvgs?: string;
  // Listesi olmayan form alanlarının başlıkları (Tanımlamalar > Form Başlıkları)
  basicInfoCard?: string;
  financialCard?: string;
  direction?: string;
  tradeDate?: string;
  tradeStatus?: string;
  stopPips?: string;
  tpPips?: string;
  maePips?: string;
  mfePips?: string;
  asiaRangePips?: string;
  rr?: string;
  chartLink?: string;
  asiaRange?: string;
  sweepTime?: string;
  management?: string;
  notesCard?: string;
}

