import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { RebalanceSuggestion } from './useRebalanceSuggestions';

/**
 * Fetch source & dest on-hand inventory for a list of suggestions.
 * Groups by (store_id, fc_id) so we can enrich each suggestion.
 */
export function useSourceOnHand(suggestions: RebalanceSuggestion[]) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  // Collect unique store IDs (both source and dest)
  const storeIds = new Set<string>();
  const fcIds = new Set<string>();
  for (const s of suggestions) {
    if (s.from_location) storeIds.add(s.from_location);
    if (s.to_location) storeIds.add(s.to_location);
    if (s.fc_id) fcIds.add(s.fc_id);
  }

  const storeArr = [...storeIds].filter(Boolean);
  const fcArr = [...fcIds].filter(Boolean);

  return useQuery({
    queryKey: ['inv-source-dest-on-hand', tenantId, storeArr.length, fcArr.length],
    queryFn: async () => {
      if (storeArr.length === 0 || fcArr.length === 0) return new Map<string, number>();

      const PAGE_SIZE = 1000;
      const map = new Map<string, number>();

      // Batch fc_ids in chunks to avoid URL length limits
      const FC_BATCH = 50;
      for (let fi = 0; fi < fcArr.length; fi += FC_BATCH) {
        const fcBatch = fcArr.slice(fi, fi + FC_BATCH);
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, fc_id, on_hand')
            .in('store_id', storeArr)
            .in('fc_id', fcBatch)
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
      }

      return map;
    },
    enabled: isReady && storeArr.length > 0 && fcArr.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Enrich suggestions with source_on_hand and dest_on_hand from lookup map */
export function enrichWithSourceOnHand(
  suggestions: RebalanceSuggestion[],
  positionMap: Map<string, number> | undefined,
): RebalanceSuggestion[] {
  if (!positionMap || positionMap.size === 0) return suggestions;
  return suggestions.map(s => {
    const sourceKey = `${s.from_location}|${s.fc_id}`;
    const destKey = `${s.to_location}|${s.fc_id}`;
    const sourceOnHand = positionMap.get(sourceKey);
    const destOnHand = positionMap.get(destKey);

    const existingCC = (s as any).constraint_checks || {};
    const needsEnrich = (sourceOnHand != null && existingCC.source_on_hand == null) ||
                        (destOnHand != null && existingCC.dest_on_hand == null && existingCC.current_stock == null);

    if (!needsEnrich) return s;

    return {
      ...s,
      constraint_checks: {
        ...existingCC,
        ...(sourceOnHand != null && existingCC.source_on_hand == null ? { source_on_hand: sourceOnHand } : {}),
        ...(destOnHand != null && existingCC.dest_on_hand == null && existingCC.current_stock == null ? { dest_on_hand: destOnHand } : {}),
      },
    } as any;
  });
}
