import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useState, useCallback } from 'react';

export interface SizeHealthGroupSummary {
  curve_state: string;
  style_count: number;
  avg_health_score: number;
  avg_deviation: number;
  core_missing_count: number;
  total_lost_revenue: number;
  total_lost_units: number;
  total_cash_locked: number;
  total_margin_leak: number;
  high_md_risk_count: number;
}

export interface SizeHealthDetailRow {
  product_id: string;
  product_name: string;
  size_health_score: number;
  curve_state: string;
  deviation_score: number;
  core_size_missing: boolean;
  lost_revenue_est: number;
  lost_units_est: number;
  cash_locked_value: number;
  margin_leak_value: number;
  markdown_risk_score: number;
  markdown_eta_days: number | null;
  product_created_date: string | null;
  total_on_hand: number;
}

const STATE_ORDER = ['broken', 'risk', 'watch', 'healthy', 'out_of_stock'] as const;
const PAGE_SIZE = 50;

export function useSizeHealthGroups() {
  const { buildQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();
  const [detailCache, setDetailCache] = useState<Record<string, SizeHealthDetailRow[]>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Summary query - always load
  const summaryQuery = useQuery({
    queryKey: ['si-health-by-state', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_size_health_by_state' as any)
        .select('*');
      if (error) throw error;
      const rows = (data || []) as unknown as SizeHealthGroupSummary[];
      // Sort by severity order
      return STATE_ORDER.map(state => 
        rows.find(r => r.curve_state === state)
      ).filter(Boolean) as SizeHealthGroupSummary[];
    },
    enabled: !!tenantId && isReady,
  });

  // Load details for a specific group
  const loadGroupDetails = useCallback(async (curveState: string, loadMore = false) => {
    if (!tenantId) return;
    
    const existing = detailCache[curveState] || [];
    if (!loadMore && existing.length > 0) return; // Already cached
    
    const offset = loadMore ? existing.length : 0;
    
    setLoadingStates(prev => ({ ...prev, [curveState]: true }));
    
    try {
      const { data, error } = await callRpc<SizeHealthDetailRow[]>('fn_size_health_details', {
        p_tenant_id: tenantId,
        p_curve_state: curveState,
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_sort_by: 'lost_revenue',
        p_created_after: null,
      });
      
      if (error) throw error;
      
      const newRows = (data || []) as SizeHealthDetailRow[];
      setDetailCache(prev => ({
        ...prev,
        [curveState]: loadMore ? [...(prev[curveState] || []), ...newRows] : newRows,
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [curveState]: false }));
    }
  }, [tenantId, callRpc, detailCache]);

  return {
    groups: summaryQuery.data || [],
    isLoading: summaryQuery.isLoading,
    detailCache,
    loadingStates,
    loadGroupDetails,
    PAGE_SIZE,
  };
}
