import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches pre-aggregated summary data from DB views.
 * Bypasses 1000-row Supabase limit by computing in DB.
 */
export function useSizeIntelligenceSummary() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  const healthSummary = useQuery({
    queryKey: ['si-health-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_size_intelligence_summary' as any)
        .order('as_of_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] || null) as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const lostRevSummary = useQuery({
    queryKey: ['si-lost-rev-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_lost_revenue_summary' as any)
        .order('as_of_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] || null) as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const mdRiskSummary = useQuery({
    queryKey: ['si-md-risk-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_markdown_risk_summary' as any)
        .order('as_of_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] || null) as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const transferByDest = useQuery({
    queryKey: ['si-transfer-by-dest', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_transfer_by_destination' as any)
        .order('total_net_benefit', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const cashLockSummary = useQuery({
    queryKey: ['si-cash-lock-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_cash_lock_summary' as any)
        .order('as_of_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] || null) as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const cashLockUnits = useQuery({
    queryKey: ['si-cash-lock-units', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_cash_lock_units', { p_tenant_id: tenantId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return Number(row?.affected_units || 0);
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const marginLeakSummary = useQuery({
    queryKey: ['si-margin-leak-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('v_margin_leak_summary' as any)
        .order('as_of_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] || null) as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  // Build summary from DB-aggregated data
  const hs = healthSummary.data;
  const lr = lostRevSummary.data;
  const md = mdRiskSummary.data;
  const cl = cashLockSummary.data;
  const ml = marginLeakSummary.data;
  const tDest = transferByDest.data || [];

  const summary = {
    avgHealthScore: hs?.avg_health_score ?? null,
    totalProducts: hs?.total_products ?? 0,
    brokenCount: hs?.broken_count ?? 0,
    riskCount: hs?.risk_count ?? 0,
    watchCount: hs?.watch_count ?? 0,
    healthyCount: hs?.healthy_count ?? 0,
    coreMissingCount: hs?.core_missing_count ?? 0,
    totalLostRevenue: lr?.total_lost_revenue ?? 0,
    totalLostUnits: lr?.total_lost_units ?? 0,
    highMarkdownRiskCount: md?.high_risk_count ?? 0,
    criticalMarkdownCount: md?.critical_count ?? 0,
    totalCashLocked: cl?.total_cash_locked ?? 0,
    totalInventoryValue: cl?.total_inventory_value ?? 0,
    affectedProducts: cl?.affected_products ?? 0,
    affectedUnits: cashLockUnits.data ?? 0,
    totalMarginLeak: ml?.total_margin_leak ?? 0,
    marginLeakBySizeBreak: ml?.leak_by_size_break ?? 0,
    marginLeakByMarkdown: ml?.leak_by_markdown ?? 0,
    transferOpportunities: tDest.reduce((s: number, d: any) => s + (d.transfer_count || 0), 0),
    totalTransferNetBenefit: tDest.reduce((s: number, d: any) => s + (d.total_net_benefit || 0), 0),
  };

  return {
    summary,
    transferByDest: tDest,
    isLoading: healthSummary.isLoading || lostRevSummary.isLoading || mdRiskSummary.isLoading || cashLockSummary.isLoading || marginLeakSummary.isLoading,
  };
}
