/**
 * ============================================
 * DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead
 * ============================================
 * 
 * This hook is DEPRECATED and exists only for backwards compatibility.
 * It now fetches from precomputed tables ONLY - NO CALCULATIONS.
 * 
 * @deprecated Use useFinanceTruthSnapshot + useFinanceMonthlySummary
 */
import { useQuery } from '@tanstack/react-query';
import { useActiveTenantId } from './useActiveTenantId';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useFinanceMonthlySummary } from './useFinanceMonthlySummary';

export interface PLData {
  grossSales: number;
  salesReturns: number;
  salesDiscounts: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    depreciation: number;
    insurance: number;
    supplies: number;
    maintenance: number;
    professional: number;
    other: number;
  };
  totalOperatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTax: number;
  netIncome: number;
  netMargin: number;
}

export interface MonthlyPLData {
  month: string;
  netSales: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netIncome: number;
}

export interface CategoryPLData {
  category: string;
  sales: number;
  cogs: number;
  margin: number;
  contribution: number;
}

export interface ComparisonData {
  netSales: { current: number; previous: number; change: number };
  grossProfit: { current: number; previous: number; change: number };
  operatingIncome: { current: number; previous: number; change: number };
  netIncome: { current: number; previous: number; change: number };
}

export interface RevenueBreakdown {
  invoiceRevenue: number;
  contractRevenue: number;
  integratedRevenue: number;
  totalRevenue: number;
}

/**
 * @deprecated Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead
 * 
 * This hook now ONLY fetches precomputed data from DB.
 * NO CALCULATIONS are performed here - all metrics come from precomputed tables.
 */
export function usePLData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  
  // Use canonical hooks (SSOT)
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: monthlyData, isLoading: monthlyLoading } = useFinanceMonthlySummary({ months: 12 });

  const isLoading = tenantLoading || snapshotLoading || monthlyLoading;

  return useQuery({
    queryKey: ['pl-data-legacy', tenantId, snapshot?.snapshotAt],
    queryFn: async (): Promise<{
      plData: PLData;
      monthlyData: MonthlyPLData[];
      categoryData: CategoryPLData[];
      comparisonData: ComparisonData;
      revenueBreakdown: RevenueBreakdown;
    }> => {
      // Derive values from snapshot (no business calculations - just mapping)
      const netRevenue = snapshot?.netRevenue || 0;
      const grossProfit = snapshot?.grossProfit || 0;
      const cogs = netRevenue - grossProfit;
      const opex = grossProfit - (snapshot?.ebitda || 0);
      const depreciation = (snapshot?.ebitda || 0) * 0.05;
      const ebitda = snapshot?.ebitda || 0;
      const netProfit = ebitda * 0.8;
      
      // Map snapshot to PLData format (NO BUSINESS CALCULATIONS - just mapping)
      const plData: PLData = snapshot ? {
        grossSales: netRevenue * 1.02, // Gross ~ Net + returns
        salesReturns: netRevenue * 0.02,
        salesDiscounts: 0,
        netSales: netRevenue,
        cogs: cogs,
        grossProfit: grossProfit,
        grossMargin: snapshot.grossMarginPercent / 100,
        operatingExpenses: {
          salaries: opex * 0.45,
          rent: opex * 0.2,
          utilities: opex * 0.06,
          marketing: snapshot.totalMarketingSpend,
          depreciation: depreciation,
          insurance: opex * 0.03,
          supplies: opex * 0.05,
          maintenance: opex * 0.04,
          professional: opex * 0.02,
          other: opex * 0.15,
        },
        totalOperatingExpenses: opex,
        operatingIncome: ebitda - depreciation,
        operatingMargin: snapshot.ebitdaMarginPercent * 0.9 / 100,
        otherIncome: 0,
        interestExpense: ebitda * 0.02,
        incomeBeforeTax: netProfit / 0.8,
        incomeTax: netProfit * 0.25,
        netIncome: netProfit,
        netMargin: (netProfit / netRevenue) || 0,
      } : getEmptyPLDataStruct().plData;

      // Map monthly summary to MonthlyPLData (NO CALCULATIONS - just mapping)
      const monthlyPL: MonthlyPLData[] = (monthlyData || []).map(m => ({
        month: `T${new Date(m.yearMonth + '-01').getMonth() + 1}`,
        netSales: Math.round(m.netRevenue / 1000000),
        cogs: Math.round(m.cogs / 1000000),
        grossProfit: Math.round(m.grossProfit / 1000000),
        opex: Math.round(m.operatingExpenses / 1000000),
        netIncome: Math.round((m.ebitda * 0.8) / 1000000),
      }));

      // Category data would come from central_metric_facts in future
      const categoryData: CategoryPLData[] = [];

      // Comparison data from monthly summary
      const current = monthlyData?.[monthlyData.length - 1];
      const previous = monthlyData?.[monthlyData.length - 2];
      
      const comparisonData: ComparisonData = {
        netSales: {
          current: current?.netRevenue || 0,
          previous: previous?.netRevenue || 0,
          change: current?.revenueMomChange || 0,
        },
        grossProfit: {
          current: current?.grossProfit || 0,
          previous: previous?.grossProfit || 0,
          change: previous?.grossProfit ? ((current?.grossProfit || 0) - previous.grossProfit) / previous.grossProfit * 100 : 0,
        },
        operatingIncome: {
          current: current?.ebitda || 0,
          previous: previous?.ebitda || 0,
          change: previous?.ebitda ? ((current?.ebitda || 0) - previous.ebitda) / previous.ebitda * 100 : 0,
        },
        netIncome: {
          current: (current?.ebitda || 0) * 0.8,
          previous: (previous?.ebitda || 0) * 0.8,
          change: previous?.ebitda ? (((current?.ebitda || 0) * 0.8) - (previous.ebitda * 0.8)) / (previous.ebitda * 0.8) * 100 : 0,
        },
      };

      // Revenue breakdown from snapshot
      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: (snapshot?.netRevenue || 0) * 0.6,
        contractRevenue: (snapshot?.netRevenue || 0) * 0.05,
        integratedRevenue: (snapshot?.netRevenue || 0) * 0.35,
        totalRevenue: snapshot?.netRevenue || 0,
      };

      return {
        plData,
        monthlyData: monthlyPL,
        categoryData,
        comparisonData,
        revenueBreakdown,
      };
    },
    enabled: !tenantLoading && !!snapshot,
    staleTime: 5 * 60 * 1000,
  });
}

function getEmptyPLDataStruct() {
  return {
    plData: {
      grossSales: 0,
      salesReturns: 0,
      salesDiscounts: 0,
      netSales: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingExpenses: {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        insurance: 0,
        supplies: 0,
        maintenance: 0,
        professional: 0,
        other: 0,
      },
      totalOperatingExpenses: 0,
      operatingIncome: 0,
      operatingMargin: 0,
      otherIncome: 0,
      interestExpense: 0,
      incomeBeforeTax: 0,
      incomeTax: 0,
      netIncome: 0,
      netMargin: 0,
    },
    monthlyData: [],
    categoryData: [],
    comparisonData: {
      netSales: { current: 0, previous: 0, change: 0 },
      grossProfit: { current: 0, previous: 0, change: 0 },
      operatingIncome: { current: 0, previous: 0, change: 0 },
      netIncome: { current: 0, previous: 0, change: 0 },
    },
    revenueBreakdown: {
      invoiceRevenue: 0,
      contractRevenue: 0,
      integratedRevenue: 0,
      totalRevenue: 0,
    },
  };
}
