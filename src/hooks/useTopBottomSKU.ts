/**
 * useTopBottomSKU - Fetch top/bottom products from v_top_products_30d
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface TopProductRow {
  sku: string;
  product_name: string;
  channel: string;
  total_revenue: number;
  total_orders: number;
  total_cogs: number;
  gross_margin: number;
  margin_percent: number;
}

export function useTopBottomSKU(limit = 5) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['top-bottom-sku', tenantId, limit],
    queryFn: async (): Promise<{ top: TopProductRow[]; bottom: TopProductRow[] }> => {
      if (!tenantId) return { top: [], bottom: [] };

      // Fetch all, sort client-side for top/bottom
      const { data, error } = await buildSelectQuery('v_top_products_30d', '*')
        .order('total_revenue', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useTopBottomSKU] Error:', error);
        return { top: [], bottom: [] };
      }

      const rows = (data as unknown as TopProductRow[]) || [];
      
      // Top by revenue
      const top = rows.slice(0, limit);
      
      // Bottom by margin (lowest margin_percent)
      const bottom = [...rows]
        .sort((a, b) => (a.margin_percent ?? 0) - (b.margin_percent ?? 0))
        .slice(0, limit);

      return { top, bottom };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
