/**
 * CDP COMMAND CENTER HOOK
 * 
 * Independent Command Center for Customer/Segment decisions.
 * Fetches only CDP-domain decisions from decision_cards table.
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Database-first: No computation in this hook
 * - Independent: Operates without other Command Centers
 * - SSOT: All data from decision_cards table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import {
  DecisionContract,
  DecisionStatus,
  DecisionSeverity,
  DecisionOwnerRole,
  DecisionActionType,
  CommandCenterDomain,
  MetricGrain,
  deduplicateDecisions,
} from './contracts';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CDPCommandCenterFilters {
  status?: DecisionStatus[];
  severity?: DecisionSeverity[];
  ownerRole?: string[];
  limit?: number;
}

export interface CDPCommandCenterResult {
  decisions: DecisionContract[];
  counts: {
    total: number;
    open: number;
    inProgress: number;
    decided: number;
    critical: number;
    overdue: number;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// CDP DECISION TYPES
// ═══════════════════════════════════════════════════════════════════

const CDP_CARD_TYPES = [
  'CDP_CHURN_RISK',
  'CDP_SEGMENT_DECLINE',
  'CDP_EQUITY_DROP',
  'CDP_LTV_DECREASE',
  'CDP_SPEND_SHIFT',
  'CDP_VELOCITY_SLOW',
  'CDP_REACTIVATION',
  'CDP_RETENTION_ALERT',
  'CDP_VIP_AT_RISK',
  'CDP_COHORT_ANOMALY',
];

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useCDPCommandCenter(
  filters: CDPCommandCenterFilters = {}
): CDPCommandCenterResult {
  const { data: tenantId } = useActiveTenantId();
  
  const {
    status = ['OPEN', 'IN_PROGRESS'],
    severity,
    ownerRole,
    limit = 50,
  } = filters;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cdp-command-center', tenantId, status, severity, ownerRole, limit],
    queryFn: async (): Promise<DecisionContract[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('decision_cards')
        .select(`
          *,
          facts:decision_card_facts(*),
          actions:decision_card_actions(*)
        `)
        .eq('tenant_id', tenantId)
        .in('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter for CDP card types only
      let filtered = (data || []).filter(row => {
        const cardType = (row as Record<string, unknown>).card_type as string;
        return cardType?.startsWith('CDP_') || CDP_CARD_TYPES.includes(cardType);
      });

      // Apply optional filters
      if (severity && severity.length > 0) {
        filtered = filtered.filter(row => 
          severity.includes((row as Record<string, unknown>).severity as DecisionSeverity)
        );
      }

      if (ownerRole && ownerRole.length > 0) {
        filtered = filtered.filter(row => 
          ownerRole.includes((row as Record<string, unknown>).owner_role as string)
        );
      }

      // Transform and deduplicate
      const decisions = filtered.map(row => transformToDecisionContract(row, 'CDP'));
      return deduplicateDecisions(decisions);
    },
    enabled: !!tenantId,
  });

  const decisions = data || [];
  const now = new Date();

  return {
    decisions,
    counts: {
      total: decisions.length,
      open: decisions.filter(d => d.status === 'OPEN').length,
      inProgress: decisions.filter(d => d.status === 'IN_PROGRESS').length,
      decided: decisions.filter(d => d.status === 'DECIDED').length,
      critical: decisions.filter(d => d.severity === 'critical').length,
      overdue: decisions.filter(d => 
        d.status === 'OPEN' && new Date(d.deadline_at) < now
      ).length,
    },
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export function useCDPDecide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      outcome,
      note,
      decidedBy,
    }: {
      decisionId: string;
      outcome: string;
      note?: string;
      decidedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          status: 'DECIDED',
          decision_outcome: outcome,
          decision_note: note,
          decided_by: decidedBy,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-command-center'] });
      toast.success('Đã ghi nhận quyết định CDP');
    },
    onError: (error) => {
      console.error('CDP Decision error:', error);
      toast.error('Không thể ghi nhận quyết định');
    },
  });
}

export function useCDPEscalate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      reason,
    }: {
      decisionId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          status: 'ESCALATED',
          escalated_to: 'CONTROL_TOWER',
          escalation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-command-center'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-command-center'] });
      toast.success('Đã leo thang lên Control Tower');
    },
    onError: (error) => {
      console.error('CDP Escalation error:', error);
      toast.error('Không thể leo thang quyết định');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function transformToDecisionContract(
  row: unknown,
  domain: 'CDP'
): DecisionContract {
  const r = row as Record<string, unknown>;
  const facts = (r.facts as Array<Record<string, unknown>>) || [];
  const actions = (r.actions as Array<Record<string, unknown>>) || [];

  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    domain,
    decision_type: (r.card_type as string) || 'CDP_UNKNOWN',
    entity_type: ((r.entity_type as string) || 'segment') as MetricGrain,
    entity_id: (r.entity_id as string) || '',
    entity_name: (r.entity_label as string) || '',
    metric_code: (r.metric_code as string) || 'unknown',
    metric_version: 1,
    period: (r.period as string) || getCurrentPeriod(),
    title: (r.title as string) || '',
    problem_statement: (r.description as string) || (r.impact_description as string) || '',
    severity: mapSeverity(r.severity as string),
    status: (r.status as DecisionStatus) || 'OPEN',
    owner_role: ((r.owner_role as string) || 'CEO') as DecisionOwnerRole,
    owner_user_id: r.owner_user_id as string | undefined,
    impact_amount: (r.impact_amount as number) || 0,
    impact_description: r.impact_description as string | undefined,
    deadline_at: (r.deadline_at as string) || new Date().toISOString(),
    deadline_hours: calculateDeadlineHours(r.deadline_at as string),
    facts: facts.map(f => ({
      fact_id: f.id as string,
      label: f.label as string,
      value: f.value as string | number,
      unit: (f.unit as string) || '',
      trend: mapTrend(f.trend as string),
      status: mapFactStatus(f.status as string),
      metric_code: f.metric_code as string | undefined,
    })),
    actions: actions.map(a => ({
      action_id: a.id as string,
      label: a.label as string,
      action_type: ((a.action_type as string) || 'INVESTIGATE') as DecisionActionType,
      is_recommended: (a.is_recommended as boolean) || false,
      projected_impact: a.projected_impact as number | undefined,
    })),
    evidence: {
      as_of_timestamp: r.created_at as string,
      source_tables: ['decision_cards'],
      data_quality_flags: ['complete'],
      confidence_score: (r.confidence as number) || 0.8,
    },
    recommended_action: r.recommended_action as string | undefined,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    decision_outcome: r.decision_outcome as string | undefined,
    decision_note: r.decision_note as string | undefined,
    decided_by: r.decided_by as string | undefined,
    decided_at: r.decided_at as string | undefined,
    escalated_to: r.escalated_to as CommandCenterDomain | undefined,
    snoozed_until: r.snoozed_until as string | undefined,
  };
}

function mapSeverity(value: string | undefined): DecisionSeverity {
  if (!value) return 'medium';
  const lower = value.toLowerCase();
  if (lower === 'critical' || lower === 'p0') return 'critical';
  if (lower === 'high' || lower === 'p1') return 'high';
  if (lower === 'low' || lower === 'p3') return 'low';
  return 'medium';
}

function mapTrend(value: string | undefined): 'up' | 'down' | 'flat' | undefined {
  if (!value) return undefined;
  if (value === 'up') return 'up';
  if (value === 'down') return 'down';
  return 'flat';
}

function mapFactStatus(value: string | undefined): 'good' | 'warning' | 'bad' | 'neutral' {
  if (!value) return 'neutral';
  if (value === 'good' || value === 'positive') return 'good';
  if (value === 'bad' || value === 'negative') return 'bad';
  if (value === 'warning') return 'warning';
  return 'neutral';
}

function calculateDeadlineHours(deadlineAt: string | undefined): number {
  if (!deadlineAt) return 24;
  const deadline = new Date(deadlineAt);
  const now = new Date();
  return Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
