/** İşlemin hesap tipi: prop hesabının aşaması (Challenge / Funded) veya hesapsız (demo / backtest) */
export type PlatformCategory = 'FUNDED' | 'CHALLENGE' | 'DEMO';
export type AccountCategory = 'ALL' | 'FUNDED' | 'CHALLENGE' | 'DEMO';

export const ASIA_RANGE_TYPES = ['Range', 'Trend', 'Swept'] as const;
type AsiaRangeType = (typeof ASIA_RANGE_TYPES)[number];
/** Formda seçilebilenler. "Swept" kaldırıldı: yalnızca eski kayıtlarda görünür. */
export const ASIA_RANGE_FORM_TYPES: readonly AsiaRangeType[] = ['Range', 'Trend'];

export interface Trade {
  id: string;
  asset: string;            // e.g., BTC/USDT, ETH/USDT, AAPL
  type: 'LONG' | 'SHORT';   // Trade direction
  rr: number;               // Sonuç (R): artı kazanç, eksi kayıp, 0 başabaş
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'; // Formda seçilmez: kayıtta R'nin işaretinden yazılır
  notes: string;            // Analysis notes, setup descriptions
  screenshot: string | null; // Base64 data URI of compressed screenshot
  createdAt: number;        // Timestamp of entry
  platform?: string;        // Hesabın kayıt anındaki adı (görüntüleme ve filtre için); hesapsız işlemde boş
  accountCategory?: 'FUNDED' | 'CHALLENGE' | 'DEMO'; // Kayıt anındaki hesap tipi; DEMO = hesapsız
  accountStage?: number;    // Kayıt anındaki aşama: 1, 2, 3 = Phase, 0 = Funded; hesapsızda boş
  session?: string;         // Session: formda girilmez, POI Sweep saatinden otomatik (London, NY AM …)
  planFidelity?: string | null; // Setup Kalitesi (Plan fidelity)
  trend?: string;           // İşlem Tipi (eski adı Trend Yapısı): Continuation / Reversal
  /** Confirmations (çoklu seçim): ör. 1H POI, 4H POI, Discount. Tek kaynak bu dizi; `tradeConfirmations()` ile okunur. */
  confirmationTags?: string[];
  /**
   * Eski tek seçimli Confirmations (Premium / Discount...). Okunurken `confirmationTags`'e taşınır ve silinir
   * (normalizeTrade); yalnızca henüz normalize edilmemiş eski kayıtlarda görünür.
   */
  premiumDiscount?: string;
  /** Eski sürümün strateji alanı: artık formda, filtrelerde ve analizlerde yok; eski kayıtlarda saklı kalır. */
  strategy?: string;
  asiaRange?: AsiaRangeType; // Asia Range davranışı: Range / Trend (eski kayıtlarda Swept)
  sweepTime?: string;       // POI Sweep saati, New York saatiyle "HH:mm" (Asia Range seçiminden tamamen bağımsız)
  accountId?: string;       // Prop hesap kimliği (PropAccount.id)
  riskPct?: number;         // İşlem başı risk (%), hesabın başlangıç bakiyesine göre
  riskAmount?: number;      // riskPct'nin dolar karşılığı; hesap bakiyesi = R × riskAmount
  quickEntry?: boolean;     // Hızlı kayıtla girildi; ayrıntılar sonra tamamlanacak
  /**
   * Kaldırılmış girdiler: formda, filtrelerde ve analizlerde yok. Eski kayıtlarda saklı kalır (silinmez),
   * yalnızca bozuk değer temizliği ve yedek kurtarma bunları tanır.
   */
  stopPips?: number;
  tpPips?: number;
  asiaRangePips?: number;
  timeframe?: string;
  htfTimeframe?: string;
  confirmations?: string[];
  management?: string[];
  afterExitTp?: boolean;
  exitAt?: number;
  entryModels?: string[];   // Entry Model
  tpTargets?: string[];     // Target
  asiaRangeFvg?: string;    // Asia Range FVG (1H)
  newsDay?: boolean;        // News Day / Bank Holiday: true = Var, false = Yok
}

/**
 * Prop firm hesabı. Bir "zincir" aynı değerlendirmenin aşamalarıdır: Phase 1 → Phase 2 → … → Funded.
 * Her aşama ayrı bir hesap kaydıdır (kendi bakiyesi sıfırdan başlar) ve chainId ile bağlıdır.
 */
type PropAccountStatus = 'ACTIVE' | 'PASSED' | 'BLOWN' | 'ARCHIVED';

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
  sessions: string;
  planFidelities: string;
  trendTypes?: string;
  premiumDiscounts?: string;
  riskPresets?: string;
  // Listesi olmayan form alanlarının başlıkları (Tanımlamalar > Form Başlıkları)
  basicInfoCard?: string;
  financialCard?: string;
  direction?: string;
  tradeDate?: string;
  rr?: string;
  chartLink?: string;
  asiaRange?: string;
  sweepTime?: string;
  notesCard?: string;
}

