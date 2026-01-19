/**
 * ============================================
 * FINANCIAL CONSTANTS - SINGLE SOURCE OF TRUTH
 * ============================================
 * 
 * FDP Manifesto Principle #3: Truth > Flexibility
 * 
 * Tất cả benchmarks, targets, và thresholds tài chính phải được định nghĩa ở đây.
 * KHÔNG ĐƯỢC hardcode ở component/hook.
 * 
 * Trong tương lai, các giá trị này có thể được lấy từ database (decision_thresholds)
 * để cho phép customize theo tenant.
 */

// ============================================
// INDUSTRY BENCHMARKS
// ============================================

/**
 * Benchmark tiêu chuẩn cho ngành bán lẻ/e-commerce SME Việt Nam
 * Nguồn: Phân tích thị trường nội bộ
 */
export const INDUSTRY_BENCHMARKS = {
  // Cash Conversion Cycle
  dso: 35,              // Days Sales Outstanding - Thời gian thu tiền bán hàng
  dio: 45,              // Days Inventory Outstanding - Thời gian tồn kho
  dpo: 40,              // Days Payable Outstanding - Thời gian thanh toán NCC
  ccc: 40,              // Cash Conversion Cycle = DSO + DIO - DPO
  
  // Profitability
  grossMargin: 35,      // Biên lợi nhuận gộp (%)
  ebitdaMargin: 15,     // EBITDA margin (%)
  netProfitMargin: 8,   // Biên lợi nhuận ròng (%)
  operatingMargin: 12,  // Biên lợi nhuận hoạt động (%)
  
  // Marketing
  roas: 4.0,            // Return on Ad Spend - Tối thiểu 4x
  cac: 500000,          // Customer Acquisition Cost - Tối đa 500K VND
  ltvCacRatio: 3.0,     // LTV/CAC ratio - Tối thiểu 3x
  
  // Working Capital
  currentRatio: 1.5,    // Current Ratio - Tối thiểu 1.5
  quickRatio: 1.0,      // Quick Ratio - Tối thiểu 1.0
} as const;

// ============================================
// TARGET VALUES (More aggressive than benchmarks)
// ============================================

/**
 * Mục tiêu tối ưu - Sử dụng trong so sánh và recommendations
 */
export const TARGET_VALUES = {
  dso: 30,              // Mục tiêu thu tiền trong 30 ngày
  dio: 30,              // Mục tiêu xoay vòng tồn kho 30 ngày
  dpo: 45,              // Mục tiêu kéo dài thanh toán NCC 45 ngày
  ccc: 15,              // Mục tiêu CCC tối ưu
  
  grossMargin: 40,
  ebitdaMargin: 20,
  
  roas: 5.0,
  ltvCacRatio: 4.0,
} as const;

// ============================================
// THRESHOLD LEVELS
// ============================================

/**
 * Ngưỡng cảnh báo cho các metrics
 * Sử dụng trong alert system và health indicators
 */
export const THRESHOLD_LEVELS = {
  dso: {
    good: 30,           // <= 30 ngày: Tốt
    warning: 45,        // 31-45 ngày: Cần theo dõi
    critical: 60,       // > 60 ngày: Nghiêm trọng
  },
  dio: {
    good: 30,
    warning: 45,
    critical: 60,
  },
  dpo: {
    good: 45,           // >= 45 ngày: Tốt (ngược với DSO/DIO)
    warning: 30,        // 30-45 ngày: Chấp nhận được
    critical: 15,       // < 15 ngày: Thanh toán quá nhanh
  },
  ccc: {
    good: 30,           // <= 30 ngày: Tốt
    warning: 60,        // 31-60 ngày: Cần cải thiện
    critical: 90,       // > 90 ngày: Nghiêm trọng
  },
  grossMargin: {
    good: 35,           // >= 35%: Tốt
    warning: 25,        // 25-35%: Cần theo dõi
    critical: 15,       // < 15%: Nghiêm trọng
  },
  cashRunway: {
    good: 6,            // >= 6 tháng: An toàn
    warning: 3,         // 3-6 tháng: Cần chú ý
    critical: 2,        // < 2 tháng: Khẩn cấp
  },
  roas: {
    good: 4.0,
    warning: 2.0,
    critical: 1.0,
  },
  ltvCacRatio: {
    good: 3.0,
    warning: 2.0,
    critical: 1.0,
  },
} as const;

// ============================================
// METRIC BOUNDS - CONSTRAINTS
// ============================================

/**
 * Physical/mathematical limits for metrics
 * Prevents impossible values from appearing in UI
 * 
 * FDP Manifesto: TRUTH > FLEXIBILITY
 * Values outside these bounds indicate data errors, not real business conditions
 */
export const METRIC_BOUNDS = {
  // Days metrics - realistic operational limits
  dso: { min: 0, max: 365 },      // 0-365 days (E-commerce: typically 1-60)
  dio: { min: 0, max: 180 },      // 0-180 days (Fast retail: typically 15-60)
  dpo: { min: 0, max: 180 },      // 0-180 days (Supplier terms: typically 30-90)
  ccc: { min: -100, max: 365 },   // Negative = suppliers finance you; Max 1 year
  
  // Percentage metrics - mathematical limits
  grossMargin: { min: -100, max: 100 },       // Cannot exceed ±100%
  contributionMargin: { min: -100, max: 100 },
  ebitdaMargin: { min: -100, max: 100 },
  netProfitMargin: { min: -100, max: 100 },
  operatingMargin: { min: -100, max: 100 },
  
  // Turnover ratios - realistic operational limits
  arTurnover: { min: 0.5, max: 365 },    // 0.5-365x/year
  apTurnover: { min: 0.5, max: 365 },    // 0.5-365x/year
  inventoryTurnover: { min: 0.5, max: 52 }, // 0.5-52x/year (weekly max)
  
  // Cash metrics
  burnRatePercent: { min: -100, max: 100 },
  forecastPercent: { min: -500, max: 500 },  // 500% = 5x change
  cashRunwayMonths: { min: 0, max: 120 },    // 0-10 years
} as const;

// ============================================
// CONSTRAINT FUNCTIONS
// ============================================

/**
 * Constrain a value within bounds
 * Returns constrained value + warning if out of bounds
 */
export function constrainValue(
  value: number,
  bounds: { min: number; max: number },
  metricName?: string
): { value: number; isConstrained: boolean; originalValue: number } {
  const constrained = Math.max(bounds.min, Math.min(bounds.max, value));
  const isConstrained = constrained !== value;
  
  if (isConstrained && metricName && process.env.NODE_ENV === 'development') {
    console.warn(`[FDP] ${metricName} constrained: ${value} → ${constrained} (bounds: ${bounds.min}-${bounds.max})`);
  }
  
  return {
    value: constrained,
    isConstrained,
    originalValue: value
  };
}

/**
 * Constrain days metric (DSO, DIO, DPO, CCC)
 */
export function constrainDays(
  value: number,
  type: 'dso' | 'dio' | 'dpo' | 'ccc'
): number {
  const bounds = METRIC_BOUNDS[type];
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
}

/**
 * Constrain percentage metric (margins, rates)
 */
export function constrainPercent(
  value: number,
  type: 'grossMargin' | 'contributionMargin' | 'ebitdaMargin' | 'netProfitMargin' | 'operatingMargin' | 'burnRatePercent' | 'forecastPercent' = 'grossMargin'
): number {
  const bounds = METRIC_BOUNDS[type];
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

/**
 * Constrain turnover ratio
 */
export function constrainTurnover(
  value: number,
  type: 'arTurnover' | 'apTurnover' | 'inventoryTurnover'
): number {
  const bounds = METRIC_BOUNDS[type];
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

/**
 * Calculate turnover from days (correct formula)
 * Turnover = 365 / Days Outstanding
 */
export function calculateTurnoverFromDays(days: number): number {
  if (days <= 0) return 0;
  return Math.round((365 / days) * 10) / 10; // 1 decimal
}

/**
 * Calculate days from turnover (inverse)
 * Days = 365 / Turnover
 */
export function calculateDaysFromTurnover(turnover: number): number {
  if (turnover <= 0) return 0;
  return Math.round(365 / turnover);
}

// ============================================
// FALLBACK RATIOS
// ============================================

/**
 * Tỷ lệ ước tính khi thiếu dữ liệu thực
 * Sử dụng cho các doanh nghiệp mới chưa có đủ dữ liệu
 */
export const FALLBACK_RATIOS = {
  // Cost structure
  cogs: 0.65,           // COGS / Revenue
  opex: 0.20,           // Operating expenses / Revenue
  depreciation: 0.018,  // Depreciation / Revenue
  interest: 0.013,      // Interest expense / Revenue
  tax: 0.20,            // Effective tax rate
  
  // Working capital
  arToRevenue: 0.15,    // AR as % of annual revenue
  apToCogs: 0.10,       // AP as % of annual COGS
  inventoryToCogs: 0.25,// Inventory as % of annual COGS
  
  // Customer
  newCustomerRate: 0.60, // % of unique buyers are new customers
  repeatRate: 0.40,     // Repeat purchase rate
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export type MetricStatus = 'good' | 'warning' | 'critical';

/**
 * Đánh giá trạng thái của một metric dựa trên thresholds
 * @param metricName - Tên metric (dso, dio, dpo, ccc, grossMargin, etc.)
 * @param value - Giá trị hiện tại
 * @param inverse - true nếu giá trị cao hơn là tốt hơn (vd: grossMargin, dpo)
 */
export function getMetricStatus(
  metricName: keyof typeof THRESHOLD_LEVELS,
  value: number,
  inverse: boolean = false
): MetricStatus {
  const thresholds = THRESHOLD_LEVELS[metricName];
  if (!thresholds) return 'warning';
  
  if (inverse) {
    // Higher is better (grossMargin, dpo)
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  } else {
    // Lower is better (dso, dio, ccc)
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'critical';
  }
}

/**
 * Tính % so với benchmark
 */
export function compareToTarget(
  metricName: keyof typeof TARGET_VALUES,
  currentValue: number
): {
  difference: number;
  percentDiff: number;
  isBetter: boolean;
} {
  const target = TARGET_VALUES[metricName];
  const difference = currentValue - target;
  const percentDiff = target > 0 ? (difference / target) * 100 : 0;
  
  // For DSO/DIO/CCC: lower is better
  // For DPO/margins/ratios: higher is better
  const higherIsBetter = ['dpo', 'grossMargin', 'ebitdaMargin', 'roas', 'ltvCacRatio'].includes(metricName);
  const isBetter = higherIsBetter ? currentValue >= target : currentValue <= target;
  
  return { difference, percentDiff, isBetter };
}

/**
 * Lấy màu CSS cho trạng thái metric
 */
export function getStatusColor(status: MetricStatus): string {
  switch (status) {
    case 'good':
      return 'hsl(var(--success))';
    case 'warning':
      return 'hsl(var(--warning))';
    case 'critical':
      return 'hsl(var(--destructive))';
    default:
      return 'hsl(var(--muted-foreground))';
  }
}

/**
 * Lấy CSS class cho badge trạng thái
 */
export function getStatusBadgeClass(status: MetricStatus): string {
  switch (status) {
    case 'good':
      return 'bg-success/20 text-success border-success/30';
    case 'warning':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'critical':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
