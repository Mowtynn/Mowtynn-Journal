import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  SlidersHorizontal, X, Monitor, LineChart, Clock, ArrowUpRight, 
  Lightbulb, Target, Sun, Plus, Search, Edit2, Check, Trash2, 
  GripVertical, RotateCcw, Download, Upload, AlertCircle,
  Crosshair, Zap, TrendingUp, Trophy, Shield
} from 'lucide-react';
import { Trade, DefinitionTitles, PlatformCategory } from '../types';
import { 
  DEFAULT_PLATFORMS, DEFAULT_TIMEFRAMES, DEFAULT_HTF_TIMEFRAMES, 
  DEFAULT_CONFIRMATIONS, DEFAULT_LIQUIDITY_SWEEPS, DEFAULT_SESSIONS, DEFAULT_ASSETS,
  DEFAULT_PLAN_FIDELITIES, DEFAULT_ENTRY_MODELS, DEFAULT_TREND_TYPES, DEFAULT_DEFINITION_TITLES,
  caseInsensitiveMatch, caseInsensitiveEquals, savePlatformCategory, getTradeAccountCategory
} from '../constants/constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface DefinitionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: Trade[];
  onDeleteTradesByPlatform?: (platformName: string) => void;
  platforms: string[];
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  concepts: string[];
  sessions: string[];
  assets: string[];
  planFidelities: string[];
  entryModels?: string[];
  trendTypes?: string[];
  definitionTitles?: DefinitionTitles;
  persistPlatforms: (list: string[]) => void;
  persistTimeframes: (list: string[]) => void;
  persistHtfTimeframes: (list: string[]) => void;
  persistConfirmations: (list: string[]) => void;
  persistConcepts: (list: string[]) => void;
  persistSessions: (list: string[]) => void;
  persistAssets: (list: string[]) => void;
  persistPlanFidelities: (list: string[]) => void;
  persistEntryModels?: (list: string[]) => void;
  persistTrendTypes?: (list: string[]) => void;
  persistDefinitionTitles?: (updated: DefinitionTitles) => void;
}

type TabType = 'platforms' | 'assets' | 'timeframes' | 'htfTimeframes' | 'confirmations' | 'concepts' | 'sessions' | 'planFidelities' | 'trendTypes' | 'entryModels';

export const DefinitionsManagerModal: React.FC<DefinitionsManagerModalProps> = ({
  isOpen,
  onClose,
  trades = [],
  onDeleteTradesByPlatform,
  platforms,
  timeframes,
  htfTimeframes,
  confirmations,
  concepts,
  sessions,
  assets,
  planFidelities,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  persistPlatforms,
  persistTimeframes,
  persistHtfTimeframes,
  persistConfirmations,
  persistConcepts,
  persistSessions,
  persistAssets,
  persistPlanFidelities,
  persistEntryModels = () => {},
  persistTrendTypes = () => {},
  persistDefinitionTitles,
}) => {
  useBodyScrollLock(isOpen);
  const [activeTab, setActiveTab] = useState<TabType>('platforms');
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newPlatformCategory, setNewPlatformCategory] = useState<PlatformCategory>('FUNDED');
  const [, setCategoryVersion] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ item: string; count: number } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState('');

  // Compute trade usage counts per active category
  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!isOpen || !trades || trades.length === 0) return counts;

    trades.forEach(t => {
      if (t.platform) counts[`platforms:${t.platform}`] = (counts[`platforms:${t.platform}`] || 0) + 1;
      if (t.asset) counts[`assets:${t.asset}`] = (counts[`assets:${t.asset}`] || 0) + 1;
      if (t.timeframe) counts[`timeframes:${t.timeframe}`] = (counts[`timeframes:${t.timeframe}`] || 0) + 1;
      if (t.htfTimeframe) counts[`htfTimeframes:${t.htfTimeframe}`] = (counts[`htfTimeframes:${t.htfTimeframe}`] || 0) + 1;
      const sweepsList = Array.isArray(t.liquiditySweeps)
        ? t.liquiditySweeps
        : (t.liquiditySweep || t.concept)
        ? (t.liquiditySweep || t.concept)!.split(',').map(s => s.trim())
        : [];
      sweepsList.forEach(swp => {
        if (swp) {
          counts[`concepts:${swp}`] = (counts[`concepts:${swp}`] || 0) + 1;
          counts[`liquiditySweeps:${swp}`] = (counts[`liquiditySweeps:${swp}`] || 0) + 1;
        }
      });
      if (t.session) counts[`sessions:${t.session}`] = (counts[`sessions:${t.session}`] || 0) + 1;
      if (t.planFidelity) counts[`planFidelities:${t.planFidelity}`] = (counts[`planFidelities:${t.planFidelity}`] || 0) + 1;
      if (t.entryModels && Array.isArray(t.entryModels)) {
        t.entryModels.forEach(em => {
          counts[`entryModels:${em}`] = (counts[`entryModels:${em}`] || 0) + 1;
        });
      } else if (t.entry) {
        t.entry.split(',').map(s => s.trim()).forEach(em => {
          if (em) counts[`entryModels:${em}`] = (counts[`entryModels:${em}`] || 0) + 1;
        });
      }
      if (t.trend) counts[`trendTypes:${t.trend}`] = (counts[`trendTypes:${t.trend}`] || 0) + 1;
      if (t.confirmations && Array.isArray(t.confirmations)) {
        t.confirmations.forEach(c => {
          counts[`confirmations:${c}`] = (counts[`confirmations:${c}`] || 0) + 1;
        });
      }
    });
    return counts;
  }, [trades]);

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; list: string[]; persist: (list: string[]) => void; defaultList: string[] }[] = [
    { id: 'platforms', label: definitionTitles.platforms || DEFAULT_DEFINITION_TITLES.platforms, icon: Monitor, list: platforms, persist: persistPlatforms, defaultList: DEFAULT_PLATFORMS },
    { id: 'assets', label: definitionTitles.assets || DEFAULT_DEFINITION_TITLES.assets, icon: LineChart, list: assets, persist: persistAssets, defaultList: DEFAULT_ASSETS },
    { id: 'trendTypes', label: definitionTitles.trendTypes || DEFAULT_DEFINITION_TITLES.trendTypes || "Trend Yapısı", icon: TrendingUp, list: trendTypes, persist: persistTrendTypes, defaultList: DEFAULT_TREND_TYPES },
    { id: 'entryModels', label: definitionTitles.entryModels || DEFAULT_DEFINITION_TITLES.entryModels || "Entry Model", icon: Zap, list: entryModels, persist: persistEntryModels, defaultList: DEFAULT_ENTRY_MODELS },
    { id: 'timeframes', label: definitionTitles.timeframes || DEFAULT_DEFINITION_TITLES.timeframes, icon: Clock, list: timeframes, persist: persistTimeframes, defaultList: DEFAULT_TIMEFRAMES },
    { id: 'htfTimeframes', label: definitionTitles.htfTimeframes || DEFAULT_DEFINITION_TITLES.htfTimeframes, icon: ArrowUpRight, list: htfTimeframes, persist: persistHtfTimeframes, defaultList: DEFAULT_HTF_TIMEFRAMES },
    { id: 'confirmations', label: definitionTitles.confirmations || DEFAULT_DEFINITION_TITLES.confirmations, icon: Lightbulb, list: confirmations, persist: persistConfirmations, defaultList: DEFAULT_CONFIRMATIONS },
    { id: 'concepts', label: definitionTitles.liquiditySweeps || definitionTitles.concepts || DEFAULT_DEFINITION_TITLES.liquiditySweeps || "Liquidity Sweep", icon: Target, list: concepts, persist: persistConcepts, defaultList: DEFAULT_LIQUIDITY_SWEEPS },
    { id: 'sessions', label: definitionTitles.sessions || DEFAULT_DEFINITION_TITLES.sessions, icon: Sun, list: sessions, persist: persistSessions, defaultList: DEFAULT_SESSIONS },
    { id: 'planFidelities', label: definitionTitles.planFidelities || DEFAULT_DEFINITION_TITLES.planFidelities, icon: Crosshair, list: planFidelities, persist: persistPlanFidelities, defaultList: DEFAULT_PLAN_FIDELITIES },
  ];

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];
  const activeList = currentTabObj.list;
  const currentPersist = currentTabObj.persist;

  const handleSaveCategoryTitle = () => {
    const trimmed = customTitleInput.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }
    if (persistDefinitionTitles) {
      const updatedTitles: DefinitionTitles = {
        ...DEFAULT_DEFINITION_TITLES,
        ...(definitionTitles || {}),
        [activeTab]: trimmed,
      };
      persistDefinitionTitles(updatedTitles);
      toast.success(`"${trimmed}" başlığı güncellendi ve tüm projeye uygulandı.`);
    }
    setIsEditingTitle(false);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    return activeList.filter(item => caseInsensitiveMatch(item, searchQuery));
  }, [activeList, searchQuery]);

  const handleAddItem = () => {
    const val = newItemText.trim();
    if (!val) return;
    if (activeList.some(i => caseInsensitiveEquals(i, val))) {
      toast.error(`"${val.toUpperCase()}" zaten listede mevcut!`);
      return;
    }
    if (activeTab === 'platforms') {
      savePlatformCategory(val, newPlatformCategory);
    }
    currentPersist([...activeList, val]);
    setNewItemText('');
    const singularLabel = currentTabObj.label.endsWith('lar') || currentTabObj.label.endsWith('ler')
      ? currentTabObj.label.slice(0, -3)
      : currentTabObj.label;
    const catSuffix = activeTab === 'platforms' ? ` (${newPlatformCategory})` : '';
    toast.success(`Yeni ${singularLabel} eklendi: ${val.toUpperCase()}${catSuffix}`);
  };

  const handleSaveEdit = (originalIndex: number) => {
    const val = editingText.trim();
    if (!val) {
      setEditingIndex(null);
      return;
    }
    const updated = [...activeList];
    updated[originalIndex] = val;
    currentPersist(updated);
    setEditingIndex(null);
    setEditingText('');
    toast.success('Tanım başarıyla güncellendi.');
  };

  const handleDeleteItem = (itemToDelete: string) => {
    const usageKey = `${activeTab}:${itemToDelete}`;
    const count = usageCounts[usageKey] || 0;
    setDeleteConfirmItem({ item: itemToDelete, count });
  };

  const handleResetDefaults = () => {
    currentPersist(currentTabObj.defaultList);
    if (persistDefinitionTitles) {
      const updatedTitles: DefinitionTitles = {
        ...DEFAULT_DEFINITION_TITLES,
        ...(definitionTitles || {}),
        [activeTab]: DEFAULT_DEFINITION_TITLES[activeTab],
      };
      persistDefinitionTitles(updatedTitles);
    }
    setShowResetConfirm(false);
    toast.success(`${currentTabObj.label} ve başlığı varsayılan değerlere sıfırlandı.`);
  };

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (searchQuery.trim()) return; // Disable drag during search
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (searchQuery.trim()) return;
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    const newList = [...activeList];
    const itemToMove = newList[draggedItemIndex];
    newList.splice(draggedItemIndex, 1);
    newList.splice(targetIndex, 0, itemToMove);
    
    currentPersist(newList);
    setDraggedItemIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // Export all definitions as JSON
  const handleExportJSON = () => {
    const data = {
      definitionTitles: definitionTitles || DEFAULT_DEFINITION_TITLES,
      platforms,
      timeframes,
      htfTimeframes,
      confirmations,
      concepts,
      sessions,
      assets,
      planFidelities,
      entryModels,
      trendTypes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trading_Journal_Definitions_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tüm tanımlamalar ve başlıklar JSON olarak indirildi.');
  };

  // Import JSON definitions
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.definitionTitles && persistDefinitionTitles) {
          persistDefinitionTitles({ ...DEFAULT_DEFINITION_TITLES, ...data.definitionTitles });
        }
        if (data.platforms) persistPlatforms(data.platforms);
        if (data.timeframes) persistTimeframes(data.timeframes);
        if (data.htfTimeframes) persistHtfTimeframes(data.htfTimeframes);
        if (data.confirmations) persistConfirmations(data.confirmations);
        if (data.concepts) persistConcepts(data.concepts);
        if (data.sessions) persistSessions(data.sessions);
        if (data.assets) persistAssets(data.assets);
        if (data.planFidelities) persistPlanFidelities(data.planFidelities);
        if (data.entryModels) persistEntryModels(data.entryModels);
        if (data.trendTypes) persistTrendTypes(data.trendTypes);
        toast.success('Tanımlamalar ve başlıklar başarıyla içe aktarıldı.');
      } catch (err) {
        toast.error('Geçersiz JSON dosyası!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="definitions-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="will-change-[opacity] fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-5 bg-zinc-950/80  overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="definitions-modal-content"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="relative w-full max-w-4xl h-[620px] max-h-[90vh] min-h-[480px] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            
          {/* Header */}
          <div className="modal-header">
            <h2 className="heading-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                <SlidersHorizontal size={16} />
              </div>
              Tanımlamalar
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportJSON}
                className="btn-icon"
              >
                <Download size={16} />
              </button>
              <label
                className="btn-icon"
              >
                <Upload size={16} />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
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

            {/* Main Modal Layout */}
            <div className="p-4 sm:p-5 bg-zinc-950/30 flex flex-col md:flex-row gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden">
              
              {/* Sidebar Tabs */}
              <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto md:w-56 shrink-0 pb-2 md:pb-0 custom-scrollbar bg-zinc-900/90 border border-zinc-700/50 p-2 rounded-2xl shadow-xs md:self-stretch">
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-sans hidden md:block">
                  Kategoriler
                </div>

                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery('');
                        setNewItemText('');
                        setEditingIndex(null);
                      }}
                      className={`relative px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none shrink-0 text-left ${
                        isActive
                          ? 'text-blue-400 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeDefTabIndicator"
                          className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/30 shadow-xs"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <IconComp size={14} className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
                        <span>{tab.label}</span>
                      </span>

                      <span className={`relative z-10 text-[10px] font-sans px-2 py-0.5 rounded-md border ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700/60'
                      }`}>
                        {tab.list.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Panel */}
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/80 rounded-2xl border border-zinc-700/50 p-4 sm:p-5 shadow-inner">
                
                {/* Category Header & Title Rename Strip */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 mb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <currentTabObj.icon size={14} />
                    </div>
                    {isEditingTitle ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-md">
                        <input
                          type="text"
                          value={customTitleInput}
                          onChange={(e) => setCustomTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryTitle();
                            if (e.key === 'Escape') setIsEditingTitle(false);
                          }}
                          placeholder="Kategori başlığı yazın..."
                          className="flex-1 bg-zinc-900 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-zinc-100 font-bold font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveCategoryTitle}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Check size={12} /> Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTitle(false)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-sans cursor-pointer transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-zinc-100 font-sans tracking-wide truncate">
                          {currentTabObj.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTitleInput(currentTabObj.label);
                            setIsEditingTitle(true);
                          }}
                          className="px-2 py-0.5 text-zinc-400 hover:text-blue-300 bg-zinc-800/80 hover:bg-blue-500/10 border border-zinc-700/60 hover:border-blue-500/30 rounded-lg transition-all flex items-center gap-1 text-[11px] font-sans cursor-pointer"
                        >
                          <Edit2 size={10} className="text-blue-400" />
                          <span>Başlığı Değiştir</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="text-[10px] font-sans text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={11} /> Varsayılanlara Sıfırla
                    </button>
                  </div>
                </div>

                {/* Search & Add Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder={`${currentTabObj.label} ara...`}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-sans transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Add Input */}
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                    {activeTab === 'platforms' && (
                      <div className="flex items-center bg-zinc-900 border border-zinc-700/60 rounded-xl p-0.5 shadow-xs shrink-0 select-none">
                        <button
                          type="button"
                          onClick={() => setNewPlatformCategory('FUNDED')}
                          className={`px-2 sm:px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                            newPlatformCategory === 'FUNDED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                              : 'text-zinc-400 hover:text-emerald-400'
                          }`}
                        >
                          <Trophy size={11} />
                          <span>Funded</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlatformCategory('CHALLENGE')}
                          className={`px-2 sm:px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                            newPlatformCategory === 'CHALLENGE'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                              : 'text-zinc-400 hover:text-blue-400'
                          }`}
                        >
                          <Target size={11} />
                          <span>Challenge</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewPlatformCategory('DEMO')}
                          className={`px-2 sm:px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                            newPlatformCategory === 'DEMO'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                              : 'text-zinc-400 hover:text-amber-400'
                          }`}
                        >
                          <Shield size={11} />
                          <span>Demo</span>
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder={`Yeni ${currentTabObj.label} Ekle...`}
                      value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); }}
                      className="flex-1 sm:w-44 bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-sans uppercase transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newItemText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-sans text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Header info strip */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3 px-1">
                  <span className="text-xs font-sans font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    Kayıtlı {currentTabObj.label} ({filteredList.length})
                  </span>
                </div>


                {/* Item List Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                  {filteredList.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-xs text-zinc-500 font-sans italic space-y-1">
                      <span>— Aranan kriterde tanım bulunamadı —</span>
                    </div>
                  ) : (
                    filteredList.map((item) => {
                      const originalIndex = activeList.indexOf(item);
                      const isEditing = editingIndex === originalIndex;
                      const usageKey = `${activeTab}:${item}`;
                      const count = usageCounts[usageKey] || 0;

                      return (
                        <div
                          key={item}
                          draggable={!searchQuery.trim() && !isEditing}
                          onDragStart={(e) => handleDragStart(e, originalIndex)}
                          onDragEnter={(e) => handleDragEnter(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-150 group ${
                            draggedItemIndex === originalIndex
                              ? 'bg-zinc-800/80 border-blue-500/50 opacity-50 scale-[0.98]'
                              : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700/80'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(originalIndex);
                                  if (e.key === 'Escape') setEditingIndex(null);
                                }}
                                autoFocus
                                className="flex-1 bg-zinc-900 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white font-sans uppercase focus:outline-none"
                              />
                              <button
                                onClick={() => handleSaveEdit(originalIndex)}
                                className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <GripVertical size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-grab" />
                                <span className="font-sans font-bold text-xs text-zinc-200 tracking-wide truncate uppercase">
                                  {item}
                                </span>
                                {activeTab === 'platforms' && (() => {
                                  const currentCat = getTradeAccountCategory({ platform: item });
                                  const nextCat: PlatformCategory = currentCat === 'FUNDED' ? 'CHALLENGE' : (currentCat === 'CHALLENGE' ? 'DEMO' : 'FUNDED');
                                  const badgeClass = currentCat === 'FUNDED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                    : currentCat === 'CHALLENGE'
                                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30';
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        savePlatformCategory(item, nextCat);
                                        setCategoryVersion(v => v + 1);
                                        toast.success(`"${item}" kategorisi ${nextCat} olarak güncellendi.`);
                                      }}
                                      title="Kategoriyi değiştirmek için tıklayın (FUNDED -> CHALLENGE -> DEMO)"
                                      className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 transition-transform active:scale-95 cursor-pointer flex items-center gap-1 border ${badgeClass}`}
                                    >
                                      {currentCat === 'FUNDED' && <Trophy size={10} />}
                                      {currentCat === 'CHALLENGE' && <Target size={10} />}
                                      {currentCat === 'DEMO' && <Shield size={10} />}
                                      <span>{currentCat}</span>
                                    </button>
                                  );
                                })()}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Usage Badge */}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-sans font-medium border ${
                                  count > 0 
                                    ? 'toggle-item-brand' 
                                    : 'bg-zinc-800/60 text-zinc-500 border-zinc-800'
                                }`}>
                                  {count > 0 ? `${count} İşlem` : 'Kullanılmıyor'}
                                </span>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIndex(originalIndex);
                                    setEditingText(item);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                >
                                  <Edit2 size={13} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
              {deleteConfirmItem && (
                <motion.div
                  key="delete-confirm-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="will-change-[opacity] absolute inset-0 z-[10000] bg-zinc-950/85 flex items-center justify-center p-4"
                  onClick={() => setDeleteConfirmItem(null)}
                >
                  <motion.div
                    key="delete-confirm-content"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{ willChange: "transform, opacity" }}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <Trash2 size={18} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xs font-bold font-sans tracking-wide text-zinc-100 uppercase">
                        {activeTab === 'platforms' && deleteConfirmItem.count > 0 ? 'Platformu ve İşlemleri Sil' : 'Tanımı Sil'}
                      </h4>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        <span className="font-sans font-bold text-zinc-200">"{deleteConfirmItem.item}"</span> {activeTab === 'platforms' ? 'platformunu' : 'tanımını'} silmek istediğinize emin misiniz?
                      </p>
                      {deleteConfirmItem.count > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-sans leading-relaxed text-left flex items-start gap-2">
                          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            Bu platforma ait <strong className="text-amber-200 underline">{deleteConfirmItem.count} adet işlem kaydı</strong> bulunmaktadır. Platformu silerken bu işlemleri de silmek istiyor musunuz?
                          </div>
                        </div>
                      )}
                    </div>

                    {activeTab === 'platforms' && deleteConfirmItem.count > 0 ? (
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activeList.filter(item => item !== deleteConfirmItem.item);
                            currentPersist(updated);
                            if (onDeleteTradesByPlatform) {
                              onDeleteTradesByPlatform(deleteConfirmItem.item);
                            }
                            toast.success(`"${deleteConfirmItem.item}" platformu ve ona ait ${deleteConfirmItem.count} işlem silindi.`);
                            setDeleteConfirmItem(null);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-sans text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <Trash2 size={13} className="text-rose-400" />
                          <span>Platformu ve {deleteConfirmItem.count} İşlemi Sil</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activeList.filter(item => item !== deleteConfirmItem.item);
                            currentPersist(updated);
                            toast.success(`"${deleteConfirmItem.item}" platform tanımı silindi (işlemler korundu).`);
                            setDeleteConfirmItem(null);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-sans text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <Shield size={13} className="text-amber-400" />
                          <span>Sadece Platformu Sil (İşlemleri Koru)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(null)}
                          className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-sans text-xs font-medium transition-colors cursor-pointer border border-zinc-800"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(null)}
                          className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-xs font-bold transition-colors cursor-pointer border border-zinc-700/60"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = activeList.filter(item => item !== deleteConfirmItem.item);
                            currentPersist(updated);
                            toast.success(`"${deleteConfirmItem.item}" silindi.`);
                            setDeleteConfirmItem(null);
                          }}
                          className="flex-1 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-sans text-xs font-bold transition-colors cursor-pointer"
                        >
                          Evet, Sil
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Reset Confirmation Modal Overlay */}
            <AnimatePresence>
              {showResetConfirm && (
                <motion.div
                  key="reset-confirm-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="will-change-[opacity] absolute inset-0 z-[10000] bg-zinc-950/85 flex items-center justify-center p-4"
                  onClick={() => setShowResetConfirm(false)}
                >
                  <motion.div
                    key="reset-confirm-content"
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    style={{ willChange: "transform, opacity" }}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <AlertCircle size={18} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xs font-bold font-sans tracking-wide text-zinc-100 uppercase">Varsayılanlara Sıfırla</h4>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        <span className="font-sans font-bold text-zinc-200">"{currentTabObj.label}"</span> kategorisindeki tüm özel tanımlar silinip varsayılan listeye dönecektir. Emin misiniz?
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-xs font-bold transition-colors cursor-pointer border border-zinc-700/60"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="flex-1 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-sans text-xs font-bold transition-colors cursor-pointer"
                      >
                        Evet, Sıfırla
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default DefinitionsManagerModal;
