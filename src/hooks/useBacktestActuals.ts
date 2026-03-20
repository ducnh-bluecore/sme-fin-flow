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

      const { data, error } = await supabase.rpc('get_actual_monthly_revenue', {
        p_tenant_id: tenantId,
        p_months: months,
      });

      if (error) {
        console.error('[useBacktestActuals] Error:', error);
        return {};
      }

      const map: Record<string, number> = {};
      (data as unknown as ActualRevenue[])?.forEach((r) => {
        map[r.month] = Number(r.actual_revenue);
      });
      return map;
    },
    enabled: enabled && !!tenantId && months.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
