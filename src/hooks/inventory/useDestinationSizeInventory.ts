import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface DestSizeEntry {
  size: string;
  on_hand: number;
}

// Standard size order for sorting
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FS'];

function sizeSort(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

/**
 * Extract size code from SKU suffix.
 * Pattern: SKU ends with size code like "222011792M" -> "M", "222011792XL" -> "XL"
 */
function extractSizeFromSku(sku: string): string | null {
  if (!sku) return null;
  const match = sku.match(/(XXS|XXL|2XL|3XL|XS|XL|FS|S|M|L)$/i);
  return match ? match[1].toUpperCase() : null;
}

interface LookupKey {
  product_id: string;
  dest_store_id: string;
}

/**
 * Fetches ALL size inventory for given product(s) at destination store(s)
 * from inv_state_positions, not just sizes in transfer suggestions.
 */
export function useDestinationSizeInventory(lookups: LookupKey[]) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  // Group by dest_store_id to batch queries (1 query per store instead of 1 per product)
  const storeGroups = new Map<string, Set<string>>();
  for (const { product_id, dest_store_id } of lookups) {
    if (!storeGroups.has(dest_store_id)) storeGroups.set(dest_store_id, new Set());
    storeGroups.get(dest_store_id)!.add(product_id);
  }

  const storeIds = Array.from(storeGroups.keys()).sort();

  return useQuery({
    queryKey: ['dest-size-inventory', tenantId, storeIds],
    queryFn: async () => {
      const result = new Map<string, DestSizeEntry[]>();
      if (storeGroups.size === 0) return result;

      // 1 query per destination store (batch all product_ids with .in())
      const queries = Array.from(storeGroups.entries()).map(async ([storeId, productIds]) => {
        const ids = Array.from(productIds);
        const { data, error } = await buildSelectQuery('inv_state_positions', 'fc_id, sku, on_hand')
          .eq('store_id', storeId)
          .in('fc_id', ids);

        if (error) {
          console.error('Error fetching dest size inventory:', error);
          return;
        }

        // Group results by fc_id (product_id)
        const byProduct = new Map<string, Map<string, number>>();
        ((data || []) as any[]).forEach(row => {
          const size = extractSizeFromSku(row.sku || '');
          if (!size) return;
          const fcId = row.fc_id as string;
          if (!byProduct.has(fcId)) byProduct.set(fcId, new Map());
          const sizeMap = byProduct.get(fcId)!;
          sizeMap.set(size, (sizeMap.get(size) || 0) + (row.on_hand || 0));
        });

        for (const pid of ids) {
          const sizeMap = byProduct.get(pid) || new Map();
          const entries: DestSizeEntry[] = Array.from(sizeMap.entries())
            .map(([size, on_hand]) => ({ size, on_hand }))
            .sort((a, b) => sizeSort(a.size, b.size));
          result.set(`${pid}__${storeId}`, entries);
        }
      });

      await Promise.all(queries);
      return result;
    },
    enabled: isReady && storeGroups.size > 0,
    staleTime: 60_000,
  });
}
