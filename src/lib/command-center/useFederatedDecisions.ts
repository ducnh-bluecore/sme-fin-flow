/**
 * FEDERATED COMMAND CENTER - UNIFIED DECISIONS HOOK
 * 
 * Aggregates decisions from all Command Centers into a single view.
 * Handles deduplication, filtering by domain, and escalation.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import {
  DecisionContract,
  CommandCenterDomain,
  DecisionStatus,
  DecisionSeverity,
  deduplicateDecisions,
  shouldEscalate,
  EscalationConfig,
  DEFAULT_ESCALATION_CONFIG,
  generateDedupeKey,
} from './contracts';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface FederatedDecisionsFilters {
  domains?: CommandCenterDomain[];
  status?: DecisionStatus[];
  severity?: DecisionSeverity[];
  ownerRole?: string[];
  includeEscalated?: boolean;
  limit?: number;
}

export interface FederatedDecisionsResult {
  /** All decisions (deduplicated) */
  decisions: DecisionContract[];
  
  /** Decisions by domain */
  byDomain: Record<CommandCenterDomain, DecisionContract[]>;
  
  /** Escalated decisions */
  escalated: DecisionContract[];
  
  /** Counts */
  counts: {
    total: number;
    byDomain: Record<CommandCenterDomain, number>;
    bySeverity: Record<DecisionSeverity, number>;
    byStatus: Record<DecisionStatus, number>;
    overdue: number;
  };
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Refetch function */
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════

export function useFederatedDecisions(
  filters: FederatedDecisionsFilters = {}
): FederatedDecisionsResult {
  const { data: tenantId } = useActiveTenantId();
  
  const {
    domains = ['FDP', 'MDP', 'CDP', 'CONTROL_TOWER'],
    status = ['OPEN', 'IN_PROGRESS'],
    severity,
    ownerRole,
    includeEscalated = true,
    limit = 50,
  } = filters;

  // Fetch from decision_cards table (unified storage)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['federated-decisions', tenantId, domains, status, severity, ownerRole, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
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

      if (severity && severity.length > 0) {
        query = query.in('severity', severity);
      }

      if (ownerRole && ownerRole.length > 0) {
        query = query.in('owner_role', ownerRole);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform DB rows to DecisionContract format
      return (data || []).map(row => transformDbToContract(row));
    },
    enabled: !!tenantId,
  });

  // Process decisions
  const result = useMemo(() => {
    const allDecisions = data || [];
    
    // Filter by domain
    const domainFiltered = allDecisions.filter(d => domains.includes(d.domain));
    
    // Deduplicate
    const deduplicated = deduplicateDecisions(domainFiltered);
    
    // Separate escalated
    const escalated = includeEscalated 
      ? deduplicated.filter(d => d.status === 'ESCALATED' || shouldEscalate(d))
      : [];
    
    // Group by domain
    const byDomain: Record<CommandCenterDomain, DecisionContract[]> = {
      FDP: deduplicated.filter(d => d.domain === 'FDP'),
      MDP: deduplicated.filter(d => d.domain === 'MDP'),
      CDP: deduplicated.filter(d => d.domain === 'CDP'),
      CONTROL_TOWER: deduplicated.filter(d => d.domain === 'CONTROL_TOWER'),
    };
    
    // Calculate counts
    const now = new Date();
    const counts = {
      total: deduplicated.length,
      byDomain: {
        FDP: byDomain.FDP.length,
        MDP: byDomain.MDP.length,
        CDP: byDomain.CDP.length,
        CONTROL_TOWER: byDomain.CONTROL_TOWER.length,
      },
      bySeverity: {
        critical: deduplicated.filter(d => d.severity === 'critical').length,
        high: deduplicated.filter(d => d.severity === 'high').length,
        medium: deduplicated.filter(d => d.severity === 'medium').length,
        low: deduplicated.filter(d => d.severity === 'low').length,
      },
      byStatus: {
        OPEN: deduplicated.filter(d => d.status === 'OPEN').length,
        IN_PROGRESS: deduplicated.filter(d => d.status === 'IN_PROGRESS').length,
        DECIDED: deduplicated.filter(d => d.status === 'DECIDED').length,
        DISMISSED: deduplicated.filter(d => d.status === 'DISMISSED').length,
        ESCALATED: deduplicated.filter(d => d.status === 'ESCALATED').length,
        SNOOZED: deduplicated.filter(d => d.status === 'SNOOZED').length,
      },
      overdue: deduplicated.filter(d => 
        d.status === 'OPEN' && new Date(d.deadline_at) < now
      ).length,
    };
    
    return {
      decisions: deduplicated,
      byDomain,
      escalated,
      counts,
      isLoading,
      error: error as Error | null,
      refetch,
    };
  }, [data, domains, includeEscalated, isLoading, error, refetch]);

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════

export function useEscalateDecision() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ 
      decisionId, 
      reason 
    }: { 
      decisionId: string; 
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          status: 'ESCALATED',
          escalated_to: 'CONTROL_TOWER',
          updated_at: new Date().toISOString(),
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federated-decisions'] });
      toast.success('Đã leo thang quyết định lên Control Tower');
    },
    onError: (error) => {
      console.error('Escalation error:', error);
      toast.error('Không thể leo thang quyết định');
    },
  });
}

export function useDecideOnDecision() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

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
      queryClient.invalidateQueries({ queryKey: ['federated-decisions'] });
      toast.success('Đã ghi nhận quyết định');
    },
    onError: (error) => {
      console.error('Decision error:', error);
      toast.error('Không thể ghi nhận quyết định');
    },
  });
}

export function useDismissDecision() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

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
      queryClient.invalidateQueries({ queryKey: ['federated-decisions'] });
      toast.success('Đã bỏ qua quyết định');
    },
    onError: (error) => {
      console.error('Dismiss error:', error);
      toast.error('Không thể bỏ qua quyết định');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function transformDbToContract(row: Record<string, any>): DecisionContract {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    domain: (row.card_type?.split('_')[0] || 'FDP') as CommandCenterDomain,
    decision_type: row.card_type || 'UNKNOWN',
    entity_type: row.entity_type || 'tenant',
    entity_id: row.entity_id || '',
    entity_name: row.entity_label || row.entity_id || '',
    metric_code: row.metric_code || 'unknown',
    metric_version: 1,
    period: row.period || getCurrentPeriod(),
    title: row.title || '',
    problem_statement: row.description || row.impact_description || '',
    severity: mapSeverity(row.severity || row.priority),
    status: row.status as DecisionStatus,
    owner_role: row.owner_role || 'CEO',
    owner_user_id: row.owner_user_id,
    impact_amount: row.impact_amount || 0,
    impact_description: row.impact_description,
    deadline_at: row.deadline_at || new Date().toISOString(),
    deadline_hours: calculateDeadlineHours(row.deadline_at),
    facts: (row.facts || []).map((f: any) => ({
      fact_id: f.id,
      label: f.label,
      value: f.value,
      unit: f.unit || '',
      trend: f.trend,
      status: f.status || 'neutral',
      metric_code: f.metric_code,
    })),
    actions: (row.actions || []).map((a: any) => ({
      action_id: a.id,
      label: a.label,
      action_type: a.action_type,
      is_recommended: a.is_recommended || false,
      projected_impact: a.projected_impact,
    })),
    evidence: {
      as_of_timestamp: row.created_at,
      source_tables: [],
      data_quality_flags: ['complete'],
      confidence_score: row.confidence || 0.8,
    },
    recommended_action: row.recommended_action,
    created_at: row.created_at,
    updated_at: row.updated_at,
    decision_outcome: row.decision_outcome,
    decision_note: row.decision_note,
    decided_by: row.decided_by,
    decided_at: row.decided_at,
    escalated_to: row.escalated_to,
    snoozed_until: row.snoozed_until,
  };
}

function mapSeverity(value: string | undefined): DecisionSeverity {
  if (!value) return 'medium';
  const lower = value.toLowerCase();
  if (lower === 'critical' || lower === 'p1') return 'critical';
  if (lower === 'high' || lower === 'p2') return 'high';
  if (lower === 'low' || lower === 'p3') return 'low';
  return 'medium';
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
