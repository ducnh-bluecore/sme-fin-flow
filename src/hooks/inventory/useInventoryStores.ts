import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export function useInventoryStores() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-stores', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_stores', '*')
        .eq('is_active', true)
        .order('store_name')
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as any[];
    },
    enabled: isReady,
  });
}
