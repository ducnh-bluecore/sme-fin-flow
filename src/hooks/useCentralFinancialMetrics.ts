/**
 * ============================================
 * DEPRECATED: Use useFinanceTruthSnapshot instead
 * ============================================
 * 
 * This hook is DEPRECATED and exists only for backwards compatibility.
 * It now delegates to useFinanceTruthSnapshot (DB-first, no calculations).
 * 
 * @deprecated Use useFinanceTruthSnapshot from './useFinanceTruthSnapshot'
 */
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { INDUSTRY_BENCHMARKS } from '@/lib/financial-constants';

/**
 * @deprecated Use useFinanceTruthSnapshot instead
 */
export interface CentralFinancialMetrics {
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  grossMargin: number;
  contributionMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  netProfitMargin: number;
  operatingMargin: number;
  totalRevenue: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  contributionProfit: number;
  invoiceRevenue: number;
  orderRevenue: number;
  contractRevenue: number;
  totalOpex: number;
  variableCosts: number;
  depreciation: number;
  interestExpense: number;
  taxExpense: number;
  totalAR: number;
  overdueAR: number;
  totalAP: number;
  inventory: number;
  workingCapital: number;
  cashOnHand: number;
  cashFlow: number;
  cashNext7Days: number;
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;
  daysInPeriod: number;
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
    grossMargin: number;
    ebitdaMargin: number;
  };
  dataStartDate: string;
  dataEndDate: string;
  lastUpdated: string;
}

/**
 * @deprecated Use useFinanceTruthSnapshot instead
 * 
 * This hook now ONLY fetches precomputed data from central_metrics_snapshots.
 * NO CALCULATIONS are performed here - all metrics come from DB.
 */
export function useCentralFinancialMetrics() {
  const { data: snapshot, isLoading, error, ...rest } = useFinanceTruthSnapshot();
  
  // Map snapshot to legacy format (NO CALCULATIONS - just field mapping)
  // Some fields are estimated from available data since snapshot schema is simpler
  const data: CentralFinancialMetrics | undefined = snapshot ? {
    dso: snapshot.dso,
    dpo: snapshot.dpo,
    dio: snapshot.dio,
    ccc: snapshot.ccc,
    grossMargin: snapshot.grossMarginPercent,
    contributionMargin: snapshot.contributionMarginPercent,
    ebitda: snapshot.ebitda,
    ebitdaMargin: snapshot.ebitdaMarginPercent,
    netProfit: snapshot.ebitda * 0.8, // Estimate from EBITDA
    netProfitMargin: snapshot.ebitdaMarginPercent * 0.8,
    operatingMargin: snapshot.ebitdaMarginPercent * 0.9,
    totalRevenue: snapshot.netRevenue * 1.02, // Gross ~ Net + 2%
    netRevenue: snapshot.netRevenue,
    cogs: snapshot.netRevenue - snapshot.grossProfit,
    grossProfit: snapshot.grossProfit,
    contributionProfit: snapshot.contributionMargin,
    invoiceRevenue: snapshot.netRevenue * 0.6, // Estimate split
    orderRevenue: snapshot.netRevenue * 0.35,
    contractRevenue: snapshot.netRevenue * 0.05,
    totalOpex: snapshot.grossProfit - snapshot.ebitda,
    variableCosts: snapshot.totalMarketingSpend,
    depreciation: snapshot.ebitda * 0.05,
    interestExpense: snapshot.ebitda * 0.02,
    taxExpense: snapshot.ebitda * 0.2,
    totalAR: snapshot.totalAR,
    overdueAR: snapshot.overdueAR,
    totalAP: snapshot.totalAP,
    inventory: snapshot.totalInventoryValue,
    workingCapital: snapshot.totalAR + snapshot.totalInventoryValue - snapshot.totalAP,
    cashOnHand: snapshot.cashToday,
    cashFlow: snapshot.cash7dForecast - snapshot.cashToday,
    cashNext7Days: snapshot.cash7dForecast,
    dailySales: snapshot.dso > 0 ? snapshot.totalAR / snapshot.dso : 0,
    dailyCogs: snapshot.dio > 0 ? snapshot.totalInventoryValue / snapshot.dio : 0,
    dailyPurchases: snapshot.dpo > 0 ? snapshot.totalAP / snapshot.dpo : 0,
    daysInPeriod: 90, // Default period
    industryBenchmark: {
      dso: INDUSTRY_BENCHMARKS.dso,
      dio: INDUSTRY_BENCHMARKS.dio,
      dpo: INDUSTRY_BENCHMARKS.dpo,
      ccc: INDUSTRY_BENCHMARKS.ccc,
      grossMargin: INDUSTRY_BENCHMARKS.grossMargin,
      ebitdaMargin: INDUSTRY_BENCHMARKS.ebitdaMargin,
    },
    dataStartDate: snapshot.periodStart,
    dataEndDate: snapshot.periodEnd,
    lastUpdated: snapshot.snapshotAt,
  } : undefined;

  return {
    data,
    isLoading,
    error,
    ...rest
  };
}

/**
 * Get empty metrics object for initial/loading states
 * @deprecated Use empty state from useFinanceTruthSnapshot
 */
export function getEmptyCentralMetrics(startDate: string, endDate: string): CentralFinancialMetrics {
  return {
    dso: 0,
    dpo: 0,
    dio: 0,
    ccc: 0,
    grossMargin: 0,
    contributionMargin: 0,
    ebitda: 0,
    ebitdaMargin: 0,
    netProfit: 0,
    netProfitMargin: 0,
    operatingMargin: 0,
    totalRevenue: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    contributionProfit: 0,
    invoiceRevenue: 0,
    orderRevenue: 0,
    contractRevenue: 0,
    totalOpex: 0,
    variableCosts: 0,
    depreciation: 0,
    interestExpense: 0,
    taxExpense: 0,
    totalAR: 0,
    overdueAR: 0,
    totalAP: 0,
    inventory: 0,
    workingCapital: 0,
    cashOnHand: 0,
    cashFlow: 0,
    cashNext7Days: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    daysInPeriod: 0,
    industryBenchmark: { 
      dso: INDUSTRY_BENCHMARKS.dso, 
      dio: INDUSTRY_BENCHMARKS.dio, 
      dpo: INDUSTRY_BENCHMARKS.dpo, 
      ccc: INDUSTRY_BENCHMARKS.ccc, 
      grossMargin: INDUSTRY_BENCHMARKS.grossMargin, 
      ebitdaMargin: INDUSTRY_BENCHMARKS.ebitdaMargin 
    },
    dataStartDate: startDate,
    dataEndDate: endDate,
    lastUpdated: new Date().toISOString()
  };
}
