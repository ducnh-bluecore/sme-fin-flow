import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

export interface Scenario {
  name: string;
  retention_boost: number;
  aov_boost: number;
  discount_adjust: number;
}

export interface ScenarioResult {
  scenario_name: string;
  total_customers: number;
  total_equity_12m: number;
  total_equity_24m: number;
  avg_ltv_12m: number;
  delta_vs_base_12m: number;
  delta_percent_12m: number;
}

export interface DecayAlert {
  decay_type: string;
  population_name: string;
  current_value: number;
  previous_value: number;
  decline_percent: number;
  revenue_at_risk: number;
  severity: 'critical' | 'warning' | 'info';
  recommendation: string;
}

/**
 * Hook to compare LTV scenarios
 */
export function useLTVScenarioComparison(modelId: string | null, scenarios: Scenario[]) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-ltv-scenarios', tenantId, modelId, scenarios],
    queryFn: async () => {
      if (!tenantId || !modelId) return [];

      const { data, error } = await supabase.rpc('cdp_compare_ltv_scenarios', {
        p_tenant_id: tenantId,
        p_base_model_id: modelId,
        p_scenarios: JSON.parse(JSON.stringify(scenarios)),
      });

      if (error) {
        console.error('Scenario comparison error:', error);
        throw error;
      }

      return (data || []) as ScenarioResult[];
    },
    enabled: !!tenantId && !!modelId && scenarios.length > 0,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to detect LTV decay
 */
export function useLTVDecayDetection(threshold: number = 10) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cdp-ltv-decay', tenantId, threshold],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.rpc('cdp_detect_ltv_decay', {
        p_tenant_id: tenantId,
        p_threshold_percent: threshold,
      });

      if (error) {
        console.error('Decay detection error:', error);
        throw error;
      }

      return (data || []) as DecayAlert[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60000, // 5 minutes
    refetchInterval: 10 * 60000, // Refetch every 10 minutes
  });
}

/**
 * Hook to create a decision card from a decay alert
 */
export function useCreateDecayDecisionCard() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alert: DecayAlert) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('cdp_decision_cards')
        .insert({
          tenant_id: tenantId,
          source_type: 'MANUAL',
          source_ref: {
            trigger_source: 'ltv_decay_detection',
            trigger_data: {
              decay_type: alert.decay_type,
              population_name: alert.population_name,
              decline_percent: alert.decline_percent,
              revenue_at_risk: alert.revenue_at_risk,
            },
          },
          title: `[LTV Alert] ${alert.population_name} giảm ${alert.decline_percent.toFixed(1)}%`,
          summary: `Phát hiện ${alert.decay_type === 'COHORT_DECAY' ? 'suy giảm cohort' : 'mất cân bằng tier'}. ${alert.recommendation}`,
          category: 'VALUE',
          population_ref: { population_name: alert.population_name },
          priority: alert.severity === 'critical' ? 'P0' : 'P1',
          severity: alert.severity === 'critical' ? 'CRITICAL' : 'HIGH',
          status: 'NEW',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Đã tạo Thẻ Quyết định');
      queryClient.invalidateQueries({ queryKey: ['cdp-decision-cards'] });
    },
    onError: (error) => {
      console.error('Create decision card error:', error);
      toast.error('Không thể tạo Thẻ Quyết định');
    },
  });
}
