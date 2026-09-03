import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, X, Monitor, LineChart, Clock, ArrowUpRight, 
  Lightbulb, Target, Sun, Plus, Search, Edit2, Check, Trash2, 
  GripVertical, RotateCcw, Download, Upload, AlertCircle, Sparkles
} from 'lucide-react';
import { Trade } from '../types';
import { 
  DEFAULT_PLATFORMS, DEFAULT_TIMEFRAMES, DEFAULT_HTF_TIMEFRAMES, 
  DEFAULT_CONFIRMATIONS, DEFAULT_CONCEPTS, DEFAULT_SESSIONS, DEFAULT_ASSETS 
} from '../constants/constants';

interface DefinitionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: Trade[];
  platforms: string[];
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  concepts: string[];
  sessions: string[];
  assets: string[];
  persistPlatforms: (list: string[]) => void;
  persistTimeframes: (list: string[]) => void;
  persistHtfTimeframes: (list: string[]) => void;
  persistConfirmations: (list: string[]) => void;
  persistConcepts: (list: string[]) => void;
  persistSessions: (list: string[]) => void;
  persistAssets: (list: string[]) => void;
}

type TabType = 'platforms' | 'assets' | 'timeframes' | 'htfTimeframes' | 'confirmations' | 'concepts' | 'sessions';

export const DefinitionsManagerModal: React.FC<DefinitionsManagerModalProps> = ({
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
  persistPlatforms,
  persistTimeframes,
  persistHtfTimeframes,
  persistConfirmations,
  persistConcepts,
  persistSessions,
  persistAssets,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('platforms');
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ item: string; count: number } | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute trade usage counts per active category
  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!trades || trades.length === 0) return counts;

    trades.forEach(t => {
      if (t.platform) counts[`platforms:${t.platform}`] = (counts[`platforms:${t.platform}`] || 0) + 1;
      if (t.asset) counts[`assets:${t.asset}`] = (counts[`assets:${t.asset}`] || 0) + 1;
      if (t.timeframe) counts[`timeframes:${t.timeframe}`] = (counts[`timeframes:${t.timeframe}`] || 0) + 1;
      if (t.htfTimeframe) counts[`htfTimeframes:${t.htfTimeframe}`] = (counts[`htfTimeframes:${t.htfTimeframe}`] || 0) + 1;
      if (t.concept) counts[`concepts:${t.concept}`] = (counts[`concepts:${t.concept}`] || 0) + 1;
      if (t.session) counts[`sessions:${t.session}`] = (counts[`sessions:${t.session}`] || 0) + 1;
      if (t.confirmations && Array.isArray(t.confirmations)) {
        t.confirmations.forEach(c => {
          counts[`confirmations:${c}`] = (counts[`confirmations:${c}`] || 0) + 1;
        });
      }
    });
    return counts;
  }, [trades]);

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; list: string[]; persist: (list: string[]) => void; defaultList: string[] }[] = [
    { id: 'platforms', label: 'Platformlar', icon: Monitor, list: platforms, persist: persistPlatforms, defaultList: DEFAULT_PLATFORMS },
    { id: 'assets', label: 'Varlıklar (Pariteler)', icon: LineChart, list: assets, persist: persistAssets, defaultList: DEFAULT_ASSETS },
    { id: 'timeframes', label: 'ETF (Giriş Zamanı)', icon: Clock, list: timeframes, persist: persistTimeframes, defaultList: DEFAULT_TIMEFRAMES },
    { id: 'htfTimeframes', label: 'HTF (Üst Zaman)', icon: ArrowUpRight, list: htfTimeframes, persist: persistHtfTimeframes, defaultList: DEFAULT_HTF_TIMEFRAMES },
    { id: 'confirmations', label: 'Onaylar', icon: Lightbulb, list: confirmations, persist: persistConfirmations, defaultList: DEFAULT_CONFIRMATIONS },
    { id: 'concepts', label: 'Konseptler', icon: Target, list: concepts, persist: persistConcepts, defaultList: DEFAULT_CONCEPTS },
    { id: 'sessions', label: 'Oturumlar (Seans)', icon: Sun, list: sessions, persist: persistSessions, defaultList: DEFAULT_SESSIONS },
  ];

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];
  const activeList = currentTabObj.list;
  const currentPersist = currentTabObj.persist;

  // Filtered List
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter(item => item.toLowerCase().includes(q));
  }, [activeList, searchQuery]);

  const handleAddItem = () => {
    const val = newItemText.trim();
    if (!val) return;
    if (activeList.some(i => i.toLowerCase() === val.toLowerCase())) {
      triggerToast(`"${val}" zaten listede mevcut!`);
      return;
    }
    currentPersist([...activeList, val]);
    setNewItemText('');
    triggerToast(`Yeni ${currentTabObj.label.slice(0, -3)} eklendi: ${val}`);
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
    triggerToast('Tanım başarıyla güncellendi.');
  };

  const handleDeleteItem = (itemToDelete: string) => {
    const usageKey = `${activeTab}:${itemToDelete}`;
    const count = usageCounts[usageKey] || 0;
    setDeleteConfirmItem({ item: itemToDelete, count });
  };

  const handleResetDefaults = () => {
    currentPersist(currentTabObj.defaultList);
    setShowResetConfirm(false);
    triggerToast(`${currentTabObj.label} varsayılan değerlere sıfırlandı.`);
  };

  // Export all definitions as JSON
  const handleExportJSON = () => {
    const data = {
      platforms,
      timeframes,
      htfTimeframes,
      confirmations,
      concepts,
      sessions,
      assets,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trading_Journal_Definitions_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Tüm tanımlamalar JSON olarak indirildi.');
  };

  // Import JSON definitions
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.platforms) persistPlatforms(data.platforms);
        if (data.timeframes) persistTimeframes(data.timeframes);
        if (data.htfTimeframes) persistHtfTimeframes(data.htfTimeframes);
        if (data.confirmations) persistConfirmations(data.confirmations);
        if (data.concepts) persistConcepts(data.concepts);
        if (data.sessions) persistSessions(data.sessions);
        if (data.assets) persistAssets(data.assets);
        triggerToast('Tanımlamalar başarıyla içe aktarıldı.');
      } catch (err) {
        triggerToast('Geçersiz JSON dosyası!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-zinc-950/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-700/40 bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-xs">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2 font-mono">
                    Tanımlamaları Yönet & Akıllı Etiketler
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                    Platform, Parite, Zaman Dilimleri, Konsept ve Strateji Listelerini Özelleştirin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tanımlamaları JSON olarak indir"
                >
                  <Download size={13} className="text-blue-400" />
                  <span className="hidden sm:inline">Dışa Aktar</span>
                </button>

                <label className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Upload size={13} className="text-purple-400" />
                  <span className="hidden sm:inline">İçe Aktar</span>
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-blue-500/15 border border-blue-500/30 text-blue-300 px-4 py-2 text-xs font-mono flex items-center gap-2 shrink-0"
              >
                <Sparkles size={13} className="text-blue-400 animate-spin" />
                <span>{toastMessage}</span>
              </motion.div>
            )}

            {/* Main Modal Layout */}
            <div className="p-4 sm:p-6 bg-zinc-950/30 flex flex-col md:flex-row gap-5 flex-1 min-h-0 overflow-hidden">
              
              {/* Sidebar Tabs */}
              <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto md:w-56 shrink-0 pb-2 md:pb-0 custom-scrollbar bg-zinc-900/90 border border-zinc-700/50 p-2 rounded-2xl shadow-xs md:self-start">
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono hidden md:block">
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

                      <span className={`relative z-10 text-[10px] font-mono px-2 py-0.5 rounded-md border ${
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
                      className="w-full bg-zinc-950/60 border border-zinc-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
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
                    <input
                      type="text"
                      placeholder={`Yeni Ekle...`}
                      value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); }}
                      className="flex-1 sm:w-44 bg-zinc-950/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newItemText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-mono text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Header info strip */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3 px-1">
                  <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    Kayıtlı {currentTabObj.label} ({filteredList.length})
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} /> Varsayılanlara Sıfırla
                  </button>
                </div>

                {/* Reset confirmation bar */}
                {showResetConfirm && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-400 shrink-0" />
                      <span>Bu kategorideki tüm özel tanımlar silinip varsayılana dönecek. Emin misiniz?</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleResetDefaults}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Evet, Sıfırla
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}

                {/* Item List Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                  {filteredList.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-xs text-zinc-500 font-mono italic space-y-1">
                      <span>— Aranan kriterde tanım bulunamadı —</span>
                    </div>
                  ) : (
                    filteredList.map((item, idx) => {
                      const originalIndex = activeList.indexOf(item);
                      const isEditing = editingIndex === originalIndex;
                      const usageKey = `${activeTab}:${item}`;
                      const count = usageCounts[usageKey] || 0;

                      return (
                        <div
                          key={`${item}-${idx}`}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-150 group"
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
                                className="flex-1 bg-zinc-900 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
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
                                <span className="font-mono font-bold text-xs text-zinc-200 tracking-wide truncate">
                                  {item}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Usage Badge */}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${
                                  count > 0 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
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
                                  title="Düzenle"
                                >
                                  <Edit2 size={13} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                  title="Sil"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="absolute inset-0 z-[10000] bg-zinc-950/85 backdrop-blur-xs flex items-center justify-center p-4"
                  onClick={() => setDeleteConfirmItem(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <Trash2 size={18} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xs font-bold font-mono tracking-wide text-zinc-100 uppercase">Tanımı Sil</h4>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        <span className="font-mono font-bold text-zinc-200">"{deleteConfirmItem.item}"</span> tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                      </p>
                      {deleteConfirmItem.count > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-mono leading-normal text-left flex items-start gap-1.5">
                          <span>⚠️</span>
                          <span>Bu tanım <span className="font-bold underline">{deleteConfirmItem.count} adet işlemde</span> aktif olarak kullanılmaktadır!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(null)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-colors cursor-pointer border border-zinc-700/60"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activeList.filter(item => item !== deleteConfirmItem.item);
                          currentPersist(updated);
                          triggerToast(`"${deleteConfirmItem.item}" silindi.`);
                          setDeleteConfirmItem(null);
                        }}
                        className="flex-1 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-mono text-xs font-bold transition-colors cursor-pointer"
                      >
                        Evet, Sil
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
