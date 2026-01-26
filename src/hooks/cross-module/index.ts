/**
 * CROSS-MODULE HOOKS INDEX
 * 
 * Central export for all cross-module data flow hooks.
 * These hooks implement the 3-level fallback chain (Locked → Observed → Estimated)
 * and ensure transparent data origin tracking.
 * 
 * CROSS-MODULE DATA FLYWHEEL - 12 Integration Cases:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  CDP ──────> FDP (Case 1: Revenue Forecast)                 │
 * │  FDP ──────> MDP (Case 2: Locked Costs)                     │
 * │  CDP ──────> MDP (Case 3: Segment LTV)                      │
 * │  CDP ──────> MDP (Case 4: Churn Signals)                    │
 * │  MDP ──────> CDP (Case 5: Attribution CAC)                  │
 * │  MDP ──────> CDP (Case 6: Acquisition Source)               │
 * │  FDP ──────> CDP (Case 7: Actual Revenue)                   │
 * │  FDP ──────> CDP (Case 8: Credit Risk)                      │
 * │  MDP ──────> FDP (Case 9: Seasonal Patterns)                │
 * │  MDP ──────> FDP (Case 10: Channel ROI)                     │
 * │  CT  ──────> All (Case 11: Variance Alerts)                 │
 * │  All ──────> CT  (Case 12: Priority Queue)                  │
 * └─────────────────────────────────────────────────────────────┘
 */

// Types
export * from '@/types/cross-module';

// =====================================================
// CASE 1: CDP → FDP: Revenue Forecast → Monthly Plans
// =====================================================
export {
  useCDPRevenueAllocations,
  usePushRevenueToFDP,
  useCrossModuleRevenueForecasts,
} from './useCDPRevenueAllocation';

// =====================================================
// CASE 2: FDP → MDP: Locked Costs → Profit ROAS
// =====================================================
export { useFDPLockedCosts } from './useFDPLockedCosts';

// =====================================================
// CASE 3: CDP → MDP: Segment LTV → Budget Allocation
// =====================================================
export {
  useMDPSegmentLTV,
  usePushSegmentLTVToMDP,
  useCDPAllSegmentLTV,
} from './useCDPSegmentLTV';

// =====================================================
// CASE 4: CDP → MDP: Churn Signal → Retention Campaign
// =====================================================
export {
  useMDPChurnSignals,
  useGenerateChurnSignals,
  useChurnSignalStats,
} from './useCDPChurnSignals';

// =====================================================
// CASE 5: MDP → CDP: Attribution → Cohort CAC
// =====================================================
export {
  usePushAttributionToCDP,
  useBatchPushAttributionToCDP,
} from './useMDPAttributionPush';

export {
  useCDPCohortCAC,
  useCDPAllCohortCAC,
} from './useCDPCohortCAC';

// =====================================================
// CASE 6: MDP → CDP: New Customer Source → Tagging
// =====================================================
export {
  useCDPAcquisitionSource,
  usePushAcquisitionToCDP,
  useBatchPushAcquisitionToCDP,
} from './useMDPAcquisitionSource';

// =====================================================
// CASE 7: FDP → CDP: Actual Revenue → Equity Recalibration
// =====================================================
export {
  useCDPActualRevenue,
  usePushActualRevenueToCDP,
  useFDPAllActualRevenue,
  useRunCrossModuleSync,
} from './useFDPActualRevenue';

// =====================================================
// CASE 8: FDP → CDP: AR Aging → Credit Risk Score
// =====================================================
export {
  useCDPCreditRisk,
  useCDPHighRiskCustomers,
  useSyncARToCDP,
} from './useCDPCreditRisk';

// =====================================================
// CASE 9: MDP → FDP: Seasonal Patterns → Revenue Forecast
// =====================================================
export {
  useFDPSeasonalAdjustments,
  usePushSeasonalToFDP,
  useMDPAllSeasonalPatterns,
} from './useMDPSeasonalPatterns';

// =====================================================
// CASE 10: MDP → FDP: Channel ROI → Budget Reallocation
// =====================================================
export {
  useFDPBudgetRecommendations,
  usePushChannelROIToFDP,
  useMDPAllChannelROI,
  useBatchPushChannelROI,
} from './useMDPChannelROI';

// =====================================================
// CASE 11: Control Tower → All: Variance Alert → Decision
// =====================================================
export {
  useCrossModuleVarianceAlerts,
  useAcknowledgeVarianceAlert,
  useResolveVarianceAlert,
  useDismissVarianceAlert,
  useDetectVarianceAlerts,
} from './useCrossModuleVarianceAlerts';

// =====================================================
// CASE 12: All → Control Tower: Aggregate Signals
// =====================================================
export {
  useControlTowerPriorityQueue,
  useControlTowerQueueStats,
  useRefreshPriorityQueue,
  useUpdateSignalStatus,
  useAssignSignal,
} from './useControlTowerPriorityQueue';
