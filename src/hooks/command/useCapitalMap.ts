/**
 * useCapitalMap - Capital distribution breakdown by category/season
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { fetchAllPages } from '@/hooks/inventory/fetchAllPages';

export interface CapitalMapItem {
  group: string;
  cashLocked: number;
  inventoryValue: number;
  lockedPct: number;
  productCount: number;
  stockUnits: number;
}

export function useCapitalMap(groupBy: 'category' | 'season' | 'collection' = 'category', dateFilter?: { startDate: string; endDate: string }) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['capital-map', tenantId, groupBy, dateFilter?.startDate, dateFilter?.endDate],
    queryFn: async (): Promise<CapitalMapItem[]> => {
      if (!tenantId) return [];

      // Fetch all pages for each data source
      const [cashLockRows, fcRows, stockRows, collRows] = await Promise.all([
        fetchAllPages(() => {
          let q = buildSelectQuery('state_cash_lock_daily', 'product_id, cash_locked_value, inventory_value, as_of_date')
            .order('cash_locked_value', { ascending: false });
          if (dateFilter?.startDate) q = q.gte('as_of_date', dateFilter.startDate);
          if (dateFilter?.endDate) q = q.lte('as_of_date', dateFilter.endDate);
          return q;
        }),
        fetchAllPages(() =>
          buildSelectQuery('inv_family_codes', 'id, category, season, collection_id')
            .eq('is_active', true)
        ),
        fetchAllPages(() =>
          buildSelectQuery('inv_state_positions', 'fc_id, on_hand')
        ),
        groupBy === 'collection'
          ? fetchAllPages(() => buildSelectQuery('inv_collections', 'id, collection_name'))
          : Promise.resolve([]),
      ]);

      // Build collection name map if needed
      const collectionMap = new Map<string, string>();
      if (groupBy === 'collection') {
        (collRows as any[]).forEach((c: any) => {
          collectionMap.set(c.id, c.collection_name);
        });
      }

      const fcMap = new Map<string, { category: string | null; season: string | null; collection_id: string | null }>();
      (fcRows as any[]).forEach((fc: any) => {
        fcMap.set(fc.id, { category: fc.category, season: fc.season, collection_id: fc.collection_id });
      });

      // Aggregate stock units by fc_id
      const stockByFc = new Map<string, number>();
      (stockRows as any[]).forEach((r: any) => {
        const fcId = r.fc_id;
        if (fcId) {
          stockByFc.set(fcId, (stockByFc.get(fcId) || 0) + (Number(r.on_hand) || 0));
        }
      });

      // Helper to resolve group key from fc_id
      const resolveKey = (fcId: string | undefined): string => {
        if (!fcId) return groupBy === 'collection' ? 'Chưa gán BST' : 'Chưa phân loại';
        const fc = fcMap.get(fcId);
        if (groupBy === 'category') return fc?.category || 'Chưa phân loại';
        if (groupBy === 'season') return fc?.season || 'Chưa phân loại';
        return (fc?.collection_id && collectionMap.get(fc.collection_id)) || 'Chưa gán BST';
      };

      // Aggregate by group
      const grouped = new Map<string, { cashLocked: number; inventoryValue: number; count: number; stockUnits: number }>();

      (cashLockRows as any[]).forEach((r: any) => {
        const key = resolveKey(r.product_id);
        
        if (!grouped.has(key)) {
          grouped.set(key, { cashLocked: 0, inventoryValue: 0, count: 0, stockUnits: 0 });
        }
        const g = grouped.get(key)!;
        g.cashLocked += Number(r.cash_locked_value) || 0;
        g.inventoryValue += Number(r.inventory_value) || 0;
        g.count += 1;
      });

      // Add stock units from inv_state_positions
      stockByFc.forEach((units, fcId) => {
        const key = resolveKey(fcId);
        if (!grouped.has(key)) {
          grouped.set(key, { cashLocked: 0, inventoryValue: 0, count: 0, stockUnits: 0 });
        }
        grouped.get(key)!.stockUnits += units;
      });

      const result: CapitalMapItem[] = [];
      grouped.forEach((v, k) => {
        result.push({
          group: k,
          cashLocked: v.cashLocked,
          inventoryValue: v.inventoryValue,
          lockedPct: v.inventoryValue > 0 ? (v.cashLocked / v.inventoryValue) * 100 : 0,
          productCount: v.count,
          stockUnits: v.stockUnits,
        });
      });

      return result.sort((a, b) => b.cashLocked - a.cashLocked);
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
