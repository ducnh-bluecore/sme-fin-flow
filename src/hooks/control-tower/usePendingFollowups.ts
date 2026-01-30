import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';

export interface PendingFollowup {
  id: string;
  tenant_id: string;
  decision_id: string | null;
  decision_type: string;
  decision_title: string;
  predicted_impact_amount: number | null;
  decided_at: string;
  followup_due_date: string;
  outcome_verdict: string;
  urgency_status: 'overdue' | 'due_soon' | 'upcoming';
  days_until_due: number;
}

export function usePendingFollowups() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['pending-followups', tenantId],
    queryFn: async (): Promise<PendingFollowup[]> => {
      if (!tenantId) return [];

      let query = client
        .from('v_decision_pending_followup')
        .select('*')
        .order('followup_due_date', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching pending followups:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        decision_id: row.decision_id,
        decision_type: row.decision_type,
        decision_title: row.decision_title,
        predicted_impact_amount: row.predicted_impact_amount,
        decided_at: row.decided_at,
        followup_due_date: row.followup_due_date,
        outcome_verdict: row.outcome_verdict,
        urgency_status: row.urgency_status,
        days_until_due: Math.round(row.days_until_due || 0),
      }));
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 60000, // Refresh every minute
  });
}
