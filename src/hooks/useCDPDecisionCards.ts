/**
 * useCDPDecisionCards - Hook for CDP Decision Cards
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface DecisionCardSummary {
  id: string;
  title: string;
  summary: string | null;
  problem_statement: string | null;
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-decision-cards-list', tenantId],
    queryFn: async (): Promise<DecisionCardSummary[]> => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('cdp_decision_cards', '*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DecisionCardSummary[];
    },
    enabled: isReady,
    staleTime: 30 * 1000,
  });
}

export function useCDPDecisionCardDetail(cardId: string | undefined) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-decision-card-detail', tenantId, cardId],
    queryFn: async (): Promise<DecisionCardDetail | null> => {
      if (!tenantId || !cardId) return null;

      const { data, error } = await buildSelectQuery('v_cdp_decision_cards_detail', '*')
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const rawData = data as unknown as Record<string, unknown>;

      // Parse source insights from JSONB
      let sourceInsights: DecisionCardDetail['sourceInsights'] = [];
      if (rawData.source_insights) {
        if (Array.isArray(rawData.source_insights)) {
          sourceInsights = (rawData.source_insights as unknown[]).map((s: unknown) => {
            const record = s as Record<string, unknown>;
            return {
              code: String(record.code || record.insight_code || 'INS-001'),
              title: String(record.title || 'Insight liên quan'),
              change: String(record.change || '—'),
              impact: String(record.impact || '—'),
            };
          });
        } else if (typeof rawData.source_insights === 'object') {
          const record = rawData.source_insights as Record<string, unknown>;
          sourceInsights = [{
            code: String(record.code || record.insight_code || 'INS-001'),
            title: String(record.title || 'Insight liên quan'),
            change: String(record.change || '—'),
            impact: String(record.impact || '—'),
          }];
        }
      }

      // Parse affected population
      const popData = rawData.affected_population as Record<string, unknown> | null;
      const affectedPopulation = {
        description: String(popData?.description || popData?.segment || 'Khách hàng bị ảnh hưởng'),
        size: Number(rawData.population_size) || Number(popData?.size) || 0,
        revenueShare: Number(popData?.revenue_share) || 0,
        equityShare: Number(popData?.equity_share) || 0,
      };

      // Parse risks
      const risksData = rawData.risks as Record<string, unknown> | null;
      const risks = risksData ? {
        revenue: String(risksData.revenue || 'Revenue at risk'),
        cashflow: String(risksData.cashflow || 'Cash flow impact'),
        longTerm: String(risksData.longTerm || 'Long-term implications'),
        level: (risksData.level || rawData.severity || 'medium') as 'low' | 'medium' | 'high',
      } : {
        revenue: 'Revenue at risk',
        cashflow: 'Cash flow impact',
        longTerm: 'Long-term implications',
        level: (rawData.severity || 'medium') as 'low' | 'medium' | 'high',
      };

      return {
        id: String(rawData.id),
        title: String(rawData.title),
        status: (rawData.status || 'new') as DecisionCardDetail['status'],
        severity: (rawData.severity || 'medium') as DecisionCardDetail['severity'],
        priority: String(rawData.priority || 'medium'),
        owner: (rawData.owner || 'CEO') as DecisionCardDetail['owner'],
        reviewDeadline: rawData.review_deadline ? new Date(String(rawData.review_deadline)).toLocaleDateString('vi-VN') : '',
        createdAt: rawData.created_at ? new Date(String(rawData.created_at)).toLocaleDateString('vi-VN') : '',
        problemStatement: String(rawData.problem_statement || ''),
        sourceInsights,
        sourceEquity: Boolean(rawData.source_equity),
        populationSize: Number(rawData.population_size) || 0,
        equityImpact: Number(rawData.equity_impact) || 0,
        affectedPopulation,
        risks,
        options: rawData.options as string[] || undefined,
        decision: rawData.decision as DecisionCardDetail['decision'] || undefined,
        postDecisionReview: rawData.post_decision_review ? String(rawData.post_decision_review) : undefined,
      };
    },
    enabled: isReady && !!cardId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hook to record a decision
export function useRecordDecision() {
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();
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

      const { data, error } = await buildUpdateQuery('cdp_decision_cards', {
        status: 'DECIDED',
        decision_outcome: outcome,
        decision_note: note,
        decision_recorded_at: new Date().toISOString(),
        decision_recorded_by: decidedBy,
      })
        .eq('id', cardId)
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
