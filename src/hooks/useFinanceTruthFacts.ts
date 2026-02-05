/**
 * useFinanceTruthFacts - CANONICAL HOOK for Grain-Level Finance Data
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL GRAIN-LEVEL METRICS
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain FDP/Finance
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

// =============================================================
// TYPES
// =============================================================

export type FactGrainType = 'sku' | 'store' | 'channel' | 'customer' | 'category';

export interface MetricFact {
  id: string;
  tenant_id: string;
  snapshot_id: string | null;
  grain_type: FactGrainType;
  grain_id: string;
  grain_name: string | null;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  quantity: number;
  order_count: number;
  revenue_rank: number | null;
  profit_rank: number | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface FormattedFact {
  id: string;
  grainType: FactGrainType;
  grainId: string;
  grainName: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  quantity: number;
  orderCount: number;
  revenueRank: number | null;
  profitRank: number | null;
  periodStart: string;
  periodEnd: string;
}

export interface FactsSummaryFromDB {
  totalItems: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalQuantity: number;
  totalOrders: number;
  avgMarginPercent: number;
}

// =============================================================
// MAIN HOOK
// =============================================================

interface UseFinanceTruthFactsOptions {
  grainType: FactGrainType;
  limit?: number;
  orderBy?: 'revenue' | 'profit' | 'margin_percent' | 'revenue_rank' | 'profit_rank';
  ascending?: boolean;
}

export function useFinanceTruthFacts(options: UseFinanceTruthFactsOptions) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { grainType, limit = 50, orderBy = 'revenue', ascending = false } = options;
  
  return useQuery({
    queryKey: ['finance-truth-facts', tenantId, grainType, limit, orderBy, ascending],
    queryFn: async (): Promise<FormattedFact[]> => {
      if (!tenantId) return [];
      
      const { data, error } = await buildSelectQuery('central_metric_facts', '*')
        .eq('grain_type', grainType)
        .order(orderBy, { ascending })
        .limit(limit);

      if (error) {
        console.error('[useFinanceTruthFacts] Fetch error:', error);
        throw error;
      }
      
      if (!data || (data as any[]).length === 0) return [];
      
      return (data as any[]).map(mapToFormatted);
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS
// =============================================================

export function useTopSKUs(limit: number = 20, sortBy: 'revenue' | 'profit' = 'revenue') {
  return useFinanceTruthFacts({
    grainType: 'sku',
    limit,
    orderBy: sortBy,
    ascending: false,
  });
}

export function useProblematicSKUs(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'sku',
    limit,
    orderBy: 'margin_percent',
    ascending: true,
  });
}

export function useChannelFacts(limit: number = 10) {
  return useFinanceTruthFacts({
    grainType: 'channel',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

export function useStoreFacts(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'store',
    limit,
    orderBy: 'revenue_rank',
    ascending: true,
  });
}

export function useCategoryFacts(limit: number = 10) {
  return useFinanceTruthFacts({
    grainType: 'category',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

export function useTopCustomers(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'customer',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

// =============================================================
// HELPER
// =============================================================

function mapToFormatted(raw: MetricFact): FormattedFact {
  return {
    id: raw.id,
    grainType: raw.grain_type,
    grainId: raw.grain_id,
    grainName: raw.grain_name || raw.grain_id,
    revenue: Number(raw.revenue) || 0,
    cost: Number(raw.cost) || 0,
    profit: Number(raw.profit) || 0,
    marginPercent: Number(raw.margin_percent) || 0,
    quantity: Number(raw.quantity) || 0,
    orderCount: Number(raw.order_count) || 0,
    revenueRank: raw.revenue_rank,
    profitRank: raw.profit_rank,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
  };
}

// =============================================================
// AGGREGATE HOOK
// =============================================================

export function useFactsSummary(grainType: FactGrainType) {
  const { buildSelectQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();
  
  return useQuery({
    queryKey: ['finance-truth-facts-summary', tenantId, grainType],
    queryFn: async (): Promise<FactsSummaryFromDB | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await callRpc('get_facts_summary', {
        p_grain_type: grainType,
      });
      
      if (error) {
        console.error('[useFactsSummary] RPC error:', error);
        // Fallback to summary table
        const { data: fallbackData, error: fallbackError } = await buildSelectQuery('central_metric_facts_summary', '*')
          .eq('grain_type', grainType)
          .maybeSingle();
        
        if (fallbackError || !fallbackData) return null;
        
        return {
          totalItems: (fallbackData as any).total_items || 0,
          totalRevenue: Number((fallbackData as any).total_revenue) || 0,
          totalCost: Number((fallbackData as any).total_cost) || 0,
          totalProfit: Number((fallbackData as any).total_profit) || 0,
          totalQuantity: Number((fallbackData as any).total_quantity) || 0,
          totalOrders: (fallbackData as any).total_orders || 0,
          avgMarginPercent: Number((fallbackData as any).avg_margin_percent) || 0,
        };
      }
      
      if (!data || (data as any[]).length === 0) return null;
      
      const row = (data as any[])[0];
      return {
        totalItems: row.total_items || 0,
        totalRevenue: Number(row.total_revenue) || 0,
        totalCost: Number(row.total_cost) || 0,
        totalProfit: Number(row.total_profit) || 0,
        totalQuantity: Number(row.total_quantity) || 0,
        totalOrders: row.total_orders || 0,
        avgMarginPercent: Number(row.avg_margin_percent) || 0,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
