/**
 * useOutcomeRecording
 * 
 * Hook to record decision outcomes.
 * Part of Control Tower - Decision Tracking.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

export type OutcomeVerdict = 'better_than_expected' | 'as_expected' | 'worse_than_expected' | 'pending_followup';

export interface OutcomeRecordPayload {
  alertId?: string;
  decisionId?: string;
  decisionTitle: string;
  decisionType: string;
  predictedImpactAmount: number;
  actualImpactAmount?: number;
  outcomeVerdict: OutcomeVerdict;
  outcomeNotes?: string;
  followupDueDate?: string; // ISO date string
}

export function useRecordOutcome() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, buildUpdateQuery, client, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (payload: OutcomeRecordPayload) => {
      if (!tenantId) throw new Error('Missing tenant ID');

      const { data: user } = await client.auth.getUser();

      // Insert outcome record using buildInsertQuery (auto-adds tenant_id)
      const { data, error } = await buildInsertQuery('decision_outcome_records', {
        alert_id: payload.alertId || null,
        decision_id: payload.decisionId || null,
        decision_title: payload.decisionTitle,
        decision_type: payload.decisionType,
        metric_code: `${payload.decisionType}_outcome`,
        decided_by_role: 'user',
        decided_by_user_id: user?.user?.id || null,
        predicted_impact_amount: payload.predictedImpactAmount,
        actual_impact_amount: payload.actualImpactAmount || null,
        outcome_verdict: payload.outcomeVerdict,
        outcome_notes: payload.outcomeNotes || null,
        followup_due_date: payload.followupDueDate || null,
        decided_at: new Date().toISOString(),
        decision_date: new Date().toISOString(),
      })
        .select()
        .single();

      if (error) throw error;

      // If linked to alert, update alert status to resolved
      if (payload.alertId) {
        await buildUpdateQuery('alert_instances', {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.user?.id || null,
          resolution_notes: payload.outcomeNotes || null,
        })
          .eq('id', payload.alertId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['decision-effectiveness'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] });
      toast.success('Đã ghi nhận kết quả quyết định');
    },
    onError: (error: Error) => {
      console.error('Error recording outcome:', error);
      toast.error('Không thể ghi nhận kết quả: ' + error.message);
    },
  });
}
