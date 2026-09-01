import { useState, useEffect, useMemo, useCallback } from "react";
import { Trade, TradeStats, Note, JournalEntry, Certificate } from "./types";
import {
  DEFAULT_PLATFORMS,
  DEFAULT_TIMEFRAMES,
  DEFAULT_HTF_TIMEFRAMES,
  DEFAULT_CONFIRMATIONS,
  DEFAULT_CONCEPTS,
  DEFAULT_SESSIONS,
  DEFAULT_ASSETS,
} from "./constants/constants";
import StatsDashboard from "./components/StatsDashboard";
import TradeList from "./components/TradeList";
import DeepAnalysis from "./components/DeepAnalysis";
import NotesView from "./components/NotesView";
import JournalView from "./components/JournalView";
import { CertificatesView } from "./components/CertificatesView";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import EconomicCalendar from "./components/EconomicCalendar";
import { useMetricMode } from "./context/MetricContext";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import { useAppStore } from "./store/useAppStore";
import { Toaster, toast } from "react-hot-toast";

import AddTradeForm from "./components/AddTradeForm";
import TradeDetailModal from "./components/TradeDetailModal";
import BackupRescue from "./components/BackupRescue";
import { GlobalFilterModal } from "./components/GlobalFilterModal";
import { AuthModal } from "./components/AuthModal";
import AICoPilotModal from "./components/AICoPilotModal";


import {
  Globe,
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
  GripVertical,
  Trash2,
  Settings,
  Monitor,
  Activity,
  Briefcase,
  Target,
  LineChart,
  Clock,
  ArrowUpRight,
  Lightbulb,
  Sun,
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
import { onAuthStateChanged, User } from "firebase/auth";
import { uploadImageToStorage } from "./lib/storage";
import { calculateProfitFactor, calculateExpectancy, toRR } from "./lib/statMath";

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

  const closedList = list;
  const winningTrades = closedList.filter((t) => t.status === "WIN").length;
  const losingTrades = closedList.filter((t) => t.status === "LOSS").length;
  const breakevenTrades = closedList.filter(
    (t) => t.status === "BREAKEVEN",
  ).length;

  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

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

  closedList.forEach((t) => {
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
  });

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

export default function App() {
  const { isRrMode, setMode } = useMetricMode();
  // Trade Ledger Database State
  const [trades, setTrades] = useLocalStorageState<Trade[]>("trading_journal_db", []);
  const [notes, setNotes] = useLocalStorageState<Note[]>("trading_journal_notes", []);
  const [journals, setJournals] = useLocalStorageState<JournalEntry[]>("trading_journal_journals", []);
  const [certificates, setCertificates] = useLocalStorageState<Certificate[]>("trading_journal_certificates", []);
  const [user, setUser] = useState<User | null>(null);
  const [, setIsAuthInitializing] = useState(false);
  const [indexErrorUrl] = useState<string | null>(null);
  const [showUsername, setShowUsername] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalFilterModalOpen, setIsGlobalFilterModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Navigation tabs state
  const [currentTab, setCurrentTab] = useState<
    | "dashboard"
    | "deep-analysis"
    | "economic-calendar"
    | "journal"
    | "notes"
    | "certificates"
  >("dashboard");

  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    window.scrollTo(0, 0);
  }, []);

    const {
    globalSelectedConfirmations,
    setGlobalSelectedConfirmations,
    globalSelectedConcepts,
    setGlobalSelectedConcepts,
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
    globalDateLimit,
    setGlobalDateLimit,
    isQuantMode,
    setIsQuantMode,
  } = useAppStore();

  useEffect(() => {
    document.title = isQuantMode ? "Quantitative Data Registry" : "Trading Journal";
  }, [isQuantMode]);

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

  const persistPlatforms = (updated: string[], syncCloud = true) => {
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
  };

  const [timeframes, setTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_timeframes_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TIMEFRAMES;
  });

  const persistTimeframes = (updated: string[], syncCloud = true) => {
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
  };

  const [htfTimeframes, setHtfTimeframes] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_htf_timeframes_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_HTF_TIMEFRAMES;
  });

  const persistHtfTimeframes = (updated: string[], syncCloud = true) => {
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
  };

  const [confirmations, setConfirmations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_confirmations_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIRMATIONS;
  });

  const persistConfirmations = (updated: string[], syncCloud = true) => {
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
  };

  const [concepts, setConcepts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_concepts_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONCEPTS;
  });

  const persistConcepts = (updated: string[], syncCloud = true) => {
    setConcepts(updated);
    try {
      localStorage.setItem("trading_concepts_list", JSON.stringify(updated));
      if (syncCloud && user) {
        setDoc(doc(db, "settings", user.uid), cleanForFirestore({ concepts: updated, userId: user.uid }), { merge: true })
          .catch(err => console.error(err));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [sessions, setSessions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_sessions_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SESSIONS;
  });

  const persistSessions = (updated: string[], syncCloud = true) => {
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
  };

  const [assets, setAssets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("trading_assets_list");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ASSETS;
  });

  const persistAssets = (updated: string[], syncCloud = true) => {
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
  };

  // Settings menu state
  const [settingsTab, setSettingsTab] = useState<
    "platforms" | "timeframes" | "htfTimeframes" | "confirmations" | "sessions" | "assets" | "concepts"
  >("platforms");

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
        setIsQuantMode(!isQuantMode);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuantMode, setIsQuantMode]);

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
      unsubscribeTrades = onSnapshot(
        qTrades,
        (querySnapshot) => {
          const cloudTrades: Trade[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudTrades.push({ ...data, id: docSnap.id } as Trade);
          });
          cloudTrades.sort((a, b) => b.createdAt - a.createdAt);
          setTrades(cloudTrades);
          setIsLoading(false);
        },
        (err) => {
          console.error("Firestore read error:", err);
          setIsLoading(false);
        }
      );

      // --- NOTES ---
      const qNotes = query(
        collection(db, "notes"),
        where("userId", "==", user.uid)
      );
      unsubscribeNotes = onSnapshot(
        qNotes,
        (querySnapshot) => {
          const cloudNotes: Note[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudNotes.push({ ...data, id: docSnap.id } as Note);
          });
          cloudNotes.sort((a, b) => b.updatedAt - a.updatedAt);
          setNotes(cloudNotes);
        },
        (err) => console.error("Firestore read notes error:", err)
      );

      // --- JOURNALS ---
      const qJournals = query(
        collection(db, "journals"),
        where("userId", "==", user.uid)
      );
      unsubscribeJournals = onSnapshot(
        qJournals,
        (querySnapshot) => {
          const cloudJournals: JournalEntry[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudJournals.push({ ...data, id: docSnap.id } as JournalEntry);
          });
          cloudJournals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setJournals(cloudJournals);
        },
        (err) => console.error("Firestore read journals error:", err)
      );
      
      // --- CERTIFICATES ---
      const qCertificates = query(
        collection(db, "certificates"),
        where("userId", "==", user.uid)
      );
      unsubscribeCertificates = onSnapshot(
        qCertificates,
        (querySnapshot) => {
          const cloudCertificates: Certificate[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudCertificates.push({ ...data, id: docSnap.id } as Certificate);
          });
          cloudCertificates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setCertificates((prevLocal) => {
            const cloudIds = new Set(cloudCertificates.map((c) => c.id));
            const unsyncedLocal = prevLocal.filter((c) => !cloudIds.has(c.id));

            unsyncedLocal.forEach((cert) => {
              setDoc(doc(db, "certificates", cert.id), cleanForFirestore({
                ...cert,
                userId: user.uid,
              })).catch((e) => console.error("Sync local certificate to cloud error:", e));
            });

            const merged = [...cloudCertificates, ...unsyncedLocal].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            try {
              localStorage.setItem("trading_journal_certificates", JSON.stringify(merged));
            } catch (err) {}
            return merged;
          });
        },
        (err) => {
          console.error("Firestore read certificates error:", err);
          try {
            const local = localStorage.getItem("trading_journal_certificates");
            if (local) {
              setCertificates(JSON.parse(local));
            }
          } catch (e) {}
        }
      );
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

        const conceptsRaw = localStorage.getItem("trading_concepts_list");
        if (conceptsRaw) setConcepts(JSON.parse(conceptsRaw));

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

      const existingTrade = trades.find((t) => t.id === finalTradeId);

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
            alert("Local storage is full! Try deleting old trades or sync to cloud.");
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

        setDoc(doc(db, "trades", finalTradeId), cleanForFirestore(finalTradeToCloud)).catch((err) => {
          console.error("Failed to save to cloud:", err);
          setTrades((current) => {
            if (isNew) {
              return current.filter(t => t.id !== finalTradeId);
            } else {
              return current.map(t => t.id === finalTradeId ? (existingTrade as Trade) : t);
            }
          });
        });

      }

      // Auto-sync any newly entered assets, concepts, confirmations, platforms, or sessions into global lists
      if (tradeData.asset && !assets.some(a => a.toLowerCase() === tradeData.asset.toLowerCase())) {
        persistAssets([...assets, tradeData.asset], !!user);
      }
      if (tradeData.platform && !platforms.includes(tradeData.platform)) {
        persistPlatforms([...platforms, tradeData.platform], !!user);
      }
      if (tradeData.concept && !concepts.includes(tradeData.concept)) {
        persistConcepts([...concepts, tradeData.concept], !!user);
      }
      if (tradeData.session && !sessions.includes(tradeData.session)) {
        persistSessions([...sessions, tradeData.session], !!user);
      }
      if (tradeData.timeframe && !timeframes.includes(tradeData.timeframe)) {
        persistTimeframes([...timeframes, tradeData.timeframe], !!user);
      }
      if (tradeData.htfTimeframe && !htfTimeframes.includes(tradeData.htfTimeframe)) {
        persistHtfTimeframes([...htfTimeframes, tradeData.htfTimeframe], !!user);
      }
      if (tradeData.confirmations && tradeData.confirmations.length > 0) {
        const newConfs = tradeData.confirmations.filter(c => !confirmations.includes(c));
        if (newConfs.length > 0) {
          persistConfirmations([...confirmations, ...newConfs], !!user);
        }
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
      persistAssets,
      persistPlatforms,
      persistConcepts,
      persistSessions,
      persistTimeframes,
      persistHtfTimeframes,
      persistConfirmations,
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
        if (isFormOpen) {
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
  }, [isFormOpen, isPlatformMenuOpen, detailedTrade, isGlobalFilterModalOpen, isAuthModalOpen, handleCancelEdit, handleCloseTradeDetail]);

  // Delete single trade
  const handleDeleteTrade = useCallback(
    async (id: string) => {
      let deletedTrade: Trade | undefined;

      setTrades((prevTrades) => {
        deletedTrade = prevTrades.find((t) => t.id === id);
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
      if (user && deletedTrade) {
        // Sync to cloud (optimistic fire-and-forget)
        deleteDoc(doc(db, "trades", id)).catch((err) => {
           console.error("Failed to delete from cloud", err);
           // Rollback if cloud fails
           setTrades(current => [...current, deletedTrade!].sort((a,b) => b.createdAt - a.createdAt));
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
  // Set Notes

  const handleSaveNote = useCallback(
    async (
      noteData: Note,
      options?: { silent?: boolean }
    ) => {
      const isNew = !noteData.id;
      const finalNoteId = noteData.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const finalNote = { ...noteData, id: finalNoteId };
      const existingNote = notes.find((n) => n.id === finalNoteId);

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

        if (!user) {
          try {
            localStorage.setItem(
              "trading_journal_notes",
              JSON.stringify(updatedList),
            );
          } catch (err) {
            console.error("Local storage quota exceeded:", err);
            alert("Storage limit reached! Cannot save note locally.");
          }
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
        });

      }
      if (!options?.silent) {
        toast.success(isNew ? "Not başarıyla kaydedildi." : "Not başarıyla güncellendi.");
      }
    },
    [user, notes]
  );
  const handleDeleteNote = useCallback(
    async (id: string) => {
      const deletedNote = notes.find((n) => n.id === id);
      
      setNotes((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        
        if (!user) {
          try {
            localStorage.setItem(
              "trading_journal_notes",
              JSON.stringify(updated),
            );
          } catch(err) {
            console.error(err);
          }
        }
        return updated;
      });
      if (user && deletedNote) {
        deleteDoc(doc(db, "notes", id)).catch((err) => {
          console.error("Failed to delete note from cloud", err);
          setNotes(current => [...current, deletedNote!].sort((a,b) => b.updatedAt - a.updatedAt));
        });
      }
      toast.success("Not başarıyla silindi.");
    },
    [user, notes],
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
        id: entryData.id || crypto.randomUUID(),
        createdAt: (entryData as any).createdAt || now,
        updatedAt: now,
      };

      const existingEntry = journals.find((j) => j.id === finalEntry.id);

      setJournals((prev) => {
        const updatedList = isNew
          ? [finalEntry, ...prev]
          : prev.map((j) => (j.id === finalEntry.id ? finalEntry : j));
        
        if (!user) {
          try {
            localStorage.setItem(
              "trading_journal_journals",
              JSON.stringify(updatedList),
            );
          } catch(err) {
            console.error("Local storage quota exceeded:", err);
            alert("Storage limit reached! Cannot save journal locally.");
          }
        }
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
        });
      }
      if (!options?.silent) {
        toast.success(isNew ? "Günlük kaydı başarıyla eklendi." : "Günlük kaydı başarıyla güncellendi.");
      }
    },
    [user, journals],
  );

  // Handle Journal Delete
  const handleDeleteJournal = useCallback(
    async (id: string) => {
      const deletedJournal = journals.find((j) => j.id === id);

      setJournals((prev) => {
        const updated = prev.filter((j) => j.id !== id);
        
        if (!user) {
          try {
            localStorage.setItem(
              "trading_journal_journals",
              JSON.stringify(updated),
            );
          } catch(err) {
            console.error(err);
          }
        }
        return updated;
      });
      if (user && deletedJournal) {
        deleteDoc(doc(db, "journals", id)).catch((err) => {
          console.error("Failed to delete journal from cloud", err);
          setJournals(current => [...current, deletedJournal!].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });
      }
      toast.success("Günlük kaydı başarıyla silindi.");
    },
    [user, journals],
  );

  const handleSaveCertificate = useCallback(
    async (certData: Certificate | Omit<Certificate, 'id' | 'createdAt'>) => {
      const isNew = !('id' in certData) || !certData.id;
      const finalCertId = isNew ? `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : (certData as Certificate).id;
      
      const initialCert = {
        ...certData,
        id: finalCertId,
        createdAt: isNew ? Date.now() : (certData as Certificate).createdAt,
      } as Certificate;

      // Optimistic update
      setCertificates((prev) => {
        let updatedList: Certificate[];
        if (isNew) {
          updatedList = [initialCert, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
          updatedList = prev.map((c) => (c.id === finalCertId ? initialCert : c)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        try {
          localStorage.setItem("trading_journal_certificates", JSON.stringify(updatedList));
        } catch (err) {
          console.error("Local storage quota exceeded:", err);
        }
        return updatedList;
      });

      let processedCert = { ...initialCert };
      if (user && processedCert.image && processedCert.image.startsWith('data:image')) {
        try {
          const downloadUrl = await uploadImageToStorage(user.uid, processedCert.image, 'certificates');
          processedCert.image = downloadUrl;
        } catch (error) {
          console.warn("Storage upload fallback to embedded image:", error);
          if (processedCert.image.length > 700000) {
            processedCert.image = null;
          }
        }
      }

      // Ensure local state and local storage have the updated processedCert (with cloud URL)
      setCertificates((prev) => {
        const updated = prev.map((c) => (c.id === finalCertId ? processedCert : c)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        try {
          localStorage.setItem("trading_journal_certificates", JSON.stringify(updated));
        } catch (err) {
          console.error("Local storage quota exceeded:", err);
        }
        return updated;
      });

      if (user) {
        setDoc(doc(db, "certificates", finalCertId), cleanForFirestore({
          ...processedCert,
          userId: user.uid,
        }))
          .then(() => {
            toast.success("Sertifika başarıyla kaydedildi.");
          })
          .catch((err) => {
            console.error("Failed to save certificate to cloud:", err);
            toast.error("Bulut kaydında gecikme oluştu, verileriniz yerel olarak korundu.");
          });
      } else {
        toast.success("Sertifika yerel olarak kaydedildi.");
      }
    },
    [user]
  );

  const handleDeleteCertificate = useCallback(
    async (id: string) => {
      const deletedCert = certificates.find((c) => c.id === id);
      
      setCertificates((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        try {
          localStorage.setItem("trading_journal_certificates", JSON.stringify(updated));
        } catch(err) {}
        return updated;
      });
      
      if (user) {
        try {
          await deleteDoc(doc(db, "certificates", id));
          toast.success("Sertifika başarıyla silindi.");
        } catch (err) {
          console.error("Failed to delete certificate from cloud", err);
          toast.error("Buluttan silinirken hata oluştu.");
          if (deletedCert) {
            setCertificates(current => [...current, deletedCert].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          }
        }
      } else {
        toast.success("Sertifika yerel olarak silindi.");
      }
    },
    [user, certificates],
  );

  // Import all app data from JSON Backup
  const handleImportTrades = useCallback(
    async (
      importedTrades: Trade[],
      importedNotes: Note[] = [],
      importedJournals: any[] = [],
      importedCertificates: Certificate[] = [],
      importedSettings: any = null
    ) => {
      try {
        if (user) {
          // Prepare Firestore batch write operations in safe chunks of 400
          type WriteOp = { ref: any; data: any; merge?: boolean };
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

          // Commit items in chunks
          const chunkSize = 400;
          for (let i = 0; i < writeOps.length; i += chunkSize) {
            const chunk = writeOps.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((op) => {
              batch.set(op.ref, op.data);
            });
            await batch.commit();
          }

          if (importedSettings) {
            const docRef = doc(db, "settings", user.uid);
            await setDoc(docRef, cleanForFirestore({ ...importedSettings, userId: user.uid }), { merge: true });
          }
        }

        // Local State and Storage Update
        if (importedTrades.length > 0) {
          setTrades((prev) => {
            const existingIds = new Set(importedTrades.map((t) => t.id));
            const merged = [...importedTrades, ...prev.filter((t) => !existingIds.has(t.id))];
            try {
              localStorage.setItem("trading_journal_db", JSON.stringify(merged));
            } catch (e) {
              console.error(e);
            }
            return merged;
          });
        }

        if (importedNotes.length > 0) {
          setNotes((prev) => {
            const existingIds = new Set(importedNotes.map((n) => n.id));
            const merged = [...importedNotes, ...prev.filter((n) => !existingIds.has(n.id))];
            try {
              localStorage.setItem("trading_journal_notes", JSON.stringify(merged));
            } catch (e) {
              console.error(e);
            }
            return merged;
          });
        }

        if (importedJournals.length > 0) {
          setJournals((prev) => {
            const existingIds = new Set(importedJournals.map((j) => j.id));
            const merged = [...importedJournals, ...prev.filter((j) => !existingIds.has(j.id))];
            try {
              localStorage.setItem("trading_journal_journals", JSON.stringify(merged));
            } catch (e) {
              console.error(e);
            }
            return merged;
          });
        }

        if (importedCertificates.length > 0) {
          setCertificates((prev) => {
            const existingIds = new Set(importedCertificates.map((c) => c.id));
            const merged = [...importedCertificates, ...prev.filter((c) => !existingIds.has(c.id))];
            try {
              localStorage.setItem("trading_journal_certificates", JSON.stringify(merged));
            } catch (e) {
              console.error(e);
            }
            return merged;
          });
        }

        if (importedSettings) {
          if (importedSettings.platforms) persistPlatforms(importedSettings.platforms, !!user);
          if (importedSettings.timeframes) persistTimeframes(importedSettings.timeframes, !!user);
          if (importedSettings.htfTimeframes) persistHtfTimeframes(importedSettings.htfTimeframes, !!user);
          if (importedSettings.confirmations) persistConfirmations(importedSettings.confirmations, !!user);
          if (importedSettings.concepts) persistConcepts(importedSettings.concepts, !!user);
          if (importedSettings.sessions) persistSessions(importedSettings.sessions, !!user);
          if (importedSettings.assets) persistAssets(importedSettings.assets, !!user);
        }

        toast.success(
          `Yedek başarıyla yüklendi: ${importedTrades.length} işlem, ${importedNotes.length} not, ${importedJournals.length} günlük, ${importedCertificates.length} sertifika.`
        );
      } catch (err: any) {
        console.error("Import error in App.tsx:", err);
        toast.error("Yedek verileri içe aktarılırken bir hata oluştu.");
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
      setTrades,
      setNotes,
      setJournals,
      setCertificates,
    ],
  );

  // Clear all database & project data
  const handleClearAll = useCallback(async () => {
    try {
      if (user) {
        // 1. Delete all Firestore user documents across all collections in parallel batches
        const collectionsToClear = [
          "trades",
          "notes",
          "journals",
          "certificates",
        ];

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
            console.error(`Error clearing cloud collection ${colName}:`, colErr);
          }
        }

        // Delete user settings documents in Firestore
        try {
          await deleteDoc(doc(db, "settings", user.uid));
        } catch (e) {
          console.error("Failed to delete settings doc:", e);
        }
      }

      // 2. Clear all local storage keys
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
        "trading_sessions_list",
        "trading_assets_list",
        "trading_journal_filters",
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (e) {
          console.error(`Failed to remove ${k} from localStorage`, e);
        }
      });

      // 3. Reset all React States to initial default clean state
      setTrades([]);
      setNotes([]);
      setJournals([]);
      setCertificates([]);

      persistPlatforms(DEFAULT_PLATFORMS, !!user);
      persistTimeframes(DEFAULT_TIMEFRAMES, !!user);
      persistHtfTimeframes(DEFAULT_HTF_TIMEFRAMES, !!user);
      persistConfirmations(DEFAULT_CONFIRMATIONS, !!user);
      persistConcepts(DEFAULT_CONCEPTS, !!user);
      persistSessions(DEFAULT_SESSIONS, !!user);
      persistAssets(DEFAULT_ASSETS, !!user);

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

      setEditingTrade(null);
      setDetailedTrade(null);
      setIsFormOpen(false);
      setIsSettingsOpen(false);
      setIsGlobalFilterModalOpen(false);
      setIsCopilotOpen(false);

      // 4. Dispatch global wipe event
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("trading-journal-wipe-all"));

      toast.success("Bütün veriler ve ayarlar başarıyla sıfırlandı.");
    } catch (err) {
      console.error("Sıfırlama hatası:", err);
      toast.error("Veriler sıfırlanırken bir hata oluştu.");
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
    setGlobalDateLimit,
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
  ]);

  const filteredGlobalTrades = useMemo(() => {
    const minTime = getMinTimestamp(globalDateLimit);
    return trades.filter((t: Trade) => {
      if (minTime > 0 && (!t.createdAt || t.createdAt < minTime)) {
        return false;
      }
      const matchConfirmation = globalSelectedConfirmations.length === 0 || (t.confirmations && globalSelectedConfirmations.every(c => t.confirmations!.includes(c)));
      const matchConcept = globalSelectedConcepts.length === 0 || (t.concept && globalSelectedConcepts.includes(t.concept));
      const matchPlatform = globalSelectedPlatforms.length === 0 || (t.platform && globalSelectedPlatforms.includes(t.platform));
      const matchAsset = globalSelectedAssets.length === 0 || (t.asset && globalSelectedAssets.includes(t.asset));
      const matchSession = globalSelectedSessions.length === 0 || (t.session && globalSelectedSessions.includes(t.session));
      const matchTimeframe = globalSelectedTimeframes.length === 0 || (t.timeframe && globalSelectedTimeframes.includes(t.timeframe));
      const matchHtfTimeframe = globalSelectedHtfTimeframes.length === 0 || (t.htfTimeframe && globalSelectedHtfTimeframes.includes(t.htfTimeframe));
      const matchStatus = globalSelectedStatuses.length === 0 || (t.status && globalSelectedStatuses.includes(t.status));
      const matchType = globalSelectedTypes.length === 0 || (t.type && globalSelectedTypes.includes(t.type));

      return matchConfirmation && matchConcept && matchPlatform && matchAsset && matchSession && matchTimeframe && matchHtfTimeframe && matchStatus && matchType;
    });

  }, [trades, globalSelectedConfirmations, globalSelectedConcepts, globalSelectedPlatforms, globalDateLimit, globalSelectedAssets, globalSelectedSessions, globalSelectedTimeframes, globalSelectedHtfTimeframes, globalSelectedStatuses, globalSelectedTypes]);

  // Calculate comprehensive statistics (moved outside)

  const calculatedStats = useMemo(
    () => calculateComprehensiveStats(filteredGlobalTrades, isRrMode),
    [filteredGlobalTrades, isRrMode],
  );

  const activeFilterCount = useMemo(
    () =>
      globalSelectedConfirmations.length +
      globalSelectedConcepts.length +
      globalSelectedAssets.length +
      globalSelectedSessions.length +
      globalSelectedTimeframes.length +
      globalSelectedHtfTimeframes.length +
      globalSelectedStatuses.length +
      globalSelectedTypes.length +
      (globalDateLimit !== "6m" ? 1 : 0),
    [
      globalSelectedConfirmations,
      globalSelectedConcepts,
      globalSelectedAssets,
      globalSelectedSessions,
      globalSelectedTimeframes,
      globalSelectedHtfTimeframes,
      globalSelectedStatuses,
      globalSelectedTypes,
      globalDateLimit,
    ]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-blue-400/30 selection:text-white">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #27272a' } }} />
      {/* 1. COMPACT NAVBAR */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3.5 flex flex-row items-center justify-between gap-2 sm:gap-3 relative">
          
          <div className="flex items-center z-10">
            {/* Brand */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (currentTab === "dashboard") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  handleTabChange("dashboard");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <div className="h-7 w-7 rounded-full bg-blue-400 flex items-center justify-center font-black text-black font-sans text-sm select-none shadow-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                {isQuantMode ? "QD" : "TJ"}
              </div>
              <div className="block">
                <h1 className="text-xs font-black tracking-wider text-zinc-100 flex items-center gap-2 uppercase transition-colors duration-200 group-hover:text-white">
                  {isQuantMode ? "QUANTITATIVE DATA REGISTRY" : "Trading Journal"}
                  {!isQuantMode && (
                    <span className="text-[10px] font-normal text-zinc-400 normal-case lowercase hidden sm:inline transition-colors duration-200 group-hover:text-zinc-300">
                      by Mawlynn
                    </span>
                  )}
                </h1>
              </div>
            </div>


          </div>

          <div className="flex items-center justify-end shrink-0 select-none gap-2 z-10">
            {/* Ayarlar (Settings) Icon-Only Button & Dropdown Menu at the far right */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                
                className="relative w-5.5 h-5.5 rounded bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700/70 hover:border-zinc-500 text-zinc-200 transition-colors duration-200 ease-out cursor-pointer shadow-sm flex items-center justify-center shrink-0 active:scale-95"
              >
                <Settings size={11} className={`text-zinc-300 transition-transform duration-200 ${isSettingsOpen ? 'rotate-45 text-blue-400' : ''}`} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-0.5 min-w-[12px] h-[12px] rounded-full text-[9px] font-mono font-black bg-blue-500 text-black shadow flex items-center justify-center leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {isSettingsOpen && (
                <>
                  {/* Backdrop overlay */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsSettingsOpen(false)} 
                  />

                  <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-md p-2 z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-200 ease-out">
                    <div className={`px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between ${isQuantMode ? 'border-b border-zinc-800/50 mb-1' : 'border-b border-zinc-800'}`}>
                      <span>{isQuantMode ? "SYSTEM CONFIG" : "Sistem & Ayarlar"}</span>
                      <Settings size={12} className="text-zinc-500" />
                    </div>

                    {/* Platform Selector in Settings */}
                    {!isQuantMode && (
                      <div className="px-2 py-2 border-b border-zinc-800 mb-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                        <span>Aktif Platform</span>
                        <Monitor size={10} className="text-zinc-500" />
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setGlobalSelectedPlatforms([])}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                            globalSelectedPlatforms.length === 0
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
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
                              className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-sm"
                                  : "bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 1. Filtreleme */}
                    {!isQuantMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsGlobalFilterModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 transition-colors duration-200 ease-out text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-[11px]">Filtreleme</span>
                        </div>
                        {activeFilterCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {activeFilterCount} aktif
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono">Tümü</span>
                        )}
                      </button>
                    )}
                    
                    {/* Quant / Audit Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuantMode(!isQuantMode);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 transition-colors duration-200 ease-out text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={14} className={isQuantMode ? "text-emerald-400 group-hover:scale-110 transition-transform" : "text-zinc-500 group-hover:scale-110 transition-transform"} />
                        <span className="font-medium text-[11px]">Quant / Audit Mode</span>
                      </div>
                      <div className={`w-6 h-3.5 rounded-full relative transition-colors duration-200 ${isQuantMode ? "bg-emerald-500" : "bg-zinc-700"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200 ${isQuantMode ? "translate-x-2.5" : "translate-x-0"}`} />
                      </div>
                    </button>

                    {/* 2. Bulut & Senkronizasyon */}
                    {!isQuantMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (user) {
                              setShowUsername(!showUsername);
                            } else {
                              setIsSettingsOpen(false);
                              setIsAuthModalOpen(true);
                            }
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 transition-colors duration-200 ease-out text-left group cursor-pointer"
                          
                        >
                          <div className="flex items-center gap-2">
                            <Cloud size={14} className={user ? "text-blue-400" : "text-zinc-500"} />
                            <div className="flex flex-col">
                              <span className="font-medium text-[11px]">Bulut Veritabanı</span>
                              {user && (
                                <span className="text-[9px] text-blue-400 font-semibold truncate max-w-[100px]">
                                  {showUsername ? (user.displayName || user.email?.split('@')[0] || "Hesap") : "Kullanıcı Gizli"}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            user 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {user ? "Aktif" : "Çevrimdışı"}
                          </span>
                        </button>

                        <div className="h-px bg-zinc-800/80 my-0.5" />

                        {/* 3. Çıkış Yap / Giriş Yap */}
                        {user ? (
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors duration-200 ease-out text-left font-medium text-[11px] cursor-pointer"
                          >
                            <LogOut size={14} />
                            <span>Çıkış Yap</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              setIsAuthModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-600/20 text-blue-400 transition-colors duration-200 ease-out text-left font-medium text-[11px] cursor-pointer"
                          >
                            <LogIn size={14} />
                            <span>Giriş Yap</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full">
        {indexErrorUrl && (
          <div className="max-w-6xl mx-auto px-4 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span>
                  <strong>Veritabanı Endeksi Gerekli:</strong> Seçilen tarih filtresini doğrudan veritabanında optimize etmek için bir Firestore endeksi oluşturulmalıdır. Şu an sistem otomatik olarak tüm veriyi çekip tarayıcıda filtrelemektedir (sorunsuz çalışır).
                </span>
              </div>
              <a
                href={indexErrorUrl}
                target="_blank"
                referrerPolicy="no-referrer"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors duration-200 ease-out whitespace-nowrap"
              >
                Endeks Oluştur (Tek Tık)
              </a>
            </div>
          </div>
        )}

        {/* VIEW TAB SELECTOR */}
        {!isQuantMode && (
          <div className="max-w-6xl mx-auto px-4 pt-3">
            <div className="flex border-b border-zinc-800 pb-0.5 items-center justify-between">
              <div
                id="navigation-tabs"
                className="flex gap-1 overflow-x-auto whitespace-nowrap hide-scrollbar flex-1 relative"
              >
                {[
                  { id: "dashboard", label: "Ana Panel", icon: LayoutDashboard },
                  { id: "deep-analysis", label: "Detaylı Analiz & İnceleme", icon: BarChart3 },
                  { id: "economic-calendar", label: "Ekonomik Takvim", icon: Globe },
                  { id: "notes", label: "Notlar", icon: FileText },
                  { id: "journal", label: "Günlük", icon: Book },
                  { id: "certificates", label: "Sertifikalar", icon: Award },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id as any)}
                      className={`relative px-3.5 py-2.5 sm:py-2 text-[10px] font-black font-mono tracking-widest uppercase rounded-t-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                        isActive
                          ? "text-blue-400 font-black"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavTabGlow"
                          className="absolute inset-0 bg-gradient-to-b from-blue-500/15 via-blue-500/5 to-transparent rounded-t-lg border-b-2 border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon size={12} className={isActive ? "text-blue-400" : "text-zinc-500"} />
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Global Metric Switch */}
              <div className="relative flex bg-zinc-950/80 border border-zinc-800 rounded-full p-0.5 ml-2 shrink-0 shadow-inner">
                <button
                  type="button"
                  className={`relative z-10 flex items-center justify-center w-8 h-6 rounded-full transition-colors duration-150 cursor-pointer ${
                    isRrMode ? "text-blue-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300 font-medium"
                  }`}
                  onClick={() => setMode('rr')}
                >
                  {isRrMode && (
                    <motion.div
                      layoutId="metricToggleIndicator"
                      className="absolute inset-0 bg-zinc-800 border border-zinc-700/80 rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 font-mono text-xs leading-none">R</span>
                </button>
                <button
                  type="button"
                  className={`relative z-10 flex items-center justify-center w-8 h-6 rounded-full transition-colors duration-150 cursor-pointer ${
                    !isRrMode ? "text-emerald-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300 font-medium"
                  }`}
                  onClick={() => setMode('pnl')}
                >
                  {!isRrMode && (
                    <motion.div
                      layoutId="metricToggleIndicator"
                      className="absolute inset-0 bg-zinc-800 border border-zinc-700/80 rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 font-mono text-xs leading-none">$</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3 flex flex-col w-full">
          {isLoading ? (
            <div className="w-full space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                 <div className="h-[110px] bg-zinc-800/50 rounded-xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-xl animate-pulse"></div>
                 <div className="h-[110px] bg-zinc-800/50 rounded-xl animate-pulse"></div>
              </div>
              <div className="h-[60px] bg-zinc-800/50 rounded-xl animate-pulse w-full"></div>
              <div className="h-[380px] bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="relative">
                <AnimatePresence mode="wait" initial={false}>
                  {currentTab === "dashboard" || isQuantMode ? (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-3.5"
                    >
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
                        className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer transition-all duration-200 ease-out select-none group shadow-sm hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.995]"
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 group-hover:scale-105 flex items-center justify-center text-blue-400 transition-all duration-200 ease-out shrink-0 shadow-xs">
                            <Plus size={18} />
                          </div>
                          <div className="text-center sm:text-left">
                            <h3 className="text-xs font-bold text-zinc-100 tracking-wide uppercase font-mono group-hover:text-blue-300 transition-colors">
                              {isQuantMode ? "EXECUTE MODEL SIMULATION" : "Yeni Pozisyon Girişi Yap"}
                            </h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-full sm:w-auto h-9 bg-blue-500/15 hover:bg-blue-500/25 active:scale-95 text-blue-400 font-mono font-bold text-xs px-4 rounded-xl transition-all duration-200 ease-out flex items-center justify-center gap-2 shadow-xs border border-blue-500/30 uppercase tracking-wider cursor-pointer backdrop-blur-sm"
                        >
                          <Plus size={15} />
                          {isQuantMode ? "ADD DATA LOG" : "İşlem Ekle"}
                        </button>
                      </div>

                      {/* WORKSPACE DOUBLE GRID - NOW SINGLE-COLUMN EXPANDED FOR UTMOST PRECISION */}
                      <div className="w-full space-y-3">
                        {/* Main ledger list takes full width of screen as requested */}
                        <SectionErrorBoundary sectionName="İşlem Listesi">
                        <TradeList
                          trades={filteredGlobalTrades}
                          onEdit={handleStartEdit}
                          onDelete={handleDeleteTrade}
                          onViewDetails={setDetailedTrade}
                          currency={currency}
                        />
                      </SectionErrorBoundary>
                      </div>
                    </motion.div>
                  ) : currentTab === "deep-analysis" ? (
                    <motion.div
                      key="deep-analysis"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <SectionErrorBoundary sectionName="Derin Analiz">
                        <DeepAnalysis
                          trades={filteredGlobalTrades}
                          onViewDetails={setDetailedTrade}
                          onEdit={handleStartEdit}
                          onDelete={handleDeleteTrade}
                          currency={currency}
                          sessions={sessions}
                        />
                      </SectionErrorBoundary>
                    </motion.div>
                  ) : currentTab === "journal" ? (
                    <motion.div
                      key="journal"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <SectionErrorBoundary sectionName="Günlükler">
                        <JournalView
                          entries={journals}
                          trades={trades}
                          currency={currency}
                          onSaveEntry={handleSaveJournal}
                          onDeleteEntry={handleDeleteJournal}
                        />
                      </SectionErrorBoundary>
                    </motion.div>
                  ) : currentTab === "certificates" ? (
                    <motion.div
                      key="certificates"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <SectionErrorBoundary sectionName="Sertifikalar">
                        <CertificatesView
                          certificates={certificates}
                          onSaveCertificate={handleSaveCertificate}
                          onDeleteCertificate={handleDeleteCertificate}
                        />
                      </SectionErrorBoundary>
                    </motion.div>
                  ) : currentTab === "notes" ? (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <SectionErrorBoundary sectionName="Notlar">
                        <NotesView
                          notes={notes}
                          onSaveNote={handleSaveNote}
                          onDeleteNote={handleDeleteNote}
                        />
                      </SectionErrorBoundary>
                    </motion.div>
                  ) : currentTab === "economic-calendar" ? (
                    <motion.div
                      key="economic-calendar"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <SectionErrorBoundary sectionName="Ekonomik Takvim">
                        <EconomicCalendar />
                      </SectionErrorBoundary>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
          </div>
          )}
          
            {isGlobalFilterModalOpen && (
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
                globalSelectedConfirmations={globalSelectedConfirmations}
                setGlobalSelectedConfirmations={setGlobalSelectedConfirmations}
                globalSelectedConcepts={globalSelectedConcepts}
                setGlobalSelectedConcepts={setGlobalSelectedConcepts}
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
                globalDateLimit={globalDateLimit}
                setGlobalDateLimit={setGlobalDateLimit}
              />
            )}

            {/* RECOVERY BACKUP RESCUE MOD - FOOTNOTE */}
            <BackupRescue
              trades={trades}
              notes={notes}
              journals={journals}
              certificates={certificates}
              settings={{ platforms, timeframes, htfTimeframes, confirmations, concepts, sessions, assets, currency, isRrMode }}
              onImportTrades={handleImportTrades}
              onClearAll={handleClearAll}
            />
          {/* CONTROLS AREA AND CHANNELS */}
          {!isQuantMode && (
            <div className="flex justify-center pb-8 pt-4">
              <button
                type="button"
                onClick={() => setIsPlatformMenuOpen(true)}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold tracking-wider uppercase font-mono transition-colors duration-155 flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-100 shadow-sm hover:shadow-md"
              >
                <SlidersHorizontal size={14} className="text-blue-400" />
                <span>Tanımlamaları Yönet</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isPlatformMenuOpen && (
          <motion.div
            key="platform-menu-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsPlatformMenuOpen(false)} />
            <motion.div
              key="platform-menu-modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-6 shadow-2xl relative w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex flex-col mb-4">
                <h3 className="text-xl font-black text-zinc-100 flex items-center gap-2">
                  <SlidersHorizontal className="text-blue-400" /> {isQuantMode ? "SYSTEM PARAMETERS / CONFIG" : "Tanımlamaları Yönet"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Platform, Varlık, Konsept ve diğer listeleri düzenleyin.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:w-48 shrink-0 pb-2 md:pb-0 custom-scrollbar border-b md:border-b-0 md:border-r border-zinc-800/60 md:pr-4">
                  {[
                    { id: 'platforms', label: 'Platformlar', icon: Monitor },
                    { id: 'assets', label: 'Varlıklar (Parite)', icon: LineChart },
                    { id: 'timeframes', label: 'ETF', icon: Clock },
                    { id: 'htfTimeframes', label: 'HTF', icon: ArrowUpRight },
                    { id: 'confirmations', label: 'Onaylar', icon: Lightbulb },
                    { id: 'concepts', label: 'Konseptler', icon: Target },
                    { id: 'sessions', label: 'Oturumlar', icon: Sun },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-left ${settingsTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-4">
                  {(() => {
                    let activeList = platforms;
                    let persistFunc = persistPlatforms;
                    let label = "Platform";
                    
                    if (settingsTab === 'timeframes') { activeList = timeframes; persistFunc = persistTimeframes; label = "ETF"; }
                    if (settingsTab === 'htfTimeframes') { activeList = htfTimeframes; persistFunc = persistHtfTimeframes; label = "HTF"; }
                    if (settingsTab === 'confirmations') { activeList = confirmations; persistFunc = persistConfirmations; label = "Onay"; }
                    if (settingsTab === 'concepts') { activeList = concepts; persistFunc = persistConcepts; label = "Konsept"; }
                    if (settingsTab === 'sessions') { activeList = sessions; persistFunc = persistSessions; label = "Oturum"; }
                    if (settingsTab === 'assets') { activeList = assets; persistFunc = persistAssets; label = "Varlık"; }

                    return (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="text"
                            placeholder={`Yeni ${label} Ekle...`}
                            className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 font-mono"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if (val && !activeList.includes(val)) {
                                  persistFunc([...activeList, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2 px-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Kayıtlı {label}lar ({activeList.length})
                          </span>
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                        <GripVertical size={11} /> Sıralamak için sürükleyin
                      </span>
                    </div>

                    <div className="h-[240px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {activeList.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono italic">
                          — Henüz tanımlanmış öğe bulunmuyor —
                        </div>
                      ) : (
                        activeList.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                index.toString(),
                              );
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const dragIndexStr =
                                e.dataTransfer.getData("text/plain");
                              if (!dragIndexStr) return;
                              const dragIndex = parseInt(dragIndexStr, 10);
                              const hoverIndex = index;
                              if (dragIndex === hoverIndex) return;

                              const newList = [...activeList];
                              const [removed] = newList.splice(dragIndex, 1);
                              newList.splice(hoverIndex, 0, removed);
                              persistFunc(newList);
                            }}
                            className="flex items-center justify-between bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono uppercase cursor-move transition-colors duration-200 ease-out group shadow-sm"
                            
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] text-zinc-600 font-mono w-4 select-none">
                                {index + 1}.
                              </span>
                              <GripVertical size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                              <span className="font-bold text-[11px] text-zinc-200 group-hover:text-blue-400 transition-colors">
                                {item}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = activeList.filter(
                                  (i) => i !== item,
                                );
                                persistFunc(updated);
                              }}
                              className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.2 rounded-md transition-colors duration-200 ease-out cursor-pointer"
                              
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  Değişiklikler anında kaydedilir
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlatformMenuOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold px-5 py-2 rounded-xl uppercase font-mono transition-colors duration-200 ease-out cursor-pointer border border-zinc-700/60 shadow-sm"
                >
                  Tamam
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODALS WRAPPER */}
        {/* OVERLAY MODAL: TRANSACTION FORM (ADD OR EDIT) */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              key="add-trade-form-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: "opacity" }}
              className="fixed inset-0 z-[1500] overflow-hidden bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="w-full max-w-2xl max-h-[95vh] overflow-y-auto bg-zinc-950 border border-zinc-800/80 rounded-xl relative shadow-md"
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
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIGHTBOX DETAILS MODAL */}
        <TradeDetailModal
          key="trade-detail-modal"
          trade={detailedTrade}
          onClose={handleCloseTradeDetail}
          onEdit={handleStartEdit}
          onDelete={handleDeleteTrade}
          currency={currency}
        />

        {/* AUTH MODAL */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* AI CO-PILOT MODAL */}
        <AnimatePresence>
          {isCopilotOpen && (
            <AICoPilotModal
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
              trades={filteredGlobalTrades}
              stats={calculatedStats}
              currency={currency}
              isRrMode={isRrMode}
              journals={journals}
              certificates={certificates}
              notes={notes}
            />
          )}
        </AnimatePresence>

      {/* FLOATING AI CO-PILOT QUICK ACCESS BUTTON */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="group relative w-9 h-9 flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-zinc-100 rounded-full shadow-lg hover:shadow-black/40 transition-all duration-200 cursor-pointer active:scale-95 border border-zinc-800"
          
        >
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-[16px] h-[16px] text-zinc-100 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3c.13 4.56 2.44 6.87 7 7-4.56.13-6.87 2.44-7 7-.13-4.56-2.44-6.87-7-7 4.56-.13 6.87-2.44 7-7z" />
              <path d="M17.5 14c.07 2.28 1.22 3.43 3.5 3.5-2.28.07-3.43 1.22-3.5 3.5-.07-2.28-1.22-3.43-3.5-3.5 2.28-.07 3.43-1.22 3.5-3.5z" opacity="0.8" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
