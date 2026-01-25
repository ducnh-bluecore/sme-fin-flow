import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';
import type { Json } from '@/integrations/supabase/types';
// Types matching v_cdp_insight_detail view
export interface InsightDriver {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface SampleCustomer {
  anonymousId: string;
  previousValue: number;
  currentValue: number;
}

export interface InsightDetailData {
  event_id: string;
  code: string;
  title: string;
  topic: string;
  population_name: string;
  population_size: number;
  revenue_contribution: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  status: 'active' | 'cooldown';
  current_value: number;
  baseline_value: number;
  change_percent: number;
  change_direction: 'up' | 'down' | 'stable';
  metric_name: string;
  metric_unit: string;
  period_current: string;
  period_baseline: string;
  business_implication: string;
  drivers: InsightDriver[];
  sample_customers: SampleCustomer[];
  snapshot_date: string;
  detected_at: string;
  cooldown_until: string | null;
  linked_decision_card_id: string | null;
  linked_decision_card_status: string | null;
  // NEW: Actionable fields
  recommended_action: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_impact: number;
  impact_currency: string;
  action_owner: string;
}

// Hook for insight detail
export function useCDPInsightDetail(insightCode: string | undefined) {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-insight-detail', tenantId, insightCode],
    queryFn: async (): Promise<InsightDetailData | null> => {
      if (!tenantId || !insightCode) return null;

      const { data, error } = await supabase
        .from('v_cdp_insight_detail')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('code', insightCode)
        .order('detected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching insight detail:', error);
        return null;
      }

      if (!data) return null;

      // Parse JSONB fields with proper type casting
      let drivers: InsightDriver[] = [];
      let sampleCustomers: SampleCustomer[] = [];

      try {
        if (data.drivers && Array.isArray(data.drivers)) {
          drivers = (data.drivers as Json[]).map((d: Json) => {
            const obj = d as Record<string, Json>;
            return {
              name: String(obj.name || ''),
              value: Number(obj.value || 0),
              unit: String(obj.unit || ''),
              trend: (obj.trend as 'up' | 'down' | 'stable') || 'stable',
            };
          });
        }
        if (data.sample_customers && Array.isArray(data.sample_customers)) {
          sampleCustomers = (data.sample_customers as Json[]).map((c: Json) => {
            const obj = c as Record<string, Json>;
            return {
              anonymousId: String(obj.anonymousId || ''),
              previousValue: Number(obj.previousValue || 0),
              currentValue: Number(obj.currentValue || 0),
            };
          });
        }
      } catch (e) {
        console.warn('Error parsing JSONB fields:', e);
      }

      return {
        event_id: data.event_id,
        code: data.code,
        title: data.title,
        topic: data.topic,
        population_name: data.population_name,
        population_size: data.population_size || 0,
        revenue_contribution: data.revenue_contribution || 0,
        severity: data.severity as 'critical' | 'high' | 'medium' | 'low',
        confidence: (data.confidence || 'medium') as 'high' | 'medium' | 'low',
        status: data.status as 'active' | 'cooldown',
        current_value: data.current_value || 0,
        baseline_value: data.baseline_value || 0,
        change_percent: data.change_percent || 0,
        change_direction: data.change_direction as 'up' | 'down' | 'stable',
        metric_name: data.metric_name || 'Metric',
        metric_unit: data.metric_unit || '',
        period_current: data.period_current || '',
        period_baseline: data.period_baseline || '',
        business_implication: data.business_implication || '',
        drivers,
        sample_customers: sampleCustomers,
        snapshot_date: data.snapshot_date || '',
        detected_at: data.detected_at || '',
        cooldown_until: data.cooldown_until,
        linked_decision_card_id: data.linked_decision_card_id,
        linked_decision_card_status: data.linked_decision_card_status,
        // NEW: Actionable fields
        recommended_action: data.recommended_action || 'Chưa có đề xuất cụ thể',
        urgency: (data.urgency || 'low') as 'low' | 'medium' | 'high' | 'critical',
        estimated_impact: data.estimated_impact || 0,
        impact_currency: data.impact_currency || 'VND',
        action_owner: data.action_owner || 'CEO',
      };
    },
    enabled: !!tenantId && !!insightCode,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook to create decision card from insight
export function useCreateDecisionFromInsight() {
  const { data: currentTenant } = useActiveTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      insightEventId, 
      insightCode,
      title,
      summary 
    }: { 
      insightEventId: string;
      insightCode: string;
      title: string;
      summary: string;
    }) => {
      if (!currentTenant?.id) throw new Error('No tenant');

      // Create decision card
      const { data: card, error: cardError } = await supabase
        .from('cdp_decision_cards')
        .insert({
          tenant_id: currentTenant.id,
          source_type: 'INSIGHT_EVENT',
          source_ref: { insight_event_id: insightEventId, insight_code: insightCode },
          title,
          summary,
          category: 'VALUE',
          status: 'NEW',
          severity: 'HIGH',
          priority: 'P1',
          owner_role: 'CEO',
        })
        .select('id')
        .single();

      if (cardError) throw cardError;

      // Create link
      const { error: linkError } = await supabase
        .from('cdp_decision_insight_links')
        .insert({
          tenant_id: currentTenant.id,
          decision_id: card.id,
          insight_event_id: insightEventId,
          link_type: 'PRIMARY',
        });

      if (linkError) throw linkError;

      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-insight-detail'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-decision-cards'] });
    },
  });
}
