// CDP Value Distribution Hooks - DB-First compliant
// Replaces useCDPData frontend calculations

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';

// =====================================================
// Types
// =====================================================

export interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  mean: number;
}

export interface ValueDistribution {
  revenue: PercentileDistribution;
  aov: PercentileDistribution;
  frequency: PercentileDistribution;
  margin: PercentileDistribution;
  returnRate: PercentileDistribution;
}

export interface SegmentSummary {
  name: string;
  customerCount: number;
  percentOfTotal: number;
  totalRevenue: number;
  avgRevenue: number;
  avgMargin: number;
  avgFrequency: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface SummaryStats {
  totalCustomers: number;
  totalRevenue: number;
  avgCustomerValue: number;
  avgOrderValue: number;
  avgFrequency: number;
  top20Revenue: number;
  top20Percent: number;
}

export interface DataQualityMetrics {
  totalOrders: number;
  matchedOrders: number;
  identityCoverage: number;
  cogsCoverage: number;
  freshnessHours: number;
  isReliable: boolean;
}

// =====================================================
// Hooks
// =====================================================

// Value Distribution Percentiles
export function useCDPValueDistribution() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-value-distribution', tenantId],
    queryFn: async (): Promise<ValueDistribution | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_cdp_value_distribution')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching value distribution:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Transform rows into ValueDistribution object
      const result: Partial<ValueDistribution> = {};
      
      for (const row of data) {
        const dist: PercentileDistribution = {
          p10: Number(row.p10) || 0,
          p25: Number(row.p25) || 0,
          p50: Number(row.p50) || 0,
          p75: Number(row.p75) || 0,
          p90: Number(row.p90) || 0,
          min: Number(row.min_val) || 0,
          max: Number(row.max_val) || 0,
          mean: Number(row.mean_val) || 0,
        };
        
        switch (row.metric_name) {
          case 'revenue':
            result.revenue = dist;
            break;
          case 'aov':
            result.aov = dist;
            break;
          case 'frequency':
            result.frequency = dist;
            break;
          case 'margin':
            result.margin = dist;
            break;
          case 'return_rate':
            result.returnRate = dist;
            break;
        }
      }

      // Provide defaults for any missing metrics
      const defaultDist: PercentileDistribution = {
        p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, min: 0, max: 0, mean: 0
      };

      return {
        revenue: result.revenue || defaultDist,
        aov: result.aov || defaultDist,
        frequency: result.frequency || defaultDist,
        margin: result.margin || defaultDist,
        returnRate: result.returnRate || defaultDist,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Segment Summaries
export function useCDPSegmentSummaries() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-segment-summaries', tenantId],
    queryFn: async (): Promise<SegmentSummary[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_segment_summaries')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching segment summaries:', error);
        return [];
      }

      return (data || []).map(row => ({
        name: row.name || '',
        customerCount: Number(row.customer_count) || 0,
        percentOfTotal: Number(row.percent_of_total) || 0,
        totalRevenue: Number(row.total_revenue) || 0,
        avgRevenue: Number(row.avg_revenue) || 0,
        avgMargin: Number(row.avg_margin) || 0,
        avgFrequency: Number(row.avg_frequency) || 0,
        trend: (row.trend as 'up' | 'down' | 'stable') || 'stable',
        trendPercent: Number(row.trend_percent) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Summary Stats
export function useCDPSummaryStats() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-summary-stats', tenantId],
    queryFn: async (): Promise<SummaryStats> => {
      const defaultStats: SummaryStats = {
        totalCustomers: 0,
        totalRevenue: 0,
        avgCustomerValue: 0,
        avgOrderValue: 0,
        avgFrequency: 0,
        top20Revenue: 0,
        top20Percent: 0,
      };

      if (!tenantId) return defaultStats;

      const { data, error } = await supabase
        .from('v_cdp_summary_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching summary stats:', error);
        return defaultStats;
      }

      if (!data) return defaultStats;

      return {
        totalCustomers: Number(data.total_customers) || 0,
        totalRevenue: Number(data.total_revenue) || 0,
        avgCustomerValue: Number(data.avg_customer_value) || 0,
        avgOrderValue: Number(data.avg_order_value) || 0,
        avgFrequency: Number(data.avg_frequency) || 0,
        top20Revenue: Number(data.top20_revenue) || 0,
        top20Percent: Number(data.top20_percent) || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Data Quality
export function useCDPDataQuality() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-data-quality', tenantId],
    queryFn: async (): Promise<DataQualityMetrics> => {
      const defaultMetrics: DataQualityMetrics = {
        totalOrders: 0,
        matchedOrders: 0,
        identityCoverage: 0,
        cogsCoverage: 0,
        freshnessHours: 0,
        isReliable: false,
      };

      if (!tenantId) return defaultMetrics;

      const { data, error } = await supabase
        .from('v_cdp_data_quality')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching data quality:', error);
        return defaultMetrics;
      }

      if (!data) return defaultMetrics;

      return {
        totalOrders: Number(data.total_orders) || 0,
        matchedOrders: Number(data.matched_orders) || 0,
        identityCoverage: Number(data.identity_coverage) || 0,
        cogsCoverage: Number(data.cogs_coverage) || 0,
        freshnessHours: Number(data.freshness_hours) || 0,
        isReliable: Boolean(data.is_reliable),
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// Trend Insights (DB-computed)
export function useCDPTrendData() {
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-trend-insights', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_cdp_trend_insights')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching trend insights:', error);
        return null;
      }

      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
