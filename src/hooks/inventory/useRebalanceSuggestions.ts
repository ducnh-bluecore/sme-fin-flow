import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface RebalanceSuggestion {
  id: string;
  run_id: string;
  transfer_type: 'push' | 'lateral' | 'recall';
  fc_id: string;
  fc_name: string;
  from_location: string;
  from_location_name: string;
  from_location_type: string;
  to_location: string;
  to_location_name: string;
  to_location_type: string;
  qty: number;
  reason: string;
  from_weeks_cover: number;
  to_weeks_cover: number;
  balanced_weeks_cover: number;
  priority: string;
  potential_revenue_gain: number;
  logistics_cost_estimate: number;
  net_benefit: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export function useRebalanceSuggestions(runId?: string, transferType?: 'push' | 'lateral' | 'recall') {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-rebalance-suggestions', tenantId, runId, transferType],
    queryFn: async () => {
      let query = buildSelectQuery('inv_rebalance_suggestions', '*');
      
      if (runId) {
        query = query.eq('run_id', runId);
      }
      if (transferType) {
        query = query.eq('transfer_type', transferType);
      }
      
    // Paginate to avoid 1000-row Supabase limit
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const paginated = buildSelectQuery('inv_rebalance_suggestions', '*');
        let pq = runId ? paginated.eq('run_id', runId) : paginated;
        if (transferType) pq = pq.eq('transfer_type', transferType);
        const { data, error } = await pq
          .order('priority', { ascending: true })
          .order('net_benefit', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = data || [];
        allData = allData.concat(rows);
        hasMore = rows.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }
      return allData as unknown as RebalanceSuggestion[];
    },
    enabled: isReady,
  });
}

export function useLatestRebalanceRun() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-rebalance-latest-run', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_rebalance_runs', '*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { id: string; created_at: string; status: string; total_suggestions: number; total_units: number; push_units: number; lateral_units: number } | null;
    },
    enabled: isReady,
  });
}
