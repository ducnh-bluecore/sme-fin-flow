/**
 * ============================================
 * P&L Data Hook - SSOT COMPLIANT (v2)
 * ============================================
 * 
 * REFACTORED: Now uses database RPCs for ALL calculations.
 * This hook is a THIN WRAPPER - NO CLIENT-SIDE CALCULATIONS.
 * 
 * Uses:
 * - get_pl_aggregated RPC for aggregations
 * - get_pl_comparison RPC for YoY changes
 * - get_category_pl_aggregated RPC for category data
 * - v_pl_monthly_summary view for monthly trends
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

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
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
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
        supabase.rpc('get_pl_aggregated', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 2. Get YoY comparison from RPC
        supabase.rpc('get_pl_comparison', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 3. Get category data from RPC
        supabase.rpc('get_category_pl_aggregated', {
          p_tenant_id: tenantId,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
        }),

        // 4. Get monthly data from view
        supabase
          .from('v_pl_monthly_summary')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('year_month', startDateStr.slice(0, 7))
          .lte('year_month', endDateStr.slice(0, 7))
          .order('period_year', { ascending: true })
          .order('period_month', { ascending: true }),

        // 5. Get revenue breakdown from cache
        supabase
          .from('pl_report_cache')
          .select('invoice_revenue, contract_revenue, integrated_revenue, net_sales, opex_salaries, opex_rent, opex_utilities, opex_marketing, opex_depreciation, opex_insurance, opex_supplies, opex_maintenance, opex_professional, opex_other, sales_returns, sales_discounts, other_income, interest_expense, income_before_tax, income_tax')
          .eq('tenant_id', tenantId)
          .not('period_month', 'is', null)
          .gte('period_year', parseInt(startDateStr.slice(0, 4)))
          .lte('period_year', parseInt(endDateStr.slice(0, 4))),
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
      const plAgg = plAggResult.data?.[0] || null;
      
      // Sum up revenue breakdown and opex from cache rows
      const cacheRows = revenueBreakdownResult.data || [];
      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: cacheRows.reduce((sum, r) => sum + (r.invoice_revenue || 0), 0),
        contractRevenue: cacheRows.reduce((sum, r) => sum + (r.contract_revenue || 0), 0),
        integratedRevenue: cacheRows.reduce((sum, r) => sum + (r.integrated_revenue || 0), 0),
        totalRevenue: plAgg?.net_sales || 0,
      };

      // Aggregate opex breakdown from cache
      const opexBreakdown = {
        salaries: cacheRows.reduce((sum, r) => sum + (r.opex_salaries || 0), 0),
        rent: cacheRows.reduce((sum, r) => sum + (r.opex_rent || 0), 0),
        utilities: cacheRows.reduce((sum, r) => sum + (r.opex_utilities || 0), 0),
        marketing: cacheRows.reduce((sum, r) => sum + (r.opex_marketing || 0), 0),
        depreciation: cacheRows.reduce((sum, r) => sum + (r.opex_depreciation || 0), 0),
        insurance: cacheRows.reduce((sum, r) => sum + (r.opex_insurance || 0), 0),
        supplies: cacheRows.reduce((sum, r) => sum + (r.opex_supplies || 0), 0),
        maintenance: cacheRows.reduce((sum, r) => sum + (r.opex_maintenance || 0), 0),
        professional: cacheRows.reduce((sum, r) => sum + (r.opex_professional || 0), 0),
        other: cacheRows.reduce((sum, r) => sum + (r.opex_other || 0), 0),
      };

      const salesReturns = cacheRows.reduce((sum, r) => sum + (r.sales_returns || 0), 0);
      const salesDiscounts = cacheRows.reduce((sum, r) => sum + (r.sales_discounts || 0), 0);
      const otherIncome = cacheRows.reduce((sum, r) => sum + (r.other_income || 0), 0);
      const interestExpense = cacheRows.reduce((sum, r) => sum + (r.interest_expense || 0), 0);
      const incomeBeforeTax = cacheRows.reduce((sum, r) => sum + (r.income_before_tax || 0), 0);
      const incomeTax = cacheRows.reduce((sum, r) => sum + (r.income_tax || 0), 0);

      // Map to PLData - MARGINS ALREADY AS % FROM DB
      const plData: PLData = plAgg ? {
        grossSales: plAgg.gross_sales || 0,
        salesReturns,
        salesDiscounts,
        netSales: plAgg.net_sales || 0,
        cogs: plAgg.cogs || 0,
        grossProfit: plAgg.gross_profit || 0,
        grossMargin: plAgg.gross_margin_pct || 0, // Already % from DB
        operatingExpenses: {
          ...opexBreakdown,
          logistics: 0, // Will be added when column exists
        },
        totalOperatingExpenses: plAgg.total_opex || 0,
        operatingIncome: plAgg.operating_income || 0,
        operatingMargin: plAgg.operating_margin_pct || 0, // Already % from DB
        otherIncome,
        interestExpense,
        incomeBeforeTax,
        incomeTax,
        netIncome: plAgg.net_income || 0,
        netMargin: plAgg.net_margin_pct || 0, // Already % from DB
      } : getEmptyPLDataStruct().plData;

      // Map monthly data - DIRECT FROM VIEW, PRE-COMPUTED IN MILLIONS
      const monthlyData: MonthlyPLData[] = (monthlyResult.data || []).map((m: any) => ({
        month: `T${m.period_month}/${m.period_year}`,
        netSales: m.net_sales_m || 0, // Already in millions from view
        cogs: m.cogs_m || 0,
        grossProfit: m.gross_profit_m || 0,
        opex: m.opex_m || 0,
        netIncome: m.net_income_m || 0,
      }));

      // Map comparison data - DIRECT FROM RPC, % ALREADY CALCULATED
      const comparisonRows = comparisonResult.data || [];
      const getComparisonRow = (metric: string) => 
        comparisonRows.find((r: any) => r.metric === metric) || { current_value: 0, previous_value: 0, change_pct: 0 };

      const comparisonData: ComparisonData = {
        netSales: {
          current: getComparisonRow('net_sales').current_value || 0,
          previous: getComparisonRow('net_sales').previous_value || 0,
          change: getComparisonRow('net_sales').change_pct || 0, // Already % from DB
        },
        grossProfit: {
          current: getComparisonRow('gross_profit').current_value || 0,
          previous: getComparisonRow('gross_profit').previous_value || 0,
          change: getComparisonRow('gross_profit').change_pct || 0,
        },
        operatingIncome: {
          current: getComparisonRow('operating_income').current_value || 0,
          previous: getComparisonRow('operating_income').previous_value || 0,
          change: getComparisonRow('operating_income').change_pct || 0,
        },
        netIncome: {
          current: getComparisonRow('net_income').current_value || 0,
          previous: getComparisonRow('net_income').previous_value || 0,
          change: getComparisonRow('net_income').change_pct || 0,
        },
      };

      // Map category data - DIRECT FROM RPC, ALL METRICS PRE-COMPUTED
      const categoryData: CategoryPLData[] = (categoryResult.data || []).map((c: any) => ({
        category: c.category || 'Không phân loại',
        sales: c.revenue_m || 0, // Already in millions from DB
        cogs: c.cogs_m || 0,
        margin: c.margin_pct || 0, // Already % from DB
        contribution: c.contribution_pct || 0, // Already % from DB
      }));

      return {
        plData,
        monthlyData,
        categoryData,
        comparisonData,
        revenueBreakdown,
      };
    },
    enabled: !tenantLoading && !!tenantId,
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
