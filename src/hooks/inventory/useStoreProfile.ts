import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

interface BreakdownItem {
  label: string;
  units: number;
  pct: number;
}

interface StoreProfile {
  demandSpace: BreakdownItem[];
  sizeBreakdown: BreakdownItem[];
  colorBreakdown: BreakdownItem[];
  hasColorData: boolean;
  totalSold: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export function useStoreProfile(storeId: string | null) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery<StoreProfile>({
    queryKey: ['inv-store-profile', tenantId, storeId],
    queryFn: async () => {
      if (!storeId || !tenantId) throw new Error('Missing params');

      // Fetch date range from demand data
      const { data: dateRange } = await supabase
        .from('inv_state_demand' as any)
        .select('period_start, period_end')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .order('period_start', { ascending: true })
        .limit(1);
      
      const { data: dateRangeEnd } = await supabase
        .from('inv_state_demand' as any)
        .select('period_end')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .order('period_end', { ascending: false })
        .limit(1);

      const periodStart = (dateRange as any)?.[0]?.period_start || null;
      const periodEnd = (dateRangeEnd as any)?.[0]?.period_end || null;

      // Paginated fetch to handle large datasets
      const PAGE_SIZE = 1000;
      let allRows: any[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('v_inv_store_profile' as any)
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('store_id', storeId)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // Aggregate by demand_space
      const dsMap = new Map<string, number>();
      const sizeMap = new Map<string, number>();
      const colorMap = new Map<string, number>();
      let totalSold = 0;
      let hasColorData = false;

      for (const row of allRows) {
        const units = Number(row.units_sold) || 0;
        totalSold += units;

        const ds = row.demand_space || 'Không phân loại';
        dsMap.set(ds, (dsMap.get(ds) || 0) + units);

        const size = row.size || 'N/A';
        sizeMap.set(size, (sizeMap.get(size) || 0) + units);

        if (row.color) {
          hasColorData = true;
          colorMap.set(row.color, (colorMap.get(row.color) || 0) + units);
        }
      }

      const toBreakdown = (map: Map<string, number>): BreakdownItem[] => {
        const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
        return Array.from(map.entries())
          .map(([label, units]) => ({ label, units, pct: total > 0 ? (units / total) * 100 : 0 }))
          .sort((a, b) => b.units - a.units);
      };

      return {
        demandSpace: toBreakdown(dsMap),
        sizeBreakdown: toBreakdown(sizeMap),
        colorBreakdown: toBreakdown(colorMap),
        hasColorData,
        totalSold,
        periodStart,
        periodEnd,
      };
    },
    enabled: !!storeId && !!tenantId,
  });
}
