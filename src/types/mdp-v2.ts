// ============ MDP V2 - DECISION SYSTEM TYPES ============
// CEO/CFO Grade - Decision-First, Not Analytics

// === FINANCIAL TRUTH (READ-ONLY FROM FDP) ===
export interface FDPFinancialTruth {
  // Immutable - NEVER recalculate
  contributionMargin: number;
  cmPercent: number;
  worstCaseCM: number;
  cashReceived: number;
  cashPending: number;
  cashLocked: number;
  cashConversionRate: number;
  confidenceScore: number;
  truthStatus: 'confirmed' | 'estimated' | 'disputed';
}

// === MARKETING DECISION CARDS (NOT ALERTS) ===
export type DecisionCardType = 
  | 'CAMPAIGN_BURNING_CASH'
  | 'FAKE_GROWTH_ALERT'
  | 'DELAYED_CASH_TRAP'
  | 'RETURN_BOMB_RISK'
  | 'SKU_POISONING_CAMPAIGN';

export type DecisionAction = 'PAUSE' | 'KILL' | 'CAP' | 'SCALE' | 'INVESTIGATE';
export type DecisionOwner = 'CEO' | 'CFO' | 'CMO';
export type DecisionUrgency = 'IMMEDIATE' | 'TODAY' | '48H' | 'THIS_WEEK';

export interface MarketingDecisionCard {
  id: string;
  type: DecisionCardType;
  
  // Problem Statement (30 seconds rule)
  title: string;
  headline: string; // Bold, pain-focused
  
  // Financial Impact (MANDATORY)
  impactAmount: number; // VND - how much is being lost/at risk
  projectedLoss: number; // If no action taken
  cashAtRisk: number; // Locked or pending cash
  
  // Time Constraint (MANDATORY)
  urgency: DecisionUrgency;
  deadlineHours: number;
  daysSinceIssueStart: number;
  
  // Ownership (MANDATORY)
  owner: DecisionOwner;
  
  // Clear Action (MANDATORY)
  recommendedAction: DecisionAction;
  actionDescription: string;
  
  // Context
  campaignName: string;
  channel: string;
  
  // Evidence (from FDP)
  metrics: DecisionCardMetric[];
  
  // Status
  status: 'PENDING' | 'ACTIONED' | 'DISMISSED' | 'ESCALATED';
  createdAt: string;
  actionedAt?: string;
  actionedBy?: string;
  outcome?: string;
}

export interface DecisionCardMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
  severity: 'critical' | 'warning' | 'ok';
}

// === DECISION ENGINE RULES ===
export interface DecisionRule {
  id: string;
  type: DecisionCardType;
  condition: string;
  threshold: number;
  action: DecisionAction;
  urgency: DecisionUrgency;
  owner: DecisionOwner;
}

export const DECISION_RULES: DecisionRule[] = [
  {
    id: 'rule_profit_roas_negative_3d',
    type: 'CAMPAIGN_BURNING_CASH',
    condition: 'profit_roas < 0 for 3+ days',
    threshold: 0,
    action: 'KILL',
    urgency: 'IMMEDIATE',
    owner: 'CEO',
  },
  {
    id: 'rule_cash_conversion_low',
    type: 'DELAYED_CASH_TRAP',
    condition: 'cash_conversion < 50% at D+14',
    threshold: 0.5,
    action: 'PAUSE',
    urgency: 'TODAY',
    owner: 'CFO',
  },
  {
    id: 'rule_worst_case_cm_negative',
    type: 'CAMPAIGN_BURNING_CASH',
    condition: 'worst_case_cm < -10%',
    threshold: -0.1,
    action: 'KILL',
    urgency: 'IMMEDIATE',
    owner: 'CEO',
  },
  {
    id: 'rule_fake_growth',
    type: 'FAKE_GROWTH_ALERT',
    condition: 'high_revenue but negative_cm',
    threshold: 0,
    action: 'INVESTIGATE',
    urgency: 'TODAY',
    owner: 'CFO',
  },
  {
    id: 'rule_return_rate_high',
    type: 'RETURN_BOMB_RISK',
    condition: 'return_rate > 15%',
    threshold: 0.15,
    action: 'CAP',
    urgency: '48H',
    owner: 'CMO',
  },
];

// === CEO ONE-SCREEN SUMMARY ===
export interface CEOMarketingSnapshot {
  // Question 1: Is marketing creating or destroying money?
  isCreatingMoney: boolean;
  totalMarginCreated: number;
  totalMarginDestroyed: number;
  netMarginPosition: number;
  marginTrend: 'improving' | 'stable' | 'deteriorating';
  
  // Question 2: How much cash is at risk or locked?
  cashReceived: number;
  cashPending: number;
  cashLocked: number;
  totalCashAtRisk: number;
  cashConversionRate: number;
  
  // Question 3: What must be paused/killed immediately?
  immediateActions: number;
  criticalCards: MarketingDecisionCard[];
  
  // Truth Indicators
  dataConfidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

// === THRESHOLDS (Deterministic) ===
export const MDP_V2_THRESHOLDS = {
  // Kill conditions
  KILL_PROFIT_ROAS: 0, // Below this for 3 days = KILL
  KILL_WORST_CASE_CM: -0.1, // -10%
  
  // Pause conditions  
  PAUSE_CASH_CONVERSION_D14: 0.5, // 50%
  PAUSE_CM_PERCENT: 0.05, // 5%
  
  // Cap conditions
  CAP_RETURN_RATE: 0.15, // 15%
  CAP_REFUND_RATE: 0.1, // 10%
  
  // Warning conditions
  WARN_CASH_LOCKED_RATIO: 0.3, // 30% of spend still locked
  WARN_PENDING_DAYS: 14, // Cash pending > 14 days
  
  // Scale conditions
  SCALE_MIN_CM_PERCENT: 0.15, // 15%+
  SCALE_MIN_CASH_CONVERSION: 0.7, // 70%+
  SCALE_MIN_DAYS_PROFITABLE: 7, // 7 days of profit
};

// === UI LANGUAGE (Pain-focused, Aggressive) ===
export const DECISION_LANGUAGE = {
  CAMPAIGN_BURNING_CASH: {
    title: '🔥 ĐANG ĐỐT CHÁY TIỀN',
    headline: (amount: number) => `Mỗi giờ trôi qua = thêm ${formatVND(amount / 24)} bay hơi`,
    subhead: 'Campaign này đang phá hủy margin của bạn',
    action: 'GIẾT NGAY',
    consequence: 'Không hành động = tiếp tục mất tiền',
  },
  FAKE_GROWTH_ALERT: {
    title: '💀 TĂNG TRƯỞNG ẢO',
    headline: (amount: number) => `Doanh thu "đẹp" che giấu lỗ ${formatVND(amount)}`,
    subhead: 'Số liệu marketing đang NÓI DỐI bạn',
    action: 'ĐIỀU TRA GẤP',
    consequence: 'Càng scale = càng chết nhanh',
  },
  DELAYED_CASH_TRAP: {
    title: '🔒 TIỀN BỊ GIAM',
    headline: (amount: number) => `${formatVND(amount)} đang bị KHÓA CHẶT`,
    subhead: 'Tiền chi ra nhưng không quay về',
    action: 'DỪNG CHI TIỀN',
    consequence: 'Cash flow đang bị bóp nghẹt',
  },
  RETURN_BOMB_RISK: {
    title: '💣 BOM HOÀN TRẢ',
    headline: (rate: number) => `${(rate * 100).toFixed(0)}% đơn hàng đang BỊ TRẢ LẠI`,
    subhead: 'Doanh thu hôm nay = Hoàn tiền ngày mai',
    action: 'CẮT GIẢM NGAY',
    consequence: 'Revenue ảo, chi phí thật',
  },
  SKU_POISONING_CAMPAIGN: {
    title: '☠️ SKU ĐỘC HẠI',
    headline: (sku: string) => `Campaign đang bơm tiền vào SKU LỖ: ${sku}`,
    subhead: 'Mỗi đơn bán thêm = thêm tiền mất',
    action: 'LOẠI BỎ SKU',
    consequence: 'Bán nhiều = lỗ nhiều',
  },
};

// === PAIN COPY FOR CEO VIEW ===
export const CEO_PAIN_COPY = {
  destroying: {
    title: 'ĐANG PHÁ HỦY TIỀN',
    subtitle: 'Marketing đang LÀM HẠI doanh nghiệp',
    warning: 'Mỗi phút chậm trễ = thêm tiền mất',
  },
  creating: {
    title: 'ĐANG TẠO GIÁ TRỊ',
    subtitle: 'Marketing đang hoạt động hiệu quả',
    warning: 'Theo dõi để duy trì',
  },
  cashLocked: {
    title: 'TIỀN ĐANG BỊ GIAM',
    warning: 'Không thể sử dụng cho việc khác',
  },
  cashPending: {
    title: 'TIỀN CHƯA VỀ',
    warning: 'Có thể không bao giờ thu được',
  },
  immediateAction: {
    title: 'CẦN HÀNH ĐỘNG NGAY',
    subtitle: 'Mỗi giờ chậm = thêm tiền bay',
  },
  noIssues: {
    title: 'KHÔNG CÓ VẤN ĐỀ KHẨN CẤP',
    subtitle: 'Nhưng vẫn cần theo dõi liên tục',
  },
};

// === HELPER ===
export function formatVND(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B đ`;
  if (abs >= 1000000) return `${(amount / 1000000).toFixed(1)}M đ`;
  if (abs >= 1000) return `${(amount / 1000).toFixed(0)}K đ`;
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function getUrgencyColor(urgency: DecisionUrgency): string {
  switch (urgency) {
    case 'IMMEDIATE': return 'bg-red-600 text-white animate-pulse font-black';
    case 'TODAY': return 'bg-orange-500 text-white font-bold';
    case '48H': return 'bg-yellow-500 text-black font-medium';
    case 'THIS_WEEK': return 'bg-blue-500 text-white';
  }
}

export function getActionColor(action: DecisionAction): string {
  switch (action) {
    case 'KILL': return 'bg-red-600 hover:bg-red-700 text-white font-black';
    case 'PAUSE': return 'bg-orange-600 hover:bg-orange-700 text-white font-bold';
    case 'CAP': return 'bg-yellow-600 hover:bg-yellow-700 text-black font-bold';
    case 'INVESTIGATE': return 'bg-blue-600 hover:bg-blue-700 text-white';
    case 'SCALE': return 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold';
  }
}
