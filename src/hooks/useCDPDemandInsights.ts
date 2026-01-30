import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
// Types matching v_cdp_demand_insights view
export type DemandCategory = 'demand_shift' | 'substitution' | 'basket_structure' | 'product_customer' | 'product_risk';

export interface DemandInsight {
  event_id: string;
  code: string;
  category: DemandCategory;
  name_vi: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  product_group: string;
  affected_customers: number;
  revenue_contribution: number;
  shift_percent: number;
  shift_direction: 'up' | 'down';
  business_meaning_vi: string;
  risk_vi: string;
  detected_at: string;
  status: 'active' | 'cooldown';
}

export interface DemandCategoryCount {
  category: DemandCategory;
  total_count: number;
  active_count: number;
}

// Hook for demand insights list
export function useCDPDemandInsights() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-demand-insights', tenantId],
    queryFn: async (): Promise<DemandInsight[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_demand_insights').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.order('detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching demand insights:', error);
        return [];
      }

      return (data || []).map(row => ({
        event_id: row.event_id,
        code: row.code,
        category: row.category as DemandCategory,
        name_vi: row.name_vi,
        description: row.description,
        severity: row.severity as 'critical' | 'high' | 'medium',
        product_group: row.product_group,
        affected_customers: row.affected_customers || 0,
        revenue_contribution: row.revenue_contribution || 0,
        shift_percent: row.shift_percent || 0,
        shift_direction: row.shift_direction as 'up' | 'down',
        business_meaning_vi: row.business_meaning_vi,
        risk_vi: row.risk_vi,
        detected_at: row.detected_at,
        status: row.status as 'active' | 'cooldown',
      }));
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for demand category counts
export function useCDPDemandCategoryCounts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-demand-category-counts', tenantId],
    queryFn: async (): Promise<Record<DemandCategory, DemandCategoryCount>> => {
      const defaultCounts: Record<DemandCategory, DemandCategoryCount> = {
        demand_shift: { category: 'demand_shift', total_count: 0, active_count: 0 },
        substitution: { category: 'substitution', total_count: 0, active_count: 0 },
        basket_structure: { category: 'basket_structure', total_count: 0, active_count: 0 },
        product_customer: { category: 'product_customer', total_count: 0, active_count: 0 },
        product_risk: { category: 'product_risk', total_count: 0, active_count: 0 },
      };

      if (!tenantId) return defaultCounts;

      let query = client.from('v_cdp_demand_category_counts').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching demand category counts:', error);
        return defaultCounts;
      }

      const counts = { ...defaultCounts };
      (data || []).forEach(row => {
        const category = row.category as DemandCategory;
        if (counts[category]) {
          counts[category] = {
            category,
            total_count: row.total_count || 0,
            active_count: row.active_count || 0,
          };
        }
      });

      return counts;
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
  });
}

// Combined hook
export function useCDPDemandIntelligence() {
  const insightsQuery = useCDPDemandInsights();
  const countsQuery = useCDPDemandCategoryCounts();

  return {
    insights: insightsQuery.data || [],
    categoryCounts: countsQuery.data || {
      demand_shift: { category: 'demand_shift' as const, total_count: 0, active_count: 0 },
      substitution: { category: 'substitution' as const, total_count: 0, active_count: 0 },
      basket_structure: { category: 'basket_structure' as const, total_count: 0, active_count: 0 },
      product_customer: { category: 'product_customer' as const, total_count: 0, active_count: 0 },
      product_risk: { category: 'product_risk' as const, total_count: 0, active_count: 0 },
    },
    isLoading: insightsQuery.isLoading || countsQuery.isLoading,
    error: insightsQuery.error || countsQuery.error,
  };
}
