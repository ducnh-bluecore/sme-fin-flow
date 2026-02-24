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

      // Paginated fetch for positions to avoid 1000-row limit
      const PAGE_SIZE = 1000;
      const onHandMap = new Map<string, number>();
      let from = 0;

      while (true) {
        const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, on_hand')
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const p of data as any[]) {
          onHandMap.set(p.store_id, (onHandMap.get(p.store_id) || 0) + (p.on_hand || 0));
        }
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return ((storesRes.data || []) as any[]).map((s: any) => ({
        ...s,
        total_on_hand: onHandMap.get(s.id) || 0,
      }));
    },
    enabled: isReady,
  });
}
