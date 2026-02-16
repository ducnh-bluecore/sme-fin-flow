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
  product_id: string;
  product_name: string;
  sku: string;
  category: string | null;
  subcategory: string | null;
  markdown_risk_score: number;
  markdown_eta_days: number | null;
  reason: string;
  health_score: number | null;
  curve_state: string | null;
  current_stock: number;
  inventory_value: number;
  cash_locked: number;
  cost_price: number;
}

const PREMIUM_MAX_DISCOUNT = 50;

export function isPremiumGroup(fc: { product_name?: string; subcategory?: string; fc_name?: string; metadata?: { tags?: string[] } }) {
  const tags = (fc.metadata as any)?.tags || [];
  const name = ((fc.product_name || fc.fc_name || '') + ' ' + (fc.subcategory || '')).toLowerCase();
  return tags.includes('premium') || tags.includes('signature')
    || name.includes('embroidery') || name.includes('thêu') || name.includes('theu')
    || name.includes('premium') || name.includes('signature');
}

export { PREMIUM_MAX_DISCOUNT };

/**
 * Fetch clearance history from the pre-aggregated view.
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
 * Fetch clearance candidates by joining markdown risk with products + health + cash lock.
 */
export function useClearanceCandidates() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-candidates', tenantId],
    queryFn: async () => {
      // 1. Get high markdown risk products
      const { data: riskData, error: riskError } = await buildQuery('state_markdown_risk_daily' as any)
        .select('product_id, markdown_risk_score, markdown_eta_days, reason')
        .gte('markdown_risk_score', 50)
        .order('markdown_risk_score', { ascending: false })
        .limit(200);

      if (riskError) throw riskError;
      if (!riskData || riskData.length === 0) return [];

      const productIds = (riskData as any[]).map(r => r.product_id);

      // 2. Fetch product details for these IDs
      const { data: products, error: prodError } = await buildQuery('products' as any)
        .select('id, name, sku, category, subcategory, cost_price, selling_price, current_stock')
        .in('id', productIds);

      if (prodError) throw prodError;

      // 3. Fetch health scores
      const { data: healthData } = await buildQuery('state_size_health_daily' as any)
        .select('product_id, size_health_score, curve_state')
        .in('product_id', productIds)
        .is('store_id', null);

      // 4. Fetch cash lock
      const { data: cashData } = await buildQuery('state_cash_lock_daily' as any)
        .select('product_id, cash_locked_value, inventory_value')
        .in('product_id', productIds);

      // Build lookup maps
      const productMap = new Map<string, any>();
      for (const p of (products || []) as any[]) productMap.set(p.id, p);

      const healthMap = new Map<string, any>();
      for (const h of (healthData || []) as any[]) healthMap.set(h.product_id, h);

      const cashMap = new Map<string, any>();
      for (const c of (cashData || []) as any[]) cashMap.set(c.product_id, c);

      // Combine
      const candidates: ClearanceCandidate[] = (riskData as any[]).map(r => {
        const prod = productMap.get(r.product_id);
        const health = healthMap.get(r.product_id);
        const cash = cashMap.get(r.product_id);
        const costPrice = Number(prod?.cost_price || 0);
        const stock = Number(prod?.current_stock || 0);

        return {
          product_id: r.product_id,
          product_name: prod?.name || '—',
          sku: prod?.sku || '—',
          category: prod?.category || null,
          subcategory: prod?.subcategory || null,
          markdown_risk_score: r.markdown_risk_score,
          markdown_eta_days: r.markdown_eta_days,
          reason: r.reason,
          health_score: health?.size_health_score ?? null,
          curve_state: health?.curve_state || null,
          current_stock: stock,
          inventory_value: cash?.inventory_value ?? (costPrice * stock),
          cash_locked: cash?.cash_locked_value ?? 0,
          cost_price: costPrice,
        };
      });

      return candidates;
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

  Object.values(channelSummary).forEach(ch => {
    const total = ch.totalRevenue + ch.totalDiscount;
    ch.avgDiscountPct = total > 0 ? Math.round((ch.totalDiscount / total) * 100) : 0;
  });

  return {
    data: Object.values(channelSummary).sort((a, b) => b.totalUnits - a.totalUnits),
    isLoading,
  };
}
