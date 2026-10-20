import { EASE, SPRING, MODAL_BACKDROP, MODAL_PANEL } from './lib/motion';
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Trade, TradeStats, Note, JournalEntry, Certificate, DefinitionTitles, AccountCategory } from "./types";
import {
  DEFAULT_PLATFORMS,
  DEFAULT_TIMEFRAMES,
  DEFAULT_HTF_TIMEFRAMES,
  DEFAULT_CONFIRMATIONS,
  DEFAULT_LIQUIDITY_SWEEPS,
  DEFAULT_CONCEPTS,
  DEFAULT_SESSIONS,
  DEFAULT_ASSETS,
  DEFAULT_PLAN_FIDELITIES,
  DEFAULT_ENTRY_MODELS,
  DEFAULT_TREND_TYPES,
  DEFAULT_TP_TARGETS,
  DEFAULT_PREMIUM_DISCOUNTS,
  DEFAULT_ENTRY_HOURS,
  DEFAULT_NEWS_DAYS,
  DEFAULT_STRATEGIES,
  DEFAULT_ASIA_RANGE_FVGS,
  NEWS_DAYS_EVENT,
  normalizeNewsDays,
  replacePlatformCategories,
  DEFAULT_DEFINITION_TITLES,
  sanitizeDefinitionTitles,
  normalizeSearchString,
  getTradeAccountCategory,
  getStoredPlatformCategories,
} from "./constants/constants";

import StatsDashboard from "./components/StatsDashboard";
import TradeList from "./components/TradeList";
import DeepAnalysis from "./components/DeepAnalysis";
import NotesView from "./components/NotesView";
import JournalView from "./components/JournalView";
import { CertificatesView } from "./components/CertificatesView";
import AddTradeForm from "./components/AddTradeForm";
import { GlobalFilterModal } from "./components/GlobalFilterModal";
import { AuthModal } from "./components/AuthModal";
import AICoPilotModal from "./components/AICoPilotModal";
import DefinitionsManagerModal from "./components/DefinitionsManagerModal";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import { AccountSwitcher } from "./components/AccountSwitcher";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { useMetricMode } from "./context/MetricContext";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import { useExitMount } from "./hooks/useExitMount";
import { useAppStore } from "./store/useAppStore";
import { Toaster, toast } from "react-hot-toast";

import TradeDetailModal from "./components/TradeDetailModal";
import BackupRescue from "./components/BackupRescue";


import {
  Plus,
  LayoutDashboard,
  BarChart3,
  Cloud,
  LogOut,
  LogIn,
  FileText,
  Book,
  Award,
  AlertTriangle,
  Filter,
  SlidersHorizontal,
  Settings,
  Monitor,
  Pencil,
  Check,
  X,
  User as UserIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { auth, db, logout } from "./lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, User, updateProfile } from "firebase/auth";
import { uploadImageToStorage } from "./lib/storage";
import { calculateProfitFactor, calculateExpectancy, toRR } from "./lib/statMath";

// Sekme panelleri: açılışta kurulur ve bellekte kalır; yalnızca gizlenir/gösterilir (giriş animasyonu CSS'te: .tab-pane).
// Gizliyken alt ağaç dondurulur: son aktif render'ın elemanı yeniden kullanıldığından React gizli sekmeyi
// Firestore anlık güncellemelerinde / modal açılışında yeniden render etmez. Sekme açılınca güncel veriyle çizilir.
const TabPane = ({ active, className = "", children }: { active: boolean; className?: string; children: ReactNode }) => {
  const frozen = useRef<ReactNode>(children);
  if (active) frozen.current = children;
  return (
    <div hidden={!active} className={`tab-pane ${className}`}>
      {frozen.current}
    </div>
  );
};

// Utility to recursively clean undefined, NaN, and invalid values before saving to Firestore
const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val === undefined) continue;
      if (typeof val === 'number' && isNaN(val)) continue;
      if (typeof val === 'function') continue;
      if (val && typeof val === 'object' && !Array.isArray(val) && !((val as any) instanceof Date)) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
};

export const calculateComprehensiveStats = (list: Trade[], isRrMode: boolean = false): TradeStats => {
  const totalTrades = list.length;
  const closedTrades = totalTrades;

  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;

  let totalPnl = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let largestWin = 0;
  let largestLoss = 0;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let weeklyPnl = 0;
  let monthlyPnl = 0;

  let netR = 0;
  let grossWinRR = 0;
  let grossLossRR = 0;
  let largestWinRR = 0;
  let largestLossRR = 0;

  const assetPnlMap: { [key: string]: number } = {};
  const assetRrMap: { [key: string]: number } = {};

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.status === "WIN") winningTrades++;
    else if (t.status === "LOSS") losingTrades++;
    else if (t.status === "BREAKEVEN") breakevenTrades++;

    const p = t.pnl || 0;
    const rrVal = t.rr || 0;
    
    totalPnl += p;
    assetPnlMap[t.asset] = (assetPnlMap[t.asset] || 0) + p;
    assetRrMap[t.asset] = (assetRrMap[t.asset] || 0) + rrVal;

    if (t.createdAt >= sevenDaysAgo) {
      weeklyPnl += p;
    }
    if (t.createdAt >= thirtyDaysAgo) {
      monthlyPnl += p;
    }

    if (p > 0) {
      grossWins += p;
      if (p > largestWin) largestWin = p;
    } else if (p < 0) {
      const absLoss = Math.abs(p);
      grossLosses += absLoss;
      if (absLoss > largestLoss) largestLoss = absLoss;
    }

    netR += rrVal;
    if (rrVal > 0) {
      grossWinRR += rrVal;
      if (rrVal > largestWinRR) largestWinRR = rrVal;
    } else if (rrVal < 0) {
      const absLossRR = Math.abs(rrVal);
      grossLossRR += absLossRR;
      if (absLossRR > largestLossRR) largestLossRR = absLossRR;
    }
  }

  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

  const netPnl = totalPnl;
  const averageWin = winningTrades > 0 ? grossWins / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? grossLosses / losingTrades : 0;

  const averageWinRR = toRR(winningTrades > 0 ? grossWinRR / winningTrades : 0);
  const averageLossRR = toRR(losingTrades > 0 ? grossLossRR / losingTrades : 0);
  
  // Calculate Profit Factor based on toggle
  const profitFactorRR = calculateProfitFactor(toRR(grossWinRR), toRR(grossLossRR));
  const profitFactorCash = calculateProfitFactor(toRR(grossWins), toRR(grossLosses));
  const profitFactor = isRrMode ? profitFactorRR : profitFactorCash;
  
  // Predict Expectancy based on toggle
  const winRateDecimal = closedTrades > 0 ? (winningTrades / closedTrades) : 0;
  const lossRateDecimal = closedTrades > 0 ? (losingTrades / closedTrades) : 0;
  const expectancyRR = calculateExpectancy(winRateDecimal, lossRateDecimal, averageWinRR, averageLossRR);
  const expectancyCash = (winRateDecimal * averageWin) - (lossRateDecimal * averageLoss);

  let bestAsset = "";
  let worstAsset = "";
  let maxPnlValue = -Infinity;
  let minPnlValue = Infinity;

  const targetMap = isRrMode ? assetRrMap : assetPnlMap;

  Object.entries(targetMap).forEach(([asset, val]) => {
    if (val > maxPnlValue) {
      maxPnlValue = val;
      bestAsset = val > 0 ? asset : "";
    }
    if (val < minPnlValue) {
      minPnlValue = val;
      worstAsset = val < 0 ? asset : "";
    }
  });

  return {
    totalTrades,
    closedTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    totalPnl,
    netPnl,
    averageWin,
    averageLoss,
    profitFactor, // toggled value
    largestWin,
    largestLoss,
    bestAsset,
    worstAsset,
    weeklyPnl,
    monthlyPnl,
    netR,
    averageWinRR,
    averageLossRR,
    profitFactorRR,
    largestWinRR,
    largestLossRR,
    expectancyRR,
    expectancyCash,
  };
};

const getMinTimestamp = (limit: string): number => {
  const now = Date.now();
  switch (limit) {
    case "1w":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "1m":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "3m":
      return now - 90 * 24 * 60 * 60 * 1000;
    case "6m":
      return now - 180 * 24 * 60 * 60 * 1000;
    case "1y":
      return now - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0; // "all"
  }
};

// Yedekteki ayarları yalnızca bilinen alanlarla ve doğrulanmış biçimde alır (bozuk/yabancı alanlar buluta yazılmaz).
const sanitizeImportedSettings = (raw: any) => {
  if (!raw || typeof raw !== "object") return null;
  const strList = (v: any): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out: string[] = [];
    v.forEach((x) => {
      if (typeof x !== "string") return;
      const t = x.trim();
      if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    });
    return out;
  };
  const out: Record<string, any> = {};
  const listKeys = [
    "platforms", "timeframes", "htfTimeframes", "confirmations", "sessions", "assets",
    "planFidelities", "entryModels", "trendTypes", "tpTargets", "premiumDiscounts", "entryHours", "strategies", "asiaRangeFvgs",
  ];
  listKeys.forEach((k) => {
    const v = strList(raw[k]);
    if (v) out[k] = v;
  });
  const sweeps = strList(raw.liquiditySweeps) || strList(raw.concepts);
  if (sweeps) {
    out.concepts = sweeps;
    out.liquiditySweeps = sweeps;
  }
  if (Array.isArray(raw.newsDays)) out.newsDays = normalizeNewsDays(raw.newsDays);
  if (raw.definitionTitles && typeof raw.definitionTitles === "object") {
    out.definitionTitles = sanitizeDefinitionTitles(raw.definitionTitles);
  }
  if (raw.platformCategories && typeof raw.platformCategories === "object") {
    const cats: Record<string, string> = {};
    Object.entries(raw.platformCategories).forEach(([k, v]) => {
      if (v === "FUNDED" || v === "CHALLENGE" || v === "DEMO") cats[k.trim()] = v as string;
    });
    out.platformCategories = cats;
  }
  return Object.keys(out).length > 0 ? out : null;
};


export default function App() {
  const { isRrMode, setMode } = useMetricMode();
  const isClearingRef = useRef(false);
  // Trade Ledger Database State
  const [trades, setTrades] = useLocalStorageState<Trade[]>("trading_journal_db", []);
  const [notes, setNotes] = useLocalStorageState<Note[]>("trading_journal_notes", []);
  const [journals, setJournals] = useLocalStorageState<JournalEntry[]>("trading_journal_journals", []);
  const [certificates, setCertificates] = useLocalStorageState<Certificate[]>("trading_journal_certificates", []);

  // Callback'ler listeye bağımlı olmasın: her zaman güncel listeyi ref'ten okurlar. Böylece kaydet/sil
  // fonksiyonlarının kimliği veri değişince değişmez ve alt ekranlar gereksiz yere yeniden çizilmez.
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const journalsRef = useRef(journals);
  journalsRef.current = journals;
  const certificatesRef = useRef(certificates);
  certificatesRef.current = certificates;
  // Buluta yazımı süren kayıtlar: bu sürede gelen bir snapshot, henüz buluta ulaşmamış yeni kaydı listeden silmesin
  const pendingWriteIdsRef = useRef<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [, setIsAuthInitializing] = useState(false);
  const [indexErrorUrl] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalFilterModalOpen, setIsGlobalFilterModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");

  // Navigation tabs state
  const [currentTab, setCurrentTab] = useState<
    | "dashboard"
    | "deep-analysis"
    | "journal"
    | "notes"
    | "certificates"
  >("dashboard");

  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Account Category Switcher State (ALL | FUNDED | CHALLENGE | DEMO)
  const [activeAccountCategory, setActiveAccountCategory] = useState<AccountCategory>(() => {
    try {
      const saved = localStorage.getItem('tj_active_account_category');
      if (saved === 'DEMO' || saved === 'FUNDED' || saved === 'CHALLENGE' || saved === 'ALL') {
        return saved as AccountCategory;
      }
    } catch (e) {}
    return 'ALL';
  });

  const handleAccountCategoryChange = useCallback((category: AccountCategory) => {
    setActiveAccountCategory(category);
    try {
      localStorage.setItem('tj_active_account_category', category);
    } catch (e) {}
  }, []);

  const [categoryVersion, setCategoryVersion] = useState(0);

  useEffect(() => {
    const handleCatUpdate = () => {
      setCategoryVersion((v) => v + 1);
    };
    window.addEventListener('tj_platform_categories_updated', handleCatUpdate);
    return () => {
      window.removeEventListener('tj_platform_categories_updated', handleCatUpdate);
    };
  }, []);

  const accountCategoryCounts = useMemo(() => {
    let funded = 0;
    let challenge = 0;
    let demo = 0;
    const customCategories = getStoredPlatformCategories();
    trades.forEach((t) => {
      const cat = getTradeAccountCategory(t, customCategories);
      if (cat === 'FUNDED') funded++;
      else if (cat === 'CHALLENGE') challenge++;
      else demo++;
    });
    return {
      all: trades.length,
      funded,
      challenge,
      demo,
    };
  }, [trades, categoryVersion]);

    const {
    globalSelectedConfirmations,
    setGlobalSelectedConfirmations,
    globalSelectedConcepts,
    setGlobalSelectedConcepts,
    globalSelectedPlanFidelity,
    setGlobalSelectedPlanFidelity,
    globalSelectedPlatforms,
    setGlobalSelectedPlatforms,
    globalSelectedAssets,
    setGlobalSelectedAssets,
    globalSelectedSessions,
    setGlobalSelectedSessions,
    globalSelectedTimeframes,
    setGlobalSelectedTimeframes,
    globalSelectedHtfTimeframes,
    setGlobalSelectedHtfTimeframes,
    globalSelectedStatuses,
    setGlobalSelectedStatuses,
    globalSelectedTypes,
    setGlobalSelectedTypes,
    globalSelectedEntryModels,
    setGlobalSelectedEntryModels,
    globalSelectedTrendTypes,
    setGlobalSelectedTrendTypes,
    globalDateLimit,
    setGlobalDateLimit,
    globalMinAsiaRangePips,
    setGlobalMinAsiaRangePips,
    globalMaxAsiaRangePips,
    setGlobalMaxAsiaRangePips,
    globalMinMaePips,
    setGlobalMinMaePips,
    globalMaxMaePips,
    setGlobalMaxMaePips,
    globalMinMfePips,
    setGlobalMinMfePips,
    globalMaxMfePips,
    setGlobalMaxMfePips,
    setIsQuantMode,
  } = useAppStore();

  useEffect(() => {
    document.title = "Trading Journal";
  }, [false]);

  // Custom platforms management state persistent
  const [platforms, setPlatforms] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_platforms_list");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PLATFORMS;
  });
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  // Koşullu `{open && <Modal/>}` çıkış animasyonunu keser: kapanış animasyonu bitene kadar bağlı tut
  const platformMenuMounted = useExitMount(isPlatformMenuOpen);
  const authModalMounted = useExitMount(isAuthModalOpen);
  const copilotMounted = useExitMount(isCopilotOpen);

  // Üst navigasyon çubuğu yüksekliği: pencere katmanları bunun altından başlar, çubuk hep görünür kalır
  const headerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const sync = () => root.style.setProperty('--nav-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    sync();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const persistPlatforms = useCallback((updated: string[], syncCloud = true) => {
    setPlatforms(updated);
    try {
      localStorage.setItem("trading_platforms_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ platforms: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [timeframes, setTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_timeframes_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TIMEFRAMES;
  });

  const persistTimeframes = useCallback((updated: string[], syncCloud = true) => {
    setTimeframes(updated);
    try {
      localStorage.setItem("trading_timeframes_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ timeframes: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [htfTimeframes, setHtfTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_htf_timeframes_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HTF_TIMEFRAMES;
  });

  const persistHtfTimeframes = useCallback((updated: string[], syncCloud = true) => {
    setHtfTimeframes(updated);
    try {
      localStorage.setItem("trading_htf_timeframes_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ htfTimeframes: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [confirmations, setConfirmations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_confirmations_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIRMATIONS;
  });

  const persistConfirmations = useCallback((updated: string[], syncCloud = true) => {
    setConfirmations(updated);
    try {
      localStorage.setItem("trading_confirmations_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ confirmations: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [liquiditySweeps, setLiquiditySweeps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_liquidity_sweeps_list") || localStorage.getItem("trading_concepts_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_LIQUIDITY_SWEEPS;
  });

  const persistLiquiditySweeps = useCallback((updated: string[], syncCloud = true) => {
    setLiquiditySweeps(updated);
    try {
      localStorage.setItem("trading_liquidity_sweeps_list", JSON.stringify(updated));
      localStorage.setItem("trading_concepts_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ liquiditySweeps: updated, concepts: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const concepts = liquiditySweeps;
  const persistConcepts = persistLiquiditySweeps;

  const [sessions, setSessions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_sessions_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SESSIONS;
  });

  const persistSessions = useCallback((updated: string[], syncCloud = true) => {
    setSessions(updated);
    try {
      localStorage.setItem("trading_sessions_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ sessions: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [assets, setAssets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_assets_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ASSETS;
  });

  const persistAssets = useCallback((updated: string[], syncCloud = true) => {
    setAssets(updated);
    try {
      localStorage.setItem("trading_assets_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ assets: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [planFidelities, setPlanFidelities] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_plan_fidelities_list");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PLAN_FIDELITIES;
  });

  const persistPlanFidelities = useCallback((updated: string[], syncCloud = true) => {
    setPlanFidelities(updated);
    try {
      localStorage.setItem("trading_plan_fidelities_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ planFidelities: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [entryModels, setEntryModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_entry_models_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ENTRY_MODELS;
  });

  const persistEntryModels = useCallback((updated: string[], syncCloud = true) => {
    setEntryModels(updated);
    try {
      localStorage.setItem("trading_entry_models_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ entryModels: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [trendTypes, setTrendTypes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_trend_types_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TREND_TYPES;
  });

  const persistTrendTypes = useCallback((updated: string[], syncCloud = true) => {
    setTrendTypes(updated);
    try {
      localStorage.setItem("trading_trend_types_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ trendTypes: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [tpTargets, setTpTargets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_tp_targets_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TP_TARGETS;
  });

  const persistTpTargets = useCallback((updated: string[], syncCloud = true) => {
    setTpTargets(updated);
    try {
      localStorage.setItem("trading_tp_targets_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ tpTargets: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [premiumDiscounts, setPremiumDiscounts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_premium_discounts_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PREMIUM_DISCOUNTS;
  });

  const persistPremiumDiscounts = useCallback((updated: string[], syncCloud = true) => {
    setPremiumDiscounts(updated);
    try {
      localStorage.setItem("trading_premium_discounts_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ premiumDiscounts: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [entryHours, setEntryHours] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_entry_hours_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ENTRY_HOURS;
  });

  const persistEntryHours = useCallback((updated: string[], syncCloud = true) => {
    setEntryHours(updated);
    try {
      localStorage.setItem("trading_entry_hours_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ entryHours: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [strategies, setStrategies] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_strategies_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STRATEGIES;
  });

  const persistStrategies = useCallback((updated: string[], syncCloud = true) => {
    setStrategies(updated);
    try {
      localStorage.setItem("trading_strategies_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ strategies: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [asiaRangeFvgs, setAsiaRangeFvgs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_asia_range_fvgs_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ASIA_RANGE_FVGS;
  });

  const persistAsiaRangeFvgs = useCallback((updated: string[], syncCloud = true) => {
    setAsiaRangeFvgs(updated);
    try {
      localStorage.setItem("trading_asia_range_fvgs_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ asiaRangeFvgs: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [newsDays, setNewsDays] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_news_days_list");
      if (stored) return normalizeNewsDays(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_NEWS_DAYS;
  });

  const persistNewsDays = useCallback((updated: string[], syncCloud = true) => {
    const normalized = normalizeNewsDays(updated);
    setNewsDays(normalized);
    try {
      localStorage.setItem("trading_news_days_list", JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(NEWS_DAYS_EVENT));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ newsDays: normalized, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [definitionTitles, setDefinitionTitles] = useState<DefinitionTitles>(() => {
    try {
      const stored = localStorage.getItem("trading_definition_titles");
      if (stored) {
        const parsed = JSON.parse(stored);
        return sanitizeDefinitionTitles(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DEFINITION_TITLES;
  });

  const persistDefinitionTitles = useCallback((updated: DefinitionTitles, syncCloud = true) => {
    const sanitized = sanitizeDefinitionTitles(updated);
    setDefinitionTitles(sanitized);
    try {
      localStorage.setItem("trading_definition_titles", JSON.stringify(sanitized));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ definitionTitles: sanitized, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Synchronize custom inputs revision
  useEffect(() => {
    try {
      const DEFINITIONS_REVISION = "2026_10_inputs_v3";
      const currentRev = localStorage.getItem("trading_definitions_revision");
      if (currentRev !== DEFINITIONS_REVISION) {
        // Eski sürümler burada kullanıcının listelerini varsayılana çeviriyordu (veri kaybı). Artık yalnızca sürüm işaretlenir
        // ve başlık adı göçü yapılır; kullanıcının kendi tanımlamalarına dokunulmaz.
        localStorage.setItem("trading_definitions_revision", DEFINITIONS_REVISION);
        setDefinitionTitles(prev => sanitizeDefinitionTitles({ ...prev, timeframes: "Entry Timeframe" }));
        const storedTitles = localStorage.getItem("trading_definition_titles");
        const parsedTitles = storedTitles ? JSON.parse(storedTitles) : {};
        localStorage.setItem("trading_definition_titles", JSON.stringify(sanitizeDefinitionTitles({ ...parsedTitles, timeframes: "Entry Timeframe" })));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Settings menu state
  // Locked to USD per request
  const currency = "$";
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [detailedTrade, setDetailedTrade] = useState<Trade | null>(null);

  // Form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Authentication & Load database from localStorage or Firestore
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'q' || e.key === 'Q' || e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsQuantMode(!false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [false, setIsQuantMode]);

  useEffect(() => {
    const loadLocal = () => {
      try {
        const storedTrades = localStorage.getItem("trading_journal_db");
        if (storedTrades) {
          setTrades(JSON.parse(storedTrades));
        } else {
          setTrades([]);
        }

        const storedNotes = localStorage.getItem("trading_journal_notes");
        if (storedNotes) {
          setNotes(JSON.parse(storedNotes));
        } else {
          setNotes([]);
        }

        const storedJournals = localStorage.getItem("trading_journal_journals");
        if (storedJournals) {
          setJournals(JSON.parse(storedJournals));
        } else {
          setJournals([]);
        }

        const storedCertificates = localStorage.getItem("trading_journal_certificates");
        if (storedCertificates) {
          setCertificates(JSON.parse(storedCertificates));
        } else {
          setCertificates([]);
        }
      } catch (err) {
        console.error("Failed to parse from local storage:", err);
      }
      setIsLoading(false);
    };

    // INSTANT CACHE LOAD: Preload immediately to avoid waiting for Firebase Auth or Firestore
    loadLocal();

    let unsubscribeNotes: (() => void) | undefined;
    let unsubscribeJournals: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthInitializing(false);

      if (unsubscribeNotes) {
        unsubscribeNotes();
        unsubscribeNotes = undefined;
      }
      if (unsubscribeJournals) {
        unsubscribeJournals();
        unsubscribeJournals = undefined;
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
        unsubscribeSettings = undefined;
      }

      if (currentUser) {
        // Sync settings
        unsubscribeSettings = onSnapshot(
          doc(db, "settings", currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.platforms) persistPlatforms(data.platforms, false);
              if (data.timeframes) persistTimeframes(data.timeframes, false);
              if (data.htfTimeframes) persistHtfTimeframes(data.htfTimeframes, false);
              if (data.confirmations) persistConfirmations(data.confirmations, false);
              if (data.concepts) persistConcepts(data.concepts, false);
              if (data.sessions) persistSessions(data.sessions, false);
              if (data.assets) persistAssets(data.assets, false);
              if (data.planFidelities) persistPlanFidelities(data.planFidelities, false);
              if (data.entryModels) persistEntryModels(data.entryModels, false);
              if (data.trendTypes) persistTrendTypes(data.trendTypes, false);
              if (data.tpTargets) persistTpTargets(data.tpTargets, false);
              if (data.premiumDiscounts) persistPremiumDiscounts(data.premiumDiscounts, false);
              if (data.entryHours) persistEntryHours(data.entryHours, false);
              if (data.newsDays) persistNewsDays(data.newsDays, false);
              if (data.strategies) persistStrategies(data.strategies, false);
              if (data.asiaRangeFvgs) persistAsiaRangeFvgs(data.asiaRangeFvgs, false);
              if (data.definitionTitles) persistDefinitionTitles(data.definitionTitles, false);
              if (data.displayName) {

                setUser((prevUser) => {
                  if (prevUser && prevUser.displayName !== data.displayName) {
                    return {
                      ...prevUser,
                      displayName: data.displayName
                    } as User;
                  }
                  return prevUser;
                });
              }
            }
          },
          (err) => console.error("Firestore read settings error", err)
        );
      } else {
        // Not logged in: Just stop showing loading. We keep local data so they can use it offline!
        setIsLoading(false);
      }

    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeNotes) {
        unsubscribeNotes();
      }
      if (unsubscribeJournals) {
        unsubscribeJournals();
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
      }
    };
  }, []);

  // Sync trades, notes, and journals directly using fast single-field index
  useEffect(() => {
    let unsubscribeTrades: (() => void) | undefined;
    let unsubscribeNotes: (() => void) | undefined;
    let unsubscribeJournals: (() => void) | undefined;
    let unsubscribeCertificates: (() => void) | undefined;

    if (user) {
      if (trades.length === 0) {
        setIsLoading(true);
      }

      // --- TRADES ---
      const qTrades = query(
        collection(db, "trades"),
        where("userId", "==", user.uid)
      );
      // Local-only trades (created before login) are uploaded exactly once, on the first snapshot that comes from the
      // server. After that the cloud is the source of truth; otherwise a stale device re-uploads trades that were
      // deleted elsewhere and they "come back from the dead".
      let tradesInitialSyncDone = false;
      unsubscribeTrades = onSnapshot(
        qTrades,
        (querySnapshot) => {
          const fromCache = querySnapshot.metadata.fromCache;
          const cloudTrades: Trade[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudTrades.push({ ...data, id: docSnap.id } as Trade);
          });
          cloudTrades.sort((a, b) => b.createdAt - a.createdAt);

          setTrades((prevLocal) => {
            if (isClearingRef.current) return [];
            if (tradesInitialSyncDone) {
              const cloudIdSet = new Set(cloudTrades.map((t) => t.id));
              const stillSaving = prevLocal.filter((t) => !cloudIdSet.has(t.id) && pendingWriteIdsRef.current.has(t.id));
              const next = stillSaving.length ? [...cloudTrades, ...stillSaving].sort((a, b) => b.createdAt - a.createdAt) : cloudTrades;
              try {
                localStorage.setItem("trading_journal_db", JSON.stringify(next));
              } catch (err) {}
              return next;
            }
            const cloudIds = new Set(cloudTrades.map((t) => t.id));
            const unsyncedLocal = prevLocal.filter((t) => !cloudIds.has(t.id));

            if (!fromCache) {
              tradesInitialSyncDone = true;
              unsyncedLocal.forEach((trade) => {
                setDoc(doc(db, "trades", trade.id), cleanForFirestore({
                  ...trade,
                  userId: user.uid,
                })).catch((e) => console.error("Sync local trade to cloud error:", e));
              });
            }

            const merged = [...cloudTrades, ...unsyncedLocal].sort((a, b) => b.createdAt - a.createdAt);
            try {
              localStorage.setItem("trading_journal_db", JSON.stringify(merged));
            } catch (err) {}
            return merged;
          });
          setIsLoading(false);
        },
        (err) => {
          console.error("Firestore read error:", err);
          setIsLoading(false);
        }
      );

      // --- NOTES / JOURNALS / CERTIFICATES ---
      // Üçü de aynı kuralla senkronlanır: yerelde olup bulutta olmayan kayıtlar yalnızca ilk sunucu
      // snapshot'ında yüklenir; sonrasında bulut tek doğru kaynaktır. (Eskiden her snapshot'ta yeniden
      // yüklendiği için başka cihazda silinen not/günlük/sertifika geri geliyordu.)
      const watchCollection = <T extends { id: string }>(
        colName: string,
        getLocal: () => T[],
        setLocal: (next: T[]) => void,
        sortFn: (a: T, b: T) => number,
        onError?: () => void,
      ) => {
        let initialSyncDone = false;
        return onSnapshot(
          query(collection(db, colName), where("userId", "==", user.uid)),
          (snap) => {
            const cloud: T[] = [];
            snap.forEach((d) => cloud.push({ ...d.data(), id: d.id } as unknown as T));
            if (isClearingRef.current) {
              setLocal([]);
              return;
            }
            const cloudIds = new Set(cloud.map((x) => x.id));
            const local = getLocal();
            let extra: T[];
            if (!initialSyncDone) {
              extra = local.filter((x) => !cloudIds.has(x.id));
              if (!snap.metadata.fromCache) {
                initialSyncDone = true;
                extra.forEach((item) => {
                  setDoc(doc(db, colName, item.id), cleanForFirestore({ ...(item as any), userId: user.uid }))
                    .catch((e) => console.error(`Sync local ${colName} to cloud error:`, e));
                });
              }
            } else {
              extra = local.filter((x) => !cloudIds.has(x.id) && pendingWriteIdsRef.current.has(x.id));
            }
            setLocal([...cloud, ...extra].sort(sortFn));
          },
          (err) => {
            console.error(`Firestore read ${colName} error:`, err);
            onError?.();
          },
        );
      };
      const byDateDesc = (a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime();

      unsubscribeNotes = watchCollection<Note>("notes", () => notesRef.current, setNotes, (a, b) => b.updatedAt - a.updatedAt);
      unsubscribeJournals = watchCollection<JournalEntry>("journals", () => journalsRef.current, setJournals, byDateDesc);
      unsubscribeCertificates = watchCollection<Certificate>("certificates", () => certificatesRef.current, setCertificates, byDateDesc);
    } else {
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeTrades) unsubscribeTrades();
      if (unsubscribeNotes) unsubscribeNotes();
      if (unsubscribeJournals) unsubscribeJournals();
      if (unsubscribeCertificates) unsubscribeCertificates();
    };
  }, [user]);

  // Synchronize state across tabs and local events
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const tradesRaw = localStorage.getItem("trading_journal_db");
        if (tradesRaw) setTrades(JSON.parse(tradesRaw));

        const notesRaw = localStorage.getItem("trading_journal_notes");
        if (notesRaw) setNotes(JSON.parse(notesRaw));

        const journalsRaw = localStorage.getItem("trading_journal_journals");
        if (journalsRaw) setJournals(JSON.parse(journalsRaw));

        const certsRaw = localStorage.getItem("trading_journal_certificates");
        if (certsRaw) setCertificates(JSON.parse(certsRaw));

        const platformsRaw = localStorage.getItem("trading_platforms_list");
        if (platformsRaw) setPlatforms(JSON.parse(platformsRaw));

        const timeframesRaw = localStorage.getItem("trading_timeframes_list");
        if (timeframesRaw) setTimeframes(JSON.parse(timeframesRaw));

        const htfRaw = localStorage.getItem("trading_htf_timeframes_list");
        if (htfRaw) setHtfTimeframes(JSON.parse(htfRaw));

        const confsRaw = localStorage.getItem("trading_confirmations_list");
        if (confsRaw) setConfirmations(JSON.parse(confsRaw));

        const conceptsRaw = localStorage.getItem("trading_liquidity_sweeps_list") || localStorage.getItem("trading_concepts_list");
        if (conceptsRaw) setLiquiditySweeps(JSON.parse(conceptsRaw));

        const sessionsRaw = localStorage.getItem("trading_sessions_list");
        if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));

        const assetsRaw = localStorage.getItem("trading_assets_list");
        if (assetsRaw) setAssets(JSON.parse(assetsRaw));
      } catch (err) {
        console.error("Storage sync parse error:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    setIsSettingsOpen(false);
    try {
      await logout();
      setTrades([]);
      setNotes([]);
      setJournals([]);
      setCertificates([]);
      try {
        localStorage.removeItem("trading_journal_db");
        localStorage.removeItem("trading_journal_notes");
        localStorage.removeItem("trading_journal_journals");
        localStorage.removeItem("trading_journal_certificates");
      } catch (e) {}
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const handleUpdateUsername = useCallback(async (newUsername: string) => {
    if (!user) return;
    const trimmed = newUsername.trim();
    if (!trimmed) {
      toast.error("Kullanıcı adı boş olamaz.");
      return;
    }
    try {
      await updateProfile(user, { displayName: trimmed });
      setUser({
        ...user,
        displayName: trimmed
      } as User);
      await setDoc(doc(db, "settings", user.uid), cleanForFirestore({
        displayName: trimmed,
        userId: user.uid
      }), { merge: true });
      toast.success("Kullanıcı adı başarıyla güncellendi!");
      setIsEditingUsername(false);
    } catch (err) {
      console.error("Kullanıcı adı güncellenirken hata oluştu:", err);
      toast.error("Kullanıcı adı güncellenemedi.");
    }
  }, [user]);

  // Create or Update single trade
  const handleSaveTrade = useCallback(
    async (
      tradeData: Omit<Trade, "id" | "createdAt"> & {
        id?: string;
        createdAt?: number;
      },
    ) => {
      const isNew = !tradeData.id;
      const finalTradeId = tradeData.id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      
      let initialTrade: Trade;
      if (isNew) {
        initialTrade = {
          ...tradeData,
          id: finalTradeId,
          createdAt: tradeData.createdAt || Date.now(),
        } as Trade;
      } else {
        initialTrade = {
          ...trades.find((t) => t.id === finalTradeId),
          ...tradeData,
        } as Trade;
        delete (initialTrade as any).entryDate;
      }
      delete (initialTrade as any).exitReason; // alan projeden kaldırıldı; eski kayıtlardan da düşer

      const existingTrade = trades.find((t) => t.id === finalTradeId);

      if (user) pendingWriteIdsRef.current.add(finalTradeId);

      // Optimistic update
      setTrades((prevTrades) => {
        let updatedTrades: Trade[];
        if (isNew) {
          updatedTrades = [initialTrade, ...prevTrades].sort((a, b) => b.createdAt - a.createdAt);
        } else {
          updatedTrades = prevTrades
            .map((t) => (t.id === finalTradeId ? initialTrade : t))
            .sort((a, b) => b.createdAt - a.createdAt);
        }
        
        if (!user) {
          try {
            localStorage.setItem("trading_journal_db", JSON.stringify(updatedTrades));
          } catch (err) {
            console.error("Local storage quota exceeded:", err);
            toast.error("Tarayıcı hafızası dolu! Eski verileri temizleyebilir veya bulut ile senkronize edebilirsiniz.");
          }
        }
        return updatedTrades;
      });

      let processedTradeData = { ...initialTrade };
      if (user && processedTradeData.screenshot && processedTradeData.screenshot.startsWith('data:image')) {
        try {
          const downloadUrl = await uploadImageToStorage(user.uid, processedTradeData.screenshot, 'trades');
          processedTradeData.screenshot = downloadUrl;
        } catch (error) {
          console.error("Görsel yükleme hatası:", error);
          toast.error("Görsel yüklenemedi, işlem metin olarak kaydedilecek.");
          processedTradeData.screenshot = null;
        }
      }

      if (user) {
        const finalTradeToCloud = {
          ...processedTradeData,
          id: finalTradeId,
          createdAt: processedTradeData.createdAt || Date.now(),
          userId: user.uid,
        };
        if (!isNew && existingTrade) {
          Object.assign(finalTradeToCloud, existingTrade, processedTradeData);
        }
        delete (finalTradeToCloud as any).entryDate;
        delete (finalTradeToCloud as any).exitReason;

        setDoc(doc(db, "trades", finalTradeId), cleanForFirestore(finalTradeToCloud)).catch((err) => {
          console.error("Failed to save to cloud:", err);
          toast.error("İşlem buluta kaydedilemedi, değişiklik geri alındı.");
          setTrades((current) => {
            if (isNew) {
              return current.filter(t => t.id !== finalTradeId);
            } else {
              return current.map(t => t.id === finalTradeId ? (existingTrade as Trade) : t);
            }
          });
        }).finally(() => pendingWriteIdsRef.current.delete(finalTradeId));

      }

      // Auto-sync any newly entered assets, concepts, confirmations, platforms, or sessions into global lists
      let settingsUpdates: any = null;

      if (tradeData.asset && !assets.some(a => a.toLowerCase() === tradeData.asset.toLowerCase())) {
        const newAssets = [...assets, tradeData.asset];
        persistAssets(newAssets, false);
        settingsUpdates = { ...settingsUpdates, assets: newAssets };
      }
      if (tradeData.platform && !platforms.includes(tradeData.platform)) {
        const newPlatforms = [...platforms, tradeData.platform];
        persistPlatforms(newPlatforms, false);
        settingsUpdates = { ...settingsUpdates, platforms: newPlatforms };
      }
      const sweepsToCheck = Array.isArray(tradeData.liquiditySweeps)
        ? tradeData.liquiditySweeps
        : tradeData.liquiditySweep
        ? [tradeData.liquiditySweep]
        : tradeData.concept
        ? [tradeData.concept]
        : [];
      
      const newItems = sweepsToCheck.filter(s => s && !liquiditySweeps.includes(s));
      if (newItems.length > 0) {
        const newSweeps = [...liquiditySweeps, ...newItems];
        persistLiquiditySweeps(newSweeps, false);
        settingsUpdates = { ...settingsUpdates, liquiditySweeps: newSweeps, concepts: newSweeps };
      }
      if (tradeData.session && !sessions.includes(tradeData.session)) {
        const newSessions = [...sessions, tradeData.session];
        persistSessions(newSessions, false);
        settingsUpdates = { ...settingsUpdates, sessions: newSessions };
      }
      if (tradeData.timeframe && !timeframes.includes(tradeData.timeframe)) {
        const newTimeframes = [...timeframes, tradeData.timeframe];
        persistTimeframes(newTimeframes, false);
        settingsUpdates = { ...settingsUpdates, timeframes: newTimeframes };
      }
      if (tradeData.htfTimeframe && !htfTimeframes.includes(tradeData.htfTimeframe)) {
        const newHtfTimeframes = [...htfTimeframes, tradeData.htfTimeframe];
        persistHtfTimeframes(newHtfTimeframes, false);
        settingsUpdates = { ...settingsUpdates, htfTimeframes: newHtfTimeframes };
      }
      if (tradeData.confirmations && tradeData.confirmations.length > 0) {
        const newConfs = tradeData.confirmations.filter(c => !confirmations.includes(c));
        if (newConfs.length > 0) {
          const mergedConfs = [...confirmations, ...newConfs];
          persistConfirmations(mergedConfs, false);
          settingsUpdates = { ...settingsUpdates, confirmations: mergedConfs };
        }
      }
      if (tradeData.planFidelity && !planFidelities.includes(tradeData.planFidelity)) {
        const newFidelities = [...planFidelities, tradeData.planFidelity];
        persistPlanFidelities(newFidelities, false);
        settingsUpdates = { ...settingsUpdates, planFidelities: newFidelities };
      }
      if (tradeData.entryModels && Array.isArray(tradeData.entryModels) && tradeData.entryModels.length > 0) {
        const newEntries = tradeData.entryModels.filter((em: string) => !entryModels.includes(em));
        if (newEntries.length > 0) {
          const mergedEntries = [...entryModels, ...newEntries];
          persistEntryModels(mergedEntries, false);
          settingsUpdates = { ...settingsUpdates, entryModels: mergedEntries };
        }
      } else if (tradeData.entry && !entryModels.includes(tradeData.entry)) {
        const newEntries = [...entryModels, tradeData.entry];
        persistEntryModels(newEntries, false);
        settingsUpdates = { ...settingsUpdates, entryModels: newEntries };
      }
      if (tradeData.trend && !trendTypes.includes(tradeData.trend)) {
        const newTrends = [...trendTypes, tradeData.trend];
        persistTrendTypes(newTrends, false);
        settingsUpdates = { ...settingsUpdates, trendTypes: newTrends };
      }

      if (user && settingsUpdates) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ ...settingsUpdates, userId: user.uid }), { merge: true })
          .catch(err => console.error("Batch settings sync error:", err));
      }

      toast.success(isNew ? "İşlem başarıyla kaydedildi." : "İşlem başarıyla güncellendi.");
      setEditingTrade(null);
      setIsFormOpen(false);
    },
    [
      user,
      trades,
      assets,
      platforms,
      concepts,
      sessions,
      timeframes,
      htfTimeframes,
      confirmations,
      planFidelities,
      entryModels,
      trendTypes,
      persistAssets,
      persistPlatforms,
      persistConcepts,
      persistSessions,
      persistTimeframes,
      persistHtfTimeframes,
      persistConfirmations,
      persistPlanFidelities,
      persistEntryModels,
      persistTrendTypes,
    ],
  );

  // Start Edit Mode action
  const handleStartEdit = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
    setDetailedTrade(null);
  }, []);

  const handleSaveTradeAndClose = useCallback(async (tradeData: any) => {
    await handleSaveTrade(tradeData);
    setIsFormOpen(false);
  }, [handleSaveTrade]);

  const handleCancelEdit = useCallback(() => {
    setEditingTrade(null);
    setIsFormOpen(false);
  }, []);

  const handleCloseTradeDetail = useCallback(() => {
    setDetailedTrade(null);
  }, []);

  // ESC key listener for overlays and modals in App
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isFormOpen) {
          handleCancelEdit();
        } else if (isPlatformMenuOpen) {
          setIsPlatformMenuOpen(false);
        } else if (detailedTrade) {
          handleCloseTradeDetail();
        } else if (isGlobalFilterModalOpen) {
          setIsGlobalFilterModalOpen(false);
        } else if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen, isFormOpen, isPlatformMenuOpen, detailedTrade, isGlobalFilterModalOpen, isAuthModalOpen, handleCancelEdit, handleCloseTradeDetail]);

  // Close settings dropdown when clicking anywhere outside
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, [isSettingsOpen]);

  // Close profile dropdown when clicking anywhere outside
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, [isProfileOpen]);

  // Delete single trade
  const handleDeleteTrade = useCallback(
    async (id: string) => {
      // Silinecek kayıt, setState güncelleyicisinin içinden DEĞİL, mevcut listeden okunur:
      // güncelleyici gecikmeli çalışabildiğinden önceki sürümde bulut silme çağrısı hiç yapılmıyordu
      // ve silinen işlem bir sonraki senkronizasyonda geri geliyordu.
      const deletedTrade = trades.find((t) => t.id === id);

      setTrades((prevTrades) => {
        const updated = prevTrades.filter((t) => t.id !== id);
        if (!user) {
          try {
            localStorage.setItem("trading_journal_db", JSON.stringify(updated));
          } catch (err) {
            console.error(err);
          }
        }
        return updated;
      });

      if (user) {
        deleteDoc(doc(db, "trades", id)).catch((err) => {
          console.error("Failed to delete from cloud", err);
          toast.error("İşlem buluttan silinemedi, geri yüklendi.");
          if (deletedTrade) {
            setTrades((current) =>
              current.some((t) => t.id === id)
                ? current
                : [...current, deletedTrade].sort((a, b) => b.createdAt - a.createdAt)
            );
          }
        });
      }

      toast.success("İşlem başarıyla silindi.");
      setDetailedTrade((prev) => (prev?.id === id ? null : prev));
      // Cancel editing if matches
      setEditingTrade((prev) => {
        if (prev?.id === id) {
          setIsFormOpen(false);
          return null;
        }
        return prev;
      });
    },
    [user, trades]
  );

  // Delete all trades for a specific platform
  const handleDeleteTradesByPlatform = useCallback(
    async (platformName: string) => {
      const targetPlat = platformName.trim().toLowerCase();
      // Güncelleyicinin dışında, mevcut listeden hesaplanır (aynı gecikmeli-güncelleyici hatası).
      const removedTrades = trades.filter(
        (t) => (t.platform || '').trim().toLowerCase() === targetPlat
      );

      setTrades((prevTrades) => {
        const updated = prevTrades.filter(
          (t) => (t.platform || '').trim().toLowerCase() !== targetPlat
        );
        if (!user) {
          try {
            localStorage.setItem("trading_journal_db", JSON.stringify(updated));
          } catch (err) {
            console.error(err);
          }
        }
        return updated;
      });

      if (user && removedTrades.length > 0) {
        removedTrades.forEach((t) => {
          deleteDoc(doc(db, "trades", t.id)).catch((err) => {
            console.error("Failed to delete platform trade from cloud", err);
            setTrades((current) =>
              current.some((x) => x.id === t.id)
                ? current
                : [...current, t].sort((a, b) => b.createdAt - a.createdAt)
            );
          });
        });
      }

      setDetailedTrade((prev) =>
        prev && (prev.platform || '').trim().toLowerCase() === targetPlat ? null : prev
      );
      setEditingTrade((prev) => {
        if (prev && (prev.platform || '').trim().toLowerCase() === targetPlat) {
          setIsFormOpen(false);
          return null;
        }
        return prev;
      });
    },
    [user, trades]
  );
  // Tanımlamalar'da bir öğe yeniden adlandırılınca, ona bağlı tüm işlemlerdeki değer de güncellenir
  // (aksi halde eski kayıtlar eski adla kalır ve istatistik gruplaması ikiye bölünür).
  const handleRenameDefinition = useCallback(
    (category: string, from: string, to: string): number => {
      const fromKey = from.trim().toLowerCase();
      const same = (v?: string | null) => typeof v === "string" && v.trim().toLowerCase() === fromKey;
      const mapStr = (v?: string) => (same(v) ? to : v);
      const dedupe = (arr: string[]) => arr.filter((x, i) => arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
      const mapArr = (v?: string[]) => (Array.isArray(v) ? dedupe(v.map((x) => (same(x) ? to : x))) : v);
      const splitJoined = (v?: string) => (typeof v === "string" && v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);
      const hasInArr = (v?: string[]) => Array.isArray(v) && v.some(same);

      const patchFor = (t: Trade): Partial<Trade> | null => {
        switch (category) {
          case "platforms": return same(t.platform) ? { platform: to } : null;
          case "assets": return same(t.asset) ? { asset: to } : null;
          case "timeframes": return same(t.timeframe) ? { timeframe: to } : null;
          case "htfTimeframes": return same(t.htfTimeframe) ? { htfTimeframe: to } : null;
          case "sessions": return same(t.session) ? { session: to } : null;
          case "planFidelities": return same(t.planFidelity) ? { planFidelity: to } : null;
          case "trendTypes": return same(t.trend) ? { trend: to } : null;
          case "entryHours": return same(t.entryTime) ? { entryTime: to } : null;
          case "premiumDiscounts": return same(t.premiumDiscount) ? { premiumDiscount: to } : null;
          case "strategies": return same(t.strategy) ? { strategy: to } : null;
          case "asiaRangeFvgs": return same(t.asiaRangeFvg) ? { asiaRangeFvg: to } : null;
          case "confirmations": return hasInArr(t.confirmations) ? { confirmations: mapArr(t.confirmations) } : null;
          case "tpTargets": return hasInArr(t.tpTargets) ? { tpTargets: mapArr(t.tpTargets) } : null;
          case "concepts": {
            const base = Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0
              ? t.liquiditySweeps
              : splitJoined(t.liquiditySweep || t.concept);
            if (!base.some(same)) return null;
            const next = mapArr(base) as string[];
            return { liquiditySweeps: next, liquiditySweep: next.join(", "), concept: next.join(", ") };
          }
          case "entryModels": {
            const base = Array.isArray(t.entryModels) && t.entryModels.length > 0 ? t.entryModels : splitJoined(t.entry);
            if (!base.some(same)) return null;
            const next = mapArr(base) as string[];
            return { entryModels: next, entry: next.join(", ") };
          }
          default: return null;
        }
      };

      const changed: Trade[] = [];
      trades.forEach((t) => {
        const patch = patchFor(t);
        if (patch) changed.push({ ...t, ...patch });
      });
      if (changed.length === 0) return 0;

      const byId = new Map(changed.map((t) => [t.id, t]));
      setTrades((prev) => prev.map((t) => byId.get(t.id) || t));

      if (user) {
        changed.forEach((t) => pendingWriteIdsRef.current.add(t.id));
        (async () => {
          try {
            for (let i = 0; i < changed.length; i += 400) {
              const batch = writeBatch(db);
              changed.slice(i, i + 400).forEach((t) => {
                batch.set(doc(db, "trades", t.id), cleanForFirestore({ ...t, userId: user.uid }));
              });
              await batch.commit();
            }
          } catch (err) {
            console.error("Failed to sync renamed definition to cloud:", err);
            toast.error("Yeniden adlandırma buluta tam yazılamadı; bağlantı gelince bir işlemi düzenleyip tekrar deneyin.");
          } finally {
            changed.forEach((t) => pendingWriteIdsRef.current.delete(t.id));
          }
        })();
      }
      return changed.length;
    },
    [user, trades, setTrades]
  );

  // Set Notes

  const handleSaveNote = useCallback(
    async (
      noteData: Note,
      options?: { silent?: boolean }
    ) => {
      const isNew = !noteData.id;
      const finalNoteId = noteData.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const finalNote = { ...noteData, id: finalNoteId };
      const existingNote = notesRef.current.find((n) => n.id === finalNoteId);

      if (user) pendingWriteIdsRef.current.add(finalNoteId);

      setNotes((prevNotes) => {
        let updatedList: Note[];
        if (isNew) {
          updatedList = [finalNote, ...prevNotes].sort(
            (a, b) => b.updatedAt - a.updatedAt,
          );
        } else {
          updatedList = prevNotes
            .map((n) => (n.id === finalNoteId ? finalNote : n))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        }

        return updatedList;
      });

      if (user) {
        setDoc(doc(db, "notes", finalNoteId), cleanForFirestore({
          ...finalNote,
          userId: user.uid,
        })).catch((err) => {
          console.error("Failed to save note to cloud:", err);
          // Rollback optimistic update properly
          setNotes((current) => {
             if (isNew) {
                return current.filter(n => n.id !== finalNoteId);
             } else {
                return current.map(n => n.id === finalNoteId ? (existingNote as Note) : n);
             }
          });
        }).finally(() => pendingWriteIdsRef.current.delete(finalNoteId));

      }
      if (!options?.silent) {
        toast.success(isNew ? "Not başarıyla kaydedildi." : "Not başarıyla güncellendi.");
      }
    },
    [user]
  );
  const handleDeleteNote = useCallback(
    async (id: string) => {
      const deletedNote = notesRef.current.find((n) => n.id === id);
      
      setNotes((prev) => {
        return prev.filter((n) => n.id !== id);
      });
      if (user && deletedNote) {
        deleteDoc(doc(db, "notes", id)).catch((err) => {
          console.error("Failed to delete note from cloud", err);
          setNotes(current => [...current, deletedNote!].sort((a,b) => b.updatedAt - a.updatedAt));
        });
      }
      toast.success("Not başarıyla silindi.");
    },
    [user],
  );

  // Handle Journal Save
  const handleSaveJournal = useCallback(
    async (
      entryData: (Omit<JournalEntry, "id" | "createdAt" | "updatedAt"> & {
        id?: string;
      }) | JournalEntry,
      options?: { silent?: boolean }
    ) => {
      const isNew = !entryData.id;
      const now = Date.now();
      const finalEntry: JournalEntry = {
        ...entryData,
        id: entryData.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `journal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
        createdAt: (entryData as any).createdAt || now,
        updatedAt: now,
      };

      const existingEntry = journalsRef.current.find((j) => j.id === finalEntry.id);
      if (user) pendingWriteIdsRef.current.add(finalEntry.id);

      setJournals((prev) => {
        const updatedList = isNew
          ? [finalEntry, ...prev]
          : prev.map((j) => (j.id === finalEntry.id ? finalEntry : j));
        return updatedList;
  
      });
      if (user) {
        setDoc(doc(db, "journals", finalEntry.id), cleanForFirestore({
          ...finalEntry,
          userId: user.uid,
        })).catch((err) => {
          console.error("Failed to save journal to cloud", err);
          setJournals(current => {
             if (isNew) {
                return current.filter(j => j.id !== finalEntry.id);
             } else {
                return current.map(j => j.id === finalEntry.id ? (existingEntry as JournalEntry) : j);
             }
       
          });
        }).finally(() => pendingWriteIdsRef.current.delete(finalEntry.id));
      }
      if (!options?.silent) {
        toast.success(isNew ? "Günlük kaydı başarıyla eklendi." : "Günlük kaydı başarıyla güncellendi.");
      }
    },
    [user],
  );

  // Handle Journal Delete
  const handleDeleteJournal = useCallback(
    async (id: string) => {
      const deletedJournal = journalsRef.current.find((j) => j.id === id);

      setJournals((prev) => {
        return prev.filter((j) => j.id !== id);
      });
      if (user && deletedJournal) {
        deleteDoc(doc(db, "journals", id)).catch((err) => {
          console.error("Failed to delete journal from cloud", err);
          setJournals(current => [...current, deletedJournal!].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });
      }
      toast.success("Günlük kaydı başarıyla silindi.");
    },
    [user],
  );

  const handleSaveCertificate = useCallback(
    async (certData: Certificate | Omit<Certificate, 'id' | 'createdAt'>) => {
      const isNew = !('id' in certData) || !certData.id;
      const finalCertId = isNew ? `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : (certData as Certificate).id;
      const byDateDesc = (a: Certificate, b: Certificate) => new Date(b.date).getTime() - new Date(a.date).getTime();

      const initialCert = {
        ...certData,
        id: finalCertId,
        createdAt: isNew ? Date.now() : (certData as Certificate).createdAt,
      } as Certificate;

      if (user) pendingWriteIdsRef.current.add(finalCertId);

      // Anında (iyimser) güncelleme; yerel depolamaya yazmayı useLocalStorageState üstlenir
      setCertificates((prev) =>
        (isNew ? [initialCert, ...prev] : prev.map((c) => (c.id === finalCertId ? initialCert : c))).sort(byDateDesc)
      );

      let processedCert = { ...initialCert };
      let uploaded = false;
      if (user && processedCert.image && processedCert.image.startsWith('data:image')) {
        try {
          processedCert.image = await uploadImageToStorage(user.uid, processedCert.image, 'certificates');
          uploaded = true;
        } catch (error) {
          console.warn("Storage upload fallback to embedded image:", error);
          if (processedCert.image.length > 700000) {
            processedCert.image = null;
          }
        }
        // Yükleme sürerken kayıt silindiyse buluta geri yazılmasın (silinen sertifika geri gelmesin)
        if (!certificatesRef.current.some((c) => c.id === finalCertId)) {
          pendingWriteIdsRef.current.delete(finalCertId);
          return;
        }
      }

      // Bulut adresi geldiyse yerel kopyayı da güncelle
      if (uploaded || processedCert.image !== initialCert.image) {
        setCertificates((prev) => prev.map((c) => (c.id === finalCertId ? processedCert : c)).sort(byDateDesc));
      }

      if (user) {
        setDoc(doc(db, "certificates", finalCertId), cleanForFirestore({
          ...processedCert,
          userId: user.uid,
        }))
          .catch((err) => {
            console.error("Failed to save certificate to cloud:", err);
            toast.error("Bulut kaydında gecikme oluştu, verileriniz yerel olarak korundu.");
          })
          .finally(() => pendingWriteIdsRef.current.delete(finalCertId));
      }
      toast.success("Sertifika başarıyla kaydedildi.");
    },
    [user]
  );

  const handleDeleteCertificate = useCallback(
    async (id: string) => {
      const deletedCert = certificatesRef.current.find((c) => c.id === id);
      pendingWriteIdsRef.current.delete(id);

      setCertificates((prev) => prev.filter((c) => c.id !== id));

      if (user) {
        deleteDoc(doc(db, "certificates", id)).catch((err) => {
          console.error("Failed to delete certificate from cloud", err);
          toast.error("Buluttan silinirken hata oluştu.");
          if (deletedCert) {
            setCertificates(current => [...current, deletedCert].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          }
        });
      }
      toast.success("Sertifika başarıyla silindi.");
    },
    [user],
  );

  // Import all app data from JSON Backup
  const handleImportTrades = useCallback(
    async (
      importedTrades: Trade[],
      importedNotes: Note[] = [],
      importedJournals: any[] = [],
      importedCertificates: Certificate[] = [],
      rawImportedSettings: any = null
    ): Promise<boolean> => {
      try {
        const importedSettings = sanitizeImportedSettings(rawImportedSettings);
        if (user) {
          // Prepare Firestore batch write operations in safe chunks of 400
          type WriteOp = { ref: any; data: any };
          const writeOps: WriteOp[] = [];

          importedTrades.forEach((trade) => {
            writeOps.push({
              ref: doc(db, "trades", trade.id),
              data: cleanForFirestore({ ...trade, userId: user.uid }),
            });
          });

          importedNotes.forEach((note) => {
            writeOps.push({
              ref: doc(db, "notes", note.id),
              data: cleanForFirestore({ ...note, userId: user.uid }),
            });
          });

          importedJournals.forEach((journal) => {
            writeOps.push({
              ref: doc(db, "journals", journal.id),
              data: cleanForFirestore({ ...journal, userId: user.uid }),
            });
          });

          importedCertificates.forEach((cert) => {
            writeOps.push({
              ref: doc(db, "certificates", cert.id),
              data: cleanForFirestore({ ...cert, userId: user.uid }),
            });
          });

          // Yazımı süren kayıtlar: bu sürede gelen snapshot, henüz buluta ulaşmamış kaydı silmesin
          writeOps.forEach((op) => pendingWriteIdsRef.current.add(op.ref.id));
          try {
            const chunkSize = 400;
            for (let i = 0; i < writeOps.length; i += chunkSize) {
              const chunk = writeOps.slice(i, i + chunkSize);
              const batch = writeBatch(db);
              chunk.forEach((op) => {
                batch.set(op.ref, op.data);
              });
              await batch.commit();
            }
          } finally {
            writeOps.forEach((op) => pendingWriteIdsRef.current.delete(op.ref.id));
          }

          if (importedSettings) {
            const { platformCategories: _pc, ...cloudSettings } = importedSettings;
            await setDoc(doc(db, "settings", user.uid), cleanForFirestore({ ...cloudSettings, userId: user.uid }), { merge: true });
          }
        }

        // Local State and Storage Update (kayıtlar id'ye göre birleştirilir, aynı id'li kayıt yedekten gelenle değişir)
        if (importedTrades.length > 0) {
          setTrades((prev) => {
            const existingIds = new Set(importedTrades.map((t) => t.id));
            return [...importedTrades, ...prev.filter((t) => !existingIds.has(t.id))].sort((a, b) => b.createdAt - a.createdAt);
          });
        }

        if (importedNotes.length > 0) {
          setNotes((prev) => {
            const existingIds = new Set(importedNotes.map((n) => n.id));
            return [...importedNotes, ...prev.filter((n) => !existingIds.has(n.id))];
          });
        }

        if (importedJournals.length > 0) {
          setJournals((prev) => {
            const existingIds = new Set(importedJournals.map((j) => j.id));
            return [...importedJournals, ...prev.filter((j) => !existingIds.has(j.id))];
          });
        }

        if (importedCertificates.length > 0) {
          setCertificates((prev) => {
            const existingIds = new Set(importedCertificates.map((c) => c.id));
            return [...importedCertificates, ...prev.filter((c) => !existingIds.has(c.id))];
          });
        }

        if (importedSettings) {
          const sync = !!user;
          if (importedSettings.platforms) persistPlatforms(importedSettings.platforms, sync);
          if (importedSettings.timeframes) persistTimeframes(importedSettings.timeframes, sync);
          if (importedSettings.htfTimeframes) persistHtfTimeframes(importedSettings.htfTimeframes, sync);
          if (importedSettings.confirmations) persistConfirmations(importedSettings.confirmations, sync);
          if (importedSettings.concepts) persistConcepts(importedSettings.concepts, sync);
          if (importedSettings.sessions) persistSessions(importedSettings.sessions, sync);
          if (importedSettings.assets) persistAssets(importedSettings.assets, sync);
          if (importedSettings.planFidelities) persistPlanFidelities(importedSettings.planFidelities, sync);
          if (importedSettings.entryModels) persistEntryModels(importedSettings.entryModels, sync);
          if (importedSettings.trendTypes) persistTrendTypes(importedSettings.trendTypes, sync);
          if (importedSettings.tpTargets) persistTpTargets(importedSettings.tpTargets, sync);
          if (importedSettings.premiumDiscounts) persistPremiumDiscounts(importedSettings.premiumDiscounts, sync);
          if (importedSettings.entryHours) persistEntryHours(importedSettings.entryHours, sync);
          if (importedSettings.newsDays) persistNewsDays(importedSettings.newsDays, sync);
          if (importedSettings.strategies) persistStrategies(importedSettings.strategies, sync);
          if (importedSettings.asiaRangeFvgs) persistAsiaRangeFvgs(importedSettings.asiaRangeFvgs, sync);
          if (importedSettings.definitionTitles) persistDefinitionTitles(importedSettings.definitionTitles, sync);
          if (importedSettings.platformCategories) {
            replacePlatformCategories({ ...getStoredPlatformCategories(), ...importedSettings.platformCategories });
          }
        }

        toast.success(
          `Yedek başarıyla yüklendi: ${importedTrades.length} işlem, ${importedNotes.length} not, ${importedJournals.length} günlük, ${importedCertificates.length} sertifika${importedSettings ? " ve tanımlamalar" : ""}.`
        );
        return true;
      } catch (err: any) {
        console.error("Import error in App.tsx:", err);
        toast.error("Yedek verileri içe aktarılırken bir hata oluştu. Hiçbir veri kaybolmadı; tekrar deneyin.");
        return false;
      }
    },
    [
      user,
      persistPlatforms,
      persistTimeframes,
      persistHtfTimeframes,
      persistConfirmations,
      persistConcepts,
      persistSessions,
      persistAssets,
      persistPlanFidelities,
      persistEntryModels,
      persistTrendTypes,
      persistTpTargets,
      persistPremiumDiscounts,
      persistEntryHours,
      persistNewsDays,
      persistStrategies,
      persistAsiaRangeFvgs,
      persistDefinitionTitles,
      setTrades,
      setNotes,
      setJournals,
      setCertificates,
    ],
  );

  // Clear all database & project data
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    isClearingRef.current = true;
    try {
      if (user) {
        // Clear Firebase profile name
        try {
          await updateProfile(user, { displayName: "" });
        } catch (authErr) {
          console.error("Failed to reset auth profile displayName:", authErr);
        }

        // 1. Delete all Firestore user documents across all collections in parallel batches
        const collectionsToClear = [
          "trades",
          "notes",
          "journals",
          "certificates",
        ];
        let cloudFailed = false;

        for (const colName of collectionsToClear) {
          try {
            const q = query(collection(db, colName), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const chunks: any[][] = [];
              let currentChunk: any[] = [];
              snapshot.docs.forEach((d) => {
                currentChunk.push(d.ref);
                if (currentChunk.length >= 400) {
                  chunks.push(currentChunk);
                  currentChunk = [];
                }
              });
              if (currentChunk.length > 0) chunks.push(currentChunk);

              for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach((ref) => batch.delete(ref));
                await batch.commit();
              }
            }
          } catch (colErr) {
            cloudFailed = true;
            console.error(`Error clearing cloud collection ${colName}:`, colErr);
          }
        }

        // Bulut temizliği tamamlanamadıysa yerel veriyi silme: aksi halde kayıtlar bir sonraki senkronda geri gelir
        if (cloudFailed) {
          toast.error("Bulut verileri tamamen silinemedi. Bağlantınızı kontrol edip tekrar deneyin; yerel veriler korundu.");
          return false;
        }

        // Delete user settings documents in Firestore
        try {
          await deleteDoc(doc(db, "settings", user.uid));
        } catch (e) {
          console.error("Failed to delete settings doc:", e);
        }
      }

      // 2. Clear all local storage keys (uygulamanın yazdığı tüm veri ve tanımlama anahtarları)
      const keysToRemove = [
        "trading_journal_db",
        "trading_journal_notes",
        "trading_journal_journals",
        "trading_journal_certificates",
        "trading_platforms_list",
        "trading_timeframes_list",
        "trading_htf_timeframes_list",
        "trading_confirmations_list",
        "trading_concepts_list",
        "trading_liquidity_sweeps_list",
        "trading_sessions_list",
        "trading_assets_list",
        "trading_plan_fidelities_list",
        "trading_entry_models_list",
        "trading_trend_types_list",
        "trading_tp_targets_list",
        "trading_premium_discounts_list",
        "trading_entry_hours_list",
        "trading_news_days_list",
        "trading_strategies_list",
        "trading_asia_range_fvgs_list",
        "trading_definition_titles",
        "trading_definitions_revision",
        "tj_platform_categories",
        "tj_active_account_category",
        "last_used_trade_platform",
        "trading_journal_filters",
        "ai_copilot_last_cleared",
        "ai_copilot_messages",
        "ai_copilot_saved_notes",
        "ai_copilot_persona",
        "ai_copilot_last_trades_count",
        "ai_copilot_last_journals_count",
        "tj_app_access_granted",
        "tj_access_token_v2",
        "tj_access_token_v3",
        "tj_app_lockout",
        "tj_app_attempts"
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (e) {
          console.error(`Failed to remove ${k} from localStorage`, e);
        }
      });

      try {
        sessionStorage.clear();
      } catch (e) {
        console.error("Failed to clear sessionStorage", e);
      }

      // 3. Reset all React States to initial default clean state
      if (user) {
        setUser({
          ...user,
          displayName: ""
        } as User);
      }
      setTrades([]);
      setNotes([]);
      setJournals([]);
      setCertificates([]);

      // Platform kategorileri (Funded / Challenge / Demo) önbelleği de sıfırlanır
      replacePlatformCategories({});
      setActiveAccountCategory('ALL');

      persistPlatforms(DEFAULT_PLATFORMS, !!user);
      persistTimeframes(DEFAULT_TIMEFRAMES, !!user);
      persistHtfTimeframes(DEFAULT_HTF_TIMEFRAMES, !!user);
      persistConfirmations(DEFAULT_CONFIRMATIONS, !!user);
      persistConcepts(DEFAULT_CONCEPTS, !!user);
      persistSessions(DEFAULT_SESSIONS, !!user);
      persistAssets(DEFAULT_ASSETS, !!user);
      persistPlanFidelities(DEFAULT_PLAN_FIDELITIES, !!user);
      persistEntryModels(DEFAULT_ENTRY_MODELS, !!user);
      persistTrendTypes(DEFAULT_TREND_TYPES, !!user);
      persistTpTargets(DEFAULT_TP_TARGETS, !!user);
      persistPremiumDiscounts(DEFAULT_PREMIUM_DISCOUNTS, !!user);
      persistEntryHours(DEFAULT_ENTRY_HOURS, !!user);
      persistNewsDays(DEFAULT_NEWS_DAYS, !!user);
      persistStrategies(DEFAULT_STRATEGIES, !!user);
      persistAsiaRangeFvgs(DEFAULT_ASIA_RANGE_FVGS, !!user);
      persistDefinitionTitles(DEFAULT_DEFINITION_TITLES, !!user);

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
      setGlobalSelectedEntryModels([]);
      setGlobalSelectedTrendTypes([]);
      setGlobalDateLimit("6m");
      setGlobalMinAsiaRangePips(undefined);
      setGlobalMaxAsiaRangePips(undefined);
      setGlobalMinMaePips(undefined);
      setGlobalMaxMaePips(undefined);
      setGlobalMinMfePips(undefined);
      setGlobalMaxMfePips(undefined);

      setEditingTrade(null);
      setDetailedTrade(null);
      setIsFormOpen(false);
      setIsSettingsOpen(false);
      setIsGlobalFilterModalOpen(false);
      setIsCopilotOpen(false);

      // 4. Dispatch global wipe event
      window.dispatchEvent(new CustomEvent("trading-journal-wipe-all"));

      toast.success("Bütün veriler ve ayarlar başarıyla sıfırlandı.");
      return true;
    } catch (err) {
      console.error("Sıfırlama hatası:", err);
      toast.error("Veriler sıfırlanırken bir hata oluştu.");
      return false;
    } finally {
      isClearingRef.current = false;
    }
  }, [
    user,
    setGlobalSelectedConfirmations,
    setGlobalSelectedConcepts,
    setGlobalSelectedPlatforms,
    setGlobalSelectedAssets,
    setGlobalSelectedSessions,
    setGlobalSelectedTimeframes,
    setGlobalSelectedHtfTimeframes,
    setGlobalSelectedStatuses,
    setGlobalSelectedTypes,
    setGlobalSelectedEntryModels,
    setGlobalSelectedTrendTypes,
    setGlobalDateLimit,
    setGlobalMinAsiaRangePips,
    setGlobalMaxAsiaRangePips,
    setGlobalMinMaePips,
    setGlobalMaxMaePips,
    setGlobalMinMfePips,
    setGlobalMaxMfePips,
    setTrades,
    setNotes,
    setJournals,
    setCertificates,
    persistPlatforms,
    persistTimeframes,
    persistHtfTimeframes,
    persistConfirmations,
    persistConcepts,
    persistSessions,
    persistAssets,
    persistPlanFidelities,
    persistEntryModels,
    persistTrendTypes,
    persistTpTargets,
    persistPremiumDiscounts,
    persistEntryHours,
    persistNewsDays,
    persistStrategies,
    persistAsiaRangeFvgs,
    persistDefinitionTitles,
    setGlobalSelectedPlanFidelity,
  ]);

  const filteredGlobalTrades = useMemo(() => {
    const minTime = getMinTimestamp(globalDateLimit);

    const hasConfirmations = globalSelectedConfirmations.length > 0;
    const hasConcepts = globalSelectedConcepts.length > 0;
    const hasPlanFidelity = globalSelectedPlanFidelity.length > 0;
    const hasPlatforms = globalSelectedPlatforms.length > 0;
    const hasAssets = globalSelectedAssets.length > 0;
    const hasSessions = globalSelectedSessions.length > 0;
    const hasTimeframes = globalSelectedTimeframes.length > 0;
    const hasHtfTimeframes = globalSelectedHtfTimeframes.length > 0;
    const hasStatuses = globalSelectedStatuses.length > 0;
    const hasTypes = globalSelectedTypes.length > 0;
    const hasEntryModels = globalSelectedEntryModels.length > 0;
    const hasTrendTypes = globalSelectedTrendTypes.length > 0;
    const hasMinAsia = globalMinAsiaRangePips !== undefined;
    const hasMaxAsia = globalMaxAsiaRangePips !== undefined;
    const hasMinMae = globalMinMaePips !== undefined;
    const hasMaxMae = globalMaxMaePips !== undefined;
    const hasMinMfe = globalMinMfePips !== undefined;
    const hasMaxMfe = globalMaxMfePips !== undefined;
    const hasCategory = activeAccountCategory !== 'ALL';
    const hasMinTime = minTime > 0;

    const hasAnyFilter =
      hasConfirmations ||
      hasConcepts ||
      hasPlanFidelity ||
      hasPlatforms ||
      hasAssets ||
      hasSessions ||
      hasTimeframes ||
      hasHtfTimeframes ||
      hasStatuses ||
      hasTypes ||
      hasEntryModels ||
      hasTrendTypes ||
      hasMinAsia ||
      hasMaxAsia ||
      hasMinMae ||
      hasMaxMae ||
      hasMinMfe ||
      hasMaxMfe ||
      hasCategory ||
      hasMinTime;

    if (!hasAnyFilter) {
      return trades;
    }

    const confirmationSet = hasConfirmations ? new Set(globalSelectedConfirmations.map(normalizeSearchString)) : null;
    const conceptSet = hasConcepts ? new Set(globalSelectedConcepts.map(normalizeSearchString)) : null;
    const planFidelitySet = hasPlanFidelity ? new Set(globalSelectedPlanFidelity.map(normalizeSearchString)) : null;
    const platformSet = hasPlatforms ? new Set(globalSelectedPlatforms.map(normalizeSearchString)) : null;
    const assetSet = hasAssets ? new Set(globalSelectedAssets.map(normalizeSearchString)) : null;
    const sessionSet = hasSessions ? new Set(globalSelectedSessions.map(normalizeSearchString)) : null;
    const timeframeSet = hasTimeframes ? new Set(globalSelectedTimeframes.map(normalizeSearchString)) : null;
    const htfTimeframeSet = hasHtfTimeframes ? new Set(globalSelectedHtfTimeframes.map(normalizeSearchString)) : null;
    const statusSet = hasStatuses ? new Set(globalSelectedStatuses.map(normalizeSearchString)) : null;
    const typeSet = hasTypes ? new Set(globalSelectedTypes.map(normalizeSearchString)) : null;
    const entrySet = hasEntryModels ? new Set(globalSelectedEntryModels.map(normalizeSearchString)) : null;
    const trendSet = hasTrendTypes ? new Set(globalSelectedTrendTypes.map(normalizeSearchString)) : null;

    const customCategories = getStoredPlatformCategories();

    return trades.filter((t: Trade) => {
      // 1. Numeric and temporal checks first (fastest)
      if (hasMinTime && (!t.createdAt || t.createdAt < minTime)) {
        return false;
      }
      if (hasMinAsia) {
        if (t.asiaRangePips === undefined || t.asiaRangePips === null || t.asiaRangePips < globalMinAsiaRangePips!) {
          return false;
        }
      }
      if (hasMaxAsia) {
        if (t.asiaRangePips === undefined || t.asiaRangePips === null || t.asiaRangePips > globalMaxAsiaRangePips!) {
          return false;
        }
      }
      if (hasMinMae) {
        if (t.maePips === undefined || t.maePips === null || t.maePips < globalMinMaePips!) {
          return false;
        }
      }
      if (hasMaxMae) {
        if (t.maePips === undefined || t.maePips === null || t.maePips > globalMaxMaePips!) {
          return false;
        }
      }
      if (hasMinMfe) {
        if (t.mfePips === undefined || t.mfePips === null || t.mfePips < globalMinMfePips!) {
          return false;
        }
      }
      if (hasMaxMfe) {
        if (t.mfePips === undefined || t.mfePips === null || t.mfePips > globalMaxMfePips!) {
          return false;
        }
      }
      if (hasCategory) {
        const cat = getTradeAccountCategory(t, customCategories);
        if (cat !== activeAccountCategory) {
          return false;
        }
      }
      // 2. Simple enum string checks
      if (statusSet && (!t.status || !statusSet.has(normalizeSearchString(t.status)))) {
        return false;
      }
      if (typeSet && (!t.type || !typeSet.has(normalizeSearchString(t.type)))) {
        return false;
      }
      // 3. String & array lookups
      if (assetSet && (!t.asset || !assetSet.has(normalizeSearchString(t.asset)))) {
        return false;
      }
      if (platformSet && (!t.platform || !platformSet.has(normalizeSearchString(t.platform)))) {
        return false;
      }
      if (sessionSet && (!t.session || !sessionSet.has(normalizeSearchString(t.session)))) {
        return false;
      }
      if (timeframeSet && (!t.timeframe || !timeframeSet.has(normalizeSearchString(t.timeframe)))) {
        return false;
      }
      if (htfTimeframeSet && (!t.htfTimeframe || !htfTimeframeSet.has(normalizeSearchString(t.htfTimeframe)))) {
        return false;
      }
      if (planFidelitySet && (!t.planFidelity || !planFidelitySet.has(normalizeSearchString(t.planFidelity)))) {
        return false;
      }
      if (trendSet && (!t.trend || !trendSet.has(normalizeSearchString(t.trend)))) {
        return false;
      }
      if (confirmationSet && (!t.confirmations || !t.confirmations.some(tc => confirmationSet.has(normalizeSearchString(tc))))) {
        return false;
      }
      if (conceptSet) {
        const tradeSweeps = Array.isArray(t.liquiditySweeps) && t.liquiditySweeps.length > 0
          ? t.liquiditySweeps
          : (t.liquiditySweep || t.concept)
          ? [t.liquiditySweep || t.concept]
          : [];
        if (tradeSweeps.length === 0 || !tradeSweeps.some(s => s && conceptSet.has(normalizeSearchString(s)))) {
          return false;
        }
      }
      if (entrySet) {
        const matchEm = t.entryModels && Array.isArray(t.entryModels) && t.entryModels.some(em => entrySet.has(normalizeSearchString(em)));
        const matchEntryStr = t.entry && t.entry.split(',').some(splitEm => entrySet.has(normalizeSearchString(splitEm.trim())));
        if (!matchEm && !matchEntryStr) return false;
      }
      return true;
    });
  }, [trades, activeAccountCategory, categoryVersion, globalSelectedConfirmations, globalSelectedConcepts, globalSelectedPlanFidelity, globalSelectedPlatforms, globalDateLimit, globalSelectedAssets, globalSelectedSessions, globalSelectedTimeframes, globalSelectedHtfTimeframes, globalSelectedStatuses, globalSelectedTypes, globalSelectedEntryModels, globalSelectedTrendTypes, globalMinAsiaRangePips, globalMaxAsiaRangePips, globalMinMaePips, globalMaxMaePips, globalMinMfePips, globalMaxMfePips]);

  // Calculate comprehensive statistics (moved outside)

  const calculatedStats = useMemo(
    () => calculateComprehensiveStats(filteredGlobalTrades, isRrMode),
    [filteredGlobalTrades, isRrMode],
  );

  const activeFilterCount = useMemo(
    () =>
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
      globalSelectedEntryModels.length +
      globalSelectedTrendTypes.length +
      (globalDateLimit !== "6m" ? 1 : 0) +
      (globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined ? 1 : 0) +
      (globalMinMaePips !== undefined || globalMaxMaePips !== undefined ? 1 : 0) +
      (globalMinMfePips !== undefined || globalMaxMfePips !== undefined ? 1 : 0),
    [
      globalSelectedConfirmations,
      globalSelectedConcepts,
      globalSelectedPlanFidelity,
      globalSelectedPlatforms,
      globalSelectedAssets,
      globalSelectedSessions,
      globalSelectedTimeframes,
      globalSelectedHtfTimeframes,
      globalSelectedStatuses,
      globalSelectedTypes,
      globalSelectedEntryModels,
      globalSelectedTrendTypes,
      globalDateLimit,
      globalMinAsiaRangePips,
      globalMaxAsiaRangePips,
      globalMinMaePips,
      globalMaxMaePips,
      globalMinMfePips,
      globalMaxMfePips,
    ],
  );

  const backupSettings = useMemo(() => ({
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
    tpTargets,
    premiumDiscounts,
    entryHours,
    newsDays,
    strategies,
    asiaRangeFvgs,
    definitionTitles,
    platformCategories: getStoredPlatformCategories(),
    currency,
    isRrMode,
  }), [
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
    tpTargets,
    premiumDiscounts,
    entryHours,
    newsDays,
    strategies,
    asiaRangeFvgs,
    definitionTitles,
    categoryVersion,
    currency,
    isRrMode,
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-blue-400/30 selection:text-white">
      <Toaster 
        position="bottom-right" 
        containerStyle={{ zIndex: 999999 }}
        toastOptions={{ 
          style: {
            background: '#131720',
            color: '#C5CBD6',
            border: '1px solid #2A2F3A',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            padding: '12px 18px',
            maxWidth: '380px',
          },
          success: {
            style: {
              borderLeft: '4px solid #2FA376',
              background: '#131720',
              color: '#c5cbd6',
            },
            iconTheme: {
              primary: '#2FA376',
              secondary: '#131720',
            }
          },
          error: {
            style: {
              borderLeft: '4px solid #D65A5A',
              background: '#131720',
              color: '#c5cbd6',
            },
            iconTheme: {
              primary: '#D65A5A',
              secondary: '#131720',
            }
          },
          loading: {
            style: {
              borderLeft: '4px solid #3b82f6',
              background: '#131720',
              color: '#C5CBD6',
            },
          }
        }} 
      />
      {/* 1. MODERN COMPACT NAVBAR */}
      <header ref={headerRef} className="border-b border-border-subtle bg-bg-base sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex flex-row items-center justify-between gap-2 relative">
          
          <div className="flex items-center gap-3 z-10">
            {/* Brand */}
            <div 
              className="flex items-center gap-2 cursor-pointer group select-none transition-transform duration-300 ease-out active:scale-[0.98]"
              onClick={() => {
                if (currentTab === "dashboard") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  handleTabChange("dashboard");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center font-bold text-blue-400 text-xs select-none transition-ui duration-300 ease-out group-hover:bg-blue-500/15 group-hover:scale-105">
                TJ
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="page-title !text-sm !tracking-wide">
                  TRADING JOURNAL
                </h1>
                <span className="text-[11px] font-medium tracking-normal text-zinc-400 italic">
                  by Mowtynn
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end shrink-0 select-none gap-1.5 ml-auto z-10">
            {/* PWA Install Button (Compact) */}
            <PWAInstallButton className="hidden sm:flex" />

            {/* Account Switcher (TÜMÜ / DEMO / FUNDED) */}
            <AccountSwitcher
              activeCategory={activeAccountCategory}
              onSelectCategory={handleAccountCategoryChange}
              counts={accountCategoryCounts}
            />

            {/* Global Metric Switch ($ / R) - Compact */}
            <div className="flex bg-zinc-900 border border-zinc-700/50 rounded-lg p-0.5 shadow-xs shrink-0">
              <button
                type="button"
                className={`relative z-10 flex items-center justify-center px-2.5 h-6 rounded-md transition-colors duration-150 cursor-pointer text-[11px] font-bold ${
                  isRrMode ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setMode('rr')}
              >
                {isRrMode && (
                  <motion.div
                    layoutId="metricToggleIndicator"
                    className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-md shadow-xs"
                    transition={SPRING.indicator}
                  />
                )}
                <span className="relative z-10">R</span>
              </button>
              <button
                type="button"
                className={`relative z-10 flex items-center justify-center px-2.5 h-6 rounded-md transition-colors duration-150 cursor-pointer text-[11px] font-bold ${
                  !isRrMode ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setMode('pnl')}
              >
                {!isRrMode && (
                  <motion.div
                    layoutId="metricToggleIndicator"
                    className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/30 rounded-md shadow-xs"
                    transition={SPRING.indicator}
                  />
                )}
                <span className="relative z-10">$</span>
              </button>
            </div>

            {/* Ayarlar (Settings) Dropdown Menu - Compact */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                id="header-settings-button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`relative w-7 h-7 rounded-lg border transition-ui duration-150 flex items-center justify-center cursor-pointer shadow-xs ${
                  isSettingsOpen
                    ? "bg-zinc-800 border-zinc-600 text-blue-400 ring-1 ring-blue-500/30"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700/50 hover:border-zinc-600 text-zinc-300"
                }`}
              >
                <Settings size={13} className={`transition-transform duration-200 ${isSettingsOpen ? 'rotate-45 text-blue-400' : ''}`} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-sans font-black bg-blue-500 text-black shadow-xs flex items-center justify-center leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div 
                    key="settings-dropdown-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    style={{ willChange: "opacity" }}
                    className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 text-xs"
                  >
                      {/* Platform Selector in Settings */}
                      <div className="px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-950/40 rounded-xl">
                        <label className="block text-[10px] font-bold font-sans text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Monitor size={11} className="text-zinc-400" />
                            Aktif Platform
                          </span>
                          <span className="text-[9px] text-zinc-500 font-sans">
                            {globalSelectedPlatforms.length === 0 ? "Tümü" : `${globalSelectedPlatforms.length} seçili`}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <button
                            onClick={() => setGlobalSelectedPlatforms([])}
                            className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-xl border transition-ui cursor-pointer ${
                              globalSelectedPlatforms.length === 0
                                ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-xs"
                                : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
                            }`}
                          >
                            Tümü
                          </button>
                          {platforms.map((p, idx) => {
                            const isSelected = globalSelectedPlatforms.includes(p);
                            return (
                              <button
                                key={`${p}-${idx}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setGlobalSelectedPlatforms(globalSelectedPlatforms.filter(x => x !== p));
                                  } else {
                                    setGlobalSelectedPlatforms([p]);
                                  }
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded-xl border transition-ui cursor-pointer ${
                                  isSelected
                                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-xs"
                                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Filtreleme Menü Öğesi */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsGlobalFilterModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-800/80 text-zinc-200 transition-colors duration-150 text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
                            <Filter size={13} />
                          </div>
                          <span className="font-medium text-xs">Filtreleme Menüsü</span>
                        </div>
                        {activeFilterCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {activeFilterCount} aktif
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-sans">Tümü</span>
                        )}
                      </button>

                      {/* Tanımlamaları Yönet Öğesi */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsPlatformMenuOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-800/80 text-zinc-200 transition-colors duration-150 text-left font-medium text-xs cursor-pointer"
                      >
                        <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400">
                          <SlidersHorizontal size={13} />
                        </div>
                        <span>Tanımlamaları Yönet</span>
                      </button>

                      {/* PWA Install Entry in Settings */}
                      <div className="pt-1 border-t border-zinc-800/80">
                        <PWAInstallButton variant="full" className="w-full justify-center h-7.5" />
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profil (Profile) Dropdown Menu */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`relative w-7 h-7 rounded-lg border transition-ui duration-150 flex items-center justify-center cursor-pointer shadow-xs overflow-hidden shrink-0 ${
                  isProfileOpen
                    ? "bg-zinc-800 border-zinc-600 ring-1 ring-blue-500/30 text-blue-400"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700/50 hover:border-zinc-600 text-zinc-300"
                }`}
              >
                {user ? (
                  user.photoURL ? (
                    <img decoding="async"
                      src={user.photoURL}
                      alt="Profil"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-300 font-bold text-[10px] select-none uppercase">
                      {user.displayName ? user.displayName.slice(0, 2) : (user.email ? user.email.slice(0, 2) : "U")}
                    </div>
                  )
                ) : (
                  <UserIcon size={13} className="text-zinc-400" />
                )}
              </button>

              {/* Profile Dropdown Panel */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    key="profile-dropdown-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: EASE }}
                    style={{ willChange: "opacity" }}
                    className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 text-xs"
                  >
                    {/* Bulut Veritabanı ve Hesap Durumu */}
                    {user ? (
                      isEditingUsername ? (
                        <div className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                              <Cloud size={12} />
                            </div>
                            <span className="font-semibold text-xs text-zinc-200">Kullanıcı Adı Düzenle</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempUsername}
                              onChange={(e) => setTempUsername(e.target.value)}
                              placeholder="Kullanıcı adı..."
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdateUsername(tempUsername);
                                } else if (e.key === "Escape") {
                                  setIsEditingUsername(false);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateUsername(tempUsername)}
                              className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition border border-emerald-500/20 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setIsEditingUsername(false)}
                              className="p-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition border border-zinc-700 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Cloud size={13} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-zinc-200">Bulut Veritabanı</span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span 
                                  className="text-[10px] text-zinc-400 font-sans truncate max-w-[110px]" 
                                >
                                  {user.displayName || user.email || "Bağlı Hesap"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempUsername(user.displayName || "");
                                    setIsEditingUsername(true);
                                  }}
                                  className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shrink-0 transition cursor-pointer"
                                >
                                  <Pencil size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[9px] font-sans font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aktif
                          </span>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-800/80 text-zinc-200 transition-colors duration-150 text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0 group-hover:border-zinc-600 transition-colors">
                            <Cloud size={13} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-xs text-zinc-200">Bulut Veritabanı</span>
                            <span className="text-[10px] text-zinc-400 font-sans truncate">
                              Çevrimdışı (Yerel Mod)
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-sans font-medium px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0 group-hover:border-zinc-600 transition-colors">
                          Giriş Yap
                        </span>
                      </button>
                    )}

                    <div className="h-px bg-zinc-700/40 my-0.5" />

                    {/* Çıkış Yap / Giriş Yap */}
                    {user ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors duration-150 text-left font-medium text-xs cursor-pointer"
                      >
                        <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                          <LogOut size={13} />
                        </div>
                        <span>Oturumu Kapat</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors duration-150 text-left font-medium text-xs cursor-pointer"
                      >
                        <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
                          <LogIn size={13} />
                        </div>
                        <span>Giriş Yap / Kaydol</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        {indexErrorUrl && (
          <div className="max-w-6xl mx-auto px-4 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span>
                  <strong>Veritabanı Endeksi Gerekli:</strong> Seçilen tarih filtresini doğrudan veritabanında optimize etmek için bir Firestore endeksi oluşturulmalıdır. Şu an sistem otomatik olarak tüm veriyi çekip tarayıcıda filtrelemektedir (sorunsuz çalışır).
                </span>
              </div>
              <a
                href={indexErrorUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-colors duration-200 ease-out whitespace-nowrap"
              >
                Endeks Oluştur (Tek Tık)
              </a>
            </div>
          </div>
        )}

        {/* VIEW TAB SELECTOR */}
        <div className="max-w-6xl mx-auto px-4 pt-3 mb-1">
          <div
            id="navigation-tabs"
            role="tablist"
            aria-label="Ana bölümler"
            className="flex items-center gap-1 w-fit max-w-full overflow-x-auto whitespace-nowrap no-scrollbar bg-zinc-900/90 border border-zinc-800/80 p-1 rounded-2xl shadow-sm"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
              const tabsEls = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              const idx = tabsEls.findIndex((el) => el === document.activeElement);
              if (idx < 0) return;
              e.preventDefault();
              const next =
                e.key === "Home" ? 0 :
                e.key === "End" ? tabsEls.length - 1 :
                (idx + (e.key === "ArrowRight" ? 1 : -1) + tabsEls.length) % tabsEls.length;
              tabsEls[next].focus();
              tabsEls[next].click();
            }}
          >
            {[
              { id: "dashboard", label: "ANA PANEL", icon: LayoutDashboard },
              { id: "deep-analysis", label: "DETAYLI ANALİZ", icon: BarChart3 },
              { id: "notes", label: "NOTLAR", icon: FileText },
              { id: "journal", label: "GÜNLÜK", icon: Book },
              { id: "certificates", label: "SERTİFİKALAR", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`relative px-3 py-1.5 text-xs font-bold tracking-wide rounded-xl transition-ui duration-150 flex items-center gap-2 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? "text-blue-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTabIndicator"
                      className="absolute inset-0 bg-blue-500/15 rounded-xl border border-blue-500/30 shadow-xs"
                      transition={SPRING.indicator}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon size={14} className={isActive ? "text-blue-400" : "text-zinc-500"} />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3.5 flex flex-col w-full">
          {isLoading ? (
            <div className="w-full space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                 <div className="h-[110px] bg-zinc-800/50 rounded-2xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-2xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-2xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-2xl animate-pulse"></div>
              </div>
              <div className="h-[60px] bg-zinc-800/50 rounded-2xl animate-pulse w-full"></div>
              <div className="h-[380px] bg-zinc-900 rounded-2xl border border-zinc-800 animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="relative">
                  <TabPane active={currentTab === "dashboard"}
                    className="flex flex-col gap-3.5">
                    {/* STATS BENTO ROW */}
                    <SectionErrorBoundary sectionName="İstatistik Panosu">
                      <StatsDashboard stats={calculatedStats} currency={currency} />
                    </SectionErrorBoundary>

                    {/* 2. DYNAMIC ACTION TRIGGER (YOUTUBE PLUS BOX) */}
                    <div
                      onClick={() => {
                        setEditingTrade(null);
                        setIsFormOpen(true);
                      }}
                      className="relative overflow-hidden bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer transition-ui duration-200 ease-out select-none group shadow-sm hover:shadow-lg hover:shadow-blue-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 flex items-center justify-center text-blue-400 transition-colors duration-200 ease-out shrink-0 shadow-xs">
                          <Plus size={20} />
                        </div>
                        <div className="text-center sm:text-left">
                          <h3 className="text-sm font-bold text-zinc-100 tracking-tight group-hover:text-blue-300 transition-colors font-sans">
                            {"Yeni Pozisyon Girişi Yap"}
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-full sm:w-auto h-10 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 font-bold text-xs px-5 rounded-xl transition-ui duration-200 ease-out flex items-center justify-center gap-2 shadow-xs border border-blue-500/30 tracking-wide cursor-pointer font-sans"
                      >
                        <Plus size={15} />
                        {"İşlem Ekle"}
                      </button>
                    </div>

                    {/* WORKSPACE DOUBLE GRID - NOW SINGLE-COLUMN EXPANDED FOR UTMOST PRECISION */}
                    <div className="w-full space-y-3">
                      <SectionErrorBoundary sectionName="İşlem Listesi">
                        <TradeList
                          trades={filteredGlobalTrades}
                          onEdit={handleStartEdit}
                          onDelete={handleDeleteTrade}
                          onViewDetails={setDetailedTrade}
                          currency={currency}
                          definitionTitles={definitionTitles}
                          planFidelities={planFidelities}
                          entryModels={entryModels}
                          trendTypes={trendTypes}
                        />
                      </SectionErrorBoundary>
                    </div>
                  </TabPane>
                  <TabPane active={currentTab === "deep-analysis"}>
                    <SectionErrorBoundary sectionName="Derin Analiz">
                      <DeepAnalysis
                        trades={filteredGlobalTrades}
                        onViewDetails={setDetailedTrade}
                        onEdit={handleStartEdit}
                        onDelete={handleDeleteTrade}
                        currency={currency}
                        sessions={sessions}
                        definitionTitles={definitionTitles}
                        planFidelities={planFidelities}
                        entryModels={entryModels}
                        trendTypes={trendTypes}
                      />
                    </SectionErrorBoundary>
                  </TabPane>
                  <TabPane active={currentTab === "journal"}>
                    <SectionErrorBoundary sectionName="Günlükler">
                      <JournalView
                        entries={journals}
                        trades={filteredGlobalTrades}
                        currency={currency}
                        onSaveEntry={handleSaveJournal}
                        onDeleteEntry={handleDeleteJournal}
                      />
                    </SectionErrorBoundary>
                  </TabPane>
                  <TabPane active={currentTab === "certificates"}>
                    <SectionErrorBoundary sectionName="Sertifikalar">
                      <CertificatesView
                        certificates={certificates}
                        onSaveCertificate={handleSaveCertificate}
                        onDeleteCertificate={handleDeleteCertificate}
                      />
                    </SectionErrorBoundary>
                  </TabPane>
                  <TabPane active={currentTab === "notes"}>
                    <SectionErrorBoundary sectionName="Notlar">
                      <NotesView
                        notes={notes}
                        onSaveNote={handleSaveNote}
                        onDeleteNote={handleDeleteNote}
                      />
                    </SectionErrorBoundary>
                  </TabPane>
            </div>
          )}
          
            <GlobalFilterModal
              isOpen={isGlobalFilterModalOpen}
              onClose={() => setIsGlobalFilterModalOpen(false)}
              platforms={platforms}
              timeframes={timeframes}
              htfTimeframes={htfTimeframes}
              confirmations={confirmations}
              concepts={concepts}
              sessions={sessions}
              assets={assets}
              planFidelities={planFidelities}
              entryModels={entryModels}
              trendTypes={trendTypes}
              definitionTitles={definitionTitles}
              globalSelectedConfirmations={globalSelectedConfirmations}
              setGlobalSelectedConfirmations={setGlobalSelectedConfirmations}
              globalSelectedConcepts={globalSelectedConcepts}
              setGlobalSelectedConcepts={setGlobalSelectedConcepts}
              globalSelectedPlanFidelity={globalSelectedPlanFidelity}
              setGlobalSelectedPlanFidelity={setGlobalSelectedPlanFidelity}
              globalSelectedPlatforms={globalSelectedPlatforms}
              setGlobalSelectedPlatforms={setGlobalSelectedPlatforms}
              globalSelectedAssets={globalSelectedAssets}
              setGlobalSelectedAssets={setGlobalSelectedAssets}
              globalSelectedSessions={globalSelectedSessions}
              setGlobalSelectedSessions={setGlobalSelectedSessions}
              globalSelectedTimeframes={globalSelectedTimeframes}
              setGlobalSelectedTimeframes={setGlobalSelectedTimeframes}
              globalSelectedHtfTimeframes={globalSelectedHtfTimeframes}
              setGlobalSelectedHtfTimeframes={setGlobalSelectedHtfTimeframes}
              globalSelectedStatuses={globalSelectedStatuses}
              setGlobalSelectedStatuses={setGlobalSelectedStatuses}
              globalSelectedTypes={globalSelectedTypes}
              setGlobalSelectedTypes={setGlobalSelectedTypes}
              globalSelectedEntryModels={globalSelectedEntryModels}
              setGlobalSelectedEntryModels={setGlobalSelectedEntryModels}
              globalSelectedTrendTypes={globalSelectedTrendTypes}
              setGlobalSelectedTrendTypes={setGlobalSelectedTrendTypes}
              globalDateLimit={globalDateLimit}
              setGlobalDateLimit={setGlobalDateLimit}
              globalMinAsiaRangePips={globalMinAsiaRangePips}
              setGlobalMinAsiaRangePips={setGlobalMinAsiaRangePips}
              globalMaxAsiaRangePips={globalMaxAsiaRangePips}
              setGlobalMaxAsiaRangePips={setGlobalMaxAsiaRangePips}
              globalMinMaePips={globalMinMaePips}
              setGlobalMinMaePips={setGlobalMinMaePips}
              globalMaxMaePips={globalMaxMaePips}
              setGlobalMaxMaePips={setGlobalMaxMaePips}
              globalMinMfePips={globalMinMfePips}
              setGlobalMinMfePips={setGlobalMinMfePips}
              globalMaxMfePips={globalMaxMfePips}
              setGlobalMaxMfePips={setGlobalMaxMfePips}
            />

            {/* RECOVERY BACKUP RESCUE MOD - FOOTNOTE */}
            <BackupRescue
              trades={trades}
              notes={notes}
              journals={journals}
              certificates={certificates}
              settings={backupSettings}
              onImportTrades={handleImportTrades}
              onClearAll={handleClearAll}
            />

          {/* CONTROLS AREA AND CHANNELS */}
          {true && (
            <div className="flex justify-center pb-8 pt-4">
              <button
                type="button"
                onClick={() => setIsPlatformMenuOpen(true)}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold tracking-wider uppercase font-sans transition-colors duration-150 flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-100 shadow-sm hover:shadow-md"
              >
                <SlidersHorizontal size={14} className="text-blue-400" />
                <span>Tanımlamaları Yönet</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {platformMenuMounted && (
        <DefinitionsManagerModal
          isOpen={isPlatformMenuOpen}
          onClose={() => setIsPlatformMenuOpen(false)}
          trades={trades}
          onDeleteTradesByPlatform={handleDeleteTradesByPlatform}
          platforms={platforms}
          timeframes={timeframes}
          htfTimeframes={htfTimeframes}
          confirmations={confirmations}
          concepts={concepts}
          sessions={sessions}
          assets={assets}
          planFidelities={planFidelities}
          entryModels={entryModels}
          trendTypes={trendTypes}
          tpTargets={tpTargets}
          premiumDiscounts={premiumDiscounts}
          entryHours={entryHours}
          newsDays={newsDays}
          strategies={strategies}
          asiaRangeFvgs={asiaRangeFvgs}
          definitionTitles={definitionTitles}
          persistPlatforms={persistPlatforms}
          persistTimeframes={persistTimeframes}
          persistHtfTimeframes={persistHtfTimeframes}
          persistConfirmations={persistConfirmations}
          persistConcepts={persistConcepts}
          persistSessions={persistSessions}
          persistAssets={persistAssets}
          persistPlanFidelities={persistPlanFidelities}
          persistEntryModels={persistEntryModels}
          persistTrendTypes={persistTrendTypes}
          persistTpTargets={persistTpTargets}
          persistPremiumDiscounts={persistPremiumDiscounts}
          persistEntryHours={persistEntryHours}
          persistNewsDays={persistNewsDays}
          persistStrategies={persistStrategies}
          persistAsiaRangeFvgs={persistAsiaRangeFvgs}
          onRenameDefinition={handleRenameDefinition}
          persistDefinitionTitles={persistDefinitionTitles}
        />
      )}

      {/* OVERLAY MODALS WRAPPER */}
        {/* OVERLAY MODAL: TRANSACTION FORM (ADD OR EDIT) */}
        {createPortal(
          <AnimatePresence>
            {isFormOpen && (
              <motion.div
                key="add-trade-form-modal"
                {...MODAL_BACKDROP}
                onClick={handleCancelEdit}
                className="fixed inset-0 modal-layer modal-dim z-[1500] overflow-hidden  flex items-center justify-center p-2 sm:p-4 cursor-pointer"
              >
                <motion.div
                  key="add-trade-form-modal-content"
                  {...MODAL_PANEL}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-auto max-h-[92vh] overflow-hidden bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl relative shadow-2xl flex flex-col cursor-default my-auto"
                >
                  <AddTradeForm
                    onSave={handleSaveTradeAndClose}
                    editingTrade={editingTrade}
                    onCancelEdit={handleCancelEdit}
                    currency={currency}
                    platforms={platforms}
                    defaultPlatform={globalSelectedPlatforms.length > 0 ? globalSelectedPlatforms[0] : undefined}
                    timeframes={timeframes}
                    htfTimeframes={htfTimeframes}
                    sessions={sessions}
                    concepts={concepts}
                    confirmations={confirmations}
                    assets={assets}
                    planFidelities={planFidelities}
                    entryModels={entryModels}
                    trendTypes={trendTypes}
                    tpTargets={tpTargets}
                    premiumDiscounts={premiumDiscounts}
                    entryHours={entryHours}
                    newsDays={newsDays}
                    strategies={strategies}
                    asiaRangeFvgs={asiaRangeFvgs}
                    definitionTitles={definitionTitles}
                    persistPlatforms={persistPlatforms}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* LIGHTBOX DETAILS MODAL */}
        <TradeDetailModal
          key="trade-detail-modal"
          trade={detailedTrade}
          onClose={handleCloseTradeDetail}
          onEdit={handleStartEdit}
          onDelete={handleDeleteTrade}
          currency={currency}
          definitionTitles={definitionTitles}
        />


        {/* AUTH MODAL */}
        {authModalMounted && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}

        {/* AI CO-PILOT MODAL */}
        {copilotMounted && (
          <AICoPilotModal
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            allTrades={trades}
            trades={filteredGlobalTrades}
            stats={calculatedStats}
            currency={currency}
            isRrMode={isRrMode}
            definitionTitles={definitionTitles}
            definitions={{
              platforms,
              assets,
              concepts,
              sessions,
              timeframes,
              htfTimeframes,
              confirmations,
              entryModels,
              trendTypes,
              planFidelities,
            }}
            journals={journals}
            certificates={certificates}
            notes={notes}
          />
        )}

      {/* FLOATING AI CO-PILOT QUICK ACCESS BUTTON */}
      <div className="fixed bottom-5 right-5 z-30 pointer-events-none">
        <AnimatePresence>
          {!isCopilotOpen && (
            <motion.button
              key="copilot-fab"
              type="button"
              aria-label="AI Co-Pilot'u aç"
              onClick={() => setIsCopilotOpen(true)}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: SPRING.enter }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12, ease: EASE } }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="pointer-events-auto group relative w-11 h-11 flex items-center justify-center bg-bg-card hover:bg-bg-card-hover text-zinc-100 rounded-full shadow-lg cursor-pointer border border-border-card hover:border-blue-500/40 transition-colors duration-200"
            >
              <span className="absolute inset-0 rounded-full bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative flex items-center justify-center text-blue-400">
            <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3c.13 4.56 2.44 6.87 7 7-4.56.13-6.87 2.44-7 7-.13-4.56-2.44-6.87-7-7 4.56-.13 6.87-2.44 7-7z" />
              <path d="M17.5 14c.07 2.28 1.22 3.43 3.5 3.5-2.28.07-3.43 1.22-3.5 3.5-.07-2.28-1.22-3.43-3.5-3.5 2.28-.07 3.43-1.22 3.5-3.5z" opacity="0.8" />
            </svg>
          </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
