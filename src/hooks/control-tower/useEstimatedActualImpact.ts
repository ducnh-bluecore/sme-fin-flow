import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface EstimatedImpact {
  estimated_impact: number;
  confidence_level: 'LOW' | 'OBSERVED' | 'ESTIMATED';
  data_source: string;
  calculation_method: string;
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['estimated-actual-impact', tenantId, decisionType, decisionDate, predictedImpact],
    queryFn: async (): Promise<EstimatedImpact | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
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
      };
    },
    enabled: enabled && !!tenantId && !!decisionType && !!decisionDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
