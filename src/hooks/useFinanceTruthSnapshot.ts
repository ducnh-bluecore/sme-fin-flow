/**
 * useFinanceTruthSnapshot - CANONICAL HOOK for Finance Metrics
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL FINANCE METRICS
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain FDP/Finance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

// =============================================================
// TYPES - Mirror the database schema exactly
// =============================================================

export interface FinanceTruthSnapshot {
  id: string;
  tenant_id: string;
  snapshot_at: string;
  
  // Revenue & Profit
  net_revenue: number;
  gross_profit: number;
  gross_margin_percent: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  ebitda: number;
  ebitda_margin_percent: number;
  
  // Cash & Liquidity
  cash_today: number;
  cash_7d_forecast: number;
  cash_runway_months: number;
  
  // Receivables
  total_ar: number;
  overdue_ar: number;
  ar_aging_current: number;
  ar_aging_30d: number;
  ar_aging_60d: number;
  ar_aging_90d: number;
  
  // Payables
  total_ap: number;
  overdue_ap: number;
  
  // Inventory
  total_inventory_value: number;
  slow_moving_inventory: number;
  
  // Working Capital Cycle
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  
  // Marketing
  total_marketing_spend: number;
  marketing_roas: number;
  cac: number;
  ltv: number;
  ltv_cac_ratio: number;
  
  // Orders/Customers
  total_orders: number;
  avg_order_value: number;
  total_customers: number;
  repeat_customer_rate: number;
  
  // Locked Cash (Phase 4)
  locked_cash_inventory: number;
  locked_cash_ads: number;
  locked_cash_ops: number;
  locked_cash_platform: number;
  locked_cash_total: number;
  
  // Period context
  period_start: string;
  period_end: string;
  
  // Metadata
  computed_by: string;
  computation_duration_ms: number | null;
  created_at: string;
}

// Phase 8.3: Data Quality Flags for transparency
export interface DataQualityFlags {
  hasContributionMarginWarning: boolean;
  contributionMarginWarningReason: string | null;
  roasDataSource: 'promotion_campaigns' | 'expenses' | 'unavailable';
  dataCompletenessPercent: number;
  lastComputedAt: string;
  // Phase 8.3: Source availability flags
  hasCashData: boolean;
  hasARData: boolean;
  hasAPData: boolean;
  hasInventoryData: boolean;
  hasExpenseData: boolean;
}

// Formatted version for UI consumption
export interface FormattedFinanceSnapshot {
  // Revenue & Profit (formatted)
  netRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  ebitda: number;
  ebitdaMarginPercent: number;
  
  // Cash & Liquidity
  cashToday: number;
  cash7dForecast: number;
  cashRunwayMonths: number;
  
  // Receivables
  totalAR: number;
  overdueAR: number;
  arAgingCurrent: number;
  arAging30d: number;
  arAging60d: number;
  arAging90d: number;
  
  // Payables
  totalAP: number;
  overdueAP: number;
  
  // Inventory
  totalInventoryValue: number;
  slowMovingInventory: number;
  
  // Working Capital Cycle
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  
  // Pre-computed AR/DSO metrics (SSOT Phase 6)
  overdueARPercent: number;
  dsoTarget: number;
  dpoTarget: number;
  dioTarget: number;
  
  // Marketing
  totalMarketingSpend: number;
  marketingRoas: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  
  // Orders/Customers
  totalOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  repeatCustomerRate: number;
  
  // Locked Cash (Phase 4)
  lockedCashInventory: number;
  lockedCashAds: number;
  lockedCashOps: number;
  lockedCashPlatform: number;
  lockedCashTotal: number;
  
  // Period
  periodStart: string;
  periodEnd: string;
  
  // Metadata
  snapshotAt: string;
  isStale: boolean;
  
  // Phase 8.3: Data Quality Flags
  dataQuality: DataQualityFlags;
}

// =============================================================
// MAIN HOOK - Fetch latest snapshot (NO CALCULATIONS)
// =============================================================

const STALE_THRESHOLD_MINUTES = 60;

export function useFinanceTruthSnapshot() {
  const { buildSelectQuery, callRpc, client, tenantId, isLoading: tenantLoading, isReady } = useTenantQueryBuilder();
  
  return useQuery({
    queryKey: ['finance-truth-snapshot', tenantId],
    queryFn: async (): Promise<FormattedFinanceSnapshot | null> => {
      if (!tenantId) return null;
      
      // Fetch latest snapshot
      const { data, error } = await buildSelectQuery('central_metrics_snapshots', '*')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[useFinanceTruthSnapshot] Fetch error:', error);
        throw error;
      }
      
      // If no snapshot exists, trigger computation
      if (!data) {
        // Must pass explicit dates to avoid function signature ambiguity
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: newSnapshot, error: computeError } = await client
          .rpc('compute_central_metrics_snapshot' as any, {
            p_tenant_id: tenantId,
            p_start_date: startDate,
            p_end_date: endDate,
          });
        
        if (computeError) {
          console.error('[useFinanceTruthSnapshot] Compute error:', computeError);
          return null;
        }
        
        // Fetch the newly created snapshot
        const { data: freshData } = await client
          .from('central_metrics_snapshots')
          .select('*')
          .eq('id', newSnapshot)
          .single();
        
        if (!freshData) return null;
        return mapToFormatted(freshData as FinanceTruthSnapshot);
      }
      
      // Check staleness and trigger background refresh if needed
      const snapshotAge = Date.now() - new Date((data as any).snapshot_at).getTime();
      const isStale = snapshotAge > STALE_THRESHOLD_MINUTES * 60 * 1000;
      
      if (isStale) {
        // Trigger background refresh with explicit dates
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        client.rpc('compute_central_metrics_snapshot' as any, {
          p_tenant_id: tenantId,
          p_start_date: startDate,
          p_end_date: endDate,
        }).then(() => console.log('[useFinanceTruthSnapshot] Background refresh completed'));
      }
      
      return mapToFormatted(data as unknown as FinanceTruthSnapshot, isStale);
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// =============================================================
// REFRESH MUTATION - Force recompute snapshot
// =============================================================

export function useRefreshFinanceSnapshot() {
  const queryClient = useQueryClient();
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data, error } = await client.rpc('compute_central_metrics_snapshot' as any, {
        p_tenant_id: tenantId,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-truth-snapshot', tenantId] });
    },
  });
}

// =============================================================
// HELPER - Map DB row to formatted UI object (NO CALCULATIONS)
// =============================================================

function mapToFormatted(
  raw: FinanceTruthSnapshot, 
  isStale: boolean = false
): FormattedFinanceSnapshot {
  return {
    netRevenue: Number(raw.net_revenue) || 0,
    grossProfit: Number(raw.gross_profit) || 0,
    grossMarginPercent: Number(raw.gross_margin_percent) || 0,
    contributionMargin: Number(raw.contribution_margin) || 0,
    contributionMarginPercent: Number(raw.contribution_margin_percent) || 0,
    ebitda: Number(raw.ebitda) || 0,
    ebitdaMarginPercent: Number(raw.ebitda_margin_percent) || 0,
    
    cashToday: Number(raw.cash_today) || 0,
    cash7dForecast: Number(raw.cash_7d_forecast) || 0,
    cashRunwayMonths: Number(raw.cash_runway_months) || 0,
    
    totalAR: Number(raw.total_ar) || 0,
    overdueAR: Number(raw.overdue_ar) || 0,
    arAgingCurrent: Number(raw.ar_aging_current) || 0,
    arAging30d: Number(raw.ar_aging_30d) || 0,
    arAging60d: Number(raw.ar_aging_60d) || 0,
    arAging90d: Number(raw.ar_aging_90d) || 0,
    
    totalAP: Number(raw.total_ap) || 0,
    overdueAP: Number(raw.overdue_ap) || 0,
    
    totalInventoryValue: Number(raw.total_inventory_value) || 0,
    slowMovingInventory: Number(raw.slow_moving_inventory) || 0,
    
    dso: Number(raw.dso) || 0,
    dpo: Number(raw.dpo) || 0,
    dio: Number(raw.dio) || 0,
    ccc: Number(raw.ccc) || 0,
    
    overdueARPercent: Number(raw.total_ar) > 0 
      ? Math.round((Number(raw.overdue_ar) / Number(raw.total_ar) * 100) * 10) / 10 
      : 0,
    dsoTarget: 30,
    dpoTarget: 45,
    dioTarget: 45,
    
    totalMarketingSpend: Number(raw.total_marketing_spend) || 0,
    marketingRoas: Number(raw.marketing_roas) || 0,
    cac: Number(raw.cac) || 0,
    ltv: Number(raw.ltv) || 0,
    ltvCacRatio: Number(raw.ltv_cac_ratio) || 0,
    
    totalOrders: Number(raw.total_orders) || 0,
    avgOrderValue: Number(raw.avg_order_value) || 0,
    totalCustomers: Number(raw.total_customers) || 0,
    repeatCustomerRate: Number(raw.repeat_customer_rate) || 0,
    
    lockedCashInventory: Number(raw.locked_cash_inventory) || 0,
    lockedCashAds: Number(raw.locked_cash_ads) || 0,
    lockedCashOps: Number(raw.locked_cash_ops) || 0,
    lockedCashPlatform: Number(raw.locked_cash_platform) || 0,
    lockedCashTotal: Number(raw.locked_cash_total) || 0,
    
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    
    snapshotAt: raw.snapshot_at,
    isStale,
    
    dataQuality: computeDataQualityFlags(raw),
  };
}

function computeDataQualityFlags(raw: FinanceTruthSnapshot): DataQualityFlags {
  const grossProfit = Number(raw.gross_profit) || 0;
  const contributionMargin = Number(raw.contribution_margin) || 0;
  const marketingRoas = Number(raw.marketing_roas) || 0;
  const marketingSpend = Number(raw.total_marketing_spend) || 0;
  
  const variableCostsImplied = grossProfit - contributionMargin;
  const hasContributionMarginWarning = contributionMargin < 0 && variableCostsImplied > grossProfit * 2;
  
  let contributionMarginWarningReason: string | null = null;
  if (hasContributionMarginWarning) {
    contributionMarginWarningReason = 
      'Chi phí biến đổi cao bất thường so với lợi nhuận gộp. Có thể do dữ liệu chi phí chưa đồng bộ với doanh thu hoặc là chi phí dự toán.';
  }
  
  const roasDataSource: 'promotion_campaigns' | 'expenses' | 'unavailable' = 
    marketingSpend > 0 && marketingRoas > 0 ? 'promotion_campaigns' :
    marketingSpend > 0 ? 'expenses' : 'unavailable';
  
  // Source availability: if all related fields are 0, source is likely empty
  const hasCashData = Number(raw.cash_today) > 0;
  const hasARData = Number(raw.total_ar) > 0 || Number(raw.overdue_ar) > 0;
  const hasAPData = Number(raw.total_ap) > 0 || Number(raw.overdue_ap) > 0;
  const hasInventoryData = Number(raw.total_inventory_value) > 0;
  const hasExpenseData = Number(raw.ebitda) !== Number(raw.gross_profit); // expenses affect EBITDA

  let completenessScore = 0;
  if (Number(raw.net_revenue) > 0) completenessScore += 20;
  if (hasCashData) completenessScore += 20;
  if (hasARData) completenessScore += 15;
  if (hasAPData) completenessScore += 15;
  if (Number(raw.total_orders) > 0) completenessScore += 15;
  if (marketingRoas > 0) completenessScore += 15;
  
  return {
    hasContributionMarginWarning,
    contributionMarginWarningReason,
    roasDataSource,
    dataCompletenessPercent: Math.min(completenessScore, 100),
    lastComputedAt: raw.snapshot_at,
    hasCashData,
    hasARData,
    hasAPData,
    hasInventoryData,
    hasExpenseData,
  };
}

// =============================================================
// COMPATIBILITY EXPORTS
// =============================================================

/**
 * @deprecated Use useFinanceTruthSnapshot directly
 */
export function useFinanceTruthAsLegacy() {
  const query = useFinanceTruthSnapshot();
  
  const legacyData = query.data ? {
    netRevenue: query.data.netRevenue,
    totalRevenue: query.data.netRevenue,
    grossProfit: query.data.grossProfit,
    grossMargin: query.data.grossMarginPercent,
    contributionMargin: query.data.contributionMargin,
    ebitda: query.data.ebitda,
    cashToday: query.data.cashToday,
    cashRunwayMonths: query.data.cashRunwayMonths,
    totalAR: query.data.totalAR,
    overdueAR: query.data.overdueAR,
    totalAP: query.data.totalAP,
    overdueAP: query.data.overdueAP,
    dso: query.data.dso,
    dpo: query.data.dpo,
    dio: query.data.dio,
    ccc: query.data.ccc,
    avgOrderValue: query.data.avgOrderValue,
    totalOrders: query.data.totalOrders,
    totalCustomers: query.data.totalCustomers,
    roas: query.data.marketingRoas,
    cac: query.data.cac,
    ltv: query.data.ltv,
    ltvCacRatio: query.data.ltvCacRatio,
    periodStart: query.data.periodStart,
    periodEnd: query.data.periodEnd,
    lastUpdated: query.data.snapshotAt,
  } : null;
  
  return {
    ...query,
    data: legacyData,
  };
}
