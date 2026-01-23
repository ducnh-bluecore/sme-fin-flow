/**
 * FEDERATED COMMAND CENTER - DECISION BUILDERS
 * 
 * Factory functions to create properly-formed Decision contracts.
 * Ensures all required fields are populated correctly.
 */

import {
  DecisionContract,
  DecisionFact,
  DecisionAction,
  EvidenceContract,
  CommandCenterDomain,
  DecisionSeverity,
  DecisionStatus,
  DecisionActionType,
  DecisionOwnerRole,
  MetricGrain,
  DataQualityFlag,
} from './contracts';
import { getMetricByCode } from './metric-registry';

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE BUILDER
// ═══════════════════════════════════════════════════════════════════

export interface CreateEvidenceParams {
  sourceTables: string[];
  qualityFlags?: DataQualityFlag[];
  confidenceScore?: number;
  sampleSize?: number;
  dataPeriod?: { start: string; end: string };
  computationMethod?: string;
  rawSnapshot?: Record<string, unknown>;
}

export function createEvidence(params: CreateEvidenceParams): EvidenceContract {
  return {
    as_of_timestamp: new Date().toISOString(),
    source_tables: params.sourceTables,
    data_quality_flags: params.qualityFlags || ['complete'],
    confidence_score: params.confidenceScore ?? 0.8,
    sample_size: params.sampleSize,
    data_period: params.dataPeriod,
    computation_method: params.computationMethod,
    raw_snapshot: params.rawSnapshot,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FACT BUILDER
// ═══════════════════════════════════════════════════════════════════

export interface CreateFactParams {
  factId: string;
  label: string;
  value: number | string;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
  status: 'good' | 'warning' | 'bad' | 'neutral';
  metricCode?: string;
}

export function createFact(params: CreateFactParams): DecisionFact {
  return {
    fact_id: params.factId,
    label: params.label,
    value: params.value,
    unit: params.unit,
    trend: params.trend,
    status: params.status,
    metric_code: params.metricCode,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ACTION BUILDER
// ═══════════════════════════════════════════════════════════════════

export interface CreateActionParams {
  actionId: string;
  label: string;
  actionType: DecisionActionType;
  isRecommended?: boolean;
  projectedImpact?: number;
  metadata?: Record<string, unknown>;
}

export function createAction(params: CreateActionParams): DecisionAction {
  return {
    action_id: params.actionId,
    label: params.label,
    action_type: params.actionType,
    is_recommended: params.isRecommended ?? false,
    projected_impact: params.projectedImpact,
    metadata: params.metadata,
  };
}

// ═══════════════════════════════════════════════════════════════════
// DECISION BUILDER
// ═══════════════════════════════════════════════════════════════════

export interface CreateDecisionParams {
  tenantId: string;
  domain: CommandCenterDomain;
  decisionType: string;
  entityType: MetricGrain;
  entityId: string;
  entityName: string;
  metricCode: string;
  period: string;
  title: string;
  problemStatement: string;
  severity: DecisionSeverity;
  ownerRole: DecisionOwnerRole;
  impactAmount: number;
  impactDescription?: string;
  deadlineHours: number;
  facts: DecisionFact[];
  actions: DecisionAction[];
  evidence: EvidenceContract;
  recommendedAction?: string;
  ownerUserId?: string;
}

export function createDecision(params: CreateDecisionParams): DecisionContract {
  const metric = getMetricByCode(params.metricCode);
  const metricVersion = metric?.version ?? 1;
  
  const now = new Date();
  const deadline = new Date(now.getTime() + params.deadlineHours * 60 * 60 * 1000);
  
  return {
    id: `${params.domain.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: params.tenantId,
    domain: params.domain,
    decision_type: params.decisionType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_name: params.entityName,
    metric_code: params.metricCode,
    metric_version: metricVersion,
    period: params.period,
    title: params.title,
    problem_statement: params.problemStatement,
    severity: params.severity,
    status: 'OPEN',
    owner_role: params.ownerRole,
    owner_user_id: params.ownerUserId,
    impact_amount: params.impactAmount,
    impact_description: params.impactDescription,
    deadline_at: deadline.toISOString(),
    deadline_hours: params.deadlineHours,
    facts: params.facts,
    actions: params.actions,
    evidence: params.evidence,
    recommended_action: params.recommendedAction,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC BUILDERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Build FDP-specific decision (Finance)
 */
export interface FDPDecisionParams {
  tenantId: string;
  type: 'SKU_STOP' | 'CASH_CRITICAL' | 'AR_OVERDUE' | 'MARGIN_NEGATIVE';
  entityId: string;
  entityName: string;
  impactAmount: number;
  facts: DecisionFact[];
  sourceTables: string[];
}

export function buildFDPDecision(params: FDPDecisionParams): DecisionContract {
  const typeConfig: Record<string, {
    metricCode: string;
    entityType: MetricGrain;
    title: (name: string) => string;
    problem: (name: string, impact: number) => string;
    severity: DecisionSeverity;
    ownerRole: DecisionOwnerRole;
    deadlineHours: number;
    actions: DecisionAction[];
  }> = {
    SKU_STOP: {
      metricCode: 'sku_margin',
      entityType: 'sku',
      title: (name) => `SKU ${name} đang lỗ`,
      problem: (name, impact) => `SKU ${name} có margin âm, gây thiệt hại ${formatCurrency(impact)}/ngày. Cần dừng bán hoặc điều chỉnh giá.`,
      severity: 'high',
      ownerRole: 'CFO',
      deadlineHours: 24,
      actions: [
        createAction({ actionId: 'stop_sku', label: 'Dừng bán SKU', actionType: 'KILL', isRecommended: true }),
        createAction({ actionId: 'adjust_price', label: 'Điều chỉnh giá', actionType: 'ADJUST_STRATEGY' }),
        createAction({ actionId: 'investigate', label: 'Điều tra thêm', actionType: 'INVESTIGATE' }),
      ],
    },
    CASH_CRITICAL: {
      metricCode: 'cash_runway_days',
      entityType: 'tenant',
      title: () => 'Cash Runway nguy cấp',
      problem: (_, impact) => `Số ngày còn hoạt động chỉ còn ${impact} ngày. Cần hành động ngay để đảm bảo dòng tiền.`,
      severity: 'critical',
      ownerRole: 'CEO',
      deadlineHours: 4,
      actions: [
        createAction({ actionId: 'collect_ar', label: 'Thu công nợ sớm', actionType: 'PAUSE', isRecommended: true }),
        createAction({ actionId: 'cut_cost', label: 'Cắt giảm chi phí', actionType: 'REDUCE' }),
        createAction({ actionId: 'delay_ap', label: 'Trì hoãn thanh toán', actionType: 'PAUSE' }),
      ],
    },
    AR_OVERDUE: {
      metricCode: 'ar_overdue_amount',
      entityType: 'customer',
      title: (name) => `Công nợ quá hạn: ${name}`,
      problem: (name, impact) => `Khách hàng ${name} có công nợ quá hạn ${formatCurrency(impact)}. Cần theo dõi và thu hồi.`,
      severity: 'high',
      ownerRole: 'CFO',
      deadlineHours: 48,
      actions: [
        createAction({ actionId: 'contact', label: 'Liên hệ thu nợ', actionType: 'INVESTIGATE', isRecommended: true }),
        createAction({ actionId: 'stop_credit', label: 'Dừng tín dụng', actionType: 'PAUSE' }),
        createAction({ actionId: 'accept_risk', label: 'Chấp nhận rủi ro', actionType: 'ACCEPT_RISK' }),
      ],
    },
    MARGIN_NEGATIVE: {
      metricCode: 'contribution_margin_percent',
      entityType: 'channel',
      title: (name) => `Kênh ${name} lỗ`,
      problem: (name, impact) => `Kênh ${name} có margin âm ${formatCurrency(impact)}. Cần review chi phí hoặc dừng kênh.`,
      severity: 'high',
      ownerRole: 'CFO',
      deadlineHours: 24,
      actions: [
        createAction({ actionId: 'pause_channel', label: 'Tạm dừng kênh', actionType: 'PAUSE', isRecommended: true }),
        createAction({ actionId: 'reduce_cost', label: 'Giảm chi phí', actionType: 'REDUCE' }),
        createAction({ actionId: 'investigate', label: 'Phân tích chi tiết', actionType: 'INVESTIGATE' }),
      ],
    },
  };

  const config = typeConfig[params.type];
  
  return createDecision({
    tenantId: params.tenantId,
    domain: 'FDP',
    decisionType: params.type,
    entityType: config.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    metricCode: config.metricCode,
    period: getCurrentPeriod(),
    title: config.title(params.entityName),
    problemStatement: config.problem(params.entityName, params.impactAmount),
    severity: config.severity,
    ownerRole: config.ownerRole,
    impactAmount: params.impactAmount,
    deadlineHours: config.deadlineHours,
    facts: params.facts,
    actions: config.actions,
    evidence: createEvidence({
      sourceTables: params.sourceTables,
      qualityFlags: ['complete'],
      confidenceScore: 0.9,
    }),
    recommendedAction: config.actions.find(a => a.is_recommended)?.label,
  });
}

/**
 * Build MDP-specific decision (Marketing)
 */
export interface MDPDecisionParams {
  tenantId: string;
  type: 'CAMPAIGN_BURNING_CASH' | 'FAKE_GROWTH' | 'DELAYED_CASH' | 'SCALE_OPPORTUNITY';
  campaignId: string;
  campaignName: string;
  channel: string;
  impactAmount: number;
  facts: DecisionFact[];
  sourceTables: string[];
}

export function buildMDPDecision(params: MDPDecisionParams): DecisionContract {
  const typeConfig: Record<string, {
    metricCode: string;
    title: (name: string) => string;
    problem: (name: string, channel: string, impact: number) => string;
    severity: DecisionSeverity;
    ownerRole: DecisionOwnerRole;
    deadlineHours: number;
    actions: DecisionAction[];
  }> = {
    CAMPAIGN_BURNING_CASH: {
      metricCode: 'profit_roas',
      title: (name) => `Campaign ${name} đang đốt tiền`,
      problem: (name, channel, impact) => `Campaign ${name} trên ${channel} có ROAS âm, đốt ${formatCurrency(impact)}/ngày. Cần dừng ngay.`,
      severity: 'critical',
      ownerRole: 'CEO',
      deadlineHours: 4,
      actions: [
        createAction({ actionId: 'kill', label: 'KILL - Dừng ngay', actionType: 'KILL', isRecommended: true }),
        createAction({ actionId: 'pause', label: 'PAUSE - Tạm dừng', actionType: 'PAUSE' }),
        createAction({ actionId: 'investigate', label: 'Điều tra thêm', actionType: 'INVESTIGATE' }),
      ],
    },
    FAKE_GROWTH: {
      metricCode: 'campaign_cm_percent',
      title: (name) => `Tăng trưởng giả: ${name}`,
      problem: (name, channel, impact) => `Campaign ${name} có doanh thu cao nhưng margin âm ${formatCurrency(impact)}. Tăng trưởng không bền vững.`,
      severity: 'high',
      ownerRole: 'CFO',
      deadlineHours: 24,
      actions: [
        createAction({ actionId: 'review', label: 'Review cấu trúc chi phí', actionType: 'INVESTIGATE', isRecommended: true }),
        createAction({ actionId: 'cap', label: 'CAP - Giới hạn budget', actionType: 'REDUCE' }),
        createAction({ actionId: 'pause', label: 'PAUSE', actionType: 'PAUSE' }),
      ],
    },
    DELAYED_CASH: {
      metricCode: 'cash_conversion_rate',
      title: (name) => `Cash bị khóa: ${name}`,
      problem: (name, channel, impact) => `Campaign ${name} có ${formatCurrency(impact)} tiền chưa thu về sau 14 ngày. Rủi ro cash flow.`,
      severity: 'high',
      ownerRole: 'CFO',
      deadlineHours: 48,
      actions: [
        createAction({ actionId: 'pause', label: 'PAUSE đến khi cash về', actionType: 'PAUSE', isRecommended: true }),
        createAction({ actionId: 'reduce', label: 'Giảm budget 50%', actionType: 'REDUCE' }),
        createAction({ actionId: 'accept', label: 'Chấp nhận rủi ro', actionType: 'ACCEPT_RISK' }),
      ],
    },
    SCALE_OPPORTUNITY: {
      metricCode: 'campaign_cm',
      title: (name) => `Cơ hội SCALE: ${name}`,
      problem: (name, channel, impact) => `Campaign ${name} trên ${channel} có margin tốt ${formatCurrency(impact)}, cash positive. Cơ hội mở rộng.`,
      severity: 'medium',
      ownerRole: 'CMO',
      deadlineHours: 72,
      actions: [
        createAction({ actionId: 'scale', label: 'SCALE +30%', actionType: 'SCALE', isRecommended: true }),
        createAction({ actionId: 'maintain', label: 'Giữ nguyên', actionType: 'ACCEPT_RISK' }),
        createAction({ actionId: 'investigate', label: 'Phân tích thêm', actionType: 'INVESTIGATE' }),
      ],
    },
  };

  const config = typeConfig[params.type];
  
  return createDecision({
    tenantId: params.tenantId,
    domain: 'MDP',
    decisionType: params.type,
    entityType: 'campaign',
    entityId: params.campaignId,
    entityName: params.campaignName,
    metricCode: config.metricCode,
    period: getCurrentPeriod(),
    title: config.title(params.campaignName),
    problemStatement: config.problem(params.campaignName, params.channel, params.impactAmount),
    severity: config.severity,
    ownerRole: config.ownerRole,
    impactAmount: params.impactAmount,
    impactDescription: `Channel: ${params.channel}`,
    deadlineHours: config.deadlineHours,
    facts: params.facts,
    actions: config.actions,
    evidence: createEvidence({
      sourceTables: params.sourceTables,
      qualityFlags: ['complete'],
      confidenceScore: 0.85,
    }),
    recommendedAction: config.actions.find(a => a.is_recommended)?.label,
  });
}

/**
 * Build CDP-specific decision (Customer)
 */
export interface CDPDecisionParams {
  tenantId: string;
  type: 'VIP_SHRINKING' | 'CONCENTRATION_RISK' | 'CHURN_SPIKE' | 'VALUE_SHIFT';
  populationId: string;
  populationName: string;
  impactAmount: number;
  facts: DecisionFact[];
  sourceTables: string[];
}

export function buildCDPDecision(params: CDPDecisionParams): DecisionContract {
  const typeConfig: Record<string, {
    metricCode: string;
    entityType: MetricGrain;
    title: (name: string) => string;
    problem: (name: string, impact: number) => string;
    severity: DecisionSeverity;
    ownerRole: DecisionOwnerRole;
    deadlineHours: number;
    actions: DecisionAction[];
  }> = {
    VIP_SHRINKING: {
      metricCode: 'segment_ltv',
      entityType: 'segment',
      title: (name) => `Segment VIP đang thu hẹp: ${name}`,
      problem: (name, impact) => `Segment ${name} giảm size, ảnh hưởng ${formatCurrency(impact)} doanh thu tiềm năng. Cần xem xét chính sách.`,
      severity: 'high',
      ownerRole: 'CEO',
      deadlineHours: 72,
      actions: [
        createAction({ actionId: 'adjust_policy', label: 'Điều chỉnh chính sách VIP', actionType: 'ADJUST_STRATEGY', isRecommended: true }),
        createAction({ actionId: 'investigate', label: 'Phân tích nguyên nhân', actionType: 'INVESTIGATE' }),
        createAction({ actionId: 'accept', label: 'Chấp nhận xu hướng', actionType: 'ACCEPT_RISK' }),
      ],
    },
    CONCENTRATION_RISK: {
      metricCode: 'revenue_concentration',
      entityType: 'tenant',
      title: () => 'Rủi ro tập trung doanh thu',
      problem: (_, impact) => `Top 10% khách hàng chiếm ${impact}% doanh thu. Rủi ro cao nếu mất khách lớn.`,
      severity: 'high',
      ownerRole: 'CEO',
      deadlineHours: 168, // 1 week
      actions: [
        createAction({ actionId: 'diversify', label: 'Đa dạng hóa khách hàng', actionType: 'ADJUST_STRATEGY', isRecommended: true }),
        createAction({ actionId: 'protect', label: 'Bảo vệ khách hàng lớn', actionType: 'INVESTIGATE' }),
        createAction({ actionId: 'accept', label: 'Chấp nhận rủi ro', actionType: 'ACCEPT_RISK' }),
      ],
    },
    CHURN_SPIKE: {
      metricCode: 'churn_risk_count',
      entityType: 'population',
      title: (name) => `Churn spike: ${name}`,
      problem: (name, impact) => `Có ${impact} khách hàng trong ${name} có nguy cơ rời bỏ cao. Cần can thiệp.`,
      severity: 'high',
      ownerRole: 'COO',
      deadlineHours: 48,
      actions: [
        createAction({ actionId: 'retention', label: 'Chạy chương trình retention', actionType: 'ADJUST_STRATEGY', isRecommended: true }),
        createAction({ actionId: 'investigate', label: 'Tìm hiểu nguyên nhân', actionType: 'INVESTIGATE' }),
        createAction({ actionId: 'accept', label: 'Chấp nhận churn tự nhiên', actionType: 'ACCEPT_RISK' }),
      ],
    },
    VALUE_SHIFT: {
      metricCode: 'customer_equity_12m',
      entityType: 'segment',
      title: (name) => `Value shift: ${name}`,
      problem: (name, impact) => `Segment ${name} có dịch chuyển giá trị ${formatCurrency(impact)}. Cần đánh giá lại chiến lược.`,
      severity: 'medium',
      ownerRole: 'CFO',
      deadlineHours: 168,
      actions: [
        createAction({ actionId: 'review', label: 'Review chiến lược segment', actionType: 'INVESTIGATE', isRecommended: true }),
        createAction({ actionId: 'adjust', label: 'Điều chỉnh targeting', actionType: 'ADJUST_STRATEGY' }),
        createAction({ actionId: 'monitor', label: 'Theo dõi thêm', actionType: 'ACCEPT_RISK' }),
      ],
    },
  };

  const config = typeConfig[params.type];
  
  return createDecision({
    tenantId: params.tenantId,
    domain: 'CDP',
    decisionType: params.type,
    entityType: config.entityType,
    entityId: params.populationId,
    entityName: params.populationName,
    metricCode: config.metricCode,
    period: getCurrentPeriod(),
    title: config.title(params.populationName),
    problemStatement: config.problem(params.populationName, params.impactAmount),
    severity: config.severity,
    ownerRole: config.ownerRole,
    impactAmount: params.impactAmount,
    deadlineHours: config.deadlineHours,
    facts: params.facts,
    actions: config.actions,
    evidence: createEvidence({
      sourceTables: params.sourceTables,
      qualityFlags: ['complete'],
      confidenceScore: 0.8,
    }),
    recommendedAction: config.actions.find(a => a.is_recommended)?.label,
  });
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}
