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
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

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
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { grainType, limit = 50, orderBy = 'revenue', ascending = false } = options;
  
  return useQuery({
    queryKey: ['finance-truth-facts', tenantId, grainType, limit, orderBy, ascending],
    queryFn: async (): Promise<FormattedFact[]> => {
      if (!tenantId) return [];
      
      // Direct fetch - NO CALCULATIONS
      const { data, error } = await supabase
        .from('central_metric_facts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('grain_type', grainType)
        .order(orderBy, { ascending })
        .limit(limit);
      
      if (error) {
        console.error('[useFinanceTruthFacts] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return [];
      
      // Map to formatted shape - NO CALCULATIONS
      return data.map(mapToFormatted);
    },
    enabled: !!tenantId && !tenantLoading,
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
// AGGREGATE HOOK - Get summary across all facts of a type
// =============================================================

export function useFactsSummary(grainType: FactGrainType) {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['finance-truth-facts-summary', tenantId, grainType],
    queryFn: async () => {
      if (!tenantId) return null;
      
      // Use DB aggregation - NO CLIENT CALCULATIONS
      const { data, error } = await supabase
        .from('central_metric_facts')
        .select('revenue, cost, profit, quantity, order_count')
        .eq('tenant_id', tenantId)
        .eq('grain_type', grainType);
      
      if (error || !data) return null;
      
      // Simple sum - could also be done via RPC for true DB-first
      const summary = {
        totalItems: data.length,
        totalRevenue: data.reduce((sum, r) => sum + Number(r.revenue), 0),
        totalCost: data.reduce((sum, r) => sum + Number(r.cost), 0),
        totalProfit: data.reduce((sum, r) => sum + Number(r.profit), 0),
        totalQuantity: data.reduce((sum, r) => sum + Number(r.quantity), 0),
        totalOrders: data.reduce((sum, r) => sum + Number(r.order_count), 0),
      };
      
      return summary;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
