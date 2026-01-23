/**
 * FEDERATED COMMAND CENTER - PUBLIC API
 * 
 * Central export point for all Command Center contracts and utilities.
 */

// Core contracts
export {
  // Types
  type MetricGrain,
  type MetricSource,
  type MetricContract,
  type DataQualityFlag,
  type EvidenceContract,
  type CommandCenterDomain,
  type DecisionSeverity,
  type DecisionStatus,
  type DecisionActionType,
  type DecisionOwnerRole,
  type DecisionFact,
  type DecisionAction,
  type DecisionContract,
  type EscalationConfig,
  
  // Functions
  generateDedupeKey,
  areDecisionsDuplicate,
  deduplicateDecisions,
  shouldEscalate,
  
  // Constants
  DEFAULT_ESCALATION_CONFIG,
  
  // Type guards
  isValidMetricContract,
  isValidEvidenceContract,
  isValidDecisionContract,
} from './contracts';

// Metric registry
export {
  METRIC_REGISTRY,
  getMetricsByDomain,
  getMetricByCode,
  getActionableMetrics,
  getMetricsByGrain,
  metricExists,
  isValidMetricCode,
  getMetricsWithSSOTRisk,
} from './metric-registry';

// Decision builders
export {
  createDecision,
  createEvidence,
  createFact,
  createAction,
  buildFDPDecision,
  buildMDPDecision,
  buildCDPDecision,
} from './decision-builders';

// Federation hook
export {
  useFederatedDecisions,
  type FederatedDecisionsResult,
} from './useFederatedDecisions';
