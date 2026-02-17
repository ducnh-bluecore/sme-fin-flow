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

export interface CashLockRow {
  id: string;
  product_id: string;
  as_of_date: string;
  inventory_value: number;
  cash_locked_value: number;
  locked_pct: number;
  expected_release_days: number | null;
  lock_driver: string;
}

export interface MarginLeakRow {
  id: string;
  product_id: string;
  as_of_date: string;
  margin_leak_value: number;
  leak_driver: string;
  leak_detail: any;
  cumulative_leak_30d: number;
}

export interface EvidencePackRow {
  id: string;
  product_id: string;
  as_of_date: string;
  evidence_type: string;
  severity: string;
  summary: string;
  data_snapshot: any;
  source_tables: string[];
  created_at: string;
}

/**
 * Provides Maps for drill-down lookups and transfer/evidence data.
 * Summary logic is DEPRECATED — use useSizeIntelligenceSummary instead.
 */
export function useSizeIntelligence() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

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
    staleTime: 5 * 60 * 1000,
  });

  const evidencePacks = useQuery({
    queryKey: ['evidence-packs', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('si_evidence_packs' as any)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as EvidencePackRow[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const evidencePackMap = new Map<string, EvidencePackRow>();
  for (const r of (evidencePacks.data || [])) evidencePackMap.set(r.product_id, r);

  return {
    sizeTransfers,
    evidencePacks,
    evidencePackMap,
    isLoading: sizeTransfers.isLoading,
  };
}
