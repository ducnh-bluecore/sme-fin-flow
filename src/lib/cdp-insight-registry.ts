// CDP Insight Registry v1
// 25 hard-coded insights - no "creative" variations allowed

export type InsightCode = 
  // VALUE / SPEND (V01-V06)
  | 'V01' | 'V02' | 'V03' | 'V04' | 'V05' | 'V06'
  // VELOCITY / TIMING (T01-T05)
  | 'T01' | 'T02' | 'T03' | 'T04' | 'T05'
  // MIX / STRUCTURAL (M01-M06)
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06'
  // STABILITY / RISK (R01-R05)
  | 'R01' | 'R02' | 'R03' | 'R04' | 'R05'
  // QUALITY / ACQUISITION (Q01-Q04)
  | 'Q01' | 'Q02' | 'Q03' | 'Q04';

export type InsightCategory = 'value' | 'velocity' | 'mix' | 'risk' | 'quality';

export interface InsightDefinition {
  code: InsightCode;
  name: string;
  nameVi: string;
  category: InsightCategory;
  description: string;
  
  // Detection parameters
  detection: {
    metric: string;
    operator: 'decrease' | 'increase';
    thresholdPercent: number;
    windowDays: number;
    baselineDays: number;
  };
  
  // Population filter
  population: {
    type: 'top_percent' | 'cohort' | 'segment' | 'all';
    value?: number; // e.g., 20 for top 20%
    filter?: string; // e.g., 'repeat_customers'
    minRevenueContribution: number; // % of total to trigger
  };
  
  // Risk classification
  risk: {
    primary: string;
    severity: 'critical' | 'high' | 'medium';
    financialImpactType: 'revenue' | 'margin' | 'cashflow' | 'forecast';
  };
  
  // Cooldown
  cooldownDays: number;
}

// ============================================
// I. VALUE / SPEND INSIGHTS (V01-V06)
// ============================================

export const VALUE_INSIGHTS: Record<string, InsightDefinition> = {
  V01: {
    code: 'V01',
    name: 'Core Customer Spend Decline',
    nameVi: 'Giảm chi tiêu khách hàng cốt lõi',
    category: 'value',
    description: 'Median revenue/customer giảm >10% trong 60 ngày so với baseline',
    detection: {
      metric: 'median_revenue_per_customer',
      operator: 'decrease',
      thresholdPercent: 10,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'top_percent',
      value: 20,
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Erosion core asset',
      severity: 'critical',
      financialImpactType: 'revenue',
    },
    cooldownDays: 14,
  },
  
  V02: {
    code: 'V02',
    name: 'AOV Compression in High-Value Segment',
    nameVi: 'Nén AOV trong phân khúc cao cấp',
    category: 'value',
    description: 'Median AOV giảm >12% trong nhóm repeat customers',
    detection: {
      metric: 'median_aov',
      operator: 'decrease',
      thresholdPercent: 12,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'segment',
      filter: 'repeat_customers',
      minRevenueContribution: 30,
    },
    risk: {
      primary: 'Margin dilution',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 14,
  },
  
  V03: {
    code: 'V03',
    name: 'Frequency Drop in Revenue-Dominant Cohort',
    nameVi: 'Giảm tần suất mua trong cohort chính',
    category: 'value',
    description: 'Purchase frequency giảm >8% trong cohort đóng góp >40% revenue',
    detection: {
      metric: 'purchase_frequency',
      operator: 'decrease',
      thresholdPercent: 8,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'cohort',
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Cashflow slowdown',
      severity: 'high',
      financialImpactType: 'cashflow',
    },
    cooldownDays: 21,
  },
  
  V04: {
    code: 'V04',
    name: 'Net Revenue Decline after Refunds',
    nameVi: 'Giảm doanh thu ròng sau hoàn trả',
    category: 'value',
    description: 'Net revenue/customer giảm >15% sau khi trừ refund',
    detection: {
      metric: 'net_revenue_per_customer',
      operator: 'decrease',
      thresholdPercent: 15,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'segment',
      filter: 'repeat_customers',
      minRevenueContribution: 25,
    },
    risk: {
      primary: 'Hidden revenue loss',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 14,
  },
  
  V05: {
    code: 'V05',
    name: 'LTV Projection Downtrend',
    nameVi: 'Xu hướng giảm LTV dự báo',
    category: 'value',
    description: 'Rule-based LTV giảm >10% so với cohort trước',
    detection: {
      metric: 'projected_ltv',
      operator: 'decrease',
      thresholdPercent: 10,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'cohort',
      filter: 'new_customers',
      minRevenueContribution: 10,
    },
    risk: {
      primary: 'Long-term value erosion',
      severity: 'critical',
      financialImpactType: 'revenue',
    },
    cooldownDays: 30,
  },
  
  V06: {
    code: 'V06',
    name: 'Revenue Concentration Weakening',
    nameVi: 'Suy yếu tập trung doanh thu',
    category: 'value',
    description: 'Top 10% share giảm >5 điểm phần trăm',
    detection: {
      metric: 'top10_revenue_share',
      operator: 'decrease',
      thresholdPercent: 5, // absolute points
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'top_percent',
      value: 10,
      minRevenueContribution: 50,
    },
    risk: {
      primary: 'Core customer weakening',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 21,
  },
};

// ============================================
// II. VELOCITY / TIMING INSIGHTS (T01-T05)
// ============================================

export const VELOCITY_INSIGHTS: Record<string, InsightDefinition> = {
  T01: {
    code: 'T01',
    name: 'Inter-Purchase Time Expansion',
    nameVi: 'Giãn thời gian giữa các lần mua',
    category: 'velocity',
    description: 'Median inter-purchase time tăng >20%',
    detection: {
      metric: 'median_inter_purchase_time',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'segment',
      filter: 'repeat_customers',
      minRevenueContribution: 30,
    },
    risk: {
      primary: 'Slower cash cycle',
      severity: 'high',
      financialImpactType: 'cashflow',
    },
    cooldownDays: 21,
  },
  
  T02: {
    code: 'T02',
    name: 'Second-Purchase Delay',
    nameVi: 'Trì hoãn mua lần 2',
    category: 'velocity',
    description: 'Time-to-2nd-purchase tăng >25% trong new customers',
    detection: {
      metric: 'time_to_second_purchase',
      operator: 'increase',
      thresholdPercent: 25,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'cohort',
      filter: 'new_customers',
      minRevenueContribution: 10,
    },
    risk: {
      primary: 'Early churn',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 14,
  },
  
  T03: {
    code: 'T03',
    name: 'Purchase Rhythm Volatility Increase',
    nameVi: 'Tăng biến động nhịp mua',
    category: 'velocity',
    description: 'IQR của purchase interval tăng >30%',
    detection: {
      metric: 'purchase_interval_iqr',
      operator: 'increase',
      thresholdPercent: 30,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'segment',
      filter: 'repeat_customers',
      minRevenueContribution: 25,
    },
    risk: {
      primary: 'Forecast instability',
      severity: 'medium',
      financialImpactType: 'forecast',
    },
    cooldownDays: 30,
  },
  
  T04: {
    code: 'T04',
    name: 'Cohort Decay Acceleration',
    nameVi: 'Gia tốc suy giảm cohort',
    category: 'velocity',
    description: 'Retention curve dốc hơn so với baseline',
    detection: {
      metric: 'retention_decay_rate',
      operator: 'increase',
      thresholdPercent: 15,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'cohort',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Faster value decay',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 30,
  },
  
  T05: {
    code: 'T05',
    name: 'Repeat Rate Softening',
    nameVi: 'Mềm hóa tỷ lệ mua lại',
    category: 'velocity',
    description: 'Repeat rate giảm >6 điểm phần trăm',
    detection: {
      metric: 'repeat_rate',
      operator: 'decrease',
      thresholdPercent: 6, // absolute points
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Weakening retention economics',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 14,
  },
};

// ============================================
// III. MIX / STRUCTURAL SHIFT INSIGHTS (M01-M06)
// ============================================

export const MIX_INSIGHTS: Record<string, InsightDefinition> = {
  M01: {
    code: 'M01',
    name: 'Discount Dependency Increase',
    nameVi: 'Tăng phụ thuộc giảm giá',
    category: 'mix',
    description: '% discounted orders tăng >15 điểm phần trăm',
    detection: {
      metric: 'discounted_order_rate',
      operator: 'increase',
      thresholdPercent: 15, // absolute points
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Margin compression',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 14,
  },
  
  M02: {
    code: 'M02',
    name: 'Low-Margin Category Drift',
    nameVi: 'Dịch chuyển sang category biên thấp',
    category: 'mix',
    description: 'Low-margin category share tăng >10 điểm phần trăm',
    detection: {
      metric: 'low_margin_category_share',
      operator: 'increase',
      thresholdPercent: 10, // absolute points
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Profit mix deterioration',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 21,
  },
  
  M03: {
    code: 'M03',
    name: 'Bundle → Single Item Shift',
    nameVi: 'Dịch chuyển từ bundle sang đơn lẻ',
    category: 'mix',
    description: 'Bundle ratio giảm >20%',
    detection: {
      metric: 'bundle_ratio',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'AOV & margin loss',
      severity: 'medium',
      financialImpactType: 'margin',
    },
    cooldownDays: 21,
  },
  
  M04: {
    code: 'M04',
    name: 'Channel Mix Shift to Higher Cost',
    nameVi: 'Dịch chuyển sang kênh chi phí cao',
    category: 'mix',
    description: 'Higher-cost channel share tăng đáng kể',
    detection: {
      metric: 'high_cost_channel_share',
      operator: 'increase',
      thresholdPercent: 10,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'CAC & ops cost pressure',
      severity: 'medium',
      financialImpactType: 'margin',
    },
    cooldownDays: 30,
  },
  
  M05: {
    code: 'M05',
    name: 'Payment Method Risk Shift (COD)',
    nameVi: 'Dịch chuyển sang COD (rủi ro cao)',
    category: 'mix',
    description: 'COD share tăng đáng kể',
    detection: {
      metric: 'cod_share',
      operator: 'increase',
      thresholdPercent: 10,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Return & cash risk',
      severity: 'medium',
      financialImpactType: 'cashflow',
    },
    cooldownDays: 14,
  },
  
  M06: {
    code: 'M06',
    name: 'Price Sensitivity Signal',
    nameVi: 'Tín hiệu nhạy cảm giá',
    category: 'mix',
    description: 'Median price per item giảm mà không có volume tăng tương ứng',
    detection: {
      metric: 'median_price_per_item',
      operator: 'decrease',
      thresholdPercent: 10,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Pricing power erosion',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 21,
  },
};

// ============================================
// IV. STABILITY / RISK INSIGHTS (R01-R05)
// ============================================

export const RISK_INSIGHTS: Record<string, InsightDefinition> = {
  R01: {
    code: 'R01',
    name: 'Spend Volatility Spike',
    nameVi: 'Tăng đột biến biến động chi tiêu',
    category: 'risk',
    description: 'Std dev spend tăng >40%',
    detection: {
      metric: 'spend_std_dev',
      operator: 'increase',
      thresholdPercent: 40,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Revenue unpredictability',
      severity: 'high',
      financialImpactType: 'forecast',
    },
    cooldownDays: 30,
  },
  
  R02: {
    code: 'R02',
    name: 'Return Rate Escalation',
    nameVi: 'Leo thang tỷ lệ hoàn trả',
    category: 'risk',
    description: 'Return/refund rate tăng đáng kể',
    detection: {
      metric: 'return_rate',
      operator: 'increase',
      thresholdPercent: 25,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Margin & ops loss',
      severity: 'critical',
      financialImpactType: 'margin',
    },
    cooldownDays: 7,
  },
  
  R03: {
    code: 'R03',
    name: 'Revenue Tail Risk Expansion',
    nameVi: 'Mở rộng rủi ro đuôi doanh thu',
    category: 'risk',
    description: 'Bottom percentile loss tăng',
    detection: {
      metric: 'bottom_percentile_loss',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Downside exposure',
      severity: 'medium',
      financialImpactType: 'revenue',
    },
    cooldownDays: 30,
  },
  
  R04: {
    code: 'R04',
    name: 'Core Customer Churn Risk Increase',
    nameVi: 'Tăng rủi ro rời bỏ khách cốt lõi',
    category: 'risk',
    description: 'Cohort-level churn probability tăng',
    detection: {
      metric: 'cohort_churn_probability',
      operator: 'increase',
      thresholdPercent: 15,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'top_percent',
      value: 20,
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Structural revenue loss',
      severity: 'critical',
      financialImpactType: 'revenue',
    },
    cooldownDays: 21,
  },
  
  R05: {
    code: 'R05',
    name: 'Forecast Confidence Degradation',
    nameVi: 'Suy giảm độ tin cậy dự báo',
    category: 'risk',
    description: 'Forecast error tăng đáng kể',
    detection: {
      metric: 'forecast_error',
      operator: 'increase',
      thresholdPercent: 30,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Planning instability',
      severity: 'high',
      financialImpactType: 'forecast',
    },
    cooldownDays: 30,
  },
};

// ============================================
// V. QUALITY / ACQUISITION INSIGHTS (Q01-Q04)
// ============================================

export const QUALITY_INSIGHTS: Record<string, InsightDefinition> = {
  Q01: {
    code: 'Q01',
    name: 'New Cohort Value Degradation',
    nameVi: 'Suy giảm giá trị cohort mới',
    category: 'quality',
    description: 'First-30d revenue giảm >20% so với cohort trước',
    detection: {
      metric: 'first_30d_revenue',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 30,
      baselineDays: 30,
    },
    population: {
      type: 'cohort',
      filter: 'new_customers',
      minRevenueContribution: 5,
    },
    risk: {
      primary: 'Low-quality growth',
      severity: 'high',
      financialImpactType: 'revenue',
    },
    cooldownDays: 30,
  },
  
  Q02: {
    code: 'Q02',
    name: 'Early Refund Spike in New Customers',
    nameVi: 'Tăng đột biến hoàn trả khách mới',
    category: 'quality',
    description: 'Refund rate (30d) tăng trong new customers',
    detection: {
      metric: 'new_customer_refund_rate',
      operator: 'increase',
      thresholdPercent: 30,
      windowDays: 30,
      baselineDays: 30,
    },
    population: {
      type: 'cohort',
      filter: 'new_customers',
      minRevenueContribution: 5,
    },
    risk: {
      primary: 'Poor acquisition fit',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 14,
  },
  
  Q03: {
    code: 'Q03',
    name: 'New vs Existing Margin Gap Widening',
    nameVi: 'Nới rộng khoảng cách biên mới vs cũ',
    category: 'quality',
    description: 'Margin gap giữa new và existing tăng đáng kể',
    detection: {
      metric: 'new_existing_margin_gap',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Growth harming profitability',
      severity: 'high',
      financialImpactType: 'margin',
    },
    cooldownDays: 30,
  },
  
  Q04: {
    code: 'Q04',
    name: 'Identity Coverage Weakening',
    nameVi: 'Suy yếu độ phủ nhận dạng',
    category: 'quality',
    description: '% orders with valid customer_id giảm',
    detection: {
      metric: 'identity_coverage',
      operator: 'decrease',
      thresholdPercent: 5, // absolute points
      windowDays: 30,
      baselineDays: 30,
    },
    population: {
      type: 'all',
      minRevenueContribution: 0,
    },
    risk: {
      primary: 'Blind decision-making',
      severity: 'critical',
      financialImpactType: 'forecast',
    },
    cooldownDays: 7,
  },
};

// ============================================
// COMBINED REGISTRY
// ============================================

export const CDP_INSIGHT_REGISTRY: Record<InsightCode, InsightDefinition> = {
  ...VALUE_INSIGHTS,
  ...VELOCITY_INSIGHTS,
  ...MIX_INSIGHTS,
  ...RISK_INSIGHTS,
  ...QUALITY_INSIGHTS,
} as Record<InsightCode, InsightDefinition>;

// Category metadata
export const INSIGHT_CATEGORIES: Record<InsightCategory, {
  name: string;
  nameVi: string;
  color: string;
  icon: string;
  count: number;
}> = {
  value: {
    name: 'Value / Spend',
    nameVi: 'Giá trị / Chi tiêu',
    color: 'red',
    icon: 'DollarSign',
    count: 6,
  },
  velocity: {
    name: 'Velocity / Timing',
    nameVi: 'Tốc độ / Thời gian',
    color: 'orange',
    icon: 'Clock',
    count: 5,
  },
  mix: {
    name: 'Mix / Structure',
    nameVi: 'Cấu trúc / Hỗn hợp',
    color: 'amber',
    icon: 'Shuffle',
    count: 6,
  },
  risk: {
    name: 'Stability / Risk',
    nameVi: 'Ổn định / Rủi ro',
    color: 'purple',
    icon: 'AlertTriangle',
    count: 5,
  },
  quality: {
    name: 'Quality / Acquisition',
    nameVi: 'Chất lượng / Thu hút',
    color: 'slate',
    icon: 'UserCheck',
    count: 4,
  },
};

// Helper functions
export function getInsightsByCategory(category: InsightCategory): InsightDefinition[] {
  return Object.values(CDP_INSIGHT_REGISTRY).filter(i => i.category === category);
}

export function getInsightDefinition(code: InsightCode): InsightDefinition | undefined {
  return CDP_INSIGHT_REGISTRY[code];
}

export function getSeverityColor(severity: 'critical' | 'high' | 'medium'): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
  }
}

export function getCategoryColor(category: InsightCategory): string {
  switch (category) {
    case 'value': return 'text-red-600 bg-red-50';
    case 'velocity': return 'text-orange-600 bg-orange-50';
    case 'mix': return 'text-amber-600 bg-amber-50';
    case 'risk': return 'text-purple-600 bg-purple-50';
    case 'quality': return 'text-slate-600 bg-slate-50';
  }
}
