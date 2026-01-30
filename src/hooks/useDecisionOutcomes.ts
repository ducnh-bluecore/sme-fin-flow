/**
 * useDecisionOutcomes - Decision outcome tracking
 * 
 * @architecture Schema-per-Tenant
 * @domain Control Tower/Decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['pending-followups', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('decisions_pending_followup')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PendingFollowup[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook để lấy outcomes của một decision
export function useDecisionOutcomes(decisionAuditId: string | null) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['decision-outcomes', tenantId, decisionAuditId],
    queryFn: async () => {
      if (!tenantId || !decisionAuditId) return [];

      let query = client
        .from('decision_outcomes')
        .select('*')
        .eq('decision_audit_id', decisionAuditId)
        .order('measured_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DecisionOutcome[];
    },
    enabled: !!tenantId && !!decisionAuditId && isReady,
  });
}

// Hook để ghi nhận outcome
export function useRecordOutcome() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

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

      const { data, error } = await client
        .from('decision_outcomes')
        .insert({
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
      await client
        .from('decision_audit_log')
        .update({ follow_up_status: 'completed' })
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
  const { client, tenantId } = useTenantSupabaseCompat();

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

      const { error } = await client
        .from('decision_audit_log')
        .update(updateData)
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['outcome-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('decision_outcomes')
        .select('outcome_status, actual_impact_amount, impact_variance, would_repeat');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        totalOutcomes: data.length,
        positiveCount: data.filter(d => d.outcome_status === 'positive').length,
        neutralCount: data.filter(d => d.outcome_status === 'neutral').length,
        negativeCount: data.filter(d => d.outcome_status === 'negative').length,
        tooEarlyCount: data.filter(d => d.outcome_status === 'too_early').length,
        wouldRepeatCount: data.filter(d => d.would_repeat === true).length,
        totalActualImpact: data.reduce((sum, d) => sum + (d.actual_impact_amount || 0), 0),
        avgVariancePercent: data.length > 0 
          ? data.reduce((sum, d) => sum + (d.impact_variance || 0), 0) / data.length 
          : 0,
        successRate: data.length > 0 
          ? (data.filter(d => d.outcome_status === 'positive').length / data.length) * 100 
          : 0,
      };

      return stats;
    },
    enabled: !!tenantId && isReady,
  });
}
