/**
 * useCapitalMap - Capital distribution breakdown by category/season
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface CapitalMapItem {
  group: string;
  cashLocked: number;
  inventoryValue: number;
  lockedPct: number;
  productCount: number;
}

export function useCapitalMap(groupBy: 'category' | 'season' = 'category') {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['capital-map', tenantId, groupBy],
    queryFn: async (): Promise<CapitalMapItem[]> => {
      if (!tenantId) return [];

      const [cashLockRes, fcRes] = await Promise.all([
        buildSelectQuery('state_cash_lock_daily', 'product_id, cash_locked_value, inventory_value')
          .order('cash_locked_value', { ascending: false })
          .limit(1000),
        buildSelectQuery('inv_family_codes', 'id, category, season')
          .eq('is_active', true)
          .limit(2000),
      ]);

      const fcMap = new Map<string, { category: string | null; season: string | null }>();
      ((fcRes.data || []) as any[]).forEach((fc: any) => {
        fcMap.set(fc.id, { category: fc.category, season: fc.season });
      });

      // Aggregate by group
      const grouped = new Map<string, { cashLocked: number; inventoryValue: number; count: number }>();

      ((cashLockRes.data || []) as any[]).forEach((r: any) => {
        const fc = fcMap.get(r.product_id);
        const key = (groupBy === 'category' ? fc?.category : fc?.season) || 'Chưa phân loại';
        
        if (!grouped.has(key)) {
          grouped.set(key, { cashLocked: 0, inventoryValue: 0, count: 0 });
        }
        const g = grouped.get(key)!;
        g.cashLocked += Number(r.cash_locked_value) || 0;
        g.inventoryValue += Number(r.inventory_value) || 0;
        g.count += 1;
      });

      const result: CapitalMapItem[] = [];
      grouped.forEach((v, k) => {
        result.push({
          group: k,
          cashLocked: v.cashLocked,
          inventoryValue: v.inventoryValue,
          lockedPct: v.inventoryValue > 0 ? (v.cashLocked / v.inventoryValue) * 100 : 0,
          productCount: v.count,
        });
      });

      return result.sort((a, b) => b.cashLocked - a.cashLocked);
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
