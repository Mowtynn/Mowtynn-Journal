export interface Trade {
  id: string;
  asset: string;            // e.g., BTC/USDT, ETH/USDT, AAPL
  type: 'LONG' | 'SHORT';   // Trade direction
  rr: number;               // Risk/Reward ratio (e.g., +2.5 or -1.0)
  pnl: number;              // Manually entered realized Profit & Loss ($)
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'; // Trade result code
  notes: string;            // Analysis notes, setup descriptions
  screenshot: string | null; // Base64 data URI of compressed screenshot
  createdAt: number;        // Timestamp of entry
  platform?: string;        // Trading platform (e.g., Binance, Bybit, Metatrader)
  timeframe?: string;       // Execution timeframe (e.g., 1m, 5m, 1h)
  htfTimeframe?: string;    // Higher Timeframe (HTF)
  session?: string;         // Trading session (e.g., London, New York)
  concept?: string;        // Trading concept used
  confirmations?: string[];      // Array of trading confirmations used (e.g., FVG, Orderblock)
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
  concept?: string;
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
