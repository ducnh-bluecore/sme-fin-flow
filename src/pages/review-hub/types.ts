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
  category?: string;
}

// ACTUAL routes from the codebase - reflects real system state
export const SYSTEM_ROUTES: Record<SystemType, SystemRouteConfig[]> = {
  'FDP': [
    // Core Operations
    { route: '/dashboard', feature_name: 'CFO Dashboard', is_live: true, category: 'Core' },
    { route: '/ar-operations', feature_name: 'AR Operations', is_live: true, category: 'Core' },
    { route: '/reconciliation', feature_name: 'Reconciliation Hub', is_live: true, category: 'Core' },
    { route: '/exceptions', feature_name: 'Exceptions Management', is_live: true, category: 'Core' },
    { route: '/bills', feature_name: 'Bills & Payables', is_live: true, category: 'Core' },
    { route: '/credit-debit-notes', feature_name: 'Credit/Debit Notes', is_live: true, category: 'Core' },
    { route: '/bank-connections', feature_name: 'Bank Connections', is_live: true, category: 'Core' },
    { route: '/chart-of-accounts', feature_name: 'Chart of Accounts', is_live: true, category: 'Core' },
    
    // Invoicing
    { route: '/invoice/create', feature_name: 'Create Invoice', is_live: true, category: 'Invoicing' },
    { route: '/invoice/tracking', feature_name: 'Invoice Tracking', is_live: true, category: 'Invoicing' },
    
    // Financial Reporting
    { route: '/financial-reports', feature_name: 'Financial Reports', is_live: true, category: 'Reporting' },
    { route: '/pl-report', feature_name: 'P&L Report', is_live: true, category: 'Reporting' },
    { route: '/board-reports', feature_name: 'Board Reports', is_live: true, category: 'Reporting' },
    { route: '/expenses', feature_name: 'Expenses', is_live: true, category: 'Reporting' },
    { route: '/revenue', feature_name: 'Revenue', is_live: true, category: 'Reporting' },
    { route: '/tax-compliance', feature_name: 'Tax Compliance', is_live: true, category: 'Reporting' },
    
    // Cash & Treasury
    { route: '/cash-forecast', feature_name: 'Cash Forecast', is_live: true, category: 'Treasury' },
    { route: '/cash-flow-direct', feature_name: 'Cash Flow Direct', is_live: true, category: 'Treasury' },
    { route: '/working-capital-hub', feature_name: 'Working Capital Hub', is_live: true, category: 'Treasury' },
    { route: '/covenant-tracking', feature_name: 'Covenant Tracking', is_live: true, category: 'Treasury' },
    
    // Analytics & Strategy
    { route: '/unit-economics', feature_name: 'Unit Economics', is_live: true, category: 'Analytics' },
    { route: '/channel-analytics', feature_name: 'Channel Analytics', is_live: true, category: 'Analytics' },
    { route: '/performance-analysis', feature_name: 'Performance Analysis', is_live: true, category: 'Analytics' },
    { route: '/rolling-forecast', feature_name: 'Rolling Forecast', is_live: true, category: 'Analytics' },
    
    // Strategic Planning
    { route: '/scenario-hub', feature_name: 'Scenario Hub', is_live: true, category: 'Strategy' },
    { route: '/executive-summary', feature_name: 'Executive Summary', is_live: true, category: 'Strategy' },
    { route: '/capital-allocation', feature_name: 'Capital Allocation', is_live: true, category: 'Strategy' },
    { route: '/decision-support', feature_name: 'Decision Support', is_live: true, category: 'Strategy' },
    { route: '/risk-dashboard', feature_name: 'Risk Dashboard', is_live: true, category: 'Strategy' },
    { route: '/decision-center', feature_name: 'Decision Center', is_live: true, category: 'Strategy' },
    { route: '/strategic-initiatives', feature_name: 'Strategic Initiatives', is_live: true, category: 'Strategy' },
    
    // Retail CFO
    { route: '/inventory-aging', feature_name: 'Inventory Aging', is_live: true, category: 'Retail CFO' },
    { route: '/promotion-roi', feature_name: 'Promotion ROI', is_live: true, category: 'Retail CFO' },
    { route: '/supplier-payments', feature_name: 'Supplier Payments', is_live: true, category: 'Retail CFO' },
    
    // Data Management
    { route: '/data-hub', feature_name: 'Data Hub', is_live: true, category: 'Data' },
    { route: '/data-warehouse', feature_name: 'Data Warehouse', is_live: true, category: 'Data' },
    { route: '/etl-rules', feature_name: 'ETL Rules', is_live: true, category: 'Data' },
    
    // Admin
    { route: '/alerts', feature_name: 'Alerts', is_live: true, category: 'Admin' },
    { route: '/rbac', feature_name: 'RBAC', is_live: true, category: 'Admin' },
    { route: '/audit-log', feature_name: 'Audit Log', is_live: true, category: 'Admin' },
    { route: '/api', feature_name: 'API Management', is_live: true, category: 'Admin' },
    { route: '/settings', feature_name: 'Settings', is_live: true, category: 'Admin' },
  ],
  
  'MDP': [
    // Executive Views
    { route: '/mdp/ceo', feature_name: 'CEO Decision View (V2)', is_live: true, category: 'Executive' },
    { route: '/mdp/cmo-mode', feature_name: 'CMO Mode', is_live: true, category: 'Executive' },
    { route: '/mdp/marketing-mode', feature_name: 'Marketing Mode', is_live: true, category: 'Executive' },
    
    // Campaign & Channel
    { route: '/mdp/campaigns', feature_name: 'Campaigns', is_live: true, category: 'Operations' },
    { route: '/mdp/channels', feature_name: 'Channels', is_live: true, category: 'Operations' },
    { route: '/mdp/funnel', feature_name: 'Funnel Analysis', is_live: true, category: 'Operations' },
    { route: '/mdp/ab-testing', feature_name: 'A/B Testing', is_live: true, category: 'Operations' },
    { route: '/mdp/audience', feature_name: 'Audience Insights', is_live: true, category: 'Operations' },
    
    // Financial Impact (MDP Manifesto)
    { route: '/mdp/profit', feature_name: 'Profit Attribution', is_live: true, category: 'Financial' },
    { route: '/mdp/cash-impact', feature_name: 'Cash Impact', is_live: true, category: 'Financial' },
    { route: '/mdp/risks', feature_name: 'Risk Alerts', is_live: true, category: 'Financial' },
    { route: '/mdp/decisions', feature_name: 'Decision Support', is_live: true, category: 'Financial' },
    
    // Optimization
    { route: '/mdp/budget-optimizer', feature_name: 'Budget Optimizer', is_live: true, category: 'Optimization' },
    { route: '/mdp/scenario-planner', feature_name: 'Scenario Planner', is_live: true, category: 'Optimization' },
    { route: '/mdp/roi-analytics', feature_name: 'ROI Analytics', is_live: true, category: 'Optimization' },
    { route: '/mdp/customer-ltv', feature_name: 'Customer LTV', is_live: true, category: 'Optimization' },
    
    // Data
    { route: '/mdp/data-sources', feature_name: 'Data Sources', is_live: true, category: 'Data' },
    { route: '/mdp/data-readiness', feature_name: 'Data Readiness', is_live: true, category: 'Data' },
  ],
  
  'Control Tower': [
    // Command Center
    { route: '/control-tower/ceo', feature_name: 'CEO Strategic View', is_live: true, category: 'Command' },
    { route: '/control-tower/coo', feature_name: 'COO Execution View', is_live: true, category: 'Command' },
    { route: '/control-tower/situation', feature_name: 'Situation Room', is_live: true, category: 'Command' },
    { route: '/control-tower/board', feature_name: 'Board View', is_live: true, category: 'Command' },
    
    // Governance
    { route: '/control-tower/decisions', feature_name: 'Decisions', is_live: true, category: 'Governance' },
    { route: '/control-tower/alerts', feature_name: 'Alerts', is_live: true, category: 'Governance' },
    { route: '/control-tower/tasks', feature_name: 'Tasks', is_live: true, category: 'Governance' },
    
    // Configuration
    { route: '/control-tower/kpi-rules', feature_name: 'KPI Rules', is_live: true, category: 'Config' },
    { route: '/control-tower/team', feature_name: 'Team', is_live: true, category: 'Config' },
    { route: '/control-tower/settings', feature_name: 'Settings', is_live: true, category: 'Config' },
    
    // Future / Planned
    { route: '/control-tower/escalation', feature_name: 'Escalation Engine', is_live: false, category: 'Future' },
    { route: '/control-tower/cross-domain', feature_name: 'Cross-Domain Intelligence', is_live: false, category: 'Future' },
    { route: '/control-tower/automation', feature_name: 'Action Automation', is_live: false, category: 'Future' },
  ],
  
  'CDP': [
    // All CDP routes are future/planned
    { route: '/cdp/customers', feature_name: 'Customer 360', is_live: false, category: 'Core' },
    { route: '/cdp/segments', feature_name: 'Segmentation', is_live: false, category: 'Core' },
    { route: '/cdp/journey', feature_name: 'Customer Journey', is_live: false, category: 'Analytics' },
    { route: '/cdp/ltv', feature_name: 'LTV Prediction', is_live: false, category: 'Analytics' },
    { route: '/cdp/churn', feature_name: 'Churn Prediction', is_live: false, category: 'Analytics' },
    { route: '/cdp/cohorts', feature_name: 'Cohort Analysis', is_live: false, category: 'Analytics' },
    { route: '/cdp/identity', feature_name: 'Identity Resolution', is_live: false, category: 'Data' },
    { route: '/cdp/enrichment', feature_name: 'Data Enrichment', is_live: false, category: 'Data' },
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
  'transaction',
  'inventory',
  'employee',
  'budget',
  'forecast',
];

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
];
