import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { fetchAllPages } from './fetchAllPages';

export interface InventoryPosition {
  id: string;
  fc_id: string;
  store_id: string;
  sku: string | null;
  on_hand: number;
  reserved: number;
  available: number | null;
  in_transit: number;
  safety_stock: number;
  weeks_of_cover: number | null;
  snapshot_date: string;
}

export function useInventoryPositions(fcId?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-positions', tenantId, fcId],
    queryFn: async () => {
      return fetchAllPages<InventoryPosition>(() => {
        let q = buildSelectQuery('inv_state_positions', '*');
        if (fcId) q = q.eq('fc_id', fcId);
        return q;
      });
    },
    enabled: isReady && !!fcId,
  });
}
