import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DATE_LIMIT, EMPTY_EXTRA_FILTERS, sanitizeExtraFilters, type ExtraTradeFilters } from '../lib/tradeFilters';

interface AppState {
  globalSelectedConfirmations: string[];
  globalSelectedPlanFidelity: string[];
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedTimeframes: string[];
  globalSelectedHtfTimeframes: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalSelectedEntryModels: string[];
  globalSelectedTrendTypes: string[];
  globalDateLimit: string;
  globalMinAsiaRangePips?: number;
  globalMaxAsiaRangePips?: number;
  globalMinMaePips?: number;
  globalMaxMaePips?: number;
  globalMinMfePips?: number;
  globalMaxMfePips?: number;
  /** Asia Range, News Day, P/D, TP target, Asia FVG, risk %, hızlı kayıt filtreleri */
  globalExtra: ExtraTradeFilters;
  isQuantMode: boolean;
  setGlobalSelectedConfirmations: (val: string[]) => void;
  setGlobalSelectedPlanFidelity: (val: string[]) => void;
  setGlobalSelectedAssets: (val: string[]) => void;
  setGlobalSelectedSessions: (val: string[]) => void;
  setGlobalSelectedTimeframes: (val: string[]) => void;
  setGlobalSelectedHtfTimeframes: (val: string[]) => void;
  setGlobalSelectedStatuses: (val: string[]) => void;
  setGlobalSelectedTypes: (val: string[]) => void;
  setGlobalSelectedEntryModels: (val: string[]) => void;
  setGlobalSelectedTrendTypes: (val: string[]) => void;
  setGlobalDateLimit: (val: string) => void;
  setGlobalMinAsiaRangePips: (val?: number) => void;
  setGlobalMaxAsiaRangePips: (val?: number) => void;
  setGlobalMinMaePips: (val?: number) => void;
  setGlobalMaxMaePips: (val?: number) => void;
  setGlobalMinMfePips: (val?: number) => void;
  setGlobalMaxMfePips: (val?: number) => void;
  setGlobalExtra: (val: ExtraTradeFilters) => void;
  setIsQuantMode: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      globalSelectedConfirmations: [],
      globalSelectedPlanFidelity: [],
      globalSelectedAssets: [],
      globalSelectedSessions: [],
      globalSelectedTimeframes: [],
      globalSelectedHtfTimeframes: [],
      globalSelectedStatuses: [],
      globalSelectedTypes: [],
      globalSelectedEntryModels: [],
      globalSelectedTrendTypes: [],
      globalDateLimit: DEFAULT_DATE_LIMIT,
      globalMinAsiaRangePips: undefined,
      globalMaxAsiaRangePips: undefined,
      globalMinMaePips: undefined,
      globalMaxMaePips: undefined,
      globalMinMfePips: undefined,
      globalMaxMfePips: undefined,
      globalExtra: EMPTY_EXTRA_FILTERS,
      isQuantMode: false,
      
      setGlobalSelectedConfirmations: (val) => set({ globalSelectedConfirmations: val }),
      setGlobalSelectedPlanFidelity: (val) => set({ globalSelectedPlanFidelity: val }),
      setGlobalSelectedAssets: (val) => set({ globalSelectedAssets: val }),
      setGlobalSelectedSessions: (val) => set({ globalSelectedSessions: val }),
      setGlobalSelectedTimeframes: (val) => set({ globalSelectedTimeframes: val }),
      setGlobalSelectedHtfTimeframes: (val) => set({ globalSelectedHtfTimeframes: val }),
      setGlobalSelectedStatuses: (val) => set({ globalSelectedStatuses: val }),
      setGlobalSelectedTypes: (val) => set({ globalSelectedTypes: val }),
      setGlobalSelectedEntryModels: (val) => set({ globalSelectedEntryModels: val }),
      setGlobalSelectedTrendTypes: (val) => set({ globalSelectedTrendTypes: val }),
      setGlobalDateLimit: (val) => set({ globalDateLimit: val }),
      setGlobalMinAsiaRangePips: (val) => set({ globalMinAsiaRangePips: val }),
      setGlobalMaxAsiaRangePips: (val) => set({ globalMaxAsiaRangePips: val }),
      setGlobalMinMaePips: (val) => set({ globalMinMaePips: val }),
      setGlobalMaxMaePips: (val) => set({ globalMaxMaePips: val }),
      setGlobalMinMfePips: (val) => set({ globalMinMfePips: val }),
      setGlobalMaxMfePips: (val) => set({ globalMaxMfePips: val }),
      setGlobalExtra: (val) => set({ globalExtra: val }),
      setIsQuantMode: (val) => set({ isQuantMode: val }),
    }),
    {
      name: 'trading_journal_filters',
      version: 7,
      // Zaman aralığı kalıcı değildir: uygulama her açılışta "Tüm zamanlar" ile başlar (üst çubuktaki TÜMÜ gibi)
      partialize: ({ globalDateLimit: _omit, ...rest }) => rest,
      // Ek filtreler her açılışta onarılır (eksik alan / eski biçim ekranı çökertmesin)
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        globalExtra: sanitizeExtraFilters((persisted as any)?.globalExtra),
        globalDateLimit: DEFAULT_DATE_LIMIT,
      }),
      // v3: Liquidity Sweep filtresi düştü · v4: ek alan filtreleri (globalExtra)
      // v5: Hesap ve Aşama filtreleri üst çubuktaki hesap seçicisine taşındı (eski seçimler gizli filtre olarak kalmasın);
      //     varsayılan tarih aralığı "6 ay"dan "tüm zamanlar"a geçti (dokunulmamış eski varsayılan da taşınır)
      // v7: Strateji filtresi kaldırıldı, yerine Asia Range (Range / Trend / Swept)
      migrate: (persisted: any, version: number) => {
        if (persisted && typeof persisted === 'object') {
          delete persisted.globalSelectedConcepts;
          delete persisted.globalSelectedPlatforms;
          delete persisted.globalSelectedStages;
          if (version < 5 && persisted.globalDateLimit === '6m') persisted.globalDateLimit = DEFAULT_DATE_LIMIT;
          persisted.globalExtra = sanitizeExtraFilters(persisted.globalExtra);
        }
        return persisted;
      },
    }
  )
);
