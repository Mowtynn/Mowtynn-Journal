import { EASE, POPOVER } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import { FilterChip, FILTER_INPUT, FILTER_LABEL } from './filters/FilterControls';
import React, { Suspense, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, Activity, Layers, Percent, Filter, ChevronLeft, ChevronRight, Grid, Clock } from 'lucide-react';
import { Trade } from '../types';
import { caseInsensitiveMatch } from '../constants/constants';
import { HeatmapModal } from './HeatmapModal';
import { MIN_SAMPLE } from '../lib/sampleSize';
import { TradeHistoryModal } from './TradeHistoryModal';
import { lazyWithPreload, named } from '../lib/lazyWithPreload';
import { Deferred, PaneLoader } from './common/Deferred';

// Strateji laboratuvarı ayrı parçada; ekrana yaklaşınca indirilip çizilir
/** breakdowns: Session · Gün · Parite kırılımları · lab: Strateji Laboratuvarı · all: ikisi */
type MetricsPart = 'all' | 'breakdowns' | 'lab';

const StrategyOptimizerHub = lazyWithPreload(() => named(import('./StrategyOptimizerHub'), 'StrategyOptimizerHub'));
/** Laboratuvar parçasını önden indirir (sekme arka planda hazırlanırken) */
export const preloadStrategyHub = () => StrategyOptimizerHub.preload();
import { nyWallDate } from '../lib/tradingTime';
import { formatR, rsigned } from '../lib/format';


const AdvancedMetricsDashboardInner = React.memo(({ trades, onEdit, part = 'all' }: { trades: Trade[], onMetricClick?: (id: string, val: string | number) => void, onEdit?: (trade: Trade) => void, part?: MetricsPart }) => {
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
    
    const dayStats: Record<string, { total: number; wins: number; rr: number }> = {
      'Pzt': { total: 0, wins: 0, rr: 0 },
      'Sal': { total: 0, wins: 0, rr: 0 },
      'Çar': { total: 0, wins: 0, rr: 0 },
      'Per': { total: 0, wins: 0, rr: 0 },
      'Cum': { total: 0, wins: 0, rr: 0 },
      'Cmt': { total: 0, wins: 0, rr: 0 },
      'Paz': { total: 0, wins: 0, rr: 0 },
    };

    closedTrades.forEach(t => {
      const d = nyWallDate(t.createdAt);
      const dayIdx = d.getDay();
      const dayKey = dayNames[dayIdx];
      
      if (dayStats[dayKey] !== undefined) {
        dayStats[dayKey].total++;
        dayStats[dayKey].rr += t.rr || 0;   // Accumulates R ratio
        if (t.status === 'WIN') {
          dayStats[dayKey].wins++;
        }
      }
    });

    // 3. Parite Temizliği (Net kâr/zarar sıralaması in R)
    const assetStatsMap: Record<string, { asset: string; total: number; wins: number; rr: number }> = {};
    closedTrades.forEach(t => {
      if (!assetStatsMap[t.asset]) {
        assetStatsMap[t.asset] = { asset: t.asset, total: 0, wins: 0, rr: 0 };
      }
      assetStatsMap[t.asset].rr += t.rr || 0;
      assetStatsMap[t.asset].total++;
      if (t.status === 'WIN') {
        assetStatsMap[t.asset].wins++;
      }
    });
    const assetRanking = Object.values(assetStatsMap).sort((a, b) => b.rr - a.rr);

    // 4. En kârlı sessionlar (in R)
    const sessionStatsMap: Record<string, { session: string; total: number; wins: number; rr: number }> = {};

    closedTrades.forEach(t => {
      const s = t.session || 'Belirtilmemiş';
      if (!sessionStatsMap[s]) {
        sessionStatsMap[s] = { session: s, total: 0, wins: 0, rr: 0 };
      }
      sessionStatsMap[s].rr += t.rr || 0;
      sessionStatsMap[s].total++;
      if (t.status === 'WIN') {
        sessionStatsMap[s].wins++;
      }

    });
    const sessionRanking = Object.values(sessionStatsMap).sort((a, b) => b.rr - a.rr);

    // 5. Giriş modeli ve hedef: çoklu seçimde işlem her etikete bir kez sayılır (formdaki son girdiler)
    const rankBy = (labelsOf: (t: Trade) => string[] | undefined) => {
      const m = new Map<string, { label: string; total: number; wins: number; rr: number }>();
      closedTrades.forEach((t) => {
        const labels = Array.from(new Set((labelsOf(t) || []).filter(Boolean)));
        labels.forEach((l) => {
          const row = m.get(l) || { label: l, total: 0, wins: 0, rr: 0 };
          row.total++;
          row.rr += t.rr || 0;
          if (t.status === 'WIN') row.wins++;
          m.set(l, row);
        });
      });
      return [...m.values()].sort((x, y) => y.rr - x.rr);
    };
    const entryRanking = rankBy((t) => t.entryModels);
    const targetRanking = rankBy((t) => t.tpTargets);

    return {
      dayStats,
      TurkishDayFullNames,
      assetRanking,
      sessionRanking,
      entryRanking,
      targetRanking,
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
        return assetFilter === 'loss' ? (a.rr - b.rr) : (b.rr - a.rr);
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
      warnings.push("Kazanma oranın çok yüksek (%95 üstü). Girilen verilerde hatalı WIN işlemleri olabilir.");
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
      warnings.push("Sıfır kâr ile kaydedilmiş 'WIN' statüsünde işlemler var. Bunları 'BREAKEVEN' olarak değiştir ya da R gir.");
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
        <p className="text-xs text-zinc-500 max-w-sm">Gelişmiş metriklerin hesaplanabilmesi için sonuçlanmış (WIN/LOSS) işlem eklemelisin.</p>
      </div>
    );
  }

  if (part === 'lab') {
    return (
      <Suspense fallback={<PaneLoader minHeight={520} />}>
        <StrategyOptimizerHub trades={trades} onEdit={onEdit} />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col bg-zinc-900/70 border border-zinc-700/50  rounded-2xl transition-ui duration-200 shadow-sm overflow-hidden divide-y divide-zinc-800/80 w-full">
      
        {/* SESSION PERFORMANSI & NET KAZANÇ GÜN DAĞILIMI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* SESSION PERFORMANSI */}
          <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 flex flex-col justify-between h-full transition-colors duration-200">
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center h-6 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Clock size={12} /></span>
                  <h3 className="heading-3 text-zinc-400 tracking-wider font-sans" title={`Her seansın toplam R'si (çubuk) ve kazanma oranı. ${MIN_SAMPLE} işlemden azı "Az Veri".`}>
                    {smartUpper('Session Performansı')}
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
              <p className="text-[10px] text-zinc-500 -mt-1 mb-2">Seans başına toplam R ve kazanma oranı.</p>

            <div className="flex-1 flex flex-col py-0.5">
              <div className="flex flex-col gap-2 w-full">
                {(() => {
                  let sortedSessions = [...customMetrics.sessionRanking];
                  if (sessionSort === 'pnl') {
                    sortedSessions.sort((a, b) => b.rr - a.rr);
                  } else if (sessionSort === 'loss') {
                    sortedSessions.sort((a, b) => a.rr - b.rr);
                  } else if (sessionSort === 'winrate') {
                    sortedSessions.sort((a, b) => (b.total > 0 ? b.wins / b.total : 0) - (a.total > 0 ? a.wins / a.total : 0));
                  }
                  
                  const srMaxPnL = Math.max(...sortedSessions.map(sr => Math.abs(sr.rr)), 1);

                  return sortedSessions.map((sr, idx) => {
                    const isProfit = sr.rr >= 0;
                    const pnlTone = sr.rr > 1e-9 ? 'text-emerald-400' : sr.rr < -1e-9 ? 'text-rose-400' : 'text-zinc-400';
                    const winRate = sr.total > 0 ? (sr.wins / sr.total) * 100 : 0;
                    const barWidth = Math.min(100, (Math.abs(sr.rr) / srMaxPnL) * 100);

                    const readableSession = smartUpper(sr.session);

                    // Seans adları nötr; renk yalnızca sonucu (çubuk) anlatır
                    const sessionColors = 'text-zinc-200';

                    return (
                      <div key={idx} className="bg-zinc-800 px-2 py-1.5 flex flex-col justify-center rounded-lg border border-zinc-700/50">
                        <div className="flex items-center justify-between text-[9px] font-sans mb-1">
                          <div className="flex items-center gap-1.5">
                            <Clock size={9} className={`${sessionColors}`} />
                            <span className={`font-black tracking-wide uppercase ${sessionColors}`}>
                              {readableSession}
                            </span>
                            <span className="text-zinc-500 font-normal text-[9px]">
                              ({sr.total} işlem · %{winRate.toFixed(0)} WR)
                            </span>
                            {sr.total < MIN_SAMPLE && <span className="px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide" >Az Veri</span>}
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${pnlTone}`}>
                              {rsigned(sr.rr)} <span className="text-[9px] text-zinc-500">R</span>
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
            {/* Giriş modeli ve hedef: formdaki kurulum girdilerinin sonuca katkısı (seans listesinin altındaki boşluğu da doldurur) */}
            {(customMetrics.entryRanking.length > 0 || customMetrics.targetRanking.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-800/70">
                <MiniRanking title="Entry Model" rows={customMetrics.entryRanking} />
                <MiniRanking title="Target" rows={customMetrics.targetRanking} />
              </div>
            )}
            </div>
          </motion.div>

          {/* Net PnL Gün Dağılımı */}
          <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 flex flex-col justify-between h-full transition-colors duration-200">
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center h-6 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Percent size={12} /></span>
                  <h3 className="heading-3 text-zinc-400 tracking-wider font-sans" title={`Haftanın her gününün (NY) toplam R'si; parantezde işlem sayısı ve kazanma oranı. ${MIN_SAMPLE} işlemden azı "Az Veri".`}>
                    {smartUpper('Net Kazanç Gün Dağılımı')}
                  </h3>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 -mt-1 mb-2">Haftanın günlerine (NY) göre toplam R; parantezde işlem sayısı ve kazanma oranı.</p>

              <div className="flex-1 flex flex-col justify-between py-0.5 space-y-1.5">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(dayKey => {
                const stats = customMetrics.dayStats[dayKey] || { total: 0, wins: 0, rr: 0 };
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
                        {stats.total > 0 && <span className="text-[9px] font-normal text-zinc-500 tabular-nums">({stats.total} işlem · %{((stats.wins / stats.total) * 100).toFixed(0)} WR)</span>}
                        {stats.total > 0 && stats.total < MIN_SAMPLE && <span className="px-1 py-px rounded border border-zinc-700 bg-zinc-900 text-[8px] font-bold text-zinc-400 uppercase tracking-wide" >Az Veri</span>}
                      </span>
                      <span className={`text-[10px] font-bold font-sans flex items-center gap-1.5 ${val > 1e-9 ? 'text-emerald-400' : val < -1e-9 ? 'text-rose-400' : 'text-zinc-500'}`}>
                        {(
                          <>
                            <span>
                              {rsigned(val)}{' '}
                              <span className="text-[9px] text-zinc-500">R</span>
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Dual relative progress bar */}
                    <div className="grid grid-cols-2 gap-[2px] h-1.5 rounded-full overflow-hidden bg-zinc-800/80 relative">
                      {/* Central separator axis */}
                      <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-zinc-600 z-10"></div>
                      
                      <div className="flex justify-end">
                        {!isProfitVal && val !== 0 && (
                          <motion.div 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: pnlPercentage / 100 }}
                            style={{ transformOrigin: "right", width: "100%" }}
                            className="bg-gradient-to-l from-rose-500 to-rose-600 rounded-l-full h-full "
                          />
                        )}
                      </div>
                      <div className="flex justify-start">
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
        className="p-4 sm:p-5 transition-colors duration-200 overflow-hidden flex flex-col"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-20 w-full border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center"><Layers size={12} /></span>
            <h3 className="heading-3 text-zinc-400 tracking-wider font-sans" title={`Her paritenin net R'si, kazanma oranı ve işlem başı R'si. ${MIN_SAMPLE} işlemden azı "Az Veri".`}>
              {smartUpper('Parite İstatistikleri')}
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
          <div className="text-center py-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 flex-1 min-h-[160px] flex flex-col items-center justify-center">
            <AlertTriangle className="mx-auto text-amber-500/60 mb-2" size={24} />
            <p className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{smartUpper("Seçilen kriterlere uygun parite bulunamadı.")}</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Parite Kart Grubu Grid */}
            <AnimatePresence initial={false}>
              <motion.div
                key={assetsPage}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: 0.1, ease: EASE }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start"
              >
                {processedAssets.slice((assetsPage - 1) * 9, assetsPage * 9).map((ar) => {
                  const isSelected = selectedAsset === ar.asset;
                  const winRate = ar.total > 0 ? (ar.wins / ar.total) * 100 : 0;
                  const isProfit = ar.rr >= 0;
                  
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
                          <span className={`whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${isProfit ? 'toggle-item-win' : 'toggle-item-loss'}`}>
                            {ar.total} İŞLEM
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1 z-10">
                          <div className="flex justify-between items-center text-[9px] font-sans">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">Net R</span>
                            <span className={`font-bold tracking-wider text-xs ${ar.rr > 0 ? 'text-emerald-400' : ar.rr < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                              {formatR(ar.rr)}
                            </span>
                          </div>
 
                          {/* Divider */}
                          <div className="h-px w-full bg-zinc-800/50 group-hover:bg-zinc-700/60 transition-colors duration-200 my-0.5" />
 
                          <div className="flex justify-between items-center text-[9px] font-sans">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">WR</span>
                            <span className="font-bold tracking-wider text-xs text-zinc-200">
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

      {/* Strateji & Edge Geliştirme Laboratuvarı (yalnızca 'all' görünümünde) */}
      {part === 'all' && (
        <motion.div variants={itemVariants} className="w-full my-3">
          <Deferred minHeight={520} idleMs={800}>
            <StrategyOptimizerHub trades={trades} onEdit={onEdit} />
          </Deferred>
        </motion.div>
      )}

      <TradeHistoryModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset || ""}
        icon={<Activity size={16} className="shrink-0" />}
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

/** Kısa sıralı liste: etiket, işlem sayısı · WR ve net R; çubuk en büyük mutlak R'ye göre */
function MiniRanking({ title, rows }: { title: string; rows: { label: string; total: number; wins: number; rr: number }[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.rr)), 1);
  return (
    <div className="min-w-0">
      <div className="heading-3 text-zinc-500 mb-1.5">{smartUpper(title)}</div>
      {rows.length === 0 ? (
        <div className="text-[10px] text-zinc-600">Veri yok</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.slice(0, 5).map((r) => (
            <li key={r.label} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-[10px]">
                <span className="font-bold text-zinc-200 uppercase tracking-wide truncate">{r.label}</span>
                <span className={`font-bold tabular-nums shrink-0 ${r.rr > 1e-9 ? 'text-emerald-400' : r.rr < -1e-9 ? 'text-rose-400' : 'text-zinc-400'}`}>{formatR(r.rr)}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.rr >= 0 ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`} style={{ width: `${Math.min(100, (Math.abs(r.rr) / max) * 100)}%` }} />
                </div>
                <span className="text-[9px] text-zinc-500 tabular-nums shrink-0">{r.total} · %{r.total ? Math.round((r.wins / r.total) * 100) : 0}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const AdvancedMetricsDashboard = React.memo((props: { trades: Trade[], onMetricClick?: (id: string, val: string | number) => void, onEdit?: (trade: Trade) => void, part?: MetricsPart }) => {
  return <AdvancedMetricsDashboardInner {...props} />;
});
