import { createContext, useContext, useState, ReactNode } from 'react';

interface ChannelProgress {
  name: string;
  status: 'pending' | 'syncing' | 'completed' | 'error';
  ordersFound?: number;
  ordersSynced?: number;
  error?: string;
}

interface SyncState {
  isLoading: boolean;
  progress: number;
  currentStep: string;
  channels: ChannelProgress[];
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
  setCurrentStep: (step: string) => void;
  setChannels: (channels: ChannelProgress[]) => void;
  updateChannel: (name: string, updates: Partial<ChannelProgress>) => void;
  setLastResult: (result: SyncState['lastResult']) => void;
  resetSync: () => void;
}

const defaultChannels: ChannelProgress[] = [
  { name: 'shopee', status: 'pending' },
  { name: 'lazada', status: 'pending' },
  { name: 'sapo', status: 'pending' },
  { name: 'tiki', status: 'pending' },
  { name: 'shopify', status: 'pending' },
];

const SyncProgressContext = createContext<SyncProgressContextType | undefined>(undefined);

export function SyncProgressProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>({
    isLoading: false,
    progress: 0,
    currentStep: '',
    channels: defaultChannels,
    lastResult: null,
  });

  const setIsLoading = (loading: boolean) => {
    setSyncState(prev => ({ 
      ...prev, 
      isLoading: loading,
      channels: loading ? defaultChannels.map(c => ({ ...c, status: 'pending' as const })) : prev.channels,
    }));
  };

  const setProgress = (progress: number) => {
    setSyncState(prev => ({ ...prev, progress }));
  };

  const setCurrentStep = (step: string) => {
    setSyncState(prev => ({ ...prev, currentStep: step }));
  };

  const setChannels = (channels: ChannelProgress[]) => {
    setSyncState(prev => ({ ...prev, channels }));
  };

  const updateChannel = (name: string, updates: Partial<ChannelProgress>) => {
    setSyncState(prev => ({
      ...prev,
      channels: prev.channels.map(c => 
        c.name === name ? { ...c, ...updates } : c
      ),
    }));
  };

  const setLastResult = (result: SyncState['lastResult']) => {
    setSyncState(prev => ({ ...prev, lastResult: result, isLoading: false, progress: 100, currentStep: 'Hoàn thành!' }));
  };

  const resetSync = () => {
    setSyncState({ 
      isLoading: false, 
      progress: 0, 
      currentStep: '',
      channels: defaultChannels,
      lastResult: null,
    });
  };

  return (
    <SyncProgressContext.Provider value={{ 
      syncState, 
      setIsLoading, 
      setProgress, 
      setCurrentStep,
      setChannels,
      updateChannel,
      setLastResult, 
      resetSync 
    }}>
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
