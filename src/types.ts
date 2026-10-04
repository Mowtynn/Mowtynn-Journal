export type PlatformCategory = 'FUNDED' | 'CHALLENGE' | 'DEMO';
export type AccountCategory = 'ALL' | 'FUNDED' | 'CHALLENGE' | 'DEMO';

export interface Trade {
  id: string;
  asset: string;            // e.g., BTC/USDT, ETH/USDT, AAPL
  type: 'LONG' | 'SHORT';   // Trade direction
  rr: number;               // Risk/Reward ratio (e.g., +2.5 or -1.0)
  pnl: number;              // Manually entered realized Profit & Loss ($)
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'; // Trade result code
  stopPips?: number;        // Stop Loss in pips / ticks / points
  tpPips?: number;          // Take Profit in pips / ticks / points
  notes: string;            // Analysis notes, setup descriptions
  screenshot: string | null; // Base64 data URI of compressed screenshot
  createdAt: number;        // Timestamp of entry
  platform?: string;        // Trading platform (e.g., Binance, Bybit, Metatrader, Demo, Challenge, Funded)
  accountCategory?: 'FUNDED' | 'CHALLENGE' | 'DEMO'; // Account category: Funded vs Challenge vs Demo
  timeframe?: string;       // Execution timeframe (e.g., 1m, 5m, 1h)
  htfTimeframe?: string;    // Higher Timeframe (HTF)
  session?: string;         // Trading session (e.g., London, New York)
  liquiditySweep?: string;  // Liquidity Sweep türü (e.g. PDH / PDL, Asia High/Low, Session High/Low)
  liquiditySweeps?: string[]; // Birden fazla Liquidity Sweep seçeneği
  concept?: string;         // legacy fallback
  confirmations?: string[];      // Array of trading confirmations used (e.g., FVG, Orderblock)
  planFidelity?: string | null; // Setup kalitesi (Plan fidelity)
  entry?: string;           // Giriş Modeli (Entry Model e.g. IFVG, FVG, Orderblock)
  entryModels?: string[];   // Birden fazla Giriş Modeli (Multiple Entry Models)
  trend?: string;           // Trend Yapısı (Trend Type e.g. Continuation, Reversal)
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  content: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags?: string[];
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TradeStats {
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;         // Percentage
  totalPnl: number;
  netPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;    // Gross Win / Gross Loss
  largestWin: number;
  largestLoss: number;
  bestAsset: string;
  worstAsset: string;
  weeklyPnl: number;
  monthlyPnl: number;
  
  // R-Multiple properties
  netR: number;
  averageWinRR: number;
  averageLossRR: number;
  profitFactorRR: number;
  largestWinRR: number;
  largestLossRR: number;
  expectancyRR: number;
  expectancyCash?: number;
}

export interface TradeFilter {
  search: string;
  status: 'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN';
  type: 'ALL' | 'LONG' | 'SHORT';
  asset: string;
  timeframe?: string;
  htfTimeframe?: string;
  session?: string;
  confirmation?: string;
  liquiditySweep?: string;
  liquiditySweeps?: string[];
  concept?: string;
  planFidelity?: string;
  entry?: string;
  trend?: string;
  sortBy: 'dateDes' | 'dateAsc' | 'pnlDes' | 'pnlAsc' | 'assetAsc' | 'assetDes' | 'typeAsc' | 'typeDes' | 'rrAsc' | 'rrDes' | 'platformAsc' | 'platformDes';
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

export interface Certificate {
  id: string;
  type: 'PHASE' | 'PAYOUT' | 'OTHER';
  title: string;
  date: string;
  image: string | null;
  description?: string;
  amount?: number;
  createdAt: number;
}

export interface DefinitionTitles {
  platforms: string;
  assets: string;
  liquiditySweeps?: string;
  concepts?: string;
  confirmations: string;
  timeframes: string;
  htfTimeframes: string;
  sessions: string;
  planFidelities: string;
  entryModels?: string;
  trendTypes?: string;
}

