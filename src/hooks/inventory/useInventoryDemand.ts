import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { fetchAllPages } from './fetchAllPages';

export interface InventoryDemand {
  id: string;
  fc_id: string;
  store_id: string;
  sku: string | null;
  sales_velocity: number;
  avg_daily_sales: number;
  total_sold: number;
  trend: string | null;
  period_start: string;
  period_end: string;
}

export function useInventoryDemand(fcId?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-demand', tenantId, fcId],
    queryFn: async () => {
      return fetchAllPages<InventoryDemand>(() => {
        let q = buildSelectQuery('inv_state_demand', '*');
        if (fcId) q = q.eq('fc_id', fcId);
        return q;
      });
    },
    enabled: isReady && !!fcId,
  });
}
