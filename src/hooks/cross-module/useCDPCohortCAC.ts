/**
 * useCDPCohortCAC
 * 
 * Hook to fetch CAC data for LTV/CAC ratio calculation.
 * Uses 3-level fallback chain (Locked → Observed → Estimated).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import {
  CrossModuleData,
  ConfidenceLevel,
  createCrossModuleData,
} from '@/types/cross-module';

interface CACData {
  cacPerCustomer: number;
}

interface UseCDPCACOptions {
  cohortMonth?: string;
  channel?: string;
}

interface CACRPCResult {
  cac_per_customer: number;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

export function useCDPCohortCAC(options: UseCDPCACOptions = {}) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery<CrossModuleData<CACData>>({
    queryKey: ['cdp-cohort-cac', tenantId, options.cohortMonth, options.channel],
    queryFn: async () => {
      if (!tenantId) {
        return createCrossModuleData<CACData>(
          { cacPerCustomer: 150000 },
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      // Use raw SQL call for new functions not in types yet
      const { data, error } = await supabase.rpc('cdp_get_cac_for_ltv' as any, {
        p_tenant_id: tenantId,
        p_cohort_month: options.cohortMonth ?? null,
        p_channel: options.channel ?? null,
      });

      if (error) {
        console.error('Error fetching CAC data:', error);
        return createCrossModuleData<CACData>(
          { cacPerCustomer: 150000 },
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const results = data as CACRPCResult[] | null;
      const result = results?.[0];

      if (!result) {
        return createCrossModuleData<CACData>(
          { cacPerCustomer: 150000 },
          'ESTIMATED',
          'no_data',
          false
        );
      }

      return createCrossModuleData<CACData>(
        { cacPerCustomer: result.cac_per_customer ?? 150000 },
        result.confidence_level as ConfidenceLevel,
        result.data_source ?? 'unknown',
        result.is_cross_module ?? false,
        result.is_cross_module ? 'MDP' : undefined
      );
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

interface CohortCACRow {
  id: string;
  tenant_id: string;
  cohort_month: string;
  acquisition_channel: string | null;
  total_spend: number | null;
  new_customers: number | null;
  cac_per_customer: number | null;
  source_module: string | null;
  confidence_level: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all cohort CAC records
 */
export function useCDPAllCohortCAC() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-all-cohort-cac', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('cdp_customer_cohort_cac' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('cohort_month', { ascending: false });

      if (error) {
        console.error('Error fetching all cohort CAC:', error);
        return [];
      }

      return (data ?? []) as unknown as CohortCACRow[];
    },
    enabled: !!tenantId,
  });
}
