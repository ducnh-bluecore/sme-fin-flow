/**
 * useBoardSummary - Board Summary Data Hook
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

// Types matching edge function response
export interface BoardSummary {
  financialTruth: {
    cashToday: { value: number; truthLevel: string; authority: string; snapshotId: string | null };
    cashNext7d: { value: number; truthLevel: string; confidence: number; snapshotId: string | null };
  };
  risk: {
    totalArOverdue: number;
    largestRisk: { amount: number; description: string } | null;
    aging: { days_0_7: number; days_8_30: number; days_30_plus: number };
    openExceptions: number;
  };
  controls: {
    autoRate: number;
    manualRate: number;
    guardrailBlockRate: number;
    falseAutoRate: number;
    totalReconciliations: number;
  };
  ml: {
    status: 'ACTIVE' | 'LIMITED' | 'DISABLED';
    accuracy: number | null;
    calibrationError: number | null;
    driftSignals: Array<{ type: string; severity: string; metric: string }>;
    lastFallbackReason: string | null;
  };
  governance: {
    lastAuditEvent: string | null;
    totalAuditEvents: number;
    openApprovals: number;
    policyCoverage: number;
    auditReadyChecklist: {
      appendOnlyLedger: boolean;
      approvalWorkflows: boolean;
      auditorAccess: boolean;
      mlKillSwitch: boolean;
    };
  };
  delta: {
    cashChange: { value: number; percent: number };
    riskChange: { value: number; percent: number };
    newExceptions: number;
    policyChanges: number;
    mlStatusChanged: boolean;
  };
  period: {
    start: string;
    end: string;
    comparisonStart: string;
    comparisonEnd: string;
  };
}

export function useBoardSummary(period: '7d' | '30d' | '90d' = '30d') {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['board-summary', tenantId, period],
    queryFn: async (): Promise<BoardSummary | null> => {
      if (!tenantId) return null;

      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) return null;

      const response = await client.functions.invoke('board-summary', {
        body: null,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch board summary');
      }

      return response.data as BoardSummary;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes for board view
  });
}

// Helper functions for UI
export function getMLStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10';
    case 'LIMITED': return 'text-amber-500 bg-amber-500/10';
    case 'DISABLED': return 'text-red-500 bg-red-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getMLStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'LIMITED': return 'Limited Mode';
    case 'DISABLED': return 'Disabled';
    default: return 'Unknown';
  }
}

export function getDeltaIndicator(value: number): { icon: 'up' | 'down' | 'neutral'; color: string } {
  if (value > 0) return { icon: 'up', color: 'text-emerald-500' };
  if (value < 0) return { icon: 'down', color: 'text-red-500' };
  return { icon: 'neutral', color: 'text-muted-foreground' };
}

export function getDriftSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}
