/**
 * CONTROL TOWER COMMAND CENTER HOOK
 * 
 * Cross-system escalation Command Center.
 * Receives escalated decisions from FDP, MDP, CDP.
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Database-first: No computation in this hook
 * - Independent: Can operate standalone
 * - SSOT: All data from decision_cards table
 * - Escalation: OPTIONAL - not forced on domain Command Centers
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

export interface ControlTowerFilters {
  status?: DecisionStatus[];
  severity?: DecisionSeverity[];
  sourceDomain?: CommandCenterDomain[];
  ownerRole?: string[];
  includeNonEscalated?: boolean;
  limit?: number;
}

export interface ControlTowerResult {
  /** All escalated decisions */
  escalatedDecisions: DecisionContract[];
  
  /** Grouped by source domain */
  bySourceDomain: {
    FDP: DecisionContract[];
    MDP: DecisionContract[];
    CDP: DecisionContract[];
  };
  
  /** Counts */
  counts: {
    total: number;
    fromFDP: number;
    fromMDP: number;
    fromCDP: number;
    critical: number;
    overdue: number;
  };
  
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useControlTowerCommandCenter(
  filters: ControlTowerFilters = {}
): ControlTowerResult {
  const { data: tenantId } = useActiveTenantId();
  
  const {
    status = ['ESCALATED', 'OPEN', 'IN_PROGRESS'],
    severity,
    sourceDomain,
    ownerRole,
    includeNonEscalated = false,
    limit = 100,
  } = filters;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['control-tower-command-center', tenantId, status, severity, sourceDomain, ownerRole, includeNonEscalated, limit],
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

      // Filter for escalated decisions or Control Tower specific
      let filtered = (data || []).filter(row => {
        const r = row as Record<string, unknown>;
        const cardType = r.card_type as string;
        const escalatedTo = r.escalated_to as string;
        const cardStatus = r.status as string;
        
        // Include if explicitly escalated to Control Tower
        if (escalatedTo === 'CONTROL_TOWER') return true;
        
        // Include if status is ESCALATED
        if (cardStatus === 'ESCALATED') return true;
        
        // Include Control Tower specific cards
        if (cardType?.startsWith('CT_') || cardType?.startsWith('CONTROL_TOWER_')) return true;
        
        // Optionally include all non-escalated
        if (includeNonEscalated) return true;
        
        return false;
      });

      // Apply domain filter
      if (sourceDomain && sourceDomain.length > 0) {
        filtered = filtered.filter(row => {
          const cardType = (row as Record<string, unknown>).card_type as string;
          const domain = extractDomainFromCardType(cardType);
          return sourceDomain.includes(domain);
        });
      }

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
      const decisions = filtered.map(row => transformToDecisionContract(row));
      return deduplicateDecisions(decisions);
    },
    enabled: !!tenantId,
  });

  const decisions = data || [];
  const now = new Date();

  // Group by source domain
  const bySourceDomain = {
    FDP: decisions.filter(d => d.domain === 'FDP'),
    MDP: decisions.filter(d => d.domain === 'MDP'),
    CDP: decisions.filter(d => d.domain === 'CDP'),
  };

  return {
    escalatedDecisions: decisions,
    bySourceDomain,
    counts: {
      total: decisions.length,
      fromFDP: bySourceDomain.FDP.length,
      fromMDP: bySourceDomain.MDP.length,
      fromCDP: bySourceDomain.CDP.length,
      critical: decisions.filter(d => d.severity === 'critical').length,
      overdue: decisions.filter(d => 
        d.status !== 'DECIDED' && new Date(d.deadline_at) < now
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

export function useControlTowerDecide() {
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
      // Invalidate all command center queries
      queryClient.invalidateQueries({ queryKey: ['control-tower-command-center'] });
      queryClient.invalidateQueries({ queryKey: ['fdp-command-center'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-command-center'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-command-center'] });
      queryClient.invalidateQueries({ queryKey: ['federated-decisions'] });
      toast.success('Đã ghi nhận quyết định từ Control Tower');
    },
    onError: (error) => {
      console.error('Control Tower Decision error:', error);
      toast.error('Không thể ghi nhận quyết định');
    },
  });
}

export function useControlTowerDismiss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      reason,
    }: {
      decisionId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          status: 'DISMISSED',
          decision_note: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-command-center'] });
      toast.success('Đã bỏ qua quyết định');
    },
    onError: (error) => {
      console.error('Control Tower Dismiss error:', error);
      toast.error('Không thể bỏ qua quyết định');
    },
  });
}

export function useControlTowerReassign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      targetDomain,
      reason,
    }: {
      decisionId: string;
      targetDomain: CommandCenterDomain;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          status: 'OPEN',
          escalated_to: null,
          reassigned_to: targetDomain,
          reassignment_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-command-center'] });
      queryClient.invalidateQueries({ queryKey: [`${variables.targetDomain.toLowerCase()}-command-center`] });
      toast.success(`Đã chuyển về ${variables.targetDomain} Command Center`);
    },
    onError: (error) => {
      console.error('Control Tower Reassign error:', error);
      toast.error('Không thể chuyển quyết định');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function extractDomainFromCardType(cardType: string): CommandCenterDomain {
  if (cardType?.startsWith('FDP_')) return 'FDP';
  if (cardType?.startsWith('MDP_')) return 'MDP';
  if (cardType?.startsWith('CDP_')) return 'CDP';
  return 'CONTROL_TOWER';
}

function transformToDecisionContract(row: unknown): DecisionContract {
  const r = row as Record<string, unknown>;
  const facts = (r.facts as Array<Record<string, unknown>>) || [];
  const actions = (r.actions as Array<Record<string, unknown>>) || [];
  const cardType = r.card_type as string;
  const domain = extractDomainFromCardType(cardType);

  return {
    id: r.id as string,
    tenant_id: r.tenant_id as string,
    domain,
    decision_type: cardType || 'CT_UNKNOWN',
    entity_type: ((r.entity_type as string) || 'tenant') as MetricGrain,
    entity_id: (r.entity_id as string) || '',
    entity_name: (r.entity_label as string) || '',
    metric_code: (r.metric_code as string) || 'unknown',
    metric_version: 1,
    period: (r.period as string) || getCurrentPeriod(),
    title: (r.title as string) || '',
    problem_statement: (r.description as string) || (r.impact_description as string) || '',
    severity: mapSeverity(r.severity as string),
    status: (r.status as DecisionStatus) || 'ESCALATED',
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
