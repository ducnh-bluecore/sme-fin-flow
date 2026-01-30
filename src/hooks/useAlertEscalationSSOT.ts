/**
 * useAlertEscalationSSOT - SSOT Thin Wrapper for Alert Escalation
 * 
 * Fetches escalation status from database views.
 * ALL escalation logic is in the database triggers/functions.
 * 
 * MANIFESTO COMPLIANCE:
 * - NO shouldEscalate computation
 * - NO time calculations
 * - ONLY fetch pre-computed status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';

// Types matching v_alerts_pending_escalation view
export interface AlertEscalationStatus {
  id: string;
  tenant_id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  assigned_to: string | null;
  deadline_at: string | null;
  age_hours: number;
  escalate_after_minutes: number | null;
  escalate_to_role: string | null;
  notify_channels: string[] | null;
  should_escalate: boolean;
  is_escalated: boolean;
}

export interface AlertEscalation {
  id: string;
  tenant_id: string;
  alert_id: string;
  escalated_at: string;
  escalated_to_role: string;
  escalation_reason: string | null;
  original_owner: string | null;
  resolution_status: 'pending' | 'acknowledged' | 'resolved';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

/**
 * Fetch alerts with their escalation status from DB view
 */
export function useAlertsEscalationStatus() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts-escalation-status', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('v_alerts_pending_escalation')
        .select('*')
        .order('age_hours', { ascending: false });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AlertEscalationStatus[];
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 60 * 1000, // Refetch every minute for escalation checks
  });

  // Pre-computed summaries (no client logic)
  const pendingEscalation = (alerts || []).filter(a => a.should_escalate && !a.is_escalated);
  const escalatedAlerts = (alerts || []).filter(a => a.is_escalated);
  const criticalAlerts = (alerts || []).filter(a => a.severity === 'critical');

  return {
    alerts: alerts || [],
    pendingEscalation,
    escalatedAlerts,
    criticalAlerts,
    counts: {
      total: alerts?.length || 0,
      pendingEscalation: pendingEscalation.length,
      escalated: escalatedAlerts.length,
      critical: criticalAlerts.length,
    },
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch escalation history
 */
export function useEscalationHistory(alertId?: string) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  const { data: escalations, isLoading } = useQuery({
    queryKey: ['escalation-history', tenantId, alertId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('alert_escalations')
        .select('*')
        .order('escalated_at', { ascending: false });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      if (alertId) {
        query = query.eq('alert_id', alertId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as AlertEscalation[];
    },
    enabled: !!tenantId && isReady,
  });

  return { escalations: escalations || [], isLoading };
}

/**
 * Manually trigger escalation check (calls DB function)
 */
export function useTriggerEscalationCheck() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client.rpc('auto_escalate_alerts');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-escalation-status', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['escalation-history', tenantId] });
      toast.success('Đã kiểm tra và cập nhật escalation');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}

/**
 * Acknowledge an escalation
 */
export function useAcknowledgeEscalation() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (escalationId: string) => {
      const { error } = await client
        .from('alert_escalations')
        .update({ resolution_status: 'acknowledged' })
        .eq('id', escalationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-escalation-status', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['escalation-history', tenantId] });
      toast.success('Đã xác nhận escalation');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}

/**
 * Resolve an escalation
 */
export function useResolveEscalation() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ escalationId, notes }: { escalationId: string; notes?: string }) => {
      const { error } = await client
        .from('alert_escalations')
        .update({ 
          resolution_status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', escalationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-escalation-status', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['escalation-history', tenantId] });
      toast.success('Đã giải quyết escalation');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
