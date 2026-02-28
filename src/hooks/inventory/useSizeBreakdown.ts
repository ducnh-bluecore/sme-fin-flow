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
 * Delegates all logic to database RPC fn_size_breakdown (SSOT).
 */
export function useSizeBreakdown(fcId?: string) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['size-breakdown', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await client.rpc('fn_size_breakdown' as any, {
        p_tenant_id: tenantId!,
        p_fc_id: fcId!,
      });

      if (error) throw error;

      const result = data as any as { entries: SizeStockEntry[]; summary: SizeSummary[] };
      return {
        entries: result?.entries || [],
        summary: result?.summary || [],
      };
    },
    enabled: isReady && !!tenantId && !!fcId,
    staleTime: 5 * 60 * 1000,
  });
}
