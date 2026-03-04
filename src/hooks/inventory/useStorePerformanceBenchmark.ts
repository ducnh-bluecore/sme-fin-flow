import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface StoreBenchmark {
  store: {
    avg_daily_revenue: number;
    avg_daily_txn: number;
    avg_aov: number;
    avg_daily_customers: number;
    total_revenue: number;
    total_txn: number;
    days_counted: number;
    revenue_per_customer: number;
  };
  chain_avg: {
    avg_daily_revenue: number;
    avg_daily_txn: number;
    avg_aov: number;
    avg_daily_customers: number;
    store_count: number;
    revenue_per_customer: number;
  };
  same_tier_avg: {
    avg_daily_revenue: number;
    avg_daily_txn: number;
    avg_aov: number;
    avg_daily_customers: number;
    store_count: number;
    revenue_per_customer: number;
  };
  store_tier: string;
  monthly_gap: Array<{
    month: string;
    actual_revenue: number;
    target_revenue: number | null;
    achievement_pct: number | null;
    total_txn: number;
    avg_aov: number;
    total_customers: number;
  }>;
  period: { from: string; to: string };
}

export function useStorePerformanceBenchmark(storeId: string | null, fromDate?: string, toDate?: string, lookbackDays = 30) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-benchmark', tenantId, storeId, fromDate, toDate, lookbackDays],
    queryFn: async () => {
      const params: any = { p_tenant_id: tenantId, p_store_id: storeId };
      if (fromDate) {
        params.p_from_date = fromDate;
      } else {
        // Default: lookback N days instead of just current month
        const d = new Date();
        d.setDate(d.getDate() - lookbackDays);
        params.p_from_date = d.toISOString().split('T')[0];
      }
      if (toDate) params.p_to_date = toDate;

      const { data, error } = await supabase.rpc('fn_store_performance_benchmark' as any, params);
      if (error) throw error;
      return data as unknown as StoreBenchmark;
    },
    enabled: isReady && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}
