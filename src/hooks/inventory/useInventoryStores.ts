import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';

export function useInventoryStores() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-stores', tenantId],
    queryFn: async () => {
      // Fetch stores and position aggregates in parallel
      const [storesRes, posRes] = await Promise.all([
        buildSelectQuery('inv_stores', '*')
          .eq('is_active', true)
          .order('store_name')
          .limit(500),
        buildSelectQuery('inv_state_positions', 'store_id, on_hand')
          .limit(50000),
      ]);
      if (storesRes.error) throw storesRes.error;
      
      // Aggregate on_hand per store
      const onHandMap = new Map<string, number>();
      for (const p of (posRes.data || []) as any[]) {
        onHandMap.set(p.store_id, (onHandMap.get(p.store_id) || 0) + (p.on_hand || 0));
      }

      return ((storesRes.data || []) as any[]).map((s: any) => ({
        ...s,
        total_on_hand: onHandMap.get(s.id) || 0,
      }));
    },
    enabled: isReady,
  });
}
