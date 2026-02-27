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

      // Aggregate on_hand + inventory value per store in DB
      const { data: valData, error: valError } = await supabase
        .rpc('fn_store_inventory_value' as any, { p_tenant_id: tenantId });

      const valMap = new Map<string, { total_on_hand: number; total_value: number; avg_unit_cost: number }>();
      if (!valError && valData) {
        for (const row of valData as any[]) {
          valMap.set(row.store_id, {
            total_on_hand: Number(row.total_on_hand) || 0,
            total_value: Number(row.total_value) || 0,
            avg_unit_cost: Number(row.avg_unit_cost) || 0,
          });
        }
      }

      return ((storesRes.data || []) as any[]).map((s: any) => {
        const val = valMap.get(s.id);
        return {
          ...s,
          total_on_hand: val?.total_on_hand || 0,
          inventory_value: val?.total_value || 0,
          avg_unit_cost: val?.avg_unit_cost || 0,
        };
      });
    },
    enabled: isReady,
  });
}
