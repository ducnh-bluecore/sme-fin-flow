/**
 * useFinanceTruthFacts - CANONICAL HOOK for Grain-Level Finance Data
 * 
 * ⚠️ THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL GRAIN-LEVEL METRICS
 * 
 * This hook ONLY fetches precomputed data from central_metric_facts.
 * NO business calculations are performed in this hook.
 * 
 * Grain types:
 * - sku: Per-SKU revenue, cost, profit, margin
 * - store: Per-store performance
 * - channel: Per-channel breakdown
 * - customer: Per-customer metrics
 * - category: Per-category aggregates
 * 
 * REPLACES heavy queries in:
 * - SKU profitability tables
 * - Store rankings
 * - Channel analytics
 * - Customer concentration analysis
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

// =============================================================
// TYPES - Mirror the database schema exactly
// =============================================================

export type FactGrainType = 'sku' | 'store' | 'channel' | 'customer' | 'category';

export interface MetricFact {
  id: string;
  tenant_id: string;
  snapshot_id: string | null;
  grain_type: FactGrainType;
  grain_id: string;
  grain_name: string | null;
  
  // Metrics (precomputed in DB)
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  quantity: number;
  order_count: number;
  
  // Rankings (precomputed in DB)
  revenue_rank: number | null;
  profit_rank: number | null;
  
  // Period
  period_start: string;
  period_end: string;
  created_at: string;
}

// Formatted for UI
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

// Summary from DB (NO client-side aggregation)
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
// MAIN HOOK - Fetch facts by grain type (NO CALCULATIONS)
// =============================================================

interface UseFinanceTruthFactsOptions {
  grainType: FactGrainType;
  limit?: number;
  orderBy?: 'revenue' | 'profit' | 'margin_percent' | 'revenue_rank' | 'profit_rank';
  ascending?: boolean;
}

export function useFinanceTruthFacts(options: UseFinanceTruthFactsOptions) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { grainType, limit = 50, orderBy = 'revenue', ascending = false } = options;
  
  return useQuery({
    queryKey: ['finance-truth-facts', tenantId, grainType, limit, orderBy, ascending],
    queryFn: async (): Promise<FormattedFact[]> => {
      if (!tenantId) return [];
      
      // Direct fetch - NO CALCULATIONS
      let query = client
        .from('central_metric_facts')
        .select('*')
        .eq('grain_type', grainType)
        .order(orderBy, { ascending })
        .limit(limit);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[useFinanceTruthFacts] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Map to formatted shape - NO CALCULATIONS
      return data.map(mapToFormatted);
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// =============================================================
// SPECIALIZED HOOKS (thin wrappers, NO CALCULATIONS)
// =============================================================

/**
 * Get top SKUs by revenue or profit
 */
export function useTopSKUs(limit: number = 20, sortBy: 'revenue' | 'profit' = 'revenue') {
  return useFinanceTruthFacts({
    grainType: 'sku',
    limit,
    orderBy: sortBy,
    ascending: false,
  });
}

/**
 * Get problematic SKUs (sorted by margin, ascending = worst first)
 */
export function useProblematicSKUs(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'sku',
    limit,
    orderBy: 'margin_percent',
    ascending: true, // Worst margins first
  });
}

/**
 * Get channel breakdown
 */
export function useChannelFacts(limit: number = 10) {
  return useFinanceTruthFacts({
    grainType: 'channel',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

/**
 * Get store rankings
 */
export function useStoreFacts(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'store',
    limit,
    orderBy: 'revenue_rank',
    ascending: true,
  });
}

/**
 * Get category breakdown
 */
export function useCategoryFacts(limit: number = 10) {
  return useFinanceTruthFacts({
    grainType: 'category',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

/**
 * Get top customers
 */
export function useTopCustomers(limit: number = 20) {
  return useFinanceTruthFacts({
    grainType: 'customer',
    limit,
    orderBy: 'revenue',
    ascending: false,
  });
}

// =============================================================
// HELPER - Map DB row to formatted UI object (NO CALCULATIONS)
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
// AGGREGATE HOOK - Fetch summary FROM DB (NO CLIENT-SIDE SUM)
// =============================================================

/**
 * Get facts summary - uses DB precomputed table or RPC
 * NO CLIENT-SIDE AGGREGATION
 */
export function useFactsSummary(grainType: FactGrainType) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['finance-truth-facts-summary', tenantId, grainType],
    queryFn: async (): Promise<FactsSummaryFromDB | null> => {
      if (!tenantId) return null;
      
      // Fetch from precomputed summary table - NO CLIENT CALCULATIONS
      const { data, error } = await client
        .rpc('get_facts_summary', {
          p_tenant_id: tenantId,
          p_grain_type: grainType,
        });
      
      if (error) {
        console.error('[useFactsSummary] RPC error:', error);
        // Fallback to summary table direct query
        let fallbackQuery = client
          .from('central_metric_facts_summary')
          .select('*')
          .eq('grain_type', grainType);

        if (shouldAddTenantFilter) {
          fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.maybeSingle();
        
        if (fallbackError || !fallbackData) return null;
        
        return {
          totalItems: fallbackData.total_items || 0,
          totalRevenue: Number(fallbackData.total_revenue) || 0,
          totalCost: Number(fallbackData.total_cost) || 0,
          totalProfit: Number(fallbackData.total_profit) || 0,
          totalQuantity: Number(fallbackData.total_quantity) || 0,
          totalOrders: fallbackData.total_orders || 0,
          avgMarginPercent: Number(fallbackData.avg_margin_percent) || 0,
        };
      }
      
      if (!data || data.length === 0) return null;
      
      const row = data[0];
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
