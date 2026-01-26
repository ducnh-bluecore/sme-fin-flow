/**
 * CROSS-MODULE DATA TYPES
 * 
 * Shared types for cross-module data flows with fallback chain support.
 * Part of the Cross-Module Data Flywheel implementation.
 */

/**
 * Confidence level for cross-module data
 * - LOCKED: Verified, cross-module data (highest confidence)
 * - OBSERVED: Module-internal actual data
 * - ESTIMATED: Fallback/benchmark data (lowest confidence)
 */
export type ConfidenceLevel = 'LOCKED' | 'OBSERVED' | 'ESTIMATED';

/**
 * Source modules in the system
 */
export type SourceModule = 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER';

/**
 * Metadata for cross-module data transparency
 */
export interface CrossModuleMetadata {
  confidenceLevel: ConfidenceLevel;
  dataSource: string;
  isFromCrossModule: boolean;
  sourceModule?: SourceModule;
  timestamp: string;
}

/**
 * Wrapper interface for all cross-module data
 * Ensures transparency about data origin and confidence
 */
export interface CrossModuleData<T> {
  data: T;
  meta: CrossModuleMetadata;
}

/**
 * Cost data from FDP for MDP Profit ROAS calculation
 */
export interface FDPCostData {
  cogsPercent: number;
  feePercent: number;
  cac?: number;
}

/**
 * Revenue forecast from CDP for FDP
 */
export interface CDPRevenueForcast {
  projectedRevenue: number;
  projectedOrders: number;
  projectedAov: number;
  year: number;
  month: number;
}

/**
 * Cohort CAC data from MDP for CDP
 */
export interface CohortCACData {
  cohortMonth: string;
  acquisitionChannel: string;
  totalSpend: number;
  newCustomers: number;
  cacPerCustomer: number;
}

/**
 * Cross-domain variance alert
 */
export interface CrossDomainVarianceAlert {
  id: string;
  alertType: 'REVENUE_VARIANCE' | 'COST_VARIANCE' | 'LTV_VARIANCE';
  sourceModule: SourceModule;
  targetModule: SourceModule;
  metricCode: string;
  expectedValue: number;
  actualValue: number;
  variancePercent: number;
  varianceAmount: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  assignedTo?: string;
  evidenceSnapshot?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Helper to create CrossModuleData with defaults
 */
export function createCrossModuleData<T>(
  data: T,
  confidenceLevel: ConfidenceLevel,
  dataSource: string,
  isFromCrossModule: boolean = false,
  sourceModule?: SourceModule
): CrossModuleData<T> {
  return {
    data,
    meta: {
      confidenceLevel,
      dataSource,
      isFromCrossModule,
      sourceModule,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Get confidence score from level (for sorting/comparison)
 */
export function getConfidenceScore(level: ConfidenceLevel): number {
  switch (level) {
    case 'LOCKED':
      return 100;
    case 'OBSERVED':
      return 75;
    case 'ESTIMATED':
      return 40;
    default:
      return 0;
  }
}

/**
 * Get Vietnamese label for confidence level
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'LOCKED':
      return 'Đã xác thực';
    case 'OBSERVED':
      return 'Từ dữ liệu thực';
    case 'ESTIMATED':
      return 'Ước tính';
    default:
      return 'Không xác định';
  }
}
