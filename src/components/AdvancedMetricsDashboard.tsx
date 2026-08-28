import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Target, Infinity as InfinityIcon, Calendar, AlertTriangle, Activity, Layers, Percent, X, CheckCircle2, Minus, Filter, ChevronLeft, ChevronRight, ChevronsUpDown, Search, Grid, SlidersHorizontal, Download, Clock } from 'lucide-react';
import { Trade } from '../types';
import { HeatmapModal } from './HeatmapModal';
import { useMetricMode } from '../context/MetricContext';
import { calculateAdvancedMetrics } from '../lib/advancedMetrics';
import TradeDetailModal from './TradeDetailModal';
import { PrintReportModal } from './PrintReportModal';


export const AdvancedMetricsDashboard = React.memo(({ trades, currency, onEdit, sessions = [] }: { trades: Trade[], currency: string, onMetricClick?: (id: string, val: string | number) => void, onEdit?: (trade: Trade) => void, sessions?: string[] }) => {
  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null);
  const [selectedAsset, setSelectedAsset] = React.useState<string | null>(null);
  const [selectedPerformancePeriod, setSelectedPerformancePeriod] = React.useState<{
    label: string;
    trades: Trade[];
  } | null>(null);
  const [printModalState, setPrintModalState] = React.useState<{
    isOpen: boolean;
    trades: Trade[];
    title: string;
    dateRangeText: string;
  }>({
    isOpen: false,
    trades: [],
    title: '',
    dateRangeText: ''
  });
  const [assetSort, setAssetSort] = React.useState<'pnl' | 'winrate' | 'rr' | 'trades_desc' | 'trades_asc'>('pnl');
  const [assetFilter, setAssetFilter] = React.useState<'all' | 'profitable' | 'loss'>('all');
  const [detailedFilter, setDetailedFilter] = React.useState<'all' | 'mükemmel' | 'riskli'>('all');
  const [detailedSort, setDetailedSort] = React.useState<'pnl' | 'rr' | 'winrate'>('pnl');
  const [detailedPage, setDetailedPage] = React.useState(1);
  const [deadZonePage, setDeadZonePage] = React.useState(1);
  const [assetsPage, setAssetsPage] = React.useState(1);
  const [sessionSort, setSessionSort] = React.useState<'pnl' | 'loss' | 'winrate'>('pnl');
  const [performanceTimeframe, setPerformanceTimeframe] = React.useState<'day' | 'week' | 'month' | 'year'>('week');
  const { isRrMode } = useMetricMode();
  const [assetSearch, setAssetSearch] = React.useState('');
  const [detailedSearch, setDetailedSearch] = React.useState('');
  const [deadZoneSearch, setDeadZoneSearch] = React.useState('');
  const [deadZoneSort, setDeadZoneSort] = React.useState<'pnl' | 'rr' | 'winrate'>('pnl');

  const [expandedAssets, setExpandedAssets] = React.useState<Record<string, boolean>>({});

  const [isAssetFilterOpen, setIsAssetFilterOpen] = React.useState(false);
  const [isDetailedFilterOpen, setIsDetailedFilterOpen] = React.useState(false);
  const [isSessionFilterOpen, setIsSessionFilterOpen] = React.useState(false);
  const [isHeatmapOpen, setIsHeatmapOpen] = React.useState(false);
  const [isDeadZoneModalOpen, setIsDeadZoneModalOpen] = React.useState(false);
  const [isOptimalFreqModalOpen, setIsOptimalFreqModalOpen] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeadZoneModalOpen) {
          setIsDeadZoneModalOpen(false);
        } else if (isOptimalFreqModalOpen) {
          setIsOptimalFreqModalOpen(false);
        } else if (isHeatmapOpen) {
          setIsHeatmapOpen(false);
        } else if (selectedTrade) {
          setSelectedTrade(null);
        } else if (selectedPerformancePeriod) {
          setSelectedPerformancePeriod(null);
        } else if (selectedAsset) {
          setSelectedAsset(null);
        } else {
          setIsAssetFilterOpen(false);
          setIsDetailedFilterOpen(false);
          setIsSessionFilterOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isDeadZoneModalOpen,
    isOptimalFreqModalOpen,
    isHeatmapOpen,
    selectedTrade,
    selectedPerformancePeriod,
    selectedAsset
  ]);
  const metrics = useMemo(() => calculateAdvancedMetrics(trades), [trades]);

  // Gelişmiş Filtreli ve Optimizasyonlu Yeni Kuant Metrikler
  const customMetrics = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const closedTrades = trades;

    // 1. Uç Değer Kontrolü (En Büyük Kazanç vs. En Büyük Kayıp in RUnits!)
    let largestWin = 0;
    let largestLoss = 0;
    closedTrades.forEach(t => {
      const valR = t.rr || 0;
      if (valR > 0 && valR > largestWin) largestWin = valR;
      if (valR < 0 && Math.abs(valR) > largestLoss) largestLoss = Math.abs(valR);
    });

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
      const d = new Date(t.createdAt);
      const dayIdx = d.getDay();
      const dayKey = dayNames[dayIdx];
      
      if (dayStats[dayKey] !== undefined) {
        dayStats[dayKey].total++;
        dayStats[dayKey].pnl += t.pnl || 0; // Accumulates actual financial PNL
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
      assetStatsMap[t.asset].pnl += t.pnl || 0; // Accumulates actual financial PnL
      assetStatsMap[t.asset].rr += t.rr || 0;
      assetStatsMap[t.asset].total++;
      if (t.status === 'WIN') {
        assetStatsMap[t.asset].wins++;
      }
    });
    const assetRanking = Object.values(assetStatsMap).sort((a, b) => isRrMode ? b.rr - a.rr : b.pnl - a.pnl);

    // 4. En kârlı sessionlar (in R)
    const sessionStatsMap: Record<string, { session: string; pnl: number; total: number; wins: number; rr: number }> = {};
    closedTrades.forEach(t => {
      const s = t.session || 'Bilinmeyen';
      if (!sessionStatsMap[s]) {
        sessionStatsMap[s] = { session: s, pnl: 0, total: 0, wins: 0, rr: 0 };
      }
      sessionStatsMap[s].pnl += t.pnl || 0; // Accumulates actual financial PnL
      sessionStatsMap[s].rr += t.rr || 0;
      sessionStatsMap[s].total++;
      if (t.status === 'WIN') {
        sessionStatsMap[s].wins++;
      }
    });
    const sessionRanking = Object.values(sessionStatsMap).sort((a, b) => isRrMode ? b.rr - a.rr : b.pnl - a.pnl);

    // 5. Performans Geçmişi (Day, Week, Month, Year PnL OHLC)
    const dailyTradesMap: Record<string, Trade[]> = {};
    const weeklyTradesMap: Record<string, Trade[]> = {};
    const monthlyTradesMap: Record<string, Trade[]> = {};
    const yearlyTradesMap: Record<string, Trade[]> = {};
    
    closedTrades.forEach(t => {
      const d = new Date(t.createdAt);
      
      // Daily
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      const dayKey = dayDate.getTime().toString();
      if (!dailyTradesMap[dayKey]) dailyTradesMap[dayKey] = [];
      dailyTradesMap[dayKey].push(t);

      // Weekly
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.getTime().toString();
      if (!weeklyTradesMap[weekKey]) weeklyTradesMap[weekKey] = [];
      weeklyTradesMap[weekKey].push(t);

      // Monthly
      const monthDate = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthKey = monthDate.getTime().toString();
      if (!monthlyTradesMap[monthKey]) monthlyTradesMap[monthKey] = [];
      monthlyTradesMap[monthKey].push(t);

      // Yearly
      const yearDate = new Date(d.getFullYear(), 0, 1);
      const yearKey = yearDate.getTime().toString();
      if (!yearlyTradesMap[yearKey]) yearlyTradesMap[yearKey] = [];
      yearlyTradesMap[yearKey].push(t);
    });

    const buildStats = (tradesMap: Record<string, Trade[]>, labelFormatter: (d: Date) => string, maxItems: number = 10) => {
        const stats: Record<string, { 
          weekLabel: string; 
          weekTimestamp: number; 
          pnl: number; 
          high: number; 
          low: number;
          rr: number;
          rrHigh: number;
          rrLow: number;
          trades: Trade[];
        }> = {};
        Object.keys(tradesMap).forEach(key => {
            const tradesInPeriod = tradesMap[key].sort((a,b) => a.createdAt - b.createdAt);
            const timestamp = parseInt(key, 10);
            const dateObj = new Date(timestamp);
            const label = labelFormatter(dateObj);
            
            let cumulativePnl = 0;
            let pnlHigh = 0;
            let pnlLow = 0;

            let cumulativeRr = 0;
            let rrHigh = 0;
            let rrLow = 0;
            
            tradesInPeriod.forEach(t => {
                cumulativePnl += (t.pnl || 0);
                if (cumulativePnl > pnlHigh) pnlHigh = cumulativePnl;
                if (cumulativePnl < pnlLow) pnlLow = cumulativePnl;

                cumulativeRr += (t.rr || 0);
                if (cumulativeRr > rrHigh) rrHigh = cumulativeRr;
                if (cumulativeRr < rrLow) rrLow = cumulativeRr;
            });
            
            stats[key] = {
                weekLabel: label,
                weekTimestamp: timestamp,
                pnl: cumulativePnl,
                high: pnlHigh,
                low: pnlLow,
                rr: cumulativeRr,
                rrHigh,
                rrLow,
                trades: tradesInPeriod
            };
        });
        return Object.values(stats)
            .sort((a, b) => a.weekTimestamp - b.weekTimestamp)
            .slice(-maxItems);
    };

    const monthTurkishShort = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    const dailyPerformance = buildStats(dailyTradesMap, d => `${d.getDate()} ${monthTurkishShort[d.getMonth()]}`, 14); // Son 14 gün
    const weeklyPerformance = buildStats(weeklyTradesMap, d => `${d.getDate()} ${monthTurkishShort[d.getMonth()]}`, 10); // Son 10 hafta
    const monthlyPerformance = buildStats(monthlyTradesMap, d => `${monthTurkishShort[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`, 12); // Son 12 ay
    const yearlyPerformance = buildStats(yearlyTradesMap, d => `${d.getFullYear()}`, 5); // Son 5 yıl

    // 6. Konsept & Parite Dağılım Matrisi (Isı Haritası / Heatmap)
    const allUniqueConfirmations = new Set<string>();
    closedTrades.forEach(t => {
      if (t.confirmations) {
        t.confirmations.forEach(c => {
          if (c && c.trim()) allUniqueConfirmations.add(c.trim());
        });
      }
    });

    let displayConfirmations = Array.from(allUniqueConfirmations);
    if (displayConfirmations.length === 0) {
      displayConfirmations = ['Belirtilmemiş'];
    } else {
      displayConfirmations = displayConfirmations.slice(0, 4);
    }

    const heatmapAssets = assetRanking.map(x => x.asset);

    const heatmapMatrix = heatmapAssets.map(asset => {
      return {
        asset,
        cells: displayConfirmations.map(confirmation => {
          let matches = closedTrades.filter(t => t.asset === asset);
          
          
          if (confirmation === 'Belirtilmemiş') {
            matches = matches.filter(t => !t.confirmations || t.confirmations.length === 0);
          } else {
            matches = matches.filter(t => t.confirmations && t.confirmations.includes(confirmation));
          }


          const total = matches.length;
          const wins = matches.filter(t => t.status === 'WIN').length;
          const winRate = total > 0 ? (wins / total) * 100 : 0;
          const pnl = matches.reduce((acc, t) => acc + (t.pnl || 0), 0);
          const rr = matches.reduce((acc, t) => acc + (t.rr || 0), 0);

          return {
            confirmation,
            winRate,
            total,
            pnl,
            rr
          };
        })
      };
    });

    // 7. En Verimli Yön ve Parite Eşleşmesi
    const directionStatsMap: Record<string, { asset: string; longPnl: number; longRr: number; longWins: number; longTotal: number; shortPnl: number; shortRr: number; shortWins: number; shortTotal: number }> = {};
    const assetFilters = assetRanking.slice(0, 5).map(x => x.asset);
    
    closedTrades.forEach(t => {
      if (assetFilters.includes(t.asset)) {
        if (!directionStatsMap[t.asset]) {
          directionStatsMap[t.asset] = { asset: t.asset, longPnl: 0, longRr: 0, longWins: 0, longTotal: 0, shortPnl: 0, shortRr: 0, shortWins: 0, shortTotal: 0 };
        }
        if (t.type === 'LONG') {
          directionStatsMap[t.asset].longPnl += t.pnl || 0;
          directionStatsMap[t.asset].longRr += t.rr || 0;
          directionStatsMap[t.asset].longTotal++;
          if (t.status === 'WIN') directionStatsMap[t.asset].longWins++;
        } else if (t.type === 'SHORT') {
          directionStatsMap[t.asset].shortPnl += t.pnl || 0;
          directionStatsMap[t.asset].shortRr += t.rr || 0;
          directionStatsMap[t.asset].shortTotal++;
          if (t.status === 'WIN') directionStatsMap[t.asset].shortWins++;
        }
      }
    });

    // 8. Detailed Heatmap (Asset x Session x Type) x Confirmation
    const detailedHeatmapRows = [];
    
    // Get all unique combinations of Asset, Session, Type present in closedTrades
    const actvCombos: Record<string, { asset: string, session: string, type: string, trades: Trade[] }> = {};
    closedTrades.forEach(t => {
      const asset = t.asset || 'Unknown';
      const session = t.session || 'Unspecified';
      const type = t.type || 'LONG';
      const key = `${asset}|${session}|${type}`;
      if (!actvCombos[key]) {
        actvCombos[key] = { asset, session, type, trades: [] };
      }
      actvCombos[key].trades.push(t);
    });

    Object.values(actvCombos).forEach(combo => {
      // Sort out confirmations
      const cells = displayConfirmations.map(confirmation => {
        let confirmationTrades = combo.trades;
        
        if (confirmation === 'Belirtilmemiş') {
          confirmationTrades = confirmationTrades.filter(t => !t.confirmations || t.confirmations.length === 0);
        } else {
          confirmationTrades = confirmationTrades.filter(t => t.confirmations && t.confirmations.includes(confirmation));
        }


        const total = confirmationTrades.length;
        const wins = confirmationTrades.filter(t => t.status === 'WIN').length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const pnl = confirmationTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const rr = confirmationTrades.reduce((acc, t) => acc + (t.rr || 0), 0);
        
        return { confirmation, total, wins, winRate, pnl, rr };
      });
      
      const totalTrades = combo.trades.length;
      if (totalTrades > 0) {
        detailedHeatmapRows.push({
          asset: combo.asset,
          session: combo.session,
          type: combo.type,
          label: `${combo.asset} - ${combo.session} (${combo.type})`,
          totalTrades,
          cells
        });
      }
    });

    detailedHeatmapRows.sort((a, b) => b.totalTrades - a.totalTrades);

    return {
      detailedHeatmapRows,
      largestWin,
      largestLoss,
      dayStats,
      TurkishDayFullNames,
      assetRanking,
      sessionRanking,
      dailyPerformance,
      weeklyPerformance,
      monthlyPerformance,
      yearlyPerformance,
      displayConfirmations,
      heatmapMatrix,
      directionStats: Object.values(directionStatsMap).sort((a, b) => {
        const totalA = isRrMode ? (a.longRr + a.shortRr) : (a.longPnl + a.shortPnl);
        const totalB = isRrMode ? (b.longRr + b.shortRr) : (b.longPnl + b.shortPnl);
        return totalB - totalA;
      })
    };
  }, [trades, isRrMode]);


    

  const processedDetailedRows = useMemo(() => {
    if (!customMetrics || !customMetrics.displayConfirmations) return [];

    const closedTrades = trades;
    
    // Group trades by Asset
    const assetsMap: Record<string, Trade[]> = {};
    closedTrades.forEach(t => {
      const asset = t.asset || 'Unknown';
      
      if (!assetsMap[asset]) {
        assetsMap[asset] = [];
      }
      assetsMap[asset].push(t);
    });

    // Build parents and breakout children
    const groupedList = Object.entries(assetsMap).map(([asset, assetTrades]) => {
      const parentTotal = assetTrades.length;
      const parentWins = assetTrades.filter(t => t.status === 'WIN').length;
      const parentWinRate = parentTotal > 0 ? (parentWins / parentTotal) * 100 : 0;
      const parentPnl = assetTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
      const parentRr = assetTrades.reduce((acc, t) => acc + (t.rr || 0), 0);

      const childRows: any[] = [];
      const comboMap: Record<string, { session: string, htfTimeframe?: string, timeframe: string, concept: string, confirmation: string, trades: Trade[] }> = {};
      
      assetTrades.forEach(t => {
        const tradeConfirmations: string[] = (t.confirmations && t.confirmations.length > 0)
          ? t.confirmations
          : [''];

        tradeConfirmations.forEach(confirmation => {
          const session = t.session || '';
          const htfTimeframe = t.htfTimeframe || '';
          const timeframe = t.timeframe || '';
          const concept = t.concept || '';
          const cleanConf = confirmation.trim();
          
          const key = `${session}|${htfTimeframe}|${timeframe}|${concept}|${cleanConf}`;
          if (!comboMap[key]) {
            comboMap[key] = { session, htfTimeframe, timeframe, concept, confirmation: cleanConf, trades: [] };
          }
          comboMap[key].trades.push(t);
        });
      });

      Object.values(comboMap).forEach(combo => {
        const total = combo.trades.length;
        const wins = combo.trades.filter(t => t.status === 'WIN').length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const pnl = combo.trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const rr = combo.trades.reduce((acc, t) => acc + (t.rr || 0), 0);

        childRows.push({
          session: combo.session,
          htfTimeframe: combo.htfTimeframe,
          timeframe: combo.timeframe,
          concept: combo.concept,
          confirmation: combo.confirmation,
          trades: combo.trades,
          total,
          wins,
          winRate,
          pnl,
          rr,
          label: `${asset} - ${combo.session} - ${combo.htfTimeframe || ''} - ${combo.timeframe} - ${combo.concept} - ${combo.confirmation}`
        });
      });

      childRows.sort((a, b) => isRrMode ? b.rr - a.rr : b.pnl - a.pnl);

      return {
        asset,
        total: parentTotal,
        wins: parentWins,
        winRate: parentWinRate,
        pnl: parentPnl,
        rr: parentRr,
        children: childRows,
        label: asset
      };
    });

    let filteredList = groupedList;

    if (detailedFilter === 'mükemmel') {
      filteredList = filteredList.filter(item => item.winRate >= 60);
    } else if (detailedFilter === 'riskli') {
      filteredList = filteredList.filter(item => item.winRate < 45 && item.total > 0);
    }

    if (detailedSearch.trim()) {
      const searchLower = detailedSearch.toLowerCase();
      filteredList = filteredList.filter(item => item.asset.toLowerCase().includes(searchLower));
    }

    filteredList.sort((a, b) => {
      if (detailedSort === 'pnl') return b.pnl - a.pnl;
      if (detailedSort === 'rr') return b.rr - a.rr;
      if (detailedSort === 'winrate') return b.winRate - a.winRate;
      return 0;
    });

    return filteredList;
  }, [trades, customMetrics, detailedFilter, detailedSort, detailedSearch]);

  const processedAssets = useMemo(() => {
    if (!customMetrics || !customMetrics.assetRanking) return [];
    let filtered = customMetrics.assetRanking;
    
    if (assetFilter === 'profitable') {
      filtered = filtered.filter(ar => (isRrMode ? ar.rr : ar.pnl) > 0);
    } else if (assetFilter === 'loss') {
      filtered = filtered.filter(ar => (isRrMode ? ar.rr : ar.pnl) < 0);
    }

    if (assetSearch.trim()) {
      const searchLower = assetSearch.toLowerCase();
      filtered = filtered.filter(ar => ar.asset.toLowerCase().includes(searchLower));
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
        return assetFilter === 'loss' ? (a.rr - b.rr) : (b.rr - a.rr);
      }
      if (assetSort === 'trades_desc') {
        return b.total - a.total;
      }
      if (assetSort === 'trades_asc') {
        return a.total - b.total;
      }
      return 0;
    });
  }, [customMetrics, assetSort, assetFilter, assetSearch, isRrMode]);

  const processedDeadZone = useMemo(() => {
    if (!metrics || !metrics.deadZone) return [];
    let sortedAssets = Object.keys(metrics.deadZone);
    
    if (deadZoneSearch.trim()) {
      const searchLower = deadZoneSearch.toLowerCase();
      sortedAssets = sortedAssets.filter(asset => asset.toLowerCase().includes(searchLower));
    }

    return sortedAssets.sort((a, b) => {
      const dataA = Object.values(metrics.deadZone[a]);
      const dataB = Object.values(metrics.deadZone[b]);
      
      const pnlA = dataA.reduce((acc: number, curr: any) => acc + (curr.pnl || 0), 0);
      const pnlB = dataB.reduce((acc: number, curr: any) => acc + (curr.pnl || 0), 0);
      
      if (deadZoneSort === 'winrate') {
        const winsA = dataA.reduce((acc: number, curr: any) => acc + (curr.wins || 0), 0);
        const countA = dataA.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
        const wrA = countA > 0 ? winsA / countA : 0;
        
        const winsB = dataB.reduce((acc: number, curr: any) => acc + (curr.wins || 0), 0);
        const countB = dataB.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
        const wrB = countB > 0 ? winsB / countB : 0;

        if (wrB !== wrA) return wrB - wrA;
        return pnlB - pnlA;
      }
      
      if (deadZoneSort === 'rr') {
        const rrA = dataA.reduce((acc: number, curr: any) => acc + (curr.rr || 0), 0);
        const rrB = dataB.reduce((acc: number, curr: any) => acc + (curr.rr || 0), 0);
        if (rrB !== rrA) return rrB - rrA;
        return pnlB - pnlA;
      }
      
      return pnlB - pnlA;
    });
  }, [metrics.deadZone, deadZoneSearch, deadZoneSort]);

  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.15, ease: "easeInOut" as any } }
  };

  const getPFColor = (pf: number) => {
    if (pf >= 2) return 'text-emerald-400';
    if (pf >= 1) return 'text-blue-400';
    return 'text-rose-400';
  };

  if (!metrics || !customMetrics || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-xl shadow-sm mt-4">
        <Target size={32} className="text-zinc-600 mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-zinc-300 font-mono mb-2">Henüz Yeterli Veri Yok</h3>
        <p className="text-[11px] text-zinc-500 max-w-sm">Gelişmiş metriklerin hesaplanabilmesi için sisteme tamamlanmış (WIN/LOSS) işlemler eklemelisiniz.</p>
      </div>
    );
  }

  const performanceData = (() => {
    switch (performanceTimeframe) {
      case 'day': return customMetrics.dailyPerformance;
      case 'week': return customMetrics.weeklyPerformance;
      case 'month': return customMetrics.monthlyPerformance;
      case 'year': return customMetrics.yearlyPerformance;
      default: return customMetrics.weeklyPerformance;
    }
  })();

  const maxWeeklyPnlAbs = Math.max(
    ...performanceData.map(w => Math.abs(isRrMode ? w.rr : w.pnl)),
    isRrMode ? 1 : 100
  );

  return (
    <div className="mt-4 mb-4 flex flex-col bg-zinc-950/60 border border-zinc-800/80 rounded-xl shadow-sm overflow-hidden divide-y divide-zinc-800/80 w-full">
      
      {/* SEKSIYON BAŞLIĞI */}
      
        
        {/* 3. Performans Geçmişi Chart */}
        <motion.div variants={itemVariants} className="bg-transparent p-5 sm:p-6 flex flex-col justify-between transition-colors duration-200 ">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-3 gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-100 font-mono">
                PERFORMANS GEÇMİŞİ
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Timeframe Selector */}
              <div className="flex bg-zinc-800/90 border border-zinc-700/50 text-zinc-100 rounded-lg overflow-hidden p-0.5">
                {(['day', 'week', 'month', 'year'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setPerformanceTimeframe(tf)}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out border rounded-lg ${
                      performanceTimeframe === tf 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {tf === 'day' ? 'GÜN' : tf === 'week' ? 'HAFTA' : tf === 'month' ? 'AY' : 'YIL'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-52 flex items-end justify-center gap-[1px] sm:gap-[2px] px-1 relative mt-4 max-w-4xl mx-auto w-full">
            {performanceData.map((week, idx) => {
              const metricValue = isRrMode ? week.rr : week.pnl;
              const isProfit = metricValue >= 0;

              const labelValueText = isRrMode
                ? (week.rr !== 0 ? (week.rr > 0 ? '+' : '') + week.rr.toFixed(1) : '0')
                : (week.pnl !== 0 ? (week.pnl > 0 ? '+' : '') + Math.round(week?.pnl || 0).toLocaleString() : '0');

              return (
                <div key={idx} className="flex flex-col flex-1 max-w-[52px] sm:max-w-[76px] h-full justify-end items-center relative z-10 group cursor-pointer" onClick={() => setSelectedPerformancePeriod({ label: week.weekLabel, trades: week.trades })}>
                  
                  {/* Chart Area */}
                  <div className="w-full relative flex-1 flex justify-center mt-2 mb-2">
                    {/* Tooltip on hover */}
                    

                    {/* Candlestick Body */}
                    <motion.div 
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      className={`absolute bottom-0 w-4 sm:w-6 ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'} rounded-sm  cursor-pointer group-hover:scale-x-110 transition-transform origin-bottom`}
                      style={{
                        height: `${Math.max((Math.abs(metricValue) / maxWeeklyPnlAbs) * 100, 2)}%`,
                        minHeight: '2px'
                      }}
                    ></motion.div>
                  </div>

                  {/* Hafta Adı */}
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-tighter">
                    {week.weekLabel}
                  </span>
                  <span className={`text-[9px] font-mono font-extrabold tracking-tight mt-0.5 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {labelValueText}
                  </span>
                </div>
              );
            })}

            {performanceData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                Veri Yok
              </div>
            )}
          </div>
        </motion.div>

      

        {/* SESSION PERFORMANSI & NET KAZANÇ GÜN DAĞILIMI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* SESSION PERFORMANSI */}
          <motion.div variants={itemVariants} className="bg-transparent p-3.5 sm:p-4 flex flex-col justify-between h-full transition-colors duration-200">
            <div className="flex flex-col h-full justify-between">
              <div className="flex justify-between items-center h-6 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-100 font-mono">
                    SESSION PERFORMANSI
                  </h3>
                  <button
                    onClick={() => setIsSessionFilterOpen(!isSessionFilterOpen)}
                    className={`flex items-center justify-center w-5 h-5 ml-1 rounded-md border transition-colors duration-200 ease-out ${
                      isSessionFilterOpen 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    } shrink-0`}
                  >
                    <Filter size={9} />
                  </button>
                  <button
                    onClick={() => setIsHeatmapOpen(true)}
                    className="flex items-center justify-center w-5 h-5 rounded-md border transition-colors duration-200 ease-out bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 shrink-0"
                  >
                    <Grid size={9} />
                  </button>
                  <button
                    onClick={() => setIsDeadZoneModalOpen(true)}
                    className="flex items-center justify-center w-5 h-5 rounded-md border transition-colors duration-200 ease-out bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 shrink-0"
                  >
                    <InfinityIcon size={10} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isSessionFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden whitespace-nowrap "
                    >
                      <div className="flex gap-1">
                        <button onClick={() => setSessionSort('pnl')} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out border ${sessionSort === 'pnl' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Kâr</button>
                        <button onClick={() => setSessionSort('loss')} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out border ${sessionSort === 'loss' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Zarar</button>
                        <button onClick={() => setSessionSort('winrate')} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ease-out border ${sessionSort === 'winrate' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>WR</button>
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
                      <div key={idx} className="bg-zinc-950 px-2 py-1.5 flex flex-col justify-center rounded-lg border border-zinc-900/40">
                        <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                          <div className="flex items-center gap-1.5">
                            <Clock size={9} className={`${sessionColors}`} />
                            <span className={`font-black tracking-wide uppercase ${sessionColors}`}>
                              {readableSession}
                            </span>
                            <span className="text-zinc-500 font-normal text-[9px]">
                              ({sr.total} Trade・%{winRate.toFixed(0)} WR・{sr.rr >= 0 ? '+' : ''}{sr.rr.toFixed(1)} R)
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{(sr?.pnl || 0).toLocaleString()} <span className="text-[9px] text-zinc-500">{currency}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-zinc-950 rounded-full overflow-hidden flex">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              className={`h-full rounded-full ${isProfit ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500' : 'bg-gradient-to-r from-rose-500/20 to-rose-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                {customMetrics.sessionRanking.length === 0 && (
                  <div className="text-center py-6 text-[9px] text-zinc-600 font-mono uppercase tracking-widest flex-1 flex items-center justify-center">
                    Veri Yok
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
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-100 font-mono">
                    NET KAZANÇ GÜN DAĞILIMI
                  </h3>
                  <button
                    onClick={() => setIsOptimalFreqModalOpen(true)}
                    className="flex items-center justify-center w-5 h-5 ml-1 rounded-md border transition-colors duration-200 ease-out bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-400 shrink-0"
                  >
                    <Crosshair size={10} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between py-0.5 space-y-1.5">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(dayKey => {
                const stats = customMetrics.dayStats[dayKey] || { total: 0, wins: 0, pnl: 0, rr: 0 };
                const fullDayName = customMetrics.TurkishDayFullNames[dayKey];

                const maxDayPnlAbs = Math.max(...Object.values(customMetrics.dayStats).map(d => Math.abs(isRrMode ? d.rr : d.pnl)), isRrMode ? 1 : 100);
                const val = isRrMode ? stats.rr : stats.pnl;
                const isProfitVal = val >= 0;
                const pnlPercentage = Math.min((Math.abs(val) / maxDayPnlAbs) * 100, 100);

                return (
                  <div key={dayKey}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-[11px] font-bold text-zinc-200 tracking-tight font-sans">{fullDayName}</span>
                      <span className={`text-[10px] font-bold font-mono flex items-center gap-1.5 ${isProfitVal ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isRrMode ? (
                          <>
                            <span>
                              {val !== 0 ? (isProfitVal ? '+' : '') + val.toFixed(2) : '0'}{' '}
                              <span className="text-[9px] text-zinc-500">RR</span>
                            </span>
                            <span className="text-[9px] text-zinc-500 font-bold bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900/60 font-mono">
                              {stats.pnl >= 0 ? '+' : ''}{(stats?.pnl || 0).toLocaleString()} {currency}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>
                              {val !== 0 ? (isProfitVal ? '+' : '') + (val || 0).toLocaleString() : '0'}{' '}
                              <span className="text-[9px] text-zinc-500">{currency}</span>
                            </span>
                            <span className="text-[9px] text-zinc-500 font-bold bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900/60 font-mono">
                              {stats.rr >= 0 ? '+' : ''}{stats.rr.toFixed(1)} RR
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
                            initial={{ width: 0 }}
                            animate={{ width: `${pnlPercentage}%` }}
                            className="bg-gradient-to-l from-rose-500 to-rose-600 rounded-l-full h-full "
                          />
                        )}
                      </div>
                      <div className="flex justify-start pl-[1px]">
                        {isProfitVal && val !== 0 && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pnlPercentage}%` }}
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
        className="bg-transparent p-5 sm:p-6 shadow-sm transition-colors duration-200 border border-zinc-800 rounded-xl overflow-hidden mb-3 flex flex-col justify-between min-h-[480px]"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-20 w-full border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-100 font-mono">
              Parite İstatistikleri
            </h3>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative">
            <AnimatePresence>
              {isAssetFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 15, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 15, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-9 top-[50%] -translate-y-[50%] z-30 bg-zinc-800/90 border border-zinc-700/50 text-zinc-100 rounded-lg p-1  whitespace-nowrap select-none flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={assetSearch}
                    onChange={(e) => { setAssetSearch(e.target.value); setAssetsPage(1); }}
                    className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-0.5 text-[9px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-700 w-20 sm:w-28 placeholder-zinc-600 h-[20px]"
                  />
                  <div className="flex bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
                    <button type="button" onClick={() => { setAssetFilter('all'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>TÜMÜ</button>
                    <button type="button" onClick={() => { setAssetFilter('profitable'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetFilter === 'profitable' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-emerald-400'}`}>KÂR</button>
                    <button type="button" onClick={() => { setAssetFilter('loss'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetFilter === 'loss' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-zinc-500 hover:text-rose-400'}`}>ZARAR</button>
                  </div>
                  <div className="flex bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
                    <button type="button" onClick={() => { setAssetSort('pnl'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetSort === 'pnl' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>PNL</button>
                    <button type="button" onClick={() => { setAssetSort('rr'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetSort === 'rr' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>RR</button>
                    <button type="button" onClick={() => { setAssetSort('winrate'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetSort === 'winrate' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>WR</button>
                    <button type="button" onClick={() => { setAssetSort('trades_desc'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetSort === 'trades_desc' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>↑</button>
                    <button type="button" onClick={() => { setAssetSort('trades_asc'); setAssetsPage(1); }} className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-200 ease-out font-bold ${assetSort === 'trades_asc' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>↓</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => {
                setIsAssetFilterOpen(!isAssetFilterOpen);
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors duration-200 ease-out ${
                isAssetFilterOpen 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              } shrink-0`}
            >
              <Filter size={12} /> 
            </button>
          </div>
        </div>

        

        {processedAssets.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 flex-1 min-h-[350px] flex flex-col items-center justify-center">
            <AlertTriangle className="mx-auto text-amber-500/60 mb-2" size={24} />
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Seçilen kriterlere uygun parite bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between min-h-[440px]">
            {/* Parite Kart Grubu Grid */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={assetsPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 flex-1 content-start min-h-[385px]"
              >
                {processedAssets.slice((assetsPage - 1) * 9, assetsPage * 9).map((ar) => {
                  const isSelected = selectedAsset === ar.asset;
                  const winRate = ar.total > 0 ? (ar.wins / ar.total) * 100 : 0;
                  const isProfit = ar.pnl >= 0;
                  
                  return (
                    <button
                      key={ar.asset}
                      onClick={() => setSelectedAsset(isSelected ? null : ar.asset)}
                      className={`text-left p-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                        isSelected 
                          ? (isProfit ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-rose-500/10 border-rose-500/40')
                          : 'bg-zinc-950 border-zinc-800/60 hover:border-zinc-700/80'
                      }`}
                    >
                      {/* Decorative background flare depending on the profitability */}
                      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.05] ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'} group-hover:opacity-25 transition-all duration-200`} />
                      
                      <div className="w-full">
                        <div className="flex justify-between items-center z-10 mb-1">
                          <span className="font-extrabold text-xs text-white uppercase tracking-wider font-mono ">{ar.asset}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {ar.total} İŞLEM
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1 z-10">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">PNL</span>
                            <span className={`font-bold tracking-wider text-[11px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{(ar?.pnl || 0).toLocaleString()} {currency}
                            </span>
                          </div>
 
                          {/* Divider */}
                          <div className="h-px w-full bg-zinc-800/50 group-hover:bg-zinc-700/60 transition-colors duration-200 my-0.5" />
 
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">RR</span>
                            <span className={`font-bold tracking-wider text-[11px] ${ar.rr >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                              {ar.rr >= 0 ? '+' : ''}{ar.rr.toFixed(2)} RR
                            </span>
                          </div>
 
                          {/* Divider */}
                          <div className="h-px w-full bg-zinc-800/50 group-hover:bg-zinc-700/60 transition-colors duration-200 my-0.5" />
 
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-zinc-500 font-bold tracking-widest uppercase font-sans">WR</span>
                            <span className={`font-bold tracking-wider text-[11px] ${winRate >= 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
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
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-auto">
                <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                  Toplam {processedAssets.length} Parite
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">
                    Sayfa {assetsPage} / {Math.max(1, Math.ceil(processedAssets.length / 9))}
                  </span>
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setAssetsPage(prev => Math.max(1, prev - 1))}
                      disabled={assetsPage <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => setAssetsPage(prev => Math.min(Math.ceil(processedAssets.length / 9), prev + 1))}
                      disabled={assetsPage >= Math.ceil(processedAssets.length / 9)}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-zinc-950/60 p-4 sm:p-5 shadow-sm transition-colors duration-200 mb-2 border border-zinc-800/80 rounded-xl relative overflow-visible mt-1 flex flex-col justify-between">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 relative z-30 w-full border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-sans tracking-tight">
                  Çok Boyutlu İşlem Matrisi
                </h3>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative flex-wrap sm:flex-nowrap">
            {/* Quick Expand/Collapse All */}
            {processedDetailedRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allExpanded = processedDetailedRows.every(r => expandedAssets[r.asset]);
                  if (allExpanded) {
                    setExpandedAssets({});
                  } else {
                    const next: Record<string, boolean> = {};
                    processedDetailedRows.forEach(r => { next[r.asset] = true; });
                    setExpandedAssets(next);
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 rounded-lg transition-colors duration-150"
                title="Tüm pariteleri genişlet veya daralt"
              >
                <ChevronsUpDown size={13} />
                <span>{processedDetailedRows.every(r => expandedAssets[r.asset]) ? 'Tümünü Daralt' : 'Tümünü Genişlet'}</span>
              </button>
            )}

            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsDetailedFilterOpen(!isDetailedFilterOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all duration-200 ${
                isDetailedFilterOpen || detailedFilter !== 'all' || detailedSearch
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-xs' 
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
              } shrink-0`}
            >
              <Filter size={13} />
              <span>Filtrele</span>
              {(detailedFilter !== 'all' || detailedSearch) && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            <AnimatePresence>
              {isDetailedFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 z-50 bg-zinc-950 border border-zinc-800/90 text-zinc-100 rounded-xl p-3.5 shadow-2xl w-72 sm:w-80 select-none space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-purple-400" /> Matris Filtreleri
                    </span>
                    <button 
                      onClick={() => setIsDetailedFilterOpen(false)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Parite veya onay ara..."
                      value={detailedSearch}
                      onChange={(e) => { setDetailedSearch(e.target.value); setDetailedPage(1); }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                    />
                    {detailedSearch && (
                      <button 
                        onClick={() => { setDetailedSearch(''); setDetailedPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Filter by Performance */}
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      Performans Durumu
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                      <button 
                        onClick={() => { setDetailedFilter('all'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedFilter === 'all' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Tümü
                      </button>
                      <button 
                        onClick={() => { setDetailedFilter('mükemmel'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedFilter === 'mükemmel' ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30' : 'text-zinc-400 hover:text-emerald-400'}`}
                      >
                        ≥ %60 WR
                      </button>
                      <button 
                        onClick={() => { setDetailedFilter('riskli'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedFilter === 'riskli' ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30' : 'text-zinc-400 hover:text-rose-400'}`}
                      >
                        &lt; %45 WR
                      </button>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      Sıralama Ölçütü
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                      <button 
                        onClick={() => { setDetailedSort('pnl'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedSort === 'pnl' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Net PnL
                      </button>
                      <button 
                        onClick={() => { setDetailedSort('rr'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedSort === 'rr' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Net R:R
                      </button>
                      <button 
                        onClick={() => { setDetailedSort('winrate'); setDetailedPage(1); }} 
                        className={`text-[11px] py-1 rounded-md transition-all font-medium text-center ${detailedSort === 'winrate' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Kazanma %
                      </button>
                    </div>
                  </div>

                  {/* Reset button */}
                  {(detailedFilter !== 'all' || detailedSearch || detailedSort !== 'pnl') && (
                    <button
                      onClick={() => {
                        setDetailedFilter('all');
                        setDetailedSearch('');
                        setDetailedSort('pnl');
                        setDetailedPage(1);
                      }}
                      className="w-full py-1 text-[11px] text-zinc-400 hover:text-zinc-200 text-center border-t border-zinc-800/60 pt-2 transition-colors"
                    >
                      Filtreleri Sıfırla
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto scrollbar-thin flex-1 flex flex-col justify-start">
          <div className="min-w-[720px]">
            <table className="w-full text-left border-separate border-spacing-y-1.5">
              <thead>
                <tr className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-2 px-3 w-[220px]">Parite & Kombinasyon</th>
                  <th className="py-2 px-3">İşlem Detayları & Onaylar</th>
                  <th className="py-2 px-3 text-center w-[160px]">Net Kazanç</th>
                  <th className="py-2 px-3 text-center w-[130px]">Kazanma Oranı</th>
                  <th className="py-2 px-3 text-right w-[110px]">İşlem Özeti</th>
                </tr>
              </thead>
              <AnimatePresence mode="wait" initial={false}>
                <motion.tbody
                  key={detailedPage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-transparent"
                >
                  {processedDetailedRows.slice((detailedPage - 1) * 10, detailedPage * 10).map((parent) => {
                    const isExpanded = !!expandedAssets[parent.asset];
                    const isProfit = parent.pnl >= 0;
                    const isRrProfit = parent.rr >= 0;

                    // Collect clean dominant confirmations/concepts for parent row summary
                    const parentConfs = Array.from(new Set(
                      parent.children?.map((c: any) => c?.confirmation).filter((c: any) => c && c !== 'Unspecified' && c !== 'Diğer') || []
                    ));
                    const parentConcepts = Array.from(new Set(
                      parent.children?.map((c: any) => c?.concept).filter((c: any) => c && c !== 'Unspecified') || []
                    ));

                    return (
                      <React.Fragment key={parent.asset}>
                        {/* Parent Asset Row */}
                        <tr 
                          onClick={() => setExpandedAssets(prev => ({ ...prev, [parent.asset]: !prev[parent.asset] }))}
                          className="hover:bg-zinc-800/40 transition-colors duration-150 group cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none"
                        >
                          {/* Asset Name + Expand Toggle */}
                          <td className="py-3 px-3 rounded-l-xl bg-zinc-900/50 group-hover:bg-zinc-800/50 border-y border-l border-zinc-800/80 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAssets(prev => ({ ...prev, [parent.asset]: !prev[parent.asset] }));
                                }}
                                className="w-5 h-5 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-0 outline-none select-none"
                              >
                                <ChevronRight 
                                  size={13} 
                                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-purple-400' : 'text-zinc-500'}`} 
                                />
                              </button>
                              
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-xs text-zinc-100 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 group-hover:border-purple-500/50 transition-colors shadow-xs">
                                  {parent.asset}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  {parent.total} İşlem
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Quick Summary of Used Confirmations/Concepts */}
                          <td className="py-3 px-3 bg-zinc-900/50 group-hover:bg-zinc-800/50 border-y border-zinc-800/80 transition-colors">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {parentConfs.length > 0 || parentConcepts.length > 0 ? (
                                <>
                                  {parentConfs.slice(0, 3).map((conf: any, idx) => (
                                    <span key={`conf-${idx}`} className="text-[10px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                                      {conf}
                                    </span>
                                  ))}
                                  {parentConcepts.slice(0, 2).map((conc: any, idx) => (
                                    <span key={`conc-${idx}`} className="text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                      {conc}
                                    </span>
                                  ))}
                                  {(parentConfs.length + parentConcepts.length) > 5 && (
                                    <span className="text-[10px] text-zinc-500 font-medium">+{parentConfs.length + parentConcepts.length - 5} daha</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-500 italic">Genel Girişler</span>
                              )}
                            </div>
                          </td>

                          {/* Performance: Net PnL & R */}
                          <td className="py-3 px-3 text-center bg-zinc-900/50 group-hover:bg-zinc-800/50 border-y border-zinc-800/80 transition-colors">
                            <div className="inline-flex flex-col items-center">
                              <span className={`text-xs font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}{(parent?.pnl || 0).toLocaleString()} {currency}
                              </span>
                              <span className={`text-[10px] font-medium font-mono ${isRrProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                {isRrProfit ? '+' : ''}{parent.rr.toFixed(1)} R
                              </span>
                            </div>
                          </td>

                          {/* Win Rate */}
                          <td className="py-3 px-3 text-center bg-zinc-900/50 group-hover:bg-zinc-800/50 border-y border-zinc-800/80 transition-colors">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              parent.winRate >= 60 
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' 
                                : parent.winRate >= 45 
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                  : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                            }`}>
                              %{parent.winRate.toFixed(1)} WR
                            </span>
                          </td>

                          {/* Total Distribution */}
                          <td className="py-3 px-3 text-right rounded-r-xl bg-zinc-900/50 group-hover:bg-zinc-800/50 border-y border-r border-zinc-800/80 transition-colors">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAsset(parent.asset);
                              }}
                              className="inline-flex items-center gap-1.5 text-right group-hover:text-purple-300 transition-colors focus:outline-none focus:ring-0 outline-none select-none"
                              title="Bu paritedeki işlemleri incele"
                            >
                              <div className="text-[11px] font-mono font-medium text-zinc-300">
                                <span className="text-emerald-400 font-bold">{parent.wins}G</span>
                                <span className="text-zinc-600 mx-1">/</span>
                                <span className="text-rose-400 font-bold">{parent.total - parent.wins}K</span>
                              </div>
                            </button>
                          </td>
                        </tr>

                        {/* Child Rows when expanded */}
                        <AnimatePresence>
                          {isExpanded && parent.children?.map((child: any, cIdx: number) => {
                            const childIsProfit = child.pnl >= 0;
                            const childIsRrProfit = child.rr >= 0;
                            const hasAnyDimension = !!(child.session || child.htfTimeframe || child.timeframe || child.concept || (child.confirmation && child.confirmation !== 'Diğer'));

                            return (
                              <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                key={`${parent.asset}-child-${cIdx}`}
                                onClick={() => setSelectedAsset(parent.asset)}
                                className="hover:bg-zinc-900/60 transition-colors duration-150 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none group/child"
                              >
                                {/* Tree Connector & Sub-indicator */}
                                <td className="py-2 px-3 text-left rounded-l-lg bg-zinc-950/70 group-hover/child:bg-zinc-900/60 border-y border-l border-zinc-800/50 transition-colors">
                                  <div className="flex items-center pl-6 text-zinc-500 text-xs gap-2 select-none">
                                    <span className="text-zinc-600">↳</span>
                                    <span className="text-[11px] text-zinc-400 font-medium">
                                      Kombinasyon #{cIdx + 1}
                                    </span>
                                  </div>
                                </td>

                                {/* Clean Dimension Badges */}
                                <td className="py-2 px-3 bg-zinc-950/70 group-hover/child:bg-zinc-900/60 border-y border-zinc-800/50 transition-colors">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {hasAnyDimension ? (
                                      <>
                                        {child.session && (
                                          <span className="text-[10px] font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-lg">
                                            {child.session}
                                          </span>
                                        )}
                                        {child.htfTimeframe && (
                                          <span className="text-[10px] font-medium text-rose-300 bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 rounded-lg">
                                            HTF: {child.htfTimeframe}
                                          </span>
                                        )}
                                        {child.timeframe && (
                                          <span className="text-[10px] font-medium text-sky-300 bg-sky-500/10 px-2 py-0.5 border border-sky-500/20 rounded-lg">
                                            {child.timeframe}
                                          </span>
                                        )}
                                        {child.concept && (
                                          <span className="text-[10px] font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-lg">
                                            {child.concept}
                                          </span>
                                        )}
                                        {child.confirmation && child.confirmation !== 'Diğer' && (
                                          <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 px-2 py-0.5 border border-purple-500/30 rounded-lg">
                                            {child.confirmation}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800/80">
                                        Doğrudan İşlem (Filtresiz)
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Performance: Net PnL & R */}
                                <td className="py-2 px-3 text-center bg-zinc-950/70 group-hover/child:bg-zinc-900/60 border-y border-zinc-800/50 transition-colors">
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`text-[11px] font-bold font-mono ${childIsProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {childIsProfit ? '+' : ''}{(child?.pnl || 0).toLocaleString()} {currency}
                                    </span>
                                    <span className={`text-[9px] font-medium font-mono ${childIsRrProfit ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                                      {childIsRrProfit ? '+' : ''}{child.rr.toFixed(1)} R
                                    </span>
                                  </div>
                                </td>

                                {/* Win Rate */}
                                <td className="py-2 px-3 text-center bg-zinc-950/70 group-hover/child:bg-zinc-900/60 border-y border-zinc-800/50 transition-colors">
                                  <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    child.winRate >= 60 
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                      : child.winRate >= 45 
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                  }`}>
                                    %{child.winRate} WR
                                  </span>
                                </td>

                                {/* Trade Breakdown */}
                                <td className="py-2 px-3 text-right rounded-r-lg bg-zinc-950/70 group-hover/child:bg-zinc-900/60 border-y border-r border-zinc-800/50 transition-colors">
                                  <div className="text-[10px] font-mono text-zinc-400">
                                    {child.total} İşlem <span className="text-zinc-500">({child.wins}G)</span>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}

                  {processedDetailedRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Activity size={20} className="text-zinc-600 opacity-60" />
                          <span>Filtrelere veya aramaya uygun matris verisi bulunamadı.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        </div>

        {/* Pagination Details */}
        {processedDetailedRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 mt-3">
            <span className="text-[10px] font-medium text-zinc-400">
              Toplam <strong className="text-zinc-200">{processedDetailedRows.length}</strong> Parite Grubu
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400 font-medium">
                Sayfa {detailedPage} / {Math.max(1, Math.ceil(processedDetailedRows.length / 10))}
              </span>
              <div className="flex items-center bg-zinc-950 border border-zinc-800/80 rounded-lg p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setDetailedPage(prev => Math.max(1, prev - 1))}
                  disabled={detailedPage <= 1}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} />
                </button>
                <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setDetailedPage(prev => Math.min(Math.ceil(processedDetailedRows.length / 10), prev + 1))}
                  disabled={detailedPage >= Math.ceil(processedDetailedRows.length / 10)}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <TradeDetailModal 
        key="dashboard-trade-detail"
        trade={selectedTrade} 
        onClose={() => setSelectedTrade(null)} 
        onEdit={(trade) => {
          if (onEdit) onEdit(trade);
          setSelectedTrade(null);
          setSelectedAsset(null);
          setSelectedPerformancePeriod(null);
        }}
        currency={currency} 
      />

      {createPortal(
        <AnimatePresence>
          {selectedPerformancePeriod && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: 'opacity' }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setSelectedPerformancePeriod(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950/90 border border-zinc-800/80 rounded-xl shadow-2xl relative overflow-hidden backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
              {/* Header */}
              <div className="bg-zinc-950/80 border-b border-zinc-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 flex-1 min-w-0">
                  <div className="bg-blue-500/10 border border-blue-500/20 px-2 sm:px-3 py-1.5 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[10px] sm:text-sm font-black text-blue-400 font-mono tracking-widest uppercase flex items-center justify-center leading-none">
                      <Calendar size={16} className="mr-1.5 text-blue-400 shrink-0" />
                      {selectedPerformancePeriod.label}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <h2 className="text-zinc-100 font-black text-[10px] sm:text-sm uppercase tracking-wider font-mono leading-none flex items-center whitespace-nowrap">İşlem Geçmişi</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintModalState({
                        isOpen: true,
                        trades: selectedPerformancePeriod.trades,
                        title: `${selectedPerformancePeriod.label} İşlem Raporu`,
                        dateRangeText: selectedPerformancePeriod.label
                      });
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                  >
                    <Download size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedPerformancePeriod(null)}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                  >
                    <X size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Period Detailed Stats */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950/40 border-b border-zinc-800/80 shrink-0 select-none w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 text-zinc-100 rounded-lg px-2.5 py-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">TOPLAM:</span>
                    <span className="text-xs font-black text-white font-mono">{selectedPerformancePeriod.trades.length}</span>
                  </div>
                  {(() => {
                    const longTrades = selectedPerformancePeriod.trades.filter(t => t.type === 'LONG');
                    const shortTrades = selectedPerformancePeriod.trades.filter(t => t.type === 'SHORT');
                    
                    const longWins = longTrades.filter(t => t.status === 'WIN').length;
                    const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
                    
                    const shortWins = shortTrades.filter(t => t.status === 'WIN').length;
                    const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;
                    
                    return (
                      <>
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">LONG:</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">{longTrades.length}</span>
                          <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">%{longWinRate.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest font-mono">SHORT:</span>
                          <span className="text-xs font-black text-rose-400 font-mono">{shortTrades.length}</span>
                          <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                          <span className="text-xs font-black text-rose-400 font-mono">%{shortWinRate.toFixed(1)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                  {(() => {
                    const sessionBreakdown = selectedPerformancePeriod.trades.reduce((acc, t) => {
                      const s = t.session || 'Belirtilmemiş';
                      if (!acc[s]) acc[s] = { pnl: 0, rr: 0 };
                      acc[s].pnl += t.pnl || 0;
                      acc[s].rr += t.rr || 0;
                      return acc;
                    }, {} as Record<string, { pnl: number, rr: number }>);

                    return Object.entries(sessionBreakdown).map(([session, vals]) => {
                      const val = isRrMode ? vals.rr : vals.pnl;
                      if (val === 0) return null;
                      
                      const isProfit = val > 0;
                      const isLoss = val < 0;
                      
                      const textColorClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                      const bgClass = isProfit ? 'bg-emerald-500/10 border-emerald-500/20' : isLoss ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-500/10 border-zinc-500/20';
                      const labelClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                      
                      return (
                        <div key={session} className={`flex items-center justify-center gap-1 shrink-0 px-1.5 py-0.5 rounded border leading-none ${bgClass}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-widest leading-none ${labelClass}`}>{session}:</span>
                          <span className={`text-[9px] font-black font-mono leading-none ${textColorClass}`}>
                            {isRrMode ? `${val > 0 ? '+' : ''}${val.toFixed(1)}R` : `${val > 0 ? '+' : ''}${val.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Trades Table */}
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[300px] px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                  <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                    <tr className="text-[9px] text-zinc-400 uppercase tracking-widest relative after:absolute after:inset-0 after:rounded-lg after:border after:border-zinc-800/80 after:pointer-events-none">
                      <th className="py-2 px-3 font-mono select-none w-[20%] min-w-[120px] bg-zinc-950/40 rounded-l-lg">Parite</th>
                      <th className="py-2 px-3 text-center font-mono select-none w-[12%] min-w-[65px] bg-zinc-950/40">Yön</th>
                      <th className="py-2 px-3 text-center font-mono select-none w-[12%] min-w-[65px] bg-zinc-950/40">RR</th>
                      <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-950/40">Session</th>
                      <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[80px] bg-zinc-950/40">Sonuç</th>
                      <th className="py-2 px-3 text-right font-mono select-none w-[14%] min-w-[90px] bg-zinc-950/40"><div className="flex items-center justify-end w-full"><span>Kâr/Zarar</span></div></th>
                      <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[80px] bg-zinc-950/40 rounded-r-lg">Platform</th>
                    </tr>
                  </thead>
                  <tbody className="block sm:table-row-group">
                    {selectedPerformancePeriod.trades.slice(0, 100).map((t, idx) => {
                      const isWin = t.status === 'WIN';
                      const isLoss = t.status === 'LOSS';
                      const isBe = t.status === 'BREAKEVEN';
                      let pnlText = '—';
                      let pnlColor = 'text-zinc-400';
                      if (isBe) {
                        pnlText = `0.00 ${currency}`;
                        pnlColor = 'text-zinc-500 font-bold';
                      } else {
                        const pnlValue = t.pnl || 0;
                        const prefix = pnlValue > 0 ? '+' : '';
                        pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                        pnlColor = pnlValue > 0 ? 'text-emerald-400 font-black' : (pnlValue < 0 ? 'text-rose-400 font-black' : 'text-zinc-500 font-bold');
                      }
                      
                      return (
                        <tr 
                          key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                          onClick={() => setSelectedTrade ? setSelectedTrade(t) : null}
                          className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-900/40 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0"
                        >
                          <td className="w-1/2 sm:w-[22%] sm:min-w-[130px] flex justify-start items-center sm:table-cell order-1 py-1.5 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-mono sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-l-lg sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                              <span className="text-white font-bold text-xs sm:text-[10px]">{t.asset}</span>
                              <span className="text-[10px] sm:text-[10px] text-zinc-500 sm:text-zinc-400 transition-colors">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[12%] sm:min-w-[70px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200">
                            {t.type === 'LONG' ? (
                              <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded uppercase tracking-wider font-mono transition-colors">LONG</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded uppercase tracking-wider font-mono transition-colors">SHORT</span>
                            )}
                          </td>
                          <td className="w-1/2 sm:w-[12%] sm:min-w-[70px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                              <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
                              <div className="flex items-center h-[20px]">{t.rr !== undefined && t.rr !== null && t.rr !== 0 ? (
                                t.rr > 0 ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      +{t.rr}R
                                    </span>
                                ) : t.rr < 0 ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                )
                              ) : (
                                <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded">—</span>
                              )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-1.5 px-3 text-center text-zinc-400 font-medium sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 w-[15%] min-w-[80px]">
                            <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.session || 'Diğer'}>
                              {t.session || 'Diğer'}
                            </span>
                          </td>
                          <td className="w-1/2 sm:w-[15%] sm:min-w-[80px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0">
                            <div className="flex items-center h-[20px]">
                              {isWin ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">WIN</span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LOSS</span>
                              ) : isBe ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">BE</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">AÇIK</span>
                              )}
                            </div>
                          </td>
                          <td className={`w-full sm:w-[15%] sm:min-w-[80px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 pt-3 sm:pt-0 border-t border-zinc-800/50 sm:border-t-0`}>
                            <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end">
                              <span className="text-sm sm:text-[11px] font-mono font-black">{pnlText}</span>
                            </div>
                          </td>
                          <td className="w-full sm:w-[7%] sm:min-w-[60px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-3 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-r-lg sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0">
                            <div className="sm:hidden">
                              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Platform</span>
                            </div>
                            {t.platform ? (
                              <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.platform}>
                                {t.platform}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {selectedPerformancePeriod.trades.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">Bu dönem için herhangi bir işlem bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {createPortal(
        <AnimatePresence>
          {selectedAsset && (() => {
          const assetTrades = trades
            .filter(t => t.asset === selectedAsset)
            .sort((a, b) => b.createdAt - a.createdAt);

          const totalCount = assetTrades.length;
          const longTrades = assetTrades.filter(t => t.type === 'LONG');
          const shortTrades = assetTrades.filter(t => t.type === 'SHORT');

          const closedLongTrades = longTrades;
          const longWins = closedLongTrades.filter(t => t.status === 'WIN').length;
          const longWinRate = closedLongTrades.length > 0 ? (longWins / closedLongTrades.length) * 100 : 0;

          const closedShortTrades = shortTrades;
          const shortWins = closedShortTrades.filter(t => t.status === 'WIN').length;
          const shortWinRate = closedShortTrades.length > 0 ? (shortWins / closedShortTrades.length) * 100 : 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: 'opacity' }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setSelectedAsset(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950/90 border border-zinc-800/80 rounded-xl shadow-2xl relative overflow-hidden backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-zinc-950/80 border-b border-zinc-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 flex-1 min-w-0">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 sm:px-3 py-1.5 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[10px] sm:text-sm font-black text-emerald-400 font-mono tracking-widest uppercase flex items-center justify-center leading-none">
                        {selectedAsset}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <h2 className="text-zinc-100 font-black text-[10px] sm:text-sm uppercase tracking-wider font-mono leading-none flex items-center whitespace-nowrap">İşlem Geçmişi</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintModalState({
                          isOpen: true,
                          trades: assetTrades,
                          title: `${selectedAsset} İşlem Raporu`,
                          dateRangeText: selectedAsset || ''
                        });
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                    >
                      <Download size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedAsset(null)}
                      className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg transition-colors duration-200 ease-out cursor-pointer group active:scale-95 shadow-xs shrink-0"
                    >
                      <X size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Parite Detay İstatistikleri */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950/40 border-b border-zinc-800/80 shrink-0 select-none w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 text-zinc-100 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">TOPLAM:</span>
                      <span className="text-xs font-black text-white font-mono">{totalCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest font-mono">LONG:</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">{longTrades.length}</span>
                      <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">%{longWinRate.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest font-mono">SHORT:</span>
                      <span className="text-xs font-black text-rose-400 font-mono">{shortTrades.length}</span>
                      <span className="text-[10px] text-zinc-700 font-bold ml-1 uppercase">|</span>
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest ml-1 font-mono">WR:</span>
                      <span className="text-xs font-black text-rose-400 font-mono">%{shortWinRate.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto">
                    {(() => {
                      const sessionBreakdown = assetTrades.reduce((acc, t) => {
                        const s = t.session || 'Belirtilmemiş';
                        if (!acc[s]) acc[s] = { pnl: 0, rr: 0 };
                        acc[s].pnl += t.pnl || 0;
                        acc[s].rr += t.rr || 0;
                        return acc;
                      }, {} as Record<string, { pnl: number, rr: number }>);

                      return Object.entries(sessionBreakdown).map(([session, vals]) => {
                        const val = isRrMode ? vals.rr : vals.pnl;
                        if (val === 0) return null;
                        const isProfit = val > 0;
                        const isLoss = val < 0;
                        const textColorClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        const bgClass = isProfit ? 'bg-emerald-500/10 border-emerald-500/20' : isLoss ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-500/10 border-zinc-500/20';
                        const labelClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-zinc-400';
                        
                        return (
                          <div key={session} className={`flex items-center justify-center gap-1 shrink-0 px-1.5 py-0.5 rounded border leading-none ${bgClass}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest leading-none ${labelClass}`}>{session}:</span>
                            <span className={`text-[9px] font-black font-mono leading-none ${textColorClass}`}>
                              {isRrMode ? `${val > 0 ? '+' : ''}${val.toFixed(1)}R` : `${val > 0 ? '+' : ''}${val.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[300px] px-2 sm:px-4 pb-2 sm:pb-4 pt-3 bg-zinc-950/60">
                  <table className="w-full text-left border-separate sm:border-spacing-x-0 sm:border-spacing-y-1 text-[10px] sm:text-[11px] font-mono whitespace-nowrap sm:table-fixed sm:min-w-[700px] block sm:table">
                    <thead className="sticky top-0 z-20 hidden sm:table-header-group">
                      <tr className="text-[9px] text-zinc-400 uppercase tracking-widest relative after:absolute after:inset-0 after:rounded-lg after:border after:border-zinc-800/80 after:pointer-events-none">
                        <th className="py-2 px-3 font-mono select-none w-[20%] min-w-[120px] bg-zinc-950/40 rounded-l-lg">Tarih</th>
                        <th className="py-2 px-3 text-center font-mono select-none w-[12%] min-w-[65px] bg-zinc-950/40">Yön</th>
                        <th className="py-2 px-3 text-center font-mono select-none w-[12%] min-w-[65px] bg-zinc-950/40">RR</th>
                        <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[75px] bg-zinc-950/40">Session</th>
                        <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[80px] bg-zinc-950/40">Sonuç</th>
                        <th className="py-2 px-3 text-right font-mono select-none w-[14%] min-w-[90px] bg-zinc-950/40"><div className="flex items-center justify-end w-full"><span>Kâr/Zarar</span></div></th>
                        <th className="py-2 px-3 text-center font-mono select-none w-[14%] min-w-[80px] bg-zinc-950/40 rounded-r-lg">Platform</th>
                      </tr>
                    </thead>
                    <tbody className="block sm:table-row-group">
                      {assetTrades.slice(0, 100).map((t, idx) => {
                        const isWin = t.status === 'WIN';
                        const isLoss = t.status === 'LOSS';
                        const isBe = t.status === 'BREAKEVEN';

                        let pnlText = '—';
                        let pnlColor = 'text-zinc-400';
                        if (isBe) {
                          pnlText = `0.00 ${currency}`;
                          pnlColor = 'text-zinc-500 font-bold';
                        } else {
                          const pnlValue = t.pnl || 0;
                          const prefix = pnlValue > 0 ? '+' : '';
                          pnlText = `${prefix}${(pnlValue || 0).toLocaleString()} ${currency}`;
                          pnlColor = pnlValue > 0 ? 'text-emerald-400 font-black' : (pnlValue < 0 ? 'text-rose-400 font-black' : 'text-zinc-500 font-bold');
                        }

                        const formattedDate = new Date(t.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr 
                            key={t.id ? `${t.id}-${idx}` : `trade-${idx}`}
                          onClick={() => setSelectedTrade ? setSelectedTrade(t) : null}
                          className="group cursor-pointer select-none relative flex flex-wrap sm:table-row bg-zinc-900/40 sm:bg-transparent mb-2 sm:mb-0 rounded-xl sm:rounded-none border border-zinc-800/80 hover:border-blue-500/40 sm:border-none p-2 sm:p-0"
                        >
                          <td className="w-1/2 sm:w-[22%] sm:min-w-[130px] flex justify-start items-center sm:table-cell order-1 py-1.5 px-0 sm:px-3 text-zinc-400 group-hover:text-zinc-100 font-mono sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-l-lg sm:border-y sm:border-l sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-1.5">
                              <span className="text-white font-bold text-xs sm:text-[10px]">{formattedDate}</span>
                            </div>
                          </td>
                          <td className="w-1/2 sm:w-[12%] sm:min-w-[70px] flex justify-end sm:justify-center items-center sm:table-cell order-2 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200">
                            {t.type === 'LONG' ? (
                              <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded uppercase tracking-wider font-mono transition-colors">LONG</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded uppercase tracking-wider font-mono transition-colors">SHORT</span>
                            )}
                          </td>
                          <td className="w-1/2 sm:w-[12%] sm:min-w-[70px] flex justify-start sm:justify-center items-center sm:table-cell order-3 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 w-full justify-start sm:justify-center">
                              <span className="sm:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none h-[10px]">RR</span>
                              <div className="flex items-center h-[20px]">{t.rr !== undefined && t.rr !== null && t.rr !== 0 ? (
                                t.rr > 0 ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      +{t.rr}R
                                    </span>
                                ) : t.rr < 0 ? (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded uppercase tracking-wider font-mono transition-colors">
                                      {t.rr}R
                                    </span>
                                )
                              ) : (
                                <span className="inline-flex items-center justify-center w-[38px] sm:w-[44px] h-[18px] text-center text-[9px] sm:text-[10px] font-medium text-zinc-500 rounded">—</span>
                              )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-1.5 px-3 text-center text-zinc-400 font-medium sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 w-[15%] min-w-[80px]">
                            <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.session || 'Diğer'}>
                              {t.session || 'Diğer'}
                            </span>
                          </td>
                          <td className="w-1/2 sm:w-[15%] sm:min-w-[80px] flex justify-end sm:justify-center items-center sm:table-cell order-4 py-1.5 px-0 sm:px-2.5 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0">
                            <div className="flex items-center h-[20px]">
                              {isWin ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">WIN</span>
                              ) : isLoss ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">LOSS</span>
                              ) : isBe ? (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 group-hover:border-zinc-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">BE</span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-[46px] sm:w-[54px] h-[20px] px-1.5 py-0 text-center text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 rounded-full uppercase tracking-wider font-mono transition-colors">AÇIK</span>
                              )}
                            </div>
                          </td>
                          <td className={`w-full sm:w-[15%] sm:min-w-[80px] flex justify-between sm:justify-end items-center sm:table-cell order-5 py-1 px-0 sm:px-3 text-right ${pnlColor} sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:border-y sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 pt-3 sm:pt-0 border-t border-zinc-800/50 sm:border-t-0`}>
                            <span className="sm:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-sans">Kâr/Zarar</span>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1.5 sm:w-full sm:justify-end">
                              <span className="text-sm sm:text-[11px] font-mono font-black">{pnlText}</span>
                            </div>
                          </td>
                          <td className="w-full sm:w-[7%] sm:min-w-[60px] flex justify-between sm:justify-center items-center sm:table-cell order-6 py-1 px-0 sm:px-3 text-center sm:bg-zinc-950/30 group-hover:bg-blue-950/10 sm:rounded-r-lg sm:border-y sm:border-r sm:border-zinc-800/80 group-hover:border-blue-500/40 transition-colors duration-200 mt-1.5 sm:mt-0 sm:pt-1.5 pt-0">
                            <div className="sm:hidden">
                              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Platform</span>
                            </div>
                            {t.platform ? (
                              <span className="inline-flex items-center justify-center min-w-[54px] max-w-[130px] h-[20px] px-2.5 py-0 text-center text-[10px] font-bold text-zinc-300 bg-zinc-800/80 border border-zinc-700/80 group-hover:border-zinc-500 rounded-full uppercase tracking-wider font-mono transition-colors whitespace-nowrap truncate" title={t.platform}>
                                {t.platform}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                      {assetTrades.length > 100 && (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-[10px] text-zinc-500 font-mono italic">
                            Sadece son 100 işlem gösteriliyor. Daha fazlası için Geçmiş sekmesine bakınız.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
        </AnimatePresence>,
        document.body
      )}

      {/* Sistem Bütünlüğü ve Veri Analizi */}
      {(() => {
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
        
        if (profitFactor > 50) {
          hasIntegrityIssue = true;
          warnings.push("Kâr Faktörü (Profit Factor) çok yüksek. Zarar (Loss) işlemlerinin eksik veya hatalı girilmediğinden emin olun.");
        }

        const extremeRRTrades = trades.filter(t => t.rr && (t.rr > 50 || t.rr < -10));
        if (extremeRRTrades.length > 0) {
          hasIntegrityIssue = true;
          warnings.push("İstatistikleri bozabilecek ekstrem R:R değerlerine sahip işlemler tespit edildi (örn >50R veya <-10R).");
        }

        const noPnlWinTrades = trades.filter(t => t.status === 'WIN' && (t.pnl === 0 || !t.pnl) && (t.rr === 0 || !t.rr));
        if (noPnlWinTrades.length > 0) {
          hasIntegrityIssue = true;
          warnings.push("Sıfır kâr ile kaydedilmiş 'WIN' statüsünde işlemler var. Lütfen bunları 'BREAKEVEN' olarak değiştirin veya R:R/PnL girin.");
        }

        if (hasIntegrityIssue) {
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 mb-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center gap-1.5 shrink-0 text-rose-400">
                <AlertTriangle size={13} />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Veri Uyarısı ({warnings.length})</span>
              </div>
              <ul className="flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1">
                {warnings.map((w, idx) => (
                  <li key={idx} className="text-zinc-400 text-[9px] flex items-center gap-1">
                    <span className="h-0.5 w-0.5 rounded-full bg-rose-500/50 shrink-0" />
                    <span className="leading-none">{w}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        }
        return null;
      })()}

      <PrintReportModal title="Analiz Raporu" isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
        trades={printModalState.trades}
        
        dateRangeText={printModalState.dateRangeText}
        currency={currency}
      />
      
      <HeatmapModal
        isOpen={isHeatmapOpen}
        onClose={() => setIsHeatmapOpen(false)}
        trades={trades}
      />

      {/* Session Kör Nokta Matrisi Modal */}
      {createPortal(
        <AnimatePresence>
          {isDeadZoneModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-zinc-950/90 border border-zinc-800/80 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-md"
              >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <InfinityIcon size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase font-mono text-zinc-100 tracking-wider">
                      Session Kör Nokta Matrisi
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Parite ve seans bazlı kârlılık, R getirisi ve başarı oranı analizi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeadZoneModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Controls Bar */}
              <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Parite ara..."
                    value={deadZoneSearch}
                    onChange={(e) => { setDeadZoneSearch(e.target.value); setDeadZonePage(1); }}
                    className="bg-zinc-800/90 border border-zinc-700/50 text-zinc-100 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500/50 w-44 sm:w-56 placeholder-zinc-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400 font-mono font-bold mr-1">Sırala:</span>
                  <button
                    type="button"
                    onClick={() => { setDeadZoneSort('pnl'); setDeadZonePage(1); }}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors duration-200 ease-out font-bold border ${deadZoneSort === 'pnl' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    PNL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeadZoneSort('rr'); setDeadZonePage(1); }}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors duration-200 ease-out font-bold border ${deadZoneSort === 'rr' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    RR
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeadZoneSort('winrate'); setDeadZonePage(1); }}
                    className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors duration-200 ease-out font-bold border ${deadZoneSort === 'winrate' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    WR
                  </button>
                </div>
              </div>

              {/* Content Table */}
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-center border-collapse text-xs font-mono whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest bg-zinc-950/80">
                      <th className="py-2.5 px-3 text-left">Parite</th>
                      {(() => {
                        const matrixSessions = Array.from(new Set([...sessions, ...Object.values(metrics.deadZone).flatMap(obj => Object.keys(obj))])).sort();
                        return matrixSessions.map((s) => (
                          <th key={s} className="py-2.5 px-2">{s}</th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {(() => {
                      const paginatedData = processedDeadZone.slice((deadZonePage - 1) * 8, deadZonePage * 8);
                      const matrixSessions = Array.from(new Set([...sessions, ...Object.values(metrics.deadZone).flatMap(obj => Object.keys(obj))])).sort();
                      
                      if (paginatedData.length === 0) {
                        return (
                          <tr>
                            <td colSpan={matrixSessions.length + 1} className="py-8 text-center text-zinc-500">
                              Veri bulunamadı.
                            </td>
                          </tr>
                        );
                      }

                      return paginatedData.map((asset) => {
                        const row = metrics.deadZone[asset] || {};
                        const getCell = (s: string) => {
                          const cell = row[s];
                          if (!cell || cell.count === 0) return <span className="text-zinc-700">-</span>;
                          const wr = cell.count > 0 ? (cell.wins / cell.count) * 100 : 0;
                          return (
                            <div className="flex flex-col gap-0.5 items-center justify-center py-1">
                              <span className={`font-black text-xs ${cell.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {cell.pnl >= 0 ? '+' : ''}{Math.round(cell?.pnl || 0).toLocaleString()} {currency}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-zinc-300 font-bold">{cell.rr ? cell.rr.toFixed(1) : '0.0'} R</span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-zinc-400">%{wr.toFixed(0)}</span>
                              </div>
                            </div>
                          );
                        };
                        return (
                          <tr key={asset} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 px-3 text-left font-black text-white uppercase text-xs tracking-wide border-r border-zinc-800 bg-zinc-950/40 font-mono">
                              {asset}
                            </td>
                            {matrixSessions.map((s, idx) => (
                              <td key={s} className={`py-2 px-2 ${idx % 2 === 0 ? 'bg-zinc-950/20' : ''}`}>
                                {getCell(s)}
                              </td>
                            ))}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {processedDeadZone.length > 0 && (
                <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    Toplam {processedDeadZone.length} Parite
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-400 font-bold">
                      Sayfa {deadZonePage} / {Math.max(1, Math.ceil(processedDeadZone.length / 8))}
                    </span>
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setDeadZonePage(prev => Math.max(1, prev - 1))}
                        disabled={deadZonePage <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                      <button
                        type="button"
                        onClick={() => setDeadZonePage(prev => Math.min(Math.ceil(processedDeadZone.length / 8), prev + 1))}
                        disabled={deadZonePage >= Math.ceil(processedDeadZone.length / 8)}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-200 ease-out cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Haftalık İdeal İşlem Frekansı Modal */}
      {createPortal(
        <AnimatePresence>
          {isOptimalFreqModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-zinc-950/90 border border-zinc-800/80 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-md"
              >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Crosshair size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase font-mono text-zinc-100 tracking-wider">
                      Haftalık İdeal İşlem Frekansı
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Haftalık işlem hacminize göre kârlılık, Profit Factor ve R verimlilik analizi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOptimalFreqModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Table */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <table className="w-full text-left border-collapse text-xs font-mono whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest bg-zinc-950/80">
                      <th className="py-2.5 px-3">İşlem Hacmi (Haftalık)</th>
                      <th className="py-2.5 px-3 text-center">Avg. Profit Factor</th>
                      <th className="py-2.5 px-3 text-center">Ortalama R</th>
                      <th className="py-2.5 px-3 text-right">Yaşanan Hafta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {metrics.optimalFreq.map((f: any) => (
                      <tr key={f.label} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-3 text-zinc-200 font-black">{f.label}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${getPFColor(f.avgPF)} bg-zinc-800/90 border border-zinc-700/50 text-zinc-100`}>
                            {!isFinite(f.avgPF) || f.avgPF === Number.POSITIVE_INFINITY ? "Sonsuz" : f.avgPF.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-black font-mono ${f.avgR > 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : f.avgR < 0 ? "text-rose-400 bg-rose-500/10 border-rose-500/30" : "text-zinc-400 bg-zinc-900 border-zinc-800"} border`}>
                            {f.avgR > 0 ? "+" : ""}{(f.avgR ?? 0).toFixed(2)} R
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-400 font-bold">{f.weeksCount} hafta</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
                <button
                  onClick={() => setIsOptimalFreqModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
});
