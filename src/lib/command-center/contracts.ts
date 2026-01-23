/**
 * FEDERATED COMMAND CENTER - SHARED CONTRACTS
 * 
 * Three mandatory contracts shared across all Command Centers:
 * 1. Metric Contract - Source of Truth for metrics
 * 2. Evidence Contract - Auditability & traceability
 * 3. Decision Contract - Standardized decision structure
 * 
 * Federation Rules:
 * - Each Command Center shows its own decisions by default
 * - Escalation to Control Tower is OPTIONAL
 * - Deduplication using: tenant_id + metric_code + grain + period + entity_id
 */

// ═══════════════════════════════════════════════════════════════════
// METRIC CONTRACT
// ═══════════════════════════════════════════════════════════════════

export type MetricGrain = 
  | 'tenant'           // Whole company
  | 'channel'          // Marketing/sales channel
  | 'campaign'         // Marketing campaign
  | 'sku'              // Product SKU
  | 'customer'         // Individual customer
  | 'segment'          // Customer segment
  | 'cohort'           // Customer cohort
  | 'store'            // Physical store
  | 'order'            // Single order
  | 'invoice'          // Single invoice
  | 'population';      // CDP population

export type MetricSource = 
  | 'database_view'    // Supabase view (SSOT)
  | 'database_table'   // Supabase table
  | 'hook_computed'    // Client-side hook (⚠️ SSOT risk)
  | 'edge_function'    // Server-side edge function
  | 'cache';           // Cached/materialized

export interface MetricContract {
  /** Unique metric code (snake_case, lowercase) */
  metric_code: string;
  
  /** Human-readable label */
  label: string;
  
  /** Vietnamese label */
  label_vi: string;
  
  /** Source view/table name */
  source_view: string;
  
  /** Column or expression for the value */
  source_expression: string;
  
  /** Granularity level */
  grain: MetricGrain;
  
  /** Where the metric is computed */
  source_type: MetricSource;
  
  /** Metric version (for breaking changes) */
  version: number;
  
  /** Unit of measurement */
  unit: 'currency' | 'percent' | 'days' | 'count' | 'ratio';
  
  /** Currency code if unit is currency */
  currency?: 'VND' | 'USD';
  
  /** Domain/module that owns this metric */
  domain: CommandCenterDomain;
  
  /** Whether this metric can trigger decisions */
  is_actionable: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export type DataQualityFlag = 
  | 'complete'         // All data present
  | 'partial'          // Some data missing
  | 'stale'            // Data older than threshold
  | 'estimated'        // Contains estimated values
  | 'disputed'         // Values under review
  | 'unknown';         // Cannot verify

export interface EvidenceContract {
  /** When the evidence was captured */
  as_of_timestamp: string;
  
  /** Source tables/views used */
  source_tables: string[];
  
  /** Data quality assessment */
  data_quality_flags: DataQualityFlag[];
  
  /** Confidence score 0-1 */
  confidence_score: number;
  
  /** Sample size (for statistical validity) */
  sample_size?: number;
  
  /** Time range of data */
  data_period?: {
    start: string;
    end: string;
  };
  
  /** Computation method description */
  computation_method?: string;
  
  /** Link to evidence source */
  evidence_url?: string;
  
  /** Raw data snapshot for audit */
  raw_snapshot?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════
// DECISION CONTRACT
// ═══════════════════════════════════════════════════════════════════

export type CommandCenterDomain = 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER';

export type DecisionSeverity = 'critical' | 'high' | 'medium' | 'low';

export type DecisionStatus = 
  | 'OPEN'             // New, not yet addressed
  | 'IN_PROGRESS'      // Being worked on
  | 'DECIDED'          // Action taken
  | 'DISMISSED'        // Marked as not actionable
  | 'ESCALATED'        // Sent to Control Tower
  | 'SNOOZED';         // Temporarily hidden

export type DecisionActionType = 
  | 'PAUSE'            // Stop activity
  | 'KILL'             // Terminate permanently
  | 'SCALE'            // Increase investment
  | 'REDUCE'           // Decrease investment
  | 'INVESTIGATE'      // Needs more info
  | 'ACCEPT_RISK'      // Acknowledge and continue
  | 'ADJUST_STRATEGY'  // Change approach
  | 'ESCALATE';        // Send to higher authority

export type DecisionOwnerRole = 'CEO' | 'CFO' | 'CMO' | 'COO' | 'OPS';

export interface DecisionFact {
  /** Fact identifier */
  fact_id: string;
  
  /** Label for display */
  label: string;
  
  /** Current value */
  value: number | string;
  
  /** Unit for the value */
  unit: string;
  
  /** Trend direction */
  trend?: 'up' | 'down' | 'flat';
  
  /** Status indicator */
  status: 'good' | 'warning' | 'bad' | 'neutral';
  
  /** Reference to metric contract */
  metric_code?: string;
}

export interface DecisionAction {
  /** Action identifier */
  action_id: string;
  
  /** Action label */
  label: string;
  
  /** Action type */
  action_type: DecisionActionType;
  
  /** Whether this is the recommended action */
  is_recommended: boolean;
  
  /** Projected impact if action is taken */
  projected_impact?: number;
  
  /** Additional action metadata */
  metadata?: Record<string, unknown>;
}

export interface DecisionContract {
  /** Unique decision ID */
  id: string;
  
  /** Tenant ID for multi-tenancy */
  tenant_id: string;
  
  /** Domain that owns this decision */
  domain: CommandCenterDomain;
  
  /** Decision type/category */
  decision_type: string;
  
  /** Entity type being decided on */
  entity_type: MetricGrain;
  
  /** Entity identifier */
  entity_id: string;
  
  /** Entity display name */
  entity_name: string;
  
  /** Primary metric code that triggered this */
  metric_code: string;
  
  /** Metric version */
  metric_version: number;
  
  /** Time period for the decision */
  period: string;  // e.g., '2024-01', 'last_7d', 'YTD'
  
  /** Decision title/headline */
  title: string;
  
  /** Detailed problem statement */
  problem_statement: string;
  
  /** Severity level */
  severity: DecisionSeverity;
  
  /** Current status */
  status: DecisionStatus;
  
  /** Owner role */
  owner_role: DecisionOwnerRole;
  
  /** Owner user ID (if assigned) */
  owner_user_id?: string;
  
  /** Financial impact amount */
  impact_amount: number;
  
  /** Impact description */
  impact_description?: string;
  
  /** Deadline for decision */
  deadline_at: string;
  
  /** Hours until deadline */
  deadline_hours: number;
  
  /** Supporting facts */
  facts: DecisionFact[];
  
  /** Available actions */
  actions: DecisionAction[];
  
  /** Evidence for this decision */
  evidence: EvidenceContract;
  
  /** Recommended action */
  recommended_action?: string;
  
  /** Created timestamp */
  created_at: string;
  
  /** Last updated timestamp */
  updated_at: string;
  
  /** Decision taken (if decided) */
  decision_outcome?: string;
  
  /** Decision note */
  decision_note?: string;
  
  /** Who made the decision */
  decided_by?: string;
  
  /** When decision was made */
  decided_at?: string;
  
  /** If escalated, target domain */
  escalated_to?: CommandCenterDomain;
  
  /** Snooze until timestamp */
  snoozed_until?: string;
}

// ═══════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a deduplication key for a decision
 * Format: {tenant_id}:{metric_code}:{grain}:{period}:{entity_id}
 */
export function generateDedupeKey(decision: Pick<DecisionContract, 
  'tenant_id' | 'metric_code' | 'entity_type' | 'period' | 'entity_id'
>): string {
  return [
    decision.tenant_id,
    decision.metric_code,
    decision.entity_type,
    decision.period,
    decision.entity_id,
  ].join(':');
}

/**
 * Check if two decisions are duplicates based on dedupe key
 */
export function areDecisionsDuplicate(
  a: Pick<DecisionContract, 'tenant_id' | 'metric_code' | 'entity_type' | 'period' | 'entity_id'>,
  b: Pick<DecisionContract, 'tenant_id' | 'metric_code' | 'entity_type' | 'period' | 'entity_id'>
): boolean {
  return generateDedupeKey(a) === generateDedupeKey(b);
}

/**
 * Deduplicate a list of decisions, keeping the most recent
 */
export function deduplicateDecisions<T extends DecisionContract>(decisions: T[]): T[] {
  const deduped = new Map<string, T>();
  
  for (const decision of decisions) {
    const key = generateDedupeKey(decision);
    const existing = deduped.get(key);
    
    if (!existing || new Date(decision.updated_at) > new Date(existing.updated_at)) {
      deduped.set(key, decision);
    }
  }
  
  return Array.from(deduped.values());
}

// ═══════════════════════════════════════════════════════════════════
// ESCALATION
// ═══════════════════════════════════════════════════════════════════

export interface EscalationConfig {
  /** Minimum severity to auto-escalate */
  min_severity_for_escalation: DecisionSeverity;
  
  /** Hours overdue before auto-escalation */
  overdue_hours_for_escalation: number;
  
  /** Impact amount threshold for escalation */
  impact_threshold_for_escalation: number;
  
  /** Whether to notify on escalation */
  notify_on_escalation: boolean;
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  min_severity_for_escalation: 'critical',
  overdue_hours_for_escalation: 4,
  impact_threshold_for_escalation: 100_000_000, // 100M VND
  notify_on_escalation: true,
};

/**
 * Check if a decision should be escalated to Control Tower
 */
export function shouldEscalate(
  decision: DecisionContract,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): boolean {
  // Already escalated or resolved
  if (decision.status === 'ESCALATED' || decision.status === 'DECIDED' || decision.status === 'DISMISSED') {
    return false;
  }
  
  // Check severity
  const severityOrder: Record<DecisionSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const minSeverityLevel = severityOrder[config.min_severity_for_escalation];
  const decisionSeverityLevel = severityOrder[decision.severity];
  
  if (decisionSeverityLevel > minSeverityLevel) {
    return false;
  }
  
  // Check if overdue
  const hoursOverdue = (Date.now() - new Date(decision.deadline_at).getTime()) / (1000 * 60 * 60);
  if (hoursOverdue >= config.overdue_hours_for_escalation) {
    return true;
  }
  
  // Check impact
  if (Math.abs(decision.impact_amount) >= config.impact_threshold_for_escalation) {
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════

export function isValidMetricContract(obj: unknown): obj is MetricContract {
  if (typeof obj !== 'object' || obj === null) return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m.metric_code === 'string' &&
    typeof m.source_view === 'string' &&
    typeof m.grain === 'string' &&
    typeof m.version === 'number'
  );
}

export function isValidEvidenceContract(obj: unknown): obj is EvidenceContract {
  if (typeof obj !== 'object' || obj === null) return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.as_of_timestamp === 'string' &&
    Array.isArray(e.source_tables) &&
    Array.isArray(e.data_quality_flags) &&
    typeof e.confidence_score === 'number'
  );
}

export function isValidDecisionContract(obj: unknown): obj is DecisionContract {
  if (typeof obj !== 'object' || obj === null) return false;
  const d = obj as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.tenant_id === 'string' &&
    typeof d.domain === 'string' &&
    typeof d.metric_code === 'string' &&
    typeof d.entity_id === 'string'
  );
}
