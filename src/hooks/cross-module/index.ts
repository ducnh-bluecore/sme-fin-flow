/**
 * CROSS-MODULE HOOKS INDEX
 * 
 * Central export for all cross-module data flow hooks.
 * These hooks implement the 3-level fallback chain (Locked → Observed → Estimated)
 * and ensure transparent data origin tracking.
 */

// Types
export * from '@/types/cross-module';

// FDP → MDP: Locked Costs for Profit ROAS
export { useFDPLockedCosts } from './useFDPLockedCosts';

// CDP → FDP: Revenue Allocation Bridge
export {
  useCDPRevenueAllocations,
  usePushRevenueToFDP,
  useCrossModuleRevenueForecasts,
} from './useCDPRevenueAllocation';

// Control Tower: Cross-Module Variance Alerts
export {
  useCrossModuleVarianceAlerts,
  useAcknowledgeVarianceAlert,
  useResolveVarianceAlert,
  useDismissVarianceAlert,
  useDetectVarianceAlerts,
} from './useCrossModuleVarianceAlerts';
