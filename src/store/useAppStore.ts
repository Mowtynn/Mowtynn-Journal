import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  globalSelectedConfirmations: string[];
  globalSelectedConcepts: string[];
  globalSelectedPlatforms: string[];
  globalSelectedAssets: string[];
  globalSelectedSessions: string[];
  globalSelectedTimeframes: string[];
  globalSelectedHtfTimeframes: string[];
  globalSelectedStatuses: string[];
  globalSelectedTypes: string[];
  globalDateLimit: string;
  isQuantMode: boolean;
  setGlobalSelectedConfirmations: (val: string[]) => void;
  setGlobalSelectedConcepts: (val: string[]) => void;
  setGlobalSelectedPlatforms: (val: string[]) => void;
  setGlobalSelectedAssets: (val: string[]) => void;
  setGlobalSelectedSessions: (val: string[]) => void;
  setGlobalSelectedTimeframes: (val: string[]) => void;
  setGlobalSelectedHtfTimeframes: (val: string[]) => void;
  setGlobalSelectedStatuses: (val: string[]) => void;
  setGlobalSelectedTypes: (val: string[]) => void;
  setGlobalDateLimit: (val: string) => void;
  setIsQuantMode: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      globalSelectedConfirmations: [],
      globalSelectedConcepts: [],
      globalSelectedPlatforms: [],
      globalSelectedAssets: [],
      globalSelectedSessions: [],
      globalSelectedTimeframes: [],
      globalSelectedHtfTimeframes: [],
      globalSelectedStatuses: [],
      globalSelectedTypes: [],
      globalDateLimit: "6m",
      isQuantMode: false,
      
      setGlobalSelectedConfirmations: (val) => set({ globalSelectedConfirmations: val }),
      setGlobalSelectedConcepts: (val) => set({ globalSelectedConcepts: val }),
      setGlobalSelectedPlatforms: (val) => set({ globalSelectedPlatforms: val }),
      setGlobalSelectedAssets: (val) => set({ globalSelectedAssets: val }),
      setGlobalSelectedSessions: (val) => set({ globalSelectedSessions: val }),
      setGlobalSelectedTimeframes: (val) => set({ globalSelectedTimeframes: val }),
      setGlobalSelectedHtfTimeframes: (val) => set({ globalSelectedHtfTimeframes: val }),
      setGlobalSelectedStatuses: (val) => set({ globalSelectedStatuses: val }),
      setGlobalSelectedTypes: (val) => set({ globalSelectedTypes: val }),
      setGlobalDateLimit: (val) => set({ globalDateLimit: val }),
      setIsQuantMode: (val) => set({ isQuantMode: val }),
    }),
    {
      name: 'trading_journal_filters',
    }
  )
);
