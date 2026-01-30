import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';
export interface DecisionCardSummary {
  id: string;
  title: string;
  summary: string | null;
  problem_statement: string | null; // Added for direct insight display
  status: 'NEW' | 'IN_REVIEW' | 'DECIDED' | 'ARCHIVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner_role: string;
  category: string;
  created_at: string;
  review_by: string | null;
  decision_due: string | null;
  source_type: string;
  source_ref: Record<string, unknown> | null;
}

export interface DecisionCardDetail {
  id: string;
  title: string;
  status: 'new' | 'reviewing' | 'decide' | 'archived';
  severity: 'low' | 'medium' | 'high';
  priority: string;
  owner: 'CEO' | 'CFO' | 'COO';
  reviewDeadline: string;
  createdAt: string;
  problemStatement: string;
  sourceInsights: Array<{ code: string; title: string; change: string; impact: string }>;
  sourceEquity: boolean;
  populationSize: number;
  equityImpact: number;
  affectedPopulation: {
    description: string;
    size: number;
    revenueShare: number;
    equityShare: number;
  };
  risks: {
    revenue: string;
    cashflow: string;
    longTerm: string;
    level: 'low' | 'medium' | 'high';
  };
  options?: string[];
  decision?: {
    outcome: string;
    note: string;
    decidedAt: string;
    decidedBy: string;
  };
  postDecisionReview?: string;
}

// Hook to fetch list of decision cards from cdp_decision_cards table
export function useCDPDecisionCards() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-decision-cards-list', tenantId],
    queryFn: async (): Promise<DecisionCardSummary[]> => {
      if (!tenantId) return [];

      let query = client.from('cdp_decision_cards').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DecisionCardSummary[];
    },
    enabled: isReady,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCDPDecisionCardDetail(cardId: string | undefined) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-decision-card-detail', tenantId, cardId],
    queryFn: async (): Promise<DecisionCardDetail | null> => {
      if (!tenantId || !cardId) return null;

      let query = client.from('v_cdp_decision_cards_detail').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.eq('id', cardId).maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Parse source insights from JSONB - can be object or array
      let sourceInsights: DecisionCardDetail['sourceInsights'] = [];
      if (data.source_insights) {
        if (Array.isArray(data.source_insights)) {
          sourceInsights = data.source_insights.map((s: unknown) => {
            const record = s as Record<string, unknown>;
            return {
              code: String(record.code || record.insight_code || 'INS-001'),
              title: String(record.title || 'Insight liên quan'),
              change: String(record.change || '—'),
              impact: String(record.impact || '—'),
            };
          });
        } else if (typeof data.source_insights === 'object') {
          // Single object case
          const record = data.source_insights as Record<string, unknown>;
          sourceInsights = [{
            code: String(record.code || record.insight_code || 'INS-001'),
            title: String(record.title || 'Insight liên quan'),
            change: String(record.change || '—'),
            impact: String(record.impact || '—'),
          }];
        }
      }

      // Parse affected population - prefer population_size from view
      const popData = data.affected_population as Record<string, unknown> | null;
      const affectedPopulation = {
        description: String(popData?.description || popData?.segment || 'Khách hàng bị ảnh hưởng'),
        size: data.population_size || Number(popData?.size) || 0,
        revenueShare: Number(popData?.revenue_share) || 0,
        equityShare: Number(popData?.equity_share) || 0,
      };

      // Parse risks
      const risks = data.risks ? {
        revenue: (data.risks as Record<string, unknown>).revenue as string || 'Revenue at risk',
        cashflow: (data.risks as Record<string, unknown>).cashflow as string || 'Cash flow impact',
        longTerm: (data.risks as Record<string, unknown>).longTerm as string || 'Long-term implications',
        level: ((data.risks as Record<string, unknown>).level || data.severity || 'medium') as 'low' | 'medium' | 'high',
      } : {
        revenue: 'Revenue at risk',
        cashflow: 'Cash flow impact',
        longTerm: 'Long-term implications',
        level: (data.severity || 'medium') as 'low' | 'medium' | 'high',
      };

      return {
        id: data.id,
        title: data.title,
        status: (data.status || 'new') as DecisionCardDetail['status'],
        severity: (data.severity || 'medium') as DecisionCardDetail['severity'],
        priority: data.priority || 'medium',
        owner: (data.owner || 'CEO') as DecisionCardDetail['owner'],
        reviewDeadline: data.review_deadline ? new Date(data.review_deadline).toLocaleDateString('vi-VN') : '',
        createdAt: data.created_at ? new Date(data.created_at).toLocaleDateString('vi-VN') : '',
        problemStatement: data.problem_statement || '',
        sourceInsights,
        sourceEquity: data.source_equity || false,
        populationSize: data.population_size || 0,
        equityImpact: Number(data.equity_impact) || 0,
        affectedPopulation,
        risks,
        options: data.options as string[] || undefined,
        decision: data.decision as DecisionCardDetail['decision'] || undefined,
        postDecisionReview: data.post_decision_review || undefined,
      };
    },
    enabled: isReady && !!cardId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hook to record a decision
export function useRecordDecision() {
  const { tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      outcome,
      note,
      decidedBy,
    }: {
      cardId: string;
      outcome: string;
      note: string;
      decidedBy: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const decisionData = {
        outcome,
        note,
        decidedAt: new Date().toISOString(),
        decidedBy,
      };

      const { data, error } = await supabase
        .from('cdp_decision_cards')
        .update({
          status: 'DECIDED',
          decision_outcome: outcome,
          decision_note: note,
          decision_recorded_at: new Date().toISOString(),
          decision_recorded_by: decidedBy,
        })
        .eq('id', cardId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Đã ghi nhận quyết định thành công');
      queryClient.invalidateQueries({ queryKey: ['cdp-decision-card-detail', tenantId, variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ['cdp-decision-cards-list'] });
    },
    onError: (error) => {
      console.error('Failed to record decision:', error);
      toast.error('Không thể ghi nhận quyết định. Vui lòng thử lại.');
    },
  });
}
