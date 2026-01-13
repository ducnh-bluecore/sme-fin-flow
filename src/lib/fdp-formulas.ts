/**
 * ============================================
 * FDP FORMULA LIBRARY - SINGLE SOURCE OF TRUTH
 * ============================================
 * 
 * FDP Manifesto Principle #3: Truth > Flexibility
 * 
 * KHÔNG ĐƯỢC:
 * - Cho mỗi phòng ban tự định nghĩa metric
 * - Cho chỉnh công thức tùy tiện
 * - Cho "chọn số đẹp"
 * 
 * TẤT CẢ công thức tài chính PHẢI được định nghĩa ở đây.
 * Các hook/component chỉ được IMPORT và SỬ DỤNG, không được tự tính.
 */

// ============================================
// TYPES
// ============================================

export interface FormulaInput {
  // Revenue
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  
  // Costs
  cogs: number;
  platformFees: number;
  shippingCosts: number;
  marketingSpend: number;
  operatingExpenses: number;
  
  // Working Capital
  accountsReceivable: number;
  accountsReceivableOverdue: number;
  accountsPayable: number;
  inventory: number;
  
  // Cash
  bankBalance: number;
  
  // Time
  daysInPeriod: number;
  
  // Orders
  totalOrders: number;
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
}

export interface FormulaResult {
  value: number;
  formula: string;
  interpretation: string;
  status: 'good' | 'warning' | 'critical';
  action?: string;
}

// ============================================
// LOCKED THRESHOLDS - KHÔNG ĐƯỢC THAY ĐỔI
// ============================================

export const FDP_THRESHOLDS = {
  // Cash Runway
  RUNWAY_CRITICAL_MONTHS: 3,
  RUNWAY_WARNING_MONTHS: 6,
  
  // Contribution Margin
  CM_CRITICAL_PERCENT: 0,
  CM_WARNING_PERCENT: 10,
  CM_GOOD_PERCENT: 20,
  
  // Gross Margin (for risk alerts)
  GROSS_MARGIN_CRITICAL_PERCENT: 15,
  GROSS_MARGIN_WARNING_PERCENT: 25,
  
  // LTV:CAC Ratio
  LTV_CAC_CRITICAL: 1,
  LTV_CAC_WARNING: 2,
  LTV_CAC_GOOD: 3,
  
  // ROAS
  ROAS_CRITICAL: 1,
  ROAS_WARNING: 2,
  ROAS_GOOD: 3,
  
  // DSO (Days Sales Outstanding)
  DSO_WARNING_DAYS: 45,
  DSO_CRITICAL_DAYS: 60,
  
  // AR Overdue
  AR_OVERDUE_WARNING_PERCENT: 15,
  AR_OVERDUE_CRITICAL_PERCENT: 30,
  AR_AGING_90_CRITICAL_PERCENT: 10,
  
  // SKU Margin
  SKU_STOP_MARGIN_PERCENT: -5,
  SKU_CRITICAL_MARGIN_PERCENT: -15,
  SKU_REVIEW_MARGIN_PERCENT: 5,
  
  // CCC (Cash Conversion Cycle)
  CCC_WARNING_DAYS: 60,
  CCC_CRITICAL_DAYS: 90,
  
  // Channel Fees
  CHANNEL_FEE_WARNING_PERCENT: 15,
  CHANNEL_FEE_CRITICAL_PERCENT: 20,
  
  // Inventory Days
  INVENTORY_WARNING_DAYS: 60,
  INVENTORY_CRITICAL_DAYS: 90,
} as const;

// ============================================
// CORE FORMULAS - LOCKED, KHÔNG THAY ĐỔI
// ============================================

/**
 * Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees
 * Đây là doanh thu THỰC sau khi trừ tất cả phí
 */
export function calculateNetRevenue(
  grossRevenue: number,
  platformFees: number,
  returns: number = 0,
  discounts: number = 0
): FormulaResult {
  const value = grossRevenue - returns - discounts - platformFees;
  
  return {
    value,
    formula: 'Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees',
    interpretation: 'Doanh thu thực sau khi trừ tất cả các khoản giảm trừ',
    status: value > 0 ? 'good' : 'critical',
    action: value <= 0 ? 'Doanh thu âm - kiểm tra chi phí ngay' : undefined
  };
}

/**
 * Contribution Margin = Net Revenue - COGS - Variable Costs
 * Lợi nhuận gộp sau biến phí
 */
export function calculateContributionMargin(
  netRevenue: number,
  cogs: number,
  shippingCosts: number = 0,
  marketingSpend: number = 0
): FormulaResult {
  const value = netRevenue - cogs - shippingCosts - marketingSpend;
  const percent = netRevenue > 0 ? (value / netRevenue) * 100 : 0;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let action: string | undefined;
  
  if (percent < FDP_THRESHOLDS.CM_CRITICAL_PERCENT) {
    status = 'critical';
    action = '🚨 MARGIN ÂM - Đang bán lỗ! Tăng giá hoặc cắt chi phí NGAY';
  } else if (percent < FDP_THRESHOLDS.CM_WARNING_PERCENT) {
    status = 'warning';
    action = '⚠️ Margin thấp - Cần tối ưu chi phí';
  }
  
  return {
    value,
    formula: 'CM = Net Revenue - COGS - Shipping - Marketing',
    interpretation: `Contribution Margin: ${percent.toFixed(1)}%`,
    status,
    action
  };
}

/**
 * Contribution Margin Per Order = CM / Total Orders
 */
export function calculateCMPerOrder(
  contributionMargin: number,
  totalOrders: number
): FormulaResult {
  const value = totalOrders > 0 ? contributionMargin / totalOrders : 0;
  
  return {
    value,
    formula: 'CM/Order = Total CM / Total Orders',
    interpretation: 'Lợi nhuận gộp trung bình mỗi đơn hàng',
    status: value > 0 ? 'good' : 'critical',
    action: value <= 0 ? 'Mỗi đơn hàng đang lỗ tiền!' : undefined
  };
}

/**
 * Average Order Value = Total Revenue / Total Orders
 */
export function calculateAOV(
  totalRevenue: number,
  totalOrders: number
): FormulaResult {
  const value = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  return {
    value,
    formula: 'AOV = Total Revenue / Total Orders',
    interpretation: 'Giá trị đơn hàng trung bình',
    status: 'good'
  };
}

/**
 * Customer Acquisition Cost = Marketing Spend / New Customers
 */
export function calculateCAC(
  marketingSpend: number,
  newCustomers: number
): FormulaResult {
  const value = newCustomers > 0 ? marketingSpend / newCustomers : 0;
  
  return {
    value,
    formula: 'CAC = Marketing Spend / New Customers',
    interpretation: 'Chi phí để có được 1 khách hàng mới',
    status: 'good' // Status depends on LTV:CAC ratio
  };
}

/**
 * Customer Lifetime Value = AOV × Average Orders Per Customer × CM%
 */
export function calculateLTV(
  aov: number,
  avgOrdersPerCustomer: number,
  contributionMarginPercent: number
): FormulaResult {
  const value = aov * avgOrdersPerCustomer * (contributionMarginPercent / 100);
  
  return {
    value,
    formula: 'LTV = AOV × Avg Orders/Customer × CM%',
    interpretation: 'Giá trị vòng đời khách hàng',
    status: 'good'
  };
}

/**
 * LTV:CAC Ratio - Metric quan trọng nhất về unit economics
 */
export function calculateLTVCACRatio(
  ltv: number,
  cac: number
): FormulaResult {
  const value = cac > 0 ? ltv / cac : 0;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let action: string | undefined;
  
  if (value < FDP_THRESHOLDS.LTV_CAC_CRITICAL) {
    status = 'critical';
    action = '🚨 LTV < CAC - Đang mất tiền trên mỗi khách hàng! GIẢM ads ngay';
  } else if (value < FDP_THRESHOLDS.LTV_CAC_WARNING) {
    status = 'warning';
    action = '⚠️ LTV:CAC thấp - Cần cải thiện retention hoặc giảm CAC';
  }
  
  return {
    value,
    formula: 'LTV:CAC = LTV / CAC',
    interpretation: `Tỷ lệ ${value.toFixed(1)}x - ${status === 'good' ? 'Tốt' : status === 'warning' ? 'Cần cải thiện' : 'Nguy hiểm'}`,
    status,
    action
  };
}

/**
 * Return on Ad Spend = Revenue / Marketing Spend
 */
export function calculateROAS(
  revenue: number,
  marketingSpend: number
): FormulaResult {
  const value = marketingSpend > 0 ? revenue / marketingSpend : 0;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let action: string | undefined;
  
  if (value < FDP_THRESHOLDS.ROAS_CRITICAL) {
    status = 'critical';
    action = '🚨 ROAS < 1 - Đang đốt tiền quảng cáo! DỪNG ads ngay';
  } else if (value < FDP_THRESHOLDS.ROAS_WARNING) {
    status = 'warning';
    action = '⚠️ ROAS thấp - Tối ưu targeting hoặc giảm budget';
  }
  
  return {
    value,
    formula: 'ROAS = Revenue / Marketing Spend',
    interpretation: `ROAS ${value.toFixed(1)}x`,
    status,
    action
  };
}

/**
 * Days Sales Outstanding = (AR / Daily Sales)
 */
export function calculateDSO(
  accountsReceivable: number,
  dailySales: number
): FormulaResult {
  const value = dailySales > 0 ? Math.round(accountsReceivable / dailySales) : 0;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let action: string | undefined;
  
  if (value > FDP_THRESHOLDS.DSO_CRITICAL_DAYS) {
    status = 'critical';
    action = '🚨 DSO quá cao - Thu hồi công nợ NGAY';
  } else if (value > FDP_THRESHOLDS.DSO_WARNING_DAYS) {
    status = 'warning';
    action = '⚠️ DSO cao - Cần đẩy nhanh thu tiền';
  }
  
  return {
    value,
    formula: 'DSO = AR / Daily Sales',
    interpretation: `Trung bình ${value} ngày để thu tiền`,
    status,
    action
  };
}

/**
 * Cash Runway = Cash / Monthly Burn Rate
 */
export function calculateCashRunway(
  cashBalance: number,
  monthlyBurnRate: number
): FormulaResult {
  const value = monthlyBurnRate > 0 ? cashBalance / monthlyBurnRate : Infinity;
  
  let status: 'good' | 'warning' | 'critical' = 'good';
  let action: string | undefined;
  
  if (value !== Infinity) {
    if (value < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
      status = 'critical';
      action = '🚨 RUNWAY < 3 THÁNG - Gọi vốn hoặc cắt chi phí NGAY';
    } else if (value < FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS) {
      status = 'warning';
      action = '⚠️ Runway thấp - Lên kế hoạch tài chính';
    }
  }
  
  return {
    value,
    formula: 'Runway = Cash / Monthly Burn',
    interpretation: value === Infinity ? 'Không burn cash' : `Còn ${value.toFixed(1)} tháng`,
    status,
    action
  };
}

// ============================================
// REAL CASH FORMULAS - Principle #4
// ============================================

export interface RealCashBreakdown {
  cashAvailable: number;      // Tiền thật trong bank
  cashIncoming: number;       // AR không quá hạn
  cashAtRisk: number;         // AR quá hạn
  cashLocked: number;         // Inventory + Ads float
  totalCashPosition: number;  // Tổng vị thế tiền
}

export function calculateRealCash(
  bankBalance: number,
  arCurrent: number,
  arOverdue: number,
  inventoryValue: number,
  adsFloat: number = 0
): RealCashBreakdown {
  return {
    cashAvailable: bankBalance,
    cashIncoming: arCurrent,
    cashAtRisk: arOverdue,
    cashLocked: inventoryValue + adsFloat,
    totalCashPosition: bankBalance + arCurrent // Chỉ tính cash có khả năng thu được
  };
}

// ============================================
// SKU DECISION FORMULAS - Principle #6
// ============================================

export type SKUDecision = 'continue' | 'review' | 'reduce_ads' | 'stop_immediately';

export interface SKUAnalysis {
  decision: SKUDecision;
  reason: string[];
  monthlyImpact: number;
  action: string;
}

export function analyzeSKU(
  marginPercent: number,
  revenue: number,
  cogs: number,
  fees: number,
  profit: number
): SKUAnalysis {
  const reasons: string[] = [];
  let decision: SKUDecision = 'continue';
  
  // Check margin
  if (marginPercent < FDP_THRESHOLDS.SKU_CRITICAL_MARGIN_PERCENT) {
    decision = 'stop_immediately';
    reasons.push(`Margin ${marginPercent.toFixed(1)}% - bán càng nhiều càng lỗ nặng`);
  } else if (marginPercent < FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT) {
    decision = 'stop_immediately';
    reasons.push(`Margin âm ${marginPercent.toFixed(1)}%`);
  } else if (marginPercent < FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT) {
    decision = 'review';
    reasons.push(`Margin thấp (< ${FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT}%), cần xem xét giá bán`);
  }
  
  // Check COGS ratio
  if (revenue > 0 && cogs > revenue * 0.7) {
    if (decision !== 'stop_immediately') decision = 'review';
    reasons.push('Giá vốn > 70% doanh thu');
  }
  
  // Check fees ratio
  if (revenue > 0 && fees > revenue * 0.2) {
    if (decision === 'continue') decision = 'reduce_ads';
    reasons.push('Phí sàn/ads > 20% doanh thu');
  }
  
  const actionMap: Record<SKUDecision, string> = {
    continue: 'Tiếp tục bán',
    review: 'Xem xét tăng giá hoặc giảm chi phí',
    reduce_ads: 'Giảm ngân sách quảng cáo cho SKU này',
    stop_immediately: '🛑 NGỪNG BÁN SKU NÀY NGAY LẬP TỨC'
  };
  
  return {
    decision,
    reason: reasons,
    monthlyImpact: Math.abs(profit),
    action: actionMap[decision]
  };
}

// ============================================
// VALIDATION - Đảm bảo không ai tự tính
// ============================================

/**
 * Validate input data trước khi tính toán
 * Reject nếu data không hợp lệ thay vì cho số sai
 */
export function validateFormulaInput(input: Partial<FormulaInput>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check negative values that should never be negative
  if ((input.totalRevenue ?? 0) < 0) errors.push('Revenue không thể âm');
  if ((input.totalOrders ?? 0) < 0) errors.push('Orders không thể âm');
  if ((input.totalCustomers ?? 0) < 0) errors.push('Customers không thể âm');
  if ((input.daysInPeriod ?? 1) <= 0) errors.push('Days in period phải > 0');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================
// FORMULA REGISTRY - Danh sách tất cả công thức
// ============================================

export const FORMULA_REGISTRY = {
  NET_REVENUE: {
    name: 'Net Revenue',
    formula: 'Gross Revenue - Returns - Discounts - Platform Fees',
    description: 'Doanh thu thực sau khi trừ tất cả các khoản giảm trừ'
  },
  CONTRIBUTION_MARGIN: {
    name: 'Contribution Margin',
    formula: 'Net Revenue - COGS - Shipping - Marketing',
    description: 'Lợi nhuận gộp sau biến phí'
  },
  CM_PERCENT: {
    name: 'Contribution Margin %',
    formula: 'CM / Net Revenue × 100',
    description: 'Tỷ lệ lợi nhuận gộp trên doanh thu'
  },
  AOV: {
    name: 'Average Order Value',
    formula: 'Total Revenue / Total Orders',
    description: 'Giá trị đơn hàng trung bình'
  },
  CAC: {
    name: 'Customer Acquisition Cost',
    formula: 'Marketing Spend / New Customers',
    description: 'Chi phí để có được 1 khách hàng mới'
  },
  LTV: {
    name: 'Customer Lifetime Value',
    formula: 'AOV × Avg Orders/Customer × CM%',
    description: 'Giá trị vòng đời khách hàng'
  },
  LTV_CAC_RATIO: {
    name: 'LTV:CAC Ratio',
    formula: 'LTV / CAC',
    description: 'Tỷ lệ giá trị khách hàng so với chi phí thu hút. Mục tiêu ≥ 3x'
  },
  ROAS: {
    name: 'Return on Ad Spend',
    formula: 'Revenue / Marketing Spend',
    description: 'Hiệu quả chi tiêu quảng cáo'
  },
  DSO: {
    name: 'Days Sales Outstanding',
    formula: 'AR / Daily Sales',
    description: 'Số ngày trung bình để thu tiền'
  },
  DPO: {
    name: 'Days Payable Outstanding',
    formula: 'AP / Daily Purchases',
    description: 'Số ngày trung bình để trả tiền'
  },
  DIO: {
    name: 'Days Inventory Outstanding',
    formula: 'Inventory / Daily COGS',
    description: 'Số ngày tồn kho trung bình'
  },
  CCC: {
    name: 'Cash Conversion Cycle',
    formula: 'DSO + DIO - DPO',
    description: 'Chu kỳ chuyển đổi tiền mặt'
  },
  CASH_RUNWAY: {
    name: 'Cash Runway',
    formula: 'Cash / Monthly Burn Rate',
    description: 'Số tháng công ty có thể hoạt động với cash hiện có'
  }
} as const;
