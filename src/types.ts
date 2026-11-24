/** İşlemin kayıtlı hesap tipi (eski kayıtlarda Challenge / Funded; yenilerde yalnızca DEMO = hesapsız) */
export type PlatformCategory = 'FUNDED' | 'CHALLENGE' | 'DEMO';
/** Hesap türü: Prop ya da Hesapsız (demo / backtest). Üst çubuktaki kapsam seçici de bu ikisidir. */
export type AccountCategory = 'PROP' | 'DEMO';

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
  /** Prop hesabında alınan işlem (yeni kayıtlar). Hesapsızda accountCategory = 'DEMO'. Okumak için getTradeAccountKind. */
  prop?: boolean;
  accountCategory?: PlatformCategory; // DEMO = hesapsız; eski kayıtlarda Challenge / Funded
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
  poiTimeframe?: string;    // Sweep edilen POI'nin zaman dilimi (15M, 1H, 4H, Daily …; Tanımlamalar'dan yönetilir)
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
  platform?: string;        // Eski prop hesap takibi: hesabın adı
  accountId?: string;       // Eski prop hesap takibi: PropAccount.id
  accountStage?: number;    // Eski prop hesap takibi: 1, 2, 3 = Phase, 0 = Funded
  riskPct?: number;         // Risk (%)
  riskAmount?: number;      // Riskin dolar karşılığı
  entryModels?: string[];   // Entry Model
  tpTargets?: string[];     // Target
  asiaRangeFvg?: string;    // Asia Range FVG (1H)
  newsDay?: boolean;        // News Day / Bank Holiday: true = Var, false = Yok
}

/** Alınan payout: Prop sekmesinde kaydedilir (hesap takibi yok) */
export interface Payout {
  id: string;
  date: string;     // YYYY-MM-DD
  amount: number;   // elime geçen net tutar ($)
  firm: string;     // prop firması (ör. FTMO)
  note?: string;
  createdAt: number;
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
  poiTimeframes?: string;
  // Listesi olmayan form alanlarının başlıkları (Tanımlamalar > Form Başlıkları)
  basicInfoCard?: string;
  financialCard?: string;
  setupCard?: string;
  direction?: string;
  tradeDate?: string;
  rr?: string;
  chartLink?: string;
  asiaRange?: string;
  sweepTime?: string;
  notesCard?: string;
}

