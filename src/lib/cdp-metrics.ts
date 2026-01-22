// CDP Metric Types and Constants
// Based on Customer Economics Metric Constitution

export type MetricCategory = 'value' | 'velocity' | 'mix' | 'risk' | 'quality';

export type MetricGranularity = 'customer' | 'cohort' | 'segment' | 'population' | 'distribution';

export interface MetricDefinition {
  code: string;
  name: string;
  nameVi: string;
  category: MetricCategory;
  granularity: MetricGranularity[];
  formula: string;
  window: '30d' | '60d' | '90d' | 'rolling' | 'lifetime';
  interpretationRule: string;
  limitation: string;
  unit: 'currency' | 'percent' | 'days' | 'count' | 'ratio';
}

// Allowed Metrics Registry
export const CDP_METRICS: Record<string, MetricDefinition> = {
  // VALUE METRICS
  VAL_REV: {
    code: 'VAL_REV',
    name: 'Revenue per Customer',
    nameVi: 'Doanh thu / Khách hàng',
    category: 'value',
    granularity: ['cohort', 'segment', 'distribution'],
    formula: 'SUM(order_total) / COUNT(DISTINCT customer_id)',
    window: 'rolling',
    interpretationRule: 'Giảm >10% vs baseline cần attention',
    limitation: 'Chỉ tin cậy khi identity coverage >80%',
    unit: 'currency',
  },
  VAL_GM: {
    code: 'VAL_GM',
    name: 'Gross Margin per Customer',
    nameVi: 'Biên lợi nhuận / Khách hàng',
    category: 'value',
    granularity: ['cohort', 'segment'],
    formula: '(Revenue - COGS) / Revenue per customer',
    window: 'rolling',
    interpretationRule: 'Dịch chuyển >5pp là significant',
    limitation: 'Cần COGS coverage >70%',
    unit: 'percent',
  },
  VAL_NR: {
    code: 'VAL_NR',
    name: 'Net Revenue',
    nameVi: 'Doanh thu thuần',
    category: 'value',
    granularity: ['cohort', 'segment', 'distribution'],
    formula: 'Gross Revenue - Refunds - Returns - Discounts',
    window: 'rolling',
    interpretationRule: 'So sánh với gross để đánh giá chất lượng',
    limitation: 'Cần refund mapping completeness',
    unit: 'currency',
  },
  VAL_LTV: {
    code: 'VAL_LTV',
    name: 'Lifetime Value',
    nameVi: 'Giá trị vòng đời',
    category: 'value',
    granularity: ['cohort', 'segment'],
    formula: 'Realized revenue + (Projected future margin × Retention rate)',
    window: 'lifetime',
    interpretationRule: 'Cohort mới có LTV thấp hơn 20% là warning',
    limitation: 'Projection chỉ rule-based, không ML',
    unit: 'currency',
  },
  VAL_AOV: {
    code: 'VAL_AOV',
    name: 'Average Order Value (Median)',
    nameVi: 'Giá trị đơn hàng (Median)',
    category: 'value',
    granularity: ['distribution', 'segment'],
    formula: 'MEDIAN(order_total)',
    window: 'rolling',
    interpretationRule: 'Dùng percentile, không dùng mean đơn lẻ',
    limitation: 'Outliers ảnh hưởng distribution',
    unit: 'currency',
  },

  // VELOCITY METRICS
  VEL_T2P: {
    code: 'VEL_T2P',
    name: 'Time to Second Purchase',
    nameVi: 'Thời gian mua lần 2',
    category: 'velocity',
    granularity: ['cohort', 'distribution'],
    formula: 'MEDIAN(second_order_date - first_order_date)',
    window: '90d',
    interpretationRule: 'Tăng >20% vs baseline = velocity slowdown',
    limitation: 'Chỉ tính khách có ≥2 đơn',
    unit: 'days',
  },
  VEL_IPT: {
    code: 'VEL_IPT',
    name: 'Inter-Purchase Time',
    nameVi: 'Khoảng cách giữa các đơn',
    category: 'velocity',
    granularity: ['distribution', 'segment'],
    formula: 'MEDIAN(days between consecutive orders)',
    window: 'rolling',
    interpretationRule: 'Distribution shift quan trọng hơn mean',
    limitation: 'Cần ít nhất 3 đơn để có ý nghĩa',
    unit: 'days',
  },
  VEL_FRQ: {
    code: 'VEL_FRQ',
    name: 'Purchase Frequency',
    nameVi: 'Tần suất mua',
    category: 'velocity',
    granularity: ['cohort', 'segment', 'distribution'],
    formula: 'COUNT(orders) / months_active',
    window: 'rolling',
    interpretationRule: 'Giảm frequency = potential churn signal',
    limitation: 'Seasonal adjustment cần thiết',
    unit: 'ratio',
  },
  VEL_DEC: {
    code: 'VEL_DEC',
    name: 'Decay Curve',
    nameVi: 'Đường cong suy giảm',
    category: 'velocity',
    granularity: ['cohort'],
    formula: '% customers still active at month N',
    window: 'lifetime',
    interpretationRule: 'So sánh decay rate giữa các cohort',
    limitation: 'Cohort phải đủ maturity',
    unit: 'percent',
  },

  // MIX METRICS
  MIX_DSC: {
    code: 'MIX_DSC',
    name: 'Discount Order Ratio',
    nameVi: 'Tỷ lệ đơn có giảm giá',
    category: 'mix',
    granularity: ['segment', 'cohort'],
    formula: 'COUNT(discounted_orders) / COUNT(total_orders)',
    window: 'rolling',
    interpretationRule: 'Tăng = discount dependency risk',
    limitation: 'Cần phân biệt discount type',
    unit: 'percent',
  },
  MIX_CAT: {
    code: 'MIX_CAT',
    name: 'Category Mix Share',
    nameVi: 'Tỷ trọng danh mục',
    category: 'mix',
    granularity: ['segment'],
    formula: 'Revenue by category / Total revenue',
    window: 'rolling',
    interpretationRule: 'Shift sang low-margin category = margin risk',
    limitation: 'Cần category mapping chính xác',
    unit: 'percent',
  },
  MIX_CHN: {
    code: 'MIX_CHN',
    name: 'Channel Mix',
    nameVi: 'Tỷ trọng kênh',
    category: 'mix',
    granularity: ['segment', 'population'],
    formula: 'Revenue by channel / Total revenue',
    window: 'rolling',
    interpretationRule: 'Marketplace dependency > 60% = risk',
    limitation: 'Channel definition must be consistent',
    unit: 'percent',
  },
  MIX_PAY: {
    code: 'MIX_PAY',
    name: 'Payment Method Mix',
    nameVi: 'Tỷ trọng thanh toán',
    category: 'mix',
    granularity: ['segment'],
    formula: 'Orders by payment method / Total orders',
    window: 'rolling',
    interpretationRule: 'COD >70% = cashflow risk',
    limitation: 'Payment method must be tracked',
    unit: 'percent',
  },

  // RISK METRICS
  RSK_RET: {
    code: 'RSK_RET',
    name: 'Return/Refund Rate',
    nameVi: 'Tỷ lệ hoàn trả',
    category: 'risk',
    granularity: ['segment', 'cohort'],
    formula: 'Refund value / Gross revenue',
    window: 'rolling',
    interpretationRule: '>10% = quality hoặc expectation issue',
    limitation: 'Cần mapping refund to original order',
    unit: 'percent',
  },
  RSK_VOL: {
    code: 'RSK_VOL',
    name: 'Spend Volatility',
    nameVi: 'Độ biến động chi tiêu',
    category: 'risk',
    granularity: ['segment', 'distribution'],
    formula: 'STD(order_value) / MEAN(order_value)',
    window: 'rolling',
    interpretationRule: 'CV > 1.0 = unstable spending pattern',
    limitation: 'Cần minimum 5 orders per customer',
    unit: 'ratio',
  },
  RSK_CHN: {
    code: 'RSK_CHN',
    name: 'Churn Probability',
    nameVi: 'Xác suất rời bỏ',
    category: 'risk',
    granularity: ['cohort', 'segment'],
    formula: 'Rule-based: days since last order vs expected IPT',
    window: 'rolling',
    interpretationRule: 'KHÔNG dùng ở cấp cá nhân',
    limitation: 'Segment/cohort level only',
    unit: 'percent',
  },
  RSK_CON: {
    code: 'RSK_CON',
    name: 'Revenue Concentration',
    nameVi: 'Tập trung doanh thu',
    category: 'risk',
    granularity: ['population'],
    formula: 'Revenue from top 20% / Total revenue',
    window: 'rolling',
    interpretationRule: '>80% = high concentration risk',
    limitation: 'Sensitive to customer definition',
    unit: 'percent',
  },

  // QUALITY METRICS
  QUA_IDC: {
    code: 'QUA_IDC',
    name: 'Identity Coverage',
    nameVi: 'Độ phủ nhận dạng',
    category: 'quality',
    granularity: ['population'],
    formula: 'Orders with customer_id / Total orders',
    window: 'lifetime',
    interpretationRule: '<80% = insight không tin cậy',
    limitation: 'Core data quality metric',
    unit: 'percent',
  },
  QUA_COG: {
    code: 'QUA_COG',
    name: 'COGS Coverage',
    nameVi: 'Độ phủ giá vốn',
    category: 'quality',
    granularity: ['population'],
    formula: 'Orders with COGS / Total orders',
    window: 'lifetime',
    interpretationRule: '<70% = margin insight không tin cậy',
    limitation: 'Critical for margin metrics',
    unit: 'percent',
  },
};

// Forbidden Metrics (for validation)
export const FORBIDDEN_METRICS = [
  'open_rate',
  'click_rate',
  'impression',
  'reach',
  'ctr',
  'session_duration',
  'page_view',
  'lead_status',
  'deal_stage',
  'opportunity_value',
  'task_count',
  'call_count',
  'meeting_count',
  'customer_happiness',
  'customer_interest',
  'engagement_score',
  'loyalty_score',
] as const;

// Language rules
export const LANGUAGE_RULES = {
  forbidden: [
    'khách tương tác kém',
    'khách ít quan tâm',
    'khách không hài lòng',
    'engagement',
    'interest',
    'happy',
  ],
  allowed: [
    'giá trị mua lặp lại giảm',
    'tốc độ quay vòng chậm lại',
    'phân phối chi tiêu dịch chuyển',
    'concentration risk tăng',
    'velocity slowdown',
    'margin compression',
  ],
};

// Insight conditions validator
export interface InsightConditions {
  hasBaseline: boolean;
  hasShift: boolean;
  hasImpact: boolean;
}

export function validateInsightConditions(conditions: InsightConditions): boolean {
  return conditions.hasBaseline && conditions.hasShift && conditions.hasImpact;
}

// Get metrics by category
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return Object.values(CDP_METRICS).filter(m => m.category === category);
}

// Check if metric is allowed
export function isMetricAllowed(metricCode: string): boolean {
  return metricCode in CDP_METRICS;
}

// Get metric display info
export function getMetricDisplayInfo(code: string) {
  const metric = CDP_METRICS[code];
  if (!metric) return null;
  
  const categoryLabels: Record<MetricCategory, string> = {
    value: 'Value Metrics',
    velocity: 'Velocity Metrics',
    mix: 'Mix & Structure',
    risk: 'Risk Metrics',
    quality: 'Data Quality',
  };
  
  const categoryColors: Record<MetricCategory, string> = {
    value: 'emerald',
    velocity: 'blue',
    mix: 'amber',
    risk: 'red',
    quality: 'gray',
  };
  
  return {
    ...metric,
    categoryLabel: categoryLabels[metric.category],
    categoryColor: categoryColors[metric.category],
  };
}
