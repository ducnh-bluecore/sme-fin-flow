/**
 * useFDPLockedCosts
 * 
 * Hook to fetch locked costs from FDP with 3-level fallback chain.
 * Used by MDP for Profit ROAS calculation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { 
  CrossModuleData, 
  FDPCostData, 
  ConfidenceLevel,
  createCrossModuleData 
} from '@/types/cross-module';

interface UseFDPLockedCostsOptions {
  year?: number;
  month?: number;
}

export function useFDPLockedCosts(options: UseFDPLockedCostsOptions = {}) {
  const { data: tenantId } = useActiveTenantId();
  const year = options.year ?? new Date().getFullYear();
  const month = options.month ?? new Date().getMonth() + 1;

  return useQuery<CrossModuleData<FDPCostData>>({
    queryKey: ['fdp-locked-costs', tenantId, year, month],
    queryFn: async () => {
      if (!tenantId) {
        // Return default estimated data if no tenant
        return createCrossModuleData<FDPCostData>(
          { cogsPercent: 55, feePercent: 12 },
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      const { data, error } = await supabase.rpc('mdp_get_costs_for_roas', {
        p_tenant_id: tenantId,
        p_year: year,
        p_month: month,
      });

      if (error) {
        console.error('Error fetching FDP locked costs:', error);
        // Fallback to estimated on error
        return createCrossModuleData<FDPCostData>(
          { cogsPercent: 55, feePercent: 12 },
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const result = data?.[0];
      
      if (!result) {
        return createCrossModuleData<FDPCostData>(
          { cogsPercent: 55, feePercent: 12 },
          'ESTIMATED',
          'no_data',
          false
        );
      }

      return createCrossModuleData<FDPCostData>(
        {
          cogsPercent: result.cogs_percent ?? 55,
          feePercent: result.fee_percent ?? 12,
        },
        result.confidence_level as ConfidenceLevel,
        result.data_source ?? 'unknown',
        result.is_cross_module ?? false,
        result.is_cross_module ? 'FDP' : undefined
      );
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
