import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface SizeHealthRow {
  id: string;
  product_id: string;
  store_id: string | null;
  as_of_date: string;
  size_health_score: number;
  curve_state: string;
  deviation_score: number;
  core_size_missing: boolean;
  shallow_depth_count: number;
}

export interface LostRevenueRow {
  id: string;
  product_id: string;
  as_of_date: string;
  lost_units_est: number;
  lost_revenue_est: number;
  driver: string;
}

export interface MarkdownRiskRow {
  id: string;
  product_id: string;
  as_of_date: string;
  markdown_risk_score: number;
  markdown_eta_days: number | null;
  reason: string;
}

export interface SizeTransferRow {
  id: string;
  product_id: string;
  size_code: string;
  source_store_id: string;
  dest_store_id: string;
  as_of_date: string;
  transfer_qty: number;
  transfer_score: number;
  source_on_hand: number;
  dest_on_hand: number;
  dest_velocity: number;
  estimated_revenue_gain: number;
  estimated_transfer_cost: number;
  net_benefit: number;
  reason: string;
}

export function useSizeIntelligence() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const sizeHealth = useQuery({
    queryKey: ['size-health', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('state_size_health_daily' as any)
        .is('store_id', null) // Network-wide only
        .order('as_of_date', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as SizeHealthRow[];
    },
    enabled: !!tenantId && isReady,
  });

  const storeHealth = useQuery({
    queryKey: ['store-size-health', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('state_size_health_daily' as any)
        .not('store_id', 'is', null) // Per-store only
        .order('size_health_score', { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as SizeHealthRow[];
    },
    enabled: !!tenantId && isReady,
  });

  const lostRevenue = useQuery({
    queryKey: ['lost-revenue', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('state_lost_revenue_daily' as any)
        .order('lost_revenue_est', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as LostRevenueRow[];
    },
    enabled: !!tenantId && isReady,
  });

  const markdownRisk = useQuery({
    queryKey: ['markdown-risk', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('state_markdown_risk_daily' as any)
        .order('markdown_risk_score', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as MarkdownRiskRow[];
    },
    enabled: !!tenantId && isReady,
  });

  const sizeTransfers = useQuery({
    queryKey: ['size-transfers', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('state_size_transfer_daily' as any)
        .order('transfer_score', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as SizeTransferRow[];
    },
    enabled: !!tenantId && isReady,
  });

  // Aggregated summary
  const healthRows = sizeHealth.data || [];
  const lostRows = lostRevenue.data || [];
  const riskRows = markdownRisk.data || [];
  const transferRows = sizeTransfers.data || [];

  const summary = {
    avgHealthScore: healthRows.length > 0
      ? healthRows.reduce((s, r) => s + r.size_health_score, 0) / healthRows.length
      : null,
    brokenCount: healthRows.filter(r => r.curve_state === 'broken').length,
    riskCount: healthRows.filter(r => r.curve_state === 'risk').length,
    watchCount: healthRows.filter(r => r.curve_state === 'watch').length,
    healthyCount: healthRows.filter(r => r.curve_state === 'healthy').length,
    totalLostRevenue: lostRows.reduce((s, r) => s + r.lost_revenue_est, 0),
    totalLostUnits: lostRows.reduce((s, r) => s + r.lost_units_est, 0),
    highMarkdownRiskCount: riskRows.filter(r => r.markdown_risk_score >= 60).length,
    criticalMarkdownCount: riskRows.filter(r => r.markdown_risk_score >= 80).length,
    transferOpportunities: transferRows.length,
    totalTransferNetBenefit: transferRows.reduce((s, r) => s + r.net_benefit, 0),
  };

  // Maps for quick lookup by product_id
  const healthMap = new Map<string, SizeHealthRow>();
  for (const r of healthRows) healthMap.set(r.product_id, r);

  const lostRevenueMap = new Map<string, LostRevenueRow>();
  for (const r of lostRows) lostRevenueMap.set(r.product_id, r);

  const markdownRiskMap = new Map<string, MarkdownRiskRow>();
  for (const r of riskRows) markdownRiskMap.set(r.product_id, r);

  return {
    sizeHealth,
    storeHealth,
    lostRevenue,
    markdownRisk,
    sizeTransfers,
    summary,
    healthMap,
    lostRevenueMap,
    markdownRiskMap,
    isLoading: sizeHealth.isLoading || lostRevenue.isLoading || markdownRisk.isLoading || sizeTransfers.isLoading,
  };
}
