import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface SizeIntegrityRecord {
  id: string;
  tenant_id: string;
  snapshot_date: string;
  fc_id: string;
  store_id: string | null;
  total_sizes_expected: number;
  total_sizes_available: number;
  is_full_size_run: boolean;
  missing_sizes: any;
  created_at: string;
}

export function useSizeIntegrity(fcId?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-size-integrity', tenantId, fcId],
    queryFn: async () => {
      let query = buildSelectQuery('inv_state_size_integrity', '*');
      if (fcId) query = query.eq('fc_id', fcId);
      const { data, error } = await query.order('snapshot_date', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as unknown as SizeIntegrityRecord[];
    },
    enabled: isReady,
  });
}
