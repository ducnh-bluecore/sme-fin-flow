import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface DestSizeEntry {
  size: string;
  on_hand: number;
}

interface LookupKey {
  product_id: string;
  dest_store_id: string;
}

/**
 * Fetches ALL size inventory for given product(s) at destination store(s)
 * using server-side RPC fn_dest_size_inventory for performance.
 */
export function useDestinationSizeInventory(lookups: LookupKey[]) {
  const { isReady, tenantId } = useTenantQueryBuilder();

  // Deduplicate lookups
  const uniqueKeys = new Map<string, LookupKey>();
  for (const lk of lookups) {
    uniqueKeys.set(`${lk.product_id}__${lk.dest_store_id}`, lk);
  }
  const dedupedLookups = Array.from(uniqueKeys.values());

  return useQuery({
    queryKey: ['dest-size-inventory', tenantId, dedupedLookups.map(l => `${l.product_id}__${l.dest_store_id}`).sort()],
    queryFn: async () => {
      const result = new Map<string, DestSizeEntry[]>();
      if (dedupedLookups.length === 0 || !tenantId) return result;

      const queries = dedupedLookups.map(async ({ product_id, dest_store_id }) => {
        const { data, error } = await supabase.rpc('fn_dest_size_inventory', {
          p_tenant_id: tenantId,
          p_store_id: dest_store_id,
          p_fc_id: product_id,
        });

        if (error) {
          console.error('Error fetching dest size inventory via RPC:', error);
          return;
        }

        const entries: DestSizeEntry[] = ((data || []) as any[]).map(row => ({
          size: row.size_code || '',
          on_hand: Number(row.on_hand) || 0,
        })).filter(e => e.size);

        result.set(`${product_id}__${dest_store_id}`, entries);
      });

      await Promise.all(queries);
      return result;
    },
    enabled: isReady && dedupedLookups.length > 0 && !!tenantId,
    staleTime: 60_000,
  });
}
