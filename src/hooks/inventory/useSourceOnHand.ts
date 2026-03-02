import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { RebalanceSuggestion } from './useRebalanceSuggestions';

/**
 * Fetch source & dest on-hand inventory for a list of suggestions.
 * Groups by (store_id, fc_id) using ONLY the latest snapshot_date per store.
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

      // Step 1: Get latest snapshot_date per store
      const latestSnapshotMap = new Map<string, string>();
      const STORE_BATCH = 30;
      for (let si = 0; si < storeArr.length; si += STORE_BATCH) {
        const storeBatch = storeArr.slice(si, si + STORE_BATCH);
        const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, snapshot_date')
          .in('store_id', storeBatch)
          .order('snapshot_date', { ascending: false })
          .limit(500);
        if (error) throw error;
        for (const row of (data || []) as any[]) {
          // Keep only first (latest) per store
          if (!latestSnapshotMap.has(row.store_id)) {
            latestSnapshotMap.set(row.store_id, row.snapshot_date);
          }
        }
      }

      // Step 2: Fetch on_hand filtered by latest snapshot per store
      // Group stores by their latest snapshot_date for efficient querying
      const dateToStores = new Map<string, string[]>();
      for (const [storeId, snapDate] of latestSnapshotMap) {
        if (!dateToStores.has(snapDate)) dateToStores.set(snapDate, []);
        dateToStores.get(snapDate)!.push(storeId);
      }

      const PAGE_SIZE = 1000;
      const map = new Map<string, number>();
      const FC_BATCH = 50;

      for (const [snapDate, stores] of dateToStores) {
        for (let fi = 0; fi < fcArr.length; fi += FC_BATCH) {
          const fcBatch = fcArr.slice(fi, fi + FC_BATCH);
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await buildSelectQuery('inv_state_positions', 'store_id, fc_id, on_hand')
              .in('store_id', stores)
              .in('fc_id', fcBatch)
              .eq('snapshot_date', snapDate)
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
      }

      return map;
    },
    enabled: isReady && storeArr.length > 0 && fcArr.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch 7-day sales (sold_7d) for dest stores by fc_id from inv_state_demand.
 * Uses avg_daily_sales * 7 as approximation.
 */
export function useDestSold7d(suggestions: RebalanceSuggestion[]) {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  const destStoreIds = new Set<string>();
  const fcIds = new Set<string>();
  for (const s of suggestions) {
    if (s.to_location) destStoreIds.add(s.to_location);
    if (s.fc_id) fcIds.add(s.fc_id);
  }

  const storeArr = [...destStoreIds].filter(Boolean);
  const fcArr = [...fcIds].filter(Boolean);

  return useQuery({
    queryKey: ['inv-dest-sold-7d', tenantId, storeArr.length, fcArr.length],
    queryFn: async () => {
      if (storeArr.length === 0 || fcArr.length === 0) return new Map<string, number>();

      const PAGE_SIZE = 1000;
      const map = new Map<string, number>();
      const FC_BATCH = 50;

      for (let fi = 0; fi < fcArr.length; fi += FC_BATCH) {
        const fcBatch = fcArr.slice(fi, fi + FC_BATCH);
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await buildSelectQuery(
            'inv_state_demand',
            'store_id, fc_id, avg_daily_sales, total_sold'
          )
            .in('store_id', storeArr)
            .in('fc_id', fcBatch)
            .order('period_end', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) throw error;
          const rows = (data || []) as any[];
          for (const row of rows) {
            const key = `${row.store_id}|${row.fc_id}`;
            // Only keep first (latest) entry per key
            if (!map.has(key)) {
              const sold7d = row.avg_daily_sales != null
                ? Math.round(row.avg_daily_sales * 7)
                : null;
              if (sold7d != null) map.set(key, sold7d);
            }
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

/**
 * Enrich suggestions with FRESH source_on_hand, dest_on_hand, and sold_7d.
 * Always overrides engine-baked values with live data to prevent stale readings.
 */
export function enrichWithSourceOnHand(
  suggestions: RebalanceSuggestion[],
  positionMap: Map<string, number> | undefined,
  sold7dMap?: Map<string, number>,
): RebalanceSuggestion[] {
  if ((!positionMap || positionMap.size === 0) && (!sold7dMap || sold7dMap.size === 0)) return suggestions;
  return suggestions.map(s => {
    const sourceKey = `${s.from_location}|${s.fc_id}`;
    const destKey = `${s.to_location}|${s.fc_id}`;
    const sourceOnHand = positionMap?.get(sourceKey);
    const destOnHand = positionMap?.get(destKey);
    const sold7d = sold7dMap?.get(destKey);

    const existingCC = (s as any).constraint_checks || {};
    const hasUpdates = sourceOnHand != null || destOnHand != null || sold7d != null;

    if (!hasUpdates) return s;

    return {
      ...s,
      constraint_checks: {
        ...existingCC,
        // Always override with fresh live data
        ...(sourceOnHand != null ? { source_on_hand: sourceOnHand } : {}),
        ...(destOnHand != null ? { dest_on_hand: destOnHand, current_stock: destOnHand } : {}),
        ...(sold7d != null ? { sold_7d: sold7d } : {}),
      },
    } as any;
  });
}
