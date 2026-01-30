/**
 * ⛔ DEPRECATED FINANCE HOOKS
 * 
 * These hooks are DEPRECATED and should NOT be used in new code.
 * They exist only for backward compatibility during migration.
 * 
 * ✅ USE INSTEAD (DATABASE-FIRST, NO COMPUTATION):
 * - useFDPFinanceSSOT() - PRIMARY hook for all FDP metrics (PROMPT 2 compliant)
 * - useFinanceTruthSnapshot() - for all CFO/CEO metrics
 * - useFinanceTruthFacts() - for grain-level data (SKU, store, channel)
 * - useFinanceMonthlySummary() - for monthly trends/charts
 * - useDecisionCards() - for decision cards
 * - useMDPData() - for marketing SSOT
 * - useMarketingDecisionEngine() - for marketing decisions
 * 
 * ❌ DEPRECATED (DO NOT USE - PERFORMS CLIENT-SIDE COMPUTATION):
 * - useFDPMetrics → useFDPFinanceSSOT (⚠️ SSOT VIOLATION)
 * - useFDPAggregatedMetrics → useFDPFinanceSSOT (still has computation)
 * - useCentralFinancialMetrics → useFinanceTruthSnapshot
 * - useDashboardKPIs → useFinanceTruthSnapshot
 * - usePLData → useFinanceTruthSnapshot + useFinanceMonthlySummary
 * - useAnalyticsData → useFinanceTruthSnapshot + useFinanceMonthlySummary
 * - useKPIData → useFinanceTruthSnapshot
 * - usePerformanceData → useFinanceTruthFacts
 * - useControlTowerAnalytics → useFinanceTruthSnapshot
 */

// ═══════════════════════════════════════════════════════════════════
// PRIMARY FDP HOOK (PROMPT 2 COMPLIANT)
// ═══════════════════════════════════════════════════════════════════

export { 
  useFDPFinanceSSOT,
  useRefreshFDPFinance,
  useFDPMetricValue,
  useFDPRevenueMetrics,
  useFDPMarketingMetrics,
  FDP_METRIC_CODES,
  type FDPMetricCode,
  type FDPMetricValue,
  type FDPFinanceSSOT,
} from './useFDPFinanceSSOT';

// ═══════════════════════════════════════════════════════════════════
// CANONICAL HOOKS (FETCH-ONLY)
// ═══════════════════════════════════════════════════════════════════

export { 
  useFinanceTruthSnapshot, 
  useRefreshFinanceSnapshot,
  useFinanceTruthAsLegacy 
} from './useFinanceTruthSnapshot';

export { 
  useFinanceTruthFacts,
  useTopSKUs,
  useProblematicSKUs,
  useChannelFacts,
  useStoreFacts,
  useCategoryFacts,
  useTopCustomers,
} from './useFinanceTruthFacts';

export { 
  useFinanceMonthlySummary,
  useRevenueTrend,
  useCashFlowTrend,
  useWorkingCapitalTrend,
} from './useFinanceMonthlySummary';

// ═══════════════════════════════════════════════════════════════════
// MIGRATION MAPPING
// ═══════════════════════════════════════════════════════════════════

export const DEPRECATED_HOOKS_MAPPING = {
  // ⚠️ HIGH PRIORITY - SSOT VIOLATIONS
  'useFDPMetrics': 'useFDPFinanceSSOT (CRITICAL: client-side computation)',
  'useFDPAggregatedMetrics': 'useFDPFinanceSSOT (has aggregation logic)',
  'useChannelPL': 'useFDPFinanceSSOT (aggregates in hook)',
  'useUnitEconomics': 'useFDPFinanceSSOT (relies on aggregated metrics)',
  
  // Standard deprecations
  'useCentralFinancialMetrics': 'useFinanceTruthSnapshot',
  'useDashboardKPIs': 'useFinanceTruthSnapshot', 
  'usePLData': 'useFinanceTruthSnapshot + useFinanceMonthlySummary',
  'useAnalyticsData': 'useFinanceTruthSnapshot + useFinanceMonthlySummary',
  'useKPIData': 'useFinanceTruthSnapshot',
  'usePerformanceData': 'useFinanceTruthFacts',
  'useControlTowerAnalytics': 'useFinanceTruthSnapshot',
  'useDashboardCache': 'useFinanceTruthSnapshot',
  'useFinancialMetrics': 'useFinanceTruthSnapshot',
} as const;

export const EXECUTIVE_ROUTES = [
  '/dashboard',
  '/cfo-dashboard', 
  '/control-tower',
  '/control-tower/board',
  '/control-tower/ceo',
  '/control-tower/decisions',
  '/mdp/ceo',
] as const;

// ═══════════════════════════════════════════════════════════════════
// EXPLICIT METRIC NAMING (FDP PROMPT 2)
// ═══════════════════════════════════════════════════════════════════

export const FDP_EXPLICIT_METRICS = {
  NET_REVENUE: { label: 'Net Revenue', source: 'central_metrics_snapshots.net_revenue' },
  CM1: { label: 'Contribution Margin 1 (Gross Profit)', source: 'central_metrics_snapshots.gross_profit' },
  CM2: { label: 'Contribution Margin 2', source: 'central_metrics_snapshots.contribution_margin' },
  ROAS_REVENUE: { label: 'ROAS (Revenue-based)', source: 'computed from net_revenue / marketing_spend' },
  ROAS_CONTRIBUTION: { label: 'ROAS (CM-based)', source: 'computed from cm2 / marketing_spend' },
} as const;
