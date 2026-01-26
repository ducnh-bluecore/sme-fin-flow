/**
 * CROSS-MODULE HOOKS INDEX
 * 
 * Central export for all cross-module data flow hooks.
 * These hooks implement the 3-level fallback chain (Locked → Observed → Estimated)
 * and ensure transparent data origin tracking.
 */

// Types
export * from '@/types/cross-module';

// =====================================================
// WAVE 1: Foundation
// =====================================================

// FDP → MDP: Locked Costs for Profit ROAS (Case 2)
export { useFDPLockedCosts } from './useFDPLockedCosts';

// CDP → FDP: Revenue Allocation Bridge (Case 1)
export {
  useCDPRevenueAllocations,
  usePushRevenueToFDP,
  useCrossModuleRevenueForecasts,
} from './useCDPRevenueAllocation';

// Control Tower: Cross-Module Variance Alerts (Case 11)
export {
  useCrossModuleVarianceAlerts,
  useAcknowledgeVarianceAlert,
  useResolveVarianceAlert,
  useDismissVarianceAlert,
  useDetectVarianceAlerts,
} from './useCrossModuleVarianceAlerts';

// =====================================================
// WAVE 2: Core Integration
// =====================================================

// MDP → CDP: Attribution → Cohort CAC (Case 5)
export {
  usePushAttributionToCDP,
  useBatchPushAttributionToCDP,
} from './useMDPAttributionPush';

// CDP: Get CAC for LTV calculation
export {
  useCDPCohortCAC,
  useCDPAllCohortCAC,
} from './useCDPCohortCAC';

// FDP → CDP: AR Aging → Credit Risk (Case 8)
export {
  useCDPCreditRisk,
  useCDPHighRiskCustomers,
  useSyncARToCDP,
} from './useCDPCreditRisk';

// Control Tower: Priority Queue (Case 12)
export {
  useControlTowerPriorityQueue,
  useControlTowerQueueStats,
  useRefreshPriorityQueue,
  useUpdateSignalStatus,
  useAssignSignal,
} from './useControlTowerPriorityQueue';

// =====================================================
// WAVE 3: Enhancement Flows
// =====================================================

// CDP → MDP: Churn Signal → Retention Campaign (Case 4)
export {
  useMDPChurnSignals,
  useGenerateChurnSignals,
  useChurnSignalStats,
} from './useCDPChurnSignals';

// MDP → CDP: New Customer Source → Tagging (Case 6)
export {
  useCDPAcquisitionSource,
  usePushAcquisitionToCDP,
  useBatchPushAcquisitionToCDP,
} from './useMDPAcquisitionSource';

// MDP → FDP: Seasonal Patterns → Revenue Forecast (Case 9)
export {
  useFDPSeasonalAdjustments,
  usePushSeasonalToFDP,
  useMDPAllSeasonalPatterns,
} from './useMDPSeasonalPatterns';

// MDP → FDP: Channel ROI → Budget Reallocation (Case 10)
export {
  useFDPBudgetRecommendations,
  usePushChannelROIToFDP,
  useMDPAllChannelROI,
  useBatchPushChannelROI,
} from './useMDPChannelROI';
