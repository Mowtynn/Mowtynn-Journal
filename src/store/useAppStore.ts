import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  globalSelectedConfirmations: string[];
  globalSelectedConcepts: string[];
  globalSelectedPlanFidelity: string[];
  globalSelectedPlatforms: string[];
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedTimeframes: string[];
  globalSelectedHtfTimeframes: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalSelectedEntryModels: string[];
  globalSelectedTrendTypes: string[];
  globalDateLimit: string;
  isQuantMode: boolean;
  setGlobalSelectedConfirmations: (val: string[]) => void;
  setGlobalSelectedConcepts: (val: string[]) => void;
  setGlobalSelectedPlanFidelity: (val: string[]) => void;
  setGlobalSelectedPlatforms: (val: string[]) => void;
  setGlobalSelectedAssets: (val: string[]) => void;
  setGlobalSelectedSessions: (val: string[]) => void;
  setGlobalSelectedTimeframes: (val: string[]) => void;
  setGlobalSelectedHtfTimeframes: (val: string[]) => void;
  setGlobalSelectedStatuses: (val: string[]) => void;
  setGlobalSelectedTypes: (val: string[]) => void;
  setGlobalSelectedEntryModels: (val: string[]) => void;
  setGlobalSelectedTrendTypes: (val: string[]) => void;
  setGlobalDateLimit: (val: string) => void;
  setIsQuantMode: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      globalSelectedConfirmations: [],
      globalSelectedConcepts: [],
      globalSelectedPlanFidelity: [],
      globalSelectedPlatforms: [],
      globalSelectedAssets: [],
      globalSelectedSessions: [],
      globalSelectedTimeframes: [],
      globalSelectedHtfTimeframes: [],
      globalSelectedStatuses: [],
      globalSelectedTypes: [],
      globalSelectedEntryModels: [],
      globalSelectedTrendTypes: [],
      globalDateLimit: "6m",
      isQuantMode: false,
      
      setGlobalSelectedConfirmations: (val) => set({ globalSelectedConfirmations: val }),
      setGlobalSelectedConcepts: (val) => set({ globalSelectedConcepts: val }),
      setGlobalSelectedPlanFidelity: (val) => set({ globalSelectedPlanFidelity: val }),
      setGlobalSelectedPlatforms: (val) => set({ globalSelectedPlatforms: val }),
      setGlobalSelectedAssets: (val) => set({ globalSelectedAssets: val }),
      setGlobalSelectedSessions: (val) => set({ globalSelectedSessions: val }),
      setGlobalSelectedTimeframes: (val) => set({ globalSelectedTimeframes: val }),
      setGlobalSelectedHtfTimeframes: (val) => set({ globalSelectedHtfTimeframes: val }),
      setGlobalSelectedStatuses: (val) => set({ globalSelectedStatuses: val }),
      setGlobalSelectedTypes: (val) => set({ globalSelectedTypes: val }),
      setGlobalSelectedEntryModels: (val) => set({ globalSelectedEntryModels: val }),
      setGlobalSelectedTrendTypes: (val) => set({ globalSelectedTrendTypes: val }),
      setGlobalDateLimit: (val) => set({ globalDateLimit: val }),
      setIsQuantMode: (val) => set({ isQuantMode: val }),
    }),
    {
      name: 'trading_journal_filters',
    }
  )
);
