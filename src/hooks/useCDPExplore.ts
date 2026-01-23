import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';

// Types for Customer Research
export interface ResearchCustomer {
  id: string;
  anonymousId: string;
  behaviorStatus: 'active' | 'dormant' | 'at_risk' | 'new';
  totalSpend: number;
  orderCount: number;
  lastPurchase: Date | null;
  repurchaseCycle: number;
  aov: number;
  trend: 'up' | 'down' | 'stable';
  returnRate: number;
  marginContribution: number;
}

export interface ResearchStats {
  customerCount: number;
  totalRevenue: number;
  medianAOV: number;
  medianRepurchaseCycle: number;
  returnRate: number;
  promotionDependency: number;
}

export interface SavedResearchView {
  id: string;
  name: string;
  description: string | null;
  creator: string | null;
  createdAt: Date;
  customerCount: number;
  revenueShare: number;
  purpose: 'exploration' | 'hypothesis' | 'monitoring' | 'decision';
  linkedInsights: number;
  linkedDecisions: number;
}

export interface PopulationComparison {
  populationId: string;
  populationName: string;
  populationType: string;
  customerCount: number;
  avgAov: number;
  avgFrequency: number;
  avgReturnRate: number;
  avgRepurchaseCycle: number;
  avgMarginPercent: number;
  totalRevenue: number;
}

export interface ChangeLogEntry {
  id: string;
  populationName: string;
  action: 'created' | 'updated' | 'locked';
  changedBy: string | null;
  changedAt: string;
  version: string;
  purpose: string | null;
  changes: string | null;
}

// Hook: Customer Research List
export function useCDPCustomerResearch(page = 1, pageSize = 10) {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-customer-research', tenantId, page, pageSize],
    queryFn: async (): Promise<{ customers: ResearchCustomer[]; totalCount: number }> => {
      if (!tenantId) return { customers: [], totalCount: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('v_cdp_customer_research')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .range(from, to);

      if (error) throw error;

      const customers: ResearchCustomer[] = (data || []).map((row: any) => ({
        id: row.id,
        anonymousId: row.anonymous_id,
        behaviorStatus: row.behavior_status as ResearchCustomer['behaviorStatus'],
        totalSpend: Number(row.total_spend) || 0,
        orderCount: Number(row.order_count) || 0,
        lastPurchase: row.last_purchase ? new Date(row.last_purchase) : null,
        repurchaseCycle: Number(row.repurchase_cycle) || 30,
        aov: Number(row.aov) || 0,
        trend: row.trend as ResearchCustomer['trend'],
        returnRate: Number(row.return_rate) || 0,
        marginContribution: Number(row.margin_contribution) || 0,
      }));

      return { customers, totalCount: count || 0 };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Research Stats
export function useCDPResearchStats() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-research-stats', tenantId],
    queryFn: async (): Promise<ResearchStats> => {
      if (!tenantId) {
        return {
          customerCount: 0,
          totalRevenue: 0,
          medianAOV: 0,
          medianRepurchaseCycle: 30,
          returnRate: 0,
          promotionDependency: 0,
        };
      }

      const { data, error } = await supabase
        .from('v_cdp_research_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      return {
        customerCount: Number(data?.customer_count) || 0,
        totalRevenue: Number(data?.total_revenue) || 0,
        medianAOV: Number(data?.median_aov) || 0,
        medianRepurchaseCycle: Number(data?.median_repurchase_cycle) || 30,
        returnRate: Number(data?.avg_return_rate) || 0,
        promotionDependency: Number(data?.promotion_dependency) || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Saved Research Views
export function useCDPSavedViews() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-saved-views', tenantId],
    queryFn: async (): Promise<SavedResearchView[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_saved_research_views')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        creator: row.creator,
        createdAt: new Date(row.created_at),
        customerCount: Number(row.customer_count) || 0,
        revenueShare: Number(row.revenue_share) || 0,
        purpose: row.purpose as SavedResearchView['purpose'],
        linkedInsights: Number(row.linked_insights) || 0,
        linkedDecisions: Number(row.linked_decisions) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Population Comparison
export function useCDPPopulationComparison() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-population-comparison', tenantId],
    queryFn: async (): Promise<PopulationComparison[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_population_comparison')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        populationId: row.population_id,
        populationName: row.population_name,
        populationType: row.population_type,
        customerCount: Number(row.customer_count) || 0,
        avgAov: Number(row.avg_aov) || 0,
        avgFrequency: Number(row.avg_frequency) || 0,
        avgReturnRate: Number(row.avg_return_rate) || 0,
        avgRepurchaseCycle: Number(row.avg_repurchase_cycle) || 30,
        avgMarginPercent: Number(row.avg_margin_percent) || 0,
        totalRevenue: Number(row.total_revenue) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Population Changelog
export function useCDPPopulationChangelog() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-population-changelog', tenantId],
    queryFn: async (): Promise<ChangeLogEntry[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_population_changelog')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(50);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        populationName: row.population_name || 'Unknown',
        action: row.action as ChangeLogEntry['action'],
        changedBy: row.changed_by,
        changedAt: row.changed_at ? new Date(row.changed_at).toLocaleString('vi-VN') : '',
        version: row.version || '1.0',
        purpose: row.purpose,
        changes: row.changes,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
