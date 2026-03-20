import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

interface ActualRevenue {
  month: string;
  actual_revenue: number;
}

export function useBacktestActuals(months: string[], enabled: boolean) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['backtest-actuals', tenantId, months],
    queryFn: async () => {
      if (!tenantId || months.length === 0) return {};

      console.log('[useBacktestActuals] Fetching actuals for months:', months, 'tenant:', tenantId);

      const { data, error } = await supabase.rpc('get_actual_monthly_revenue', {
        p_tenant_id: tenantId,
        p_months: months,
      });

      if (error) {
        console.error('[useBacktestActuals] RPC Error:', error);
        return {};
      }

      console.log('[useBacktestActuals] Raw response:', data);

      const map: Record<string, number> = {};
      (data as unknown as ActualRevenue[])?.forEach((r) => {
        map[r.month] = Number(r.actual_revenue);
      });
      console.log('[useBacktestActuals] Mapped actuals:', map);
      return map;
    },
    enabled: enabled && !!tenantId && months.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
