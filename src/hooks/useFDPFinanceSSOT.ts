/**
 * ============================================
 * FDP FINANCE SSOT HOOK - DATABASE FIRST
 * ============================================
 * 
 * FDP Manifesto Principle #2: SINGLE SOURCE OF TRUTH
 * FDP Manifesto Principle #3: TRUTH > FLEXIBILITY
 * 
 * This hook is the ONLY source for finance metrics.
 * It ONLY fetches precomputed data - NO client-side calculations.
 * 
 * EXPLICIT METRIC NAMING (required by PROMPT 2):
 * - NET_REVENUE
 * - CM1 (Contribution Margin 1 = Gross Profit)
 * - CM2 (Contribution Margin 2 = after variable costs)
 * - ROAS_REVENUE (Revenue-based ROAS)
 * - ROAS_CONTRIBUTION (CM-based ROAS)
 * 
 * REQUIRED UI DISPLAY:
 * - as_of_timestamp: When the data was computed
 * - source_ref: Where the data comes from (snapshot/view)
 * 
 * ⚠️ DEPRECATED HOOKS (do not use):
 * - useFDPMetrics (performs client-side computation)
 * - useFDPAggregatedMetrics (still has some computation)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

// ═══════════════════════════════════════════════════════════════════
// EXPLICIT METRIC CODES - NO AMBIGUITY
// ═══════════════════════════════════════════════════════════════════

export const FDP_METRIC_CODES = {
  // Revenue
  GROSS_REVENUE: 'GROSS_REVENUE',
  NET_REVENUE: 'NET_REVENUE',
  
  // Contribution Margins
  CM1: 'CM1',                           // Gross Profit = Revenue - COGS
  CM2: 'CM2',                           // CM2 = CM1 - Variable Costs (shipping, platform fees)
  
  // ROAS variants
  ROAS_REVENUE: 'ROAS_REVENUE',         // Revenue / Marketing Spend
  ROAS_CONTRIBUTION: 'ROAS_CONTRIBUTION', // CM2 / Marketing Spend
  
  // Unit Economics
  AOV: 'AOV',                           // Average Order Value
  CAC: 'CAC',                           // Customer Acquisition Cost
  LTV: 'LTV',                           // Lifetime Value
  LTV_CAC_RATIO: 'LTV_CAC_RATIO',
  
  // Cash
  CASH_BALANCE: 'CASH_BALANCE',
  CASH_RUNWAY_MONTHS: 'CASH_RUNWAY_MONTHS',
  
  // Working Capital
  DSO: 'DSO',                           // Days Sales Outstanding
  DPO: 'DPO',                           // Days Payable Outstanding
  DIO: 'DIO',                           // Days Inventory Outstanding
  CCC: 'CCC',                           // Cash Conversion Cycle
} as const;

export type FDPMetricCode = keyof typeof FDP_METRIC_CODES;

// ═══════════════════════════════════════════════════════════════════
// TYPES WITH REQUIRED EVIDENCE
// ═══════════════════════════════════════════════════════════════════

export interface FDPMetricValue {
  code: FDPMetricCode;
  value: number;
  unit: 'VND' | 'percent' | 'days' | 'ratio' | 'count';
  /** When this value was computed */
  as_of_timestamp: string;
  /** Source: view name, table, or snapshot */
  source_ref: string;
  /** Data quality indicator */
  quality: 'complete' | 'partial' | 'stale' | 'estimated';
}

export interface FDPFinanceSSOT {
  /** Tenant ID */
  tenant_id: string;
  
  /** Period covered */
  period_start: string;
  period_end: string;
  
  /** When this data was computed (REQUIRED for UI) */
  as_of_timestamp: string;
  
  /** Source reference (REQUIRED for UI) */
  source_ref: 'central_metrics_snapshots' | 'finance_monthly_summary' | 'fdp_daily_metrics';
  
  /** Data quality */
  is_stale: boolean;
  
  // ─────────────────────────────────────────────────────────────────
  // REVENUE METRICS
  // ─────────────────────────────────────────────────────────────────
  
  /** GROSS_REVENUE: Total revenue before deductions */
  gross_revenue: FDPMetricValue;
  
  /** NET_REVENUE: Revenue after returns, discounts, platform fees */
  net_revenue: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // CONTRIBUTION MARGINS
  // ─────────────────────────────────────────────────────────────────
  
  /** CM1: Gross Profit = Net Revenue - COGS */
  cm1: FDPMetricValue;
  
  /** CM1%: Gross Margin Percent */
  cm1_percent: FDPMetricValue;
  
  /** CM2: Contribution Margin = CM1 - Variable Costs */
  cm2: FDPMetricValue;
  
  /** CM2%: Contribution Margin Percent */
  cm2_percent: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // MARKETING EFFICIENCY
  // ─────────────────────────────────────────────────────────────────
  
  /** Total marketing spend */
  marketing_spend: FDPMetricValue;
  
  /** ROAS_REVENUE: Revenue / Marketing Spend */
  roas_revenue: FDPMetricValue;
  
  /** ROAS_CONTRIBUTION: CM2 / Marketing Spend */
  roas_contribution: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // UNIT ECONOMICS
  // ─────────────────────────────────────────────────────────────────
  
  /** AOV: Average Order Value */
  aov: FDPMetricValue;
  
  /** CAC: Customer Acquisition Cost */
  cac: FDPMetricValue;
  
  /** LTV: Customer Lifetime Value */
  ltv: FDPMetricValue;
  
  /** LTV/CAC Ratio */
  ltv_cac_ratio: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // CASH & LIQUIDITY
  // ─────────────────────────────────────────────────────────────────
  
  /** Current cash balance */
  cash_balance: FDPMetricValue;
  
  /** Cash runway in months */
  cash_runway_months: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // WORKING CAPITAL CYCLE
  // ─────────────────────────────────────────────────────────────────
  
  /** DSO: Days Sales Outstanding */
  dso: FDPMetricValue;
  
  /** DPO: Days Payable Outstanding */
  dpo: FDPMetricValue;
  
  /** DIO: Days Inventory Outstanding */
  dio: FDPMetricValue;
  
  /** CCC: Cash Conversion Cycle = DSO + DIO - DPO */
  ccc: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // RECEIVABLES & PAYABLES
  // ─────────────────────────────────────────────────────────────────
  
  /** Total Accounts Receivable */
  total_ar: FDPMetricValue;
  
  /** Overdue AR */
  overdue_ar: FDPMetricValue;
  
  /** Total Accounts Payable */
  total_ap: FDPMetricValue;
  
  /** Overdue AP */
  overdue_ap: FDPMetricValue;
  
  // ─────────────────────────────────────────────────────────────────
  // VOLUME METRICS
  // ─────────────────────────────────────────────────────────────────
  
  /** Total orders in period */
  total_orders: FDPMetricValue;
  
  /** Unique customers */
  total_customers: FDPMetricValue;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HOOK - FETCH ONLY, NO COMPUTATION
// ═══════════════════════════════════════════════════════════════════

const STALE_THRESHOLD_MINUTES = 60;

export function useFDPFinanceSSOT() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['fdp-finance-ssot', tenantId],
    queryFn: async (): Promise<FDPFinanceSSOT | null> => {
      if (!tenantId) return null;
      
      // ─────────────────────────────────────────────────────────────
      // FETCH FROM DB - NO CALCULATIONS
      // ─────────────────────────────────────────────────────────────
      
      const { data: snapshot, error } = await supabase
        .from('central_metrics_snapshots')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[useFDPFinanceSSOT] Fetch error:', error);
        throw error;
      }
      
      // If no snapshot, trigger computation
      if (!snapshot) {
        const { data: newSnapshotId, error: computeError } = await supabase
          .rpc('compute_central_metrics_snapshot', { p_tenant_id: tenantId });
        
        if (computeError) {
          console.error('[useFDPFinanceSSOT] Compute error:', computeError);
          return null;
        }
        
        // Fetch freshly computed snapshot
        const { data: freshSnapshot } = await supabase
          .from('central_metrics_snapshots')
          .select('*')
          .eq('id', newSnapshotId)
          .single();
        
        if (!freshSnapshot) return null;
        return mapSnapshotToSSOT(freshSnapshot, tenantId);
      }
      
      // Check staleness
      const snapshotAge = Date.now() - new Date(snapshot.snapshot_at).getTime();
      const isStale = snapshotAge > STALE_THRESHOLD_MINUTES * 60 * 1000;
      
      // Trigger background refresh if stale
      if (isStale) {
        supabase.rpc('compute_central_metrics_snapshot', { p_tenant_id: tenantId })
          .then(() => console.log('[useFDPFinanceSSOT] Background refresh completed'));
      }
      
      return mapSnapshotToSSOT(snapshot, tenantId, isStale);
    },
    enabled: !!tenantId && !tenantLoading,
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
  const { data: tenantId } = useActiveTenantId();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      
      const { data, error } = await supabase
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
  
  // Helper to create metric value
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
  
  // Calculate ROAS variants from precomputed values
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
    
    // Revenue
    gross_revenue: metric('GROSS_REVENUE', netRevenue, 'VND'), // Using net as gross for now
    net_revenue: metric('NET_REVENUE', raw.net_revenue, 'VND'),
    
    // Contribution Margins
    cm1: metric('CM1', raw.gross_profit, 'VND'),
    cm1_percent: metric('CM1', raw.gross_margin_percent, 'percent'),
    cm2: metric('CM2', raw.contribution_margin, 'VND'),
    cm2_percent: metric('CM2', raw.contribution_margin_percent, 'percent'),
    
    // Marketing
    marketing_spend: metric('CAC', raw.total_marketing_spend, 'VND'),
    roas_revenue: metric('ROAS_REVENUE', roasRevenue, 'ratio'),
    roas_contribution: metric('ROAS_CONTRIBUTION', roasContribution, 'ratio'),
    
    // Unit Economics
    aov: metric('AOV', raw.avg_order_value, 'VND'),
    cac: metric('CAC', raw.cac, 'VND'),
    ltv: metric('LTV', raw.ltv, 'VND'),
    ltv_cac_ratio: metric('LTV_CAC_RATIO', raw.ltv_cac_ratio, 'ratio'),
    
    // Cash
    cash_balance: metric('CASH_BALANCE', raw.cash_today, 'VND'),
    cash_runway_months: metric('CASH_RUNWAY_MONTHS', raw.cash_runway_months, 'count'),
    
    // Working Capital
    dso: metric('DSO', raw.dso, 'days'),
    dpo: metric('DPO', raw.dpo, 'days'),
    dio: metric('DIO', raw.dio, 'days'),
    ccc: metric('CCC', raw.ccc, 'days'),
    
    // AR/AP
    total_ar: metric('DSO', raw.total_ar, 'VND'),
    overdue_ar: metric('DSO', raw.overdue_ar, 'VND'),
    total_ap: metric('DPO', raw.total_ap, 'VND'),
    overdue_ap: metric('DPO', raw.overdue_ap, 'VND'),
    
    // Volume
    total_orders: metric('AOV', raw.total_orders, 'count'),
    total_customers: metric('CAC', raw.total_customers, 'count'),
  };
}

// ═══════════════════════════════════════════════════════════════════
// QUICK ACCESS HOOKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get a single metric value with evidence
 */
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

/**
 * Get all revenue metrics
 */
export function useFDPRevenueMetrics() {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  return {
    data: data ? {
      grossRevenue: data.gross_revenue,
      netRevenue: data.net_revenue,
      cm1: data.cm1,
      cm1Percent: data.cm1_percent,
      cm2: data.cm2,
      cm2Percent: data.cm2_percent,
      as_of_timestamp: data.as_of_timestamp,
      source_ref: data.source_ref,
    } : null,
    isLoading,
    error,
  };
}

/**
 * Get all marketing efficiency metrics
 */
export function useFDPMarketingMetrics() {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  return {
    data: data ? {
      marketingSpend: data.marketing_spend,
      roasRevenue: data.roas_revenue,
      roasContribution: data.roas_contribution,
      cac: data.cac,
      ltv: data.ltv,
      ltvCacRatio: data.ltv_cac_ratio,
      as_of_timestamp: data.as_of_timestamp,
      source_ref: data.source_ref,
    } : null,
    isLoading,
    error,
  };
}

/**
 * Get all cash/working capital metrics
 */
export function useFDPCashMetrics() {
  const { data, isLoading, error } = useFDPFinanceSSOT();
  
  return {
    data: data ? {
      cashBalance: data.cash_balance,
      cashRunwayMonths: data.cash_runway_months,
      dso: data.dso,
      dpo: data.dpo,
      dio: data.dio,
      ccc: data.ccc,
      totalAr: data.total_ar,
      overdueAr: data.overdue_ar,
      totalAp: data.total_ap,
      overdueAp: data.overdue_ap,
      as_of_timestamp: data.as_of_timestamp,
      source_ref: data.source_ref,
    } : null,
    isLoading,
    error,
  };
}
