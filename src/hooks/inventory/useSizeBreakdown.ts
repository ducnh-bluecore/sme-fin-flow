import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface SizeStockEntry {
  sku: string;
  size_code: string;
  store_name: string;
  on_hand: number;
}

export interface SizeSummary {
  size_code: string;
  total: number;
}

/**
 * Fetch size-level inventory breakdown for a given FC (product_id).
 * Uses latest snapshot only.
 */
export function useSizeBreakdown(fcId?: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['size-breakdown', tenantId, fcId],
    queryFn: async () => {
      // Get latest snapshot
      const snapRes = await client
        .from('inv_state_positions')
        .select('snapshot_date')
        .eq('tenant_id', tenantId!)
        .order('snapshot_date', { ascending: false })
        .limit(1);
      const latestDate = (snapRes.data as any)?.[0]?.snapshot_date;
      if (!latestDate) return { entries: [], summary: [] };

      // Get SKUs for this FC
      const skuRes = await client
        .from('inv_sku_fc_mapping' as any)
        .select('sku, size_code')
        .eq('tenant_id', tenantId!)
        .eq('fc_id', fcId!)
        .eq('is_active', true);
      if (skuRes.error) throw skuRes.error;
      const skuMap = new Map<string, string>();
      ((skuRes.data || []) as any[]).forEach((r: any) => {
        skuMap.set(r.sku, r.size_code || r.sku);
      });
      const skus = Array.from(skuMap.keys());
      if (skus.length === 0) return { entries: [], summary: [] };

      // Get positions
      const posRes = await client
        .from('inv_state_positions')
        .select('sku, store_id, on_hand')
        .eq('tenant_id', tenantId!)
        .eq('snapshot_date', latestDate)
        .in('sku', skus)
        .gt('on_hand', 0);
      if (posRes.error) throw posRes.error;

      // Get store names
      const storeIds = [...new Set(((posRes.data || []) as any[]).map((r: any) => r.store_id))];
      const storeRes = await client
        .from('inv_stores' as any)
        .select('id, store_name')
        .eq('tenant_id', tenantId!)
        .in('id', storeIds);
      const storeMap = new Map<string, string>();
      ((storeRes.data || []) as any[]).forEach((r: any) => {
        storeMap.set(r.id, r.store_name || r.id);
      });

      const entries: SizeStockEntry[] = ((posRes.data || []) as any[]).map((r: any) => ({
        sku: r.sku,
        size_code: skuMap.get(r.sku) || r.sku,
        store_name: storeMap.get(r.store_id) || r.store_id,
        on_hand: Number(r.on_hand),
      }));

      // Summary by size
      const sizeAgg = new Map<string, number>();
      entries.forEach(e => {
        sizeAgg.set(e.size_code, (sizeAgg.get(e.size_code) || 0) + e.on_hand);
      });
      const summary: SizeSummary[] = Array.from(sizeAgg.entries())
        .map(([size_code, total]) => ({ size_code, total }))
        .sort((a, b) => b.total - a.total);

      return { entries, summary };
    },
    enabled: isReady && !!tenantId && !!fcId,
    staleTime: 5 * 60 * 1000,
  });
}
