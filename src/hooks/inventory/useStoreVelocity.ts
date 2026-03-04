import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface StoreVelocityRow {
  store_id: string;
  store_name: string;
  on_hand: number;
  avg_daily_sales: number;
  total_sold: number;
  sales_velocity: number;
}

export function useStoreVelocity(fcId?: string) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-velocity', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await callRpc<StoreVelocityRow[]>('fn_store_velocity_for_fc', {
        p_tenant_id: tenantId!,
        p_fc_id: fcId!,
      });
      if (error) throw error;
      return (data || []) as StoreVelocityRow[];
    },
    enabled: isReady && !!tenantId && !!fcId,
    staleTime: 60 * 1000,
  });
}
