// CDP Trend Insight Types and Detection Logic
// Based on Trend Insight Playbook

export type InsightType = 
  | 'SPEND_DECLINE' 
  | 'VELOCITY_SLOW' 
  | 'MIX_SHIFT' 
  | 'VOLATILITY_UP' 
  | 'QUALITY_DROP';

export type InsightSeverity = 'critical' | 'warning' | 'info';

// All 7 mandatory elements of a valid Trend Insight
export interface TrendInsight {
  id: string;
  type: InsightType;
  createdAt: Date;
  
  // 7 Mandatory Elements
  population: {
    segment: string;
    customerCount: number;
    revenueContribution: number; // % of total
  };
  shift: {
    metric: string;
    metricCode: string;
    direction: 'up' | 'down';
    description: string;
  };
  baseline: {
    period: string; // "90 days", "same period last year"
    value: number;
  };
  magnitude: {
    currentValue: number;
    changePercent: number;
    changeAbsolute: number;
  };
  financialImpact: {
    projectedImpact: number; // VND
    riskLevel: 'high' | 'medium' | 'low';
    timeHorizon: string; // "Q+1", "next 90 days"
  };
  interpretation: string; // Economic language, no emotions
  decisionPrompt: string; // Question for CEO/CFO
  
  // Metadata
  severity: InsightSeverity;
  isValid: boolean; // All 7 elements present
  cooldownUntil?: Date;
}

// Insight type configurations
export const INSIGHT_CONFIGS: Record<InsightType, {
  name: string;
  nameVi: string;
  description: string;
  metrics: string[];
  thresholds: {
    triggerPercent: number;
    cooldownDays: number;
    minRevenueContribution: number; // % of total revenue
  };
  color: string;
  icon: string;
}> = {
  SPEND_DECLINE: {
    name: 'Value Decline',
    nameVi: 'Suy giảm giá trị',
    description: 'Giá trị kinh tế của tập khách đang giảm',
    metrics: ['VAL_REV', 'VAL_AOV', 'VEL_FRQ', 'VAL_NR'],
    thresholds: {
      triggerPercent: 10, // >10% decline
      cooldownDays: 14,
      minRevenueContribution: 10,
    },
    color: 'red',
    icon: 'TrendingDown',
  },
  VELOCITY_SLOW: {
    name: 'Purchase Slowdown',
    nameVi: 'Chậm tốc độ mua',
    description: 'Nhịp mua chậm lại → ảnh hưởng cashflow',
    metrics: ['VEL_IPT', 'VEL_T2P', 'VEL_FRQ'],
    thresholds: {
      triggerPercent: 20, // >20% slower
      cooldownDays: 21,
      minRevenueContribution: 15,
    },
    color: 'orange',
    icon: 'Clock',
  },
  MIX_SHIFT: {
    name: 'Structural Shift',
    nameVi: 'Dịch chuyển cấu trúc',
    description: 'Cấu trúc doanh thu thay đổi kém lợi nhuận',
    metrics: ['MIX_DSC', 'MIX_CAT', 'MIX_CHN', 'MIX_PAY'],
    thresholds: {
      triggerPercent: 15, // >15% shift
      cooldownDays: 30,
      minRevenueContribution: 20,
    },
    color: 'amber',
    icon: 'Shuffle',
  },
  VOLATILITY_UP: {
    name: 'Stability Risk',
    nameVi: 'Rủi ro ổn định',
    description: 'Hành vi chi tiêu khó dự đoán hơn',
    metrics: ['RSK_VOL', 'RSK_CON'],
    thresholds: {
      triggerPercent: 30, // >30% more volatile
      cooldownDays: 30,
      minRevenueContribution: 25,
    },
    color: 'purple',
    icon: 'Activity',
  },
  QUALITY_DROP: {
    name: 'Acquisition Degradation',
    nameVi: 'Chất lượng khách mới giảm',
    description: 'Cohort mới có giá trị thấp hơn cohort cũ',
    metrics: ['VAL_REV', 'RSK_RET', 'VEL_T2P'],
    thresholds: {
      triggerPercent: 15, // >15% lower than prev cohort
      cooldownDays: 60,
      minRevenueContribution: 5, // New customers = lower contribution
    },
    color: 'slate',
    icon: 'UserMinus',
  },
};

// Detection result
export interface DetectionResult {
  type: InsightType;
  triggered: boolean;
  severity: InsightSeverity;
  metrics: {
    code: string;
    baseline: number;
    current: number;
    changePercent: number;
  }[];
  population: {
    segment: string;
    count: number;
    revenueContribution: number;
  };
}

// Generate insight statement templates
export function generateInsightStatement(type: InsightType, data: {
  segment: string;
  metric1: { name: string; change: number };
  metric2?: { name: string; change: number };
  period: string;
}): string {
  const templates: Record<InsightType, string> = {
    SPEND_DECLINE: `${data.segment} đang giảm ${data.metric1.name} ${Math.abs(data.metric1.change).toFixed(1)}%${data.metric2 ? ` và ${data.metric2.name} ${Math.abs(data.metric2.change).toFixed(1)}%` : ''} trong ${data.period}.`,
    VELOCITY_SLOW: `Thời gian giữa các lần mua của ${data.segment} tăng ${Math.abs(data.metric1.change).toFixed(1)}% trong ${data.period}.`,
    MIX_SHIFT: `Tỷ trọng ${data.metric1.name} trong ${data.segment} thay đổi ${data.metric1.change > 0 ? 'tăng' : 'giảm'} ${Math.abs(data.metric1.change).toFixed(1)}% trong ${data.period}.`,
    VOLATILITY_UP: `Biến động chi tiêu của ${data.segment} tăng ${Math.abs(data.metric1.change).toFixed(1)}% trong ${data.period}.`,
    QUALITY_DROP: `Khách hàng mới ${data.period} có giá trị thấp hơn cohort trước ${Math.abs(data.metric1.change).toFixed(1)}%.`,
  };
  
  return templates[type];
}

// Generate financial framing
export function generateFinancialFraming(type: InsightType, impact: number, timeHorizon: string): string {
  const formatVND = (v: number) => {
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return `${v.toLocaleString()}`;
  };
  
  const templates: Record<InsightType, string> = {
    SPEND_DECLINE: `Nếu xu hướng giữ nguyên, doanh thu lặp lại ${timeHorizon} ước giảm ~${formatVND(Math.abs(impact))}.`,
    VELOCITY_SLOW: `Điều này làm chậm dòng tiền và làm yếu forecast doanh thu ${timeHorizon}.`,
    MIX_SHIFT: `Biên lợi nhuận bình quân nhóm này giảm, ước tính ảnh hưởng ~${formatVND(Math.abs(impact))} ${timeHorizon}.`,
    VOLATILITY_UP: `Doanh thu từ nhóm này trở nên khó forecast, tăng rủi ro kế hoạch ${timeHorizon}.`,
    QUALITY_DROP: `Chi phí tăng trưởng đang tạo ra tài sản khách hàng chất lượng thấp hơn, ảnh hưởng LTV ước ~${formatVND(Math.abs(impact))}.`,
  };
  
  return templates[type];
}

// Generate decision prompt
export function generateDecisionPrompt(type: InsightType): string {
  const prompts: Record<InsightType, string> = {
    SPEND_DECLINE: 'Giá trị khách hàng đang phản ứng với pricing/bundle hiện tại. Cần đánh giá lại chính sách giá trị cho nhóm này?',
    VELOCITY_SLOW: 'Cần xem lại yếu tố nào đang làm giảm động lực mua lặp lại (pricing, assortment, policy)?',
    MIX_SHIFT: 'Cấu trúc giá trị đang xấu đi. Cần đánh giá lại chính sách khuyến mãi/bundle?',
    VOLATILITY_UP: 'Cần xem lại chính sách giữ ổn định giá trị khách hàng chủ lực?',
    QUALITY_DROP: 'Cần đánh giá lại chiến lược tăng trưởng và tiêu chí chất lượng khách?',
  };
  
  return prompts[type];
}

// Validate insight has all 7 elements
export function validateInsight(insight: Partial<TrendInsight>): boolean {
  return !!(
    insight.population?.segment &&
    insight.shift?.metric &&
    insight.baseline?.period &&
    insight.magnitude?.changePercent !== undefined &&
    insight.financialImpact?.projectedImpact !== undefined &&
    insight.interpretation &&
    insight.decisionPrompt
  );
}

// Determine severity based on impact and magnitude
export function determineSeverity(
  changePercent: number,
  revenueContribution: number,
  threshold: number
): InsightSeverity {
  const impactScore = Math.abs(changePercent) / threshold;
  const contributionScore = revenueContribution / 20; // 20% is high
  
  const totalScore = impactScore * 0.6 + contributionScore * 0.4;
  
  if (totalScore >= 1.5) return 'critical';
  if (totalScore >= 1.0) return 'warning';
  return 'info';
}
