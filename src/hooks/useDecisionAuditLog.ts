import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import type { CardType, ActionType, DismissReason } from './useDecisionCards';

// Types for Decision Audit Log
export interface DecisionAuditLogEntry {
  id: string;
  tenant_id: string;
  card_id: string | null;
  auto_card_id: string | null;
  card_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action_type: string;
  action_label: string | null;
  decision_status: string | null;
  decided_by: string | null;
  decided_at: string;
  comment: string | null;
  dismiss_reason: string | null;
  snoozed_until: string | null;
  impact_amount: number | null;
  impact_currency: string;
  card_snapshot: Record<string, any> | null;
  outcome_tracking_key: string | null;
  outcome_recorded_at: string | null;
  outcome_value: number | null;
  outcome_notes: string | null;
  created_at: string;
}

export interface UnifiedDecisionHistory {
  id: string;
  tenant_id: string;
  card_identifier: string;
  card_source: 'db' | 'auto';
  card_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action_type: string;
  action_label: string | null;
  decision_status: string | null;
  decided_by: string | null;
  decided_at: string;
  comment: string | null;
  dismiss_reason: string | null;
  snoozed_until: string | null;
  impact_amount: number | null;
  impact_currency: string;
  outcome_value: number | null;
  outcome_notes: string | null;
  created_at: string;
}

// Hook to fetch unified decision history
export function useUnifiedDecisionHistory(options?: {
  limit?: number;
  entityType?: string;
  cardSource?: 'db' | 'auto' | 'all';
}) {
  const { data: tenantId } = useActiveTenantId();
  const limit = options?.limit ?? 50;
  const entityType = options?.entityType;
  const cardSource = options?.cardSource ?? 'all';

  return useQuery({
    queryKey: ['unified-decision-history', tenantId, limit, entityType, cardSource],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('decision_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('decided_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (cardSource === 'db') {
        query = query.not('card_id', 'is', null);
      } else if (cardSource === 'auto') {
        query = query.not('auto_card_id', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(entry => ({
        ...entry,
        card_identifier: entry.card_id || entry.auto_card_id,
        card_source: entry.card_id ? 'db' : 'auto',
      })) as UnifiedDecisionHistory[];
    },
    enabled: !!tenantId,
  });
}

// Hook to log a decision to the unified audit log
export function useLogDecisionToAudit() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (payload: {
      cardId?: string;
      autoCardId?: string;
      cardType: string;
      entityType: string;
      entityId?: string;
      entityLabel?: string;
      actionType: string;
      actionLabel?: string;
      decisionStatus: string;
      comment?: string;
      dismissReason?: string;
      snoozedUntil?: string;
      impactAmount?: number;
      impactCurrency?: string;
      cardSnapshot?: Record<string, any>;
    }) => {
      if (!tenantId) throw new Error('Missing tenantId');

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('decision_audit_log')
        .insert({
          tenant_id: tenantId,
          card_id: payload.cardId ?? null,
          auto_card_id: payload.autoCardId ?? null,
          card_type: payload.cardType,
          entity_type: payload.entityType,
          entity_id: payload.entityId ?? null,
          entity_label: payload.entityLabel ?? null,
          action_type: payload.actionType,
          action_label: payload.actionLabel ?? null,
          decision_status: payload.decisionStatus,
          decided_by: user?.id ?? null,
          decided_at: new Date().toISOString(),
          comment: payload.comment ?? null,
          dismiss_reason: payload.dismissReason ?? null,
          snoozed_until: payload.snoozedUntil ?? null,
          impact_amount: payload.impactAmount ?? null,
          impact_currency: payload.impactCurrency ?? 'VND',
          card_snapshot: payload.cardSnapshot ?? null,
        });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
      queryClient.invalidateQueries({ queryKey: ['decision-audit-log'] });
    },
    onError: (error) => {
      console.error('Error logging decision to audit:', error);
    },
  });
}

// Hook to get decision history for a specific entity
export function useEntityDecisionHistory(entityType: string, entityId: string | null) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['entity-decision-history', tenantId, entityType, entityId],
    queryFn: async () => {
      if (!tenantId || !entityId) return [];

      const { data, error } = await supabase
        .from('decision_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('decided_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DecisionAuditLogEntry[];
    },
    enabled: !!tenantId && !!entityId,
  });
}

// Hook to get decision stats from audit log - USES DB RPC (no frontend computation)
export function useDecisionAuditStats() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-audit-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Call DB RPC instead of fetching + computing in frontend
      const { data, error } = await supabase.rpc('get_decision_audit_stats', {
        p_tenant_id: tenantId
      });

      if (error) throw error;

      // Type assertion for RPC response
      const result = data as Record<string, unknown> | null;

      // Map snake_case from DB to camelCase for frontend with safe access
      return {
        totalDecisions: (result?.total_decisions as number) ?? 0,
        dbCardDecisions: (result?.db_card_decisions as number) ?? 0,
        autoCardDecisions: (result?.auto_card_decisions as number) ?? 0,
        decidedCount: (result?.decided_count as number) ?? 0,
        dismissedCount: (result?.dismissed_count as number) ?? 0,
        snoozedCount: (result?.snoozed_count as number) ?? 0,
        last7DaysCount: (result?.last_7_days_count as number) ?? 0,
        last30DaysCount: (result?.last_30_days_count as number) ?? 0,
        totalImpact: (result?.total_impact as number) ?? 0,
      };
    },
    enabled: !!tenantId,
  });
}
