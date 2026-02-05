/**
 * useAudit - Audit event hooks
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useToast } from "@/hooks/use-toast";

export interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_type: 'USER' | 'SYSTEM' | 'ML' | 'GUARDRAIL';
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  decision_context: string | null;
  reason_code: string | null;
  reason_detail: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditSummary {
  totalEvents: number;
  periodDays: number;
  byAction: Record<string, number>;
  byActorType: Record<string, number>;
  byResourceType: Record<string, number>;
  byDay: Record<string, number>;
}

export interface SOCControl {
  id: string;
  control_id: string;
  control_name: string;
  control_description: string;
  implementation_status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'NOT_APPLICABLE';
  evidence_type: string;
  evidence_reference: string | null;
  last_tested_at: string | null;
  tested_by: string | null;
  test_result: 'PASS' | 'FAIL' | 'PENDING' | null;
  notes: string | null;
}

export interface EvidencePack {
  metadata: {
    generatedAt: string;
    periodStart: string;
    periodEnd: string;
    tenantId: string;
    version: string;
  };
  summary: {
    totalAuditEvents: number;
    totalReconciliations: number;
    autoReconciliations: number;
    manualReconciliations: number;
    voidedReconciliations: number;
    guardrailBlocks: number;
    mlPredictions: number;
    driftSignals: number;
    decisionSnapshots: number;
  };
  integrity: {
    evidenceHash: string;
    recordCounts: Record<string, number>;
  };
}

export interface AuditFilters {
  start?: string;
  end?: string;
  action?: string;
  resourceType?: string;
  actorType?: string;
  limit?: number;
  offset?: number;
}

export function useAuditEvents(filters: AuditFilters = {}) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['audit-events', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const params = new URLSearchParams();
      if (filters.start) params.set('start', filters.start);
      if (filters.end) params.set('end', filters.end);
      if (filters.action) params.set('action', filters.action);
      if (filters.resourceType) params.set('resource_type', filters.resourceType);
      if (filters.actorType) params.set('actor_type', filters.actorType);
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.offset) params.set('offset', filters.offset.toString());

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit/events?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit events');
      }

      return response.json() as Promise<{ events: AuditEvent[]; total: number; limit: number; offset: number }>;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useAuditSummary(days = 30) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['audit-summary', tenantId, days],
    queryFn: async (): Promise<AuditSummary> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit/summary?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit summary');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSOCControls() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['soc-controls', tenantId],
    queryFn: async (): Promise<SOCControl[]> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit/controls`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch SOC controls');
      }

      const data = await response.json();
      return data.controls;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useExportAudit() {
  const { client, tenantId } = useTenantQueryBuilder();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ start, end, format = 'json', action, resourceType }: {
      start?: string;
      end?: string;
      format?: 'json' | 'csv';
      action?: string;
      resourceType?: string;
    }) => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      params.set('format', format);
      if (action) params.set('action', action);
      if (resourceType) params.set('resource_type', resourceType);

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit/export?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export audit data');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-export-${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true };
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Audit data has been exported successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useEvidencePack() {
  const { client, tenantId } = useTenantQueryBuilder();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (period: '7d' | '30d' | '90d' = '30d'): Promise<EvidencePack> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit/evidence-pack/${period}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate evidence pack');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Evidence Pack Generated",
        description: `${data.summary.totalAuditEvents} events included. Hash: ${data.integrity.evidenceHash.slice(0, 8)}...`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper functions
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'CREATE_RECONCILIATION': 'Created Reconciliation',
    'VOID_RECONCILIATION': 'Voided Reconciliation',
    'CREATE_DECISION_SNAPSHOT': 'Created Decision Snapshot',
    'ML_PREDICTION': 'ML Prediction',
    'GUARDRAIL_BLOCK': 'Guardrail Block',
    'GUARDRAIL_AUTO': 'Auto Reconciliation',
    'ML_KILL_SWITCH': 'ML Kill Switch',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

export function getActorTypeColor(actorType: string): string {
  switch (actorType) {
    case 'USER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'SYSTEM': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    case 'ML': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'GUARDRAIL': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getResourceTypeIcon(resourceType: string): string {
  switch (resourceType) {
    case 'reconciliation_link': return '🔗';
    case 'decision_snapshot': return '📊';
    case 'invoice': return '📄';
    case 'bank_transaction': return '🏦';
    case 'exception': return '⚠️';
    default: return '📁';
  }
}
