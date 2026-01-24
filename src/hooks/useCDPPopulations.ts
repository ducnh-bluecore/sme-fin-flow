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

export interface PopulationDetailData {
  id: string;
  name: string;
  type: PopulationType;
  definition: string;
  naturalLanguageDescription: string;
  customerCount: number;
  totalRevenue: number;
  revenueShare: number;
  customerShare: number;
  estimatedEquity: number;
  avgOrderValue: number;
  purchaseCycleDays: number;
  returnRate: number;
  stability: StabilityLevel;
  insightCount: number;
  version: number;
  lastUpdated: string;
  criteriaJson: Record<string, unknown> | null;
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

      // Query from view with computed revenue_share
      const { data, error } = await supabase
        .from('v_cdp_population_catalog' as any)
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching population catalog:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.population_id,
        name: row.name,
        type: row.population_type as PopulationType,
        definition: row.definition || '',
        size: row.customer_count || 0,
        revenueShare: Number(row.revenue_share) || 0,
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

// Hook for single population detail
export function useCDPPopulationDetail(populationId: string | undefined) {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-population-detail', tenantId, populationId],
    queryFn: async (): Promise<PopulationDetailData | null> => {
      if (!tenantId || !populationId) return null;

      const { data, error } = await supabase
        .from('v_cdp_population_detail' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('population_id', populationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching population detail:', error);
        return null;
      }

      if (!data) return null;

      const row = data as any;

      return {
        id: row.population_id,
        name: row.name,
        type: row.population_type as PopulationType,
        definition: row.definition || '',
        naturalLanguageDescription: row.natural_language_description || '',
        customerCount: row.customer_count || 0,
        totalRevenue: Number(row.total_revenue) || 0,
        revenueShare: Number(row.revenue_share) || 0,
        customerShare: Number(row.customer_share) || 0,
        estimatedEquity: Number(row.estimated_equity) || 0,
        avgOrderValue: Number(row.avg_order_value) || 0,
        purchaseCycleDays: Math.round(Number(row.purchase_cycle_days) || 30),
        returnRate: Number(row.return_rate) || 0,
        stability: (row.stability || 'stable') as StabilityLevel,
        insightCount: row.insight_count || 0,
        version: row.version || 1,
        lastUpdated: row.last_updated 
          ? new Date(row.last_updated).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        criteriaJson: row.criteria_json as Record<string, unknown> | null,
      };
    },
    enabled: !!tenantId && !!populationId,
    staleTime: 5 * 60 * 1000,
  });
}
