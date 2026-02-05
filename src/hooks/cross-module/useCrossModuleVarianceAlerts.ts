/**
 * useCrossModuleVarianceAlerts
 * 
 * Hook to fetch and manage cross-domain variance alerts.
 * Used by Control Tower for cross-module monitoring.
 * 
 * Migrated to Schema-per-Tenant architecture v1.4.1.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { CrossDomainVarianceAlert, SourceModule } from '@/types/cross-module';

interface UseVarianceAlertsOptions {
  status?: 'open' | 'acknowledged' | 'resolved' | 'dismissed' | 'all';
  severity?: 'info' | 'warning' | 'critical' | 'all';
}

export function useCrossModuleVarianceAlerts(options: UseVarianceAlertsOptions = {}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { status = 'open', severity = 'all' } = options;

  return useQuery<CrossDomainVarianceAlert[]>({
    queryKey: ['cross-module-variance-alerts', tenantId, status, severity],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = buildSelectQuery('cross_domain_variance_alerts', '*')
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (severity !== 'all') {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching variance alerts:', error);
        return [];
      }

      return (data ?? []).map((row: any): CrossDomainVarianceAlert => ({
        id: row.id,
        alertType: row.alert_type as CrossDomainVarianceAlert['alertType'],
        sourceModule: row.source_module as SourceModule,
        targetModule: row.target_module as SourceModule,
        metricCode: row.metric_code,
        expectedValue: row.expected_value ?? 0,
        actualValue: row.actual_value ?? 0,
        variancePercent: row.variance_percent ?? 0,
        varianceAmount: row.variance_amount ?? 0,
        severity: row.severity as CrossDomainVarianceAlert['severity'],
        status: row.status as CrossDomainVarianceAlert['status'],
        assignedTo: row.assigned_to ?? undefined,
        evidenceSnapshot: row.evidence_snapshot as Record<string, unknown> | undefined,
        createdAt: row.created_at,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAcknowledgeVarianceAlert() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await buildUpdateQuery('cross_domain_variance_alerts', {
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-module-variance-alerts'] });
    },
  });
}

export function useResolveVarianceAlert() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { error } = await buildUpdateQuery('cross_domain_variance_alerts', {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-module-variance-alerts'] });
    },
  });
}

export function useDismissVarianceAlert() {
  const { buildUpdateQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { error } = await buildUpdateQuery('cross_domain_variance_alerts', {
        status: 'dismissed',
        resolution_notes: notes,
      })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-module-variance-alerts'] });
    },
  });
}

export function useDetectVarianceAlerts() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await callRpc('detect_cross_domain_variance', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross-module-variance-alerts'] });
    },
  });
}
