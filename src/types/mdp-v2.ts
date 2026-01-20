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

// === UI LANGUAGE (Authoritative, Not Dramatic) ===
export const DECISION_LANGUAGE = {
  CAMPAIGN_BURNING_CASH: {
    title: 'Operating at Loss',
    headline: (amount: number) => `Campaign losing ${formatVND(amount)}/day`,
    subhead: 'Negative contribution margin detected',
    action: 'Stop Campaign',
    consequence: 'Continued operation increases loss',
  },
  FAKE_GROWTH_ALERT: {
    title: 'Revenue Without Profit',
    headline: (amount: number) => `${formatVND(amount)} revenue masking loss`,
    subhead: 'High revenue with negative margin',
    action: 'Review Required',
    consequence: 'Scaling will accelerate losses',
  },
  DELAYED_CASH_TRAP: {
    title: 'Cash Conversion Issue',
    headline: (amount: number) => `${formatVND(amount)} pending collection`,
    subhead: 'Low cash conversion rate',
    action: 'Pause Spend',
    consequence: 'Cash flow constraint risk',
  },
  RETURN_BOMB_RISK: {
    title: 'High Return Rate',
    headline: (rate: number) => `${(rate * 100).toFixed(0)}% return rate detected`,
    subhead: 'Revenue at risk of reversal',
    action: 'Reduce Budget',
    consequence: 'Net revenue impact pending',
  },
  SKU_POISONING_CAMPAIGN: {
    title: 'Unprofitable SKU',
    headline: (sku: string) => `Campaign promoting loss-making SKU: ${sku}`,
    subhead: 'Negative unit economics',
    action: 'Exclude SKU',
    consequence: 'Each sale increases loss',
  },
};

// === CALM COPY FOR CEO VIEW ===
export const CEO_VIEW_COPY = {
  status: {
    negative: 'Negative Marketing Contribution',
    positive: 'Positive Marketing Contribution',
  },
  sections: {
    netImpact: 'Net Marketing Impact',
    cashPosition: 'Cash Position',
    decisions: 'Required Decisions',
  },
  actions: {
    none: 'No immediate actions required',
    pending: (count: number) => `${count} decision${count > 1 ? 's' : ''} pending`,
  },
  confidence: {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
  },
};

// === HELPER ===
export function formatVND(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (abs >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString('vi-VN');
}

export function getUrgencyStyle(urgency: DecisionUrgency): string {
  switch (urgency) {
    case 'IMMEDIATE': return 'text-destructive font-medium';
    case 'TODAY': return 'text-amber-600 dark:text-amber-400 font-medium';
    case '48H': return 'text-muted-foreground';
    case 'THIS_WEEK': return 'text-muted-foreground';
  }
}

export function getActionStyle(action: DecisionAction, isPrimary: boolean = false): string {
  if (!isPrimary) {
    return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
  }
  switch (action) {
    case 'KILL': return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
    case 'PAUSE': return 'bg-amber-600 hover:bg-amber-700 text-white';
    case 'CAP': return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    case 'INVESTIGATE': return 'bg-primary hover:bg-primary/90 text-primary-foreground';
    case 'SCALE': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
  }
}

// Legacy exports for backward compatibility
export const CEO_PAIN_COPY = CEO_VIEW_COPY;
export const getUrgencyColor = getUrgencyStyle;
export const getActionColor = (action: DecisionAction) => getActionStyle(action, true);
