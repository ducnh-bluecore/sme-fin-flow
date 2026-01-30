/**
 * useCDPRevenueAllocation
 * 
 * Hook to manage CDP → FDP revenue allocation bridge.
 * Allows pushing CDP What-If scenarios to FDP for financial planning.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

interface RevenueAllocation {
  id: string;
  cdpScenarioId?: string;
  cdpScenarioName?: string;
  totalEquity12m: number;
  quarterlyWeights: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
  };
  monthlyAllocation: Record<string, number>;
  fdpScenarioId?: string;
  status: 'draft' | 'active' | 'archived';
  syncedAt?: string;
  createdAt: string;
}

export function useCDPRevenueAllocations() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery<RevenueAllocation[]>({
    queryKey: ['cdp-revenue-allocations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('revenue_allocation_bridge')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching revenue allocations:', error);
        return [];
      }

      return (data ?? []).map((row): RevenueAllocation => ({
        id: row.id,
        cdpScenarioId: row.cdp_scenario_id ?? undefined,
        cdpScenarioName: row.cdp_scenario_name ?? undefined,
        totalEquity12m: row.total_equity_12m ?? 0,
        quarterlyWeights: (row.quarterly_weights as RevenueAllocation['quarterlyWeights']) ?? {
          Q1: 0.25,
          Q2: 0.25,
          Q3: 0.25,
          Q4: 0.25,
        },
        monthlyAllocation: (row.monthly_allocation as Record<string, number>) ?? {},
        fdpScenarioId: row.fdp_scenario_id ?? undefined,
        status: (row.status as RevenueAllocation['status']) ?? 'draft',
        syncedAt: row.synced_at ?? undefined,
        createdAt: row.created_at,
      }));
    },
    enabled: !!tenantId && isReady,
  });
}

interface PushRevenueParams {
  equity12m: number;
  quarterlyWeights?: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
  };
  fdpScenarioId?: string;
}

export function usePushRevenueToFDP() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PushRevenueParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('cdp_push_revenue_to_fdp', {
        p_tenant_id: tenantId,
        p_equity_12m: params.equity12m,
        p_quarterly_weights: params.quarterlyWeights ?? {
          Q1: 0.25,
          Q2: 0.25,
          Q3: 0.25,
          Q4: 0.25,
        },
        p_fdp_scenario_id: params.fdpScenarioId ?? null,
      });

      if (error) throw error;
      return data as string; // Returns bridge_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-revenue-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['cross-module-revenue-forecast'] });
    },
  });
}

export function useCrossModuleRevenueForecasts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const year = new Date().getFullYear();

  return useQuery({
    queryKey: ['cross-module-revenue-forecast', tenantId, year],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('cross_module_revenue_forecast')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching revenue forecasts:', error);
        return [];
      }

      return data ?? [];
    },
    enabled: !!tenantId && isReady,
  });
}
