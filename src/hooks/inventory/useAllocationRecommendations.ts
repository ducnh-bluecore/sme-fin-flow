import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

async function fetchAllPages(buildQuery: () => any) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await buildQuery()
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    allData = allData.concat(rows);
    hasMore = rows.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return allData;
}

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
