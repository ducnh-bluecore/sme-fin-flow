/**
 * useStoreMonthlyRevenue - Fetch monthly revenue aggregation for stores
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface StoreMonthlyRevenue {
  store_id: string;
  month_value: string;
  total_revenue: number;
  total_transactions: number;
  total_customers: number;
  avg_aov: number;
  days_with_data: number;
}

export function useStoreMonthlyRevenue(storeId?: string | null, months = 6) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-monthly-revenue', tenantId, storeId, months],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.rpc('fn_store_monthly_revenue' as any, {
        p_tenant_id: tenantId,
        p_store_id: storeId || null,
        p_months: months,
      });

      if (error) {
        console.error('[useStoreMonthlyRevenue]', error);
        return [];
      }
      return (data as unknown as StoreMonthlyRevenue[]) || [];
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all stores' monthly revenue for ranking
 */
export function useAllStoresMonthlyRevenue(months = 6) {
  return useStoreMonthlyRevenue(undefined, months);
}
