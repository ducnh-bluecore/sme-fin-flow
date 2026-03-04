import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface ManualTransfer {
  id: string;
  fc_id: string;
  fc_name: string | null;
  from_store_name: string | null;
  to_store_name: string | null;
  qty: number;
  reason: string | null;
  status: string;
  created_at: string;
}

export function useManualTransfers(status?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['manual-transfers', tenantId, status],
    queryFn: async () => {
      let query = buildSelectQuery('inv_manual_transfers' as any, '*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ManualTransfer[];
    },
    enabled: isReady,
  });
}
