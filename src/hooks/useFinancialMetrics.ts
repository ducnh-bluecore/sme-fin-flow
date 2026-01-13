/**
 * ============================================
 * DEPRECATED: Use useCentralFinancialMetrics instead
 * ============================================
 * 
 * This hook is kept for backwards compatibility only.
 * All new code should use useCentralFinancialMetrics as the Single Source of Truth.
 * 
 * @deprecated Use useCentralFinancialMetrics from './useCentralFinancialMetrics'
 */
import { useCentralFinancialMetrics, CentralFinancialMetrics } from './useCentralFinancialMetrics';

export interface FinancialMetrics {
  // Core cycle metrics
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;

  // Underlying values
  avgAR: number;
  avgAP: number;
  avgInventory: number;
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;

  // Totals for the period
  totalSales: number;
  totalCogs: number;
  totalPurchases: number;
  totalExpenses: number;
  daysInPeriod: number;

  // Industry benchmarks
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
  };
}

/**
 * @deprecated Use useCentralFinancialMetrics instead for Single Source of Truth
 * This hook now wraps useCentralFinancialMetrics for backwards compatibility
 */
export function useFinancialMetrics() {
  const { data: centralMetrics, isLoading, error, ...rest } = useCentralFinancialMetrics();

  // Map CentralFinancialMetrics to FinancialMetrics format for backwards compatibility
  const data: FinancialMetrics | undefined = centralMetrics ? {
    dso: centralMetrics.dso,
    dpo: centralMetrics.dpo,
    dio: centralMetrics.dio,
    ccc: centralMetrics.ccc,
    avgAR: centralMetrics.totalAR,
    avgAP: centralMetrics.totalAP,
    avgInventory: centralMetrics.inventory,
    dailySales: centralMetrics.dailySales,
    dailyCogs: centralMetrics.dailyCogs,
    dailyPurchases: centralMetrics.dailyPurchases,
    totalSales: centralMetrics.netRevenue,
    totalCogs: centralMetrics.cogs,
    totalPurchases: centralMetrics.dailyPurchases * centralMetrics.daysInPeriod,
    totalExpenses: centralMetrics.totalOpex,
    daysInPeriod: centralMetrics.daysInPeriod,
    industryBenchmark: {
      dso: centralMetrics.industryBenchmark.dso,
      dio: centralMetrics.industryBenchmark.dio,
      dpo: centralMetrics.industryBenchmark.dpo,
      ccc: centralMetrics.industryBenchmark.ccc,
    }
  } : undefined;

  return {
    data,
    isLoading,
    error,
    ...rest
  };
}
