import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface StoreHeatmapRow {
  store_id: string;
  store_name: string;
  region: string;
  broken: number;
  risk: number;
  watch: number;
  healthy: number;
  lost_revenue: number;
  cash_locked: number;
}

export function useStoreHeatmap() {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-heatmap', tenantId],
    queryFn: async () => {
      const { data, error } = await callRpc<StoreHeatmapRow[]>('fn_store_size_heatmap', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return (data || []) as StoreHeatmapRow[];
    },
    enabled: !!tenantId && isReady,
  });
}
