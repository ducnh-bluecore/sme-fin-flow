/**
 * CDP Value Distribution Hooks - DB-First compliant
 * Replaces useCDPData frontend calculations
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

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

export interface TrendInsightsData {
  trend_type: string | null;
  aov_change_percent: number | null;
  current_aov: number | null;
  previous_aov: number | null;
  frequency_change_percent: number | null;
  current_frequency: number | null;
  previous_frequency: number | null;
}

// =====================================================
// Hooks
// =====================================================

// Value Distribution Percentiles
export function useCDPValueDistribution() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-value-distribution', tenantId],
    queryFn: async (): Promise<ValueDistribution | null> => {
      if (!tenantId) return null;

      const { data: rawData, error } = await buildSelectQuery('v_cdp_value_distribution', '*');

      if (error) {
        console.error('Error fetching value distribution:', error);
        return null;
      }

      const data = rawData as unknown as any[];
      if (!data || data.length === 0) return null;

      // The new view returns customer-level data with percentile columns
      // We aggregate to create the distribution object
      const firstRow = data[0];
      
      const defaultDist: PercentileDistribution = {
        p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, min: 0, max: 0, mean: 0
      };

      // Create distribution from percentile columns in view
      const revenueDist: PercentileDistribution = {
        p10: 0,
        p25: Number(firstRow.p25) || 0,
        p50: Number(firstRow.p50) || 0,
        p75: Number(firstRow.p75) || 0,
        p90: Number(firstRow.p90) || 0,
        min: 0,
        max: Number(firstRow.p95) || 0,
        mean: Number(firstRow.avg_order_value) || 0,
      };

      return {
        revenue: revenueDist,
        aov: revenueDist,
        frequency: defaultDist,
        margin: defaultDist,
        returnRate: defaultDist,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}

// Segment Summaries
export function useCDPSegmentSummaries() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-segment-summaries', tenantId],
    queryFn: async (): Promise<SegmentSummary[]> => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('v_cdp_segment_summaries', '*');

      if (error) {
        console.error('Error fetching segment summaries:', error);
        return [];
      }

      // Map new view columns to SegmentSummary interface
      const totalCustomers = (data || []).reduce((sum: number, r: any) => sum + Number(r.customer_count || 0), 0);
      
      return (data || []).map((row: any) => ({
        name: row.segment || '',
        customerCount: Number(row.customer_count) || 0,
        percentOfTotal: totalCustomers > 0 ? (Number(row.customer_count) / totalCustomers) * 100 : 0,
        totalRevenue: Number(row.segment_revenue) || 0,
        avgRevenue: Number(row.avg_revenue_per_customer) || 0,
        avgMargin: Number(row.segment_margin) / Math.max(Number(row.customer_count), 1) || 0,
        avgFrequency: Number(row.avg_orders_per_customer) || 0,
        trend: 'stable' as const,
        trendPercent: 0,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}

// Summary Stats
export function useCDPSummaryStats() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

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

      const { data: rawData, error } = await buildSelectQuery('v_cdp_summary_stats', '*').maybeSingle();

      if (error) {
        console.error('Error fetching summary stats:', error);
        return defaultStats;
      }

      const data = rawData as unknown as any;
      if (!data) return defaultStats;

      // Map new view columns - calculate derived metrics
      const totalRevenue = Number(data.total_revenue) || 0;
      const totalCustomers = Number(data.total_customers) || 0;
      
      return {
        totalCustomers,
        totalRevenue,
        avgCustomerValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
        avgOrderValue: Number(data.avg_order_value) || 0,
        avgFrequency: Number(data.avg_frequency) || 0,
        top20Revenue: 0, // Not available in simplified view
        top20Percent: 0, // Not available in simplified view
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}

// Data Quality
export function useCDPDataQuality() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

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

      const { data: rawData, error } = await buildSelectQuery('v_cdp_data_quality', '*').maybeSingle();

      if (error) {
        console.error('Error fetching data quality:', error);
        return defaultMetrics;
      }

      const data = rawData as unknown as any;
      if (!data) return defaultMetrics;

      return {
        totalOrders: Number(data.total_orders) || 0,
        matchedOrders: Number(data.orders_with_identity) || 0,
        identityCoverage: Number(data.identity_coverage) || 0,
        cogsCoverage: Number(data.cogs_coverage) || 0,
        freshnessHours: (Number(data.days_since_last_order) || 0) * 24,
        isReliable: Boolean(data.is_reliable),
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}

// Trend Insights (DB-computed)
export function useCDPTrendData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-trend-insights', tenantId],
    queryFn: async (): Promise<TrendInsightsData | null> => {
      if (!tenantId) return null;

      const { data: rawData, error } = await buildSelectQuery('v_cdp_trend_insights', '*').maybeSingle();

      if (error) {
        console.error('Error fetching trend insights:', error);
        return null;
      }

      return rawData as unknown as TrendInsightsData | null;
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
