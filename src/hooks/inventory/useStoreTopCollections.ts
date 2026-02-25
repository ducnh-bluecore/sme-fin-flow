import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface StoreTopCollection {
  collection_id: string;
  collection_code: string;
  collection_name: string;
  season: string | null;
  is_new_collection: boolean;
  total_sold: number;
  fc_count: number;
  on_hand: number;
  in_transit: number;
}

export function useStoreTopCollections(storeId: string | null, limit = 10) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery<StoreTopCollection[]>({
    queryKey: ['inv-store-top-collections', tenantId, storeId, limit],
    queryFn: async () => {
      if (!storeId || !tenantId) return [];
      const { data, error } = await supabase.rpc('fn_store_top_collections' as any, {
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data || []) as unknown as StoreTopCollection[];
    },
    enabled: !!storeId && !!tenantId,
  });
}
