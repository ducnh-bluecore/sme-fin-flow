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
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

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
/**
 * Helper function to get months in a date range
 */
function getMonthsInRange(startDateStr: string, endDateStr: string): Array<{year: number, month: number}> {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const months: Array<{year: number, month: number}> = [];
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Aggregate multiple cache rows into a single summary
 */
function aggregateCacheRows(rows: PLCacheRow[]): PLCacheRow | null {
  if (!rows || rows.length === 0) return null;
  
  return rows.reduce((acc, row) => ({
    period_year: acc.period_year,
    period_month: null,
    gross_sales: (acc.gross_sales || 0) + (row.gross_sales || 0),
    sales_returns: (acc.sales_returns || 0) + (row.sales_returns || 0),
    sales_discounts: (acc.sales_discounts || 0) + (row.sales_discounts || 0),
    net_sales: (acc.net_sales || 0) + (row.net_sales || 0),
    invoice_revenue: (acc.invoice_revenue || 0) + (row.invoice_revenue || 0),
    contract_revenue: (acc.contract_revenue || 0) + (row.contract_revenue || 0),
    integrated_revenue: (acc.integrated_revenue || 0) + (row.integrated_revenue || 0),
    cogs: (acc.cogs || 0) + (row.cogs || 0),
    gross_profit: (acc.gross_profit || 0) + (row.gross_profit || 0),
    gross_margin: 0, // Will be recalculated
    opex_salaries: (acc.opex_salaries || 0) + (row.opex_salaries || 0),
    opex_rent: (acc.opex_rent || 0) + (row.opex_rent || 0),
    opex_utilities: (acc.opex_utilities || 0) + (row.opex_utilities || 0),
    opex_marketing: (acc.opex_marketing || 0) + (row.opex_marketing || 0),
    opex_depreciation: (acc.opex_depreciation || 0) + (row.opex_depreciation || 0),
    opex_insurance: (acc.opex_insurance || 0) + (row.opex_insurance || 0),
    opex_supplies: (acc.opex_supplies || 0) + (row.opex_supplies || 0),
    opex_maintenance: (acc.opex_maintenance || 0) + (row.opex_maintenance || 0),
    opex_professional: (acc.opex_professional || 0) + (row.opex_professional || 0),
    opex_other: (acc.opex_other || 0) + (row.opex_other || 0),
    total_opex: (acc.total_opex || 0) + (row.total_opex || 0),
    operating_income: (acc.operating_income || 0) + (row.operating_income || 0),
    operating_margin: 0, // Will be recalculated
    other_income: (acc.other_income || 0) + (row.other_income || 0),
    interest_expense: (acc.interest_expense || 0) + (row.interest_expense || 0),
    income_before_tax: (acc.income_before_tax || 0) + (row.income_before_tax || 0),
    income_tax: (acc.income_tax || 0) + (row.income_tax || 0),
    net_income: (acc.net_income || 0) + (row.net_income || 0),
    net_margin: 0, // Will be recalculated
  }), { ...rows[0] });
}

/**
 * Fetches P&L data from pl_report_cache table with date range filtering
 * All calculations are pre-computed by refresh_pl_cache RPC
 */
export function usePLData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();
  
  // Parse dates to determine year/month for queries
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  return useQuery({
    queryKey: ['pl-data', tenantId, startDateStr, endDateStr],
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

      let cache: PLCacheRow | null = null;
      let monthlyRows: PLCacheRow[] = [];

      // Determine query strategy based on date range
      const isSingleMonth = startYear === endYear && startMonth === endMonth;
      
      if (isSingleMonth) {
        // Query specific month
        const { data: monthlyCache, error } = await supabase
          .from('pl_report_cache')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('period_year', startYear)
          .eq('period_month', startMonth)
          .maybeSingle();

        if (error) {
          console.error('Error fetching P&L cache for month:', error);
        }
        
        cache = monthlyCache as PLCacheRow | null;
      } else {
        // Query multiple months and aggregate
        const monthsInRange = getMonthsInRange(startDateStr, endDateStr);
        const yearsInRange = [...new Set(monthsInRange.map(m => m.year))];
        
        // Build OR condition for years
        const yearConditions = yearsInRange.map(y => `period_year.eq.${y}`).join(',');
        
        const { data: monthlyCache, error } = await supabase
          .from('pl_report_cache')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(yearConditions)
          .not('period_month', 'is', null)
          .order('period_year')
          .order('period_month');

        if (error) {
          console.error('Error fetching monthly P&L cache:', error);
        }

        // Filter to only include months within the date range
        const filteredMonths = (monthlyCache || []).filter((m: PLCacheRow) => {
          const monthKey = `${m.period_year}-${m.period_month}`;
          return monthsInRange.some(range => `${range.year}-${range.month}` === monthKey);
        }) as PLCacheRow[];

        monthlyRows = filteredMonths;
        cache = aggregateCacheRows(filteredMonths);
        
        // Recalculate margins for aggregated data
        if (cache && cache.net_sales > 0) {
          cache.gross_margin = (cache.gross_profit / cache.net_sales) * 100;
          cache.operating_margin = (cache.operating_income / cache.net_sales) * 100;
          cache.net_margin = (cache.net_income / cache.net_sales) * 100;
        }
      }

      // Fetch monthly data for trend chart (same logic but always get monthly breakdown)
      const { data: trendCache, error: trendError } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period_year', startYear)
        .lte('period_year', endYear)
        .not('period_month', 'is', null)
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true });

      if (trendError) {
        console.error('Error fetching trend P&L cache:', trendError);
      }

      // Filter trend data to date range
      const monthsInRange = getMonthsInRange(startDateStr, endDateStr);
      const filteredTrend = (trendCache || []).filter((m: PLCacheRow) => {
        const monthKey = `${m.period_year}-${m.period_month}`;
        return monthsInRange.some(range => `${range.year}-${range.month}` === monthKey);
      }) as PLCacheRow[];

      // Fetch previous period for comparison (same period last year)
      const prevStartYear = startYear - 1;
      const prevEndYear = endYear - 1;
      const prevMonthsInRange = monthsInRange.map(m => ({
        year: m.year - 1,
        month: m.month
      }));
      const prevYearsInRange = [...new Set(prevMonthsInRange.map(m => m.year))];
      
      let prevCache: PLCacheRow | null = null;
      
      if (prevYearsInRange.length > 0) {
        const prevYearConditions = prevYearsInRange.map(y => `period_year.eq.${y}`).join(',');
        
        const { data: prevMonthlyCache } = await supabase
          .from('pl_report_cache')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(prevYearConditions)
          .not('period_month', 'is', null);

        // Filter to matching months in previous years
        const filteredPrevMonths = (prevMonthlyCache || []).filter((m: PLCacheRow) => {
          const monthKey = `${m.period_year}-${m.period_month}`;
          return prevMonthsInRange.some(range => `${range.year}-${range.month}` === monthKey);
        }) as PLCacheRow[];

        prevCache = aggregateCacheRows(filteredPrevMonths);
      }

      // Map cache to PLData - DIRECT MAPPING from database
      // Note: DB stores margins as decimals (0.51 = 51%, -1.79 = -179%), so multiply by 100
      const plData: PLData = cache ? {
        grossSales: cache.gross_sales || 0,
        salesReturns: cache.sales_returns || 0,
        salesDiscounts: cache.sales_discounts || 0,
        netSales: cache.net_sales || 0,
        cogs: cache.cogs || 0,
        grossProfit: cache.gross_profit || 0,
        grossMargin: (cache.gross_margin || 0) * 100,
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
        operatingMargin: (cache.operating_margin || 0) * 100,
        otherIncome: cache.other_income || 0,
        interestExpense: cache.interest_expense || 0,
        incomeBeforeTax: cache.income_before_tax || 0,
        incomeTax: cache.income_tax || 0,
        netIncome: cache.net_income || 0,
        netMargin: (cache.net_margin || 0) * 100,
      } : getEmptyPLDataStruct().plData;

      // Map monthly cache to MonthlyPLData for trend chart
      const monthlyData: MonthlyPLData[] = filteredTrend.map(m => ({
        month: `T${m.period_month}/${m.period_year}`,
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

      // Fetch category data from v_category_pl_summary view
      const { data: categoryRows } = await supabase
        .from('v_category_pl_summary' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period', startDateStr)
        .lte('period', endDateStr);

      // Aggregate category data across months
      const categoryAgg = new Map<string, { revenue: number; cogs: number }>();
      (categoryRows || []).forEach((row: any) => {
        const existing = categoryAgg.get(row.category) || { revenue: 0, cogs: 0 };
        existing.revenue += Number(row.total_revenue) || 0;
        existing.cogs += Number(row.total_cogs) || 0;
        categoryAgg.set(row.category, existing);
      });

      const totalCatRevenue = [...categoryAgg.values()].reduce((s, c) => s + c.revenue, 0);

      const categoryData: CategoryPLData[] = [...categoryAgg.entries()]
        .map(([category, data]) => ({
          category,
          sales: data.revenue / 1000000, // Convert to millions
          cogs: data.cogs / 1000000,
          margin: data.revenue > 0 
            ? Number(((data.revenue - data.cogs) / data.revenue * 100).toFixed(1))
            : 0,
          contribution: totalCatRevenue > 0
            ? Number((data.revenue / totalCatRevenue * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.sales - a.sales); // Sort by revenue desc

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
