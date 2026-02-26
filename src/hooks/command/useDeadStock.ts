import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export type AgingBucket = 'slow_moving' | 'stagnant' | 'dead_stock';

export interface ChannelSalesRecord {
  channel: string;
  lastSaleMonth: string;
  totalUnitsSold: number;
  avgDiscountPct: number;
  discountBands: string[];
}

export interface DeadStockItem {
  product_id: string;
  product_name: string;
  fc_code: string;
  category: string | null;
  current_stock: number;
  inventory_value: number;
  cash_locked: number;
  avg_daily_sales: number;
  sales_velocity: number;
  days_to_clear: number;
  curve_state: string | null;
  reason: string;
  markdown_risk_score: number;
  is_premium: boolean;
  collection_name: string | null;
  aging_bucket: AgingBucket;
  aging_label: string;
  daysSinceLastSale: number | null;
  lastSaleDate: string | null;
  channelHistory: ChannelSalesRecord[];
  recentVelocity: number | null;
  recentVelocityWindow: string | null;
}

export interface DeadStockSummary {
  total_items: number;
  total_locked_value: number;
  total_stock: number;
  by_bucket: Record<AgingBucket, { items: number; locked: number; stock: number }>;
}

function classifyAging(daysToClose: number): { bucket: AgingBucket; label: string } {
  if (daysToClose >= 9999 || daysToClose >= 365) {
    return { bucket: 'dead_stock', label: 'Hàng chết — không bán được' };
  }
  if (daysToClose >= 180) {
    return { bucket: 'stagnant', label: 'Tồn nặng — >180 ngày mới clear' };
  }
  return { bucket: 'slow_moving', label: 'Chậm bán — 90-180 ngày' };
}

export function useDeadStock(minInactiveDays: number = 90) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['dead-stock', tenantId, minInactiveDays],
    queryFn: async () => {
      // Single RPC call — no history fetch needed
      const candidatesRes = await client.rpc('fn_clearance_candidates', { p_tenant_id: tenantId, p_min_risk: 0 });
      if (candidatesRes.error) throw candidatesRes.error;
      const all = (candidatesRes.data || []) as any[];

      const deadItems: DeadStockItem[] = all
        .filter(r => {
          const dtc = r.days_to_clear ?? 9999;
          const vel = Number(r.avg_daily_sales || 0);
          return dtc >= minInactiveDays || vel <= 0;
        })
        .map(r => {
          const dtc = r.days_to_clear ?? 9999;
          const { bucket, label } = classifyAging(dtc);

          return {
            product_id: r.product_id,
            product_name: r.product_name || '—',
            fc_code: r.fc_code || '—',
            category: r.category || null,
            current_stock: Number(r.current_stock || 0),
            inventory_value: r.inventory_value ?? 0,
            cash_locked: r.cash_locked ?? 0,
            avg_daily_sales: Number(r.avg_daily_sales || 0),
            sales_velocity: Number(r.sales_velocity || 0),
            days_to_clear: dtc,
            curve_state: r.curve_state || null,
            reason: r.reason || '',
            markdown_risk_score: r.markdown_risk_score ?? 0,
            is_premium: r.is_premium === true,
            collection_name: r.collection_name || null,
            aging_bucket: bucket,
            aging_label: label,
            daysSinceLastSale: null,
            lastSaleDate: null,
            channelHistory: [],
            recentVelocity: null,
            recentVelocityWindow: null,
          };
        })
        .sort((a, b) => b.cash_locked - a.cash_locked);

      const summary: DeadStockSummary = {
        total_items: deadItems.length,
        total_locked_value: deadItems.reduce((s, i) => s + i.cash_locked, 0),
        total_stock: deadItems.reduce((s, i) => s + i.current_stock, 0),
        by_bucket: {
          slow_moving: { items: 0, locked: 0, stock: 0 },
          stagnant: { items: 0, locked: 0, stock: 0 },
          dead_stock: { items: 0, locked: 0, stock: 0 },
        },
      };
      deadItems.forEach(i => {
        const b = summary.by_bucket[i.aging_bucket];
        b.items++;
        b.locked += i.cash_locked;
        b.stock += i.current_stock;
      });

      return { items: deadItems, summary };
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
