// Product Review Hub Types

export type SystemType = 'FDP' | 'MDP' | 'Control Tower' | 'CDP';
export type DecisionStatus = 'BUILD' | 'HOLD' | 'DROP' | 'PENDING';
export type TargetVersion = 'v1' | 'v2' | 'v3';
export type Priority = 'P0' | 'P1' | 'P2';
export type Persona = 'CEO' | 'CFO' | 'Ops' | 'Growth' | 'CRM';
export type ReviewedStatus = 'pending' | 'reviewed' | 'blocked';

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
  is_live: boolean;
  description?: string;
}

// Predefined routes for each system
export const SYSTEM_ROUTES: Record<SystemType, SystemRouteConfig[]> = {
  'FDP': [
    { route: '/cfo-dashboard', feature_name: 'CFO Dashboard', is_live: true },
    { route: '/cash-flow', feature_name: 'Cash Flow Management', is_live: true },
    { route: '/receivables', feature_name: 'Receivables (AR)', is_live: true },
    { route: '/payables', feature_name: 'Payables (AP)', is_live: true },
    { route: '/inventory', feature_name: 'Inventory Management', is_live: true },
    { route: '/general-ledger', feature_name: 'General Ledger', is_live: true },
    { route: '/financial-reports', feature_name: 'Financial Reports', is_live: true },
    { route: '/budgets', feature_name: 'Budget Management', is_live: false },
    { route: '/forecasting', feature_name: 'Financial Forecasting', is_live: false },
    { route: '/treasury', feature_name: 'Treasury Management', is_live: false },
    { route: '/compliance', feature_name: 'Compliance & Audit', is_live: false },
  ],
  'MDP': [
    { route: '/mdp/dashboard', feature_name: 'MDP Overview', is_live: true },
    { route: '/mdp/campaigns', feature_name: 'Campaign Management', is_live: true },
    { route: '/mdp/channel-performance', feature_name: 'Channel Performance', is_live: true },
    { route: '/mdp/profit-roas', feature_name: 'Profit ROAS Analysis', is_live: false },
    { route: '/mdp/cash-conversion', feature_name: 'Cash Conversion Cycle', is_live: false },
    { route: '/mdp/marketing-decisions', feature_name: 'Marketing Decision Cards', is_live: false },
    { route: '/mdp/attribution', feature_name: 'Attribution Model', is_live: false },
    { route: '/mdp/budget-allocation', feature_name: 'Budget Allocation', is_live: false },
  ],
  'Control Tower': [
    { route: '/control-tower', feature_name: 'Control Tower Hub', is_live: true },
    { route: '/control-tower/alerts', feature_name: 'Alert Management', is_live: true },
    { route: '/control-tower/decisions', feature_name: 'Decision Cards', is_live: true },
    { route: '/control-tower/escalation', feature_name: 'Escalation Rules', is_live: false },
    { route: '/control-tower/cross-domain', feature_name: 'Cross-Domain Intelligence', is_live: false },
    { route: '/control-tower/automation', feature_name: 'Action Automation', is_live: false },
    { route: '/control-tower/digest', feature_name: 'Alert Digest', is_live: false },
  ],
  'CDP': [
    { route: '/cdp/customers', feature_name: 'Customer 360', is_live: false },
    { route: '/cdp/segments', feature_name: 'Segmentation', is_live: false },
    { route: '/cdp/journey', feature_name: 'Customer Journey', is_live: false },
    { route: '/cdp/ltv', feature_name: 'LTV Prediction', is_live: false },
    { route: '/cdp/churn', feature_name: 'Churn Prediction', is_live: false },
    { route: '/cdp/cohorts', feature_name: 'Cohort Analysis', is_live: false },
  ],
};

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
];

export const GRAIN_OPTIONS = [
  'daily',
  'hourly',
  'order-level',
  'customer-level',
  'sku-level',
  'campaign-level',
  'transaction-level',
];
