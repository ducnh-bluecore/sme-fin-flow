/**
 * ============================================
 * DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead
 * ============================================
 * 
 * This hook is DEPRECATED and exists only for backwards compatibility.
 * It now fetches from precomputed tables ONLY - NO BUSINESS CALCULATIONS.
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
 * This hook now ONLY maps precomputed data from DB.
 * NO BUSINESS CALCULATIONS - only direct field mapping.
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
      // Derive values using algebra only (COGS = Revenue - Gross Profit)
      const netRevenue = snapshot?.netRevenue || 0;
      const grossProfit = snapshot?.grossProfit || 0;
      const cogs = netRevenue - grossProfit;
      const ebitda = snapshot?.ebitda || 0;
      const opex = grossProfit - ebitda;
      
      // Map snapshot to PLData format - DIRECT MAPPING, no business formulas
      const plData: PLData = snapshot ? {
        grossSales: netRevenue, // Use net as gross (returns not in snapshot)
        salesReturns: 0,
        salesDiscounts: 0,
        netSales: netRevenue,
        cogs: cogs,
        grossProfit: grossProfit,
        grossMargin: snapshot.grossMarginPercent / 100,
        operatingExpenses: {
          salaries: 0, // Not broken down in snapshot
          rent: 0,
          utilities: 0,
          marketing: snapshot.totalMarketingSpend,
          depreciation: 0,
          insurance: 0,
          supplies: 0,
          maintenance: 0,
          professional: 0,
          other: opex - snapshot.totalMarketingSpend,
        },
        totalOperatingExpenses: opex,
        operatingIncome: ebitda,
        operatingMargin: snapshot.ebitdaMarginPercent / 100,
        otherIncome: 0,
        interestExpense: 0,
        incomeBeforeTax: ebitda,
        incomeTax: 0,
        netIncome: ebitda, // Use EBITDA as proxy (net_income not in snapshot)
        netMargin: snapshot.ebitdaMarginPercent / 100,
      } : getEmptyPLDataStruct().plData;

      // Map monthly summary to MonthlyPLData - DIRECT MAPPING
      const monthlyPL: MonthlyPLData[] = (monthlyData || []).map(m => ({
        month: `T${new Date(m.yearMonth + '-01').getMonth() + 1}`,
        netSales: Math.round(m.netRevenue / 1000000),
        cogs: Math.round(m.cogs / 1000000),
        grossProfit: Math.round(m.grossProfit / 1000000),
        opex: Math.round(m.operatingExpenses / 1000000),
        netIncome: Math.round(m.ebitda / 1000000), // Use EBITDA
      }));

      // Category data would come from central_metric_facts
      const categoryData: CategoryPLData[] = [];

      // Comparison data from monthly summary - use precomputed MoM change
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
          change: previous?.grossProfit && previous.grossProfit > 0 
            ? ((current?.grossProfit || 0) - previous.grossProfit) / previous.grossProfit * 100 
            : 0,
        },
        operatingIncome: {
          current: current?.ebitda || 0,
          previous: previous?.ebitda || 0,
          change: previous?.ebitda && previous.ebitda > 0 
            ? ((current?.ebitda || 0) - previous.ebitda) / previous.ebitda * 100 
            : 0,
        },
        netIncome: {
          current: current?.ebitda || 0,
          previous: previous?.ebitda || 0,
          change: previous?.ebitda && previous.ebitda > 0 
            ? ((current?.ebitda || 0) - previous.ebitda) / previous.ebitda * 100 
            : 0,
        },
      };

      // Revenue breakdown - not available, return zeros
      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: 0,
        contractRevenue: 0,
        integratedRevenue: 0,
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
