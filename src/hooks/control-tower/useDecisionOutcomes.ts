import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export type OutcomeStatus = 'pending' | 'success' | 'partial' | 'failed' | 'exceeded';

export interface DecisionOutcome {
  id: string;
  decision_id: string;
  decision_title: string;
  decision_type: string;
  module_code: string;
  decision_date: string;
  
  // Predicted
  predicted_impact_amount: number | null;
  predicted_time_days: number | null;
  predicted_risk_reduction: number | null;
  
  // Actual
  actual_impact_amount: number | null;
  actual_time_days: number | null;
  actual_risk_reduction: number | null;
  
  // Analysis
  success_rate_percent: number | null;
  variance_percent: number | null;
  outcome_status: OutcomeStatus;
  learnings: string | null;
}

export interface OutcomeTrends {
  total_decisions: number;
  success_count: number;
  partial_count: number;
  failed_count: number;
  exceeded_count: number;
  overall_success_rate: number;
  avg_variance: number;
  by_type: {
    type: string;
    count: number;
    success_rate: number;
  }[];
}

export function useDecisionOutcomes(limit: number = 20) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-outcomes', tenantId, limit],
    queryFn: async (): Promise<DecisionOutcome[]> => {
      if (!tenantId) return [];

      // Use raw query since view may not be in generated types yet
      const { data, error } = await supabase
        .from('decision_outcome_records' as any)
        .select('*, decision_cards!inner(title, card_type, entity_type)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Outcome fetch error:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        decision_id: row.decision_id,
        decision_title: row.decision_cards?.title || 'Untitled',
        decision_type: row.decision_type || row.decision_cards?.card_type || 'unknown',
        module_code: row.decision_cards?.entity_type || 'OTHER',
        decision_date: row.decision_date || row.created_at,
        predicted_impact_amount: row.predicted_impact_amount || row.exposure_before,
        predicted_time_days: row.predicted_time_to_resolve_days,
        predicted_risk_reduction: row.predicted_risk_reduction,
        actual_impact_amount: row.actual_impact_amount || row.financial_delta_30d,
        actual_time_days: row.actual_time_to_resolve_days,
        actual_risk_reduction: row.actual_risk_reduction,
        success_rate_percent: row.success_rate_percent,
        variance_percent: row.variance_percent,
        outcome_status: mapOutcomeStatus(row.outcome_status || row.outcome_verdict),
        learnings: row.learnings,
      }));
    },
    enabled: !!tenantId,
  });
}

export function useOutcomeTrends() {
  const { data: outcomes } = useDecisionOutcomes(100);

  const trends: OutcomeTrends = {
    total_decisions: outcomes?.length || 0,
    success_count: outcomes?.filter(o => o.outcome_status === 'success').length || 0,
    partial_count: outcomes?.filter(o => o.outcome_status === 'partial').length || 0,
    failed_count: outcomes?.filter(o => o.outcome_status === 'failed').length || 0,
    exceeded_count: outcomes?.filter(o => o.outcome_status === 'exceeded').length || 0,
    overall_success_rate: 0,
    avg_variance: 0,
    by_type: [],
  };

  if (trends.total_decisions > 0) {
    trends.overall_success_rate = ((trends.success_count + trends.exceeded_count) / trends.total_decisions) * 100;
    
    const validVariances = outcomes?.filter(o => o.variance_percent != null) || [];
    if (validVariances.length > 0) {
      trends.avg_variance = validVariances.reduce((sum, o) => sum + (o.variance_percent || 0), 0) / validVariances.length;
    }

    // Group by type
    const typeMap = new Map<string, { count: number; success: number }>();
    outcomes?.forEach(o => {
      const existing = typeMap.get(o.decision_type) || { count: 0, success: 0 };
      existing.count++;
      if (o.outcome_status === 'success' || o.outcome_status === 'exceeded') {
        existing.success++;
      }
      typeMap.set(o.decision_type, existing);
    });

    trends.by_type = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      success_rate: (data.success / data.count) * 100,
    }));
  }

  return trends;
}

function mapOutcomeStatus(status: string | null): OutcomeStatus {
  switch (status) {
    case 'positive':
    case 'success':
      return 'success';
    case 'neutral':
    case 'partial':
      return 'partial';
    case 'negative':
    case 'failed':
      return 'failed';
    case 'exceeded':
      return 'exceeded';
    default:
      return 'pending';
  }
}

// Get outcome status color
export function getOutcomeStatusColor(status: OutcomeStatus): string {
  switch (status) {
    case 'success':
    case 'exceeded':
      return 'text-green-500';
    case 'partial':
      return 'text-yellow-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getOutcomeStatusBg(status: OutcomeStatus): string {
  switch (status) {
    case 'success':
    case 'exceeded':
      return 'bg-green-500/10 border-green-500/30';
    case 'partial':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'failed':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-muted/10 border-muted';
  }
}
