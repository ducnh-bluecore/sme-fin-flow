import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';

export interface EstimatedImpact {
  estimated_impact: number;
  confidence_level: 'LOW' | 'OBSERVED' | 'ESTIMATED';
  data_source: string;
  calculation_method: string;
  // Detailed breakdown for transparency
  metric_name: string;
  before_value: number;
  after_value: number;
  period_days: number;
  low_confidence_reason: string | null;
}

interface UseEstimatedActualImpactParams {
  decisionType: string;
  decisionDate: string;
  predictedImpact: number;
  enabled?: boolean;
}

export function useEstimatedActualImpact({
  decisionType,
  decisionDate,
  predictedImpact,
  enabled = true,
}: UseEstimatedActualImpactParams) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['estimated-actual-impact', tenantId, decisionType, decisionDate, predictedImpact],
    queryFn: async (): Promise<EstimatedImpact | null> => {
      if (!tenantId) return null;

      const { data, error } = await client
        .rpc('compute_estimated_actual_impact', {
          p_tenant_id: tenantId,
          p_decision_type: decisionType,
          p_decision_date: decisionDate,
          p_predicted_impact: predictedImpact,
        });

      if (error) {
        console.error('Error computing estimated actual impact:', error);
        return null;
      }

      // RPC returns array, get first row
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result) return null;

      return {
        estimated_impact: result.estimated_impact || 0,
        confidence_level: (result.confidence_level || 'LOW') as EstimatedImpact['confidence_level'],
        data_source: result.data_source || 'unknown',
        calculation_method: result.calculation_method || 'unknown',
        metric_name: result.metric_name || 'N/A',
        before_value: result.before_value || 0,
        after_value: result.after_value || 0,
        period_days: result.period_days || 0,
        low_confidence_reason: result.low_confidence_reason || null,
      };
    },
    enabled: enabled && !!tenantId && isReady && !!decisionType && !!decisionDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
