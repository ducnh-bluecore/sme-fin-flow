/**
 * ============================================
 * SSOT LIB - Single Source of Truth Utilities
 * ============================================
 * 
 * Central export for SSOT enforcement utilities.
 * 
 * @see docs/SSOT_ENFORCEMENT_SPEC.md
 * @see docs/JOB_IDEMPOTENCY_STANDARD.md
 */

// ============================================
// Facade Views
// ============================================
export {
  FACADE_VIEWS,
  CANONICAL_VIEWS,
  ALL_CANONICAL_VIEWS,
  VIEW_REGISTRY,
  isCanonicalView,
  isFacadeView,
  getViewDomain,
  getFacadeView,
  getCanonicalViews,
  warnIfNonCanonical,
  type FacadeViewDomain,
  type FacadeViewName,
  type CanonicalViewDomain,
} from './facadeViews';

// ============================================
// Evidence Contract
// ============================================
export {
  createEvidencePack,
  isEvidenceFresh,
  isEvidenceExpired,
  calculateConfidence,
  getConfidenceLevel,
  validateEvidencePack,
  checkEvidenceQuality,
  EVIDENCE_THRESHOLDS,
  type EvidencePack,
  type NewEvidencePack,
  type DataWatermark,
  type RowCounts,
  type QualityScores,
  type ReconciliationDiff,
} from './evidenceContract';

// ============================================
// Re-export SSOT Violation Detector
// ============================================
export {
  SSOT_VIOLATION_PATTERNS,
  HOOK_FILE_PATTERNS,
  EXEMPT_FILES,
  checkFileForViolations,
  formatViolationReport,
  hasViolations,
  type ViolationReport,
} from '../ssot-violation-detector';
