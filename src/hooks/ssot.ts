/**
 * ============================================
 * HOOKS SSOT EXPORTS
 * ============================================
 * 
 * Central export file for all SSOT-compliant hooks.
 * Use these hooks instead of deprecated alternatives.
 * 
 * MIGRATION GUIDE:
 * - useFDPMetrics → useFDPFinanceSSOT
 * - useMDPData → useMDPSSOT
 * - useChannelPL → useChannelPLSSOT
 * - useKPIData → useFinanceTruthSnapshot
 */

// ============================================
// FDP - Financial Data Platform
// ============================================
export { 
  useFDPFinanceSSOT, 
  useRefreshFDPFinance,
  useFDPMetricValue,
  FDP_METRIC_CODES,
  type FDPFinanceSSOT,
  type FDPMetricValue,
  type FDPMetricCode,
} from './useFDPFinanceSSOT';

export {
  useFinanceTruthSnapshot,
  type FinanceTruthSnapshot,
} from './useFinanceTruthSnapshot';

// ============================================
// MDP - Marketing Data Platform
// ============================================
export {
  useMDPSSOT,
  MDP_METRIC_CODES,
} from './useMDPSSOT';

export {
  useMDPDataSSOT,
} from './useMDPDataSSOT';

// ============================================
// Control Tower
// ============================================
export {
  useControlTowerAnalyticsSSoT,
  type ControlTowerData,
} from './useControlTowerSSOT';

// ============================================
// FDP Aggregated Metrics (SSOT-compliant)
// ============================================
export {
  useFDPAggregatedMetricsSSOT,
  type AggregatedFDPMetricsSSOT,
} from './useFDPAggregatedMetricsSSOT';

// FDP Period Summary (DB-first aggregation)
export {
  useFDPPeriodSummary,
  type FDPPeriodSummary,
} from './useFDPPeriodSummary';

// ============================================
// CDP - Customer Data Platform
// ============================================
export {
  useCDPPopulationCatalog,
  useCDPPopulationDetail,
  useCDPPopulations,
} from './useCDPPopulations';

// ============================================
// Channel Analytics
// ============================================
export {
  useChannelPLSSOT,
  useAvailableChannelsSSOT,
  type ChannelPLSummary,
  type ChannelPLMonthly,
} from './useChannelPLSSOT';

export {
  useChannelAnalyticsCache,
  useRefreshChannelAnalyticsCache,
} from './useChannelAnalyticsCache';

// ============================================
// Metric Governance
// ============================================
export {
  useMetricRegistry,
  useUnifiedMetrics,
  useMetricConsistency,
  useGovernanceDashboard,
  useMetricValue,
  useValidateMetric,
  type MetricDefinition,
  type UnifiedMetric,
  type ConsistencyCheck,
  type GovernanceSummary,
} from './useMetricGovernance';

// ============================================
// Central Financial Metrics (Legacy wrapper)
// ============================================
export {
  useCentralFinancialMetrics,
  getEmptyCentralMetrics,
  type CentralFinancialMetrics,
} from './useCentralFinancialMetrics';

// ============================================
// Working Capital
// ============================================
export {
  useWorkingCapitalDaily,
  useLatestWorkingCapital,
  useCCCTrend,
  type FormattedWorkingCapital,
} from './useWorkingCapitalDaily';

// ============================================
// DEPRECATED HOOKS - DO NOT USE
// ============================================

/**
 * @deprecated Use useFDPFinanceSSOT instead
 */
export { useFDPMetrics } from './useFDPMetrics';

/**
 * @deprecated Use useMDPSSOT or useMDPDataSSOT instead
 */
export { useMDPData } from './useMDPData';

/**
 * @deprecated Use useFDPAggregatedMetricsSSOT instead
 */
export { useFDPAggregatedMetrics } from './useFDPAggregatedMetrics';

/**
 * @deprecated Use useChannelPLSSOT instead
 */
export { useChannelPL, useAvailableChannels } from './useChannelPL';

/**
 * @deprecated Use useFinanceTruthSnapshot instead
 */
export { useKPIData } from './useKPIData';

/**
 * @deprecated Use useCentralFinancialMetrics instead
 */
export { useFinancialMetrics } from './useFinancialMetrics';
