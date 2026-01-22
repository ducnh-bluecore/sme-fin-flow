// Product Review & Scoping Hub Types
// Spec: PRODUCT_REVIEW_HUB.md

export type SystemType = 'FDP' | 'MDP' | 'Control Tower' | 'CDP';
export type DecisionStatus = 'BUILD' | 'HOLD' | 'DROP' | 'PENDING';
export type TargetVersion = 'v1' | 'v2' | 'v3';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'; // P3 added per spec
export type Persona = 'CEO' | 'CFO' | 'Ops' | 'Growth' | 'CRM' | 'Finance Director' | 'Accounting Lead' | 'Marketing Analyst' | 'Product Manager';
export type ReviewedStatus = 'not_reviewed' | 'reviewed' | 'needs_changes';

export interface DataEntities {
  entities: string[];
  grain: string | null;
}

export interface RequiredTables {
  serve_tables: string[];
  dims: string[];
}

export interface Dependencies {
  pipelines: string[];
  upstream: string[];
}

export interface FeatureDecision {
  id: string;
  tenant_id: string;
  system: SystemType;
  route: string;
  feature_name: string;
  status: DecisionStatus;
  target_version: TargetVersion | null;
  priority: Priority | null;
  persona: Persona | null;
  data_entities: DataEntities;
  required_tables: RequiredTables;
  dependencies: Dependencies;
  rationale: string | null;
  owner: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageReview {
  id: string;
  tenant_id: string;
  system: SystemType;
  route: string;
  reviewed_status: ReviewedStatus;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface SystemRouteConfig {
  route: string;
  feature_name: string;
  version: TargetVersion;  // v1, v2, v3
  is_live: boolean;
  description?: string;
  category?: string;
}

export interface SystemInfo {
  id: SystemType;
  name: string;
  tagline: string;
  description: string;
  personas: string[];
}

// System metadata per spec
export const SYSTEM_INFO: Record<SystemType, SystemInfo> = {
  'FDP': {
    id: 'FDP',
    name: 'Finance Data Platform',
    tagline: 'Finance truth & reconciliation',
    description: 'Single source of truth for financial data, serving CEO/CFO with real-time decisions',
    personas: ['CFO', 'Finance Director', 'Accounting Lead'],
  },
  'Control Tower': {
    id: 'Control Tower',
    name: 'Control Tower',
    tagline: 'Alerts & operational risk',
    description: 'Real-time alert and action engine for cross-domain operational governance',
    personas: ['Ops Lead', 'Finance Controller', 'CEO'],
  },
  'MDP': {
    id: 'MDP',
    name: 'Marketing Data Platform',
    tagline: 'Marketing performance visibility',
    description: 'Profit-first marketing analytics with cash impact attribution',
    personas: ['Growth Lead', 'Marketing Analyst', 'CMO'],
  },
  'CDP': {
    id: 'CDP',
    name: 'Customer Data Platform',
    tagline: 'Customer understanding (finance-aligned)',
    description: 'Customer 360 with financial-grade data quality and LTV prediction',
    personas: ['Product Manager', 'CRM Manager', 'Growth Analyst'],
  },
};

// Routes per spec - grouped by system with version metadata
export const SYSTEM_ROUTES: Record<SystemType, SystemRouteConfig[]> = {
  'FDP': [
    // v1 - Foundation (LIVE)
    { route: '/dashboard', feature_name: 'Executive Overview', version: 'v1', is_live: true, category: 'Core' },
    { route: '/financial-reports', feature_name: 'Financial Statement', version: 'v1', is_live: true, category: 'Reporting' },
    { route: '/pl-report', feature_name: 'Financial Drilldown', version: 'v1', is_live: true, category: 'Reporting' },
    { route: '/unit-economics', feature_name: 'SKU Profitability', version: 'v1', is_live: true, category: 'Analytics' },
    { route: '/reconciliation', feature_name: 'Reconciliation', version: 'v1', is_live: true, category: 'Core' },
    { route: '/ar-operations', feature_name: 'AR Operations', version: 'v1', is_live: true, category: 'Core' },
    { route: '/bills', feature_name: 'AP Operations', version: 'v1', is_live: true, category: 'Core' },
    { route: '/cash-forecast', feature_name: 'Cash Forecast', version: 'v1', is_live: true, category: 'Treasury' },
    { route: '/working-capital-hub', feature_name: 'Working Capital Hub', version: 'v1', is_live: true, category: 'Treasury' },
    { route: '/channel-analytics', feature_name: 'Channel Analytics', version: 'v1', is_live: true, category: 'Analytics' },
    
    // v2 - Expansion (COMING SOON)
    { route: '/fdp/cash-settlements', feature_name: 'Cash Settlements', version: 'v2', is_live: false, category: 'Treasury' },
    { route: '/fdp/refunds-chargebacks', feature_name: 'Refunds & Chargebacks', version: 'v2', is_live: false, category: 'Core' },
    { route: '/fdp/period-close', feature_name: 'Period Close', version: 'v2', is_live: false, category: 'Accounting' },
    { route: '/credit-debit-notes', feature_name: 'Credit/Debit Notes', version: 'v2', is_live: true, category: 'Core' },
    { route: '/tax-compliance', feature_name: 'Tax Compliance', version: 'v2', is_live: true, category: 'Compliance' },
    { route: '/covenant-tracking', feature_name: 'Covenant Tracking', version: 'v2', is_live: true, category: 'Treasury' },
    
    // v3 - Advanced (COMING SOON)
    { route: '/fdp/cash-runway', feature_name: 'Cash Runway', version: 'v3', is_live: false, category: 'Treasury' },
    { route: '/scenario-hub', feature_name: 'Scenario Comparison', version: 'v3', is_live: true, category: 'Strategy' },
    { route: '/board-reports', feature_name: 'Board Views', version: 'v3', is_live: true, category: 'Reporting' },
    { route: '/rolling-forecast', feature_name: 'Rolling Forecast', version: 'v3', is_live: true, category: 'Strategy' },
    
    // Data & Admin
    { route: '/data-hub', feature_name: 'Data Hub', version: 'v1', is_live: true, category: 'Data' },
    { route: '/data-warehouse', feature_name: 'Data Warehouse', version: 'v1', is_live: true, category: 'Data' },
    { route: '/etl-rules', feature_name: 'ETL Rules', version: 'v2', is_live: true, category: 'Data' },
    { route: '/chart-of-accounts', feature_name: 'Chart of Accounts', version: 'v1', is_live: true, category: 'Config' },
    { route: '/bank-connections', feature_name: 'Bank Connections', version: 'v1', is_live: true, category: 'Config' },
  ],
  
  'Control Tower': [
    // v1 - Foundation (LIVE)
    { route: '/control-tower/ceo', feature_name: 'Command Center', version: 'v1', is_live: true, category: 'Command' },
    { route: '/control-tower/coo', feature_name: 'COO Operations View', version: 'v1', is_live: true, category: 'Command' },
    { route: '/control-tower/alerts', feature_name: 'Alert Management', version: 'v1', is_live: true, category: 'Alerts' },
    { route: '/control-tower/decisions', feature_name: 'Decision Cards', version: 'v1', is_live: true, category: 'Governance' },
    { route: '/control-tower/situation', feature_name: 'Situation Room', version: 'v1', is_live: true, category: 'Command' },
    
    // v2 - Expansion (COMING SOON)
    { route: '/control-tower/risk-appetite', feature_name: 'Risk Appetite', version: 'v2', is_live: false, category: 'Risk' },
    { route: '/control-tower/sla', feature_name: 'SLA Management', version: 'v2', is_live: false, category: 'Governance' },
    { route: '/control-tower/ownership', feature_name: 'Ownership Matrix', version: 'v2', is_live: false, category: 'Governance' },
    { route: '/control-tower/kpi-rules', feature_name: 'KPI Rules', version: 'v2', is_live: true, category: 'Config' },
    { route: '/control-tower/team', feature_name: 'Team Management', version: 'v2', is_live: true, category: 'Config' },
    
    // v3 - Advanced (COMING SOON)
    { route: '/control-tower/incidents', feature_name: 'Incident History', version: 'v3', is_live: false, category: 'Governance' },
    { route: '/control-tower/playbooks', feature_name: 'Playbooks', version: 'v3', is_live: false, category: 'Automation' },
    { route: '/control-tower/cross-system', feature_name: 'Cross-System View', version: 'v3', is_live: false, category: 'Intelligence' },
    { route: '/control-tower/board', feature_name: 'Board View', version: 'v3', is_live: true, category: 'Executive' },
  ],
  
  'MDP': [
    // v1 - Foundation (LIVE)
    { route: '/mdp/ceo', feature_name: 'CEO Decision View', version: 'v1', is_live: true, category: 'Executive' },
    { route: '/mdp/channels', feature_name: 'Channel Overview', version: 'v1', is_live: true, category: 'Operations' },
    { route: '/mdp/campaigns', feature_name: 'Campaign Performance', version: 'v1', is_live: true, category: 'Operations' },
    { route: '/mdp/profit', feature_name: 'Profit Attribution', version: 'v1', is_live: true, category: 'Financial' },
    { route: '/mdp/cash-impact', feature_name: 'Cash Impact', version: 'v1', is_live: true, category: 'Financial' },
    
    // v2 - Expansion (COMING SOON)
    { route: '/mdp/budget-optimizer', feature_name: 'Spend & Budget', version: 'v2', is_live: true, category: 'Optimization' },
    { route: '/mdp/roi-analytics', feature_name: 'ROI Analysis', version: 'v2', is_live: true, category: 'Analytics' },
    { route: '/mdp/risks', feature_name: 'Risk Alerts', version: 'v2', is_live: true, category: 'Risk' },
    { route: '/mdp/funnel', feature_name: 'Funnel Analysis', version: 'v2', is_live: true, category: 'Analytics' },
    { route: '/mdp/ab-testing', feature_name: 'A/B Testing', version: 'v2', is_live: true, category: 'Analytics' },
    
    // v3 - Advanced (COMING SOON)
    { route: '/mdp/attribution', feature_name: 'Multi-Touch Attribution', version: 'v3', is_live: false, category: 'Analytics' },
    { route: '/mdp/margin-view', feature_name: 'Margin View', version: 'v3', is_live: false, category: 'Financial' },
    { route: '/mdp/customer-ltv', feature_name: 'Customer LTV', version: 'v3', is_live: true, category: 'Analytics' },
    { route: '/mdp/scenario-planner', feature_name: 'Scenario Planner', version: 'v3', is_live: true, category: 'Strategy' },
    
    // Data
    { route: '/mdp/data-sources', feature_name: 'Data Sources', version: 'v1', is_live: true, category: 'Data' },
    { route: '/mdp/data-readiness', feature_name: 'Data Readiness', version: 'v1', is_live: true, category: 'Data' },
  ],
  
  'CDP': [
    // v1 - Foundation (COMING SOON - all CDP)
    { route: '/cdp/customer-overview', feature_name: 'Customer Overview', version: 'v1', is_live: false, category: 'Core' },
    { route: '/cdp/cohorts', feature_name: 'Cohorts', version: 'v1', is_live: false, category: 'Analytics' },
    
    // v2 - Expansion
    { route: '/cdp/customer-profitability', feature_name: 'Customer Profitability', version: 'v2', is_live: false, category: 'Financial' },
    { route: '/cdp/segments', feature_name: 'Segments', version: 'v2', is_live: false, category: 'Analytics' },
    { route: '/cdp/identity', feature_name: 'Identity Resolution', version: 'v2', is_live: false, category: 'Data' },
    
    // v3 - Advanced
    { route: '/cdp/ltv', feature_name: 'LTV (Guarded)', version: 'v3', is_live: false, category: 'Analytics' },
    { route: '/cdp/retention', feature_name: 'Retention & Expansion', version: 'v3', is_live: false, category: 'Analytics' },
    { route: '/cdp/journey', feature_name: 'Customer Journey', version: 'v3', is_live: false, category: 'Analytics' },
    { route: '/cdp/churn', feature_name: 'Churn Prediction', version: 'v3', is_live: false, category: 'Analytics' },
    { route: '/cdp/enrichment', feature_name: 'Data Enrichment', version: 'v3', is_live: false, category: 'Data' },
  ],
};

// Data entities options
export const ENTITY_OPTIONS = [
  'order',
  'customer',
  'sku',
  'channel',
  'campaign',
  'invoice',
  'payment',
  'product',
  'vendor',
  'account',
  'transaction',
  'inventory',
  'employee',
  'budget',
  'forecast',
  'ad_spend',
  'conversion',
  'return',
  'refund',
];

// Grain options
export const GRAIN_OPTIONS = [
  'daily',
  'hourly',
  'weekly',
  'monthly',
  'order-level',
  'customer-level',
  'sku-level',
  'campaign-level',
  'transaction-level',
  'channel-level',
  'invoice-level',
  'daily by channel',
  'daily by sku',
  'daily by campaign',
];

// Priority definitions per spec
export const PRIORITY_INFO: Record<Priority, { label: string; description: string; color: string }> = {
  'P0': { label: 'P0 Critical', description: 'Phải có trong release', color: 'red' },
  'P1': { label: 'P1 High', description: 'Rất quan trọng', color: 'orange' },
  'P2': { label: 'P2 Medium', description: 'Quan trọng nhưng có thể delay', color: 'yellow' },
  'P3': { label: 'P3 Low', description: 'Nice to have', color: 'slate' },
};

// Status definitions per spec
export const STATUS_INFO: Record<DecisionStatus, { label: string; description: string; color: string }> = {
  'BUILD': { label: 'BUILD', description: 'Sẽ xây dựng trong phiên bản được chỉ định', color: 'emerald' },
  'HOLD': { label: 'HOLD', description: 'Tạm dừng, chờ điều kiện hoặc ưu tiên', color: 'amber' },
  'DROP': { label: 'DROP', description: 'Không xây dựng, loại khỏi roadmap', color: 'red' },
  'PENDING': { label: 'PENDING', description: 'Chưa có quyết định', color: 'slate' },
};

// Version definitions per spec
export const VERSION_INFO: Record<TargetVersion, { label: string; description: string }> = {
  'v1': { label: 'v1 Foundation', description: 'MVP, tính năng cơ bản' },
  'v2': { label: 'v2 Expansion', description: 'Mở rộng tính năng' },
  'v3': { label: 'v3 Advanced', description: 'Tính năng nâng cao, tối ưu' },
};
