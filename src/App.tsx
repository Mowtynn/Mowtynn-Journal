import { EASE, SPRING, POPOVER } from './lib/motion';
import { useState, useEffect, useMemo, useCallback, useRef, Suspense, startTransition, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Trade, Note, JournalEntry, DefinitionTitles, AccountCategory, PropAccount } from "./types";
import { loadPropAccounts, sanitizePropAccounts, PROP_ACCOUNTS_KEY, collectAccountImages } from "./lib/propAccounts";
import { calculateComprehensiveStats } from "./lib/stats";
import { edgeFromR } from "./lib/asiaAnalytics";
import { applyGlobalFilters, countExtraFilters, DEFAULT_DATE_LIMIT, EMPTY_EXTRA_FILTERS } from "./lib/tradeFilters";
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
  NEWS_DAYS_EVENT,
  normalizeNewsDays,
  DEFAULT_DEFINITION_TITLES,
  sanitizeDefinitionTitles,
  getTradeAccountCategory,
  titleCaseList,
} from "./constants/constants";

import StatsDashboard from "./components/StatsDashboard";
import TradeList from "./components/TradeList";
import { lazyWithPreload, named, preloadWhenIdle } from "./lib/lazyWithPreload";
import { PaneLoader } from "./components/common/Deferred";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import { AccountSwitcher } from "./components/AccountSwitcher";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import { normalizeTrade, normalizeTrades, isValidTrade, canonicalAsset, canonicalAssetList } from "./lib/tradeModel";
import { useExitMount } from "./hooks/useExitMount";
import { useAppStore } from "./store/useAppStore";
import { AllTradesContext } from "./lib/allTradesContext";
import { Toaster, toast } from "react-hot-toast";



import {
  Plus,
  CalendarRange,
  LayoutDashboard,
  BarChart3,
  Cloud,
  LogOut,
  LogIn,
  FileText,
  Book,
  AlertTriangle,
  Filter,
  SlidersHorizontal,
  Settings,
  Pencil,
  Check,
  X,
  User as UserIcon,
  Wallet,
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
  waitForPendingWrites,
} from "firebase/firestore";
import { onAuthStateChanged, User, updateProfile } from "firebase/auth";
import { saveImage, deleteAllUserImages, deleteImages } from "./lib/imageStore";
import { reportCloudError, muteAuthErrors } from "./lib/cloudErrors";
import { weeklyReviewDue } from "./lib/weeklyReview";
import { NO_ACCOUNT } from "./components/tradeForm/shared";
import { prepareTradeSave, prepareJournalSave, prepareNoteSave, upsertById, removeById, rollbackUpsert, restoreDeleted, mergeCloudSnapshot, byCreatedDesc, byUpdatedDesc, byJournalDateDesc, normalizeNote, normalizeJournal, normalizeNotes, normalizeJournals } from "./lib/recordStore";
import { inScope, resolveScope, scopeKey, scopeLabel, scopeTrades, scopeAccountRows } from "./lib/accountScope";
import { STORAGE_KEY as SITE_TOKEN_KEY } from "./components/PasswordGate";

// Sekmeler ve pencereler ayrı parçalarda: ilk açılışta yalnızca ana panel indirilir.
// Kalanlar tarayıcı boşta kaldıkça arka planda indirilir (preloadWhenIdle), açılınca beklemeden gelir.
const DeepAnalysis = lazyWithPreload(() => import("./components/DeepAnalysis"));
const JournalView = lazyWithPreload(() => import("./components/JournalView"));
const NotesView = lazyWithPreload(() => import("./components/NotesView"));
const PropView = lazyWithPreload(() => named(import("./components/PropView"), "PropView"));
const AddTradeForm = lazyWithPreload(() => import("./components/AddTradeForm"));
const GlobalFilterModal = lazyWithPreload(() => named(import("./components/GlobalFilterModal"), "GlobalFilterModal"));
const AuthModal = lazyWithPreload(() => named(import("./components/AuthModal"), "AuthModal"));
const DefinitionsManagerModal = lazyWithPreload(() => import("./components/DefinitionsManagerModal"));
const TradeDetailModal = lazyWithPreload(() => import("./components/TradeDetailModal"));
const BackupRescue = lazyWithPreload(() => import("./components/BackupRescue"));

/** Boşta önden indirme sırası: en sık açılanlar önce (işlem formu ve detay açılışta hemen indirilir) */
const IDLE_PRELOAD = [
  GlobalFilterModal.preload,
  DeepAnalysis.preload,
  PropView.preload,
  BackupRescue.preload,
  JournalView.preload,
  NotesView.preload,
  DefinitionsManagerModal.preload,
];

const paneFallback = <PaneLoader minHeight={420} />;

const DATE_LIMIT_LABELS: Record<string, string> = { "1w": "Son 1 hafta", "1m": "Son 1 ay", "3m": "Son 3 ay", "6m": "Son 6 ay", "1y": "Son 1 yıl" };

/** Tarih aralığı daraltılmışsa görünür not: üst menüdeki hesap sayıları tüm zamanları sayar, panel daha az gösterebilir */
const DateLimitNote = ({ limit, shown, onReset }: { limit: string; shown: number; onReset: () => void }) =>
  limit === DEFAULT_DATE_LIMIT ? null : (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
      <span className="flex items-center gap-1.5 min-w-0">
        <CalendarRange size={13} className="text-amber-300 shrink-0" />
        <span className="truncate">
          {DATE_LIMIT_LABELS[limit] || "Seçili aralık"} gösteriliyor · {shown} işlem
        </span>
      </span>
      <button type="button" onClick={onReset} className="shrink-0 font-bold text-amber-200 hover:text-white transition-colors cursor-pointer">
        Tüm zamanları göster
      </button>
    </div>
  );

// Sekme panelleri: İLK AÇILDIKLARINDA kurulur ve sonra bellekte kalır; yalnızca gizlenir/gösterilir (giriş animasyonu CSS'te: .tab-pane).
// İlk açılışta önce "Yükleniyor" işareti çizilir (tıklama anında tepki), ağır içerik bir sonraki karede
// kesintiye uğratılabilir bir güncellemeyle kurulur; böylece sekme düğmesi takılmaz.
// Gizliyken alt ağaç dondurulur: son aktif render'ın elemanı yeniden kullanıldığından React gizli sekmeyi
// Firestore anlık güncellemelerinde / modal açılışında yeniden render etmez. Sekme açılınca güncel veriyle çizilir.
const TabPane = ({ active, className = "", children }: { active: boolean; className?: string; children: ReactNode }) => {
  // Açılıştaki sekme beklemeden çizilir
  const [ready, setReady] = useState(active);
  useEffect(() => {
    if (!active || ready) return;
    let t = 0;
    const raf = requestAnimationFrame(() => {
      t = window.setTimeout(() => startTransition(() => setReady(true)), 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [active, ready]);
  const frozen = useRef<ReactNode>(null);
  if (active && ready) frozen.current = children;
  return (
    <div hidden={!active} className="tab-pane">
      {ready ? (
        <Suspense fallback={paneFallback}>
          {/* Düzen sınıfları (gap vb.) içerik sarmalayıcısına uygulanır; dış kap yalnızca göster/gizle yapar */}
          <div className={`pane-content-in ${className}`}>{frozen.current}</div>
        </Suspense>
      ) : active ? (
        paneFallback
      ) : null}
    </div>
  );
};

// Utility to recursively clean undefined, NaN, and invalid values before saving to Firestore
/** localStorage'daki dizi kaydını güvenle okur: yoksa ya da bozuksa null. Her anahtar ayrı; biri bozuksa diğerleri etkilenmez. */
const readStoredArray = (key: string): unknown[] | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};
/** Ayar belgesindeki tanım listeleri ↔ yerel anahtarları */
const SETTINGS_LIST_KEYS: [string, string][] = [
  ["timeframes", "trading_timeframes_list"],
  ["htfTimeframes", "trading_htf_timeframes_list"],
  ["confirmations", "trading_confirmations_list"],
  ["sessions", "trading_sessions_list"],
  ["assets", "trading_assets_list"],
  ["planFidelities", "trading_plan_fidelities_list"],
  ["entryModels", "trading_entry_models_list"],
  ["trendTypes", "trading_trend_types_list"],
  ["tpTargets", "trading_tp_targets_list"],
  ["premiumDiscounts", "trading_premium_discounts_list"],
  ["newsDays", "trading_news_days_list"],
  ["asiaRangeFvgs", "trading_asia_range_fvgs_list"],
];
/** Cihazdaki işlem/not/günlük verisinin hangi hesaba ait olduğu (hesaplar arası karışmayı önler) */
const DATA_OWNER_KEY = "tj_data_owner";
const reviveNotes = (v: unknown): Note[] => normalizeNotes(v);
const reviveJournals = (v: unknown): JournalEntry[] => normalizeJournals(v);
const onlyStrings = (v: unknown[]) => v.filter((x): x is string => typeof x === "string");

const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val === undefined) continue;
      if (typeof val === 'number' && isNaN(val)) continue;
      if (typeof val === 'function') continue;
      if (Array.isArray(val)) {
        // Dizilerdeki nesneler de temizlenir (ör. prop hesapları); Firestore tanımsız alanı kabul etmez
        result[key] = val
          .filter((v) => v !== undefined && !(typeof v === 'number' && isNaN(v)))
          .map((v) => (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) ? cleanForFirestore(v) : v));
      } else if (val && typeof val === 'object' && !((val as any) instanceof Date)) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
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
    "timeframes", "htfTimeframes", "confirmations", "sessions", "assets",
    "planFidelities", "entryModels", "trendTypes", "tpTargets", "premiumDiscounts", "asiaRangeFvgs",
  ];
  listKeys.forEach((k) => {
    const v = strList(raw[k]);
    if (v) out[k] = v;
  });
  if (Array.isArray(raw.newsDays)) out.newsDays = normalizeNewsDays(raw.newsDays);
  if (raw.definitionTitles && typeof raw.definitionTitles === "object") {
    out.definitionTitles = sanitizeDefinitionTitles(raw.definitionTitles);
  }
  if (Array.isArray(raw.propAccounts)) out.propAccounts = sanitizePropAccounts(raw.propAccounts);
  return Object.keys(out).length > 0 ? out : null;
};


export default function App() {
  const isClearingRef = useRef(false);
  // Trade Ledger Database State
  const [trades, setTrades] = useLocalStorageState<Trade[]>("trading_journal_db", [], 300, false, null, normalizeTrades);
  const [notes, setNotes] = useLocalStorageState<Note[]>("trading_journal_notes", [], 300, false, null, reviveNotes);
  const [journals, setJournals] = useLocalStorageState<JournalEntry[]>("trading_journal_journals", [], 300, false, null, reviveJournals);

  // Callback'ler listeye bağımlı olmasın: her zaman güncel listeyi ref'ten okurlar. Böylece kaydet/sil
  // fonksiyonlarının kimliği veri değişince değişmez ve alt ekranlar gereksiz yere yeniden çizilmez.
  const tradesRef = useRef(trades);
  tradesRef.current = trades;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const journalsRef = useRef(journals);
  journalsRef.current = journals;
  // Buluta yazımı süren kayıtlar: bu sürede gelen bir snapshot, henüz buluta ulaşmamış yeni kaydı listeden silmesin
  const pendingWriteIdsRef = useRef<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const displayName = displayNameOverride ?? user?.displayName ?? null;
  const [, setIsAuthInitializing] = useState(false);
  const [indexErrorUrl] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalFilterModalOpen, setIsGlobalFilterModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");

  // Navigation tabs state
  const [currentTab, setCurrentTab] = useState<
    | "dashboard"
    | "deep-analysis"
    | "journal"
    | "notes"
    | "prop"
  >("dashboard");

  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Hesap kapsamı (üst çubuk): uygulama her açılışta TÜMÜ (tüm prop hesapları) ile başlar.
  // Hesapsız işlemler TÜMÜ'ye dahil değildir; yalnızca HESAPSIZ bilinçli seçilince görünür. Seçim oturum içinde tutulur.
  const [activeAccountCategory, setActiveAccountCategory] = useState<AccountCategory>("ALL");
  // Challenge / Funded altında tek prop hesabı seçilebilir (yoksa kategorinin tamamı)
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  useEffect(() => {
    // Eski sürümlerin kalıcı kapsam kaydı artık kullanılmıyor
    try {
      localStorage.removeItem("tj_active_account_category");
      localStorage.removeItem("tj_active_account_id");
    } catch (e) {}
  }, []);

  const handleAccountScopeChange = useCallback((category: AccountCategory, accountId: string | null = null) => {
    setActiveAccountCategory(category);
    setActiveAccountId(accountId);
  }, []);

  const accountCategoryCounts = useMemo(() => {
    let funded = 0;
    let challenge = 0;
    let demo = 0;
    trades.forEach((t) => {
      const cat = getTradeAccountCategory(t);
      if (cat === 'FUNDED') funded++;
      else if (cat === 'CHALLENGE') challenge++;
      else demo++;
    });
    return {
      // TÜMÜ = Challenge + Funded (hesapsızlar ayrı sayılır)
      all: funded + challenge,
      funded,
      challenge,
      demo,
    };
  }, [trades]);

    const {
    globalSelectedConfirmations,
    setGlobalSelectedConfirmations,
    globalSelectedPlanFidelity,
    setGlobalSelectedPlanFidelity,
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
    globalExtra,
    setGlobalExtra,
  } = useAppStore();

  useEffect(() => {
    document.title = "Trading Journal";
  }, [false]);

  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  // Koşullu `{open && <Modal/>}` çıkış animasyonunu keser: kapanış animasyonu bitene kadar bağlı tut
  const platformMenuMounted = useExitMount(isPlatformMenuOpen);
  const authModalMounted = useExitMount(isAuthModalOpen);
  const globalFilterMounted = useExitMount(isGlobalFilterModalOpen);

  // Kalan sekme/pencere parçalarını boşta önden indir
  useEffect(() => {
    // İşlem formu ve detay: ilk çizimden hemen sonra indirilir, ilk tıklamada içerik bekletmeden gelir
    let warm = 0;
    const t = window.setTimeout(() => {
      AddTradeForm.preload().then(() => {
        // Parça indi: formu boşta, gizli olarak kur
        warm = window.setTimeout(() => startTransition(() => setFormWarm(true)), 300);
      });
      TradeDetailModal.preload();
    }, 0);
    const cancel = preloadWhenIdle(IDLE_PRELOAD, 600);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(warm);
      cancel();
    };
  }, []);

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

  const [timeframes, setTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_timeframes_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TIMEFRAMES;
  });

  const persistTimeframes = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setTimeframes(updated);
    try {
      localStorage.setItem("trading_timeframes_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ timeframes: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [htfTimeframes, setHtfTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_htf_timeframes_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HTF_TIMEFRAMES;
  });

  const persistHtfTimeframes = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setHtfTimeframes(updated);
    try {
      localStorage.setItem("trading_htf_timeframes_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ htfTimeframes: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [confirmations, setConfirmations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_confirmations_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIRMATIONS;
  });

  const persistConfirmations = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setConfirmations(updated);
    try {
      localStorage.setItem("trading_confirmations_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ confirmations: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [sessions, setSessions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_sessions_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SESSIONS;
  });

  const persistSessions = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setSessions(updated);
    try {
      localStorage.setItem("trading_sessions_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ sessions: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [assets, setAssets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_assets_list");
      // Pariteler tek biçimde (EUR/USD → EURUSD); aynı paritenin iki yazımı tek kayda iner
      if (stored) return canonicalAssetList(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ASSETS;
  });

  const persistAssets = useCallback((incoming: string[], syncCloud = true) => {
    const updated = canonicalAssetList(incoming);
    setAssets(updated);
    try {
      localStorage.setItem("trading_assets_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ assets: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Eski yazımlı (EUR/USD) parite listesi bir kez tek biçimle kayda (ve oturum açıksa buluta) yazılır
  useEffect(() => {
    try {
      const raw = localStorage.getItem("trading_assets_list");
      if (!raw) return;
      const clean = canonicalAssetList(JSON.parse(raw));
      if (JSON.stringify(clean) !== raw) persistAssets(clean, !!user);
    } catch (e) { /* bozuk kayıt: varsayılan liste kullanılır */ }
  }, [persistAssets, user]);

  const [planFidelities, setPlanFidelities] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_plan_fidelities_list");
      if (stored) {
        const v = JSON.parse(stored);
        if (Array.isArray(v)) return titleCaseList(v);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PLAN_FIDELITIES;
  });

  const persistPlanFidelities = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setPlanFidelities(updated);
    try {
      localStorage.setItem("trading_plan_fidelities_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ planFidelities: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [entryModels, setEntryModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_entry_models_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ENTRY_MODELS;
  });

  const persistEntryModels = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setEntryModels(updated);
    try {
      localStorage.setItem("trading_entry_models_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ entryModels: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [trendTypes, setTrendTypes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_trend_types_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TREND_TYPES;
  });

  const persistTrendTypes = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setTrendTypes(updated);
    try {
      localStorage.setItem("trading_trend_types_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ trendTypes: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [tpTargets, setTpTargets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_tp_targets_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TP_TARGETS;
  });

  const persistTpTargets = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setTpTargets(updated);
    try {
      localStorage.setItem("trading_tp_targets_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ tpTargets: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [premiumDiscounts, setPremiumDiscounts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_premium_discounts_list");
      if (stored) { const v = JSON.parse(stored); if (Array.isArray(v)) return titleCaseList(v); }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PREMIUM_DISCOUNTS;
  });

  const persistPremiumDiscounts = useCallback((incoming: string[], syncCloud = true) => {
    // Her kelimenin ilk harfi büyük (Asia Range, Entry Model); harf farkıyla tekrar edenler tek kalır
    const updated = titleCaseList(incoming);
    setPremiumDiscounts(updated);
    try {
      localStorage.setItem("trading_premium_discounts_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ premiumDiscounts: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [asiaRangeFvgs, setAsiaRangeFvgs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_asia_range_fvgs_list");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Eski varsayılan (Bullish/Bearish FVG) kullanıcı değiştirmediyse yeni varsayılana (Var / Yok) taşınır
        if (Array.isArray(parsed) && parsed.length === 2 && parsed[0] === "Bullish FVG" && parsed[1] === "Bearish FVG") {
          localStorage.setItem("trading_asia_range_fvgs_list", JSON.stringify(DEFAULT_ASIA_RANGE_FVGS));
          return DEFAULT_ASIA_RANGE_FVGS;
        }
        if (Array.isArray(parsed)) return titleCaseList(parsed);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ASIA_RANGE_FVGS;
  });

  const persistAsiaRangeFvgs = useCallback((incoming: string[], syncCloud = true) => {
    // Eski varsayılan (Bullish/Bearish FVG) yeni varsayılana (Var / Yok) taşınır; bulutta kalan eski kopya geri yazmaz
    const isOldDefault = incoming.length === 2 && incoming[0] === "Bullish FVG" && incoming[1] === "Bearish FVG";
    const updated = isOldDefault ? DEFAULT_ASIA_RANGE_FVGS : titleCaseList(incoming);
    if (isOldDefault) syncCloud = true;
    setAsiaRangeFvgs(updated);
    try {
      localStorage.setItem("trading_asia_range_fvgs_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ asiaRangeFvgs: updated, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
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
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Prop hesapları (Challenge / Funded): yerelde + bulut ayar belgesinde
  const [propAccounts, setPropAccounts] = useState<PropAccount[]>(loadPropAccounts);
  const persistPropAccounts = useCallback((updated: PropAccount[], syncCloud = true) => {
    const clean = sanitizePropAccounts(updated);
    setPropAccounts(clean);
    try {
      localStorage.setItem(PROP_ACCOUNTS_KEY, JSON.stringify(clean));
    } catch (e) {
      console.error(e);
      toast.error("Tarayıcı hafızası doldu; prop fotoğrafları için giriş yapıp buluta kaydetmen gerekiyor.");
    }
    if (!syncCloud || !user) return;
    (async () => {
      // Girişsizken eklenen ya da yedekten gelen fotoğraflar (data URL) önce "images" koleksiyonuna kaydedilir;
      // ayar belgesine yalnızca kısa referans (fsimg:…) yazılır (belge boyutu sınırı).
      const pending = Array.from(new Set(collectAccountImages(clean).filter((i) => i.startsWith("data:"))));
      let toSave = clean;
      if (pending.length > 0) {
        const map = new Map<string, string>();
        for (const dataUrl of pending) map.set(dataUrl, await saveImage(user.uid, dataUrl, "prop", (e) => reportCloudError("prop fotoğrafı kaydı", e, "Bir fotoğraf buluta kaydedilemedi.")));
        const swap = (i: string) => map.get(i) || i;
        const replaceAll = (list: PropAccount[]) =>
          list.map((a) => ({
            ...a,
            images: a.images?.map(swap),
            certificates: a.certificates?.map((c) => (c.image ? { ...c, image: swap(c.image) } : c)),
          }));
        toSave = replaceAll(clean);
        setPropAccounts((prev) => {
          const next = replaceAll(prev);
          try {
            localStorage.setItem(PROP_ACCOUNTS_KEY, JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
      await setDoc(doc(db, "settings", user.uid), cleanForFirestore({ propAccounts: toSave, userId: user.uid }), { merge: true });
    })().catch((err) => {
      reportCloudError("prop hesapları kaydı", err, "Prop hesapları buluta kaydedilemedi; cihazda tutuluyor.");
    });
  }, [user]);

  // Üst çubuktaki hesap kapsamı: silinmiş/uyumsuz hesap seçimi kategori düzeyine düşer
  const resolvedScope = useMemo(
    () => resolveScope({ category: activeAccountCategory, accountId: activeAccountId }, propAccounts),
    [activeAccountCategory, activeAccountId, propAccounts],
  );
  const activeAccount = resolvedScope.account;
  const activeUnlinkedOf = resolvedScope.unlinkedOf;
  // Kaydedilen işlem seçili kapsamın dışında kalıyorsa kullanıcıya nerede göreceği söylenir
  const scopeRef = useRef({ category: activeAccountCategory, account: activeAccount, unlinkedOf: activeUnlinkedOf });
  scopeRef.current = { category: activeAccountCategory, account: activeAccount, unlinkedOf: activeUnlinkedOf };
  const activeScopeKey = scopeKey(activeAccountCategory, resolvedScope.scope.accountId);
  const activeScopeName = scopeLabel(activeAccountCategory, activeAccount, !!activeUnlinkedOf);
  // Günlük ve haftalık değerlendirme yalnızca hesap kapsamına uyar (tarih/parite filtreleri haftayı bozmasın)
  const scopedTrades = useMemo(
    () => scopeTrades(trades, activeAccountCategory, activeAccount, activeUnlinkedOf),
    [trades, activeAccountCategory, activeAccount, activeUnlinkedOf],
  );
  // "Son kurulumu kopyala": dizi sırasına güvenmeden en son girilen işlem
  const latestTrade = useMemo(() => trades.reduce<Trade | null>((m, t) => (!m || t.createdAt > m.createdAt ? t : m), null), [trades]);
    const scopeAccounts = useMemo(
    () => ({ CHALLENGE: scopeAccountRows(propAccounts, trades, 'CHALLENGE'), FUNDED: scopeAccountRows(propAccounts, trades, 'FUNDED') }),
    [propAccounts, trades],
  );
  // Fotoğraf: girişliyken Firestore'daki "images" koleksiyonuna kaydedilir (ücretsiz plan; Storage gerekmez),
  // değilse sıkıştırılmış data URL olarak yerelde kalır
  const uploadPropImage = useCallback(
    (dataUrl: string) =>
      user
        ? saveImage(user.uid, dataUrl, "prop", (e) => reportCloudError("prop fotoğrafı kaydı", e, "Fotoğraf buluta kaydedilemedi."))
        : Promise.resolve(dataUrl),
    [user],
  );
  // Hesap değişiklikleri kaydedilir; kaldırılan fotoğraflar (silinen sertifika / zincir / görsel) buluttan da silinir
  const handlePropAccountsChange = useCallback((next: PropAccount[]) => {
    const kept = new Set(collectAccountImages(next));
    const removed = collectAccountImages(propAccounts).filter((img) => !kept.has(img));
    if (removed.length) deleteImages(removed).catch((e) => console.error("Image delete failed:", e));
    persistPropAccounts(next);
  }, [propAccounts, persistPropAccounts]);

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
          .catch(err => reportCloudError("ayar kaydı", err, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // Synchronize custom inputs revision
  useEffect(() => {
    try {
      // Kaldırılan özelliklerin (Liquidity Sweep, Konsept, AI Co-Pilot, sertifikalar, platformlar) eski anahtarları
      [
        "trading_concepts_list", "trading_liquidity_sweeps_list",
        "ai_copilot_persona", "ai_copilot_messages", "ai_copilot_last_cleared", "ai_copilot_last_trades_count",
        "ai_copilot_last_journals_count", "ai_copilot_saved_notes",
        "trading_journal_certificates",
        // R tabanlı model: platform listesi / kategorileri kalktı (hesap seçimi Prop hesaplarından gelir)
        "trading_platforms_list", "tj_platform_categories", "last_used_trade_platform", "tj_ui_theme",
        // Entry Time tanım listesi kaldırıldı
        "trading_entry_hours_list",
      ].forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    try {
      // Başlık göçleri (TP Target → Target, Premium / Discount → Confirmations…) kayda da yazılır:
      // ekran ile kayıt aynı kalır, eski adlar başka cihaza/yedeğe taşınmaz
      const storedTitles = localStorage.getItem("trading_definition_titles");
      if (storedTitles) {
        const clean = JSON.stringify(sanitizeDefinitionTitles(JSON.parse(storedTitles)));
        if (clean !== storedTitles) localStorage.setItem("trading_definition_titles", clean);
      }
    } catch (e) {}
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
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [detailedTrade, setDetailedTrade] = useState<Trade | null>(null);
  const detailMounted = useExitMount(!!detailedTrade);

  // Form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Hızlı kayıt modu (yalnızca temel bilgiler); tercih hatırlanır
  const [formQuickMode, setFormQuickModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("trading_form_quick_mode") === "1";
    } catch (e) {
      return false;
    }
  });
  const setFormQuickMode = useCallback((v: boolean) => {
    setFormQuickModeState(v);
    try {
      localStorage.setItem("trading_form_quick_mode", v ? "1" : "0");
    } catch (e) {}
  }, []);
  const [isLoading, setIsLoading] = useState(false);

  // İşlem formu HAZIR bekler: yeni işlem formu açılıştan kısa süre sonra arka planda (gizli) kurulur,
  // "İşlem Ekle"ye basınca yalnızca görünür olur — eksiksiz ve beklemeden. Kapanınca bir sonraki için
  // temiz bir form yine arka planda hazırlanır. Düzenlemede form o işlemle kurulur.
  const [formWarm, setFormWarm] = useState(false);
  const [, setFormRecycle] = useState(0);
  const formSlotRef = useRef<{ seq: number; editing: Trade | null; wasOpen: boolean; needsReset: boolean }>({
    seq: 0,
    editing: null,
    wasOpen: false,
    needsReset: false,
  });
  {
    const slot = formSlotRef.current;
    if (isFormOpen && !slot.wasOpen) {
      slot.wasOpen = true;
      if (slot.needsReset) {
        // Kapanıştan hemen sonra yeniden açıldı: önceki formun içeriği kalmasın
        slot.seq++;
        slot.needsReset = false;
        slot.editing = editingTrade;
      } else if (editingTrade) {
        slot.editing = editingTrade;
      }
    } else if (isFormOpen && editingTrade && slot.editing?.id !== editingTrade.id) {
      slot.editing = editingTrade;
    } else if (!isFormOpen && slot.wasOpen) {
      slot.wasOpen = false;
      slot.needsReset = true;
    }
  }
  const formSlot = formSlotRef.current;
  // Yeni işlem formu üst çubuktaki kapsama göre hesabı önceden seçer (aktif tek hesap ya da Hesapsız)
  const defaultAccountChoice =
    activeAccount && activeAccount.status === "ACTIVE" ? activeAccount.id : !activeAccount && activeAccountCategory === "DEMO" ? NO_ACCOUNT : null;
  const formKey = formSlot.editing ? `edit-${formSlot.editing.id}-${formSlot.seq}` : `new-${formSlot.seq}-${defaultAccountChoice || ""}`;
  useEffect(() => {
    if (isFormOpen) return;
    const slot = formSlotRef.current;
    if (!slot.needsReset) return;
    // Kapanış animasyonu bitince temiz yeni form arka planda hazırlanır
    const t = window.setTimeout(() => {
      startTransition(() => {
        slot.seq++;
        slot.editing = null;
        slot.needsReset = false;
        setFormRecycle((x) => x + 1);
      });
    }, 320);
    return () => window.clearTimeout(t);
  }, [isFormOpen]);

  // Authentication & Load database from localStorage or Firestore

  useEffect(() => {
    const loadLocal = () => {
      // Okunan her yolda aynı model onarımı (parite tek biçim, eski alanlar, bozuk R) uygulanır.
      // Anahtarlar ayrı okunur: bozuk bir not kaydı işlemlerin yüklenmesini engellemez.
      const storedTrades = readStoredArray("trading_journal_db");
      setTrades(storedTrades ? normalizeTrades(storedTrades) : []);
      const storedNotes = readStoredArray("trading_journal_notes");
      setNotes(storedNotes ? normalizeNotes(storedNotes) : []);
      const storedJournals = readStoredArray("trading_journal_journals");
      setJournals(storedJournals ? normalizeJournals(storedJournals) : []);
      setIsLoading(false);
    };

    // INSTANT CACHE LOAD: Preload immediately to avoid waiting for Firebase Auth or Firestore
    loadLocal();

    let unsubscribeNotes: (() => void) | undefined;
    let unsubscribeJournals: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Cihazda BAŞKA bir hesabın verisi kaldıysa (çıkış yapılmadan hesap değişti) yeni hesaba aktarılmaz.
        // Sahibi olmayan veri (misafir modu) ilk girişte bu hesaba aktarılır — bilinçli davranış.
        let owner: string | null = null;
        try {
          owner = localStorage.getItem(DATA_OWNER_KEY);
        } catch (e) {}
        if (owner && owner !== currentUser.uid) {
          try {
            ["trading_journal_db", "trading_journal_notes", "trading_journal_journals", PROP_ACCOUNTS_KEY].forEach((k) => localStorage.removeItem(k));
          } catch (e) {}
          tradesRef.current = [];
          notesRef.current = [];
          journalsRef.current = [];
          setTrades([]);
          setNotes([]);
          setJournals([]);
          setPropAccounts([]);
        }
        try {
          localStorage.setItem(DATA_OWNER_KEY, currentUser.uid);
        } catch (e) {}
      }
      setDisplayNameOverride(null);
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
        let settingsInitialSyncDone = false;
        unsubscribeSettings = onSnapshot(
          doc(db, "settings", currentUser.uid),
          (docSnap) => {
            // İlk SUNUCU okumasında bulutta hiç olmayan ayarlar (misafirken ya da çevrimdışıyken yapılmış
            // tanım listeleri, prop hesapları) buluta tamamlanır; böylece diğer cihazlar da görür.
            if (!settingsInitialSyncDone && !docSnap.metadata.fromCache) {
              settingsInitialSyncDone = true;
              const cloudData = docSnap.exists() ? docSnap.data() : {};
              const missing: Record<string, unknown> = {};
              SETTINGS_LIST_KEYS.forEach(([field, key]) => {
                if (Array.isArray(cloudData[field])) return;
                const local = readStoredArray(key);
                if (local && local.length) missing[field] = onlyStrings(local).slice(0, field === "newsDays" ? 50 : 500); // bulut kuralı sınırları
              });
              if (!Array.isArray(cloudData.propAccounts)) {
                const localAccounts = loadPropAccounts();
                // Fotoğrafı henüz buluta kaydedilmemiş (data URL) hesaplar ilk değişiklikte görsel koleksiyonu üzerinden yazılır
                if (localAccounts.length && localAccounts.length <= 500 && !collectAccountImages(localAccounts).some((i) => i.startsWith("data:"))) missing.propAccounts = localAccounts;
              }
              if (Object.keys(missing).length) {
                setDoc(doc(db, "settings", currentUser.uid), cleanForFirestore({ ...missing, userId: currentUser.uid }), { merge: true }).catch((e) =>
                  reportCloudError("yerel ayarları buluta aktarma", e, "Bazı yerel ayarlar buluta aktarılamadı; cihazda tutuluyor."),
                );
              }
            }
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Kendi yazdığımız değişikliklerin yankısı aynı değeri getirir; aynıysa state güncellenmez (gereksiz çizim yok)
              const applyList = (value: unknown, storageKey: string, apply: (l: string[], sync: boolean) => void) => {
                if (!Array.isArray(value)) return;
                try {
                  if (localStorage.getItem(storageKey) === JSON.stringify(value)) return;
                } catch (e) {}
                apply(value as string[], false);
              };
              applyList(data.timeframes, "trading_timeframes_list", persistTimeframes);
              applyList(data.htfTimeframes, "trading_htf_timeframes_list", persistHtfTimeframes);
              applyList(data.confirmations, "trading_confirmations_list", persistConfirmations);
              applyList(data.sessions, "trading_sessions_list", persistSessions);
              // Buluttaki eski yazımlar (EUR/USD) tek biçime çevrilip buluta da geri yazılır
              // (bu dinleyici ilk çizimde kurulduğu için kullanıcıyı persistAssets'ten değil doğrudan currentUser'dan alır)
              applyList(data.assets, "trading_assets_list", (l) => {
                persistAssets(l, false);
                const canon = canonicalAssetList(l);
                if (JSON.stringify(canon) !== JSON.stringify(l)) {
                  setDoc(doc(db, "settings", currentUser.uid), cleanForFirestore({ assets: canon, userId: currentUser.uid }), { merge: true }).catch((e) =>
                    reportCloudError("ayar kaydı", e, "Tanımlamalar buluta kaydedilemedi; cihazda tutuluyor."),
                  );
                }
              });
              applyList(data.planFidelities, "trading_plan_fidelities_list", persistPlanFidelities);
              applyList(data.entryModels, "trading_entry_models_list", persistEntryModels);
              applyList(data.trendTypes, "trading_trend_types_list", persistTrendTypes);
              applyList(data.tpTargets, "trading_tp_targets_list", persistTpTargets);
              applyList(data.premiumDiscounts, "trading_premium_discounts_list", persistPremiumDiscounts);
              applyList(data.newsDays, "trading_news_days_list", persistNewsDays);
              applyList(data.asiaRangeFvgs, "trading_asia_range_fvgs_list", persistAsiaRangeFvgs);
              if (data.definitionTitles) persistDefinitionTitles(data.definitionTitles, false);
              if (Array.isArray(data.propAccounts)) {
                try {
                  if (localStorage.getItem(PROP_ACCOUNTS_KEY) !== JSON.stringify(data.propAccounts)) persistPropAccounts(data.propAccounts, false);
                } catch (e) {}
              }
              // Ad ayrı tutulur: Firebase User nesnesini kopyalamak (spread) yöntemlerini kaybettirir ve
              // tüm bulut dinleyicilerini yeniden kurdururdu.
              if (typeof data.displayName === "string" && data.displayName.trim()) setDisplayNameOverride(data.displayName);
            }
          },
          (err) => reportCloudError("ayarları okuma", err, "Ayarlar buluttan okunamadı; cihazdaki kopya kullanılıyor.")
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
            cloudTrades.push(normalizeTrade({ ...data, id: docSnap.id }));
          });
          cloudTrades.sort((a, b) => b.createdAt - a.createdAt);

          if (isClearingRef.current) {
            setTrades([]);
            return;
          }
          // Birleştirme saf fonksiyonla (lib/recordStore); yan etkiler (yükleme) güncelleyicinin dışında
          const opts = { initial: !tradesInitialSyncDone, pendingIds: pendingWriteIdsRef.current as ReadonlySet<string>, sort: byCreatedDesc<Trade> };
          if (!fromCache && !tradesInitialSyncDone) {
            tradesInitialSyncDone = true;
            mergeCloudSnapshot(cloudTrades, tradesRef.current, opts)
              .toUpload.filter((t) => isValidTrade(t))
              .forEach((trade) => {
                setDoc(doc(db, "trades", trade.id), cleanForFirestore({ ...trade, userId: user.uid })).catch((e) =>
                  reportCloudError("yerel işlemi buluta aktarma", e, "Bazı yerel işlemler buluta aktarılamadı."),
                );
              });
          }
          // Liste güncel durumdan birleştirilir (aynı anda yapılan iyimser ekleme kaybolmasın)
          setTrades((prev) => mergeCloudSnapshot(cloudTrades, prev, opts).list);
          setIsLoading(false);
        },
        (err) => {
          reportCloudError("işlemleri okuma", err, "İşlemler buluttan okunamadı; cihazdaki kopya gösteriliyor.");
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
        setLocal: Dispatch<SetStateAction<T[]>>,
        sortFn: (a: T, b: T) => number,
        revive: (raw: unknown) => T | null,
        onError?: () => void,
      ) => {
        let initialSyncDone = false;
        return onSnapshot(
          query(collection(db, colName), where("userId", "==", user.uid)),
          (snap) => {
            const cloud: T[] = [];
            // Buluttaki bozuk / eksik alanlı kayıt ekranı çökertmez: onarılır ya da atlanır
            snap.forEach((d) => {
              const item = revive({ ...d.data(), id: d.id });
              if (item) cloud.push(item);
            });
            if (isClearingRef.current) {
              setLocal([]);
              return;
            }
            const opts = { initial: !initialSyncDone, pendingIds: pendingWriteIdsRef.current, sort: sortFn };
            if (!initialSyncDone && !snap.metadata.fromCache) {
              initialSyncDone = true;
              mergeCloudSnapshot(cloud, getLocal(), opts).toUpload.forEach((item) => {
                setDoc(doc(db, colName, item.id), cleanForFirestore({ ...(item as any), userId: user.uid }))
                  .catch((e) => reportCloudError(`yerel ${colName} aktarımı`, e, "Bazı yerel kayıtlar buluta aktarılamadı."));
              });
            }
            // Güncel durumdan birleştirilir: aynı anda yapılan iyimser ekleme / silme kaybolmaz
            setLocal((prev) => mergeCloudSnapshot(cloud, prev, opts).list);
          },
          (err) => {
            reportCloudError(`${colName} okuma`, err, "Notlar/günlükler buluttan okunamadı; cihazdaki kopya gösteriliyor.");
            onError?.();
          },
        );
      };
      unsubscribeNotes = watchCollection<Note>("notes", () => notesRef.current, setNotes, byUpdatedDesc, normalizeNote);
      unsubscribeJournals = watchCollection<JournalEntry>("journals", () => journalsRef.current, setJournals, byJournalDateDesc, normalizeJournal);
    } else {
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeTrades) unsubscribeTrades();
      if (unsubscribeNotes) unsubscribeNotes();
      if (unsubscribeJournals) unsubscribeJournals();
    };
  }, [user]);

  // Synchronize state across tabs and local events
  useEffect(() => {
    const handleStorageChange = () => {
      const tradesRaw = readStoredArray("trading_journal_db");
      if (tradesRaw) setTrades(normalizeTrades(tradesRaw));
      const notesRaw = readStoredArray("trading_journal_notes");
      if (notesRaw) setNotes(normalizeNotes(notesRaw));
      const journalsRaw = readStoredArray("trading_journal_journals");
      if (journalsRaw) setJournals(normalizeJournals(journalsRaw));
      const simple: [string, (v: string[]) => void][] = [
        ["trading_timeframes_list", setTimeframes],
        ["trading_htf_timeframes_list", setHtfTimeframes],
        ["trading_confirmations_list", setConfirmations],
        ["trading_sessions_list", setSessions],
        ["trading_assets_list", (v) => setAssets(canonicalAssetList(v))],
      ];
      simple.forEach(([key, set]) => {
        const v = readStoredArray(key);
        if (v) set(onlyStrings(v));
      });
      // Diğer sekmede değişen tanım listeleri, başlıklar ve Prop hesapları da eşitlenir
      // (aksi halde bu sekme eski listeyle üzerine yazabilir). Her anahtar ayrı korunur.
      const lists: [string, (v: string[]) => void][] = [
        ["trading_plan_fidelities_list", setPlanFidelities],
        ["trading_entry_models_list", setEntryModels],
        ["trading_trend_types_list", setTrendTypes],
        ["trading_tp_targets_list", setTpTargets],
        ["trading_premium_discounts_list", setPremiumDiscounts],
        ["trading_asia_range_fvgs_list", setAsiaRangeFvgs],
        ["trading_news_days_list", (v) => setNewsDays(normalizeNewsDays(v))],
      ];
      lists.forEach(([key, set]) => {
        try {
          const raw = localStorage.getItem(key);
          const v = raw ? JSON.parse(raw) : null;
          if (Array.isArray(v)) set(v.filter((x) => typeof x === "string"));
        } catch (e) { /* bozuk kayıt: mevcut liste korunur */ }
      });
      try {
        const raw = localStorage.getItem("trading_definition_titles");
        if (raw) setDefinitionTitles(sanitizeDefinitionTitles(JSON.parse(raw)));
      } catch (e) { /* korunur */ }
      try {
        setPropAccounts(loadPropAccounts());
      } catch (e) { /* korunur */ }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    setIsSettingsOpen(false);
    try {
      // Buluta henüz ulaşmamış değişiklikler varsa kısa süre beklenir (çevrimdışıysa aynı hesapla girince gönderilir)
      const flushed = await Promise.race([
        waitForPendingWrites(db).then(() => true, () => false),
        new Promise<boolean>((r) => window.setTimeout(() => r(false), 4000)),
      ]);
      muteAuthErrors();
      if (!flushed) toast("Bazı değişiklikler henüz buluta ulaşmadı; aynı hesapla tekrar girince gönderilecek.", { icon: "⚠️" });
      await logout();
      setTrades([]);
      setNotes([]);
      setJournals([]);
      setPropAccounts([]);
      try {
        localStorage.removeItem("trading_journal_db");
        localStorage.removeItem("trading_journal_notes");
        localStorage.removeItem("trading_journal_journals");
        localStorage.removeItem(PROP_ACCOUNTS_KEY);
        localStorage.removeItem(DATA_OWNER_KEY);
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
      setDisplayNameOverride(trimmed);
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
      const prepared = prepareTradeSave(trades, tradeData, Date.now(), () => `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const { isNew } = prepared;
      const finalTradeId = prepared.trade.id;
      const existingTrade = prepared.previous;
      // Eski alanlar (Liquidity Sweep, entry metni, bias, spread, çıkış nedeni) temizlenir
      const initialTrade = normalizeTrade(prepared.trade);

      if (user) pendingWriteIdsRef.current.add(finalTradeId);

      // İyimser güncelleme (misafirde yerel kayıt useLocalStorageState ile yazılır)
      setTrades((prevTrades) => upsertById(prevTrades, initialTrade, byCreatedDesc));

      if (user) {
        const uid = user.uid;
        // Bulut yazımı arka planda: görsel yüklemesi (yavaş/çevrimdışı bağlantı) formu açık tutmaz.
        // Liste iyimser olarak zaten güncellendi; hata olursa değişiklik geri alınır.
        void (async () => {
          const processedTradeData = { ...initialTrade };
          if (processedTradeData.screenshot && processedTradeData.screenshot.startsWith("data:image")) {
            try {
              processedTradeData.screenshot = await saveImage(uid, processedTradeData.screenshot, "trade");
            } catch (error) {
              reportCloudError("işlem görseli yükleme", error, "Görsel yüklenemedi, işlem görselsiz kaydedildi.");
              processedTradeData.screenshot = null;
            }
          }
          // processedTradeData mevcut kayıt + yeni değerlerin birleşimidir (kaldırılan alan buluta geri dönmez)
          const finalTradeToCloud = {
            ...processedTradeData,
            id: finalTradeId,
            createdAt: processedTradeData.createdAt || Date.now(),
            userId: uid,
          };
          await setDoc(doc(db, "trades", finalTradeId), cleanForFirestore(finalTradeToCloud));
        })()
          .catch((err) => {
            reportCloudError("işlem kaydı", err);
            toast.error("İşlem buluta kaydedilemedi, değişiklik geri alındı.");
            setTrades((current) => rollbackUpsert(current, finalTradeId, isNew ? undefined : existingTrade));
          })
          .finally(() => pendingWriteIdsRef.current.delete(finalTradeId));
      }

      // Yeni girilen parite, seans, PD array vb. değerleri tanımlama listelerine eklenir
      let settingsUpdates: any = null;

      const tradeAsset = canonicalAsset(tradeData.asset);
      if (tradeAsset && !assets.some(a => canonicalAsset(a) === tradeAsset)) {
        const newAssets = [...assets, tradeAsset];
        persistAssets(newAssets, false);
        settingsUpdates = { ...settingsUpdates, assets: newAssets };
      }
      if (tradeData.session && !sessions.includes(tradeData.session)) {
        const newSessions = [...sessions, tradeData.session];
        persistSessions(newSessions, false);
        settingsUpdates = { ...settingsUpdates, sessions: titleCaseList(newSessions) };
      }
      if (tradeData.timeframe && !timeframes.includes(tradeData.timeframe)) {
        const newTimeframes = [...timeframes, tradeData.timeframe];
        persistTimeframes(newTimeframes, false);
        settingsUpdates = { ...settingsUpdates, timeframes: titleCaseList(newTimeframes) };
      }
      if (tradeData.htfTimeframe && !htfTimeframes.includes(tradeData.htfTimeframe)) {
        const newHtfTimeframes = [...htfTimeframes, tradeData.htfTimeframe];
        persistHtfTimeframes(newHtfTimeframes, false);
        settingsUpdates = { ...settingsUpdates, htfTimeframes: titleCaseList(newHtfTimeframes) };
      }
      if (tradeData.confirmations && tradeData.confirmations.length > 0) {
        const newConfs = tradeData.confirmations.filter(c => !confirmations.includes(c));
        if (newConfs.length > 0) {
          const mergedConfs = [...confirmations, ...newConfs];
          persistConfirmations(mergedConfs, false);
          settingsUpdates = { ...settingsUpdates, confirmations: titleCaseList(mergedConfs) };
        }
      }
      if (tradeData.planFidelity && !planFidelities.includes(tradeData.planFidelity)) {
        const newFidelities = [...planFidelities, tradeData.planFidelity];
        persistPlanFidelities(newFidelities, false);
        settingsUpdates = { ...settingsUpdates, planFidelities: titleCaseList(newFidelities) };
      }
      if (tradeData.entryModels && Array.isArray(tradeData.entryModels) && tradeData.entryModels.length > 0) {
        const newEntries = tradeData.entryModels.filter((em: string) => !entryModels.includes(em));
        if (newEntries.length > 0) {
          const mergedEntries = [...entryModels, ...newEntries];
          persistEntryModels(mergedEntries, false);
          settingsUpdates = { ...settingsUpdates, entryModels: titleCaseList(mergedEntries) };
        }
      }
      if (tradeData.trend && !trendTypes.includes(tradeData.trend)) {
        const newTrends = [...trendTypes, tradeData.trend];
        persistTrendTypes(newTrends, false);
        settingsUpdates = { ...settingsUpdates, trendTypes: titleCaseList(newTrends) };
      }

      if (user && settingsUpdates) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ ...settingsUpdates, userId: user.uid }), { merge: true })
          .catch(err => reportCloudError("tanım listesi güncelleme", err, "Yeni tanımlar buluta kaydedilemedi; cihazda tutuluyor."));
      }

      const sc = scopeRef.current;
      if (!inScope(initialTrade, sc.category, sc.account, sc.unlinkedOf)) {
        const where = getTradeAccountCategory(initialTrade) === "DEMO" ? "HESAPSIZ" : "ilgili hesabı";
        toast.success(`${isNew ? "İşlem kaydedildi" : "İşlem güncellendi"}. Seçili hesap görünümünde değil; görmek için üstten ${where} seçin.`, { duration: 5000 });
      } else {
        toast.success(isNew ? "İşlem başarıyla kaydedildi." : "İşlem başarıyla güncellendi.");
      }
      setEditingTrade(null);
      setIsFormOpen(false);
    },
    [
      user,
      trades,
      assets,
      sessions,
      timeframes,
      htfTimeframes,
      confirmations,
      planFidelities,
      entryModels,
      trendTypes,
      persistAssets,
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

  // İşlem formu kapatma koruması: form kaydedilmemiş değişiklik varsa ya da açık menü varsa isteği kendisi karşılar
  const formCloseGuardRef = useRef<(() => boolean) | null>(null);
  const registerFormCloseGuard = useCallback((guard: (() => boolean) | null) => {
    formCloseGuardRef.current = guard;
  }, []);
  const requestCloseForm = useCallback(() => {
    if (formCloseGuardRef.current?.()) return;
    handleCancelEdit();
  }, [handleCancelEdit]);

  // Kararlı kapatma fonksiyonları: pencereler React.memo ile korunur, her App çiziminde yeniden çizilmez
  const closeGlobalFilter = useCallback(() => setIsGlobalFilterModalOpen(false), []);
  const closePlatformMenu = useCallback(() => setIsPlatformMenuOpen(false), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const handleCloseTradeDetail = useCallback(() => {
    setDetailedTrade(null);
  }, []);

  // İşlem detayında ← / → gezinme: açıldığı listenin sırası (kimlikler) saklanır,
  // işlemler her zaman güncel kayıttan çözülür.
  const [detailNavIds, setDetailNavIds] = useState<string[] | null>(null);
  const openTradeDetail = useCallback((t: Trade, list?: Trade[]) => {
    setDetailedTrade(t);
    setDetailNavIds(list ? list.map((x) => x.id) : null);
  }, []);
  const detailNavList = useMemo(() => {
    if (!detailNavIds) return null;
    const byId = new Map(trades.map((t) => [t.id, t] as const));
    return detailNavIds.map((id) => byId.get(id)).filter((t): t is Trade => !!t);
  }, [detailNavIds, trades]);

  // ESC key listener for overlays and modals in App
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isFormOpen) {
          requestCloseForm();
        } else if (isPlatformMenuOpen) {
          setIsPlatformMenuOpen(false);
        } else if (detailedTrade) {
          // İşlem detayı kendi Escape'ini yönetir (önce silme onayı kapanır); burada çift kapatma yapılmaz
          return;
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
  }, [isSettingsOpen, isFormOpen, isPlatformMenuOpen, detailedTrade, isGlobalFilterModalOpen, isAuthModalOpen, requestCloseForm, handleCloseTradeDetail]);

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

      setTrades((prevTrades) => removeById(prevTrades, id));

      if (user) {
        deleteDoc(doc(db, "trades", id)).catch((err) => {
          console.error("Failed to delete from cloud", err);
          toast.error("İşlem buluttan silinemedi, geri yüklendi.");
          setTrades((current) => restoreDeleted(current, deletedTrade, byCreatedDesc));
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

  // Tanımlamalar'da bir öğe yeniden adlandırılınca, ona bağlı tüm işlemlerdeki değer de güncellenir
  // (aksi halde eski kayıtlar eski adla kalır ve istatistik gruplaması ikiye bölünür).
  const handleRenameDefinition = useCallback(
    (category: string, from: string, to: string): number => {
      const fromKey = from.trim().toLowerCase();
      const same = (v?: string | null) => typeof v === "string" && v.trim().toLowerCase() === fromKey;
      const dedupe = (arr: string[]) => arr.filter((x, i) => arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
      const mapArr = (v?: string[]) => (Array.isArray(v) ? dedupe(v.map((x) => (same(x) ? to : x))) : v);
      const hasInArr = (v?: string[]) => Array.isArray(v) && v.some(same);

      const patchFor = (t: Trade): Partial<Trade> | null => {
        switch (category) {
          case "assets": return same(t.asset) ? { asset: to } : null;
          case "timeframes": return same(t.timeframe) ? { timeframe: to } : null;
          case "htfTimeframes": return same(t.htfTimeframe) ? { htfTimeframe: to } : null;
          case "sessions": return same(t.session) ? { session: to } : null;
          case "planFidelities": return same(t.planFidelity) ? { planFidelity: to } : null;
          case "trendTypes": return same(t.trend) ? { trend: to } : null;
          case "premiumDiscounts": return same(t.premiumDiscount) ? { premiumDiscount: to } : null;
          case "asiaRangeFvgs": return same(t.asiaRangeFvg) ? { asiaRangeFvg: to } : null;
          case "confirmations": return hasInArr(t.confirmations) ? { confirmations: mapArr(t.confirmations) } : null;
          case "tpTargets": return hasInArr(t.tpTargets) ? { tpTargets: mapArr(t.tpTargets) } : null;
          case "entryModels": return hasInArr(t.entryModels) ? { entryModels: mapArr(t.entryModels) } : null;
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
              changed.slice(i, i + 400).filter((t) => isValidTrade(t)).forEach((t) => {
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
      const prepared = prepareNoteSave(notesRef.current, noteData, () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const { isNew, note: finalNote, previous: existingNote } = prepared;
      const finalNoteId = finalNote.id;

      if (user) pendingWriteIdsRef.current.add(finalNoteId);

      setNotes((prevNotes) => upsertById(prevNotes, finalNote, byUpdatedDesc));

      if (user) {
        setDoc(doc(db, "notes", finalNoteId), cleanForFirestore({
          ...finalNote,
          userId: user.uid,
        })).catch((err) => {
          reportCloudError("not kaydı", err, "Not buluta kaydedilemedi, değişiklik geri alındı.");
          // Rollback optimistic update properly
          setNotes((current) => rollbackUpsert(current, finalNoteId, existingNote));
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
      
      setNotes((prev) => removeById(prev, id));
      if (user && deletedNote) {
        deleteDoc(doc(db, "notes", id)).catch((err) => {
          reportCloudError("not silme", err, "Not buluttan silinemedi, geri yüklendi.");
          setNotes((current) => restoreDeleted(current, deletedNote, byUpdatedDesc));
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
      const newJournalId = () =>
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `journal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const { entry: finalEntry, isNew, previous: existingEntry } = prepareJournalSave(journalsRef.current, entryData, Date.now(), newJournalId);
      if (user) pendingWriteIdsRef.current.add(finalEntry.id);

      setJournals((prev) => upsertById(prev, finalEntry, byJournalDateDesc));
      if (user) {
        setDoc(doc(db, "journals", finalEntry.id), cleanForFirestore({
          ...finalEntry,
          userId: user.uid,
        })).catch((err) => {
          reportCloudError("günlük kaydı", err, "Günlük buluta kaydedilemedi, değişiklik geri alındı.");
          setJournals((current) => rollbackUpsert(current, finalEntry.id, existingEntry));
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

      setJournals((prev) => removeById(prev, id));
      if (user && deletedJournal) {
        deleteDoc(doc(db, "journals", id)).catch((err) => {
          reportCloudError("günlük silme", err, "Günlük buluttan silinemedi, geri yüklendi.");
          setJournals((current) => restoreDeleted(current, deletedJournal, byJournalDateDesc));
        });
      }
      toast.success("Günlük kaydı başarıyla silindi.");
    },
    [user],
  );

  // Import all app data from JSON Backup
  const handleImportTrades = useCallback(
    async (
      importedTrades: Trade[],
      importedNotes: Note[] = [],
      importedJournals: any[] = [],
      rawImportedSettings: any = null
    ): Promise<boolean> => {
      try {
        importedTrades = normalizeTrades(importedTrades);
        // Kurallara uymayan kayıtlar (eksik parite, bilinmeyen sonuç, tarihsiz…) atlanır: tek bozuk kayıt
        // 400'lük toplu yazımın tamamını reddettirmesin
        const skippedTrades = importedTrades.filter((t) => !isValidTrade(t)).length;
        if (skippedTrades > 0) {
          importedTrades = importedTrades.filter((t) => isValidTrade(t));
          toast.error(`${skippedTrades} işlem eksik/bozuk olduğu için atlandı (parite, yön, sonuç veya tarih).`);
        }
        const importedSettings = sanitizeImportedSettings(rawImportedSettings);
        // Not / günlük: kimliği olmayan bozuk öğeler atlanır (bulut yazımı ve liste çökmesin)
        importedNotes = normalizeNotes(importedNotes);
        importedJournals = normalizeJournals(importedJournals);
        if (user) {
          // Eski yedeklerdeki gömülü görseller (data URL) görsel koleksiyonuna kaydedilir: Firestore belge sınırı 1 MiB'dir ve
          // tek büyük belge 400'lük toplu yazımın tamamını düşürür. Yüklenemeyen görsel düşer, işlem yine aktarılır.
          let droppedImages = 0;
          importedTrades = await Promise.all(
            importedTrades.map(async (t) => {
              if (typeof t.screenshot !== "string" || !t.screenshot.startsWith("data:image")) return t;
              try {
                return { ...t, screenshot: await saveImage(user.uid, t.screenshot, "trade") };
              } catch {
                droppedImages += 1;
                return { ...t, screenshot: null };
              }
            }),
          );
          if (droppedImages > 0) toast.error(`${droppedImages} işlemin gömülü görseli yüklenemedi; işlemler görselsiz aktarıldı.`);
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
            // Prop hesapları (fotoğraflar görsel koleksiyonuna kaydedilerek) aşağıda persistPropAccounts ile yazılır
            const { propAccounts: _pa, ...cloudSettings } = importedSettings;
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

        if (importedSettings) {
          const sync = !!user;
          if (importedSettings.timeframes) persistTimeframes(importedSettings.timeframes, sync);
          if (importedSettings.htfTimeframes) persistHtfTimeframes(importedSettings.htfTimeframes, sync);
          if (importedSettings.confirmations) persistConfirmations(importedSettings.confirmations, sync);
          if (importedSettings.sessions) persistSessions(importedSettings.sessions, sync);
          if (importedSettings.assets) persistAssets(importedSettings.assets, sync);
          if (importedSettings.planFidelities) persistPlanFidelities(importedSettings.planFidelities, sync);
          if (importedSettings.entryModels) persistEntryModels(importedSettings.entryModels, sync);
          if (importedSettings.trendTypes) persistTrendTypes(importedSettings.trendTypes, sync);
          if (importedSettings.tpTargets) persistTpTargets(importedSettings.tpTargets, sync);
          if (importedSettings.premiumDiscounts) persistPremiumDiscounts(importedSettings.premiumDiscounts, sync);
          if (importedSettings.newsDays) persistNewsDays(importedSettings.newsDays, sync);
          if (importedSettings.asiaRangeFvgs) persistAsiaRangeFvgs(importedSettings.asiaRangeFvgs, sync);
          if (importedSettings.definitionTitles) persistDefinitionTitles(importedSettings.definitionTitles, sync);
          if (importedSettings.propAccounts) {
            // id'ye göre birleştir: yedekteki hesap aynı id'li yerel hesabın yerine geçer
            const incoming: PropAccount[] = importedSettings.propAccounts;
            const ids = new Set(incoming.map((a) => a.id));
            persistPropAccounts([...incoming, ...propAccounts.filter((a) => !ids.has(a.id))], sync);
          }
        }

        toast.success(
          `Yedek başarıyla yüklendi: ${importedTrades.length} işlem, ${importedNotes.length} not, ${importedJournals.length} günlük${importedSettings ? " ve tanımlamalar" : ""}.`
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
      persistTimeframes,
      persistHtfTimeframes,
      persistConfirmations,
      persistSessions,
      persistAssets,
      persistPlanFidelities,
      persistEntryModels,
      persistTrendTypes,
      persistTpTargets,
      persistPremiumDiscounts,
      persistNewsDays,
      persistAsiaRangeFvgs,
      persistDefinitionTitles,
      persistPropAccounts,
      propAccounts,
      setTrades,
      setNotes,
      setJournals,
    ],
  );

  // Clear all database & project data
  const handleClearAll = useCallback(async (): Promise<boolean> => {
    isClearingRef.current = true;
    try {
      if (user) {
        // 1. Kullanıcının bulut kayıtları silinir. "certificates" kaldırılan özelliğin eski kayıtları için listede kalır.
        //    Giriş (Firebase hesabı) ve profil adı korunur.
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

        // Ayar belgesi (tanımlamalar, prop hesapları vb.)
        try {
          await deleteDoc(doc(db, "settings", user.uid));
        } catch (e) {
          cloudFailed = true;
          console.error("Failed to delete settings doc:", e);
        }

        // Kullanıcının tüm görselleri (Firestore "images" koleksiyonu)
        try {
          await deleteAllUserImages(user.uid);
        } catch (e) {
          cloudFailed = true;
          console.error("Failed to delete storage images:", e);
        }

        if (cloudFailed) {
          toast.error("Bulut verileri tamamen silinemedi. Bağlantınızı kontrol edip tekrar deneyin; yerel veriler korundu.");
          return false;
        }
      }

      // 2. Tarayıcıdaki tüm uygulama kayıtları silinir. Korunanlar: site şifresi oturumu ve Firebase girişi.
      const preserveKey = (k: string) => k === SITE_TOKEN_KEY || k === DATA_OWNER_KEY || k.startsWith("firebase:");
      try {
        Object.keys(localStorage).forEach((k) => {
          if (!preserveKey(k)) localStorage.removeItem(k);
        });
        Object.keys(sessionStorage).forEach((k) => {
          if (!preserveKey(k)) sessionStorage.removeItem(k);
        });
      } catch (e) {
        console.error("Failed to clear browser storage", e);
      }

      // 3. Uygulama durumu varsayılana döner
      setTrades([]);
      setNotes([]);
      setJournals([]);
      persistPropAccounts([], !!user);

      handleAccountScopeChange('ALL');

      persistTimeframes(DEFAULT_TIMEFRAMES, !!user);
      persistHtfTimeframes(DEFAULT_HTF_TIMEFRAMES, !!user);
      persistConfirmations(DEFAULT_CONFIRMATIONS, !!user);
      persistSessions(DEFAULT_SESSIONS, !!user);
      persistAssets(DEFAULT_ASSETS, !!user);
      persistPlanFidelities(DEFAULT_PLAN_FIDELITIES, !!user);
      persistEntryModels(DEFAULT_ENTRY_MODELS, !!user);
      persistTrendTypes(DEFAULT_TREND_TYPES, !!user);
      persistTpTargets(DEFAULT_TP_TARGETS, !!user);
      persistPremiumDiscounts(DEFAULT_PREMIUM_DISCOUNTS, !!user);
      persistNewsDays(DEFAULT_NEWS_DAYS, !!user);
      persistAsiaRangeFvgs(DEFAULT_ASIA_RANGE_FVGS, !!user);
      persistDefinitionTitles(DEFAULT_DEFINITION_TITLES, !!user);

      setGlobalSelectedConfirmations([]);
      setGlobalSelectedPlanFidelity([]);
      setGlobalSelectedAssets([]);
      setGlobalSelectedSessions([]);
      setGlobalSelectedTimeframes([]);
      setGlobalSelectedHtfTimeframes([]);
      setGlobalSelectedStatuses([]);
      setGlobalSelectedTypes([]);
      setGlobalSelectedEntryModels([]);
      setGlobalSelectedTrendTypes([]);
      setGlobalDateLimit(DEFAULT_DATE_LIMIT);
      setGlobalMinAsiaRangePips(undefined);
      setGlobalMaxAsiaRangePips(undefined);
      setGlobalMinMaePips(undefined);
      setGlobalMaxMaePips(undefined);
      setGlobalMinMfePips(undefined);
      setGlobalMaxMfePips(undefined);
      setGlobalExtra(EMPTY_EXTRA_FILTERS);

      setEditingTrade(null);
      setDetailedTrade(null);
      setIsFormOpen(false);
      setIsSettingsOpen(false);
      setIsGlobalFilterModalOpen(false);

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
    setGlobalExtra,
    setTrades,
    setNotes,
    setJournals,
    persistPropAccounts,
    persistTimeframes,
    persistHtfTimeframes,
    persistConfirmations,
    persistSessions,
    persistAssets,
    persistPlanFidelities,
    persistEntryModels,
    persistTrendTypes,
    persistTpTargets,
    persistPremiumDiscounts,
    persistNewsDays,
    persistAsiaRangeFvgs,
    persistDefinitionTitles,
    setGlobalSelectedPlanFidelity,
  ]);

  const filteredGlobalTrades = useMemo(
    () =>
      applyGlobalFilters(trades, {
        activeAccountCategory,
        activeAccount,
        activeUnlinkedOf,
        globalSelectedConfirmations,
        globalSelectedPlanFidelity,
        globalDateLimit,
        globalSelectedAssets,
        globalSelectedSessions,
        globalSelectedTimeframes,
        globalSelectedHtfTimeframes,
        globalSelectedStatuses,
        globalSelectedTypes,
        globalSelectedEntryModels,
        globalSelectedTrendTypes,
        globalMinAsiaRangePips,
        globalMaxAsiaRangePips,
        globalMinMaePips,
        globalMaxMaePips,
        globalMinMfePips,
        globalMaxMfePips,
        globalExtra,
      }),
    [trades, globalExtra, activeAccountCategory, activeAccount, activeUnlinkedOf, globalSelectedConfirmations, globalSelectedPlanFidelity, globalDateLimit, globalSelectedAssets, globalSelectedSessions, globalSelectedTimeframes, globalSelectedHtfTimeframes, globalSelectedStatuses, globalSelectedTypes, globalSelectedEntryModels, globalSelectedTrendTypes, globalMinAsiaRangePips, globalMaxAsiaRangePips, globalMinMaePips, globalMaxMaePips, globalMinMfePips, globalMaxMfePips],
  );

  // Calculate comprehensive statistics (moved outside)

  const calculatedStats = useMemo(
    () => calculateComprehensiveStats(filteredGlobalTrades),
    [filteredGlobalTrades],
  );
  // Ana panel: beklentinin güven aralığı ve Edge Durumu
  const overallEdge = useMemo(
    () => edgeFromR(filteredGlobalTrades.map((t) => (typeof t.rr === "number" && Number.isFinite(t.rr) ? t.rr : 0)), filteredGlobalTrades.map((t) => t.status)),
    [filteredGlobalTrades],
  );

  const activeFilterCount = useMemo(
    () =>
      globalSelectedConfirmations.length +
      globalSelectedPlanFidelity.length +
      globalSelectedAssets.length +
      globalSelectedSessions.length +
      globalSelectedTimeframes.length +
      globalSelectedHtfTimeframes.length +
      globalSelectedStatuses.length +
      globalSelectedTypes.length +
      globalSelectedEntryModels.length +
      globalSelectedTrendTypes.length +
      (globalDateLimit !== DEFAULT_DATE_LIMIT ? 1 : 0) +
      (globalMinAsiaRangePips !== undefined || globalMaxAsiaRangePips !== undefined ? 1 : 0) +
      (globalMinMaePips !== undefined || globalMaxMaePips !== undefined ? 1 : 0) +
      (globalMinMfePips !== undefined || globalMaxMfePips !== undefined ? 1 : 0) +
      countExtraFilters(globalExtra),
    [
      globalExtra,
      globalSelectedConfirmations,
      globalSelectedPlanFidelity,
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
    newsDays,
    asiaRangeFvgs,
    definitionTitles,
    propAccounts,
  }), [
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
    newsDays,
    asiaRangeFvgs,
    definitionTitles,
    propAccounts,
  ]);

  // Ana sayfa panelleri: modal aç/kapa (isFormOpen, filtre penceresi vb.) bu bloğu yeniden çizmez.
  // Haftalık değerlendirme: Cuma NY kapanışından sonra ve hafta sonu, bu hafta işlem varsa ve yazılmadıysa hatırlatılır.
  // Saat ilerledikçe (ör. Cuma 17:00 NY) panel kendiliğinden güncellensin diye 5 dakikada bir yeniden değerlendirilir.
  const [weeklyTick, setWeeklyTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setWeeklyTick((n) => n + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const weeklyDue = useMemo(() => weeklyReviewDue(scopedTrades, journals, Date.now(), activeScopeKey), [scopedTrades, journals, activeScopeKey, weeklyTick]);
  const [weeklyRequest, setWeeklyRequest] = useState<{ week: string; nonce: number } | null>(null);
  const openWeeklyReview = useCallback((week: string) => {
    setWeeklyRequest({ week, nonce: Date.now() });
    handleTabChange("journal");
  }, [handleTabChange]);

  // Yalnızca aşağıdaki veriler değişince yeniden hesaplanır; pencereler bu yüzden takılmadan açılır.
  const mainPanes = useMemo(() => (
            <div className="relative">
                  <TabPane active={currentTab === "dashboard"}
                    className="flex flex-col gap-3.5">
                    {/* Haftalık değerlendirme hatırlatması (yazılınca kaybolur) */}
                    {weeklyDue && (
                      <button
                        type="button"
                        onClick={() => openWeeklyReview(weeklyDue)}
                        className="w-full flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 px-4 py-2.5 text-left transition-ui cursor-pointer"
                      >
                        <span className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0">
                          <CalendarRange size={14} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-violet-100 truncate">Bu haftanın değerlendirmesi bekliyor{activeScopeKey ? ` · ${activeScopeName}` : ""}</span>
                          <span className="block text-[11px] text-violet-200/70 truncate">Haftanın istatistikleri hazır; üç kısa soruyu yanıtla, gelecek haftanın odağını belirle.</span>
                        </span>
                        <span className="text-[11px] font-bold text-violet-200 shrink-0">Değerlendir →</span>
                      </button>
                    )}
                    <DateLimitNote limit={globalDateLimit} shown={filteredGlobalTrades.length} onReset={() => setGlobalDateLimit(DEFAULT_DATE_LIMIT)} />
                    {/* STATS BENTO ROW */}
                    <SectionErrorBoundary sectionName="İstatistik Panosu">
                      <StatsDashboard stats={calculatedStats} edge={overallEdge} />
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
                          onViewDetails={openTradeDetail}
                          definitionTitles={definitionTitles}
                        />
                      </SectionErrorBoundary>
                    </div>
                  </TabPane>
                  <TabPane active={currentTab === "deep-analysis"}>
                    <div className="mb-3 empty:hidden">
                      <DateLimitNote limit={globalDateLimit} shown={filteredGlobalTrades.length} onReset={() => setGlobalDateLimit(DEFAULT_DATE_LIMIT)} />
                    </div>
                    <SectionErrorBoundary sectionName="Derin Analiz">
                      <DeepAnalysis
                        trades={filteredGlobalTrades}
                        onViewDetails={openTradeDetail}
                        onEdit={handleStartEdit}
                        onDelete={handleDeleteTrade}
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
                        trades={scopedTrades}
                        weeklyScope={activeScopeKey}
                        weeklyScopeName={activeScopeName}
                        onSaveEntry={handleSaveJournal}
                        onDeleteEntry={handleDeleteJournal}
                        weeklyRequest={weeklyRequest}
                      />
                    </SectionErrorBoundary>
                  </TabPane>
                  <TabPane active={currentTab === "prop"}>
                    <SectionErrorBoundary sectionName="Prop">
                      <PropView accounts={propAccounts} trades={trades} onChange={handlePropAccountsChange} uploadImage={uploadPropImage} />
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
  ), [ globalDateLimit, setGlobalDateLimit, weeklyDue, weeklyRequest, openWeeklyReview, scopedTrades, activeScopeKey, activeScopeName, calculatedStats, overallEdge, currentTab, definitionTitles, entryModels, filteredGlobalTrades, handleDeleteJournal, handleDeleteNote, handleDeleteTrade, handleSaveJournal, handleSaveNote, handleStartEdit, journals, notes, planFidelities, propAccounts, handlePropAccountsChange, uploadPropImage, sessions, setDetailedTrade, setEditingTrade, setIsFormOpen, trades, trendTypes ]);

  return (
    <AllTradesContext.Provider value={trades}>
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
            fontFamily: 'var(--font-sans)',
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
              activeAccount={activeAccount}
              unlinkedActive={!!activeUnlinkedOf}
              onSelect={handleAccountScopeChange}
              counts={accountCategoryCounts}
              accounts={scopeAccounts}
            />

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
                    {...POPOVER}
                    className="origin-top-right absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 text-xs"
                  >
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
                      {displayName ? displayName.slice(0, 2) : (user.email ? user.email.slice(0, 2) : "U")}
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
                            <button aria-label="Onayla" title="Onayla"
                              onClick={() => handleUpdateUsername(tempUsername)}
                              className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition border border-emerald-500/20 cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button aria-label="Kapat" title="Kapat"
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
                                  {displayName || user.email || "Bağlı Hesap"}
                                </span>
                                <button aria-label="Düzenle" title="Düzenle"
                                  type="button"
                                  onClick={() => {
                                    setTempUsername(displayName || "");
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
              { id: "prop", label: "PROP", icon: Wallet },
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
            mainPanes
          )}
          
            {globalFilterMounted && (
              <Suspense fallback={null}>
            <GlobalFilterModal
              isOpen={isGlobalFilterModalOpen}
              onClose={closeGlobalFilter}
              timeframes={timeframes}
              htfTimeframes={htfTimeframes}
              confirmations={confirmations}
              sessions={sessions}
              assets={assets}
              planFidelities={planFidelities}
              entryModels={entryModels}
              trendTypes={trendTypes}
              definitionTitles={definitionTitles}
              globalSelectedConfirmations={globalSelectedConfirmations}
              setGlobalSelectedConfirmations={setGlobalSelectedConfirmations}
              globalSelectedPlanFidelity={globalSelectedPlanFidelity}
              setGlobalSelectedPlanFidelity={setGlobalSelectedPlanFidelity}
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
              trades={scopedTrades}
              premiumDiscounts={premiumDiscounts}
              tpTargets={tpTargets}
              asiaRangeFvgs={asiaRangeFvgs}
              globalExtra={globalExtra}
              setGlobalExtra={setGlobalExtra}
            />
              </Suspense>
            )}

            {/* RECOVERY BACKUP RESCUE MOD - FOOTNOTE */}
            <Suspense fallback={null}>
            <BackupRescue
              trades={trades}
              notes={notes}
              journals={journals}
              settings={backupSettings}
              onImportTrades={handleImportTrades}
              onClearAll={handleClearAll}
              onEditTrade={handleStartEdit}
            />
            </Suspense>

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
        <Suspense fallback={null}>
        <DefinitionsManagerModal
          isOpen={isPlatformMenuOpen}
          onClose={closePlatformMenu}
          trades={trades}
          timeframes={timeframes}
          htfTimeframes={htfTimeframes}
          confirmations={confirmations}
          sessions={sessions}
          assets={assets}
          planFidelities={planFidelities}
          entryModels={entryModels}
          trendTypes={trendTypes}
          tpTargets={tpTargets}
          premiumDiscounts={premiumDiscounts}
          newsDays={newsDays}
          asiaRangeFvgs={asiaRangeFvgs}
          definitionTitles={definitionTitles}
          persistTimeframes={persistTimeframes}
          persistHtfTimeframes={persistHtfTimeframes}
          persistConfirmations={persistConfirmations}
          persistSessions={persistSessions}
          persistAssets={persistAssets}
          persistPlanFidelities={persistPlanFidelities}
          persistEntryModels={persistEntryModels}
          persistTrendTypes={persistTrendTypes}
          persistTpTargets={persistTpTargets}
          persistPremiumDiscounts={persistPremiumDiscounts}
          persistNewsDays={persistNewsDays}
          persistAsiaRangeFvgs={persistAsiaRangeFvgs}
          onRenameDefinition={handleRenameDefinition}
          persistDefinitionTitles={persistDefinitionTitles}
        />
        </Suspense>
      )}

      {/* OVERLAY MODALS WRAPPER */}
        {/* OVERLAY MODAL: TRANSACTION FORM (ADD OR EDIT) — hep bağlı, CSS ile açılır/kapanır (index.css: .form-modal) */}
        {(formWarm || isFormOpen || formSlot.needsReset) &&
          createPortal(
            <div
              className="form-modal fixed inset-0 modal-layer modal-dim z-[1500] overflow-hidden flex items-center justify-center p-2 sm:p-4 cursor-pointer"
              data-open={isFormOpen ? "" : undefined}
              aria-hidden={!isFormOpen}
              inert={!isFormOpen}
              onClick={requestCloseForm}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`form-modal-panel w-full ${formQuickMode && !formSlot.editing ? "max-w-4xl" : "max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px]"} h-auto max-h-[96vh] overflow-hidden bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl relative shadow-2xl flex flex-col cursor-default my-auto`}
              >
                <Suspense fallback={<div className="p-4"><PaneLoader minHeight={360} label="Form hazırlanıyor" /></div>}>
                  <AddTradeForm
                    key={formKey}
                    onSave={handleSaveTradeAndClose}
                    editingTrade={formSlot.editing}
                    onCancelEdit={handleCancelEdit}
                    timeframes={timeframes}
                    htfTimeframes={htfTimeframes}
                    sessions={sessions}
                    confirmations={confirmations}
                    assets={assets}
                    planFidelities={planFidelities}
                    entryModels={entryModels}
                    trendTypes={trendTypes}
                    tpTargets={tpTargets}
                    premiumDiscounts={premiumDiscounts}
                    newsDays={newsDays}
                    asiaRangeFvgs={asiaRangeFvgs}
                    definitionTitles={definitionTitles}
                    lastTrade={latestTrade}
                    registerCloseGuard={registerFormCloseGuard}
                    propAccounts={propAccounts}
                    defaultAccountChoice={defaultAccountChoice}
                    quickMode={formQuickMode}
                    onQuickModeChange={setFormQuickMode}
                    active={isFormOpen}
                  />
                </Suspense>
              </div>
            </div>,
            document.body,
          )}

        {/* LIGHTBOX DETAILS MODAL */}
        {detailMounted && (
          <Suspense fallback={null}>
            <TradeDetailModal
              key="trade-detail-modal"
              trade={detailedTrade}
              onClose={handleCloseTradeDetail}
              onEdit={handleStartEdit}
              onDelete={handleDeleteTrade}
              definitionTitles={definitionTitles}
              navList={detailNavList}
              onNavigate={setDetailedTrade}
            />
          </Suspense>
        )}


        {/* AUTH MODAL */}
        {authModalMounted && (
          <Suspense fallback={null}>
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={closeAuthModal}
            />
          </Suspense>
        )}

    </div>
    </AllTradesContext.Provider>
  );
}
