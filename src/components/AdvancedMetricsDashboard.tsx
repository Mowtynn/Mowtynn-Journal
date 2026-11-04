import { EASE, POPOVER } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import { FilterChip, FILTER_INPUT, FILTER_LABEL } from './filters/FilterControls';
import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, Activity, Layers, Percent, Filter, ChevronLeft, ChevronRight, Grid, Clock } from 'lucide-react';
import { Trade } from '../types';
import { caseInsensitiveMatch } from '../constants/constants';
import { HeatmapModal } from './HeatmapModal';
import { MIN_SAMPLE } from '../lib/sampleSize';
import { TradeHistoryModal } from './TradeHistoryModal';
import { lazyWithPreload, named } from '../lib/lazyWithPreload';
import { Deferred } from './common/Deferred';

// Strateji laboratuvarı ayrı parçada; ekrana yaklaşınca indirilip çizilir
const StrategyOptimizerHub = lazyWithPreload(() => named(import('./StrategyOptimizerHub'), 'StrategyOptimizerHub'));
/** Laboratuvar parçasını önden indirir (sekme arka planda hazırlanırken) */
export const preloadStrategyHub = () => StrategyOptimizerHub.preload();
import { nyWallDate } from '../lib/tradingTime';


const AdvancedMetricsDashboardInner = React.memo(({ trades, onEdit }: { trades: Trade[], onMetricClick?: (id: string, val: string | number) => void, onEdit?: (trade: Trade) => void }) => {
  const [selectedAsset, setSelectedAsset] = React.useState<string | null>(null);

  const [assetSort, setAssetSort] = React.useState<'pnl' | 'winrate' | 'rr' | 'trades_desc' | 'trades_asc'>('pnl');
  const [assetFilter, setAssetFilter] = React.useState<'all' | 'profitable' | 'loss'>('all');
  const [assetsPage, setAssetsPage] = React.useState(1);
  const [sessionSort, setSessionSort] = React.useState<'pnl' | 'loss' | 'winrate'>('pnl');
  const [assetSearch, setAssetSearch] = React.useState('');

  const [isAssetFilterOpen, setIsAssetFilterOpen] = React.useState(false);
  const [isSessionFilterOpen, setIsSessionFilterOpen] = React.useState(false);
  const [isHeatmapOpen, setIsHeatmapOpen] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isHeatmapOpen) {
          setIsHeatmapOpen(false);
        } else if (selectedAsset) {
          setSelectedAsset(null);
        } else {
          setIsAssetFilterOpen(false);
          setIsSessionFilterOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isHeatmapOpen,
    selectedAsset
  ]);

  // Gelişmiş Filtreli ve Optimizasyonlu Yeni Kuant Metrikler
  const customMetrics = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const closedTrades = trades;

    // 2. Haftalık Gün Dağılımı ve Başarı Oranları (En Kanlı Gün ve Net R Dağılımı)
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const TurkishDayFullNames: Record<string, string> = {
      'Pzt': 'Pazartesi',
      'Sal': 'Salı',
      'Çar': 'Çarşamba',
      'Per': 'Perşembe',
      'Cum': 'Cuma',
      'Cmt': 'Cumartesi',
      'Paz': 'Pazar'
    };
    
    const dayStats: Record<string, { total: number; wins: number; pnl: number; rr: number }> = {
      'Pzt': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Sal': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Çar': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Per': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Cum': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Cmt': { total: 0, wins: 0, pnl: 0, rr: 0 },
      'Paz': { total: 0, wins: 0, pnl: 0, rr: 0 },
    };

    closedTrades.forEach(t => {
      const d = nyWallDate(t.createdAt);
      const dayIdx = d.getDay();
      const dayKey = dayNames[dayIdx];
      
      if (dayStats[dayKey] !== undefined) {
        dayStats[dayKey].total++;
        dayStats[dayKey].pnl += t.rr || 0;
        dayStats[dayKey].rr += t.rr || 0;   // Accumulates R ratio
        if (t.status === 'WIN') {
          dayStats[dayKey].wins++;
        }
      }
    });

    // 3. Parite Temizliği (Net kâr/zarar sıralaması in R)
    const assetStatsMap: Record<string, { asset: string; pnl: number; total: number; wins: number; rr: number }> = {};
    closedTrades.forEach(t => {
      if (!assetStatsMap[t.asset]) {
        assetStatsMap[t.asset] = { asset: t.asset, pnl: 0, total: 0, wins: 0, rr: 0 };
      }
      assetStatsMap[t.asset].pnl += t.rr || 0;
      assetStatsMap[t.asset].rr += t.rr || 0;
      assetStatsMap[t.asset].total++;
      if (t.status === 'WIN') {
        assetStatsMap[t.asset].wins++;
      }
    });
    const assetRanking = Object.values(assetStatsMap).sort((a, b) => b.rr - a.rr);

    // 4. En kârlı sessionlar (in R)
    const sessionStatsMap: Record<string, { session: string; pnl: number; total: number; wins: number; rr: number }> = {};

    closedTrades.forEach(t => {
      const s = t.session || 'Bilinmeyen';
      if (!sessionStatsMap[s]) {
        sessionStatsMap[s] = { session: s, pnl: 0, total: 0, wins: 0, rr: 0 };
      }
      sessionStatsMap[s].pnl += t.rr || 0;
      sessionStatsMap[s].rr += t.rr || 0;
      sessionStatsMap[s].total++;
      if (t.status === 'WIN') {
        sessionStatsMap[s].wins++;
      }

    });
    const sessionRanking = Object.values(sessionStatsMap).sort((a, b) => b.rr - a.rr);

    return {
      dayStats,
      TurkishDayFullNames,
      assetRanking,
      sessionRanking,
    };
  }, [trades]);


    

  const processedAssets = useMemo(() => {
    if (!customMetrics || !customMetrics.assetRanking) return [];
    let filtered = customMetrics.assetRanking;
    
    if (assetFilter === 'profitable') {
      filtered = filtered.filter(ar => (ar.rr) > 0);
    } else if (assetFilter === 'loss') {
      filtered = filtered.filter(ar => (ar.rr) < 0);
    }

    if (assetSearch.trim()) {
      filtered = filtered.filter(ar => caseInsensitiveMatch(ar.asset, assetSearch));
    }

    return [...filtered].sort((a, b) => {
      if (assetSort === 'pnl') {
        return assetFilter === 'loss' ? (a.pnl - b.pnl) : (b.pnl - a.pnl);
      }
      if (assetSort === 'winrate') {
        const wrA = a.total > 0 ? a.wins / a.total : 0;
        const wrB = b.total > 0 ? b.wins / b.total : 0;
        return assetFilter === 'loss' ? (wrA - wrB) : (wrB - wrA);
      }
      if (assetSort === 'rr') {
        return assetFilter === 'loss' ? avgR(a) - avgR(b) : avgR(b) - avgR(a);
      }
      if (assetSort === 'trades_desc') {
        return b.total - a.total;
      }
      if (assetSort === 'trades_asc') {
        return a.total - b.total;
      }
      return 0;
    });
  }, [customMetrics, assetSort, assetFilter, assetSearch]);


  const selectedAssetTrades = useMemo(() => {
    if (!selectedAsset) return [];
    return trades
      .filter(t => t.asset === selectedAsset)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [trades, selectedAsset]);

  const integrityAnalysis = useMemo(() => {
    let hasIntegrityIssue = false;
    let warnings: string[] = [];

    const closedTrades = trades;
    const winTrades = closedTrades.filter(t => t.status === 'WIN');
    const lossTrades = closedTrades.filter(t => t.status === 'LOSS');
    const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0;
    
    const grossProfit = winTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (t.rr || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0);

    if (winRate > 95 && trades.length > 5) {
      hasIntegrityIssue = true;
      warnings.push("Kazanma oranınız çok yüksek (>95%). Girilen verilerde hatalı WIN işlemleri olabilir.");
    }
    
    // Az işlemde (ör. henüz kayıp yokken) yüksek PF doğaldır; uyarı yalnızca yeterli örneklemde
    if (closedTrades.length >= 20 && profitFactor > 50) {
      hasIntegrityIssue = true;
      warnings.push("Kâr Faktörü (Profit Factor) çok yüksek. Zarar (Loss) işlemlerinin eksik veya hatalı girilmediğinden emin olun.");
    }

    const extremeRRTrades = trades.filter(t => t.rr && (t.rr > 50 || t.rr < -10));
    if (extremeRRTrades.length > 0) {
      hasIntegrityIssue = true;
      warnings.push("İstatistikleri bozabilecek ekstrem R:R değerlerine sahip işlemler tespit edildi (örn >50R veya <-10R).");
    }

    const noPnlWinTrades = trades.filter(t => t.status === 'WIN' && (t.rr === 0 || !t.rr));
    if (noPnlWinTrades.length > 0) {
      hasIntegrityIssue = true;
      warnings.push("Sıfır kâr ile kaydedilmiş 'WIN' statüsünde işlemler var. Lütfen bunları 'BREAKEVEN' olarak değiştirin veya R girin.");
    }

    return { hasIntegrityIssue, warnings };
  }, [trades]);

  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: EASE } }
  };


  if (!customMetrics || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/70 border border-zinc-700/50  rounded-xl transition-ui duration-200 shadow-sm mt-4">
        <Target size={32} className="text-zinc-600 mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-zinc-300 font-sans mb-2">Henüz Yeterli Veri Yok</h3>
        <p className="text-xs text-zinc-500 max-w-sm">Gelişmiş metriklerin hesaplanabilmesi için sisteme tamamlanmış (WIN/LOSS) işlemler eklemelisiniz.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-4 flex flex-col bg-zinc-900/70 border border-zinc-700/50  rounded-xl transition-ui duration-200 shadow-sm overflow-hidden divide-y divide-zinc-800/80 w-full">
      
        {/* SESSION PERFORMANSI & NET KAZANÇ GÜN DAĞILIMI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* SESSION PERFORMANSI */}
          <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 flex flex-col justify-between h-full transition-colors duration-200">
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center h-6 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-400" />
                  <h3 className="heading-2">
                    SESSION PERFORMANSI
                  </h3>
                  <button aria-label="Filtrele"
                    onClick={() => setIsSessionFilterOpen(!isSessionFilterOpen)}
                    className={`flex items-center justify-center w-7 h-7 ml-1 rounded-lg border transition-colors duration-200 ease-out ${
                      isSessionFilterOpen 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                    } shrink-0`}
                  >
                    <Filter size={9} />
                  </button>
                  <button aria-label="Izgara görünümü"
                    onClick={() => setIsHeatmapOpen(true)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg border transition-colors duration-200 ease-out bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 shrink-0"
                  >
                    <Grid size={9} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isSessionFilterOpen && (
                    <motion.div
                      key="session-filter-panel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: EASE }}
                      className="overflow-hidden whitespace-nowrap "
                    >
                      <div className="flex gap-1">
                        <button onClick={() => setSessionSort('pnl')} className={`px-2 py-0.5 rounded-lg heading-3 transition-colors duration-200 ease-out border ${sessionSort === 'pnl' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Net R</button>
                        <button onClick={() => setSessionSort('loss')} className={`px-2 py-0.5 rounded-lg heading-3 transition-colors duration-200 ease-out border ${sessionSort === 'loss' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Zarar</button>
                        <button onClick={() => setSessionSort('winrate')} className={`px-2 py-0.5 rounded-lg heading-3 transition-colors duration-200 ease-out border ${sessionSort === 'winrate' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>WR</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="flex flex-col gap-1 w-full h-full justify-between">
                {(() => {
                  let sortedSessions = [...customMetrics.sessionRanking];
                  if (sessionSort === 'pnl') {
                    sortedSessions.sort((a, b) => b.pnl - a.pnl);
                  } else if (sessionSort === 'loss') {
                    sortedSessions.sort((a, b) => a.pnl - b.pnl);
                  } else if (sessionSort === 'winrate') {
                    sortedSessions.sort((a, b) => (b.total > 0 ? b.wins / b.total : 0) - (a.total > 0 ? a.wins / a.total : 0));
                  }
                  
                  const srMaxPnL = Math.max(...sortedSessions.map(sr => Math.abs(sr.pnl)), 1);

                  return sortedSessions.map((sr, idx) => {
                    const isProfit = sr.pnl >= 0;
                    const winRate = sr.total > 0 ? (sr.wins / sr.total) * 100 : 0;
                    const barWidth = Math.min(100, (Math.abs(sr.pnl) / srMaxPnL) * 100);

                    const readableSession = sr.session === 'Bilinmeyen' ? 'Diğer Seanslar' : sr.session;

                    const sessionColors = sr.session === 'Asia' ? 'text-blue-400' :
                                          sr.session === 'London' ? 'text-purple-400' :
                                          sr.session === 'NY AM' ? 'text-amber-400' :
                                          sr.session === 'NY PM' ? 'text-orange-400' : 'text-zinc-300';

                    return (
                      <div key={idx} className="bg-zinc-800 px-2 py-1.5 flex flex-col justify-center rounded-lg border border-zinc-700/50">
                        <div className="flex items-center justify-between text-[9px] font-sans mb-1">
                          <div className="flex items-center gap-1.5">
                            <Clock size={9} className={`${sessionColors}`} />
                            <span className={`font-black tracking-wide uppercase ${sessionColors}`}>
                              {readableSession}
                            </span>
                            <span className="text-zinc-500 font-normal text-[9px]">
                              ({sr.total} Trade・%{winRate.toFixed(0)} WR)
                            </span>
                            {sr.total < MIN_SAMPLE && <span className="px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide" >Az Veri</span>}
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{(sr?.rr || 0).toFixed(2)} <span className="text-[9px] text-zinc-500">R</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-zinc-950 rounded-full overflow-hidden flex">
                            <motion.div 
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: barWidth / 100 }}
                              style={{ transformOrigin: "left", width: "100%" }}
                              transition={{ duration: 0.15, ease: EASE }}
                              className={`h-full rounded-full ${isProfit ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500' : 'bg-gradient-to-r from-rose-500/20 to-rose-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                {customMetrics.sessionRanking.length === 0 && (
                  <div className="text-center py-6 text-[9px] text-zinc-600 font-sans uppercase tracking-widest flex-1 flex items-center justify-center">
                    {smartUpper("Veri Yok")}
                  </div>
                )}
              </div>
            </div>
            </div>
          </motion.div>

          {/* Net PnL Gün Dağılımı */}
          <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 flex flex-col justify-between h-full transition-colors duration-200">
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center h-6 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Percent size={13} className="text-blue-400" />
                  <h3 className="heading-2">
                    NET KAZANÇ GÜN DAĞILIMI
                  </h3>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between py-0.5 space-y-1.5">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(dayKey => {
                const stats = customMetrics.dayStats[dayKey] || { total: 0, wins: 0, pnl: 0, rr: 0 };
                const fullDayName = customMetrics.TurkishDayFullNames[dayKey];

                const maxDayPnlAbs = Math.max(...Object.values(customMetrics.dayStats).map(d => Math.abs(d.rr)), 1);
                const val = stats.rr;
                const isProfitVal = val >= 0;
                const pnlPercentage = Math.min((Math.abs(val) / maxDayPnlAbs) * 100, 100);

                return (
                  <div key={dayKey}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-xs font-bold text-zinc-200 tracking-tight font-sans flex items-center gap-1.5">
                        {fullDayName}
                        {stats.total > 0 && stats.total < MIN_SAMPLE && <span className="px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide" >Az Veri</span>}
                      </span>
                      <span className={`text-[10px] font-bold font-sans flex items-center gap-1.5 ${isProfitVal ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(
                          <>
                            <span>
                              {val !== 0 ? (isProfitVal ? '+' : '') + val.toFixed(2) : '0'}{' '}
                              <span className="text-[9px] text-zinc-500">R</span>
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Dual relative progress bar */}
                    <div className="grid grid-cols-2 gap-[2px] h-1.5 rounded-full overflow-hidden border border-zinc-850/80 p-[1px] bg-zinc-950 relative">
                      {/* Central separator axis */}
                      <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-zinc-850 z-10"></div>
                      
                      <div className="flex justify-end pr-[1px]">
                        {!isProfitVal && val !== 0 && (
                          <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: pnlPercentage / 100 }}
                            style={{ transformOrigin: "right", width: "100%" }}
                            className="bg-gradient-to-l from-rose-500 to-rose-600 rounded-l-full h-full "
                          />
                        )}
                      </div>
                      <div className="flex justify-start pl-[1px]">
                        {isProfitVal && val !== 0 && (
                          <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: pnlPercentage / 100 }}
                            style={{ transformOrigin: "left", width: "100%" }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-r-full h-full "
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </motion.div>
        </div>

      {/* PARİTE İSTATİSTİKLERİ SECTION - REPOSITIONED HERE */}
      <motion.div 
        variants={itemVariants} 
        className="bg-zinc-900/70 border border-zinc-700/50  p-5 shadow-sm transition-colors duration-200 rounded-xl overflow-hidden mb-3 flex flex-col justify-between min-h-[480px]"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-20 w-full border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-400" />
            <h3 className="heading-2">
              Parite İstatistikleri
            </h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative">
            <AnimatePresence>
              {isAssetFilterOpen && (
                <motion.div
                  key="asset-filter-panel"
                  {...POPOVER}
                  className="origin-top-right absolute right-0 top-full mt-2 z-30 w-[min(22rem,calc(100vw-2rem))] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-xl p-2 flex flex-col gap-2 select-none"
                >
                  <input
                    type="search"
                    placeholder="Parite ara…"
                    aria-label="Parite ara"
                    value={assetSearch}
                    onChange={(e) => { setAssetSearch(e.target.value); setAssetsPage(1); }}
                    className={FILTER_INPUT}
                  />
                  <div className="flex flex-col gap-1">
                    <span className={FILTER_LABEL}>Göster</span>
                    <div className="flex flex-wrap gap-1.5">
                      {([['all', 'Tümü', 'neutral'], ['profitable', 'Kâr', 'win'], ['loss', 'Zarar', 'loss']] as const).map(([v, label, tone]) => (
                        <FilterChip key={v} tone={tone} check={false} active={assetFilter === v} onClick={() => { setAssetFilter(v); setAssetsPage(1); }}>
                          {label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={FILTER_LABEL}>Sırala</span>
                    <div className="flex flex-wrap gap-1.5">
                      {([['pnl', 'Net R'], ['rr', 'Ort. R'], ['winrate', 'WR'], ['trades_desc', 'İşlem ↓'], ['trades_asc', 'İşlem ↑']] as const).map(([v, label]) => (
                        <FilterChip key={v} check={false} active={assetSort === v} onClick={() => { setAssetSort(v); setAssetsPage(1); }}>
                          {label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button aria-label="Filtrele"
              type="button"
              onClick={() => {
                setIsAssetFilterOpen(!isAssetFilterOpen);
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors duration-200 ease-out ${
                isAssetFilterOpen 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
              } shrink-0`}
            >
              <Filter size={12} /> 
            </button>
          </div>
        </div>

        

        {processedAssets.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 flex-1 min-h-[350px] flex flex-col items-center justify-center">
            <AlertTriangle className="mx-auto text-amber-500/60 mb-2" size={24} />
            <p className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{smartUpper("Seçilen kriterlere uygun parite bulunamadı.")}</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between min-h-[440px]">
            {/* Parite Kart Grubu Grid */}
            <AnimatePresence initial={false}>
              <motion.div
                key={assetsPage}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: 0.1, ease: EASE }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 flex-1 content-start min-h-[385px]"
              >
                {processedAssets.slice((assetsPage - 1) * 9, assetsPage * 9).map((ar) => {
                  const isSelected = selectedAsset === ar.asset;
                  const winRate = ar.total > 0 ? (ar.wins / ar.total) * 100 : 0;
                  const isProfit = ar.pnl >= 0;
                  
                  return (
                    <button
                      lang="en"
                      key={ar.asset}
                      onClick={() => setSelectedAsset(isSelected ? null : ar.asset)}
                      className={`text-left p-2.5 rounded-lg border transition-ui duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                        isSelected 
                          ? (isProfit ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-rose-500/10 border-rose-500/40')
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700/80'
                      }`}
                    >
                      {/* Decorative background flare depending on the profitability */}
                      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.05] group-hover:opacity-[0.16] group-hover:scale-105 ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'} transition-ui duration-200`} />
                      
                      <div className="w-full">
                        <div className="flex justify-between items-center z-10 mb-1">
                          <span className="font-extrabold text-xs text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                            {ar.asset}
                            {ar.total < MIN_SAMPLE && <span className="px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide" >Az Veri</span>}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${isProfit ? 'toggle-item-win' : 'toggle-item-loss'}`}>
                            {ar.total} İŞLEM
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1 z-10">
                          <div className="flex justify-between items-center text-[9px] font-sans">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">Net R</span>
                            <span className={`font-bold tracking-wider text-xs ${ar.rr >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                              {ar.rr >= 0 ? '+' : ''}{ar.rr.toFixed(2)} R
                            </span>
                          </div>
 
                          {/* Divider */}
                          <div className="h-px w-full bg-zinc-800/50 group-hover:bg-zinc-700/60 transition-colors duration-200 my-0.5" />
 
                          <div className="flex justify-between items-center text-[9px] font-sans">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">WR</span>
                            <span className={`font-bold tracking-wider text-xs ${winRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                              %{winRate.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Pagination Controls */}
            {processedAssets.length > 0 && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3.5 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <span>Toplam</span>
                  <span className="text-zinc-200 font-semibold">{processedAssets.length}</span>
                  <span>Parite</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-zinc-400 tabular-nums flex items-center leading-none">
                    Sayfa: {assetsPage}/{Math.max(1, Math.ceil(processedAssets.length / 9))}
                  </span>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-xs">
                    <button aria-label="Önceki"
                      type="button"
                      onClick={() => setAssetsPage(prev => Math.max(1, prev - 1))}
                      disabled={assetsPage <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <div className="w-px h-3.5 bg-zinc-800" />
                    <button aria-label="Sonraki"
                      type="button"
                      onClick={() => setAssetsPage(prev => Math.min(Math.ceil(processedAssets.length / 9), prev + 1))}
                      disabled={assetsPage >= Math.ceil(processedAssets.length / 9)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Strateji & Edge Geliştirme Laboratuvarı */}
      <motion.div variants={itemVariants} className="w-full my-3">
        <Deferred minHeight={520} idleMs={800}>
          <StrategyOptimizerHub trades={trades} onEdit={onEdit} />
        </Deferred>
      </motion.div>

      <TradeHistoryModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset || ""}
        icon={<Activity size={16} className="mr-1.5 text-blue-400 shrink-0" />}
        trades={selectedAssetTrades}
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedAsset(null);
        }}
      />

      {/* Sistem Bütünlüğü ve Veri Analizi */}
      {integrityAnalysis.hasIntegrityIssue && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 max-w-4xl mx-auto w-full"
        >
          <div className="flex items-center gap-1.5 shrink-0 text-rose-400">
            <AlertTriangle size={13} />
            <span className="font-sans heading-3">Veri Uyarısı ({integrityAnalysis.warnings.length})</span>
          </div>
          <ul className="flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1">
            {integrityAnalysis.warnings.map((w, idx) => (
              <li key={idx} className="text-zinc-400 text-[9px] flex items-center gap-1">
                <span className="h-0.5 w-0.5 rounded-full bg-rose-500/50 shrink-0" />
                <span className="leading-none">{w}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      
      <HeatmapModal
        isOpen={isHeatmapOpen}
        onClose={() => setIsHeatmapOpen(false)}
        trades={trades}
      />


    </div>
  );
});


/** İşlem başına ortalama R (sıralama için) */
const avgR = (x: { rr: number; total: number }) => (x.total > 0 ? x.rr / x.total : 0);

export const AdvancedMetricsDashboard = React.memo((props: { trades: Trade[], onMetricClick?: (id: string, val: string | number) => void, onEdit?: (trade: Trade) => void }) => {
  return <AdvancedMetricsDashboardInner {...props} />;
});
