import { createContext, useContext, useState, ReactNode, useMemo, startTransition } from 'react';

type MetricMode = 'rr' | 'pnl';

interface MetricContextType {
  mode: MetricMode;
  isRrMode: boolean;
  toggleMode: () => void;
  setMode: (mode: MetricMode) => void;
}

const MetricContext = createContext<MetricContextType | undefined>(undefined);

export function MetricProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MetricMode>('rr');

  const setMode = (newMode: MetricMode) => {
    startTransition(() => {
      setModeState(newMode);
    });
  };

  const toggleMode = () => {
    startTransition(() => {
      setModeState(prev => prev === 'rr' ? 'pnl' : 'rr');
    });
  };

  const isRrMode = mode === 'rr';

  const value = useMemo(() => ({ mode, isRrMode, toggleMode, setMode }), [mode, isRrMode]);

  return (
    <MetricContext.Provider value={value}>
      {children}
    </MetricContext.Provider>
  );
}

export function useMetricMode() {
  const context = useContext(MetricContext);
  if (context === undefined) {
    throw new Error('useMetricMode must be used within a MetricProvider');
  }
  return context;
}
