import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';

export function useInventoryStores() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-stores', tenantId],
    queryFn: async () => {
      // Fetch stores
      const storesRes = await buildSelectQuery('inv_stores', '*')
        .eq('is_active', true)
        .order('store_name')
        .limit(500);
      if (storesRes.error) throw storesRes.error;

      // Aggregate on_hand per store in DB instead of fetching 350k+ rows
      const { data: aggData, error: aggError } = await supabase
        .rpc('fn_store_on_hand_totals' as any, { p_tenant_id: tenantId });

      const onHandMap = new Map<string, number>();
      if (!aggError && aggData) {
        for (const row of aggData as any[]) {
          onHandMap.set(row.store_id, Number(row.total_on_hand) || 0);
        }
      }

      return ((storesRes.data || []) as any[]).map((s: any) => ({
        ...s,
        total_on_hand: onHandMap.get(s.id) || 0,
      }));
    },
    enabled: isReady,
  });
}
