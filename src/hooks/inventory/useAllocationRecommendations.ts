import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export function useAllocationRecommendations(runId?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-allocation-recs', tenantId, runId],
    queryFn: async () => {
      let query = buildSelectQuery('inv_allocation_recommendations', '*');
      if (runId) query = query.eq('run_id', runId);
      const { data, error } = await query.order('priority', { ascending: true }).limit(500);
      if (error) throw error;
      return (data || []) as unknown as any[];
    },
    enabled: isReady,
  });
}

export function useLatestAllocationRun() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-allocation-latest-run', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_allocation_runs', '*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as any;
    },
    enabled: isReady,
  });
}
