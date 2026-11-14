import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DATE_LIMIT, EMPTY_EXTRA_FILTERS, sanitizeExtraFilters, type ExtraTradeFilters } from '../lib/tradeFilters';

interface AppState {
  globalSelectedPlanFidelity: string[];
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalSelectedEntryModels: string[];
  globalSelectedTrendTypes: string[];
  globalDateLimit: string;
  /** Asia Range, News Day, P/D, TP target, Asia FVG, risk %, hızlı kayıt filtreleri */
  globalExtra: ExtraTradeFilters;
  isQuantMode: boolean;
  setGlobalSelectedPlanFidelity: (val: string[]) => void;
  setGlobalSelectedAssets: (val: string[]) => void;
  setGlobalSelectedSessions: (val: string[]) => void;
  setGlobalSelectedStatuses: (val: string[]) => void;
  setGlobalSelectedTypes: (val: string[]) => void;
  setGlobalSelectedEntryModels: (val: string[]) => void;
  setGlobalSelectedTrendTypes: (val: string[]) => void;
  setGlobalDateLimit: (val: string) => void;
  setGlobalExtra: (val: ExtraTradeFilters) => void;
  setIsQuantMode: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      globalSelectedPlanFidelity: [],
      globalSelectedAssets: [],
      globalSelectedSessions: [],
      globalSelectedStatuses: [],
      globalSelectedTypes: [],
      globalSelectedEntryModels: [],
      globalSelectedTrendTypes: [],
      globalDateLimit: DEFAULT_DATE_LIMIT,
      globalExtra: EMPTY_EXTRA_FILTERS,
      isQuantMode: false,
      
      setGlobalSelectedPlanFidelity: (val) => set({ globalSelectedPlanFidelity: val }),
      setGlobalSelectedAssets: (val) => set({ globalSelectedAssets: val }),
      setGlobalSelectedSessions: (val) => set({ globalSelectedSessions: val }),
      setGlobalSelectedStatuses: (val) => set({ globalSelectedStatuses: val }),
      setGlobalSelectedTypes: (val) => set({ globalSelectedTypes: val }),
      setGlobalSelectedEntryModels: (val) => set({ globalSelectedEntryModels: val }),
      setGlobalSelectedTrendTypes: (val) => set({ globalSelectedTrendTypes: val }),
      setGlobalDateLimit: (val) => set({ globalDateLimit: val }),
      setGlobalExtra: (val) => set({ globalExtra: val }),
      setIsQuantMode: (val) => set({ isQuantMode: val }),
    }),
    {
      name: 'trading_journal_filters',
      version: 8,
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
      // v8: PD Array, Timeframe, Entry Timeframe ve Asia Range Pip filtreleri kaldırıldı (eski seçim gizli filtre olarak kalmasın)
      migrate: (persisted: any, version: number) => {
        if (persisted && typeof persisted === 'object') {
          delete persisted.globalSelectedConcepts;
          delete persisted.globalSelectedPlatforms;
          delete persisted.globalSelectedStages;
          delete persisted.globalSelectedConfirmations;
          delete persisted.globalSelectedTimeframes;
          delete persisted.globalSelectedHtfTimeframes;
          delete persisted.globalMinAsiaRangePips;
          delete persisted.globalMaxAsiaRangePips;
          if (version < 5 && persisted.globalDateLimit === '6m') persisted.globalDateLimit = DEFAULT_DATE_LIMIT;
          persisted.globalExtra = sanitizeExtraFilters(persisted.globalExtra);
        }
        return persisted;
      },
    }
  )
);
