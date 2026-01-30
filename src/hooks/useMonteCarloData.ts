/**
 * Monte Carlo Simulation Data Hook
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';

export interface MonteCarloResultDB {
  id: string;
  scenario_id: string | null;
  simulation_count: number;
  mean_ebitda: number | null;
  std_dev_ebitda: number | null;
  p10_ebitda: number | null;
  p50_ebitda: number | null;
  p90_ebitda: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  distribution_data: any | null;
  created_by: string | null;
  created_at: string;
}

// Fetch all Monte Carlo results
export function useMonteCarloResults(scenarioId?: string) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['monte-carlo-results', tenantId, scenarioId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('monte_carlo_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      if (scenarioId) {
        query = query.eq('scenario_id', scenarioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MonteCarloResultDB[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Save Monte Carlo result
export function useSaveMonteCarloResult() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (result: {
      scenario_id: string | null;
      simulation_count: number;
      mean_ebitda: number;
      std_dev_ebitda: number;
      p10_ebitda: number;
      p50_ebitda: number;
      p90_ebitda: number;
      min_ebitda: number;
      max_ebitda: number;
      distribution_data: any;
      created_by: string | null;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client
        .from('monte_carlo_results')
        .insert({
          ...result,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monte-carlo-results', tenantId] });
      toast.success('Đã lưu kết quả mô phỏng Monte Carlo');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Delete Monte Carlo result
export function useDeleteMonteCarloResult() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('monte_carlo_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monte-carlo-results', tenantId] });
      toast.success('Đã xóa kết quả mô phỏng');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
