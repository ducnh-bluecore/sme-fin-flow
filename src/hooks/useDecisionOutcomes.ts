/**
 * useDecisionOutcomes - Decision outcome tracking
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain Control Tower/Decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface DecisionOutcome {
  id: string;
  tenant_id: string;
  decision_audit_id: string;
  measured_at: string;
  measured_by: string | null;
  actual_impact_amount: number | null;
  impact_variance: number | null;
  impact_variance_percent: number | null;
  outcome_status: 'positive' | 'neutral' | 'negative' | 'too_early';
  outcome_summary: string;
  outcome_details: string | null;
  lessons_learned: string | null;
  would_repeat: boolean | null;
  supporting_metrics: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PendingFollowup {
  id: string;
  tenant_id: string;
  card_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  selected_action_type: string | null;
  selected_action_label: string | null;
  decided_at: string;
  follow_up_date: string;
  follow_up_status: string;
  expected_impact_amount: number | null;
  expected_outcome: string | null;
  original_impact: number | null;
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  outcome_count: number;
}

// Hook để lấy danh sách decisions cần follow-up
export function usePendingFollowups() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['pending-followups', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('decisions_pending_followup', '*');

      if (error) throw error;
      return (data || []) as unknown as PendingFollowup[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook để lấy outcomes của một decision
export function useDecisionOutcomes(decisionAuditId: string | null) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['decision-outcomes', tenantId, decisionAuditId],
    queryFn: async () => {
      if (!tenantId || !decisionAuditId) return [];

      const { data, error } = await buildSelectQuery('decision_outcomes', '*')
        .eq('decision_audit_id', decisionAuditId)
        .order('measured_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DecisionOutcome[];
    },
    enabled: !!tenantId && !!decisionAuditId && isReady,
  });
}

// Hook để ghi nhận outcome
export function useRecordOutcome() {
  const queryClient = useQueryClient();
  const { client, buildInsertQuery, buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (payload: {
      decisionAuditId: string;
      actualImpactAmount?: number;
      expectedImpactAmount?: number;
      outcomeStatus: 'positive' | 'neutral' | 'negative' | 'too_early';
      outcomeSummary: string;
      outcomeDetails?: string;
      lessonsLearned?: string;
      wouldRepeat?: boolean;
      supportingMetrics?: Record<string, any>;
    }) => {
      if (!tenantId) throw new Error('Missing tenantId');

      const { data: { user } } = await client.auth.getUser();

      // Calculate variance if both values provided
      let impactVariance: number | null = null;
      let impactVariancePercent: number | null = null;
      
      if (payload.actualImpactAmount != null && payload.expectedImpactAmount != null) {
        impactVariance = payload.actualImpactAmount - payload.expectedImpactAmount;
        if (payload.expectedImpactAmount !== 0) {
          impactVariancePercent = (impactVariance / Math.abs(payload.expectedImpactAmount)) * 100;
        }
      }

      const { data, error } = await buildInsertQuery('decision_outcomes', {
        tenant_id: tenantId,
        decision_audit_id: payload.decisionAuditId,
        measured_by: user?.id ?? null,
        actual_impact_amount: payload.actualImpactAmount ?? null,
        impact_variance: impactVariance,
        impact_variance_percent: impactVariancePercent,
        outcome_status: payload.outcomeStatus,
        outcome_summary: payload.outcomeSummary,
        outcome_details: payload.outcomeDetails ?? null,
        lessons_learned: payload.lessonsLearned ?? null,
        would_repeat: payload.wouldRepeat ?? null,
        supporting_metrics: payload.supportingMetrics ?? null,
      })
        .select()
        .single();

      if (error) throw error;

      // Update follow-up status
      await buildUpdateQuery('decision_audit_log', { follow_up_status: 'completed' })
        .eq('id', payload.decisionAuditId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] });
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
      queryClient.invalidateQueries({ queryKey: ['outcome-history'] });
      toast.success('Đã ghi nhận kết quả quyết định');
    },
    onError: (error) => {
      console.error('Error recording outcome:', error);
      toast.error('Không thể ghi nhận kết quả');
    },
  });
}

// Hook để cập nhật follow-up status
export function useUpdateFollowupStatus() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({
      decisionAuditId,
      status,
      followUpDate,
    }: {
      decisionAuditId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
      followUpDate?: string;
    }) => {
      if (!tenantId) throw new Error('Missing tenantId');

      const updateData: Record<string, any> = {
        follow_up_status: status,
      };
      
      if (followUpDate) {
        updateData.follow_up_date = followUpDate;
      }

      const { error } = await buildUpdateQuery('decision_audit_log', updateData)
        .eq('id', decisionAuditId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] });
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
    },
  });
}

// Hook để lấy thống kê outcomes
export function useOutcomeStats() {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['outcome-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await callRpc('get_decision_outcome_stats', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      const result = data as unknown as any;
      return {
        totalOutcomes: Number(result?.total_outcomes) || 0,
        positiveCount: Number(result?.positive_count) || 0,
        neutralCount: Number(result?.neutral_count) || 0,
        negativeCount: Number(result?.negative_count) || 0,
        tooEarlyCount: Number(result?.too_early_count) || 0,
        wouldRepeatCount: Number(result?.would_repeat_count) || 0,
        totalActualImpact: Number(result?.total_actual_impact) || 0,
        avgVariancePercent: Number(result?.avg_variance_percent) || 0,
        successRate: Number(result?.success_rate) || 0,
      };
    },
    enabled: !!tenantId && isReady,
  });
}
