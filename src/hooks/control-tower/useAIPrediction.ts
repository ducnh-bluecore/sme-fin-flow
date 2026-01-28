import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export interface ScenarioOutcome {
  label: string;
  impact_amount: number;
  risk_level: number;
  cascade_effects: number;
  confidence: number;
}

export interface AIPrediction {
  id: string;
  decision_card_id: string | null;
  alert_id: string | null;
  prediction_type: 'cost_of_inaction' | 'scenario_comparison' | 'outcome_forecast';
  
  // Parsed prediction result
  cost_of_inaction: {
    min_amount: number;
    max_amount: number;
    currency: string;
    risk_increase_percent: number;
    cascade_count: number;
    time_window_hours: number;
  } | null;
  
  scenarios: ScenarioOutcome[];
  
  confidence_score: number;
  model_used: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

// Fetch cached prediction or return null
export function useAIPrediction(cardId: string | null) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['ai-prediction', cardId, tenantId],
    queryFn: async (): Promise<AIPrediction | null> => {
      if (!cardId || !tenantId) return null;

      // Check for cached, non-expired prediction
      const { data, error } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('decision_card_id', cardId)
        .eq('tenant_id', tenantId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const result = data.prediction_result as any;
      
      return {
        id: data.id,
        decision_card_id: data.decision_card_id,
        alert_id: data.alert_id,
        prediction_type: data.prediction_type as any,
        cost_of_inaction: result?.cost_of_inaction || null,
        scenarios: result?.scenarios || [],
        confidence_score: data.confidence_score || 0.7,
        model_used: data.model_used || 'gemini-3-flash-preview',
        created_at: data.created_at,
        expires_at: data.expires_at || '',
        is_expired: new Date(data.expires_at || '') < new Date(),
      };
    },
    enabled: !!cardId && !!tenantId,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Generate new prediction via edge function
export function useGeneratePrediction() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      alertId,
      predictionType = 'cost_of_inaction' 
    }: { 
      cardId?: string; 
      alertId?: string;
      predictionType?: 'cost_of_inaction' | 'scenario_comparison' | 'outcome_forecast';
    }) => {
      if (!tenantId) throw new Error('No tenant');

      // Call edge function to generate prediction
      const { data, error } = await supabase.functions.invoke('ai-prediction', {
        body: {
          tenant_id: tenantId,
          decision_card_id: cardId,
          alert_id: alertId,
          prediction_type: predictionType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['ai-prediction', variables.cardId || variables.alertId] 
      });
    },
  });
}

// Scenario comparison hook
export function useScenarioComparison(cardId: string | null) {
  const { data: prediction } = useAIPrediction(cardId);
  
  // If no prediction with scenarios, provide default scenarios
  const scenarios: ScenarioOutcome[] = prediction?.scenarios?.length 
    ? prediction.scenarios 
    : [
        { label: 'Hành động ngay', impact_amount: 0, risk_level: 10, cascade_effects: 0, confidence: 0.8 },
        { label: 'Trì hoãn 24h', impact_amount: -15000000, risk_level: 25, cascade_effects: 1, confidence: 0.75 },
        { label: 'Trì hoãn 7 ngày', impact_amount: -85000000, risk_level: 60, cascade_effects: 3, confidence: 0.65 },
      ];

  return {
    scenarios,
    bestScenario: scenarios.reduce((best, s) => 
      s.impact_amount > best.impact_amount ? s : best
    , scenarios[0]),
    worstScenario: scenarios.reduce((worst, s) => 
      s.impact_amount < worst.impact_amount ? s : worst
    , scenarios[0]),
    isLoading: false,
  };
}

// Format currency for display
export function formatImpactAmount(amount: number, currency: string = 'VND'): string {
  const absAmount = Math.abs(amount);
  const prefix = amount < 0 ? '-' : '+';
  
  if (absAmount >= 1000000000) {
    return `${prefix}₫${(absAmount / 1000000000).toFixed(1)}B`;
  }
  if (absAmount >= 1000000) {
    return `${prefix}₫${(absAmount / 1000000).toFixed(0)}M`;
  }
  return `${prefix}₫${absAmount.toLocaleString()}`;
}
