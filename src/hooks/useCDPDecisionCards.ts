import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';

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

export function useCDPDecisionCardDetail(cardId: string | undefined) {
  const { activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-decision-card-detail', tenantId, cardId],
    queryFn: async (): Promise<DecisionCardDetail | null> => {
      if (!tenantId || !cardId) return null;

      const { data, error } = await supabase
        .from('v_cdp_decision_cards_detail')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', cardId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Parse source insights from JSONB
      let sourceInsights: DecisionCardDetail['sourceInsights'] = [];
      if (data.source_insights && Array.isArray(data.source_insights)) {
        sourceInsights = data.source_insights.map((s: any) => ({
          code: s.code || s.insight_code || 'INS-001',
          title: s.title || 'Insight',
          change: s.change || '-10%',
          impact: s.impact || 'Medium',
        }));
      }

      // Parse affected population
      const affectedPopulation = data.affected_population ? {
        description: (data.affected_population as any).description || 'Affected customers',
        size: Number((data.affected_population as any).size) || data.population_size || 0,
        revenueShare: Number((data.affected_population as any).revenue_share) || 0,
        equityShare: Number((data.affected_population as any).equity_share) || 0,
      } : {
        description: 'Affected customers',
        size: data.population_size || 0,
        revenueShare: 0,
        equityShare: 0,
      };

      // Parse risks
      const risks = data.risks ? {
        revenue: (data.risks as any).revenue || 'Revenue at risk',
        cashflow: (data.risks as any).cashflow || 'Cash flow impact',
        longTerm: (data.risks as any).longTerm || 'Long-term implications',
        level: ((data.risks as any).level || data.severity || 'medium') as 'low' | 'medium' | 'high',
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
    enabled: !!tenantId && !!cardId,
    staleTime: 5 * 60 * 1000,
  });
}
