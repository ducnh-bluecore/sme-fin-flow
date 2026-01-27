/**
 * ============================================
 * P&L Data Hook - Fetches from pl_report_cache
 * ============================================
 * 
 * This hook fetches pre-computed P&L data from the `pl_report_cache` table.
 * All business calculations are done in the database (refresh_pl_cache RPC).
 * This hook is a thin wrapper - NO CLIENT-SIDE CALCULATIONS.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

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
    logistics: number; // Added logistics
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

interface PLCacheRow {
  period_year: number;
  period_month: number | null;
  gross_sales: number;
  sales_returns: number;
  sales_discounts: number;
  net_sales: number;
  invoice_revenue: number;
  contract_revenue: number;
  integrated_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  opex_salaries: number;
  opex_rent: number;
  opex_utilities: number;
  opex_marketing: number;
  opex_depreciation: number;
  opex_insurance: number | null;
  opex_supplies: number | null;
  opex_maintenance: number | null;
  opex_professional: number | null;
  opex_other: number;
  total_opex: number;
  operating_income: number;
  operating_margin: number;
  other_income: number | null;
  interest_expense: number;
  income_before_tax: number;
  income_tax: number;
  net_income: number;
  net_margin: number;
}

/**
 * Fetches P&L data from pl_report_cache table
 * All calculations are pre-computed by refresh_pl_cache RPC
 */
export function usePLData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['pl-data', tenantId, currentYear],
    queryFn: async (): Promise<{
      plData: PLData;
      monthlyData: MonthlyPLData[];
      categoryData: CategoryPLData[];
      comparisonData: ComparisonData;
      revenueBreakdown: RevenueBreakdown;
    }> => {
      if (!tenantId) {
        return getEmptyPLDataStruct();
      }

      // Fetch yearly aggregate (period_month IS NULL) for current year
      const { data: yearlyCache, error: yearlyError } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_year', currentYear)
        .is('period_month', null)
        .maybeSingle();

      if (yearlyError) {
        console.error('Error fetching yearly P&L cache:', yearlyError);
      }

      // Fetch monthly data for the year
      const { data: monthlyCache, error: monthlyError } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_year', currentYear)
        .not('period_month', 'is', null)
        .order('period_month', { ascending: true });

      if (monthlyError) {
        console.error('Error fetching monthly P&L cache:', monthlyError);
      }

      // Fetch previous year for comparison
      const { data: prevYearCache } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_year', currentYear - 1)
        .is('period_month', null)
        .maybeSingle();

      // Map cache to PLData - DIRECT MAPPING from database
      const cache = yearlyCache as PLCacheRow | null;
      const prevCache = prevYearCache as PLCacheRow | null;

      const plData: PLData = cache ? {
        grossSales: cache.gross_sales || 0,
        salesReturns: cache.sales_returns || 0,
        salesDiscounts: cache.sales_discounts || 0,
        netSales: cache.net_sales || 0,
        cogs: cache.cogs || 0,
        grossProfit: cache.gross_profit || 0,
        grossMargin: cache.gross_margin || 0,
        operatingExpenses: {
          salaries: cache.opex_salaries || 0,
          rent: cache.opex_rent || 0,
          utilities: cache.opex_utilities || 0,
          marketing: cache.opex_marketing || 0,
          depreciation: cache.opex_depreciation || 0,
          insurance: cache.opex_insurance || 0,
          supplies: cache.opex_supplies || 0,
          maintenance: cache.opex_maintenance || 0,
          professional: cache.opex_professional || 0,
          logistics: 0, // Will be added when we have logistics column
          other: cache.opex_other || 0,
        },
        totalOperatingExpenses: cache.total_opex || 0,
        operatingIncome: cache.operating_income || 0,
        operatingMargin: cache.operating_margin || 0,
        otherIncome: cache.other_income || 0,
        interestExpense: cache.interest_expense || 0,
        incomeBeforeTax: cache.income_before_tax || 0,
        incomeTax: cache.income_tax || 0,
        netIncome: cache.net_income || 0,
        netMargin: cache.net_margin || 0,
      } : getEmptyPLDataStruct().plData;

      // Map monthly cache to MonthlyPLData
      const monthlyRows = (monthlyCache || []) as PLCacheRow[];
      const monthlyData: MonthlyPLData[] = monthlyRows.map(m => ({
        month: `T${m.period_month}`,
        netSales: Math.round((m.net_sales || 0) / 1000000),
        cogs: Math.round((m.cogs || 0) / 1000000),
        grossProfit: Math.round((m.gross_profit || 0) / 1000000),
        opex: Math.round((m.total_opex || 0) / 1000000),
        netIncome: Math.round((m.net_income || 0) / 1000000),
      }));

      // Calculate comparison data (YoY change)
      const calcChange = (current: number, previous: number): number => {
        if (!previous || previous === 0) return 0;
        return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
      };

      const comparisonData: ComparisonData = {
        netSales: {
          current: cache?.net_sales || 0,
          previous: prevCache?.net_sales || 0,
          change: calcChange(cache?.net_sales || 0, prevCache?.net_sales || 0),
        },
        grossProfit: {
          current: cache?.gross_profit || 0,
          previous: prevCache?.gross_profit || 0,
          change: calcChange(cache?.gross_profit || 0, prevCache?.gross_profit || 0),
        },
        operatingIncome: {
          current: cache?.operating_income || 0,
          previous: prevCache?.operating_income || 0,
          change: calcChange(cache?.operating_income || 0, prevCache?.operating_income || 0),
        },
        netIncome: {
          current: cache?.net_income || 0,
          previous: prevCache?.net_income || 0,
          change: calcChange(cache?.net_income || 0, prevCache?.net_income || 0),
        },
      };

      // Revenue breakdown from cache
      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: cache?.invoice_revenue || 0,
        contractRevenue: cache?.contract_revenue || 0,
        integratedRevenue: cache?.integrated_revenue || 0,
        totalRevenue: cache?.net_sales || 0,
      };

      // Category data - would need separate query if needed
      const categoryData: CategoryPLData[] = [];

      return {
        plData,
        monthlyData,
        categoryData,
        comparisonData,
        revenueBreakdown,
      };
    },
    enabled: !tenantLoading && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
        logistics: 0,
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
