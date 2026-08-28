export interface TickerData {
  symbol: string;
  name: string;
  category: 'STOCK' | 'GOLD' | 'FOREX' | 'CRYPTO' | 'FUND';
}

export const COMMON_TICKERS: TickerData[] = [
  // BIST 30 & Popular
  { symbol: 'THYAO', name: 'Türk Hava Yolları', category: 'STOCK' },
  { symbol: 'AKBNK', name: 'Akbank', category: 'STOCK' },
  { symbol: 'YKBNK', name: 'Yapı ve Kredi Bankası', category: 'STOCK' },
  { symbol: 'GARAN', name: 'Garanti BBVA', category: 'STOCK' },
  { symbol: 'ISCTR', name: 'İş Bankası (C)', category: 'STOCK' },
  { symbol: 'KCHOL', name: 'Koç Holding', category: 'STOCK' },
  { symbol: 'SAHOL', name: 'Sabancı Holding', category: 'STOCK' },
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', category: 'STOCK' },
  { symbol: 'KRDMD', name: 'Kardemir (D)', category: 'STOCK' },
  { symbol: 'TUPRS', name: 'Tüpraş', category: 'STOCK' },
  { symbol: 'SISE', name: 'Şişecam', category: 'STOCK' },
  { symbol: 'ASELS', name: 'Aselsan', category: 'STOCK' },
  { symbol: 'BIMAS', name: 'BİM Mağazalar', category: 'STOCK' },
  { symbol: 'ENKAI', name: 'Enka İnşaat', category: 'STOCK' },
  { symbol: 'FROTO', name: 'Ford Otosan', category: 'STOCK' },
  { symbol: 'TCELL', name: 'Turkcell', category: 'STOCK' },
  { symbol: 'TTKOM', name: 'Türk Telekom', category: 'STOCK' },
  { symbol: 'PETKM', name: 'Petkim', category: 'STOCK' },
  { symbol: 'TOASO', name: 'Tofaş', category: 'STOCK' },
  { symbol: 'SASA', name: 'Sasa Polyester', category: 'STOCK' },
  { symbol: 'HEKTS', name: 'Hektaş', category: 'STOCK' },
  { symbol: 'PGSUS', name: 'Pegasus', category: 'STOCK' },
  { symbol: 'ODAS', name: 'Odaş Elektrik', category: 'STOCK' },
  { symbol: 'ASTOR', name: 'Astor Enerji', category: 'STOCK' },
  { symbol: 'KOZAL', name: 'Koza Altın', category: 'STOCK' },
  
  // US Popular
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCK' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'STOCK' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'STOCK' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'STOCK' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCK' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'STOCK' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'STOCK' },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: 'STOCK' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'STOCK' },
  { symbol: 'INTC', name: 'Intel Corp.', category: 'STOCK' },

  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', category: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', category: 'CRYPTO' },
  { symbol: 'BNB', name: 'Binance Coin', category: 'CRYPTO' },
  { symbol: 'SOL', name: 'Solana', category: 'CRYPTO' },
  { symbol: 'XRP', name: 'Ripple', category: 'CRYPTO' },
  { symbol: 'ADA', name: 'Cardano', category: 'CRYPTO' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'CRYPTO' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'CRYPTO' },
  { symbol: 'DOT', name: 'Polkadot', category: 'CRYPTO' },
  { symbol: 'MATIC', name: 'Polygon', category: 'CRYPTO' },

  // Forex
  { symbol: 'USD', name: 'Amerikan Doları', category: 'FOREX' },
  { symbol: 'EUR', name: 'Euro', category: 'FOREX' },
  { symbol: 'GBP', name: 'İngiliz Sterlini', category: 'FOREX' },
  { symbol: 'JPY', name: 'Japon Yeni', category: 'FOREX' },
  { symbol: 'CHF', name: 'İsviçre Frangı', category: 'FOREX' },
  { symbol: 'CAD', name: 'Kanada Doları', category: 'FOREX' },
  { symbol: 'AUD', name: 'Avustralya Doları', category: 'FOREX' },

  // Gold & Metals
  { symbol: 'GRAMALTIN', name: 'Gram Altın', category: 'GOLD' },
  { symbol: 'XAU', name: 'Ons Altın', category: 'GOLD' },
  { symbol: 'XAG', name: 'Ons Gümüş', category: 'GOLD' },
  { symbol: 'CEYREK', name: 'Çeyrek Altın', category: 'GOLD' },
  { symbol: 'YARIM', name: 'Yarım Altın', category: 'GOLD' },
  { symbol: 'TAM', name: 'Tam Altın', category: 'GOLD' },

  // Popular Funds
  { symbol: 'IIH', name: 'İstanbul Portföy Üçüncü Hisse Senedi Fonu', category: 'FUND' },
  { symbol: 'MAC', name: 'Marmara Capital Hisse Senedi Fonu', category: 'FUND' },
  { symbol: 'NNF', name: 'Hedef Portföy Birinci Hisse Senedi Fonu', category: 'FUND' },
  { symbol: 'YAS', name: 'Yapı Kredi Portföy Koç Holding İştirakleri Fonu', category: 'FUND' },
  { symbol: 'AFT', name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu', category: 'FUND' },
  { symbol: 'YAY', name: 'Yapı Kredi Portföy Yabancı Teknoloji Sektörü Hisse Senedi Fonu', category: 'FUND' },
  { symbol: 'TTA', name: 'İş Portföy Altın Fonu', category: 'FUND' },
];
