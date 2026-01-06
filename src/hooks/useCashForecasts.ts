import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface CashForecast {
  id: string;
  forecast_date: string;
  opening_balance: number;
  closing_balance: number;
  inflows: number | null;
  outflows: number | null;
  forecast_type: string | null;
  notes: string | null;
}

export function useCashForecasts() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['cash-forecasts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('cash_forecasts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('forecast_date', { ascending: true });

      if (error) {
        console.error('Error fetching cash forecasts:', error);
        throw error;
      }
      return (data || []) as CashForecast[];
    },
    enabled: !!tenantId && !tenantLoading,
    retry: 2,
    staleTime: 60000,
  });
}
