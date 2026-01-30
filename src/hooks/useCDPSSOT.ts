/**
 * CDP SSOT Hook - Data-Truthful Customer Platform
 * 
 * CDP MANIFESTO:
 * - Never simulate customer value
 * - Empty state is acceptable if data insufficient
 * - Show reason for missing data, not fake numbers
 * - All metrics from DB views (scheduled jobs compute them)
 * 
 * @architecture database-first
 * @domain CDP
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useMemo } from 'react';
import {
  CDPSSOTResult,
  CDPEquityOverview,
  CDPEquityDistribution,
  CDPEquityDriver,
  CDPInsightSignal,
  CDPDataQuality,
  CDPMetricValue,
  createAvailableMetric,
  createInsufficientMetric,
  createUnavailableMetric,
  createEstimatedMetric,
  CDP_MINIMUM_THRESHOLDS,
} from '@/types/cdp-ssot';

// ============ MAIN HOOK ============

export function useCDPSSOT(): CDPSSOTResult {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  // ============ QUERY: Customer count (for data sufficiency check) ============
  const customersQuery = useQuery({
    queryKey: ['cdp-ssot-customers-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0 };
      let query = client
        .from('cdp_customers')
        .select('*', { count: 'exact', head: true });
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { count, error } = await query;
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: isReady,
  });

  // ============ QUERY: Orders count (for data sufficiency check) ============
  const ordersQuery = useQuery({
    queryKey: ['cdp-ssot-orders-count', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0 };
      let query = client
        .from('cdp_orders')
        .select('*', { count: 'exact', head: true });
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { count, error } = await query;
      if (error) throw error;
      return { count: count || 0 };
    },
    enabled: isReady,
  });

  // ============ QUERY: Equity Overview from DB view ============
  const equityOverviewQuery = useQuery({
    queryKey: ['cdp-ssot-equity-overview', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      let query = client.from('v_cdp_equity_overview').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady,
  });

  // ============ QUERY: Equity Distribution from DB view ============
  const equityDistributionQuery = useQuery({
    queryKey: ['cdp-ssot-equity-distribution', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = client.from('v_cdp_equity_distribution').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isReady,
  });

  // ============ QUERY: Equity Drivers from DB view ============
  const equityDriversQuery = useQuery({
    queryKey: ['cdp-ssot-equity-drivers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = client.from('v_cdp_equity_drivers').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isReady,
  });

  // ============ QUERY: Insight signals from backend (NOT computed in frontend) ============
  const insightsQuery = useQuery({
    queryKey: ['cdp-ssot-insights', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = client.from('v_cdp_highlight_signals').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: isReady,
  });

  // ============ QUERY: Data quality from DB view ============
  const dataQualityQuery = useQuery({
    queryKey: ['cdp-ssot-data-quality', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      let query = client.from('v_cdp_data_quality').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isReady,
  });

  // ============ DERIVED: Data Quality ============
  const dataQuality = useMemo<CDPDataQuality>(() => {
    const customerCount = customersQuery.data?.count || 0;
    const orderCount = ordersQuery.data?.count || 0;
    const qualityData = dataQualityQuery.data;
    
    const identityCoverage = qualityData?.identity_coverage 
      ? Number(qualityData.identity_coverage) 
      : 0;
    const cogsCoverage = qualityData?.cogs_coverage 
      ? Number(qualityData.cogs_coverage) 
      : 0;
    const daysSinceLastOrder = qualityData?.days_since_last_order 
      ? Number(qualityData.days_since_last_order) 
      : 999;
    
    // Calculate overall score
    let overallScore = 0;
    if (customerCount > 0 && orderCount > 0) {
      overallScore = Math.round(
        (identityCoverage * 0.4) + 
        (cogsCoverage * 0.3) + 
        (Math.max(0, 100 - daysSinceLastOrder * 3) * 0.3)
      );
    }
    
    // Determine quality level
    let qualityLevel: CDPDataQuality['quality_level'] = 'insufficient';
    if (customerCount < CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY) {
      qualityLevel = 'insufficient';
    } else if (overallScore >= 80) {
      qualityLevel = 'excellent';
    } else if (overallScore >= 60) {
      qualityLevel = 'good';
    } else if (overallScore >= 40) {
      qualityLevel = 'fair';
    } else {
      qualityLevel = 'poor';
    }
    
    // Build issues list
    const issues: CDPDataQuality['issues'] = [];
    
    if (customerCount < CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY) {
      issues.push({
        id: 'insufficient_customers',
        label: `Cần tối thiểu ${CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY} khách hàng để tính Equity`,
        severity: 'critical',
        action: 'Import thêm dữ liệu đơn hàng',
      });
    }
    
    if (orderCount < CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV) {
      issues.push({
        id: 'insufficient_orders',
        label: `Cần tối thiểu ${CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV} đơn hàng để tính LTV`,
        severity: 'critical',
        action: 'Import thêm dữ liệu đơn hàng',
      });
    }
    
    if (identityCoverage < 80 && customerCount > 0) {
      issues.push({
        id: 'low_identity_coverage',
        label: 'Identity coverage thấp',
        severity: identityCoverage < 50 ? 'critical' : 'warning',
        action: 'Cải thiện data matching',
      });
    }
    
    if (cogsCoverage < 70 && orderCount > 0) {
      issues.push({
        id: 'low_cogs_coverage',
        label: 'COGS coverage thấp',
        severity: cogsCoverage < 40 ? 'critical' : 'warning',
        action: 'Import dữ liệu giá vốn sản phẩm',
      });
    }
    
    if (daysSinceLastOrder > 7 && orderCount > 0) {
      issues.push({
        id: 'stale_data',
        label: `Dữ liệu cũ ${daysSinceLastOrder} ngày`,
        severity: daysSinceLastOrder > 30 ? 'critical' : 'warning',
        action: 'Sync dữ liệu đơn hàng mới',
      });
    }
    
    return {
      overall_score: overallScore,
      quality_level: qualityLevel,
      identity_coverage: identityCoverage > 0 
        ? createAvailableMetric(identityCoverage, 'v_cdp_data_quality')
        : createUnavailableMetric(0, 'Chưa có dữ liệu identity matching'),
      cogs_coverage: cogsCoverage > 0
        ? createAvailableMetric(cogsCoverage, 'v_cdp_data_quality')
        : createUnavailableMetric(0, 'Chưa có dữ liệu COGS'),
      order_coverage: orderCount > 0
        ? createAvailableMetric(100, 'cdp_orders')
        : createUnavailableMetric(0, 'Chưa có đơn hàng'),
      days_since_last_order: daysSinceLastOrder,
      data_freshness_level: daysSinceLastOrder <= 7 ? 'fresh' : daysSinceLastOrder <= 30 ? 'stale' : 'very_stale',
      issues,
      minimum_orders_required: CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV,
      minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
      actual_orders: orderCount,
      actual_customers: customerCount,
      is_sufficient_for_insights: customerCount >= CDP_MINIMUM_THRESHOLDS.MIN_SAMPLE_SIZE && orderCount >= CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV,
      is_sufficient_for_equity: customerCount >= CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
    };
  }, [customersQuery.data, ordersQuery.data, dataQualityQuery.data]);

  // ============ DERIVED: Equity Overview ============
  const equityOverview = useMemo<CDPEquityOverview | null>(() => {
    const customerCount = customersQuery.data?.count || 0;
    const rawData = equityOverviewQuery.data;
    
    // If insufficient data, return null (show empty state)
    if (customerCount < CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY) {
      return null;
    }
    
    // If no data from view, return unavailable state
    if (!rawData) {
      return {
        total_equity_12m: createUnavailableMetric(0, 'Equity chưa được tính - chạy scheduled job'),
        total_equity_24m: createUnavailableMetric(0, 'Equity chưa được tính - chạy scheduled job'),
        at_risk_value: createUnavailableMetric(0, 'Equity chưa được tính'),
        at_risk_percent: createUnavailableMetric(0, 'Equity chưa được tính'),
        equity_change: createUnavailableMetric(0, 'Chưa có dữ liệu so sánh'),
        change_direction: 'stable',
        last_updated: null,
        model_version: 'v1.0',
        has_sufficient_data: false,
        minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
        actual_customer_count: customerCount,
      };
    }
    
    // Real data from DB view
    return {
      total_equity_12m: createAvailableMetric(rawData.total_equity_12m || 0, 'v_cdp_equity_overview'),
      total_equity_24m: createAvailableMetric(rawData.total_equity_24m || 0, 'v_cdp_equity_overview'),
      at_risk_value: createAvailableMetric(rawData.at_risk_value || 0, 'v_cdp_equity_overview'),
      at_risk_percent: createAvailableMetric(rawData.at_risk_percent || 0, 'v_cdp_equity_overview'),
      equity_change: createAvailableMetric(rawData.equity_change || 0, 'v_cdp_equity_overview'),
      change_direction: (rawData.change_direction as 'up' | 'down' | 'stable') || 'stable',
      last_updated: rawData.last_updated || null,
      model_version: 'v1.0',
      has_sufficient_data: true,
      minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
      actual_customer_count: customerCount,
    };
  }, [customersQuery.data, equityOverviewQuery.data]);

  // ============ DERIVED: Equity Distribution ============
  const equityDistribution = useMemo<CDPEquityDistribution[]>(() => {
    const customerCount = customersQuery.data?.count || 0;
    const rawData = equityDistributionQuery.data || [];
    
    // If insufficient data, return empty array
    if (customerCount < CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY) {
      return [];
    }
    
    // If no data from view, return empty
    if (rawData.length === 0) {
      return [];
    }
    
    // Map real data from new bucket-based schema
    return rawData.map(row => ({
      segment_id: row.bucket || 'unknown',
      segment_name: row.bucket || 'Unknown',
      segment_type: 'tier' as const,
      equity: createAvailableMetric(row.equity_sum || 0, 'v_cdp_equity_distribution'),
      share_percent: createAvailableMetric(0, 'v_cdp_equity_distribution'), // Calculated in view
      customer_count: createAvailableMetric(row.customer_count || 0, 'v_cdp_equity_distribution'),
      avg_ltv: createAvailableMetric(row.equity_avg || 0, 'v_cdp_equity_distribution'),
      risk_level: 'medium' as const,
      display_status: 'normal' as const,
    }));
  }, [customersQuery.data, equityDistributionQuery.data]);

  // ============ DERIVED: Equity Drivers ============
  const equityDrivers = useMemo<CDPEquityDriver[]>(() => {
    const rawData = equityDriversQuery.data || [];
    
    // Return empty if no data (don't fabricate drivers)
    if (rawData.length === 0) {
      return [];
    }
    
    // Map real data from new schema
    return rawData.map((row, idx) => ({
      driver_id: `driver-${idx}`,
      factor: row.factor || 'Unknown',
      description: row.description || '',
      impact: createAvailableMetric(row.impact_percent || 0, 'v_cdp_equity_drivers'),
      direction: (row.direction === 'positive' ? 'up' : 'down') as 'up' | 'down',
      severity: Math.abs(row.impact_percent || 0) >= 25 ? 'high' : Math.abs(row.impact_percent || 0) >= 10 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
      trend: '',
      related_insight_id: null,
    }));
  }, [equityDriversQuery.data]);

  // ============ DERIVED: Insights (from backend ONLY) ============
  const insights = useMemo<CDPInsightSignal[]>(() => {
    const rawData = insightsQuery.data || [];
    
    // Return empty if no data
    if (rawData.length === 0) {
      return [];
    }
    
    return rawData.map(row => ({
      id: row.event_id || row.insight_code,
      insight_code: row.insight_code || '',
      headline: row.headline || '',
      population: row.population_type || 'Unknown',
      population_count: createAvailableMetric(row.n_customers || 0, 'v_cdp_highlight_signals'),
      direction: (row.direction as 'up' | 'down' | 'stable') || 'stable',
      change_percent: createAvailableMetric(Math.abs(row.change_percent || 0), 'v_cdp_highlight_signals'),
      revenue_impact: createAvailableMetric(row.revenue_impact || 0, 'v_cdp_highlight_signals'),
      severity: mapSeverity(row.severity),
      category: mapCategory(row.topic || row.category),
      source: 'backend' as const,
      created_at: row.created_at || new Date().toISOString(),
    }));
  }, [insightsQuery.data]);

  // ============ EMPTY STATE ============
  const isEmpty = !dataQuality.is_sufficient_for_equity && !dataQuality.is_sufficient_for_insights;
  
  let emptyReason: string | null = null;
  if (isEmpty) {
    const customerCount = customersQuery.data?.count || 0;
    const orderCount = ordersQuery.data?.count || 0;
    
    if (customerCount === 0 && orderCount === 0) {
      emptyReason = 'Chưa có dữ liệu khách hàng. Import đơn hàng để bắt đầu.';
    } else if (customerCount < CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY) {
      emptyReason = `Hiện có ${customerCount} khách hàng. Cần tối thiểu ${CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY} khách để tính Customer Equity.`;
    } else if (orderCount < CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV) {
      emptyReason = `Hiện có ${orderCount} đơn hàng. Cần tối thiểu ${CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV} đơn để tính LTV.`;
    }
  }

  const isLoading = 
    customersQuery.isLoading || 
    ordersQuery.isLoading || 
    equityOverviewQuery.isLoading || 
    equityDistributionQuery.isLoading || 
    equityDriversQuery.isLoading || 
    insightsQuery.isLoading ||
    dataQualityQuery.isLoading;

  const error = 
    customersQuery.error || 
    ordersQuery.error || 
    equityOverviewQuery.error || 
    equityDistributionQuery.error || 
    equityDriversQuery.error || 
    insightsQuery.error ||
    dataQualityQuery.error;

  return {
    equityOverview,
    equityDistribution,
    equityDrivers,
    insights,
    dataQuality,
    isEmpty,
    emptyReason,
    as_of_timestamp: new Date().toISOString(),
    isLoading,
    error: error as Error | null,
  };
}

// ============ HELPER FUNCTIONS ============

function mapRiskLevel(status: string | null): 'low' | 'medium' | 'high' {
  if (!status) return 'low';
  if (status === 'at_risk') return 'high';
  if (status === 'inactive') return 'medium';
  return 'low';
}

function mapSeverity(sev: string | null): 'critical' | 'high' | 'medium' {
  const s = (sev || 'medium').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  return 'medium';
}

function mapCategory(cat: string | null): 'value' | 'velocity' | 'mix' | 'risk' | 'quality' {
  const valid = ['value', 'velocity', 'mix', 'risk', 'quality'];
  const normalized = (cat || 'value').toLowerCase();
  return valid.includes(normalized) ? normalized as any : 'value';
}
