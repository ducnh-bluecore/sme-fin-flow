/**
 * GOVERNANCE PATCH v3.1 - Metric Code Normalization
 * 
 * Standard: All metric codes MUST be snake_case lowercase
 * This module provides utilities to ensure consistent metric naming
 * across risk appetite rules, decision snapshots, board dashboard,
 * investor disclosure, and stress tests.
 */

/**
 * Normalize a metric code to snake_case lowercase
 * Handles conversion from SCREAMING_SNAKE_CASE, camelCase, or mixed formats
 */
export function normalizeMetricCode(code: string): string {
  if (!code) return '';
  
  // If already lowercase with underscores, just ensure lowercase
  if (/^[a-z][a-z0-9_]*$/.test(code)) {
    return code;
  }
  
  // Convert from SCREAMING_SNAKE_CASE
  if (/^[A-Z][A-Z0-9_]*$/.test(code)) {
    return code.toLowerCase();
  }
  
  // Convert from camelCase or PascalCase
  return code
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Standard metric codes for the system
 * All codes follow snake_case convention
 */
export const STANDARD_METRIC_CODES = {
  // AR Metrics
  ar_overdue_ratio: 'ar_overdue_ratio',
  ar_overdue_amount: 'ar_overdue_amount',
  
  // Cash Metrics
  cash_runway_days: 'cash_runway_days',
  cash_position: 'cash_position',
  cash_today: 'cash_today',
  cash_flow_today: 'cash_flow_today',
  cash_next_7d: 'cash_next_7d',
  
  // Automation Metrics
  auto_reconciliation_rate: 'auto_reconciliation_rate',
  auto_reconciliation_roi: 'auto_reconciliation_roi',
  false_auto_rate: 'false_auto_rate',
  guardrail_block_rate: 'guardrail_block_rate',
  
  // ML Metrics
  ml_accuracy: 'ml_accuracy',
  calibration_error: 'calibration_error',
  drift_signal_count: 'drift_signal_count',
  
  // Governance Metrics
  pending_approvals: 'pending_approvals',
  open_exceptions: 'open_exceptions',
  
  // DSO/DIO/DPO
  dso_days: 'dso_days',
  dio_days: 'dio_days',
  dpo_days: 'dpo_days',
  ccc_days: 'ccc_days',
  
  // Margins
  gross_margin: 'gross_margin',
  contribution_margin: 'contribution_margin',
} as const;

export type StandardMetricCode = keyof typeof STANDARD_METRIC_CODES;

/**
 * Map legacy/uppercase metric codes to standard codes
 */
const LEGACY_CODE_MAP: Record<string, string> = {
  'AR_OVERDUE_RATIO': 'ar_overdue_ratio',
  'AR_OVERDUE_AMOUNT': 'ar_overdue_amount',
  'AUTO_RECON_RATE': 'auto_reconciliation_rate',
  'FALSE_AUTO_RATE': 'false_auto_rate',
  'CASH_RUNWAY_DAYS': 'cash_runway_days',
  'DSO_DAYS': 'dso_days',
  'GROSS_MARGIN': 'gross_margin',
  'ML_DECISION_RATE': 'ml_accuracy',
  'GUARDRAIL_BLOCK_RATE': 'guardrail_block_rate',
};

/**
 * Convert legacy metric code to standard code
 */
export function toStandardMetricCode(legacyCode: string): string {
  const upper = legacyCode.toUpperCase();
  return LEGACY_CODE_MAP[upper] || normalizeMetricCode(legacyCode);
}

/**
 * Scenario types - note: these are stored in uppercase in the DB
 * due to existing CHECK constraints, but we normalize for display
 */
export const SCENARIO_TYPES = {
  revenue_shock: 'REVENUE_SHOCK',
  ar_delay: 'AR_DELAY', 
  cost_inflation: 'COST_INFLATION',
  automation_pause: 'AUTOMATION_PAUSE',
  custom: 'CUSTOM',
} as const;

/**
 * Get display-friendly label for scenario type
 */
export function getScenarioTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'REVENUE_SHOCK': 'Revenue Decline',
    'revenue_shock': 'Revenue Decline',
    'AR_DELAY': 'Collection Slowdown',
    'ar_delay': 'Collection Slowdown',
    'COST_INFLATION': 'Cost Increase',
    'cost_inflation': 'Cost Increase',
    'AUTOMATION_PAUSE': 'Automation Disabled',
    'automation_pause': 'Automation Disabled',
    'CUSTOM': 'Custom Scenario',
    'custom': 'Custom Scenario',
  };
  return labels[type] || type;
}

/**
 * Validate that a metric code follows the snake_case convention
 */
export function isValidMetricCode(code: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(code);
}

/**
 * Assert metric code is valid, throw if not
 */
export function assertValidMetricCode(code: string): void {
  if (!isValidMetricCode(code)) {
    throw new Error(
      `Invalid metric code "${code}". Metric codes must be snake_case lowercase. ` +
      `Got: "${code}", normalized would be: "${normalizeMetricCode(code)}"`
    );
  }
}
