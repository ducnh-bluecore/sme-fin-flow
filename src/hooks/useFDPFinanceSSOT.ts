/**
 * ============================================
 * FDP FINANCE SSOT HOOK - DATABASE FIRST
 * ============================================
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

// ═══════════════════════════════════════════════════════════════════
// EXPLICIT METRIC CODES - NO AMBIGUITY
// ═══════════════════════════════════════════════════════════════════

export const FDP_METRIC_CODES = {
  GROSS_REVENUE: 'GROSS_REVENUE',
  NET_REVENUE: 'NET_REVENUE',
  CM1: 'CM1',
  CM2: 'CM2',
  ROAS_REVENUE: 'ROAS_REVENUE',
  ROAS_CONTRIBUTION: 'ROAS_CONTRIBUTION',
  AOV: 'AOV',
  CAC: 'CAC',
  LTV: 'LTV',
  LTV_CAC_RATIO: 'LTV_CAC_RATIO',
  CASH_BALANCE: 'CASH_BALANCE',
  CASH_RUNWAY_MONTHS: 'CASH_RUNWAY_MONTHS',
  DSO: 'DSO',
  DPO: 'DPO',
  DIO: 'DIO',
  CCC: 'CCC',
} as const;

export type FDPMetricCode = keyof typeof FDP_METRIC_CODES;

// ═══════════════════════════════════════════════════════════════════
// TYPES WITH REQUIRED EVIDENCE
// ═══════════════════════════════════════════════════════════════════

export interface FDPMetricValue {
  code: FDPMetricCode;
  value: number;
  unit: 'VND' | 'percent' | 'days' | 'ratio' | 'count';
  as_of_timestamp: string;
  source_ref: string;
  quality: 'complete' | 'partial' | 'stale' | 'estimated';
}

export interface FDPFinanceSSOT {
  tenant_id: string;
  period_start: string;
  period_end: string;
  as_of_timestamp: string;
  source_ref: 'central_metrics_snapshots' | 'finance_monthly_summary' | 'fdp_daily_metrics';
  is_stale: boolean;
  
  gross_revenue: FDPMetricValue;
  net_revenue: FDPMetricValue;
  cm1: FDPMetricValue;
  cm1_percent: FDPMetricValue;
  cm2: FDPMetricValue;
  cm2_percent: FDPMetricValue;
  marketing_spend: FDPMetricValue;
  roas_revenue: FDPMetricValue;
  roas_contribution: FDPMetricValue;
  aov: FDPMetricValue;
  cac: FDPMetricValue;
  ltv: FDPMetricValue;
  ltv_cac_ratio: FDPMetricValue;
  cash_balance: FDPMetricValue;
  cash_runway_months: FDPMetricValue;
  dso: FDPMetricValue;
  dpo: FDPMetricValue;
  dio: FDPMetricValue;
  ccc: FDPMetricValue;
  total_ar: FDPMetricValue;
  overdue_ar: FDPMetricValue;
  total_ap: FDPMetricValue;
  overdue_ap: FDPMetricValue;
  total_orders: FDPMetricValue;
  total_customers: FDPMetricValue;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HOOK - FETCH ONLY, NO COMPUTATION
// ═══════════════════════════════════════════════════════════════════

const STALE_THRESHOLD_MINUTES = 60;

export function useFDPFinanceSSOT() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['fdp-finance-ssot', tenantId],
    queryFn: async (): Promise<FDPFinanceSSOT | null> => {
      if (!tenantId) return null;
      
      let query = client
        .from('central_metrics_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data: snapshot, error } = await query.maybeSingle();
      
      if (error) {
        console.error('[useFDPFinanceSSOT] Fetch error:', error);
        throw error;
      }
      
      if (!snapshot) {
        const { data: newSnapshotId, error: computeError } = await client
          .rpc('compute_central_metrics_snapshot', { p_tenant_id: tenantId });
        
        if (computeError) {
          console.error('[useFDPFinanceSSOT] Compute error:', computeError);
          return null;
        }
        
        const { data: freshSnapshot } = await client
          .from('central_metrics_snapshots')
          .select('*')
          .eq('id', newSnapshotId)
          .single();
        
        if (!freshSnapshot) return null;
        return mapSnapshotToSSOT(freshSnapshot, tenantId);
      }
      
      const snapshotAge = Date.now() - new Date(snapshot.snapshot_at).getTime();
      const isStale = snapshotAge > STALE_THRESHOLD_MINUTES * 60 * 1000;
      
      if (isStale) {
        client.rpc('compute_central_metrics_snapshot', { p_tenant_id: tenantId })
          .then(() => console.log('[useFDPFinanceSSOT] Background refresh completed'));
      }
      
      return mapSnapshotToSSOT(snapshot, tenantId, isStale);
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ═══════════════════════════════════════════════════════════════════
// MUTATION - FORCE REFRESH
// ═══════════════════════════════════════════════════════════════════

export function useRefreshFDPFinance() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await client
        .rpc('compute_central_metrics_snapshot', { p_tenant_id: tenantId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdp-finance-ssot', tenantId] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPER - Map DB row to SSOT structure (NO CALCULATIONS)
// ═══════════════════════════════════════════════════════════════════

function mapSnapshotToSSOT(
  raw: Record<string, unknown>,
  tenantId: string,
  isStale: boolean = false
): FDPFinanceSSOT {
  const asOf = raw.snapshot_at as string;
  const sourceRef = 'central_metrics_snapshots';
  const quality = isStale ? 'stale' : 'complete';
  
  const metric = (
    code: FDPMetricCode,
    value: unknown,
    unit: FDPMetricValue['unit']
  ): FDPMetricValue => ({
    code,
    value: Number(value) || 0,
    unit,
    as_of_timestamp: asOf,
    source_ref: sourceRef,
    quality,
  });
  
  const netRevenue = Number(raw.net_revenue) || 0;
  const cm2 = Number(raw.contribution_margin) || 0;
  const marketingSpend = Number(raw.total_marketing_spend) || 0;
  const roasRevenue = marketingSpend > 0 ? netRevenue / marketingSpend : 0;
  const roasContribution = marketingSpend > 0 ? cm2 / marketingSpend : 0;
  
  return {
    tenant_id: tenantId,
    period_start: raw.period_start as string || '',
    period_end: raw.period_end as string || '',
    as_of_timestamp: asOf,
    source_ref: sourceRef,
    is_stale: isStale,
    
    gross_revenue: metric('GROSS_REVENUE', netRevenue, 'VND'),
    net_revenue: metric('NET_REVENUE', raw.net_revenue, 'VND'),
    cm1: metric('CM1', raw.gross_profit, 'VND'),
    cm1_percent: metric('CM1', raw.gross_margin_percent, 'percent'),
    cm2: metric('CM2', raw.contribution_margin, 'VND'),
    cm2_percent: metric('CM2', raw.contribution_margin_percent, 'percent'),
    marketing_spend: metric('CAC', raw.total_marketing_spend, 'VND'),
    roas_revenue: metric('ROAS_REVENUE', roasRevenue, 'ratio'),
    roas_contribution: metric('ROAS_CONTRIBUTION', roasContribution, 'ratio'),
    aov: metric('AOV', raw.avg_order_value, 'VND'),
    cac: metric('CAC', raw.cac, 'VND'),
    ltv: metric('LTV', raw.ltv, 'VND'),
    ltv_cac_ratio: metric('LTV_CAC_RATIO', raw.ltv_cac_ratio, 'ratio'),
    cash_balance: metric('CASH_BALANCE', raw.cash_today, 'VND'),
    cash_runway_months: metric('CASH_RUNWAY_MONTHS', raw.cash_runway_months, 'count'),
    dso: metric('DSO', raw.dso, 'days'),
    dpo: metric('DPO', raw.dpo, 'days'),
    dio: metric('DIO', raw.dio, 'days'),
    ccc: metric('CCC', raw.ccc, 'days'),
    total_ar: metric('DSO', raw.total_ar, 'VND'),
    overdue_ar: metric('DSO', raw.overdue_ar, 'VND'),
    total_ap: metric('DPO', raw.total_ap, 'VND'),
    overdue_ap: metric('DPO', raw.overdue_ap, 'VND'),
    total_orders: metric('AOV', raw.total_orders, 'count'),
    total_customers: metric('CAC', raw.total_customers, 'count'),
  };
}

// ═══════════════════════════════════════════════════════════════════
// QUICK ACCESS HOOKS
// ═══════════════════════════════════════════════════════════════════

export function useFDPMetricValue(code: FDPMetricCode) {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  if (!data) return { value: null, isLoading, error };
  
  const metricMap: Record<FDPMetricCode, FDPMetricValue | undefined> = {
    GROSS_REVENUE: data.gross_revenue,
    NET_REVENUE: data.net_revenue,
    CM1: data.cm1,
    CM2: data.cm2,
    ROAS_REVENUE: data.roas_revenue,
    ROAS_CONTRIBUTION: data.roas_contribution,
    AOV: data.aov,
    CAC: data.cac,
    LTV: data.ltv,
    LTV_CAC_RATIO: data.ltv_cac_ratio,
    CASH_BALANCE: data.cash_balance,
    CASH_RUNWAY_MONTHS: data.cash_runway_months,
    DSO: data.dso,
    DPO: data.dpo,
    DIO: data.dio,
    CCC: data.ccc,
  };
  
  return {
    value: metricMap[code] || null,
    as_of_timestamp: data.as_of_timestamp,
    source_ref: data.source_ref,
    isLoading,
    error,
  };
}

export function useFDPRevenueMetrics() {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  return {
    grossRevenue: data?.gross_revenue,
    netRevenue: data?.net_revenue,
    cm1: data?.cm1,
    cm1Percent: data?.cm1_percent,
    cm2: data?.cm2,
    cm2Percent: data?.cm2_percent,
    asOfTimestamp: data?.as_of_timestamp,
    isLoading,
    error,
  };
}

export function useFDPMarketingMetrics() {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  return {
    marketingSpend: data?.marketing_spend,
    roasRevenue: data?.roas_revenue,
    roasContribution: data?.roas_contribution,
    cac: data?.cac,
    ltv: data?.ltv,
    ltvCacRatio: data?.ltv_cac_ratio,
    asOfTimestamp: data?.as_of_timestamp,
    isLoading,
    error,
  };
}
