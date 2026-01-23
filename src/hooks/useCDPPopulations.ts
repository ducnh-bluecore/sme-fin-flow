import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';

export type PopulationType = 'tier' | 'segment' | 'cohort';
export type StabilityLevel = 'stable' | 'drifting' | 'volatile';

export interface PopulationItem {
  id: string;
  name: string;
  type: PopulationType;
  definition: string;
  size: number;
  revenueShare: number;
  stability: StabilityLevel;
  insightCount: number;
}

export interface PopulationSummary {
  tierCount: number;
  segmentCount: number;
  cohortCount: number;
  totalCount: number;
  totalInsights: number;
}

// Hook for population catalog
export function useCDPPopulationCatalog() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-population-catalog', tenantId],
    queryFn: async (): Promise<PopulationItem[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_population_catalog')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching population catalog:', error);
        return [];
      }

      // Calculate total revenue for share calculation (fallback if view doesn't have revenue_share)
      const totalRevenue = (data || []).reduce((sum, p) => sum + (Number(p.total_revenue) || 0), 0);

      return (data || []).map(row => ({
        id: row.population_id,
        name: row.name,
        type: row.population_type as PopulationType,
        definition: row.definition || '',
        size: row.customer_count || 0,
        revenueShare: totalRevenue > 0 
          ? (Number(row.total_revenue) || 0) / totalRevenue * 100 
          : 0,
        stability: (row.stability || 'stable') as StabilityLevel,
        insightCount: row.insight_count || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for population summary
export function useCDPPopulationSummary() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-population-summary', tenantId],
    queryFn: async (): Promise<PopulationSummary> => {
      const defaultSummary: PopulationSummary = {
        tierCount: 0,
        segmentCount: 0,
        cohortCount: 0,
        totalCount: 0,
        totalInsights: 0,
      };

      if (!tenantId) return defaultSummary;

      const { data, error } = await supabase
        .from('v_cdp_population_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching population summary:', error);
        return defaultSummary;
      }

      if (!data) return defaultSummary;

      return {
        tierCount: data.tier_count || 0,
        segmentCount: data.segment_count || 0,
        cohortCount: data.cohort_count || 0,
        totalCount: data.total_count || 0,
        totalInsights: data.total_insights || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Combined hook
export function useCDPPopulations() {
  const catalogQuery = useCDPPopulationCatalog();
  const summaryQuery = useCDPPopulationSummary();

  const populations = catalogQuery.data || [];

  return {
    populations,
    tierPopulations: populations.filter(p => p.type === 'tier'),
    segmentPopulations: populations.filter(p => p.type === 'segment'),
    cohortPopulations: populations.filter(p => p.type === 'cohort'),
    summary: summaryQuery.data || {
      tierCount: 0,
      segmentCount: 0,
      cohortCount: 0,
      totalCount: 0,
      totalInsights: 0,
    },
    isLoading: catalogQuery.isLoading || summaryQuery.isLoading,
    error: catalogQuery.error || summaryQuery.error,
  };
}
