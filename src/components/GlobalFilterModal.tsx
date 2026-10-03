import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, RotateCcw, Check, Calendar, Layers, Monitor, Activity, ArrowUpRight, Coins, Flame, ChevronRight, Eye, EyeOff, ChevronDown, Clock, Sparkles, X, Target, Zap, TrendingUp } from 'lucide-react';
import { DEFAULT_PLAN_FIDELITIES, DEFAULT_ENTRY_MODELS, DEFAULT_TREND_TYPES, DEFAULT_DEFINITION_TITLES, caseInsensitiveEquals } from '../constants/constants';
import { DefinitionTitles } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface GlobalFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: any[];
  // Options
  platforms: string[];
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  concepts: string[];
  sessions: string[];
  assets: string[];
  planFidelities?: string[];
  entryModels?: string[];
  trendTypes?: string[];
  definitionTitles?: DefinitionTitles;
  // Selected
  globalSelectedConfirmations: string[];
  setGlobalSelectedConfirmations: (v: string[]) => void;
  globalSelectedConcepts: string[];
  setGlobalSelectedConcepts: (v: string[]) => void;
  globalSelectedPlanFidelity: string[];
  setGlobalSelectedPlanFidelity: (v: string[]) => void;
  globalSelectedPlatforms: string[];
  setGlobalSelectedPlatforms: (v: string[]) => void;
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
}


const PillMultiSelect = ({ 
  options, 
  selectedValues, 
  onChange,
  activeColor = "blue"
}: { 
  options: string[], 
  selectedValues: string[], 
  onChange: (v: string[]) => void,
  activeColor?: "blue" | "emerald" | "rose" | "amber" | "purple"
}) => {
  const isAllSelected = selectedValues.length === 0;

  const toggleOption = (option: string) => {
    if (selectedValues.some(v => caseInsensitiveEquals(v, option))) {
      onChange(selectedValues.filter(v => !caseInsensitiveEquals(v, option)));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const activeStyle = {
    blue: "bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold shadow-sm",
    emerald: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm",
    rose: "bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm",
    amber: "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm",
    purple: "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold shadow-sm",
  }[activeColor];

  return (
    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto custom-scrollbar p-1">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-[10px] font-sans uppercase font-bold tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
          isAllSelected 
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' 
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        Tümü ({options.length})
      </button>
      {options.map(option => {
        const isSelected = selectedValues.some(v => caseInsensitiveEquals(v, option));
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-[10px] font-sans uppercase font-bold tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
              isSelected 
                ? activeStyle 
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {isSelected && <Check size={10} className="shrink-0" />}
            {option}
          </button>
        );
      })}
    </div>
  );
};

const StatusMultiSelect = ({
  selectedValues,
  onChange
}: {
  selectedValues: string[],
  onChange: (v: string[]) => void
}) => {
  const isAll = selectedValues.length === 0;

  const toggle = (val: string) => {
    if (selectedValues.some(v => caseInsensitiveEquals(v, val))) {
      onChange(selectedValues.filter(v => !caseInsensitiveEquals(v, val)));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
          isAll 
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' 
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        Tümü
      </button>
      <button
        type="button"
        onClick={() => toggle("WIN")}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
          selectedValues.includes("WIN")
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400'
        }`}
      >
        {selectedValues.includes("WIN") && <Check size={10} />}
        WIN
      </button>
      <button
        type="button"
        onClick={() => toggle("LOSS")}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
          selectedValues.includes("LOSS")
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400'
        }`}
      >
        {selectedValues.includes("LOSS") && <Check size={10} />}
        LOSS
      </button>
      <button
        type="button"
        onClick={() => toggle("BREAKEVEN")}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
          selectedValues.includes("BREAKEVEN")
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400'
        }`}
      >
        {selectedValues.includes("BREAKEVEN") && <Check size={10} />}
        BREAKEVEN
      </button>
    </div>
  );
};

const TypeMultiSelect = ({
  selectedValues,
  onChange
}: {
  selectedValues: string[],
  onChange: (v: string[]) => void
}) => {
  const isAll = selectedValues.length === 0;

  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
          isAll 
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' 
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        Tümü
      </button>
      <button
        type="button"
        onClick={() => toggle("LONG")}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
          selectedValues.includes("LONG")
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400'
        }`}
      >
        {selectedValues.includes("LONG") && <Check size={10} />}
        LONG
      </button>
      <button
        type="button"
        onClick={() => toggle("SHORT")}
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
          selectedValues.includes("SHORT")
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400'
        }`}
      >
        {selectedValues.includes("SHORT") && <Check size={10} />}
        SHORT
      </button>
    </div>
  );
};

interface FilterAccordionRowProps {
  icon: React.ReactNode;
  title: string;
  summaryText: string;
  badgeCount?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FilterAccordionRow: React.FC<FilterAccordionRowProps> = ({
  icon,
  title,
  summaryText,
  badgeCount = 0,
  isOpen,
  onToggle,
  children
}) => {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors duration-200 ease-out text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0">{icon}</div>
          <span className="text-xs font-bold font-sans text-zinc-200 uppercase tracking-wider shrink-0">
            {title}
          </span>
          <span className="text-xs font-sans text-zinc-400 truncate hidden sm:inline-block uppercase">
            — {summaryText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {badgeCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {badgeCount} seçili
            </span>
          ) : (
            <span className="text-[10px] font-sans text-zinc-400 hidden xs:inline">Tümü</span>
          )}
          <div className="text-zinc-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      <div 
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out will-change-[grid-template-rows,opacity] ${
          isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-zinc-800' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden bg-zinc-900">
          <div className="p-2.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GlobalFilterModal: React.FC<GlobalFilterModalProps> = React.memo(({
  isOpen,
  onClose,
  trades = [],
  platforms,
  timeframes,
  htfTimeframes,
  confirmations,
  concepts,
  sessions,
  assets,
  planFidelities = DEFAULT_PLAN_FIDELITIES,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  globalSelectedConfirmations, setGlobalSelectedConfirmations,
  globalSelectedConcepts, setGlobalSelectedConcepts,
  globalSelectedPlanFidelity, setGlobalSelectedPlanFidelity,
  globalSelectedPlatforms, setGlobalSelectedPlatforms,
  globalSelectedAssets, setGlobalSelectedAssets,
  globalSelectedSessions, setGlobalSelectedSessions,
  globalSelectedTimeframes, setGlobalSelectedTimeframes,
  globalSelectedHtfTimeframes, setGlobalSelectedHtfTimeframes,
  globalSelectedStatuses, setGlobalSelectedStatuses,
  globalSelectedTypes, setGlobalSelectedTypes,
  globalSelectedEntryModels = [], setGlobalSelectedEntryModels,
  globalSelectedTrendTypes = [], setGlobalSelectedTrendTypes,
  globalDateLimit, setGlobalDateLimit
}) => {
  useBodyScrollLock(isOpen);

  // Dynamic extraction of unique options from both definitions and actual trade data
  const dynamicPlatforms = React.useMemo(() => {
    const set = new Set(platforms || []);
    trades.forEach(t => { if (t.platform) set.add(t.platform); });
    return Array.from(set);
  }, [platforms, trades]);

  const dynamicAssets = React.useMemo(() => {
    const set = new Set(assets || []);
    trades.forEach(t => { if (t.asset) set.add(t.asset); });
    return Array.from(set);
  }, [assets, trades]);

  const dynamicConcepts = React.useMemo(() => {
    const set = new Set(concepts || []);
    trades.forEach(t => { if (t.concept) set.add(t.concept); });
    return Array.from(set);
  }, [concepts, trades]);

  const dynamicConfirmations = React.useMemo(() => {
    const set = new Set(confirmations || []);
    trades.forEach(t => {
      if (t.confirmations && Array.isArray(t.confirmations)) {
        t.confirmations.forEach(c => set.add(c));
      }
    });
    return Array.from(set);
  }, [confirmations, trades]);

  const dynamicSessions = React.useMemo(() => {
    const set = new Set(sessions || []);
    trades.forEach(t => { if (t.session) set.add(t.session); });
    return Array.from(set);
  }, [sessions, trades]);

  const dynamicTimeframes = React.useMemo(() => {
    const set = new Set(timeframes || []);
    trades.forEach(t => { if (t.timeframe) set.add(t.timeframe); });
    return Array.from(set);
  }, [timeframes, trades]);

  const dynamicHtfTimeframes = React.useMemo(() => {
    const set = new Set(htfTimeframes || []);
    trades.forEach(t => { if (t.htfTimeframe) set.add(t.htfTimeframe); });
    return Array.from(set);
  }, [htfTimeframes, trades]);

  const dynamicPlanFidelities = React.useMemo(() => {
    const set = new Set(planFidelities || []);
    trades.forEach(t => { if (t.planFidelity) set.add(t.planFidelity); });
    return Array.from(set);
  }, [planFidelities, trades]);

  const dynamicEntryModels = React.useMemo(() => {
    const set = new Set(entryModels || []);
    trades.forEach(t => {
      if (t.entryModels && Array.isArray(t.entryModels)) {
        t.entryModels.forEach(em => set.add(em));
      } else if (t.entry) {
        t.entry.split(',').forEach(em => set.add(em.trim()));
      }
    });
    return Array.from(set);
  }, [entryModels, trades]);

  const dynamicTrendTypes = React.useMemo(() => {
    const set = new Set(trendTypes || []);
    trades.forEach(t => { if (t.trend) set.add(t.trend); });
    return Array.from(set);
  }, [trendTypes, trades]);

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
      concept: true,
      planFidelity: true,
      confirmation: true,
      platform: true,
      date: true,
      status: true,
      type: true,
      asset: true,
      entryTf: true,
      htfTf: true,
      session: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const handleReset = () => {
    setGlobalSelectedConfirmations([]);
    setGlobalSelectedConcepts([]);
    setGlobalSelectedPlanFidelity([]);
    setGlobalSelectedPlatforms([]);
    setGlobalSelectedAssets([]);
    setGlobalSelectedSessions([]);
    setGlobalSelectedTimeframes([]);
    setGlobalSelectedHtfTimeframes([]);
    setGlobalSelectedStatuses([]);
    setGlobalSelectedTypes([]);
    setGlobalSelectedEntryModels?.([]);
    setGlobalSelectedTrendTypes?.([]);
    setGlobalDateLimit("6m");
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
    globalSelectedConcepts.length + 
    globalSelectedPlanFidelity.length +
    globalSelectedPlatforms.length +
    globalSelectedAssets.length + 
    globalSelectedSessions.length + 
    globalSelectedTimeframes.length + 
    globalSelectedHtfTimeframes.length + 
    globalSelectedStatuses.length + 
    globalSelectedTypes.length + 
    (globalSelectedEntryModels?.length || 0) + 
    (globalSelectedTrendTypes?.length || 0) + 
    (globalDateLimit !== "6m" ? 1 : 0);

  const dateOptions = [
    { value: '1w', label: '1 Hafta' },
    { value: '1m', label: '1 Ay' },
    { value: '3m', label: '3 Ay' },
    { value: '6m', label: '6 Ay (Varsayılan)' },
    { value: '1y', label: '1 Yıl' },
    { value: 'all', label: 'Tüm Zamanlar' }
  ];

  const getDateLabel = (val: string) => {
    const found = dateOptions.find(d => d.value === val);
    return found ? found.label : '6 Ay';
  };

  const isAnyOpen = Object.values(openSections).some(Boolean);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="global-filter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="will-change-[opacity] fixed inset-0 bg-zinc-950/80 z-[1500] flex justify-center items-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="global-filter-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
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
              <button
                type="button"
                onClick={handleReset}
                className="btn-icon"
              >
                <RotateCcw size={16} />
              </button>
              <button
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
                badgeCount={globalDateLimit !== '6m' ? 1 : 0}
                isOpen={!!openSections.date}
                onToggle={() => toggleSection('date')}
              >
                <div className="flex flex-wrap gap-1 p-1">
                  {dateOptions.map(option => {
                    const isSelected = globalDateLimit === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGlobalDateLimit(option.value)}
                        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </FilterAccordionRow>

              {/* 1.5 PLATFORM */}
              <FilterAccordionRow title={definitionTitles.platforms || "PLATFORM"} 
                icon={<Monitor size={14} className="text-blue-400" />}
                summaryText={globalSelectedPlatforms.length > 0 ? globalSelectedPlatforms.join(', ') : 'Tümü'}
                badgeCount={globalSelectedPlatforms.length}
                isOpen={!!openSections.platform}
                onToggle={() => toggleSection('platform')}
              >
                <PillMultiSelect
                  options={dynamicPlatforms}
                  selectedValues={globalSelectedPlatforms}
                  onChange={setGlobalSelectedPlatforms}
                  activeColor="blue"
                />
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
                  activeColor="amber"
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
                  activeColor="amber"
                />
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
                  activeColor="blue"
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
                  activeColor="blue"
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
                    const lower = item.toLowerCase();
                    let activeClasses = 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold';
                    if (lower === 'tam' || lower.includes('uygun') || lower.includes('sadık') || lower.includes('disciplined') || lower.includes('a+') || lower.includes('yüksek') || lower.includes('kusursuz')) {
                      activeClasses = 'toggle-item-win font-bold';
                    } else if (lower === 'kısmen' || lower.includes('partial') || lower.includes('orta') || lower === 'b') {
                      activeClasses = 'toggle-item-breakeven font-bold';
                    } else if (lower === 'fomo' || lower.includes('ihlal') || lower.includes('disiplinsiz') || lower.includes('intikam') || lower.includes('düşük') || lower === 'c') {
                      activeClasses = 'toggle-item-loss font-bold';
                    }

                    return (
                      <button
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

              <FilterAccordionRow title={definitionTitles.concepts || "Konsept"} 
                icon={<Layers size={14} className="text-blue-400" />}
                
                summaryText={globalSelectedConcepts.length > 0 ? globalSelectedConcepts.join(', ') : 'Tümü'}
                badgeCount={globalSelectedConcepts.length}
                isOpen={!!openSections.concept}
                onToggle={() => toggleSection('concept')}
              >
                <PillMultiSelect
                  options={dynamicConcepts}
                  selectedValues={globalSelectedConcepts}
                  onChange={setGlobalSelectedConcepts}
                  activeColor="blue"
                />
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
                  activeColor="purple"
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
                  activeColor="purple"
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
                  activeColor="amber"
                />
              </FilterAccordionRow>

              {/* 11. İŞLEM SONUCU */}
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
                  <span>Tüm veriler gösteriliyor (6 Ay varsayılan)</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-sans font-bold uppercase tracking-wider transition-colors duration-200 ease-out cursor-pointer border border-zinc-700/60"
                  >
                    Temizle
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
