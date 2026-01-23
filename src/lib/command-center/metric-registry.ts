/**
 * FEDERATED COMMAND CENTER - METRIC REGISTRY
 * 
 * Central registry of all metrics used across Command Centers.
 * Each metric is registered with its contract details.
 * 
 * RULES:
 * - metric_code MUST be snake_case lowercase
 * - Each metric MUST have a single source_view (SSOT)
 * - Grain MUST be explicit
 */

import { MetricContract, CommandCenterDomain, MetricGrain, MetricSource } from './contracts';

// ═══════════════════════════════════════════════════════════════════
// FDP METRICS
// ═══════════════════════════════════════════════════════════════════

const FDP_METRICS: MetricContract[] = [
  // Cash Metrics
  {
    metric_code: 'cash_position',
    label: 'Cash Position',
    label_vi: 'Số dư tiền mặt',
    source_view: 'bank_accounts',
    source_expression: 'SUM(current_balance)',
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'cash_runway_days',
    label: 'Cash Runway',
    label_vi: 'Số ngày còn hoạt động',
    source_view: 'v_cash_runway',
    source_expression: 'runway_days',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'days',
    domain: 'FDP',
    is_actionable: true,
  },
  // AR Metrics
  {
    metric_code: 'ar_total',
    label: 'Total AR',
    label_vi: 'Tổng công nợ phải thu',
    source_view: 'ar_aging',
    source_expression: 'SUM(outstanding_amount)',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'ar_overdue_amount',
    label: 'Overdue AR',
    label_vi: 'Công nợ quá hạn',
    source_view: 'ar_aging',
    source_expression: "SUM(CASE WHEN aging_bucket != 'current' THEN outstanding_amount ELSE 0 END)",
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'ar_overdue_ratio',
    label: 'AR Overdue Ratio',
    label_vi: 'Tỷ lệ công nợ quá hạn',
    source_view: 'ar_aging',
    source_expression: 'overdue_amount / total_ar',
    grain: 'tenant',
    source_type: 'hook_computed',
    version: 1,
    unit: 'percent',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'dso_days',
    label: 'DSO',
    label_vi: 'Số ngày thu tiền bình quân',
    source_view: 'v_working_capital_metrics',
    source_expression: 'dso',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'days',
    domain: 'FDP',
    is_actionable: true,
  },
  // Profit Metrics
  {
    metric_code: 'net_revenue',
    label: 'Net Revenue',
    label_vi: 'Doanh thu thuần',
    source_view: 'external_orders',
    source_expression: 'SUM(net_revenue)',
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: false,
  },
  {
    metric_code: 'contribution_margin',
    label: 'Contribution Margin',
    label_vi: 'Lợi nhuận gộp',
    source_view: 'external_orders',
    source_expression: 'SUM(net_profit)',
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'contribution_margin_percent',
    label: 'CM %',
    label_vi: 'Tỷ suất lợi nhuận gộp',
    source_view: 'external_orders',
    source_expression: 'SUM(net_profit) / NULLIF(SUM(net_revenue), 0)',
    grain: 'tenant',
    source_type: 'hook_computed',
    version: 1,
    unit: 'percent',
    domain: 'FDP',
    is_actionable: true,
  },
  // SKU Metrics
  {
    metric_code: 'sku_margin',
    label: 'SKU Margin',
    label_vi: 'Margin theo SKU',
    source_view: 'fdp_sku_summary',
    source_expression: 'margin_percent',
    grain: 'sku',
    source_type: 'database_view',
    version: 1,
    unit: 'percent',
    domain: 'FDP',
    is_actionable: true,
  },
  {
    metric_code: 'sku_total_profit',
    label: 'SKU Total Profit',
    label_vi: 'Tổng lợi nhuận SKU',
    source_view: 'fdp_sku_summary',
    source_expression: 'total_profit',
    grain: 'sku',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'FDP',
    is_actionable: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
// MDP METRICS
// ═══════════════════════════════════════════════════════════════════

const MDP_METRICS: MetricContract[] = [
  {
    metric_code: 'profit_roas',
    label: 'Profit ROAS',
    label_vi: 'ROAS theo lợi nhuận',
    source_view: 'channel_pl_cache',
    source_expression: 'contribution_margin / NULLIF(ad_spend, 0)',
    grain: 'campaign',
    source_type: 'hook_computed',
    version: 1,
    unit: 'ratio',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'campaign_cm',
    label: 'Campaign CM',
    label_vi: 'Lợi nhuận campaign',
    source_view: 'channel_pl_cache',
    source_expression: 'contribution_margin',
    grain: 'campaign',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'campaign_cm_percent',
    label: 'Campaign CM %',
    label_vi: 'Tỷ suất lợi nhuận campaign',
    source_view: 'channel_pl_cache',
    source_expression: 'contribution_margin / NULLIF(net_revenue, 0)',
    grain: 'campaign',
    source_type: 'hook_computed',
    version: 1,
    unit: 'percent',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'cash_conversion_rate',
    label: 'Cash Conversion Rate',
    label_vi: 'Tỷ lệ chuyển đổi tiền mặt',
    source_view: 'channel_settlements',
    source_expression: 'settled_amount / NULLIF(gross_sales, 0)',
    grain: 'channel',
    source_type: 'hook_computed',
    version: 1,
    unit: 'percent',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'channel_ad_spend',
    label: 'Channel Ad Spend',
    label_vi: 'Chi phí quảng cáo kênh',
    source_view: 'marketing_expenses',
    source_expression: 'SUM(amount)',
    grain: 'channel',
    source_type: 'database_table',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'cac',
    label: 'CAC',
    label_vi: 'Chi phí thu hút khách hàng',
    source_view: 'v_marketing_metrics',
    source_expression: 'cac',
    grain: 'channel',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'MDP',
    is_actionable: true,
  },
  {
    metric_code: 'return_rate',
    label: 'Return Rate',
    label_vi: 'Tỷ lệ hoàn trả',
    source_view: 'external_orders',
    source_expression: 'COUNT(CASE WHEN status = returned) / COUNT(*)',
    grain: 'campaign',
    source_type: 'hook_computed',
    version: 1,
    unit: 'percent',
    domain: 'MDP',
    is_actionable: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
// CDP METRICS
// ═══════════════════════════════════════════════════════════════════

const CDP_METRICS: MetricContract[] = [
  {
    metric_code: 'customer_equity_12m',
    label: 'Customer Equity (12M)',
    label_vi: 'Giá trị khách hàng 12 tháng',
    source_view: 'v_cdp_equity_overview',
    source_expression: 'total_equity_12m',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'CDP',
    is_actionable: true,
  },
  {
    metric_code: 'customer_at_risk_value',
    label: 'At-Risk Customer Value',
    label_vi: 'Giá trị khách hàng có nguy cơ',
    source_view: 'v_cdp_equity_overview',
    source_expression: 'at_risk_value',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'CDP',
    is_actionable: true,
  },
  {
    metric_code: 'segment_ltv',
    label: 'Segment LTV',
    label_vi: 'LTV theo segment',
    source_view: 'cdp_customer_metrics',
    source_expression: 'AVG(ltv_12m)',
    grain: 'segment',
    source_type: 'database_table',
    version: 1,
    unit: 'currency',
    currency: 'VND',
    domain: 'CDP',
    is_actionable: true,
  },
  {
    metric_code: 'population_size',
    label: 'Population Size',
    label_vi: 'Quy mô tập khách hàng',
    source_view: 'cdp_populations',
    source_expression: 'member_count',
    grain: 'population',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CDP',
    is_actionable: false,
  },
  {
    metric_code: 'revenue_concentration',
    label: 'Revenue Concentration',
    label_vi: 'Tập trung doanh thu',
    source_view: 'v_cdp_equity_overview',
    source_expression: 'top_segment_concentration',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'percent',
    domain: 'CDP',
    is_actionable: true,
  },
  {
    metric_code: 'churn_risk_count',
    label: 'Churn Risk Customers',
    label_vi: 'Khách hàng có nguy cơ rời bỏ',
    source_view: 'v_cdp_equity_overview',
    source_expression: 'churn_risk_customers',
    grain: 'tenant',
    source_type: 'database_view',
    version: 1,
    unit: 'count',
    domain: 'CDP',
    is_actionable: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
// CONTROL TOWER METRICS
// ═══════════════════════════════════════════════════════════════════

const CONTROL_TOWER_METRICS: MetricContract[] = [
  {
    metric_code: 'active_alerts_count',
    label: 'Active Alerts',
    label_vi: 'Cảnh báo đang hoạt động',
    source_view: 'alert_instances',
    source_expression: "COUNT(*) WHERE status = 'active'",
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CONTROL_TOWER',
    is_actionable: false,
  },
  {
    metric_code: 'critical_alerts_count',
    label: 'Critical Alerts',
    label_vi: 'Cảnh báo nguy cấp',
    source_view: 'alert_instances',
    source_expression: "COUNT(*) WHERE severity = 'critical' AND status = 'active'",
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CONTROL_TOWER',
    is_actionable: true,
  },
  {
    metric_code: 'pending_decisions_count',
    label: 'Pending Decisions',
    label_vi: 'Quyết định chờ xử lý',
    source_view: 'decision_cards',
    source_expression: "COUNT(*) WHERE status IN ('OPEN', 'IN_PROGRESS')",
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CONTROL_TOWER',
    is_actionable: false,
  },
  {
    metric_code: 'overdue_decisions_count',
    label: 'Overdue Decisions',
    label_vi: 'Quyết định quá hạn',
    source_view: 'decision_cards',
    source_expression: "COUNT(*) WHERE status = 'OPEN' AND deadline_at < NOW()",
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CONTROL_TOWER',
    is_actionable: true,
  },
  {
    metric_code: 'escalated_decisions_count',
    label: 'Escalated Decisions',
    label_vi: 'Quyết định leo thang',
    source_view: 'decision_cards',
    source_expression: "COUNT(*) WHERE status = 'ESCALATED'",
    grain: 'tenant',
    source_type: 'database_table',
    version: 1,
    unit: 'count',
    domain: 'CONTROL_TOWER',
    is_actionable: false,
  },
];

// ═══════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════

/**
 * All registered metrics across all domains
 */
export const METRIC_REGISTRY: MetricContract[] = [
  ...FDP_METRICS,
  ...MDP_METRICS,
  ...CDP_METRICS,
  ...CONTROL_TOWER_METRICS,
];

/**
 * Get metrics by domain
 */
export function getMetricsByDomain(domain: CommandCenterDomain): MetricContract[] {
  return METRIC_REGISTRY.filter(m => m.domain === domain);
}

/**
 * Get a specific metric by code
 */
export function getMetricByCode(code: string): MetricContract | undefined {
  return METRIC_REGISTRY.find(m => m.metric_code === code);
}

/**
 * Get all actionable metrics
 */
export function getActionableMetrics(): MetricContract[] {
  return METRIC_REGISTRY.filter(m => m.is_actionable);
}

/**
 * Get metrics by grain
 */
export function getMetricsByGrain(grain: MetricGrain): MetricContract[] {
  return METRIC_REGISTRY.filter(m => m.grain === grain);
}

/**
 * Check if a metric exists
 */
export function metricExists(code: string): boolean {
  return METRIC_REGISTRY.some(m => m.metric_code === code);
}

/**
 * Validate metric code format (snake_case lowercase)
 */
export function isValidMetricCode(code: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(code);
}

/**
 * Get metrics with SSOT warnings (hook_computed)
 */
export function getMetricsWithSSOTRisk(): MetricContract[] {
  return METRIC_REGISTRY.filter(m => m.source_type === 'hook_computed');
}
