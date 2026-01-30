import { useActivityTracker, ActivityTracker } from '@/hooks/useActivityTracker';
import { createContext, useContext, ReactNode } from 'react';

const ActivityTrackerContext = createContext<ActivityTracker | null>(null);

/**
 * Provider component that initializes activity tracking
 * Place this inside a layout that has access to routing context
 */
export function ActivityTrackerProvider({ children }: { children: ReactNode }) {
  const tracker = useActivityTracker();
  
  return (
    <ActivityTrackerContext.Provider value={tracker}>
      {children}
    </ActivityTrackerContext.Provider>
  );
}

/**
 * Hook to access the activity tracker from any component
 * Use this to manually track feature usage, decisions, exports, etc.
 * 
 * @example
 * const { trackFeatureUse, trackDecision } = useTracker();
 * 
 * // Track when user uses a specific feature
 * trackFeatureUse('cdp.filter.apply', { filters: selectedFilters });
 * 
 * // Track when user makes a decision
 * trackDecision('invoice.approve', { invoiceId, amount });
 */
export function useTracker() {
  const context = useContext(ActivityTrackerContext);
  
  // Return no-op functions if used outside provider (graceful fallback)
  if (!context) {
    return {
      trackFeatureUse: () => {},
      trackDecision: () => {},
      trackExport: () => {},
      trackError: () => {},
    };
  }
  
  return context;
}
