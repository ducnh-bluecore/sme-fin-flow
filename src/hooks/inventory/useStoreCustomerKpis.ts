import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface StoreCustomerKpis {
  customerCount: number;
  totalTransactions: number;
  totalRevenue: number;
  avgOrderValue: number;
  itemsPerTransaction: number;
  returnRate: number;
  daysCounted: number;
  periodStart: string | null;
  periodEnd: string | null;
  dailyAvgCustomers: number;
  dailyAvgRevenue: number;
  // Deltas (% change vs previous period)
  deltaCustomers: number | null;
  deltaAov: number | null;
  deltaTransactions: number | null;
  deltaRevenue: number | null;
  hasPreviousPeriod: boolean;
}

export function useStoreCustomerKpis(storeId: string | null, days = 30) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-customer-kpis', tenantId, storeId, days],
    queryFn: async (): Promise<StoreCustomerKpis | null> => {
      if (!tenantId || !storeId) return null;

      const { data, error } = await supabase.rpc('fn_store_customer_kpis_with_delta' as any, {
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_days: days,
      });

      if (error) {
        console.error('[useStoreCustomerKpis] Error:', error);
        return null;
      }

      const d = data as any;
      if (!d) return null;

      return {
        customerCount: d.customer_count || 0,
        totalTransactions: d.total_transactions || 0,
        totalRevenue: d.total_revenue || 0,
        avgOrderValue: d.avg_order_value || 0,
        itemsPerTransaction: d.items_per_transaction || 0,
        returnRate: d.return_rate || 0,
        daysCounted: d.days_counted || 0,
        periodStart: d.period_start || null,
        periodEnd: d.period_end || null,
        dailyAvgCustomers: d.daily_avg_customers || 0,
        dailyAvgRevenue: d.daily_avg_revenue || 0,
        deltaCustomers: d.delta_customers ?? null,
        deltaAov: d.delta_aov ?? null,
        deltaTransactions: d.delta_transactions ?? null,
        deltaRevenue: d.delta_revenue ?? null,
        hasPreviousPeriod: d.has_previous_period || false,
      };
    },
    enabled: !!tenantId && isReady && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}
