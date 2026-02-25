import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface StoreTopFC {
  fc_id: string;
  fc_code: string;
  fc_name: string | null;
  category: string | null;
  collection_id: string | null;
  collection_name: string | null;
  is_core_hero: boolean;
  total_sold: number;
  on_hand: number;
  in_transit: number;
  weeks_of_cover: number | null;
}

export function useStoreTopFC(storeId: string | null, limit = 15) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery<StoreTopFC[]>({
    queryKey: ['inv-store-top-fc', tenantId, storeId, limit],
    queryFn: async () => {
      if (!storeId || !tenantId) return [];
      const { data, error } = await supabase.rpc('fn_store_top_fc' as any, {
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data || []) as unknown as StoreTopFC[];
    },
    enabled: !!storeId && !!tenantId,
  });
}
