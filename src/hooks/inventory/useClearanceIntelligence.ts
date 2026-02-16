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
 * Fetch clearance history by product_name (matching inv_family_codes.fc_name).
 */
export function useClearanceHistory(productName?: string) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-history', tenantId, productName],
    queryFn: async () => {
      let query = buildQuery('v_clearance_history_by_product' as any)
        .order('sale_month', { ascending: false })
        .limit(500);

      if (productName) {
        query = query.eq('product_name', productName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClearanceHistoryItem[];
    },
    enabled: isReady && !!tenantId,
  });
}

/**
 * Fetch clearance candidates by joining markdown risk with inv_family_codes + health + cash lock.
 */
export function useClearanceCandidates() {
  const { buildQuery, buildSelectQuery, client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['clearance-candidates', tenantId],
    queryFn: async () => {
      // 1. Get high markdown risk products (product_id = inv_family_codes.id)
      const { data: riskData, error: riskError } = await buildQuery('state_markdown_risk_daily' as any)
        .select('product_id, markdown_risk_score, markdown_eta_days, reason')
        .gte('markdown_risk_score', 50)
        .order('markdown_risk_score', { ascending: false })
        .limit(200);

      if (riskError) throw riskError;
      if (!riskData || riskData.length === 0) return [];

      const productIds = (riskData as any[]).map(r => r.product_id);

      // 2. Fetch family code details (NOT products table)
      const { data: fcData, error: fcError } = await buildSelectQuery(
        'inv_family_codes',
        'id, fc_code, fc_name, category, season, metadata'
      )
        .in('id', productIds);

      if (fcError) throw fcError;

      // 3. Fetch health scores
      const { data: healthData } = await buildQuery('state_size_health_daily' as any)
        .select('product_id, size_health_score, curve_state')
        .in('product_id', productIds)
        .is('store_id', null);

      // 4. Fetch cash lock
      const { data: cashData } = await buildQuery('state_cash_lock_daily' as any)
        .select('product_id, cash_locked_value, inventory_value')
        .in('product_id', productIds);

      // 5. Fetch stock via RPC (server-side aggregation to avoid 1000-row limit)
      const { data: stockData } = await client.rpc('fn_clearance_stock_by_fc', {
        p_tenant_id: tenantId,
        p_fc_ids: productIds,
      });

      // Build lookup maps
      const fcMap = new Map<string, any>();
      for (const f of (fcData || []) as any[]) fcMap.set(f.id, f);

      const healthMap = new Map<string, any>();
      for (const h of (healthData || []) as any[]) healthMap.set(h.product_id, h);

      const cashMap = new Map<string, any>();
      for (const c of (cashData || []) as any[]) cashMap.set(c.product_id, c);

      // Stock map from RPC result
      const stockMap = new Map<string, number>();
      for (const s of (stockData || []) as any[]) {
        stockMap.set(s.fc_id, Number(s.total_on_hand || 0));
      }

      // Combine
      const candidates: ClearanceCandidate[] = (riskData as any[]).map(r => {
        const fc = fcMap.get(r.product_id);
        const health = healthMap.get(r.product_id);
        const cash = cashMap.get(r.product_id);
        const stock = stockMap.get(r.product_id) || 0;

        return {
          product_id: r.product_id,
          product_name: fc?.fc_name || '—',
          fc_code: fc?.fc_code || '—',
          category: fc?.category || null,
          season: fc?.season || null,
          markdown_risk_score: r.markdown_risk_score,
          markdown_eta_days: r.markdown_eta_days,
          reason: r.reason,
          health_score: health?.size_health_score ?? null,
          curve_state: health?.curve_state || null,
          current_stock: stock,
          inventory_value: cash?.inventory_value ?? 0,
          cash_locked: cash?.cash_locked_value ?? 0,
          is_premium: isPremiumGroup({
            fc_name: fc?.fc_name,
            metadata: fc?.metadata,
          }),
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
