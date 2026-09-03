import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, RotateCcw, Check, Calendar, Layers, Monitor, Activity, ArrowUpRight, Coins, Flame, ChevronRight, Eye, EyeOff, ChevronDown, Clock, Sparkles, X } from 'lucide-react';

interface GlobalFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Options
  platforms: string[];
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  concepts: string[];
  sessions: string[];
  assets: string[];
  // Selected
  globalSelectedConfirmations: string[];
  setGlobalSelectedConfirmations: (v: string[]) => void;
  globalSelectedConcepts: string[];
  setGlobalSelectedConcepts: (v: string[]) => void;
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
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
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
        className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
          isAllSelected 
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' 
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
      >
        Tümü ({options.length})
      </button>
      {options.map(option => {
        const isSelected = selectedValues.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer flex items-center gap-1 ${
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
          <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wider shrink-0">
            {title}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 truncate hidden sm:inline-block">
            — {summaryText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {badgeCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {badgeCount} seçili
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-400 hidden xs:inline">Tümü</span>
          )}
          <div className="text-zinc-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-zinc-800 bg-zinc-900 p-2.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const GlobalFilterModal: React.FC<GlobalFilterModalProps> = ({
  isOpen,
  onClose,
  platforms,
  timeframes,
  htfTimeframes,
  confirmations,
  concepts,
  sessions,
  assets,
  globalSelectedConfirmations, setGlobalSelectedConfirmations,
  globalSelectedConcepts, setGlobalSelectedConcepts,
  globalSelectedPlatforms, setGlobalSelectedPlatforms,
  globalSelectedAssets, setGlobalSelectedAssets,
  globalSelectedSessions, setGlobalSelectedSessions,
  globalSelectedTimeframes, setGlobalSelectedTimeframes,
  globalSelectedHtfTimeframes, setGlobalSelectedHtfTimeframes,
  globalSelectedStatuses, setGlobalSelectedStatuses,
  globalSelectedTypes, setGlobalSelectedTypes,
  globalDateLimit, setGlobalDateLimit
}) => {
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
      concept: true,
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
    setGlobalSelectedPlatforms([]);
    setGlobalSelectedAssets([]);
    setGlobalSelectedSessions([]);
    setGlobalSelectedTimeframes([]);
    setGlobalSelectedHtfTimeframes([]);
    setGlobalSelectedStatuses([]);
    setGlobalSelectedTypes([]);
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
    globalSelectedPlatforms.length +
    globalSelectedAssets.length + 
    globalSelectedSessions.length + 
    globalSelectedTimeframes.length + 
    globalSelectedHtfTimeframes.length + 
    globalSelectedStatuses.length + 
    globalSelectedTypes.length + 
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ willChange: 'opacity' }}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-[1500] flex justify-center items-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: 'opacity' }}
            onClick={(e) => e.stopPropagation()}
            id="global-filter-popup"
            className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col relative shadow-2xl my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-700/40 bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Filter size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100 font-mono">
                      Filtre Menüsü
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {activeFilterCount > 0 ? `${activeFilterCount} Aktif` : "Tüm Veriler"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isAnyOpen ? collapseAll : expandAll}
                  className="px-3 py-2 sm:px-2 sm:py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold font-mono transition-colors duration-200 ease-out uppercase tracking-wider cursor-pointer border border-zinc-700/60 hidden sm:flex items-center gap-1"
                >
                  {isAnyOpen ? <EyeOff size={11} /> : <Eye size={11} />}
                  {isAnyOpen ? "Tümünü Kapat" : "Tümünü Aç"}
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold font-mono transition-colors duration-200 ease-out uppercase tracking-wider cursor-pointer border border-zinc-700/60"
                  >
                    <RotateCcw size={11} />
                    Sıfırla
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors duration-200 ease-out cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Body - Menu / Accordion list */}
            <div className="p-3 sm:p-4 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-2 bg-zinc-950/30">
              
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
                        className={`px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors duration-200 ease-out border cursor-pointer ${
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
              <FilterAccordionRow title="Platform" 
                icon={<Monitor size={14} className="text-blue-400" />}
                summaryText={globalSelectedPlatforms.length > 0 ? globalSelectedPlatforms.join(', ') : 'Tümü'}
                badgeCount={globalSelectedPlatforms.length}
                isOpen={!!openSections.platform}
                onToggle={() => toggleSection('platform')}
              >
                <PillMultiSelect
                  options={platforms}
                  selectedValues={globalSelectedPlatforms}
                  onChange={setGlobalSelectedPlatforms}
                  activeColor="blue"
                />
              </FilterAccordionRow>

              {/* 2. PARİTE (ASSET) */}
              <FilterAccordionRow title="Parite" 
                icon={<Coins size={14} className="text-yellow-400" />}
                
                summaryText={globalSelectedAssets.length > 0 ? globalSelectedAssets.join(', ') : 'Tümü'}
                badgeCount={globalSelectedAssets.length}
                isOpen={!!openSections.asset}
                onToggle={() => toggleSection('asset')}
              >
                <PillMultiSelect
                  options={assets}
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
              <FilterAccordionRow title="Session" 
                icon={<Flame size={14} className="text-orange-400" />}
                
                summaryText={globalSelectedSessions.length > 0 ? globalSelectedSessions.join(', ') : 'Tümü'}
                badgeCount={globalSelectedSessions.length}
                isOpen={!!openSections.session}
                onToggle={() => toggleSection('session')}
              >
                <PillMultiSelect
                  options={sessions}
                  selectedValues={globalSelectedSessions}
                  onChange={setGlobalSelectedSessions}
                  activeColor="amber"
                />
              </FilterAccordionRow>

              {/* 5. HTF */}
              <FilterAccordionRow title="HTF" 
                icon={<Clock size={14} className="text-blue-400" />}
                
                summaryText={globalSelectedHtfTimeframes.length > 0 ? globalSelectedHtfTimeframes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedHtfTimeframes.length}
                isOpen={!!openSections.htfTf}
                onToggle={() => toggleSection('htfTf')}
              >
                <PillMultiSelect
                  options={htfTimeframes}
                  selectedValues={globalSelectedHtfTimeframes}
                  onChange={setGlobalSelectedHtfTimeframes}
                  activeColor="blue"
                />
              </FilterAccordionRow>

              {/* 6. ETF */}
              <FilterAccordionRow title="ETF" 
                icon={<Clock size={14} className="text-cyan-400" />}
                
                summaryText={globalSelectedTimeframes.length > 0 ? globalSelectedTimeframes.join(', ') : 'Tümü'}
                badgeCount={globalSelectedTimeframes.length}
                isOpen={!!openSections.entryTf}
                onToggle={() => toggleSection('entryTf')}
              >
                <PillMultiSelect
                  options={timeframes}
                  selectedValues={globalSelectedTimeframes}
                  onChange={setGlobalSelectedTimeframes}
                  activeColor="blue"
                />
              </FilterAccordionRow>

              {/* 7. KONSEPT */}
              <FilterAccordionRow title="Konsept" 
                icon={<Layers size={14} className="text-blue-400" />}
                
                summaryText={globalSelectedConcepts.length > 0 ? globalSelectedConcepts.join(', ') : 'Tümü'}
                badgeCount={globalSelectedConcepts.length}
                isOpen={!!openSections.concept}
                onToggle={() => toggleSection('concept')}
              >
                <PillMultiSelect
                  options={concepts}
                  selectedValues={globalSelectedConcepts}
                  onChange={setGlobalSelectedConcepts}
                  activeColor="blue"
                />
              </FilterAccordionRow>

              {/* 8. ONAYLAR */}
              <FilterAccordionRow title="Onaylar" 
                icon={<Sparkles size={14} className="text-purple-400" />}
                
                summaryText={globalSelectedConfirmations.length > 0 ? globalSelectedConfirmations.join(', ') : 'Tümü'}
                badgeCount={globalSelectedConfirmations.length}
                isOpen={!!openSections.confirmation}
                onToggle={() => toggleSection('confirmation')}
              >
                <PillMultiSelect
                  options={confirmations}
                  selectedValues={globalSelectedConfirmations}
                  onChange={setGlobalSelectedConfirmations}
                  activeColor="purple"
                />
              </FilterAccordionRow>

              {/* 9. İŞLEM SONUCU */}
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
              <div className="text-[10px] text-zinc-400 font-mono hidden sm:block">
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
                    className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono font-bold uppercase tracking-wider transition-colors duration-200 ease-out cursor-pointer border border-zinc-700/60"
                  >
                    Temizle
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-mono font-black px-5 py-2 rounded-xl text-[11px] uppercase tracking-wider transition-colors duration-200 ease-out cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
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
};
