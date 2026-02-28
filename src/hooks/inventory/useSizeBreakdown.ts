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
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['size-breakdown', tenantId, fcId],
    queryFn: async () => {
      const { data, error } = await callRpc<{ entries: SizeStockEntry[]; summary: SizeSummary[] }>('fn_size_breakdown', {
        p_tenant_id: tenantId!,
        p_fc_id: fcId!,
      });

      if (error) throw error;

      return {
        entries: data?.entries || [],
        summary: data?.summary || [],
      };
    },
    enabled: isReady && !!tenantId && !!fcId,
    staleTime: 5 * 60 * 1000,
  });
}
