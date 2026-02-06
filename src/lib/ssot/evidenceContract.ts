/**
 * ============================================
 * EVIDENCE CONTRACT
 * ============================================
 * 
 * Every alert and decision MUST be linked to an evidence pack.
 * Evidence packs provide auditability by recording:
 * - Data freshness (watermarks)
 * - Data completeness (row counts)
 * - Data quality scores
 * - Reconciliation status
 * 
 * @see docs/SSOT_ENFORCEMENT_SPEC.md
 */

/**
 * Watermark timestamps for key data sources
 */
export interface DataWatermark {
  orders_latest: string;
  payments_latest: string;
  ad_spend_latest: string;
  customers_latest?: string;
  inventory_latest?: string;
}

/**
 * Row counts for key entities
 */
export interface RowCounts {
  orders: number;
  customers: number;
  payments: number;
  products?: number;
  campaigns?: number;
}

/**
 * Data quality scores
 */
export interface QualityScores {
  /** Percentage of non-null required fields (0-100) */
  completeness: number;
  /** Hours since last data sync */
  freshness_hours: number;
  /** Percentage of null values in key fields (0-100) */
  null_rate_percent: number;
  /** Percentage of duplicate records (0-100) */
  duplicate_rate_percent: number;
}

/**
 * Reconciliation difference between sources
 */
export interface ReconciliationDiff {
  /** Source name (e.g., 'shopee', 'haravan', 'bank') */
  source: string;
  /** Expected value from source */
  expected: number;
  /** Actual value in system */
  actual: number;
  /** Difference as percentage */
  diff_percent: number;
}

/**
 * Evidence Pack - Proof of data state at decision time
 * 
 * Every alert_instance and decision_card MUST reference an evidence_pack_id.
 * This enables:
 * - Auditing: "What data was this decision based on?"
 * - Debugging: "Why did the alert fire incorrectly?"
 * - Trust: "How confident can we be in this metric?"
 */
export interface EvidencePack {
  id: string;
  tenant_id: string;
  /** Timestamp when evidence was collected */
  as_of: string;
  /** Data freshness watermarks */
  watermark: DataWatermark;
  /** Row counts for validation */
  row_counts: RowCounts;
  /** Data quality assessment */
  quality_scores: QualityScores;
  /** Cross-source reconciliation (optional) */
  reconciliation_diffs?: ReconciliationDiff[];
  created_at: string;
  /** TTL: 30 days from creation */
  expires_at: string;
}

/**
 * Evidence pack without ID (for creation)
 */
export type NewEvidencePack = Omit<EvidencePack, 'id'>;

/**
 * Create an evidence pack for a metric calculation
 * 
 * @param tenantId - The tenant UUID
 * @param watermark - Data freshness timestamps
 * @param rowCounts - Entity counts for validation
 * @param qualityScores - Data quality assessment
 * @param reconciliationDiffs - Optional cross-source validation
 * @returns Evidence pack ready for insertion
 */
export function createEvidencePack(
  tenantId: string,
  watermark: DataWatermark,
  rowCounts: RowCounts,
  qualityScores: QualityScores,
  reconciliationDiffs?: ReconciliationDiff[]
): NewEvidencePack {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  return {
    tenant_id: tenantId,
    as_of: now.toISOString(),
    watermark,
    row_counts: rowCounts,
    quality_scores: qualityScores,
    reconciliation_diffs: reconciliationDiffs,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * Validate evidence is still fresh
 * 
 * @param evidence - The evidence pack to check
 * @param maxHours - Maximum acceptable freshness in hours
 * @returns true if evidence is fresh enough
 */
export function isEvidenceFresh(evidence: EvidencePack, maxHours = 24): boolean {
  return evidence.quality_scores.freshness_hours <= maxHours;
}

/**
 * Check if evidence has expired
 * 
 * @param evidence - The evidence pack to check
 * @returns true if evidence has passed its TTL
 */
export function isEvidenceExpired(evidence: EvidencePack): boolean {
  return new Date(evidence.expires_at) < new Date();
}

/**
 * Calculate overall confidence score from quality metrics
 * 
 * @param qualityScores - The quality scores to evaluate
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(qualityScores: QualityScores): number {
  const weights = {
    completeness: 0.3,
    freshness: 0.3,
    nullRate: 0.2,
    duplicateRate: 0.2,
  };
  
  // Normalize each metric to 0-1 scale (higher = better)
  const completenessScore = qualityScores.completeness / 100;
  const freshnessScore = Math.max(0, 1 - (qualityScores.freshness_hours / 48)); // 48h = 0
  const nullScore = 1 - (qualityScores.null_rate_percent / 100);
  const duplicateScore = 1 - (qualityScores.duplicate_rate_percent / 100);
  
  return (
    weights.completeness * completenessScore +
    weights.freshness * freshnessScore +
    weights.nullRate * nullScore +
    weights.duplicateRate * duplicateScore
  );
}

/**
 * Get confidence level label from score
 * 
 * @param confidence - Score between 0 and 1
 * @returns Human-readable confidence level
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'critical' {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  if (confidence >= 0.5) return 'low';
  return 'critical';
}

/**
 * Validate evidence pack structure
 * 
 * @param evidence - The evidence to validate
 * @returns Validation result with any errors
 */
export function validateEvidencePack(evidence: Partial<EvidencePack>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!evidence.tenant_id) {
    errors.push('tenant_id is required');
  }
  
  if (!evidence.as_of) {
    errors.push('as_of timestamp is required');
  }
  
  if (!evidence.watermark) {
    errors.push('watermark is required');
  } else {
    if (!evidence.watermark.orders_latest) {
      errors.push('watermark.orders_latest is required');
    }
  }
  
  if (!evidence.row_counts) {
    errors.push('row_counts is required');
  }
  
  if (!evidence.quality_scores) {
    errors.push('quality_scores is required');
  } else {
    if (evidence.quality_scores.completeness < 0 || evidence.quality_scores.completeness > 100) {
      errors.push('quality_scores.completeness must be between 0 and 100');
    }
    if (evidence.quality_scores.freshness_hours < 0) {
      errors.push('quality_scores.freshness_hours must be non-negative');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Evidence quality thresholds for alerting
 */
export const EVIDENCE_THRESHOLDS = {
  /** Minimum completeness % to proceed with calculation */
  MIN_COMPLETENESS: 80,
  /** Maximum freshness hours before warning */
  MAX_FRESHNESS_HOURS: 24,
  /** Maximum null rate % before warning */
  MAX_NULL_RATE: 10,
  /** Maximum duplicate rate % before warning */
  MAX_DUPLICATE_RATE: 5,
  /** Maximum reconciliation diff % before warning */
  MAX_RECONCILIATION_DIFF: 5,
} as const;

/**
 * Check if evidence meets quality thresholds
 * 
 * @param evidence - The evidence pack to check
 * @returns Object with pass/fail status and any warnings
 */
export function checkEvidenceQuality(evidence: EvidencePack): {
  pass: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const { quality_scores, reconciliation_diffs } = evidence;
  
  if (quality_scores.completeness < EVIDENCE_THRESHOLDS.MIN_COMPLETENESS) {
    warnings.push(`Completeness ${quality_scores.completeness}% below threshold ${EVIDENCE_THRESHOLDS.MIN_COMPLETENESS}%`);
  }
  
  if (quality_scores.freshness_hours > EVIDENCE_THRESHOLDS.MAX_FRESHNESS_HOURS) {
    warnings.push(`Data is ${quality_scores.freshness_hours}h old, exceeds ${EVIDENCE_THRESHOLDS.MAX_FRESHNESS_HOURS}h threshold`);
  }
  
  if (quality_scores.null_rate_percent > EVIDENCE_THRESHOLDS.MAX_NULL_RATE) {
    warnings.push(`Null rate ${quality_scores.null_rate_percent}% exceeds ${EVIDENCE_THRESHOLDS.MAX_NULL_RATE}% threshold`);
  }
  
  if (quality_scores.duplicate_rate_percent > EVIDENCE_THRESHOLDS.MAX_DUPLICATE_RATE) {
    warnings.push(`Duplicate rate ${quality_scores.duplicate_rate_percent}% exceeds ${EVIDENCE_THRESHOLDS.MAX_DUPLICATE_RATE}% threshold`);
  }
  
  if (reconciliation_diffs) {
    for (const diff of reconciliation_diffs) {
      if (Math.abs(diff.diff_percent) > EVIDENCE_THRESHOLDS.MAX_RECONCILIATION_DIFF) {
        warnings.push(`${diff.source} reconciliation diff ${diff.diff_percent.toFixed(2)}% exceeds ${EVIDENCE_THRESHOLDS.MAX_RECONCILIATION_DIFF}% threshold`);
      }
    }
  }
  
  return {
    pass: warnings.length === 0,
    warnings,
  };
}
