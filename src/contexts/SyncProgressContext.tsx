import { createContext, useContext, useState, ReactNode } from 'react';

interface SyncState {
  isLoading: boolean;
  progress: number;
  lastResult: {
    total_orders_synced: number;
    total_items_synced: number;
    total_products_synced: number;
    total_settlements_synced: number;
    total_fetched: number;
    total_errors: number;
    has_more: boolean;
    channels: Record<string, any>;
  } | null;
}

interface SyncProgressContextType {
  syncState: SyncState;
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setLastResult: (result: SyncState['lastResult']) => void;
  resetSync: () => void;
}

const SyncProgressContext = createContext<SyncProgressContextType | undefined>(undefined);

export function SyncProgressProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>({
    isLoading: false,
    progress: 0,
    lastResult: null,
  });

  const setIsLoading = (loading: boolean) => {
    setSyncState(prev => ({ ...prev, isLoading: loading }));
  };

  const setProgress = (progress: number) => {
    setSyncState(prev => ({ ...prev, progress }));
  };

  const setLastResult = (result: SyncState['lastResult']) => {
    setSyncState(prev => ({ ...prev, lastResult: result, isLoading: false, progress: 100 }));
  };

  const resetSync = () => {
    setSyncState({ isLoading: false, progress: 0, lastResult: null });
  };

  return (
    <SyncProgressContext.Provider value={{ syncState, setIsLoading, setProgress, setLastResult, resetSync }}>
      {children}
    </SyncProgressContext.Provider>
  );
}

export function useSyncProgress() {
  const context = useContext(SyncProgressContext);
  if (!context) {
    throw new Error('useSyncProgress must be used within SyncProgressProvider');
  }
  return context;
}
