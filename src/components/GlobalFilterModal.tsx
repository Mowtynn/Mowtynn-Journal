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
  X,
  Target,
  TrendingUp,
  BookOpen,
  Scale,
  PenLine,
} from 'lucide-react';
import {
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_TREND_TYPES,
  DEFAULT_DEFINITION_TITLES,
} from '../constants/constants';
import { ASIA_RANGE_FORM_TYPES, DefinitionTitles } from '../types';
import { DEFAULT_DATE_LIMIT, EMPTY_EXTRA_FILTERS, countExtraFilters, FILTER_DIMENSIONS, type ExtraTradeFilters, type FilterDimension } from '../lib/tradeFilters';
import { dimensionValue, SETUP_DIMENSIONS, UNSPECIFIED } from '../lib/setupScorecard';
import { PREV_TRADE_BUCKETS, sweepBucketOrder } from '../lib/asiaAnalytics';
import { WEEKDAY_NAMES_TR } from '../lib/tradingTime';
import { tradeConfirmations } from '../lib/tradeModel';

/** Gün filtresi seçenekleri Pazartesi'den başlar */
const WEEKDAY_ORDER = [...WEEKDAY_NAMES_TR.slice(1), WEEKDAY_NAMES_TR[0]];
import { setupQualityTier } from '../lib/setupQuality';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { PillMultiSelect, StatusMultiSelect, TypeMultiSelect, FilterAccordionRow, FilterChip, FilterChipRow } from './filters/FilterControls';

interface GlobalFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: any[];
  // Options
  sessions: string[];
  assets: string[];
  planFidelities?: string[];
  trendTypes?: string[];
  definitionTitles?: DefinitionTitles;
  // Selected
  globalSelectedPlanFidelity: string[];
  setGlobalSelectedPlanFidelity: (v: string[]) => void;
  globalSelectedAssets: string[];
  setGlobalSelectedAssets: (v: string[]) => void;
  globalSelectedSessions: string[];
  setGlobalSelectedSessions: (v: string[]) => void;
  globalSelectedStatuses: string[];
  setGlobalSelectedStatuses: (v: string[]) => void;
  globalSelectedTypes: string[];
  setGlobalSelectedTypes: (v: string[]) => void;
  globalSelectedTrendTypes?: string[];
  setGlobalSelectedTrendTypes?: (v: string[]) => void;
  globalDateLimit: string;
  setGlobalDateLimit: (v: string) => void;
  // Sonradan eklenen alanlar
  premiumDiscounts?: string[];
  globalExtra?: ExtraTradeFilters;
  setGlobalExtra?: (v: ExtraTradeFilters) => void;
}


export const GlobalFilterModal: React.FC<GlobalFilterModalProps> = React.memo(({
  isOpen,
  onClose,
  trades = [],
  sessions,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  trendTypes = DEFAULT_TREND_TYPES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  globalSelectedPlanFidelity, setGlobalSelectedPlanFidelity,
  globalSelectedAssets, setGlobalSelectedAssets,
  globalSelectedSessions, setGlobalSelectedSessions,
  globalSelectedStatuses, setGlobalSelectedStatuses,
  globalSelectedTypes, setGlobalSelectedTypes,
  globalSelectedTrendTypes = [], setGlobalSelectedTrendTypes,
  globalDateLimit, setGlobalDateLimit,
  premiumDiscounts = [],
  globalExtra = EMPTY_EXTRA_FILTERS,
  setGlobalExtra,
}) => {
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


  const dynamicSessions = React.useMemo(() => {
    if (!ready) return sessions || [];
    const set = new Set(sessions || []);
    trades.forEach(t => { if (t.session) set.add(t.session); });
    return Array.from(set);
  }, [ready, sessions, trades]);

  const dynamicPlanFidelities = React.useMemo(() => {
    if (!ready) return planFidelities || [];
    const set = new Set(planFidelities || []);
    trades.forEach(t => { if (t.planFidelity) set.add(t.planFidelity); });
    return Array.from(set);
  }, [ready, planFidelities, trades]);

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
        trades.forEach((t) => {
          const v = dimensionValue(t, d);
          if (v !== UNSPECIFIED) set.add(v);
        });
      }
      const vals = [...set];
      if (d === 'sweepHour') vals.sort((a, b) => sweepBucketOrder(a) - sweepBucketOrder(b));
      else if (d === 'prevTrade') vals.sort(orderBy(PREV_TRADE_BUCKETS));
      else if (d === 'weekday') vals.sort(orderBy(WEEKDAY_ORDER));
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
    let incomplete = 0;
    if (ready) {
      trades.forEach((t) => {
        tradeConfirmations(t).forEach((x) => pd.add(x));
        if (t.quickEntry === true) incomplete++;
      });
    }
    return {
      // "Swept" formdan kaldırıldı: yalnızca eski kayıtlarda varsa seçenek olarak görünür
      asiaRanges: [...ASIA_RANGE_FORM_TYPES, ...(ready && trades.some((t) => t.asiaRange === 'Swept') ? ['Swept'] : [])] as string[],
      premiumDiscounts: Array.from(pd),
      incomplete,
    };
  }, [ready, trades, premiumDiscounts]);

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
      quickEntry: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const handleReset = () => {
    setGlobalSelectedPlanFidelity([]);
    setGlobalSelectedAssets([]);
    setGlobalSelectedSessions([]);
    setGlobalSelectedStatuses([]);
    setGlobalSelectedTypes([]);
    setGlobalSelectedTrendTypes?.([]);
    setGlobalDateLimit(DEFAULT_DATE_LIMIT);
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
    globalSelectedPlanFidelity.length +
    globalSelectedAssets.length + 
    globalSelectedSessions.length + 
    globalSelectedStatuses.length + 
    globalSelectedTypes.length + 
    (globalSelectedTrendTypes?.length || 0) + 
    (globalDateLimit !== DEFAULT_DATE_LIMIT ? 1 : 0) +
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
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-2xl lg:max-w-4xl h-[680px] lg:h-auto max-h-[88vh] min-h-[480px] lg:min-h-0 overflow-hidden flex flex-col relative shadow-2xl my-auto"
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
              <button aria-label="Sıfırla"
                type="button"
                onClick={handleReset}
                className="btn-icon"
              >
                <RotateCcw size={16} />
              </button>
              <button aria-label="Kapat"
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


            {/* Filtre listesi: masaüstünde iki sütun (pencere kaydırmasız sığar), telefonda tek sütun */}
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30 min-h-0 [&>*]:mb-2 lg:columns-2 lg:gap-2 [&>*]:break-inside-avoid">
              
              {/* 1. ZAMAN ARALIĞI */}
              <FilterAccordionRow title="Zaman Aralığı" 
                icon={<Calendar size={14} className="text-blue-400" />}
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
                icon={<Coins size={14} className="text-blue-400" />}
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
                icon={<ArrowUpRight size={14} className="text-blue-400" />}
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
                icon={<Flame size={14} className="text-blue-400" />}
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

              {/* 7. SETUP KALİTESİ */}
              <FilterAccordionRow title={definitionTitles.planFidelities || "SETUP KALİTESİ"} 
                icon={<Target size={14} className="text-blue-400" />}
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
                        className={`flex-1 min-w-0 text-label py-1.5 font-bold uppercase transition-colors duration-200 rounded-lg border text-center truncate cursor-pointer ${
                          isSelected ? activeClasses : 'border-transparent toggle-item-inactive'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </FilterAccordionRow>

              {/* 9. İŞLEM TİPİ */}
              <FilterAccordionRow title={definitionTitles.trendTypes || "İşlem Tipi"} 
                icon={<TrendingUp size={14} className="text-blue-400" />}
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

              {/* 11. ASIA RANGE (Range / Trend / Swept) */}
              <FilterAccordionRow title={definitionTitles.asiaRange || "Asia Range"}
                icon={<BookOpen size={14} className="text-blue-400" />}
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

              {/* Türetilmiş girdiler: POI Sweep Saati, Günün İşlemi, Gün İçi Önceki İşlem, Gün */}
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
                      <p className="text-label text-zinc-500 px-1">Bu alanın girildiği işlem yok.</p>
                    )}
                  </FilterAccordionRow>
                );
              })}

              {/* 12. PREMIUM / DISCOUNT */}
              <FilterAccordionRow title={definitionTitles.premiumDiscounts || "Confirmations"}
                icon={<Scale size={14} className="text-blue-400" />}
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

              {/* 17. HIZLI KAYIT */}
              <FilterAccordionRow title="Hızlı Kayıt"
                icon={<PenLine size={14} className="text-blue-400" />}
                summaryText={globalExtra.onlyIncomplete ? 'Yalnızca tamamlanmamışlar' : `${extraOptions.incomplete} tamamlanmamış`}
                badgeCount={globalExtra.onlyIncomplete ? 1 : 0}
                isOpen={!!openSections.quickEntry}
                onToggle={() => toggleSection('quickEntry')}
              >
                <label className="flex items-center gap-2 p-1 text-label font-bold text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-blue-500"
                    checked={globalExtra.onlyIncomplete}
                    onChange={(e) => patchExtra({ onlyIncomplete: e.target.checked })}
                  />
                  Yalnızca hızlı kayıtla girilip ayrıntısı tamamlanmamış işlemleri göster ({extraOptions.incomplete})
                </label>
              </FilterAccordionRow>

              {/* 18. İŞLEM SONUCU */}
              <FilterAccordionRow title="İşlem Sonucu" 
                icon={<Activity size={14} className="text-blue-400" />}
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
              <div className="text-label text-zinc-400 font-sans hidden sm:block">
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
