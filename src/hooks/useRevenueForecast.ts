import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface ForecastMonth {
  month: string;
  returning_revenue: number;
  returning_breakdown: CohortBreakdown[];
  new_revenue: number;
  new_customers: number;
  ads_revenue: number;
  ads_spend: number;
  roas: number;
  total_conservative: number;
  total_base: number;
  total_optimistic: number;
  growth_factor: number;
  seasonal_multiplier?: number;
  historical_avg_ads_spend?: number | null;
  has_ads_data?: boolean;
  actual_revenue?: number;
}

export interface CohortBreakdown {
  cohort_month: string;
  cohort_size: number;
  retention_pct: number;
  returning_customers: number;
  revenue: number;
}

export interface ForecastParams {
  horizonMonths: number;
  adsSpend: number;
  roasOverride: number | null;
  growthAdj: number;
  asOfDate?: string | null; // 'YYYY-MM-DD' for backtesting
  backtestMonths?: string[];
}

function getBacktestCutoff(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 0)).toISOString().slice(0, 10);
}

export function useRevenueForecast(params: ForecastParams) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['revenue-forecast', tenantId, params],
    queryFn: async () => {
      if (!tenantId) return null;

      const backtestMonths = [...new Set(params.backtestMonths ?? [])].sort();

      if (backtestMonths.length > 0) {
        const monthResults = await Promise.all(
          backtestMonths.map(async (month) => {
            const { data, error } = await supabase.rpc('forecast_revenue_cohort_based', {
              p_tenant_id: tenantId,
              p_horizon_months: 1,
              p_ads_spend: params.adsSpend,
              p_roas_override: params.roasOverride,
              p_growth_adj: params.growthAdj,
              p_as_of_date: getBacktestCutoff(month),
            });

            if (error) throw error;

            const result = (data as unknown as ForecastMonth[]) || [];
            return result[0] ?? null;
          })
        );

        return monthResults.filter((item): item is ForecastMonth => item !== null);
      }

      const { data, error } = await supabase.rpc('forecast_revenue_cohort_based', {
        p_tenant_id: tenantId,
        p_horizon_months: params.horizonMonths,
        p_ads_spend: params.adsSpend,
        p_roas_override: params.roasOverride,
        p_growth_adj: params.growthAdj,
        p_as_of_date: params.asOfDate || null,
      });

      if (error) throw error;
      return (data as unknown as ForecastMonth[]) || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
