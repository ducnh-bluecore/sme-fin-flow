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

  // Deduplicate lookups
  const uniqueKeys = Array.from(
    new Map(lookups.map(k => [`${k.product_id}__${k.dest_store_id}`, k])).values()
  );

  return useQuery({
    queryKey: ['dest-size-inventory', tenantId, uniqueKeys.map(k => `${k.product_id}:${k.dest_store_id}`)],
    queryFn: async () => {
      const result = new Map<string, DestSizeEntry[]>();
      if (uniqueKeys.length === 0) return result;

      // Query all at once using OR conditions via multiple queries in parallel
      const queries = uniqueKeys.map(async ({ product_id, dest_store_id }) => {
        const { data, error } = await buildSelectQuery('inv_state_positions', 'sku, on_hand')
          .eq('fc_id', product_id)
          .eq('store_id', dest_store_id);

        if (error) {
          console.error('Error fetching dest size inventory:', error);
          return;
        }

        const sizeMap = new Map<string, number>();
        ((data || []) as any[]).forEach(row => {
          const size = extractSizeFromSku(row.sku || '');
          if (size) {
            sizeMap.set(size, (sizeMap.get(size) || 0) + (row.on_hand || 0));
          }
        });

        const entries: DestSizeEntry[] = Array.from(sizeMap.entries())
          .map(([size, on_hand]) => ({ size, on_hand }))
          .sort((a, b) => sizeSort(a.size, b.size));

        result.set(`${product_id}__${dest_store_id}`, entries);
      });

      await Promise.all(queries);
      return result;
    },
    enabled: isReady && uniqueKeys.length > 0,
    staleTime: 60_000,
  });
}
