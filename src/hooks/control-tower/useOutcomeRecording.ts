import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
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
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (payload: OutcomeRecordPayload) => {
      if (!tenantId) throw new Error('Missing tenant ID');

      const { data: user } = await client.auth.getUser();

      // Insert outcome record
      const { data, error } = await client
        .from('decision_outcome_records')
        .insert({
          tenant_id: tenantId,
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
        await client
          .from('alert_instances')
          .update({
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
