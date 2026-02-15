import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface ClearanceHistoryItem {
  tenant_id: string;
  product_name: string;
  sku: string;
  channel: string;
  sale_month: string;
  discount_band: string;
  units_sold: number;
  revenue_collected: number;
  total_discount_given: number;
  avg_discount_pct: number;
}

export interface ClearanceCandidate {
  fc_code: string;
  fc_name: string;
  season: string | null;
  category: string | null;
  curve_state: string;
  health_score: number;
  markdown_risk_score: number;
  total_on_hand: number;
  inventory_value: number;
  cash_locked: number;
  days_of_supply: number;
}

const PREMIUM_MAX_DISCOUNT = 50;

export function isPremiumGroup(fc: { fc_name?: string; metadata?: { tags?: string[] } }) {
  const tags = (fc.metadata as any)?.tags || [];
  const name = (fc.fc_name || '').toLowerCase();
  return tags.includes('premium') || tags.includes('signature')
    || name.includes('embroidery') || name.includes('thêu') || name.includes('theu');
}

export { PREMIUM_MAX_DISCOUNT };

/**
 * Fetch clearance history from the pre-aggregated view.
 * Respects analytical-aggregation-constraint.
 */
export function useClearanceHistory(sku?: string) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-history', tenantId, sku],
    queryFn: async () => {
      let query = buildQuery('v_clearance_history_by_product' as any)
        .order('sale_month', { ascending: false })
        .limit(500);

      if (sku) {
        query = query.eq('sku', sku);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClearanceHistoryItem[];
    },
    enabled: isReady && !!tenantId,
  });
}

/**
 * Fetch clearance candidates from Size Intelligence state tables.
 */
export function useClearanceCandidates() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-candidates', tenantId],
    queryFn: async () => {
      // Get products with high markdown risk or broken curve state
      const { data, error } = await buildQuery('state_markdown_risk_daily' as any)
        .select('*')
        .gte('markdown_risk_score', 50)
        .order('markdown_risk_score', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as unknown as ClearanceCandidate[];
    },
    enabled: isReady && !!tenantId,
  });
}

/**
 * Aggregate clearance history by channel for channel analysis tab.
 */
export function useClearanceByChannel() {
  const { data: history, isLoading } = useClearanceHistory();

  const channelSummary = (history || []).reduce((acc, item) => {
    const ch = item.channel || 'Unknown';
    if (!acc[ch]) {
      acc[ch] = { channel: ch, totalUnits: 0, totalRevenue: 0, totalDiscount: 0, count: 0, avgDiscountPct: 0 };
    }
    acc[ch].totalUnits += item.units_sold;
    acc[ch].totalRevenue += item.revenue_collected;
    acc[ch].totalDiscount += item.total_discount_given;
    acc[ch].count += 1;
    return acc;
  }, {} as Record<string, { channel: string; totalUnits: number; totalRevenue: number; totalDiscount: number; count: number; avgDiscountPct: number }>);

  // Calculate avg discount pct per channel
  Object.values(channelSummary).forEach(ch => {
    const total = ch.totalRevenue + ch.totalDiscount;
    ch.avgDiscountPct = total > 0 ? Math.round((ch.totalDiscount / total) * 100) : 0;
  });

  return {
    data: Object.values(channelSummary).sort((a, b) => b.totalUnits - a.totalUnits),
    isLoading,
  };
}
