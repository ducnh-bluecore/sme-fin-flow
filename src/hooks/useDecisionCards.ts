import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-cards', tenantId, filters],
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
        .order('priority', { ascending: true })
        .order('severity_score', { ascending: false })
        .order('deadline_at', { ascending: true });

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
      return data as DecisionCard[];
    },
    enabled: !!tenantId,
  });
}

// Hook to fetch single decision card with details
export function useDecisionCard(cardId: string | null) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-card', tenantId, cardId],
    queryFn: async () => {
      if (!cardId || !tenantId) return null;

      const { data, error } = await supabase
        .from('decision_cards')
        .select(
          `
          *,
          facts:decision_card_facts(*),
          actions:decision_card_actions(*)
        `
        )
        .eq('tenant_id', tenantId)
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      return (data as DecisionCard) ?? null;
    },
    enabled: !!cardId && !!tenantId,
  });
}

// Hook to make a decision
export function useDecideCard() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({
      cardId,
      actionType,
      actionLabel,
      comment,
      parameters,
      cardSnapshot,
    }: {
      cardId: string;
      actionType: ActionType;
      actionLabel?: string;
      comment?: string;
      parameters?: Record<string, any>;
      cardSnapshot?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      if (isAutoGenerated) {
        // Persist auto-card decision so it survives refresh
        const { error } = await supabase.from('auto_decision_card_states').upsert(
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
        return { id: cardId, status: 'DECIDED' };
      }

      // Insert decision log for real cards
      const { error: decisionError } = await supabase
        .from('decision_card_decisions')
        .insert({
          card_id: cardId,
          tenant_id: tenantId!,
          decided_by: user?.id,
          action_type: actionType,
          action_label: actionLabel,
          comment,
          parameters: parameters || {},
        });

      if (decisionError) throw decisionError;

      // Update card status
      const { data, error } = await supabase
        .from('decision_cards')
        .update({ status: 'DECIDED', updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      queryClient.invalidateQueries({ queryKey: ['decision-card'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decision-card-states'] });
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
  const { data: tenantId } = useActiveTenantId();

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
      const { data: { user } } = await supabase.auth.getUser();

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      if (isAutoGenerated) {
        const { error } = await supabase.from('auto_decision_card_states').upsert(
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
        return { id: cardId, status: 'DISMISSED' };
      }

      // Insert decision log with dismiss reason
      const { error: decisionError } = await supabase
        .from('decision_card_decisions')
        .insert({
          card_id: cardId,
          tenant_id: tenantId!,
          decided_by: user?.id,
          action_type: 'DISMISS',
          dismiss_reason: reason,
          comment,
        });

      if (decisionError) throw decisionError;

      // Update card status
      const { data, error } = await supabase
        .from('decision_cards')
        .update({ status: 'DISMISSED', updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decision-card-states'] });
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
  const { data: tenantId } = useActiveTenantId();

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

      // Check if this is an auto-generated card (not a real UUID)
      const isAutoGenerated = cardId.startsWith('auto-');

      if (isAutoGenerated) {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('auto_decision_card_states').upsert(
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
        return { id: cardId, snoozed_until: snoozedUntil.toISOString() };
      }

      // First get current snooze_count
      const { data: currentCard } = await supabase
        .from('decision_cards')
        .select('snooze_count')
        .eq('id', cardId)
        .single();

      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          snoozed_until: snoozedUntil.toISOString(),
          snooze_count: (currentCard?.snooze_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
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

// Hook to assign owner to a card
export function useAssignCardOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      userId,
    }: {
      cardId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('decision_cards')
        .update({
          owner_user_id: userId,
          assigned_at: new Date().toISOString(),
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
      toast.success('Đã gán người phụ trách');
    },
    onError: (error) => {
      console.error('Error assigning owner:', error);
      toast.error('Không thể gán người phụ trách');
    },
  });
}

// Hook to get decision card stats
export function useDecisionCardStats() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-card-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('decision_cards')
        .select('id, status, priority, deadline_at, impact_amount')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const now = new Date();
      const stats = {
        total: data.length,
        open: data.filter(c => c.status === 'OPEN').length,
        inProgress: data.filter(c => c.status === 'IN_PROGRESS').length,
        decided: data.filter(c => c.status === 'DECIDED').length,
        dismissed: data.filter(c => c.status === 'DISMISSED').length,
        expired: data.filter(c => c.status === 'EXPIRED').length,
        p1Count: data.filter(c => c.priority === 'P1' && c.status === 'OPEN').length,
        p2Count: data.filter(c => c.priority === 'P2' && c.status === 'OPEN').length,
        p3Count: data.filter(c => c.priority === 'P3' && c.status === 'OPEN').length,
        overdueCount: data.filter(c => 
          c.status === 'OPEN' && new Date(c.deadline_at) < now
        ).length,
        totalImpact: data
          .filter(c => c.status === 'OPEN')
          .reduce((sum, c) => sum + (c.impact_amount || 0), 0),
      };

      return stats;
    },
    enabled: !!tenantId,
  });
}
