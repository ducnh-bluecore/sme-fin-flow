/**
 * ============================================
 * P&L Data Hook - SSOT COMPLIANT (v2)
 * ============================================
 * 
 * REFACTORED: Now uses database RPCs for ALL calculations.
 * This hook is a THIN WRAPPER - NO CLIENT-SIDE CALCULATIONS.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 * 
 * Uses:
 * - get_pl_aggregated RPC for aggregations
 * - get_pl_comparison RPC for YoY changes
 * - get_category_pl_aggregated RPC for category data
 * - v_pl_monthly_summary view for monthly trends
 */
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export type OpexDataSource = Record<string, 'actual' | 'estimate'>;

export interface PLData {
  grossSales: number;
  salesReturns: number;
  salesDiscounts: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number; // Already as % from DB
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
    logistics: number;
    other: number;
  };
  totalOperatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number; // Already as % from DB
  otherIncome: number;
  interestExpense: number;
  incomeBeforeTax: number;
  incomeTax: number;
  netIncome: number;
  netMargin: number; // Already as % from DB
  // Provisional data tracking
  opexDataSource?: OpexDataSource;
  totalOpexEstimated?: number;
  totalOpexActual?: number;
  hasProvisionalData?: boolean;
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
  sales: number; // Already in millions from DB
  cogs: number; // Already in millions from DB
  margin: number; // Already as % from DB
  contribution: number; // Already as % from DB
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
 * SSOT-Compliant P&L Data Hook
 * All calculations are performed in database RPCs/Views
 */
export function usePLData() {
  const { buildSelectQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['pl-data-ssot', tenantId, startDateStr, endDateStr],
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

      // Execute all RPC calls in parallel - NO CLIENT-SIDE AGGREGATION
      const [
        plAggResult,
        comparisonResult,
        categoryResult,
        monthlyResult,
        revenueBreakdownResult,
      ] = await Promise.all([
        // 1. Get aggregated P&L data from RPC
        callRpc('get_pl_aggregated', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 2. Get YoY comparison from RPC
        callRpc('get_pl_comparison', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 3. Get category data from RPC
        callRpc('get_category_pl_aggregated', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 4. Get monthly data from view
        buildSelectQuery('v_pl_monthly_summary', '*')
          .gte('year_month', startDateStr.slice(0, 7))
          .lte('year_month', endDateStr.slice(0, 7))
          .order('period_year', { ascending: true })
          .order('period_month', { ascending: true }),

        // 5. Get revenue breakdown + opex aggregated from DB RPC (no client-side .reduce())
        callRpc('get_pl_cache_aggregated', {
          p_tenant_id: tenantId,
          p_start_year: parseInt(startDateStr.slice(0, 4)),
          p_end_year: parseInt(endDateStr.slice(0, 4)),
        }),
      ]);

      // Handle errors
      if (plAggResult.error) {
        console.error('Error fetching P&L aggregated:', plAggResult.error);
      }
      if (comparisonResult.error) {
        console.error('Error fetching P&L comparison:', comparisonResult.error);
      }
      if (categoryResult.error) {
        console.error('Error fetching category P&L:', categoryResult.error);
      }
      if (monthlyResult.error) {
        console.error('Error fetching monthly P&L:', monthlyResult.error);
      }

      // Parse aggregated P&L - DIRECT MAPPING, NO CALCULATIONS
      const plAggData = plAggResult.data as unknown[];
      const plAgg = (plAggData && plAggData.length > 0 ? plAggData[0] : null) as Record<string, unknown> | null;
      
      // SSOT: All aggregation done in DB RPC get_pl_cache_aggregated - NO client-side .reduce()
      const cacheAggData = revenueBreakdownResult.data as unknown[];
      const cacheAgg = (cacheAggData && cacheAggData.length > 0 ? cacheAggData[0] : null) as Record<string, unknown> | null;

      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: Number(cacheAgg?.invoice_revenue) || 0,
        contractRevenue: Number(cacheAgg?.contract_revenue) || 0,
        integratedRevenue: Number(cacheAgg?.integrated_revenue) || 0,
        totalRevenue: Number(plAgg?.net_sales) || 0,
      };

      const opexBreakdown = {
        salaries: Number(cacheAgg?.opex_salaries) || 0,
        rent: Number(cacheAgg?.opex_rent) || 0,
        utilities: Number(cacheAgg?.opex_utilities) || 0,
        marketing: Number(cacheAgg?.opex_marketing) || 0,
        depreciation: Number(cacheAgg?.opex_depreciation) || 0,
        insurance: Number(cacheAgg?.opex_insurance) || 0,
        supplies: Number(cacheAgg?.opex_supplies) || 0,
        maintenance: Number(cacheAgg?.opex_maintenance) || 0,
        professional: Number(cacheAgg?.opex_professional) || 0,
        other: Number(cacheAgg?.opex_other) || 0,
      };

      const salesReturns = Number(cacheAgg?.sales_returns) || 0;
      const salesDiscounts = Number(cacheAgg?.sales_discounts) || 0;
      const otherIncome = Number(cacheAgg?.other_income) || 0;
      const interestExpense = Number(cacheAgg?.interest_expense) || 0;
      const incomeBeforeTax = Number(cacheAgg?.income_before_tax) || 0;
      const incomeTax = Number(cacheAgg?.income_tax) || 0;

      // Map to PLData - MARGINS ALREADY AS % FROM DB
      const plData: PLData = plAgg ? {
        grossSales: Number(plAgg.gross_sales) || 0,
        salesReturns,
        salesDiscounts,
        netSales: Number(plAgg.net_sales) || 0,
        cogs: Number(plAgg.cogs) || 0,
        grossProfit: Number(plAgg.gross_profit) || 0,
        grossMargin: Number(plAgg.gross_margin_pct) || 0, // Already % from DB
        operatingExpenses: {
          ...opexBreakdown,
          logistics: 0, // Will be added when column exists
        },
        totalOperatingExpenses: Number(plAgg.total_opex) || 0,
        operatingIncome: Number(plAgg.operating_income) || 0,
        operatingMargin: Number(plAgg.operating_margin_pct) || 0, // Already % from DB
        otherIncome,
        interestExpense,
        incomeBeforeTax,
        incomeTax,
        netIncome: Number(plAgg.net_income) || 0,
        netMargin: Number(plAgg.net_margin_pct) || 0, // Already % from DB
      } : getEmptyPLDataStruct().plData;

      // Map monthly data - DIRECT FROM VIEW, PRE-COMPUTED IN MILLIONS
      const monthlyRows = (monthlyResult.data || []) as unknown as Array<Record<string, unknown>>;
      const monthlyData: MonthlyPLData[] = monthlyRows.map((m) => ({
        month: `T${m.period_month}/${m.period_year}`,
        netSales: Number(m.net_sales_m) || 0, // Already in millions from view
        cogs: Number(m.cogs_m) || 0,
        grossProfit: Number(m.gross_profit_m) || 0,
        opex: Number(m.opex_m) || 0,
        netIncome: Number(m.net_income_m) || 0,
      }));

      // Map comparison data - DIRECT FROM RPC, % ALREADY CALCULATED
      const comparisonRows = (comparisonResult.data || []) as unknown as Array<Record<string, unknown>>;
      const getComparisonRow = (metric: string) => 
        comparisonRows.find((r) => r.metric === metric) || { current_value: 0, previous_value: 0, change_pct: 0 };

      const comparisonData: ComparisonData = {
        netSales: {
          current: Number(getComparisonRow('net_sales').current_value) || 0,
          previous: Number(getComparisonRow('net_sales').previous_value) || 0,
          change: Number(getComparisonRow('net_sales').change_pct) || 0, // Already % from DB
        },
        grossProfit: {
          current: Number(getComparisonRow('gross_profit').current_value) || 0,
          previous: Number(getComparisonRow('gross_profit').previous_value) || 0,
          change: Number(getComparisonRow('gross_profit').change_pct) || 0,
        },
        operatingIncome: {
          current: Number(getComparisonRow('operating_income').current_value) || 0,
          previous: Number(getComparisonRow('operating_income').previous_value) || 0,
          change: Number(getComparisonRow('operating_income').change_pct) || 0,
        },
        netIncome: {
          current: Number(getComparisonRow('net_income').current_value) || 0,
          previous: Number(getComparisonRow('net_income').previous_value) || 0,
          change: Number(getComparisonRow('net_income').change_pct) || 0,
        },
      };

      // Map category data - DIRECT FROM RPC, ALL METRICS PRE-COMPUTED
      const categoryRows = (categoryResult.data || []) as unknown as Array<Record<string, unknown>>;
      const categoryData: CategoryPLData[] = categoryRows.map((c) => ({
        category: String(c.category || 'Không phân loại'),
        sales: Number(c.revenue_m) || 0, // Already in millions from DB
        cogs: Number(c.cogs_m) || 0,
        margin: Number(c.margin_pct) || 0, // Already % from DB
        contribution: Number(c.contribution_pct) || 0, // Already % from DB
      }));

      return {
        plData,
        monthlyData,
        categoryData,
        comparisonData,
        revenueBreakdown,
      };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
