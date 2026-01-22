/**
 * ⛔ DEPRECATED FINANCE HOOKS
 * 
 * These hooks are DEPRECATED and should NOT be used in new code.
 * They exist only for backward compatibility during migration.
 * 
 * ✅ USE INSTEAD:
 * - useFinanceTruthSnapshot() - for all CFO/CEO metrics
 * - useFinanceTruthFacts() - for grain-level data (SKU, store, channel)
 * - useFinanceMonthlySummary() - for monthly trends/charts
 * - useDecisionCards() - for decision cards
 * - useMDPData() - for marketing SSOT
 * - useMarketingDecisionEngine() - for marketing decisions
 * 
 * ❌ DEPRECATED (DO NOT USE):
 * - useCentralFinancialMetrics → useFinanceTruthSnapshot
 * - useDashboardKPIs → useFinanceTruthSnapshot
 * - usePLData → useFinanceTruthSnapshot + useFinanceMonthlySummary
 * - useAnalyticsData → useFinanceTruthSnapshot + useFinanceMonthlySummary
 * - useKPIData → useFinanceTruthSnapshot
 * - usePerformanceData → useFinanceTruthFacts
 * - useControlTowerAnalytics → useFinanceTruthSnapshot
 */

// Re-export the canonical hooks
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

// =============================================================
// MIGRATION MAPPING
// =============================================================

export const DEPRECATED_HOOKS_MAPPING = {
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
