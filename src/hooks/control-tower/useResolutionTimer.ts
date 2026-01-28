import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useState, useEffect, useCallback } from 'react';

export interface EscalationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  trigger_severity: string[];
  warning_threshold_hours: number;
  escalation_threshold_hours: number;
  final_escalation_hours: number;
  initial_owner_role: string;
  escalate_to_role: string;
  final_escalate_to_role: string;
  notify_on_warning: boolean;
  notify_on_escalation: boolean;
  notification_channels: string[];
}

export interface EscalationPath {
  current_level: number;
  current_owner_role: string;
  next_escalation_role: string | null;
  time_until_escalation_hours: number | null;
  final_owner_role: string;
  is_final: boolean;
}

export interface ResolutionTimerData {
  card_id: string;
  created_at: string;
  deadline_at: string | null;
  time_remaining_ms: number;
  time_used_percent: number;
  is_overdue: boolean;
  escalation_path: EscalationPath;
}

// Hook for countdown timer logic
export function useResolutionTimer(cardId: string | null, deadlineAt: string | null, createdAt: string | null) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!deadlineAt) {
      setTimeRemaining(0);
      setIsOverdue(false);
      return;
    }

    const deadline = new Date(deadlineAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = deadline - now;
      setTimeRemaining(remaining);
      setIsOverdue(remaining <= 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadlineAt]);

  const timeUsedPercent = useCallback(() => {
    if (!createdAt || !deadlineAt) return 0;
    const start = new Date(createdAt).getTime();
    const end = new Date(deadlineAt).getTime();
    const total = end - start;
    const elapsed = Date.now() - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [createdAt, deadlineAt]);

  return {
    timeRemaining,
    isOverdue,
    timeUsedPercent: timeUsedPercent(),
    formattedTime: formatTimeRemaining(timeRemaining),
  };
}

// Fetch escalation rules for tenant
export function useEscalationRules() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['escalation-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as EscalationRule[];
    },
    enabled: !!tenantId,
  });
}

// Get escalation path for a decision card
export function useEscalationPath(cardId: string | null) {
  const { data: tenantId } = useActiveTenantId();
  const { data: rules } = useEscalationRules();

  return useQuery({
    queryKey: ['escalation-path', cardId, tenantId],
    queryFn: async (): Promise<EscalationPath | null> => {
      if (!cardId || !tenantId) return null;

      // Get escalation history for this card
      const { data: history } = await supabase
        .from('escalation_history')
        .select('*')
        .eq('decision_card_id', cardId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get card details
      const { data: card } = await supabase
        .from('decision_cards')
        .select('owner_role, priority, deadline_at, created_at')
        .eq('id', cardId)
        .single();

      if (!card) return null;

      const currentLevel = history?.[0]?.escalation_level || 1;
      const defaultRule = rules?.[0];

      // Calculate time until next escalation
      let timeUntilEscalation: number | null = null;
      if (card.created_at && defaultRule) {
        const createdTime = new Date(card.created_at).getTime();
        const thresholdMs = defaultRule.escalation_threshold_hours * 60 * 60 * 1000;
        const escalationTime = createdTime + thresholdMs;
        timeUntilEscalation = (escalationTime - Date.now()) / (60 * 60 * 1000); // hours
      }

      return {
        current_level: currentLevel,
        current_owner_role: card.owner_role || 'COO',
        next_escalation_role: currentLevel === 1 ? (defaultRule?.escalate_to_role || 'CFO') : 
                              currentLevel === 2 ? (defaultRule?.final_escalate_to_role || 'CEO') : null,
        time_until_escalation_hours: timeUntilEscalation,
        final_owner_role: defaultRule?.final_escalate_to_role || 'CEO',
        is_final: currentLevel >= 3,
      };
    },
    enabled: !!cardId && !!tenantId,
  });
}

// Mutation to manually escalate
export function useManualEscalation() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      toRole, 
      reason 
    }: { 
      cardId: string; 
      toRole: string; 
      reason: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const { data: { user } } = await supabase.auth.getUser();

      // Get current card
      const { data: card } = await supabase
        .from('decision_cards')
        .select('owner_role')
        .eq('id', cardId)
        .single();

      // Insert escalation record
      const { error: historyError } = await supabase
        .from('escalation_history')
        .insert({
          tenant_id: tenantId,
          decision_card_id: cardId,
          from_owner_role: card?.owner_role,
          to_owner_role: toRole,
          reason,
          notification_sent: true,
          notification_channels: ['in_app'],
        });

      if (historyError) throw historyError;

      // Update card owner
      const { error: updateError } = await supabase
        .from('decision_cards')
        .update({ owner_role: toRole })
        .eq('id', cardId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-path'] });
      queryClient.invalidateQueries({ queryKey: ['decision-cards'] });
    },
  });
}

// Utility function
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Quá hạn';
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
