/**
 * useDecisionCards - Hook for decision card management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain Control Tower/Decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

// Types
export type CardType = 
  | 'GROWTH_SCALE_CHANNEL'
  | 'GROWTH_SCALE_SKU'
  | 'CASH_SURVIVAL'
  | 'INVENTORY_CASH_LOCK'
  | 'OPS_REVENUE_AT_RISK'
  | 'CUSTOMER_PROTECT_OR_AVOID';

export type CardStatus = 'OPEN' | 'IN_PROGRESS' | 'DECIDED' | 'DISMISSED' | 'EXPIRED';
export type Priority = 'P1' | 'P2' | 'P3';
export type OwnerRole = 'CEO' | 'CFO' | 'CMO' | 'COO';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type Trend = 'UP' | 'DOWN' | 'FLAT' | 'NA';

export type ActionType = 
  | 'STOP' | 'PAUSE' | 'SCALE' | 'SCALE_WITH_CONDITION'
  | 'INVESTIGATE' | 'ACCEPT_LOSS' | 'PROTECT' | 'AVOID'
  | 'COLLECT' | 'DISCOUNT' | 'RENEGOTIATE' | 'SWITCH';

export type DismissReason = 
  | 'NOT_RELEVANT' | 'ALREADY_HANDLED' | 'FALSE_POSITIVE' | 'AWAITING_DATA' | 'OTHER';

export interface DecisionCardFact {
  id: string;
  card_id: string;
  fact_key: string;
  label: string;
  value: string;
  numeric_value: number | null;
  unit: string | null;
  trend: Trend | null;
  is_primary: boolean;
  display_order: number;
}

export interface DecisionCardAction {
  id: string;
  card_id: string;
  action_type: ActionType;
  is_recommended: boolean;
  label: string;
  parameters: Record<string, any>;
  risk_note: string | null;
  expected_outcome: string | null;
  display_order: number;
}

export interface AnalysisMetadata {
  data_rows?: number;
  sku_count?: number;
  transaction_count?: number;
  order_count?: number;
  product_count?: number;
  analyzed_at?: string;
}

export interface DecisionCard {
  id: string;
  tenant_id: string;
  card_type: CardType;
  title: string;
  question: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string;
  owner_role: OwnerRole;
  owner_user_id: string | null;
  assigned_at: string | null;
  status: CardStatus;
  priority: Priority;
  severity_score: number;
  confidence: Confidence;
  impact_amount: number;
  impact_currency: string;
  impact_window_days: number;
  impact_description: string | null;
  deadline_at: string;
  snoozed_until: string | null;
  snooze_count: number;
  source_modules: string[];
  vertical: string;
  created_at: string;
  updated_at: string;
  analysis_metadata?: AnalysisMetadata;
  // Joined data
  facts?: DecisionCardFact[];
  actions?: DecisionCardAction[];
}

export interface DecisionCardDecision {
  id: string;
  card_id: string;
  decided_by: string | null;
  action_type: string;
  action_label: string | null;
  comment: string | null;
  parameters: Record<string, any>;
  dismiss_reason: DismissReason | null;
  decided_at: string;
}

// Hook to fetch decision cards
export function useDecisionCards(filters?: {
  status?: CardStatus[];
  priority?: Priority[];
  ownerRole?: OwnerRole[];
}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['decision-cards', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('decision_cards')
        .select(`
          *,
          facts:decision_card_facts(*),
          actions:decision_card_actions(*)
        `)
        .order('priority', { ascending: true })
        .order('severity_score', { ascending: false })
        .order('deadline_at', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.ownerRole && filters.ownerRole.length > 0) {
        query = query.in('owner_role', filters.ownerRole);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as DecisionCard[]) || [];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook to fetch single decision card with details
export function useDecisionCard(cardId: string | null) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['decision-card', tenantId, cardId],
    queryFn: async () => {
      if (!cardId || !tenantId) return null;

      let query = client
        .from('decision_cards')
        .select(`
          *,
          facts:decision_card_facts(*),
          actions:decision_card_actions(*)
        `)
        .eq('id', cardId);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return (data as unknown as DecisionCard) ?? null;
    },
    enabled: !!cardId && !!tenantId && isReady,
  });
}

// Hook to make a decision
export function useDecideCard() {
  const queryClient = useQueryClient();
  const { client, tenantId, buildInsertQuery, buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({
      cardId,
      actionType,
      actionLabel,
      comment,
      parameters,
      cardSnapshot,
      selectedAction,
      followUpDate,
      expectedOutcome,
    }: {
      cardId: string;
      actionType: ActionType;
      actionLabel?: string;
      comment?: string;
      parameters?: Record<string, any>;
      cardSnapshot?: Record<string, any>;
      selectedAction?: {
        type: string;
        label: string;
        parameters?: Record<string, any>;
      };
      followUpDate?: string;
      expectedOutcome?: string;
    }) => {
      const { data: { user } } = await client.auth.getUser();

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      // Calculate follow-up date (default 7 days if not specified)
      const calculatedFollowUpDate = followUpDate || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (isAutoGenerated) {
        // Persist auto-card decision so it survives refresh
        const { error } = await client.from('auto_decision_card_states').upsert(
          {
            tenant_id: tenantId!,
            auto_card_id: cardId,
            status: 'DECIDED',
            decided_by: user?.id ?? null,
            decided_at: new Date().toISOString(),
            comment: comment ?? null,
            card_snapshot: cardSnapshot ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,auto_card_id' }
        );

        if (error) throw error;

        // Also log to unified audit log with full action details
        await buildInsertQuery('decision_audit_log', {
          auto_card_id: cardId,
          card_type: cardSnapshot?.card_type || 'UNKNOWN',
          entity_type: cardSnapshot?.entity_type || 'UNKNOWN',
          entity_id: cardSnapshot?.entity_id,
          entity_label: cardSnapshot?.entity_label,
          action_type: actionType,
          action_label: actionLabel,
          decision_status: 'DECIDED',
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          comment: comment,
          impact_amount: cardSnapshot?.impact_amount,
          impact_currency: cardSnapshot?.impact_currency || 'VND',
          card_snapshot: cardSnapshot,
          selected_action_type: selectedAction?.type ?? actionType,
          selected_action_label: selectedAction?.label ?? actionLabel,
          action_parameters: selectedAction?.parameters ?? parameters ?? null,
          expected_impact_amount: cardSnapshot?.impact_amount,
          expected_outcome: expectedOutcome,
          follow_up_date: calculatedFollowUpDate,
          follow_up_status: 'pending',
        });

        return { id: cardId, status: 'DECIDED' };
      }

      // Insert decision log for real cards
      const { error: decisionError } = await buildInsertQuery('decision_card_decisions', {
        card_id: cardId,
        decided_by: user?.id,
        action_type: actionType,
        action_label: actionLabel,
        comment,
        parameters: parameters || {},
      });

      if (decisionError) throw decisionError;

      // Update card status
      const { data, error } = await buildUpdateQuery('decision_cards', { 
        status: 'DECIDED', 
        updated_at: new Date().toISOString() 
      })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Also log to unified audit log for DB cards with full action details
      await buildInsertQuery('decision_audit_log', {
        card_id: cardId,
        card_type: (data as any).card_type,
        entity_type: (data as any).entity_type,
        entity_id: (data as any).entity_id,
        entity_label: (data as any).entity_label,
        action_type: actionType,
        action_label: actionLabel,
        decision_status: 'DECIDED',
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        comment: comment,
        impact_amount: (data as any).impact_amount,
        impact_currency: (data as any).impact_currency,
        selected_action_type: selectedAction?.type ?? actionType,
        selected_action_label: selectedAction?.label ?? actionLabel,
        action_parameters: selectedAction?.parameters ?? parameters ?? null,
        expected_impact_amount: (data as any).impact_amount,
        expected_outcome: expectedOutcome,
        follow_up_date: calculatedFollowUpDate,
        follow_up_status: 'pending',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      queryClient.invalidateQueries({ queryKey: ['decision-card'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decision-card-states'] });
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
      toast.success('Đã ghi nhận quyết định');
    },
    onError: (error) => {
      console.error('Error making decision:', error);
      toast.error('Không thể ghi nhận quyết định');
    },
  });
}

// Hook to dismiss a card
export function useDismissCard() {
  const queryClient = useQueryClient();
  const { client, tenantId, buildInsertQuery, buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({
      cardId,
      reason,
      comment,
      cardSnapshot,
    }: {
      cardId: string;
      reason: DismissReason;
      comment?: string;
      cardSnapshot?: Record<string, any>;
    }) => {
      const { data: { user } } = await client.auth.getUser();

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      if (isAutoGenerated) {
        const { error } = await client.from('auto_decision_card_states').upsert(
          {
            tenant_id: tenantId!,
            auto_card_id: cardId,
            status: 'DISMISSED',
            decided_by: user?.id ?? null,
            decided_at: new Date().toISOString(),
            dismiss_reason: reason,
            comment: comment ?? null,
            card_snapshot: cardSnapshot ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,auto_card_id' }
        );

        if (error) throw error;

        // Also log to unified audit log
        await buildInsertQuery('decision_audit_log', {
          auto_card_id: cardId,
          card_type: cardSnapshot?.card_type || 'UNKNOWN',
          entity_type: cardSnapshot?.entity_type || 'UNKNOWN',
          entity_id: cardSnapshot?.entity_id,
          entity_label: cardSnapshot?.entity_label,
          action_type: 'DISMISS',
          decision_status: 'DISMISSED',
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          comment: comment,
          dismiss_reason: reason,
          impact_amount: cardSnapshot?.impact_amount,
          impact_currency: cardSnapshot?.impact_currency || 'VND',
          card_snapshot: cardSnapshot,
        });

        return { id: cardId, status: 'DISMISSED' };
      }

      // Insert decision log with dismiss reason
      const { error: decisionError } = await buildInsertQuery('decision_card_decisions', {
        card_id: cardId,
        decided_by: user?.id,
        action_type: 'DISMISS',
        dismiss_reason: reason,
        comment,
      });

      if (decisionError) throw decisionError;

      // Update card status
      const { data, error } = await buildUpdateQuery('decision_cards', { 
        status: 'DISMISSED', 
        updated_at: new Date().toISOString() 
      })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Also log to unified audit log
      await buildInsertQuery('decision_audit_log', {
        card_id: cardId,
        card_type: (data as any).card_type,
        entity_type: (data as any).entity_type,
        entity_id: (data as any).entity_id,
        entity_label: (data as any).entity_label,
        action_type: 'DISMISS',
        decision_status: 'DISMISSED',
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        comment: comment,
        dismiss_reason: reason,
        impact_amount: (data as any).impact_amount,
        impact_currency: (data as any).impact_currency,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decision-card-states'] });
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
      toast.success('Đã bỏ qua quyết định');
    },
    onError: (error) => {
      console.error('Error dismissing card:', error);
      toast.error('Không thể bỏ qua quyết định');
    },
  });
}

// Hook to snooze a card
export function useSnoozeCard() {
  const queryClient = useQueryClient();
  const { client, tenantId, buildInsertQuery, buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({
      cardId,
      hours,
      cardSnapshot,
    }: {
      cardId: string;
      hours: number;
      cardSnapshot?: Record<string, any>;
    }) => {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + hours);
      const { data: { user } } = await client.auth.getUser();

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      if (isAutoGenerated) {
        const { error } = await client.from('auto_decision_card_states').upsert(
          {
            tenant_id: tenantId!,
            auto_card_id: cardId,
            status: 'SNOOZED',
            decided_by: user?.id ?? null,
            decided_at: new Date().toISOString(),
            snoozed_until: snoozedUntil.toISOString(),
            card_snapshot: cardSnapshot ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,auto_card_id' }
        );

        if (error) throw error;

        // Also log to unified audit log
        await buildInsertQuery('decision_audit_log', {
          auto_card_id: cardId,
          card_type: cardSnapshot?.card_type || 'UNKNOWN',
          entity_type: cardSnapshot?.entity_type || 'UNKNOWN',
          entity_id: cardSnapshot?.entity_id,
          entity_label: cardSnapshot?.entity_label,
          action_type: 'SNOOZE',
          decision_status: 'SNOOZED',
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          impact_amount: cardSnapshot?.impact_amount,
          impact_currency: cardSnapshot?.impact_currency || 'VND',
          card_snapshot: cardSnapshot,
        });

        return { id: cardId, status: 'SNOOZED', snoozed_until: snoozedUntil.toISOString() };
      }

      const { data, error } = await buildUpdateQuery('decision_cards', {
        snoozed_until: snoozedUntil.toISOString(),
        snooze_count: 1,
        updated_at: new Date().toISOString(),
      })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;

      // Also log to unified audit log
      await buildInsertQuery('decision_audit_log', {
        card_id: cardId,
        card_type: (data as any).card_type,
        entity_type: (data as any).entity_type,
        entity_id: (data as any).entity_id,
        entity_label: (data as any).entity_label,
        action_type: 'SNOOZE',
        decision_status: 'SNOOZED',
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        impact_amount: (data as any).impact_amount,
        impact_currency: (data as any).impact_currency,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decision-card-states'] });
      toast.success('Đã tạm hoãn quyết định');
    },
    onError: (error) => {
      console.error('Error snoozing card:', error);
      toast.error('Không thể tạm hoãn quyết định');
    },
  });
}

// Hook to get auto-card states for filtering
export function useAutoDecisionCardStates() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['auto-decision-card-states', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('auto_decision_card_states', '*');

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook to get unified decision history
export function useUnifiedDecisionHistory() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['unified-decision-history', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('decision_audit_log', '*')
        .order('decided_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook to get decision card stats
export function useDecisionCardStats() {
  const { data: cards, isLoading } = useDecisionCards();
  const { data: autoCards } = useAutoDecisionCardStates();

  const stats = {
    total: (cards?.length || 0) + (autoCards?.length || 0),
    open: cards?.filter(c => c.status === 'OPEN').length || 0,
    inProgress: cards?.filter(c => c.status === 'IN_PROGRESS').length || 0,
    decided: cards?.filter(c => c.status === 'DECIDED').length || 0,
    dismissed: cards?.filter(c => c.status === 'DISMISSED').length || 0,
    p1: cards?.filter(c => c.priority === 'P1' && c.status === 'OPEN').length || 0,
    p2: cards?.filter(c => c.priority === 'P2' && c.status === 'OPEN').length || 0,
    p3: cards?.filter(c => c.priority === 'P3' && c.status === 'OPEN').length || 0,
  };

  return { stats, isLoading };
}
