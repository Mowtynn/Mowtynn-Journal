import { EASE, SPRING, MODAL_BACKDROP, MODAL_PANEL } from '../lib/motion';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import {
  SlidersHorizontal,
  X,
  LineChart,
  Clock,
  ArrowUpRight,
  Lightbulb,
  Sun,
  Plus,
  Search,
  Edit2,
  Check,
  Trash2,
  GripVertical,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  Crosshair,
  Zap,
  TrendingUp,
  Flag,
  Layers,
  Newspaper,
  Type,
} from 'lucide-react';
import { Trade, DefinitionTitles } from '../types';
import { REQUIRABLE_FIELDS, DEFAULT_REQUIRED_FIELDS, loadRequiredFields, saveRequiredFields, type RequirableField } from '../lib/requiredFields';
import {
  DEFAULT_TIMEFRAMES,
  DEFAULT_HTF_TIMEFRAMES,
  DEFAULT_CONFIRMATIONS,
  DEFAULT_SESSIONS,
  DEFAULT_ASSETS,
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_ENTRY_MODELS,
  DEFAULT_TREND_TYPES,
  DEFAULT_TP_TARGETS,
  DEFAULT_PREMIUM_DISCOUNTS,
  DEFAULT_NEWS_DAYS,
  DEFAULT_ASIA_RANGE_FVGS,
  FORM_LABEL_KEYS,
  DEFAULT_DEFINITION_TITLES,
  caseInsensitiveMatch,
  caseInsensitiveEquals,
  normalizeNewsDays,
  smartUpper,
} from '../constants/constants';
import { useAfterPaint } from '../hooks/useAfterPaint';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { localDateKey } from '../utils/math';

interface DefinitionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: Trade[];
  timeframes: string[];
  htfTimeframes: string[];
  confirmations: string[];
  sessions: string[];
  assets: string[];
  planFidelities: string[];
  entryModels?: string[];
  trendTypes?: string[];
  tpTargets?: string[];
  premiumDiscounts?: string[];
  newsDays?: string[];
  asiaRangeFvgs?: string[];
  definitionTitles?: DefinitionTitles;
  persistTimeframes: (list: string[]) => void;
  persistHtfTimeframes: (list: string[]) => void;
  persistConfirmations: (list: string[]) => void;
  persistSessions: (list: string[]) => void;
  persistAssets: (list: string[]) => void;
  persistPlanFidelities: (list: string[]) => void;
  persistEntryModels?: (list: string[]) => void;
  persistTrendTypes?: (list: string[]) => void;
  persistTpTargets?: (list: string[]) => void;
  persistPremiumDiscounts?: (list: string[]) => void;
  persistNewsDays?: (list: string[]) => void;
  persistAsiaRangeFvgs?: (list: string[]) => void;
  /** Bir öğe yeniden adlandırılınca işlemlerdeki değeri de günceller; güncellenen işlem sayısını döndürür. */
  onRenameDefinition?: (category: string, from: string, to: string) => number;
  persistDefinitionTitles?: (updated: DefinitionTitles) => void;
}

type TabType = 'assets' | 'timeframes' | 'htfTimeframes' | 'confirmations' | 'sessions' | 'planFidelities' | 'trendTypes' | 'entryModels' | 'tpTargets' | 'premiumDiscounts' | 'newsDays' | 'asiaRangeFvgs' | 'formLabels' | 'requiredFields';

/** Sekme kimliği -> DefinitionTitles anahtarı (Form Başlıkları sekmesinin kendi başlığı yok) */
const titleKeyFor = (tab: TabType): keyof DefinitionTitles =>
  tab === 'formLabels' || tab === 'requiredFields' ? 'basicInfoCard' : tab;

const FORM_LABEL_HINTS: Record<string, string> = {
  basicInfoCard: 'Kart başlığı: Temel Bilgiler',
  financialCard: 'Kart başlığı: Sonuç & Risk',
  notesCard: 'Kart başlığı: Analiz & Notlar',
  direction: 'LONG / SHORT seçimi',
  tradeDate: 'Tarih ve saat seçici',
  tradeStatus: 'WIN / LOSS / BREAKEVEN seçimi',
  stopPips: 'Stop mesafesi',
  tpPips: 'Take profit mesafesi',
  maePips: 'Aleyhe maksimum sapma',
  mfePips: 'Lehe maksimum sapma',
  asiaRangePips: 'Asia Range büyüklüğü',
  rr: 'Sonuç R',
  chartLink: 'Grafik bağlantısı alanı',
  asiaRange: 'Range / Trend / Swept seçimi',
  sweepTime: 'Sweep saati (NY)',
  management: 'BE / kısmi kâr / erken kapama',
};

/** Zorunlu alanlar: tam kayıtta boş bırakılamayacak alanlar (Hızlı Kayıt muaf) */
const RequiredFieldsPanel: React.FC = () => {
  const [req, setReq] = useState<RequirableField[]>(loadRequiredFields);
  const update = (next: RequirableField[]) => {
    setReq(next);
    saveRequiredFields(next);
  };
  return (
    <div className="flex flex-col gap-3 min-h-0">
      <p className="text-[11px] text-zinc-400 leading-snug">
        Seçili alanlar boşken tam kayıt yapılamaz; Hızlı Kayıt muaftır, ayrıntıları sonra "Tamamla" ile girersin. Parite, yön, sonuç, hesap ve News Day her zaman zorunludur. Girişliyken ayar buluta da kaydedilir.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar">
        {REQUIRABLE_FIELDS.map((f) => {
          const on = req.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              data-selected={on}
              onClick={() => update(on ? req.filter((x) => x !== f.id) : [...req, f.id])}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${on ? 'bg-blue-500/15 text-blue-200 border-blue-500/40' : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'}`}
            >
              <span className="truncate">{f.label}</span>
              <span className="text-[10px] font-semibold shrink-0">{on ? 'Zorunlu' : 'İsteğe Bağlı'}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => update(DEFAULT_REQUIRED_FIELDS)}
        className="self-start px-3 py-1.5 rounded-xl border border-zinc-700/70 bg-zinc-900 text-[11px] font-bold text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer transition-ui"
      >
        Önerilen Ayara Dön
      </button>
    </div>
  );
};

const FormLabelsPanel: React.FC<{
  definitionTitles: DefinitionTitles;
  persistDefinitionTitles?: (updated: DefinitionTitles) => void;
}> = ({ definitionTitles, persistDefinitionTitles }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const current = (key: string) => (definitionTitles as any)[key] || (DEFAULT_DEFINITION_TITLES as any)[key] || '';

  const save = (key: string) => {
    const draft = drafts[key];
    if (draft === undefined) return;
    const val = draft.trim() || (DEFAULT_DEFINITION_TITLES as any)[key];
    if (val !== current(key) && persistDefinitionTitles) {
      persistDefinitionTitles({ ...DEFAULT_DEFINITION_TITLES, ...definitionTitles, [key]: val });
      toast.success('Başlık güncellendi.');
    }
    setDrafts((d) => {
      const { [key]: _omit, ...rest } = d;
      return rest;
    });
  };

  const resetAll = () => {
    if (!persistDefinitionTitles) return;
    const next: any = { ...DEFAULT_DEFINITION_TITLES, ...definitionTitles };
    FORM_LABEL_KEYS.forEach((k) => { next[k] = (DEFAULT_DEFINITION_TITLES as any)[k]; });
    persistDefinitionTitles(next);
    setDrafts({});
    toast.success('Form başlıkları varsayılana döndü.');
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between gap-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 mb-3.5">
        <div className="min-w-0">
          <span className="text-xs font-bold text-zinc-100 font-sans">Form Başlıkları</span>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Listesi olmayan alanların işlem ekleme ekranındaki adları. Enter veya alandan çıkınca kaydedilir.</p>
        </div>
        <button type="button" onClick={resetAll} className="text-[10px] font-sans text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer shrink-0">
          <RotateCcw size={11} /> Varsayılanlara Sıfırla
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
        {FORM_LABEL_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border bg-zinc-950/40 border-zinc-800/80">
            <span className="text-[11px] text-zinc-500 font-sans truncate">{FORM_LABEL_HINTS[key]}</span>
            <input
              type="text"
              value={drafts[key] ?? current(key)}
              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
              onBlur={() => save(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setDrafts((d) => { const { [key]: _o, ...rest } = d; return rest; });
              }}
              maxLength={40}
              className="w-48 bg-zinc-900 border border-zinc-700/60 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-sans font-bold focus:outline-none transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DefinitionsManagerModal: React.FC<DefinitionsManagerModalProps> = ({
  isOpen,
  onClose,
  trades = [],
  timeframes,
  htfTimeframes,
  confirmations,
  sessions,
  assets,
  planFidelities,
  entryModels = DEFAULT_ENTRY_MODELS,
  trendTypes = DEFAULT_TREND_TYPES,
  tpTargets = DEFAULT_TP_TARGETS,
  premiumDiscounts = DEFAULT_PREMIUM_DISCOUNTS,
  newsDays = DEFAULT_NEWS_DAYS,
  asiaRangeFvgs = DEFAULT_ASIA_RANGE_FVGS,
  definitionTitles = DEFAULT_DEFINITION_TITLES,
  persistTimeframes,
  persistHtfTimeframes,
  persistConfirmations,
  persistSessions,
  persistAssets,
  persistPlanFidelities,
  persistEntryModels = () => {},
  persistTrendTypes = () => {},
  persistTpTargets = () => {},
  persistPremiumDiscounts = () => {},
  persistNewsDays = (_list: string[]) => {},
  persistAsiaRangeFvgs = () => {},
  onRenameDefinition,
  persistDefinitionTitles,
}) => {
  useBodyScrollLock(isOpen);
  const ready = useAfterPaint(isOpen); // kullanım sayıları açılış animasyonundan sonra hesaplanır
  const [activeTab, setActiveTab] = useState<TabType>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ item: string; count: number } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState('');

  // Compute trade usage counts per active category
  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const [newsYes, newsNo] = normalizeNewsDays(newsDays);
    if (!ready || !trades || trades.length === 0) return counts;

    trades.forEach(t => {
      if (t.asset) counts[`assets:${t.asset}`] = (counts[`assets:${t.asset}`] || 0) + 1;
      if (t.timeframe) counts[`timeframes:${t.timeframe}`] = (counts[`timeframes:${t.timeframe}`] || 0) + 1;
      if (t.htfTimeframe) counts[`htfTimeframes:${t.htfTimeframe}`] = (counts[`htfTimeframes:${t.htfTimeframe}`] || 0) + 1;
      if (t.session) counts[`sessions:${t.session}`] = (counts[`sessions:${t.session}`] || 0) + 1;
      if (t.planFidelity) counts[`planFidelities:${t.planFidelity}`] = (counts[`planFidelities:${t.planFidelity}`] || 0) + 1;
      if (t.entryModels && Array.isArray(t.entryModels)) {
        t.entryModels.forEach(em => {
          counts[`entryModels:${em}`] = (counts[`entryModels:${em}`] || 0) + 1;
        });
      }
      if (t.trend) counts[`trendTypes:${t.trend}`] = (counts[`trendTypes:${t.trend}`] || 0) + 1;
      if (t.premiumDiscount) counts[`premiumDiscounts:${t.premiumDiscount}`] = (counts[`premiumDiscounts:${t.premiumDiscount}`] || 0) + 1;
      if (t.asiaRangeFvg) counts[`asiaRangeFvgs:${t.asiaRangeFvg}`] = (counts[`asiaRangeFvgs:${t.asiaRangeFvg}`] || 0) + 1;
      if (typeof t.newsDay === 'boolean') {
        const nk = `newsDays:${t.newsDay ? newsYes : newsNo}`;
        counts[nk] = (counts[nk] || 0) + 1;
      }
      if (Array.isArray(t.tpTargets)) {
        t.tpTargets.forEach(tp => {
          counts[`tpTargets:${tp}`] = (counts[`tpTargets:${tp}`] || 0) + 1;
        });
      }
      if (t.confirmations && Array.isArray(t.confirmations)) {
        t.confirmations.forEach(c => {
          counts[`confirmations:${c}`] = (counts[`confirmations:${c}`] || 0) + 1;
        });
      }
    });
    return counts;
  }, [trades, ready, newsDays]);

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; list: string[]; persist: (list: string[]) => void; defaultList: string[]; fixed?: boolean; special?: boolean }[] = [
    { id: 'assets', label: definitionTitles.assets || DEFAULT_DEFINITION_TITLES.assets, icon: LineChart, list: assets, persist: persistAssets, defaultList: DEFAULT_ASSETS },
    { id: 'trendTypes', label: definitionTitles.trendTypes || DEFAULT_DEFINITION_TITLES.trendTypes || "Trend Yapısı", icon: TrendingUp, list: trendTypes, persist: persistTrendTypes, defaultList: DEFAULT_TREND_TYPES },
    { id: 'entryModels', label: definitionTitles.entryModels || DEFAULT_DEFINITION_TITLES.entryModels || "Entry Model", icon: Zap, list: entryModels, persist: persistEntryModels, defaultList: DEFAULT_ENTRY_MODELS },
    { id: 'timeframes', label: definitionTitles.timeframes || DEFAULT_DEFINITION_TITLES.timeframes, icon: Clock, list: timeframes, persist: persistTimeframes, defaultList: DEFAULT_TIMEFRAMES },
    { id: 'htfTimeframes', label: definitionTitles.htfTimeframes || DEFAULT_DEFINITION_TITLES.htfTimeframes, icon: ArrowUpRight, list: htfTimeframes, persist: persistHtfTimeframes, defaultList: DEFAULT_HTF_TIMEFRAMES },
    { id: 'confirmations', label: definitionTitles.confirmations || DEFAULT_DEFINITION_TITLES.confirmations, icon: Lightbulb, list: confirmations, persist: persistConfirmations, defaultList: DEFAULT_CONFIRMATIONS },
    { id: 'sessions', label: definitionTitles.sessions || DEFAULT_DEFINITION_TITLES.sessions, icon: Sun, list: sessions, persist: persistSessions, defaultList: DEFAULT_SESSIONS },
    { id: 'planFidelities', label: definitionTitles.planFidelities || DEFAULT_DEFINITION_TITLES.planFidelities, icon: Crosshair, list: planFidelities, persist: persistPlanFidelities, defaultList: DEFAULT_PLAN_FIDELITIES },
    { id: 'tpTargets', label: definitionTitles.tpTargets || DEFAULT_DEFINITION_TITLES.tpTargets || "Target", icon: Flag, list: tpTargets, persist: persistTpTargets, defaultList: DEFAULT_TP_TARGETS },
    { id: 'premiumDiscounts', label: definitionTitles.premiumDiscounts || DEFAULT_DEFINITION_TITLES.premiumDiscounts || "Confirmations", icon: Layers, list: premiumDiscounts, persist: persistPremiumDiscounts, defaultList: DEFAULT_PREMIUM_DISCOUNTS },
    { id: 'asiaRangeFvgs', label: definitionTitles.asiaRangeFvgs || DEFAULT_DEFINITION_TITLES.asiaRangeFvgs || "Asia Range FVG", icon: Layers, list: asiaRangeFvgs, persist: persistAsiaRangeFvgs, defaultList: DEFAULT_ASIA_RANGE_FVGS },
    // Sabit iki durumlu alan: yalnızca etiketler (Var / Yok) yeniden adlandırılır, ekleme/silme/sıralama yok
    { id: 'newsDays', label: definitionTitles.newsDays || DEFAULT_DEFINITION_TITLES.newsDays || "News Day/Bank Holiday", icon: Newspaper, list: normalizeNewsDays(newsDays), persist: persistNewsDays, defaultList: DEFAULT_NEWS_DAYS, fixed: true },
    // Listesi olmayan form alanlarının (Yön, Stop, R:R, Notlar...) başlıkları
    { id: 'formLabels', label: 'Form Başlıkları', icon: Type, list: [...FORM_LABEL_KEYS], persist: () => {}, defaultList: [], special: true },
    { id: 'requiredFields', label: 'Zorunlu Alanlar', icon: Type, list: [], persist: () => {}, defaultList: [], special: true },
  ];

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];
  const activeList = currentTabObj.list;
  const currentPersist = currentTabObj.persist;
  const isFixedTab = !!currentTabObj.fixed;
  const isSpecialTab = !!currentTabObj.special;

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
        [titleKeyFor(activeTab)]: trimmed,
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
    if (!val || isFixedTab) return;
    if (activeList.some(i => caseInsensitiveEquals(i, val))) {
      toast.error(`"${smartUpper(val)}" zaten listede mevcut!`);
      return;
    }
    currentPersist([...activeList, val]);
    setNewItemText('');
    const singularLabel = currentTabObj.label.endsWith('lar') || currentTabObj.label.endsWith('ler')
      ? currentTabObj.label.slice(0, -3)
      : currentTabObj.label;
    toast.success(`Yeni ${singularLabel} eklendi: ${smartUpper(val)}`);
  };

  const handleSaveEdit = (originalIndex: number) => {
    const val = editingText.trim();
    const previous = activeList[originalIndex];
    if (!val || val === previous) {
      setEditingIndex(null);
      setEditingText('');
      return;
    }
    if (activeList.some((i, idx) => idx !== originalIndex && caseInsensitiveEquals(i, val))) {
      toast.error(`"${smartUpper(val)}" zaten listede mevcut!`);
      return;
    }
    const updated = [...activeList];
    updated[originalIndex] = val;

    if (isFixedTab) {
      currentPersist(updated);
      toast.success('Etiket güncellendi.');
    } else {
      currentPersist(updated);
      const migrated = onRenameDefinition ? onRenameDefinition(activeTab, previous, val) : 0;
      toast.success(migrated > 0 ? `Tanım güncellendi; ${migrated} işlemdeki değer de yeni adla değiştirildi.` : 'Tanım başarıyla güncellendi.');
    }
    setEditingIndex(null);
    setEditingText('');
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
        [titleKeyFor(activeTab)]: DEFAULT_DEFINITION_TITLES[titleKeyFor(activeTab)],
      };
      persistDefinitionTitles(updatedTitles);
    }
    setShowResetConfirm(false);
    toast.success(`${currentTabObj.label} ve başlığı varsayılan değerlere sıfırlandı.`);
  };

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (searchQuery.trim() || isFixedTab) return; // Arama sırasında ve sabit listelerde sürükleme kapalı
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (searchQuery.trim() || isFixedTab) return;
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
      timeframes,
      htfTimeframes,
      confirmations,
      sessions,
      assets,
      planFidelities,
      entryModels,
      trendTypes,
      tpTargets,
      premiumDiscounts,
      newsDays: normalizeNewsDays(newsDays),
      asiaRangeFvgs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trading_Journal_Definitions_${localDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('format');
        const list = (v: unknown): string[] | null => {
          if (!Array.isArray(v)) return null;
          const out: string[] = [];
          v.forEach((x) => {
            if (typeof x !== 'string') return;
            const t = x.trim();
            if (t && !out.some((o) => caseInsensitiveEquals(o, t))) out.push(t);
          });
          return out;
        };
        let applied = 0;
        const apply = (v: unknown, fn: (l: string[]) => void) => {
          const l = list(v);
          if (l) { fn(l); applied++; }
        };
        if (data.definitionTitles && typeof data.definitionTitles === 'object' && persistDefinitionTitles) {
          persistDefinitionTitles({ ...DEFAULT_DEFINITION_TITLES, ...data.definitionTitles });
          applied++;
        }
        apply(data.timeframes, persistTimeframes);
        apply(data.htfTimeframes, persistHtfTimeframes);
        apply(data.confirmations, persistConfirmations);
        apply(data.sessions, persistSessions);
        apply(data.assets, persistAssets);
        apply(data.planFidelities, persistPlanFidelities);
        apply(data.entryModels, persistEntryModels);
        apply(data.trendTypes, persistTrendTypes);
        apply(data.tpTargets, persistTpTargets);
        apply(data.premiumDiscounts, persistPremiumDiscounts);
        apply(data.asiaRangeFvgs, persistAsiaRangeFvgs);
        if (Array.isArray(data.newsDays)) {
          persistNewsDays(normalizeNewsDays(data.newsDays));
          applied++;
        }
        if (applied === 0) {
          toast.error('Dosyada içe aktarılabilecek tanımlama bulunamadı.');
        } else {
          toast.success('Tanımlamalar ve başlıklar başarıyla içe aktarıldı.');
        }
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
          {...MODAL_BACKDROP}
          className="fixed inset-0 modal-layer modal-dim z-[2500] flex items-center justify-center p-3 sm:p-5   overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key="definitions-modal-content"
            {...MODAL_PANEL}
            className="relative w-full max-w-4xl h-[620px] max-h-[90vh] min-h-[480px] bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={e => e.stopPropagation()}
          >
            
          {/* Header */}
          <div className="modal-header">
            <h2 className="heading-1 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <SlidersHorizontal size={16} />
              </div>
              Tanımlamalar
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button aria-label="İndir"
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
                      lang="en"
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery('');
                        setNewItemText('');
                        setEditingIndex(null);
                      }}
                      className={`relative px-3 py-2 text-xs font-semibold rounded-xl transition-ui duration-150 flex items-center justify-between gap-2 cursor-pointer select-none shrink-0 text-left ${
                        isActive
                          ? 'text-blue-400 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeDefTabIndicator"
                          className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/30 shadow-xs"
                          transition={SPRING.indicator}
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
                
                {isSpecialTab && activeTab === 'requiredFields' ? (
                  <RequiredFieldsPanel />
                ) : isSpecialTab ? (
                  <FormLabelsPanel
                    definitionTitles={definitionTitles}
                    persistDefinitionTitles={persistDefinitionTitles}
                  />
                ) : (
                <>
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
                          className="px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Check size={12} /> Kaydet
                        </button>
                        <button aria-label="Kapat"
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
                          className="px-2 py-0.5 text-zinc-400 hover:text-blue-300 bg-zinc-800/80 hover:bg-blue-500/10 border border-zinc-700/60 hover:border-blue-500/30 rounded-lg transition-ui flex items-center gap-1 text-[11px] font-sans cursor-pointer"
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
                      <RotateCcw size={11} /> {isFixedTab ? 'Etiketleri Sıfırla' : 'Varsayılanlara Sıfırla'}
                    </button>
                  </div>
                </div>

                {/* Search & Add Bar */}
                {isFixedTab ? (
                  <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] font-sans text-zinc-400 leading-relaxed">
                    Bu alan sabit iki durumludur: <strong className="text-zinc-200">ilk satır</strong> “evet” anlamına, <strong className="text-zinc-200">ikinci satır</strong> “hayır” (varsayılan seçili) anlamına gelir. Yalnızca butonlarda görünen etiketleri değiştirebilirsiniz; geçmiş işlemler etiketten bağımsız saklandığı için bozulmaz.
                  </div>
                ) : (
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
                      className="px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 disabled:opacity-40 disabled:hover:bg-blue-500/15 font-sans text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Ekle</span>
                    </button>
                  </div>
                </div>
                )}

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
                          draggable={!searchQuery.trim() && !isEditing && !isFixedTab}
                          onDragStart={(e) => handleDragStart(e, originalIndex)}
                          onDragEnter={(e) => handleDragEnter(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-ui duration-150 group ${
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
                              <button aria-label="Onayla"
                                onClick={() => handleSaveEdit(originalIndex)}
                                className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                              <button aria-label="Kapat"
                                onClick={() => setEditingIndex(null)}
                                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                {!isFixedTab && <GripVertical size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-grab" />}
                                {isFixedTab && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${originalIndex === 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-blue-500/15 text-blue-300 border-blue-500/30'}`}>
                                    {originalIndex === 0 ? 'EVET' : 'HAYIR · VARSAYILAN'}
                                  </span>
                                )}
                                <span lang="en" className="font-sans font-bold text-xs text-zinc-200 tracking-wide truncate uppercase">
                                  {item}
                                </span>
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
                                <button aria-label="Düzenle"
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
                                {!isFixedTab && (
                                <button aria-label="Sil"
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                </>
                )}
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
                  transition={{ duration: 0.15, ease: EASE }}
                  className="will-change-[opacity] absolute inset-0 z-[10000] bg-zinc-950/85 flex items-center justify-center p-4"
                  onClick={() => setDeleteConfirmItem(null)}
                >
                  <motion.div
                    key="delete-confirm-content"
                    {...MODAL_PANEL}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <Trash2 size={18} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xs font-bold font-sans tracking-wide text-zinc-100 uppercase">
                        Tanımı Sil
                      </h4>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        <span className="font-sans font-bold text-zinc-200">"{deleteConfirmItem.item}"</span> tanımını silmek istediğinize emin misiniz?
                      </p>
                      {deleteConfirmItem.count > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-sans leading-relaxed text-left flex items-start gap-2">
                          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              Bu tanım <strong className="text-amber-200 underline">{deleteConfirmItem.count} işlemde</strong> kullanılıyor. Silerseniz yalnızca seçim listesinden kalkar; işlemlerdeki kayıtlı değer ve istatistikler korunur.
                            </div>
                        </div>
                      )}
                    </div>

                    {(
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
                  transition={{ duration: 0.15, ease: EASE }}
                  className="will-change-[opacity] absolute inset-0 z-[10000] bg-zinc-950/85 flex items-center justify-center p-4"
                  onClick={() => setShowResetConfirm(false)}
                >
                  <motion.div
                    key="reset-confirm-content"
                    {...MODAL_PANEL}
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
