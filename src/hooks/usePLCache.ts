import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useActiveTenantId } from './useActiveTenantId';
import { PLData, MonthlyPLData, ComparisonData, RevenueBreakdown } from './usePLData';

export interface PLReportCache {
  id: string;
  tenant_id: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  
  // Revenue
  gross_sales: number;
  sales_returns: number;
  sales_discounts: number;
  net_sales: number;
  invoice_revenue: number;
  contract_revenue: number;
  integrated_revenue: number;
  
  // COGS & Profit
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  
  // Operating expenses
  opex_salaries: number;
  opex_rent: number;
  opex_utilities: number;
  opex_marketing: number;
  opex_depreciation: number;
  opex_insurance: number;
  opex_supplies: number;
  opex_maintenance: number;
  opex_professional: number;
  opex_other: number;
  opex_logistics: number;
  total_opex: number;
  
  // Provisional data tracking
  opex_data_source: Record<string, 'actual' | 'estimate'>;
  total_opex_estimated: number;
  total_opex_actual: number;
  
  // Operating income
  operating_income: number;
  operating_margin: number;
  
  // Other items
  other_income: number;
  interest_expense: number;
  
  // Tax & Net income
  income_before_tax: number;
  income_tax: number;
  net_income: number;
  net_margin: number;
  
  // JSON data
  category_data: unknown[];
  comparison_data: unknown;
  
  calculated_at: string;
}

// Max age for cache before refresh (1 hour)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

export function usePLCache(year: number = new Date().getFullYear(), month?: number) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pl-cache', tenantId, year, month],
    queryFn: async (): Promise<PLReportCache | null> => {
      if (!tenantId) return null;

      let queryBuilder = client
        .from('pl_report_cache')
        .select('*');
      
      if (shouldAddTenantFilter) {
        queryBuilder = queryBuilder.eq('tenant_id', tenantId);
      }
      
      queryBuilder = queryBuilder.eq('period_year', year);

      if (month !== undefined) {
        queryBuilder = queryBuilder.eq('period_month', month).eq('period_type', 'monthly');
      } else {
        queryBuilder = queryBuilder.eq('period_type', 'yearly').is('period_month', null);
      }

      const { data, error } = await queryBuilder.maybeSingle();

      if (error) {
        console.error('Error fetching PL cache:', error);
        return null;
      }

      // Check if cache is stale and needs refresh
      if (data) {
        const cacheAge = Date.now() - new Date(data.calculated_at).getTime();
        if (cacheAge > CACHE_MAX_AGE_MS) {
          // Trigger background refresh
          supabase.rpc('refresh_pl_cache', { 
            p_tenant_id: tenantId,
            p_year: year,
            p_month: month || null,
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['pl-cache', tenantId, year, month] });
          });
        }
      } else {
        // No cache exists, create it
        supabase.rpc('refresh_pl_cache', { 
          p_tenant_id: tenantId,
          p_year: year,
          p_month: month || null,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['pl-cache', tenantId, year, month] });
        });
      }

      return data as PLReportCache | null;
    },
    enabled: isReady,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Convert cache to PLData format
  const opexDataSource = (query.data?.opex_data_source || {}) as Record<string, 'actual' | 'estimate'>;
  const hasProvisionalData = Object.values(opexDataSource).includes('estimate');
  
  const plData: PLData | null = query.data ? {
    grossSales: query.data.gross_sales || 0,
    salesReturns: query.data.sales_returns || 0,
    salesDiscounts: query.data.sales_discounts || 0,
    netSales: query.data.net_sales || 0,
    cogs: query.data.cogs || 0,
    grossProfit: query.data.gross_profit || 0,
    grossMargin: query.data.gross_margin || 0,
    operatingExpenses: {
      salaries: query.data.opex_salaries || 0,
      rent: query.data.opex_rent || 0,
      utilities: query.data.opex_utilities || 0,
      marketing: query.data.opex_marketing || 0,
      depreciation: query.data.opex_depreciation || 0,
      insurance: query.data.opex_insurance || 0,
      supplies: query.data.opex_supplies || 0,
      maintenance: query.data.opex_maintenance || 0,
      professional: query.data.opex_professional || 0,
      logistics: query.data.opex_logistics || 0,
      other: query.data.opex_other || 0,
    },
    totalOperatingExpenses: query.data.total_opex || 0,
    operatingIncome: query.data.operating_income || 0,
    operatingMargin: query.data.operating_margin || 0,
    otherIncome: query.data.other_income || 0,
    interestExpense: query.data.interest_expense || 0,
    incomeBeforeTax: query.data.income_before_tax || 0,
    incomeTax: query.data.income_tax || 0,
    netIncome: query.data.net_income || 0,
    netMargin: query.data.net_margin || 0,
    // Provisional data
    opexDataSource,
    totalOpexEstimated: query.data.total_opex_estimated || 0,
    totalOpexActual: query.data.total_opex_actual || 0,
    hasProvisionalData,
  } : null;

  const revenueBreakdown: RevenueBreakdown | null = query.data ? {
    invoiceRevenue: query.data.invoice_revenue || 0,
    contractRevenue: query.data.contract_revenue || 0,
    integratedRevenue: query.data.integrated_revenue || 0,
    totalRevenue: query.data.net_sales || 0,
  } : null;

  return {
    ...query,
    plData,
    revenueBreakdown,
    cacheData: query.data,
  };
}

// Hook to get all monthly P&L for a year
export function useMonthlyPLCache(year: number = new Date().getFullYear()) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['pl-cache-monthly', tenantId, year],
    queryFn: async (): Promise<MonthlyPLData[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('pl_report_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_year', year)
        .eq('period_type', 'monthly')
        .order('period_month', { ascending: true });

      if (error) {
        console.error('Error fetching monthly PL cache:', error);
        return [];
      }

      // If we don't have all 12 months, trigger refresh for missing ones
      if (!data || data.length < 12) {
        const existingMonths = new Set(data?.map(d => d.period_month) || []);
        for (let m = 1; m <= 12; m++) {
          if (!existingMonths.has(m)) {
            supabase.rpc('refresh_pl_cache', {
              p_tenant_id: tenantId,
              p_year: year,
              p_month: m,
            });
          }
        }
        // Invalidate after a delay to pick up new data
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['pl-cache-monthly', tenantId, year] });
        }, 2000);
      }

      // Convert to MonthlyPLData format
      return (data || []).map(row => ({
        month: `T${row.period_month}`,
        netSales: Math.round((row.net_sales || 0) / 1000000),
        cogs: Math.round((row.cogs || 0) / 1000000),
        grossProfit: Math.round((row.gross_profit || 0) / 1000000),
        opex: Math.round((row.total_opex || 0) / 1000000),
        netIncome: Math.round((row.net_income || 0) / 1000000),
      }));
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useRefreshPLCache() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month?: number }) => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await supabase.rpc('refresh_pl_cache', {
        p_tenant_id: tenantId,
        p_year: year,
        p_month: month || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, { year, month }) => {
      queryClient.invalidateQueries({ queryKey: ['pl-cache', tenantId, year, month] });
      queryClient.invalidateQueries({ queryKey: ['pl-cache-monthly', tenantId, year] });
    },
  });
}
