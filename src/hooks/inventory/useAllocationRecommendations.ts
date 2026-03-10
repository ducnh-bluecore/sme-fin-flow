import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { fetchAllPages } from './fetchAllPages';

export function useAllocationRecommendations(runId?: string) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-allocation-recs', tenantId, runId],
    queryFn: async () => {
      return fetchAllPages(() => {
        let q = buildSelectQuery('inv_allocation_recommendations', '*');
        if (runId) q = q.eq('run_id', runId);
        return q.order('priority', { ascending: true });
      });
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
