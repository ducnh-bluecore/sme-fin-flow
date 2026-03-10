import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

interface AvgUnitPrice {
  sku: string;
  avg_unit_price: number;
  total_revenue: number;
  total_qty: number;
}

/**
 * Fetches actual average unit prices per SKU from cdp_order_items.
 * Returns a Map<sku, avg_unit_price> for O(1) lookups.
 */
export function useAvgUnitPrices() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-avg-unit-prices', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'v_inv_avg_unit_price',
        'sku, avg_unit_price'
      ).limit(1000);
      if (error) throw error;

      const priceMap = new Map<string, number>();
      for (const row of (data || []) as unknown as AvgUnitPrice[]) {
        if (row.sku && row.avg_unit_price > 0) {
          priceMap.set(row.sku, row.avg_unit_price);
        }
      }
      return priceMap;
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes - prices don't change often
  });
}
