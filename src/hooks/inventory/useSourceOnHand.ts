import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { RebalanceSuggestion } from './useRebalanceSuggestions';

/**
 * Fetch source on-hand inventory for a list of suggestions.
 * Groups by (store_id, fc_id) so we can enrich each suggestion's source_on_hand.
 */
export function useSourceOnHand(suggestions: RebalanceSuggestion[]) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  // Collect unique (from_location, fc_id) pairs
  const lookupKeys = new Set<string>();
  for (const s of suggestions) {
    if (s.from_location && s.fc_id) {
      lookupKeys.add(`${s.from_location}|${s.fc_id}`);
    }
  }

  return useQuery({
    queryKey: ['inv-source-on-hand', tenantId, [...lookupKeys].sort().join(',')],
    queryFn: async () => {
      if (lookupKeys.size === 0) return new Map<string, number>();

      // Get unique store IDs
      const storeIds = [...new Set([...lookupKeys].map(k => k.split('|')[0]))];

      const PAGE_SIZE = 1000;
      const map = new Map<string, number>();
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, fc_id, on_hand')
          .in('store_id', storeIds)
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;
        const rows = (data || []) as any[];
        for (const row of rows) {
          const key = `${row.store_id}|${row.fc_id}`;
          map.set(key, (map.get(key) || 0) + (row.on_hand || 0));
        }
        hasMore = rows.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return map;
    },
    enabled: isReady && lookupKeys.size > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Enrich suggestions with source_on_hand from lookup map */
export function enrichWithSourceOnHand(
  suggestions: RebalanceSuggestion[],
  sourceMap: Map<string, number> | undefined,
): RebalanceSuggestion[] {
  if (!sourceMap || sourceMap.size === 0) return suggestions;
  return suggestions.map(s => {
    const key = `${s.from_location}|${s.fc_id}`;
    const sourceOnHand = sourceMap.get(key);
    if (sourceOnHand != null) {
      return {
        ...s,
        constraint_checks: {
          ...((s as any).constraint_checks || {}),
          source_on_hand: sourceOnHand,
        },
      } as any;
    }
    return s;
  });
}
