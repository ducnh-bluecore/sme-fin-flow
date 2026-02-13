// ============================================================
// Growth Simulator v2 — Types & Constants
// ============================================================

// ---- Default Parameters (Fashion v1) ----
export const DEFAULTS = {
  DOC_HERO: 60,          // days
  DOC_NON_HERO: 30,      // days
  SAFETY_STOCK_PCT: 15,  // %
  LEAD_TIME_BUFFER: 14,  // days
  HERO_REVENUE_TARGET_SHARE: 0.6,
  OVERSTOCK_THRESHOLD: 1.5,
  SLOW_MOVER_VELOCITY: 0.1,  // units/day
  HERO_MARGIN_THRESHOLD: 40, // %
  FAST_MOVER_PERCENTILE: 70,
  SLOW_MOVER_PERCENTILE: 30,
} as const;

// ---- Data Interfaces (from DB) ----
export interface SKUSummary {
  sku: string | null;
  product_name: string | null;
  category: string | null;
  total_revenue: number | null;
  total_quantity: number | null;
  total_cogs: number | null;
  gross_profit: number | null;
  margin_percent: number | null;
  avg_unit_price: number | null;
  avg_unit_cogs: number | null;
}

export interface FamilyCode {
  id: string;
  fc_code: string;
  fc_name: string;
  is_core_hero: boolean;
}

// ---- Simulation Input ----
export interface SimulationParams {
  growthPct: number;
  horizonMonths: number;
  docHero: number;
  docNonHero: number;
  safetyStockPct: number;
  cashCap: number;       // 0 = no cap
  capacityCap: number;   // 0 = no cap
  overstockThreshold: number;
}

// ---- Segment Classification ----
export type MoverSegment = 'fast' | 'normal' | 'slow';

// ---- Per-FC Simulation Result ----
export interface SimResult {
  fcCode: string;
  fcName: string;
  fcId: string | null;
  isHeroManual: boolean;
  isHeroCalculated: boolean;
  isHero: boolean; // manual OR calculated
  heroScore: number;
  segment: MoverSegment;
  // Demand & Velocity
  velocity: number;       // avg_daily_sales
  velocity7d: number;    // short-term velocity
  velocityTrend: string | null;
  forecastDemand: number;
  // Inventory
  onHandQty: number;
  docCurrent: number;     // days of cover with current stock
  docAfterProduction: number;
  // Production
  productionQty: number;
  cashRequired: number;
  // Financials
  currentRevenue: number;
  currentQty: number;
  projectedRevenue: number;
  marginPct: number;
  projectedMargin: number;
  growthContributionPct: number;
  // Risk
  riskFlags: RiskFlag[];
  reason: string;
}

// ---- Risk ----
export type RiskType = 'stockout' | 'overstock' | 'concentration' | 'slow_mover_high_stock';

export interface RiskFlag {
  type: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detail: string;
  suggestion: string;
}

// ---- Hero Gap ----
export interface HeroGap {
  incrementalRevenueNeeded: number;
  heroCapacity: number;
  heroNeed: number;
  gap: number;
  heroCountGap: number;
  recoverabilityPct: number;
  recoverabilityMessage: string;
}

// ---- Before / After comparison ----
export interface BeforeAfterMetrics {
  revenueProjected: [number, number];
  marginPct: [number, number];
  heroRevenueShare: [number, number];
  stockoutRiskCount: [number, number];
  avgDOC: [number, number];
}

// ---- Top-level summary ----
export interface SimSummary {
  // KPI strip
  totalProductionUnits: number;
  totalCashRequired: number;
  heroCount: number;
  heroRevenueSharePct: number;
  riskScore: number; // 0-100
  // Hero Gap
  heroGap: HeroGap;
  // Before / After
  beforeAfter: BeforeAfterMetrics;
  // Revenue
  currentRevenue: number;
  targetRevenue: number;
  gapRevenue: number;
  avgMarginPct: number;
  totalProjectedMargin: number;
  // Details
  details: SimResult[];
  // Top risks
  topRisks: RiskFlag[];
  // Hero candidates (non-hero, sorted by heroScore desc)
  heroCandidates: SimResult[];
}

// ---- Growth Expansion Map Types ----
export interface CategoryShape {
  category: string;
  fcCount: number;
  totalVelocity: number;
  avgVelocity: number;
  momentumPct: number;
  avgMarginPct: number;
  avgDOC: number;
  overstockRatio: number;
  revenueShare: number;
  efficiencyScore: number;
  efficiencyLabel: 'CAO' | 'TRUNG BÌNH' | 'THẤP';
  direction: 'expand' | 'hold' | 'avoid';
  reason: string;
}

export interface SizeShift {
  size: string;
  totalVelocity: number;
  velocityShare: number;
  deltaPct: number;
  direction: 'tăng' | 'ổn định' | 'giảm';
}

export interface PriceBandShape {
  band: string;
  fcCount: number;
  avgVelocity: number;
  avgMarginPct: number;
  momentumPct: number;
  efficiencyLabel: 'CAO' | 'TRUNG BÌNH' | 'THẤP';
}

export interface GrowthShape {
  expandCategories: CategoryShape[];
  avoidCategories: CategoryShape[];
  sizeShifts: SizeShift[];
  priceBands: PriceBandShape[];
  gravitySummary: string;
  shapeStatement: string;
}
