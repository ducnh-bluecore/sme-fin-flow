import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { CentralFinancialMetrics } from './useCentralFinancialMetrics';

// Max age for cache before refresh (15 minutes)
const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

interface CachedMetricsRow {
  tenant_id: string;
  date_range_start: string | null;
  date_range_end: string | null;
  calculated_at: string;
  cash_today: number | null;
  total_ar: number | null;
  overdue_ar: number | null;
  dso: number | null;
  dpo: number | null;
  dio: number | null;
  ccc: number | null;
  gross_margin: number | null;
  ebitda: number | null;
  ebitda_margin: number | null;
  operating_margin: number | null;
  net_profit: number | null;
  net_profit_margin: number | null;
  total_revenue: number | null;
  net_revenue: number | null;
  total_cogs: number | null;
  total_opex: number | null;
  gross_profit: number | null;
  invoice_revenue: number | null;
  order_revenue: number | null;
  contract_revenue: number | null;
  depreciation: number | null;
  interest_expense: number | null;
  tax_expense: number | null;
  total_ap: number | null;
  inventory: number | null;
  working_capital: number | null;
  cash_flow: number | null;
  daily_sales: number | null;
  daily_cogs: number | null;
  daily_purchases: number | null;
  days_in_period: number | null;
}

/**
 * Hook to use cached central financial metrics
 * Falls back to triggering background refresh if cache is stale
 */
export function useCentralMetricsCache() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['central-metrics-cache', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<CentralFinancialMetrics | null> => {
      if (!tenantId) return null;

      // Fetch cached data
      let dbQuery = client
        .from('dashboard_kpi_cache')
        .select('*');

      if (shouldAddTenantFilter) {
        dbQuery = dbQuery.eq('tenant_id', tenantId);
      }

      const { data, error } = await dbQuery.maybeSingle();

      if (error) {
        console.error('Error fetching cached metrics:', error);
        return null;
      }

      const cached = data as CachedMetricsRow | null;

      // Check if cache exists and is fresh enough
      if (cached?.calculated_at) {
        const cacheAge = Date.now() - new Date(cached.calculated_at).getTime();
        const dateRangeMatches = 
          cached.date_range_start === startDateStr && 
          cached.date_range_end === endDateStr;

        if (cacheAge > CACHE_MAX_AGE_MS || !dateRangeMatches) {
          // Trigger background refresh
          triggerBackgroundRefresh(client, tenantId, startDateStr, endDateStr, queryClient);
        }

        // Return cached data immediately
        return mapCacheToMetrics(cached, startDateStr, endDateStr);
      }

      // No cache exists - trigger creation and return null
      triggerBackgroundRefresh(client, tenantId, startDateStr, endDateStr, queryClient);
      return null;
    },
    enabled: !!tenantId && isReady,
    staleTime: 30000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    isCached: !!query.data,
  };
}

/**
 * Hook to manually refresh the metrics cache
 */
export function useRefreshCentralMetricsCache() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await client.rpc('refresh_central_metrics_cache', {
        p_tenant_id: tenantId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central-metrics-cache', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['central-financial-metrics', tenantId] });
    },
  });
}

// Helper: trigger background refresh without blocking
async function triggerBackgroundRefresh(
  client: ReturnType<typeof useTenantSupabaseCompat>['client'],
  tenantId: string, 
  startDate: string, 
  endDate: string,
  queryClient: ReturnType<typeof useQueryClient>
) {
  try {
    await client.rpc('refresh_central_metrics_cache', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    queryClient.invalidateQueries({ queryKey: ['central-metrics-cache', tenantId] });
  } catch (err) {
    console.error('Background refresh failed:', err);
  }
}

// Helper: map cached row to CentralFinancialMetrics
function mapCacheToMetrics(
  cached: CachedMetricsRow, 
  startDate: string, 
  endDate: string
): CentralFinancialMetrics {
  // Calculate contribution margin from gross profit and variable costs
  const grossProfit = Number(cached.gross_profit) || 0;
  const variableCosts = 0; // Not stored in cache, estimate from available data
  const netRevenue = Number(cached.net_revenue) || 0;
  const contributionProfit = grossProfit - variableCosts;
  const contributionMargin = netRevenue > 0 ? (contributionProfit / netRevenue) * 100 : 0;
  
  return {
    dso: cached.dso ?? 0,
    dpo: cached.dpo ?? 0,
    dio: cached.dio ?? 0,
    ccc: cached.ccc ?? 0,
    grossMargin: Number(cached.gross_margin) || 0,
    contributionMargin,
    ebitda: Number(cached.ebitda) || 0,
    ebitdaMargin: Number(cached.ebitda_margin) || 0,
    netProfit: Number(cached.net_profit) || 0,
    netProfitMargin: Number(cached.net_profit_margin) || 0,
    operatingMargin: Number(cached.operating_margin) || 0,
    totalRevenue: Number(cached.total_revenue) || 0,
    netRevenue,
    cogs: Number(cached.total_cogs) || 0,
    grossProfit,
    contributionProfit,
    invoiceRevenue: Number(cached.invoice_revenue) || 0,
    orderRevenue: Number(cached.order_revenue) || 0,
    contractRevenue: Number(cached.contract_revenue) || 0,
    totalOpex: Number(cached.total_opex) || 0,
    variableCosts,
    depreciation: Number(cached.depreciation) || 0,
    interestExpense: Number(cached.interest_expense) || 0,
    taxExpense: Number(cached.tax_expense) || 0,
    totalAR: Number(cached.total_ar) || 0,
    overdueAR: Number(cached.overdue_ar) || 0,
    totalAP: Number(cached.total_ap) || 0,
    inventory: Number(cached.inventory) || 0,
    workingCapital: Number(cached.working_capital) || 0,
    cashOnHand: Number(cached.cash_today) || 0,
    cashFlow: Number(cached.cash_flow) || 0,
    cashNext7Days: Number(cached.cash_today) || 0, // Will be recalculated if not in cache
    dailySales: Number(cached.daily_sales) || 0,
    dailyCogs: Number(cached.daily_cogs) || 0,
    dailyPurchases: Number(cached.daily_purchases) || 0,
    daysInPeriod: cached.days_in_period ?? 90,
    industryBenchmark: {
      dso: 35,
      dio: 45,
      dpo: 40,
      ccc: 40,
      grossMargin: 35,
      ebitdaMargin: 15,
    },
    dataStartDate: cached.date_range_start || startDate,
    dataEndDate: cached.date_range_end || endDate,
    lastUpdated: cached.calculated_at || new Date().toISOString(),
  };
}
