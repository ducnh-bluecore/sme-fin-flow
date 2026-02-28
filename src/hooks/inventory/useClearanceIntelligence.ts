import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface ClearanceHistoryItem {
  tenant_id: string;
  fc_id: string;
  product_name: string;
  channel: string;
  sale_month: string;
  discount_band: string;
  units_sold: number;
  revenue_collected: number;
  total_discount_given: number;
  avg_discount_pct: number;
}

export interface ClearanceCandidate {
  product_id: string;
  product_name: string;
  fc_code: string;
  category: string | null;
  season: string | null;
  markdown_risk_score: number;
  markdown_eta_days: number | null;
  reason: string;
  health_score: number | null;
  curve_state: string | null;
  current_stock: number;
  inventory_value: number;
  cash_locked: number;
  is_premium: boolean;
  avg_daily_sales: number;
  sales_velocity: number;
  trend: string | null;
  days_to_clear: number | null;
  collection_id: string | null;
  collection_name: string | null;
  demand_space: string | null;
  product_created_at: string | null;
  clearance_group: string | null;
}

const PREMIUM_MAX_DISCOUNT = 50;

export function isPremiumGroup(fc: { product_name?: string; fc_name?: string; subcategory?: string; metadata?: { tags?: string[] } }) {
  const tags = (fc.metadata as any)?.tags || [];
  const name = ((fc.product_name || fc.fc_name || '') + ' ' + (fc.subcategory || '')).toLowerCase();
  return tags.includes('premium') || tags.includes('signature')
    || name.includes('embroidery') || name.includes('thêu') || name.includes('theu')
    || name.includes('premium') || name.includes('signature');
}

export { PREMIUM_MAX_DISCOUNT };

/**
 * Fetch clearance history by fc_id (matched via inv_sku_fc_mapping in the view).
 * Includes both discounted and full-price sales for complete picture.
 */
export function useClearanceHistory(fcId?: string) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-history-fc', tenantId, fcId],
    queryFn: async () => {
      let query = buildQuery('v_clearance_history_by_fc' as any)
        .order('sale_month', { ascending: false })
        .limit(500);

      if (fcId) {
        query = query.eq('fc_id', fcId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClearanceHistoryItem[];
    },
    enabled: isReady && !!tenantId && !!fcId,
  });
}

/**
 * Fetch clearance candidates via server-side RPC fn_clearance_candidates.
 * Replaces 6 client-side queries with 1 server call.
 */
export function useClearanceCandidates() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-candidates', tenantId],
    queryFn: async () => {
      const { data, error } = await client.rpc('fn_clearance_candidates', {
        p_tenant_id: tenantId,
        p_min_risk: 50,
      });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      return (data as any[]).map(r => ({
        product_id: r.product_id,
        product_name: r.product_name || '—',
        fc_code: r.fc_code || '—',
        category: r.category || null,
        season: r.season || null,
        markdown_risk_score: r.markdown_risk_score,
        markdown_eta_days: r.markdown_eta_days,
        reason: r.reason,
        health_score: r.health_score ?? null,
        curve_state: r.curve_state || null,
        current_stock: Number(r.current_stock || 0),
        inventory_value: r.inventory_value ?? 0,
        cash_locked: r.cash_locked ?? 0,
        is_premium: isPremiumGroup({
          fc_name: r.product_name,
          metadata: r.metadata,
        }) || r.is_premium === true,
        avg_daily_sales: Number(r.avg_daily_sales || 0),
        sales_velocity: Number(r.sales_velocity || 0),
        trend: r.trend || null,
        days_to_clear: r.days_to_clear ?? 9999,
        collection_id: r.collection_id || null,
        collection_name: r.collection_name || null,
        demand_space: r.demand_space || null,
        product_created_at: r.product_created_at || null,
        clearance_group: r.clearance_group || null,
      } as ClearanceCandidate));
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Aggregate clearance history by channel for channel analysis tab.
 * Uses the new v_clearance_history_by_fc view (SKU-based matching).
 */
export function useClearanceByChannel() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-by-channel', tenantId],
    queryFn: async () => {
      // DB RPC aggregation — NO client-side .reduce()
      const { data, error } = await client.rpc('get_clearance_by_channel', { p_tenant_id: tenantId });
      if (error) throw error;

      return ((data || []) as any[]).map(r => ({
        channel: r.channel || 'Unknown',
        totalUnits: Number(r.total_units) || 0,
        totalRevenue: Number(r.total_revenue) || 0,
        totalDiscount: Number(r.total_discount) || 0,
        count: Number(r.record_count) || 0,
        avgDiscountPct: Number(r.avg_discount_pct) || 0,
      }));
    },
    enabled: isReady && !!tenantId,
  });
}
