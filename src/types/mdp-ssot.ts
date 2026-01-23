/**
 * MDP SSOT Types - Data-Honest System
 * 
 * MDP MANIFESTO:
 * - Profit before Performance. Cash before Clicks.
 * - Every metric must include observed vs estimated separation
 * - No silent defaults (no fixed 55% COGS, no fixed 12% fees)
 * - Alerts must come from backend, not frontend
 * 
 * @architecture database-first
 * @domain MDP
 */

// ============ ESTIMATION STATUS ============

export type EstimationMethod = 
  | 'actual_data'           // Real data from DB
  | 'historical_average'    // Based on past data
  | 'industry_benchmark'    // Industry standard estimate
  | 'rule_of_thumb'         // Simple heuristic
  | 'machine_learning'      // ML prediction
  | 'manual_input'          // User provided
  | 'not_available';        // No data at all

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface EstimationMeta {
  is_estimated: boolean;
  estimation_method: EstimationMethod;
  confidence_score: number; // 0-100
  confidence_level: ConfidenceLevel;
  reason: string;
  data_source?: string;      // Which table/view it came from
  sample_size?: number;      // How many records used
  last_updated?: string;     // When was this computed
}

// ============ MDP METRIC VALUE ============

export interface MDPMetricValue<T = number> {
  value: T;
  estimation: EstimationMeta;
  as_of_timestamp: string;
  source_ref: string;        // "v_mdp_daily_attribution" or "estimated"
}

// Helper to create observed metric
export function createObservedMetric<T>(
  value: T,
  source: string,
  sampleSize?: number
): MDPMetricValue<T> {
  return {
    value,
    estimation: {
      is_estimated: false,
      estimation_method: 'actual_data',
      confidence_score: 100,
      confidence_level: 'high',
      reason: 'Real data from database',
      data_source: source,
      sample_size: sampleSize,
      last_updated: new Date().toISOString(),
    },
    as_of_timestamp: new Date().toISOString(),
    source_ref: source,
  };
}

// Helper to create estimated metric
export function createEstimatedMetric<T>(
  value: T,
  method: EstimationMethod,
  reason: string,
  confidenceScore: number
): MDPMetricValue<T> {
  const confidenceLevel: ConfidenceLevel = 
    confidenceScore >= 80 ? 'high' :
    confidenceScore >= 60 ? 'medium' :
    confidenceScore >= 40 ? 'low' : 'very_low';

  return {
    value,
    estimation: {
      is_estimated: true,
      estimation_method: method,
      confidence_score: confidenceScore,
      confidence_level: confidenceLevel,
      reason,
      last_updated: new Date().toISOString(),
    },
    as_of_timestamp: new Date().toISOString(),
    source_ref: 'estimated',
  };
}

// Helper to create unavailable metric
export function createUnavailableMetric<T>(defaultValue: T): MDPMetricValue<T> {
  return {
    value: defaultValue,
    estimation: {
      is_estimated: true,
      estimation_method: 'not_available',
      confidence_score: 0,
      confidence_level: 'very_low',
      reason: 'No data available - using placeholder',
      last_updated: new Date().toISOString(),
    },
    as_of_timestamp: new Date().toISOString(),
    source_ref: 'unavailable',
  };
}

// ============ CAMPAIGN PROFIT ATTRIBUTION ============

export interface MDPCampaignAttribution {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  period: string;
  
  // Revenue breakdown - each with estimation status
  gross_revenue: MDPMetricValue<number>;
  discount_given: MDPMetricValue<number>;
  net_revenue: MDPMetricValue<number>;
  
  // Cost breakdown - each with estimation status
  ad_spend: MDPMetricValue<number>;
  cogs: MDPMetricValue<number>;
  platform_fees: MDPMetricValue<number>;
  logistics_cost: MDPMetricValue<number>;
  payment_fees: MDPMetricValue<number>;
  return_cost: MDPMetricValue<number>;
  
  // Profit metrics - derived, estimation depends on inputs
  contribution_margin: MDPMetricValue<number>;
  contribution_margin_percent: MDPMetricValue<number>;
  profit_roas: MDPMetricValue<number>;
  
  // Status
  status: 'profitable' | 'marginal' | 'loss' | 'critical';
  
  // Overall data quality
  overall_confidence: ConfidenceLevel;
  estimated_fields_count: number;
  total_fields_count: number;
}

// ============ CASH IMPACT ============

export interface MDPCashImpact {
  channel: string;
  campaign_id?: string;
  
  // Cash metrics - each with estimation status
  total_spend: MDPMetricValue<number>;
  cash_received: MDPMetricValue<number>;
  pending_cash: MDPMetricValue<number>;
  refund_amount: MDPMetricValue<number>;
  cash_locked_ads: MDPMetricValue<number>;
  
  // Derived metrics
  cash_conversion_rate: MDPMetricValue<number>;
  avg_days_to_cash: MDPMetricValue<number>;
  
  // Assessment
  is_cash_positive: boolean;
  cash_impact_score: MDPMetricValue<number>;
}

// ============ MARKETING ALERTS (from backend only) ============

export type MDPAlertType = 
  | 'negative_margin'
  | 'burning_cash'
  | 'cac_exceeds_ltv'
  | 'cash_runway_impact'
  | 'fake_growth'
  | 'roas_below_threshold'
  | 'high_return_rate';

export type MDPAlertSeverity = 'info' | 'warning' | 'critical';

export interface MDPRiskAlert {
  id: string;
  type: MDPAlertType;
  severity: MDPAlertSeverity;
  
  // Entity reference
  entity_type: 'campaign' | 'channel' | 'sku';
  entity_id: string;
  entity_name: string;
  
  // Alert details
  metric_code: string;
  metric_value: number;
  threshold: number;
  impact_amount: number;
  message: string;
  recommended_action: string;
  
  // Source - MUST come from backend
  created_at: string;
  source: 'backend' | 'edge_function' | 'scheduled_job';
  alert_source_id?: string;  // Reference to early_warning_alerts or decision_cards
}

// ============ MDP SUMMARY ============

export interface MDPMarketingSummary {
  period: string;
  
  // Core metrics with estimation
  total_spend: MDPMetricValue<number>;
  total_revenue: MDPMetricValue<number>;
  total_orders: MDPMetricValue<number>;
  total_leads: MDPMetricValue<number>;
  
  // Performance
  overall_roas: MDPMetricValue<number>;
  overall_cpa: MDPMetricValue<number>;
  overall_ctr: MDPMetricValue<number>;
  overall_conversion: MDPMetricValue<number>;
  
  // Counts
  active_campaigns: number;
  alert_count: number;
}

export interface MDPCMOSummary {
  period: string;
  
  // Financial truth with estimation
  total_marketing_spend: MDPMetricValue<number>;
  total_gross_revenue: MDPMetricValue<number>;
  total_net_revenue: MDPMetricValue<number>;
  total_contribution_margin: MDPMetricValue<number>;
  contribution_margin_percent: MDPMetricValue<number>;
  overall_profit_roas: MDPMetricValue<number>;
  
  // Cash metrics
  total_cash_received: MDPMetricValue<number>;
  total_cash_pending: MDPMetricValue<number>;
  total_cash_locked: MDPMetricValue<number>;
  cash_conversion_rate: MDPMetricValue<number>;
  
  // Campaign status
  profitable_campaigns: number;
  loss_campaigns: number;
  
  // Alert counts
  risk_alerts_count: number;
  critical_alerts_count: number;
  
  // Overall data quality
  overall_confidence: ConfidenceLevel;
  estimated_metrics_percent: number;
}

// ============ DATA QUALITY SUMMARY ============

export interface MDPDataQuality {
  // Data availability
  has_real_cogs: boolean;
  has_real_fees: boolean;
  has_real_settlements: boolean;
  has_channel_analytics: boolean;
  
  // Counts
  orders_count: number;
  campaigns_count: number;
  products_count: number;
  
  // Overall score
  quality_score: number;  // 0-100
  quality_level: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Missing data warnings
  missing_data: string[];
  estimated_fields: string[];
}

// ============ MDP SSOT RESULT ============

export interface MDPSSOTResult {
  // Attribution data
  campaignAttribution: MDPCampaignAttribution[];
  cashImpact: MDPCashImpact[];
  
  // Alerts - MUST come from backend
  riskAlerts: MDPRiskAlert[];
  
  // Summaries
  marketingSummary: MDPMarketingSummary;
  cmoSummary: MDPCMOSummary;
  
  // Data quality
  dataQuality: MDPDataQuality;
  
  // Metadata
  as_of_timestamp: string;
  period: {
    start: string;
    end: string;
  };
  
  // Loading state
  isLoading: boolean;
  error: Error | null;
}

// ============ HELPER FUNCTIONS ============

export function calculateOverallConfidence(metrics: MDPMetricValue<unknown>[]): ConfidenceLevel {
  if (metrics.length === 0) return 'very_low';
  
  const avgConfidence = metrics.reduce((sum, m) => sum + m.estimation.confidence_score, 0) / metrics.length;
  
  if (avgConfidence >= 80) return 'high';
  if (avgConfidence >= 60) return 'medium';
  if (avgConfidence >= 40) return 'low';
  return 'very_low';
}

export function countEstimatedFields(metrics: MDPMetricValue<unknown>[]): number {
  return metrics.filter(m => m.estimation.is_estimated).length;
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-orange-500';
    case 'very_low': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}

export function getConfidenceBgColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'bg-green-500/10';
    case 'medium': return 'bg-yellow-500/10';
    case 'low': return 'bg-orange-500/10';
    case 'very_low': return 'bg-red-500/10';
    default: return 'bg-muted';
  }
}
