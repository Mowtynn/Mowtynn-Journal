import { MODAL_BACKDROP, MODAL_PANEL } from '../lib/motion';
import { smartUpper } from '../constants/constants';
import React, { useState, useEffect } from 'react';
import { useAfterPaint } from '../hooks/useAfterPaint';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal,
  Filter,
  RotateCcw,
  Check,
  Calendar,
  Activity,
  ArrowUpRight,
  Coins,
  Flame,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  X,
  Target,
  Zap,
  TrendingUp,
  Layers,
  BookOpen,
  Newspaper,
  Percent,
  Crosshair,
  Scale,
  PenLine,
} from 'lucide-react';
import {
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_ENTRY_MODELS,
  DEFAULT_TREND_TYPES,
  DEFAULT_DEFINITION_TITLES,
} from '../constants/constants';
import { ASIA_RANGE_TYPES, DefinitionTitles } from '../types';
import { DEFAULT_DATE_LIMIT, EMPTY_EXTRA_FILTERS, countExtraFilters, FILTER_DIMENSIONS, type ExtraTradeFilters, type FilterDimension } from '../lib/tradeFilters';
import { dimensionValue, SETUP_DIMENSIONS, UNSPECIFIED } from '../lib/setupScorecard';
import { HOLD_BUCKETS, PLANNED_RR_BUCKETS, STOP_RANGE_BUCKETS, SWEEP_DELAY_BUCKETS, sweepBucketOrder } from '../lib/asiaAnalytics';
import { MANAGEMENT_TYPES } from '../types';
import { setupQualityTier } from '../lib/discipline';
import { useNewsDayLabels } from '../hooks/useNewsDayLabels';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PillMultiSelect, StatusMultiSelect, TypeMultiSelect, FilterAccordionRow, FilterChip, FilterChipRow, FILTER_INPUT, FILTER_LABEL } from './filters/FilterControls';

interface GlobalFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: any[];
  // Options
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  sessions: string[];
  assets: string[];
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
  definitionTitles?: DefinitionTitles;
  // Selected
  globalSelectedConfirmations: string[];
  setGlobalSelectedConfirmations: (v: string[]) => void;
  globalSelectedPlanFidelity: string[];
  setGlobalSelectedPlanFidelity: (v: string[]) => void;
  globalSelectedAssets: string[];
  setGlobalSelectedAssets: (v: string[]) => void;
  globalSelectedSessions: string[];
  setGlobalSelectedSessions: (v: string[]) => void;
  globalSelectedTimeframes: string[];
  setGlobalSelectedTimeframes: (v: string[]) => void;
  globalSelectedHtfTimeframes: string[];
  setGlobalSelectedHtfTimeframes: (v: string[]) => void;
  globalSelectedStatuses: string[];
  setGlobalSelectedStatuses: (v: string[]) => void;
  globalSelectedTypes: string[];
  setGlobalSelectedTypes: (v: string[]) => void;
  globalSelectedEntryModels?: string[];
  setGlobalSelectedEntryModels?: (v: string[]) => void;
  globalSelectedTrendTypes?: string[];
  setGlobalSelectedTrendTypes?: (v: string[]) => void;
  globalDateLimit: string;
  setGlobalDateLimit: (v: string) => void;
  globalMinAsiaRangePips?: number;
  setGlobalMinAsiaRangePips?: (v?: number) => void;
  globalMaxAsiaRangePips?: number;
  setGlobalMaxAsiaRangePips?: (v?: number) => void;
  globalMinMaePips?: number;
  setGlobalMinMaePips?: (v?: number) => void;
  globalMaxMaePips?: number;
  setGlobalMaxMaePips?: (v?: number) => void;
  globalMinMfePips?: number;
  setGlobalMinMfePips?: (v?: number) => void;
  globalMaxMfePips?: number;
  setGlobalMaxMfePips?: (v?: number) => void;
  // Sonradan eklenen alanlar
  premiumDiscounts?: string[];
  tpTargets?: string[];
  asiaRangeFvgs?: string[];
  globalExtra?: ExtraTradeFilters;
  setGlobalExtra?: (v: ExtraTradeFilters) => void;
}


export const GlobalFilterModal: React.FC<GlobalFilterModalProps> = React.memo(({
  isOpen,
  onClose,
  trades = [],
  timeframes,
  htfTimeframes,
  confirmations,
  sessions,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  globalSelectedConfirmations, setGlobalSelectedConfirmations,
  globalSelectedPlanFidelity, setGlobalSelectedPlanFidelity,
  globalSelectedAssets, setGlobalSelectedAssets,
  globalSelectedSessions, setGlobalSelectedSessions,
  globalSelectedTimeframes, setGlobalSelectedTimeframes,
  globalSelectedHtfTimeframes, setGlobalSelectedHtfTimeframes,
  globalSelectedStatuses, setGlobalSelectedStatuses,
  globalSelectedTypes, setGlobalSelectedTypes,
  globalSelectedEntryModels = [], setGlobalSelectedEntryModels,
  globalSelectedTrendTypes = [], setGlobalSelectedTrendTypes,
  globalDateLimit, setGlobalDateLimit,
  globalMinAsiaRangePips, setGlobalMinAsiaRangePips,
  globalMaxAsiaRangePips, setGlobalMaxAsiaRangePips,
  globalMinMaePips, setGlobalMinMaePips,
  globalMaxMaePips, setGlobalMaxMaePips,
  globalMinMfePips, setGlobalMinMfePips,
  globalMaxMfePips, setGlobalMaxMfePips,
  premiumDiscounts = [],
  tpTargets = [],
  asiaRangeFvgs = [],
  globalExtra = EMPTY_EXTRA_FILTERS,
  setGlobalExtra,
}) => {
  const { labels: newsLabels } = useNewsDayLabels();
  const patchExtra = (p: Partial<ExtraTradeFilters>) => setGlobalExtra?.({ ...globalExtra, ...p });
  useBodyScrollLock(isOpen);
  // Seçenek listeleri (tüm işlemleri tarar) açılış animasyonu çizildikten sonra hesaplanır
  const ready = useAfterPaint(isOpen);

  // Dynamic extraction of unique options from both definitions and actual trade data
  const dynamicAssets = React.useMemo(() => {
    if (!ready) return assets || [];
    const set = new Set(assets || []);
    trades.forEach(t => { if (t.asset) set.add(t.asset); });
    return Array.from(set);
  }, [ready, assets, trades]);


  const dynamicConfirmations = React.useMemo(() => {
    if (!ready) return confirmations || [];
    const set = new Set(confirmations || []);
    trades.forEach(t => {
      if (t.confirmations && Array.isArray(t.confirmations)) {
        t.confirmations.forEach(c => set.add(c));
      }
    });
    return Array.from(set);
  }, [ready, confirmations, trades]);

  const dynamicSessions = React.useMemo(() => {
    if (!ready) return sessions || [];
    const set = new Set(sessions || []);
    trades.forEach(t => { if (t.session) set.add(t.session); });
    return Array.from(set);
  }, [ready, sessions, trades]);

  const dynamicTimeframes = React.useMemo(() => {
    if (!ready) return timeframes || [];
    const set = new Set(timeframes || []);
    trades.forEach(t => { if (t.timeframe) set.add(t.timeframe); });
    return Array.from(set);
  }, [ready, timeframes, trades]);

  const dynamicHtfTimeframes = React.useMemo(() => {
    if (!ready) return htfTimeframes || [];
    const set = new Set(htfTimeframes || []);
    trades.forEach(t => { if (t.htfTimeframe) set.add(t.htfTimeframe); });
    return Array.from(set);
  }, [ready, htfTimeframes, trades]);

  const dynamicPlanFidelities = React.useMemo(() => {
    if (!ready) return planFidelities || [];
    const set = new Set(planFidelities || []);
    trades.forEach(t => { if (t.planFidelity) set.add(t.planFidelity); });
    return Array.from(set);
  }, [ready, planFidelities, trades]);

  const dynamicEntryModels = React.useMemo(() => {
    if (!ready) return entryModels || [];
    const set = new Set(entryModels || []);
    trades.forEach(t => {
      if (t.entryModels && Array.isArray(t.entryModels)) {
        t.entryModels.forEach(em => set.add(em));
      }
    });
    return Array.from(set);
  }, [ready, entryModels, trades]);

  const dynamicTrendTypes = React.useMemo(() => {
    if (!ready) return trendTypes || [];
    const set = new Set(trendTypes || []);
    trades.forEach(t => { if (t.trend) set.add(t.trend); });
    return Array.from(set);
  }, [ready, trendTypes, trades]);

  // Türetilmiş boyut filtrelerinin seçenekleri: işlemlerde görülen değerler, kendi doğal sıralarıyla
  const dimOptions = React.useMemo(() => {
    const out = {} as Record<FilterDimension, string[]>;
    const orderBy = (list: readonly string[]) => (a: string, b: string) => list.indexOf(a) - list.indexOf(b);
    FILTER_DIMENSIONS.forEach((d) => {
      const set = new Set<string>();
      if (ready) {
        if (d === 'management') trades.forEach((t) => (t.management || []).forEach((m: string) => set.add(m)));
        else trades.forEach((t) => {
          const v = dimensionValue(t, d);
          if (v !== UNSPECIFIED) set.add(v);
        });
      }
      const vals = [...set];
      if (d === 'sweepHour') vals.sort((a, b) => sweepBucketOrder(a) - sweepBucketOrder(b));
      else if (d === 'sweepDelay') vals.sort(orderBy(SWEEP_DELAY_BUCKETS));
      else if (d === 'plannedRR') vals.sort(orderBy(PLANNED_RR_BUCKETS));
      else if (d === 'stopToRange') vals.sort(orderBy(STOP_RANGE_BUCKETS));
      else if (d === 'holdTime') vals.sort(orderBy(HOLD_BUCKETS));
      else if (d === 'management') vals.sort(orderBy(MANAGEMENT_TYPES));
      else vals.sort((a, b) => a.localeCompare(b, 'tr'));
      out[d] = vals;
    });
    return out;
  }, [ready, trades]);
  const dimLabel = (d: FilterDimension) => SETUP_DIMENSIONS.find((x) => x.id === d)?.label || d;
  const patchDim = (d: FilterDimension, vals: string[]) => patchExtra({ dims: { ...(globalExtra.dims || {}), [d]: vals } });

  // Ek alanların seçenekleri: Tanımlamalar + işlemlerde görülen değerler
  const extraOptions = React.useMemo(() => {
    const pd = new Set(premiumDiscounts);
    const tp = new Set(tpTargets);
    const fvg = new Set(asiaRangeFvgs);
    const risk = new Set<number>();
    let incomplete = 0;
    if (ready) {
      trades.forEach((t) => {
        if (t.premiumDiscount) pd.add(t.premiumDiscount);
        if (Array.isArray(t.tpTargets)) t.tpTargets.forEach((x: string) => x && tp.add(x));
        if (t.asiaRangeFvg) fvg.add(t.asiaRangeFvg);
        if (typeof t.riskPct === 'number' && t.riskPct > 0) risk.add(Math.round(t.riskPct * 1000) / 1000);
        if (t.quickEntry === true) incomplete++;
      });
    }
    return {
      asiaRanges: [...ASIA_RANGE_TYPES] as string[],
      premiumDiscounts: Array.from(pd),
      tpTargets: Array.from(tp),
      asiaRangeFvgs: Array.from(fvg),
      riskPcts: Array.from(risk).sort((a, b) => a - b),
      incomplete,
    };
  }, [ready, trades, premiumDiscounts, tpTargets, asiaRangeFvgs]);
  const riskLabel = (n: number) => `%${n.toLocaleString('en-US', { maximumFractionDigits: 3 })}`;
  const newsSummary = globalExtra.newsDay === 'YES' ? newsLabels.yes : globalExtra.newsDay === 'NO' ? newsLabels.no : 'Tümü';

  // Keep track of which accordion categories are expanded
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    setOpenSections({
      trend: true,
      entry: true,
      planFidelity: true,
      confirmation: true,
      platform: true,
      stage: true,
      date: true,
      status: true,
      type: true,
      asset: true,
      entryTf: true,
      htfTf: true,
      session: true,
      asiaRange: true,
      asiaRangeType: true,
      ...Object.fromEntries(FILTER_DIMENSIONS.map((d) => [`dim:${d}`, true])),
      pd: true,
      tpTarget: true,
      asiaFvg: true,
      newsDay: true,
      riskPct: true,
      quickEntry: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const handleReset = () => {
    setGlobalSelectedConfirmations([]);
    setGlobalSelectedPlanFidelity([]);
    setGlobalSelectedAssets([]);
    setGlobalSelectedSessions([]);
    setGlobalSelectedTimeframes([]);
    setGlobalSelectedHtfTimeframes([]);
    setGlobalSelectedStatuses([]);
    setGlobalSelectedTypes([]);
    setGlobalSelectedEntryModels?.([]);
    setGlobalSelectedTrendTypes?.([]);
    setGlobalDateLimit(DEFAULT_DATE_LIMIT);
    setGlobalMinAsiaRangePips?.(undefined);
    setGlobalMaxAsiaRangePips?.(undefined);
    setGlobalMinMaePips?.(undefined);
    setGlobalMaxMaePips?.(undefined);
    setGlobalMinMfePips?.(undefined);
    setGlobalMaxMfePips?.(undefined);
    setGlobalExtra?.(EMPTY_EXTRA_FILTERS);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeFilterCount = 
    globalSelectedConfirmations.length + 
    globalSelectedPlanFidelity.length +
    globalSelectedAssets.length + 
    globalSelectedSessions.length + 
    globalSelectedTimeframes.length + 
    globalSelectedHtfTimeframes.length + 
    globalSelectedStatuses.length + 
    globalSelectedTypes.length + 
    (globalSelectedEntryModels?.length || 0) + 
    (globalSelectedTrendTypes?.length || 0) + 
    (globalDateLimit !== DEFAULT_DATE_LIMIT ? 1 : 0) +
    (globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined ? 1 : 0) +
    (globalMinMaePips !== undefined || globalMaxMaePips !== undefined ? 1 : 0) +
    (globalMinMfePips !== undefined || globalMaxMfePips !== undefined ? 1 : 0) +
    countExtraFilters(globalExtra);

  const dateOptions = [
    { value: '1w', label: '1 Hafta' },
    { value: '1m', label: '1 Ay' },
    { value: '3m', label: '3 Ay' },
    { value: '6m', label: '6 Ay' },
    { value: '1y', label: '1 Yıl' },
    { value: 'all', label: 'Tüm Zamanlar (Varsayılan)' }
  ];

  const getDateLabel = (val: string) => {
    const found = dateOptions.find(d => d.value === val);
    return found ? found.label : 'Tüm Zamanlar';
  };

  const isAnyOpen = Object.values(openSections).some(Boolean);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="global-filter-backdrop"
          {...MODAL_BACKDROP}
          className="fixed inset-0 modal-layer modal-dim  z-[1500] flex justify-center items-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="global-filter-content"
            {...MODAL_PANEL}
            onClick={(e) => e.stopPropagation()}
            id="global-filter-popup"
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-2xl h-[680px] max-h-[88vh] min-h-[480px] overflow-hidden flex flex-col relative shadow-2xl my-auto"
          >
            
          {/* Header */}
          <div className="modal-header">
            <h2 className="heading-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <Filter size={16} />
              </div>
              Filtre Menüsü
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={isAnyOpen ? collapseAll : expandAll}
                className="btn-icon"
              >
                {isAnyOpen ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button aria-label="Sıfırla" title="Sıfırla"
                type="button"
                onClick={handleReset}
                className="btn-icon"
              >
                <RotateCcw size={16} />
              </button>
              <button aria-label="Kapat" title="Kapat"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="btn-icon"
              >
                <X size={16} />
              </button>
            </div>
          </div>


            {/* Content Body - Menu / Accordion list */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2 bg-zinc-950/30 min-h-0">
              
              {/* 1. ZAMAN ARALIĞI */}
              <FilterAccordionRow title="Zaman Aralığı" 
                icon={<Calendar size={14} className="text-amber-400" />}
                
                summaryText={getDateLabel(globalDateLimit)}
                badgeCount={globalDateLimit !== DEFAULT_DATE_LIMIT ? 1 : 0}
                isOpen={!!openSections.date}
                onToggle={() => toggleSection('date')}
              >
                <FilterChipRow>
                  {dateOptions.map((option) => (
                    <FilterChip key={option.value} check={false} tone={option.value === 'all' ? 'neutral' : 'brand'} active={globalDateLimit === option.value} onClick={() => setGlobalDateLimit(option.value)}>
                      {option.label}
                    </FilterChip>
                  ))}
                </FilterChipRow>
              </FilterAccordionRow>

              {/* 2. PARİTE (ASSET) */}
              <FilterAccordionRow title={definitionTitles.assets || "Parite"} 
                icon={<Coins size={14} className="text-yellow-400" />}
                
                summaryText={globalSelectedAssets.length > 0 ? globalSelectedAssets.join(', ') : 'Tümü'}
                badgeCount={globalSelectedAssets.length}
                isOpen={!!openSections.asset}
                onToggle={() => toggleSection('asset')}
              >
                <PillMultiSelect
                  options={dynamicAssets}
                  selectedValues={globalSelectedAssets}
                  onChange={setGlobalSelectedAssets}
                />
              </FilterAccordionRow>

              {/* 3. İŞLEM YÖNÜ (TYPE) */}
              <FilterAccordionRow title="İşlem Yönü" 
                icon={<ArrowUpRight size={14} className="text-indigo-400" />}
                
                summaryText={globalSelectedTypes.length > 0 ? globalSelectedTypes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedTypes.length}
                isOpen={!!openSections.type}
                onToggle={() => toggleSection('type')}
              >
                <TypeMultiSelect
                  selectedValues={globalSelectedTypes}
                  onChange={setGlobalSelectedTypes}
                />
              </FilterAccordionRow>

              {/* 4. SESSION */}
              <FilterAccordionRow title={definitionTitles.sessions || "Session"} 
                icon={<Flame size={14} className="text-orange-400" />}
                
                summaryText={globalSelectedSessions.length > 0 ? globalSelectedSessions.join(', ') : 'Tümü'}
                badgeCount={globalSelectedSessions.length}
                isOpen={!!openSections.session}
                onToggle={() => toggleSection('session')}
              >
                <PillMultiSelect
                  options={dynamicSessions}
                  selectedValues={globalSelectedSessions}
                  onChange={setGlobalSelectedSessions}
                />
              </FilterAccordionRow>

              {/* 4b. ASIA RANGE (PİP) */}
              <FilterAccordionRow title="Asia Range (Pip)" 
                icon={<Activity size={14} className="text-amber-400" />}
                summaryText={
                  (globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined)
                    ? `${globalMinAsiaRangePips ?? '0'} - ${globalMaxAsiaRangePips ?? '∞'} Pip`
                    : 'Tümü'
                }
                badgeCount={(globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined) ? 1 : 0}
                isOpen={!!openSections.asiaRange}
                onToggle={() => toggleSection('asiaRange')}
              >
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider">{smartUpper("Aralık (En Az - En Çok)")}</span>
                    {(globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined) && (
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalMinAsiaRangePips?.(undefined);
                          setGlobalMaxAsiaRangePips?.(undefined);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Az (Min Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Min Pip"
                        value={globalMinAsiaRangePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMinAsiaRangePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Çok (Maks Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Maks Pip"
                        value={globalMaxAsiaRangePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMaxAsiaRangePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                  </div>
                </div>
              </FilterAccordionRow>

              {/* 4c. MAE (DRAWDOWN PİP) */}
              <FilterAccordionRow title="MAE (Maks. Aleyhte Pip)" 
                icon={<Activity size={14} className="text-rose-400" />}
                summaryText={
                  (globalMinMaePips !== undefined || globalMaxMaePips !== undefined)
                    ? `${globalMinMaePips ?? '0'} - ${globalMaxMaePips ?? '∞'} Pip`
                    : 'Tümü'
                }
                badgeCount={(globalMinMaePips !== undefined || globalMaxMaePips !== undefined) ? 1 : 0}
                isOpen={!!openSections.mae}
                onToggle={() => toggleSection('mae')}
              >
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider">{smartUpper("Aralık (En Az - En Çok Drawdown)")}</span>
                    {(globalMinMaePips !== undefined || globalMaxMaePips !== undefined) && (
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalMinMaePips?.(undefined);
                          setGlobalMaxMaePips?.(undefined);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Az (Min Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Min Pip"
                        value={globalMinMaePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMinMaePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Çok (Maks Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Maks Pip"
                        value={globalMaxMaePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMaxMaePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                  </div>
                </div>
              </FilterAccordionRow>

              {/* 4d. MFE (LEHTE PİP) */}
              <FilterAccordionRow title="MFE (Maks. Lehte Pip)" 
                icon={<Activity size={14} className="text-cyan-400" />}
                summaryText={
                  (globalMinMfePips !== undefined || globalMaxMfePips !== undefined)
                    ? `${globalMinMfePips ?? '0'} - ${globalMaxMfePips ?? '∞'} Pip`
                    : 'Tümü'
                }
                badgeCount={(globalMinMfePips !== undefined || globalMaxMfePips !== undefined) ? 1 : 0}
                isOpen={!!openSections.mfe}
                onToggle={() => toggleSection('mfe')}
              >
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase tracking-wider">{smartUpper("Aralık (En Az - En Çok Tepe)")}</span>
                    {(globalMinMfePips !== undefined || globalMaxMfePips !== undefined) && (
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalMinMfePips?.(undefined);
                          setGlobalMaxMfePips?.(undefined);
                        }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Az (Min Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Min Pip"
                        value={globalMinMfePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMinMfePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                    <div>
                      <label className={`${FILTER_LABEL} mb-1 block`}>En Çok (Maks Pip)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Maks Pip"
                        value={globalMaxMfePips ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGlobalMaxMfePips?.(val !== '' ? parseFloat(val) : undefined);
                        }}
                        className={FILTER_INPUT}
                      />
                    </div>
                  </div>
                </div>
              </FilterAccordionRow>

              {/* 5. TIMEFRAME */}
              <FilterAccordionRow title={definitionTitles.htfTimeframes || "Timeframe"} 
                icon={<Clock size={14} className="text-blue-400" />}
                
                summaryText={globalSelectedHtfTimeframes.length > 0 ? globalSelectedHtfTimeframes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedHtfTimeframes.length}
                isOpen={!!openSections.htfTf}
                onToggle={() => toggleSection('htfTf')}
              >
                <PillMultiSelect
                  options={dynamicHtfTimeframes}
                  selectedValues={globalSelectedHtfTimeframes}
                  onChange={setGlobalSelectedHtfTimeframes}
                />
              </FilterAccordionRow>

              {/* 6. ENTRY TIMEFRAME */}
              <FilterAccordionRow title={definitionTitles.timeframes || "Entry Timeframe"} 
                icon={<Clock size={14} className="text-cyan-400" />}
                
                summaryText={globalSelectedTimeframes.length > 0 ? globalSelectedTimeframes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedTimeframes.length}
                isOpen={!!openSections.entryTf}
                onToggle={() => toggleSection('entryTf')}
              >
                <PillMultiSelect
                  options={dynamicTimeframes}
                  selectedValues={globalSelectedTimeframes}
                  onChange={setGlobalSelectedTimeframes}
                />
              </FilterAccordionRow>

              {/* 7. SETUP KALİTESİ */}
              <FilterAccordionRow title={definitionTitles.planFidelities || "SETUP KALİTESİ"} 
                icon={<Target size={14} className="text-indigo-400" />}
                summaryText={globalSelectedPlanFidelity.length > 0 ? globalSelectedPlanFidelity.join(', ') : 'Tümü'}
                badgeCount={globalSelectedPlanFidelity.length}
                isOpen={!!openSections.planFidelity}
                onToggle={() => toggleSection('planFidelity')}
              >
                <div className="w-full flex items-center bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-800/80 mt-1 gap-1.5 overflow-hidden">
                  {dynamicPlanFidelities.map((item) => {
                    const isSelected = globalSelectedPlanFidelity.includes(item);
                    const tier = setupQualityTier(item);
                    const activeClasses = tier === 'high' ? 'toggle-item-win font-bold'
                      : tier === 'low' ? 'toggle-item-loss font-bold'
                      : 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold';

                    return (
                      <button
                        lang="en"
                        key={item}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setGlobalSelectedPlanFidelity(globalSelectedPlanFidelity.filter(x => x !== item));
                          } else {
                            setGlobalSelectedPlanFidelity([...globalSelectedPlanFidelity, item]);
                          }
                        }}
                        className={`flex-1 min-w-0 text-[10px] py-1.5 font-bold uppercase transition-colors duration-200 rounded-lg border text-center truncate cursor-pointer ${
                          isSelected ? activeClasses : 'border-transparent toggle-item-inactive'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </FilterAccordionRow>

              {/* 8. PD ARRAY */}
              <FilterAccordionRow title={definitionTitles.confirmations || "PD ARRAY"} 
                icon={<Sparkles size={14} className="text-purple-400" />}
                
                summaryText={globalSelectedConfirmations.length > 0 ? globalSelectedConfirmations.join(', ') : 'Tümü'}
                badgeCount={globalSelectedConfirmations.length}
                isOpen={!!openSections.confirmation}
                onToggle={() => toggleSection('confirmation')}
              >
                <PillMultiSelect
                  options={dynamicConfirmations}
                  selectedValues={globalSelectedConfirmations}
                  onChange={setGlobalSelectedConfirmations}
                />
              </FilterAccordionRow>

              {/* 9. TREND YAPISI */}
              <FilterAccordionRow title={definitionTitles.trendTypes || "Trend Yapısı"} 
                icon={<TrendingUp size={14} className="text-cyan-400" />}
                summaryText={globalSelectedTrendTypes.length > 0 ? globalSelectedTrendTypes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedTrendTypes.length}
                isOpen={!!openSections.trend}
                onToggle={() => toggleSection('trend')}
              >
                <PillMultiSelect
                  options={dynamicTrendTypes}
                  selectedValues={globalSelectedTrendTypes}
                  onChange={(vals) => setGlobalSelectedTrendTypes?.(vals)}
                />
              </FilterAccordionRow>

              {/* 10. ENTRY MODEL */}
              <FilterAccordionRow title={definitionTitles.entryModels || "Entry Model"} 
                icon={<Zap size={14} className="text-amber-400" />}
                summaryText={globalSelectedEntryModels.length > 0 ? globalSelectedEntryModels.join(', ') : 'Tümü'}
                badgeCount={globalSelectedEntryModels.length}
                isOpen={!!openSections.entry}
                onToggle={() => toggleSection('entry')}
              >
                <PillMultiSelect
                  options={dynamicEntryModels}
                  selectedValues={globalSelectedEntryModels}
                  onChange={(vals) => setGlobalSelectedEntryModels?.(vals)}
                />
              </FilterAccordionRow>

              {/* 11. ASIA RANGE (Range / Trend / Swept) */}
              <FilterAccordionRow title={definitionTitles.asiaRange || "Asia Range"}
                icon={<BookOpen size={14} className="text-cyan-400" />}
                summaryText={globalExtra.asiaRanges.length > 0 ? globalExtra.asiaRanges.join(', ') : 'Tümü'}
                badgeCount={globalExtra.asiaRanges.length}
                isOpen={!!openSections.asiaRangeType}
                onToggle={() => toggleSection('asiaRangeType')}
              >
                <PillMultiSelect
                  options={extraOptions.asiaRanges}
                  selectedValues={globalExtra.asiaRanges}
                  onChange={(vals) => patchExtra({ asiaRanges: vals })}
                />
              </FilterAccordionRow>

              {/* Türetilmiş / yeni girdiler: Sweep Saati, Sweep → Giriş, Planlanan R:R, Stop / Asia Range, Günün İşlemi, İşlem Yönetimi, Çıkış Sonrası TP, İşlem Süresi */}
              {FILTER_DIMENSIONS.map((d) => {
                const sel = globalExtra.dims?.[d] || [];
                return (
                  <FilterAccordionRow key={d} title={dimLabel(d)}
                    icon={<SlidersHorizontal size={14} className="text-blue-400" />}
                    summaryText={sel.length > 0 ? sel.join(', ') : 'Tümü'}
                    badgeCount={sel.length}
                    isOpen={!!openSections[`dim:${d}`]}
                    onToggle={() => toggleSection(`dim:${d}`)}
                  >
                    {dimOptions[d].length ? (
                      <PillMultiSelect options={dimOptions[d]} selectedValues={sel} onChange={(vals) => patchDim(d, vals)} />
                    ) : (
                      <p className="text-[11px] text-zinc-500 px-1">Bu alanın girildiği işlem yok.</p>
                    )}
                  </FilterAccordionRow>
                );
              })}

              {/* 12. PREMIUM / DISCOUNT */}
              <FilterAccordionRow title={definitionTitles.premiumDiscounts || "Confirmations"}
                icon={<Scale size={14} className="text-purple-400" />}
                summaryText={globalExtra.premiumDiscounts.length > 0 ? globalExtra.premiumDiscounts.join(', ') : 'Tümü'}
                badgeCount={globalExtra.premiumDiscounts.length}
                isOpen={!!openSections.pd}
                onToggle={() => toggleSection('pd')}
              >
                <PillMultiSelect
                  options={extraOptions.premiumDiscounts}
                  selectedValues={globalExtra.premiumDiscounts}
                  onChange={(vals) => patchExtra({ premiumDiscounts: vals })}
                />
              </FilterAccordionRow>

              {/* 13. TP TARGET */}
              <FilterAccordionRow title={definitionTitles.tpTargets || "Target"}
                icon={<Crosshair size={14} className="text-emerald-400" />}
                summaryText={globalExtra.tpTargets.length > 0 ? globalExtra.tpTargets.join(', ') : 'Tümü'}
                badgeCount={globalExtra.tpTargets.length}
                isOpen={!!openSections.tpTarget}
                onToggle={() => toggleSection('tpTarget')}
              >
                <PillMultiSelect
                  options={extraOptions.tpTargets}
                  selectedValues={globalExtra.tpTargets}
                  onChange={(vals) => patchExtra({ tpTargets: vals })}
                />
              </FilterAccordionRow>

              {/* 14. ASIA RANGE FVG */}
              <FilterAccordionRow title={definitionTitles.asiaRangeFvgs || "Asia Range FVG"}
                icon={<Layers size={14} className="text-amber-400" />}
                summaryText={globalExtra.asiaRangeFvgs.length > 0 ? globalExtra.asiaRangeFvgs.join(', ') : 'Tümü'}
                badgeCount={globalExtra.asiaRangeFvgs.length}
                isOpen={!!openSections.asiaFvg}
                onToggle={() => toggleSection('asiaFvg')}
              >
                <PillMultiSelect
                  options={extraOptions.asiaRangeFvgs}
                  selectedValues={globalExtra.asiaRangeFvgs}
                  onChange={(vals) => patchExtra({ asiaRangeFvgs: vals })}
                />
              </FilterAccordionRow>

              {/* 15. NEWS DAY */}
              <FilterAccordionRow title={definitionTitles.newsDays || "News Day"}
                icon={<Newspaper size={14} className="text-rose-400" />}
                summaryText={newsSummary}
                badgeCount={globalExtra.newsDay !== 'ALL' ? 1 : 0}
                isOpen={!!openSections.newsDay}
                onToggle={() => toggleSection('newsDay')}
              >
                <FilterChipRow>
                  {([['ALL', 'Tümü'], ['YES', newsLabels.yes], ['NO', newsLabels.no]] as const).map(([v, label]) => (
                    <FilterChip key={v} check={v !== 'ALL'} tone={v === 'ALL' ? 'neutral' : 'brand'} active={globalExtra.newsDay === v} onClick={() => patchExtra({ newsDay: v })}>
                      {label}
                    </FilterChip>
                  ))}
                </FilterChipRow>
              </FilterAccordionRow>

              {/* 16. RİSK % */}
              <FilterAccordionRow title="İşlem Başı Risk"
                icon={<Percent size={14} className="text-blue-400" />}
                summaryText={globalExtra.riskPcts.length > 0 ? globalExtra.riskPcts.map(riskLabel).join(', ') : 'Tümü'}
                badgeCount={globalExtra.riskPcts.length}
                isOpen={!!openSections.riskPct}
                onToggle={() => toggleSection('riskPct')}
              >
                {extraOptions.riskPcts.length > 0 ? (
                  <PillMultiSelect
                    options={extraOptions.riskPcts.map(riskLabel)}
                    selectedValues={globalExtra.riskPcts.map(riskLabel)}
                    onChange={(vals) => patchExtra({ riskPcts: extraOptions.riskPcts.filter((n) => vals.includes(riskLabel(n))) })}
                  />
                ) : (
                  <p className="text-[11px] text-zinc-500 p-1">Risk yüzdesi girilmiş işlem yok. Prop hesabına bağlı işlemlerde risk % formda kaydedilir.</p>
                )}
              </FilterAccordionRow>

              {/* 17. HIZLI KAYIT */}
              <FilterAccordionRow title="Hızlı Kayıt"
                icon={<PenLine size={14} className="text-amber-400" />}
                summaryText={globalExtra.onlyIncomplete ? 'Yalnızca tamamlanmamışlar' : `${extraOptions.incomplete} tamamlanmamış`}
                badgeCount={globalExtra.onlyIncomplete ? 1 : 0}
                isOpen={!!openSections.quickEntry}
                onToggle={() => toggleSection('quickEntry')}
              >
                <label className="flex items-center gap-2 p-1 text-[11px] font-bold text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-amber-500"
                    checked={globalExtra.onlyIncomplete}
                    onChange={(e) => patchExtra({ onlyIncomplete: e.target.checked })}
                  />
                  Yalnızca hızlı kayıtla girilip ayrıntısı tamamlanmamış işlemleri göster ({extraOptions.incomplete})
                </label>
              </FilterAccordionRow>

              {/* 18. İŞLEM SONUCU */}
              <FilterAccordionRow title="İşlem Sonucu" 
                icon={<Activity size={14} className="text-emerald-400" />}
                
                summaryText={globalSelectedStatuses.length > 0 ? globalSelectedStatuses.join(', ') : 'Tümü'}
                badgeCount={globalSelectedStatuses.length}
                isOpen={!!openSections.status}
                onToggle={() => toggleSection('status')}
              >
                <StatusMultiSelect
                  selectedValues={globalSelectedStatuses}
                  onChange={setGlobalSelectedStatuses}
                />
              </FilterAccordionRow>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-700/40 bg-zinc-900/60 flex items-center justify-between">
              <div className="text-[10px] text-zinc-400 font-sans hidden sm:block">
                {activeFilterCount > 0 ? (
                  <span className="text-blue-400 font-semibold">{activeFilterCount} kriter aktif</span>
                ) : (
                  <span>Filtre yok · tüm zamanlar gösteriliyor</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-sans font-bold uppercase tracking-wider transition-colors duration-200 ease-out cursor-pointer border border-zinc-700/60"
                  >
                    {smartUpper("Temizle")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-sans font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors duration-200 ease-out cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check size={13} />
                  Uygula
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});
