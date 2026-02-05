/**
 * useFDPLockedCosts
 * 
 * Hook to fetch locked costs from FDP with 3-level fallback chain.
 * Used by MDP for Profit ROAS calculation.
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for RPC calls
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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

interface CostRPCResult {
  cogs_percent?: number;
  fee_percent?: number;
  confidence_level?: string;
  data_source?: string;
  is_cross_module?: boolean;
}

export function useFDPLockedCosts(options: UseFDPLockedCostsOptions = {}) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();
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

      // Use callRpc from useTenantQueryBuilder
      const { data, error } = await callRpc<CostRPCResult[]>('mdp_get_costs_for_roas', {
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
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
