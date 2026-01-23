/**
 * CDP SSOT Types - Data-Truthful Customer Platform
 * 
 * CDP MANIFESTO:
 * - Never simulate customer value
 * - Empty state is acceptable if data insufficient
 * - Show reason for missing data, not fake numbers
 * - All metrics from DB views or marked as estimated
 * 
 * @architecture database-first
 * @domain CDP
 */

// ============ DATA STATUS ============

export type CDPDataStatus = 
  | 'available'      // Real data from DB
  | 'insufficient'   // Not enough data for reliable calculation
  | 'unavailable'    // No data at all
  | 'scheduled'      // Pending scheduled job
  | 'estimated';     // Proxy/estimated with reason

export interface CDPDataMeta {
  status: CDPDataStatus;
  source: string;             // View/table name
  reason?: string;            // Why unavailable or estimated
  last_computed?: string;     // When was this last computed
  sample_size?: number;       // How many records
  confidence_score?: number;  // 0-100
  next_refresh?: string;      // When will it be recomputed
}

// ============ CDP METRIC VALUE ============

export interface CDPMetricValue<T = number> {
  value: T;
  meta: CDPDataMeta;
}

// Helper to create available metric
export function createAvailableMetric<T>(
  value: T,
  source: string,
  sampleSize?: number
): CDPMetricValue<T> {
  return {
    value,
    meta: {
      status: 'available',
      source,
      sample_size: sampleSize,
      confidence_score: 100,
      last_computed: new Date().toISOString(),
    },
  };
}

// Helper to create insufficient metric (data exists but not enough)
export function createInsufficientMetric<T>(
  defaultValue: T,
  reason: string,
  sampleSize: number
): CDPMetricValue<T> {
  return {
    value: defaultValue,
    meta: {
      status: 'insufficient',
      source: 'none',
      reason,
      sample_size: sampleSize,
      confidence_score: 0,
    },
  };
}

// Helper to create unavailable metric (no data at all)
export function createUnavailableMetric<T>(
  defaultValue: T,
  reason: string
): CDPMetricValue<T> {
  return {
    value: defaultValue,
    meta: {
      status: 'unavailable',
      source: 'none',
      reason,
      confidence_score: 0,
    },
  };
}

// Helper to create scheduled metric (pending computation)
export function createScheduledMetric<T>(
  defaultValue: T,
  nextRefresh: string
): CDPMetricValue<T> {
  return {
    value: defaultValue,
    meta: {
      status: 'scheduled',
      source: 'pending',
      reason: 'Scheduled job chưa chạy',
      next_refresh: nextRefresh,
      confidence_score: 0,
    },
  };
}

// Helper to create estimated metric (proxy calculation)
export function createEstimatedMetric<T>(
  value: T,
  source: string,
  reason: string,
  confidence: number
): CDPMetricValue<T> {
  return {
    value,
    meta: {
      status: 'estimated',
      source,
      reason,
      confidence_score: confidence,
      last_computed: new Date().toISOString(),
    },
  };
}

// ============ CUSTOMER EQUITY ============

export interface CDPEquityOverview {
  // Core metrics - each with status
  total_equity_12m: CDPMetricValue<number>;
  total_equity_24m: CDPMetricValue<number>;
  at_risk_value: CDPMetricValue<number>;
  at_risk_percent: CDPMetricValue<number>;
  
  // Change metrics
  equity_change: CDPMetricValue<number>;
  change_direction: 'up' | 'down' | 'stable';
  
  // Metadata
  last_updated: string | null;
  model_version: string;
  
  // Data quality
  has_sufficient_data: boolean;
  minimum_customers_required: number;
  actual_customer_count: number;
}

export interface CDPEquityDistribution {
  segment_id: string;
  segment_name: string;
  segment_type: 'tier' | 'segment' | 'cohort';
  
  // Metrics - each with status
  equity: CDPMetricValue<number>;
  share_percent: CDPMetricValue<number>;
  customer_count: CDPMetricValue<number>;
  avg_ltv: CDPMetricValue<number>;
  
  // Status
  risk_level: 'low' | 'medium' | 'high';
  display_status: 'normal' | 'at_risk' | 'inactive';
}

export interface CDPEquityDriver {
  driver_id: string;
  factor: string;
  description: string;
  
  // Impact - with status
  impact: CDPMetricValue<number>;
  direction: 'up' | 'down';
  severity: 'high' | 'medium' | 'low';
  
  // Trend
  trend: string;
  related_insight_id: string | null;
}

// ============ CUSTOMER LTV ============

export interface CDPCustomerLTV {
  customer_id: string;
  anonymized_id: string;  // For display - never show real customer data
  
  // LTV metrics
  ltv_12m: CDPMetricValue<number>;
  ltv_24m: CDPMetricValue<number>;
  
  // Behavior
  segment: string;
  behavior_status: 'normal' | 'at_risk' | 'inactive';
  
  // Transaction history
  last_purchase: string | null;
  purchase_count: number;
  total_revenue: number;
  
  // Confidence
  data_confidence: number;
}

// ============ INSIGHT / SIGNAL ============

export interface CDPInsightSignal {
  id: string;
  insight_code: string;
  headline: string;
  
  // Population
  population: string;
  population_count: CDPMetricValue<number>;
  
  // Impact
  direction: 'up' | 'down' | 'stable';
  change_percent: CDPMetricValue<number>;
  revenue_impact: CDPMetricValue<number>;
  
  // Severity
  severity: 'critical' | 'high' | 'medium';
  category: 'value' | 'velocity' | 'mix' | 'risk' | 'quality';
  
  // Metadata
  source: 'backend' | 'scheduled_job';
  created_at: string;
}

// ============ DATA QUALITY ============

export interface CDPDataQuality {
  // Overall score
  overall_score: number;
  quality_level: 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient';
  
  // Coverage metrics
  identity_coverage: CDPMetricValue<number>;
  cogs_coverage: CDPMetricValue<number>;
  order_coverage: CDPMetricValue<number>;
  
  // Freshness
  days_since_last_order: number;
  data_freshness_level: 'fresh' | 'stale' | 'very_stale';
  
  // Issues
  issues: Array<{
    id: string;
    label: string;
    severity: 'critical' | 'warning' | 'info';
    action?: string;
  }>;
  
  // Requirements
  minimum_orders_required: number;
  minimum_customers_required: number;
  actual_orders: number;
  actual_customers: number;
  
  // Status
  is_sufficient_for_insights: boolean;
  is_sufficient_for_equity: boolean;
}

// ============ CDP SSOT RESULT ============

export interface CDPSSOTResult {
  // Equity data
  equityOverview: CDPEquityOverview | null;
  equityDistribution: CDPEquityDistribution[];
  equityDrivers: CDPEquityDriver[];
  
  // Insights (from backend only)
  insights: CDPInsightSignal[];
  
  // Data quality
  dataQuality: CDPDataQuality;
  
  // Empty state info
  isEmpty: boolean;
  emptyReason: string | null;
  
  // Metadata
  as_of_timestamp: string;
  
  // Loading state
  isLoading: boolean;
  error: Error | null;
}

// ============ HELPER FUNCTIONS ============

export function isMetricAvailable(metric: CDPMetricValue<unknown>): boolean {
  return metric.meta.status === 'available';
}

export function getMetricStatusLabel(status: CDPDataStatus): string {
  const labels: Record<CDPDataStatus, string> = {
    available: 'Dữ liệu thực',
    insufficient: 'Chưa đủ dữ liệu',
    unavailable: 'Không có dữ liệu',
    scheduled: 'Đang xử lý',
    estimated: 'Ước tính',
  };
  return labels[status];
}

export function getMetricStatusColor(status: CDPDataStatus): string {
  const colors: Record<CDPDataStatus, string> = {
    available: 'text-green-500',
    insufficient: 'text-yellow-500',
    unavailable: 'text-red-500',
    scheduled: 'text-blue-500',
    estimated: 'text-orange-500',
  };
  return colors[status];
}

export function getMetricStatusBgColor(status: CDPDataStatus): string {
  const colors: Record<CDPDataStatus, string> = {
    available: 'bg-green-500/10',
    insufficient: 'bg-yellow-500/10',
    unavailable: 'bg-red-500/10',
    scheduled: 'bg-blue-500/10',
    estimated: 'bg-orange-500/10',
  };
  return colors[status];
}

// Minimum thresholds for CDP calculations
export const CDP_MINIMUM_THRESHOLDS = {
  // Minimum customers needed for equity calculation
  MIN_CUSTOMERS_FOR_EQUITY: 100,
  
  // Minimum orders needed for LTV calculation
  MIN_ORDERS_FOR_LTV: 50,
  
  // Minimum repeat purchases for behavior analysis
  MIN_REPEAT_PURCHASES: 20,
  
  // Minimum days of data for trend detection
  MIN_DAYS_FOR_TREND: 30,
  
  // Minimum sample size for statistical significance
  MIN_SAMPLE_SIZE: 30,
};
