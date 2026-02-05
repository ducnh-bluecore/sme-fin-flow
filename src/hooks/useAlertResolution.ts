/**
 * Alert Resolution Hook - SSOT
 * 
 * Handles alert resolution workflow: start, complete, false positive.
 * All logic delegated to database RPCs.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain Control Tower/Alerts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

interface StartResolutionParams {
  alertId: string;
  assignedTo?: string;
}

interface CompleteResolutionParams {
  alertId: string;
  resolutionType: 'action_taken' | 'root_cause_fixed' | 'monitoring' | 'false_positive' | 'escalated' | 'auto_resolved';
  resolutionNotes?: string;
  rootCause?: string;
  actionsTaken?: string[];
}

interface FalsePositiveParams {
  alertId: string;
  reason: string;
}

export interface AlertWithResolution {
  id: string;
  tenant_id: string;
  alert_type: string;
  title: string;
  severity: string;
  alert_status: string;
  created_at: string;
  impact_amount: number | null;
  resolution_id: string | null;
  resolution_status: string;
  assigned_to: string | null;
  started_at: string | null;
  resolved_at: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  root_cause: string | null;
  time_to_resolve_minutes: number | null;
  follow_up_required: boolean | null;
  follow_up_date: string | null;
  minutes_in_progress: number | null;
  minutes_since_created: number;
}

export function useAlertsWithResolution() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['alerts-with-resolution', tenantId],
    queryFn: async (): Promise<AlertWithResolution[]> => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('v_alerts_with_resolution', '*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as AlertWithResolution[]) || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useStartAlertResolution() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ alertId, assignedTo }: StartResolutionParams) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await callRpc('start_alert_resolution', {
        p_tenant_id: tenantId,
        p_alert_id: alertId,
        p_assigned_to: assignedTo || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-with-resolution'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      toast.success('Đã bắt đầu xử lý alert', {
        description: 'Trạng thái đã chuyển sang "Đang xử lý"',
      });
    },
    onError: (error) => {
      console.error('Error starting resolution:', error);
      toast.error('Không thể bắt đầu xử lý');
    },
  });
}

export function useCompleteAlertResolution() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({
      alertId,
      resolutionType,
      resolutionNotes,
      rootCause,
      actionsTaken = [],
    }: CompleteResolutionParams) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await callRpc('complete_alert_resolution', {
        p_tenant_id: tenantId,
        p_alert_id: alertId,
        p_resolution_type: resolutionType,
        p_resolution_notes: resolutionNotes || null,
        p_root_cause: rootCause || null,
        p_actions_taken: JSON.stringify(actionsTaken),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-with-resolution'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      toast.success('Đã hoàn thành xử lý alert', {
        description: 'Alert đã được đánh dấu là đã xử lý',
      });
    },
    onError: (error) => {
      console.error('Error completing resolution:', error);
      toast.error('Không thể hoàn thành xử lý');
    },
  });
}

export function useMarkAlertFalsePositive() {
  const queryClient = useQueryClient();
  const { callRpc, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ alertId, reason }: FalsePositiveParams) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await callRpc('mark_alert_false_positive', {
        p_tenant_id: tenantId,
        p_alert_id: alertId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-with-resolution'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      toast.success('Đã đánh dấu False Positive', {
        description: 'Alert sẽ không được tính vào thống kê',
      });
    },
    onError: (error) => {
      console.error('Error marking false positive:', error);
      toast.error('Không thể đánh dấu false positive');
    },
  });
}
