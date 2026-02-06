-- ============================================
-- BLUECORE v1.4.2 - SSOT Facade Views & Metric Contracts
-- ============================================

-- ===========================================
-- PHASE 4A: Facade Views for SSOT Dashboard Entry Points
-- ===========================================

-- v_ct_truth_snapshot: Control Tower Dashboard Single Entry Point
CREATE OR REPLACE VIEW v_ct_truth_snapshot AS
SELECT
  tenant_id,
  -- Alert counts by severity
  COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open') as critical_open,
  COUNT(*) FILTER (WHERE severity = 'high' AND status = 'open') as high_open,
  COUNT(*) FILTER (WHERE severity = 'medium' AND status = 'open') as medium_open,
  COUNT(*) FILTER (WHERE status = 'open') as total_open,
  -- Decision cards status approximation via alert status
  COUNT(*) FILTER (WHERE status = 'pending') as decisions_pending,
  COUNT(*) FILTER (WHERE status = 'acknowledged') as decisions_in_progress,
  -- Overdue
  COUNT(*) FILTER (WHERE status = 'open' AND deadline_at < now()) as overdue_count,
  -- Total impact
  COALESCE(SUM(impact_amount) FILTER (WHERE status = 'open'), 0) as total_impact_value,
  now() as snapshot_at
FROM alert_instances
GROUP BY tenant_id;

-- ===========================================
-- PHASE 4B: Metric Contracts Registry Table
-- ===========================================

CREATE TABLE IF NOT EXISTS metric_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  metric_code TEXT NOT NULL,
  metric_version INTEGER NOT NULL DEFAULT 1,
  
  -- Definition
  display_name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL CHECK (domain IN ('FDP', 'MDP', 'CDP', 'CT')),
  
  -- Source
  source_view TEXT NOT NULL,
  grain TEXT NOT NULL CHECK (grain IN ('daily', 'weekly', 'monthly', 'realtime')),
  
  -- Governance
  is_actionable BOOLEAN DEFAULT false,
  deprecation_date DATE,
  breaking_change_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(tenant_id, metric_code, metric_version)
);

-- Enable RLS
ALTER TABLE metric_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Global metrics (tenant_id IS NULL) readable by all authenticated
CREATE POLICY "Global metrics readable by authenticated users"
  ON metric_contracts FOR SELECT
  TO authenticated
  USING (tenant_id IS NULL);

-- Tenant-specific metrics readable by tenant users
CREATE POLICY "Tenant metrics readable by tenant users"
  ON metric_contracts FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM tenant_users tu 
      WHERE tu.tenant_id = metric_contracts.tenant_id 
      AND tu.user_id = auth.uid()
    )
  );

-- Tenant admins can manage tenant metrics
CREATE POLICY "Tenant admins can manage tenant metrics"
  ON metric_contracts FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM tenant_users tu 
      WHERE tu.tenant_id = metric_contracts.tenant_id 
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_metric_contracts_domain ON metric_contracts(domain);
CREATE INDEX IF NOT EXISTS idx_metric_contracts_code ON metric_contracts(metric_code);

-- ===========================================
-- PHASE 4D: Decision Outcome Stats Helper View
-- ===========================================

-- Create helper view for outcome measurement (SSOT compliant)
CREATE OR REPLACE VIEW v_decision_outcome_stats AS
SELECT
  tenant_id,
  decision_audit_id as decision_id,
  outcome_status,
  -- Pre-computed stats
  COUNT(*) as measurement_count,
  AVG(actual_impact_amount) as avg_actual_impact,
  MAX(measurement_timestamp) as latest_measurement,
  -- Aggregated status
  COUNT(*) FILTER (WHERE outcome_status = 'positive') as positive_count,
  COUNT(*) FILTER (WHERE outcome_status = 'negative') as negative_count,
  COUNT(*) FILTER (WHERE outcome_status = 'neutral') as neutral_count,
  COUNT(*) FILTER (WHERE is_auto_measured = true) as auto_measured_count
FROM decision_outcomes
GROUP BY tenant_id, decision_audit_id, outcome_status;

-- ===========================================
-- Seed Core Metrics (Global - tenant_id NULL)
-- ===========================================

INSERT INTO metric_contracts (tenant_id, metric_code, display_name, description, domain, source_view, grain, is_actionable) VALUES
  (NULL, 'NET_REVENUE', 'Net Revenue', 'Total revenue after returns and discounts', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'GROSS_PROFIT', 'Gross Profit', 'Revenue minus COGS', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'CONTRIBUTION_MARGIN', 'Contribution Margin', 'Gross profit minus variable costs', 'FDP', 'v_fdp_truth_snapshot', 'daily', true),
  (NULL, 'BLENDED_ROAS', 'Blended ROAS', 'Total attributed revenue divided by total ad spend', 'MDP', 'v_mdp_truth_snapshot', 'daily', true),
  (NULL, 'CPA', 'Cost Per Acquisition', 'Ad spend divided by number of conversions', 'MDP', 'v_mdp_truth_snapshot', 'daily', true),
  (NULL, 'TOTAL_EQUITY_12M', 'Customer Equity (12M)', 'Sum of all customer LTV projections over 12 months', 'CDP', 'v_cdp_truth_snapshot', 'monthly', true),
  (NULL, 'AT_RISK_VALUE', 'At-Risk Customer Value', 'Total value of customers flagged as at-risk of churn', 'CDP', 'v_cdp_truth_snapshot', 'weekly', true),
  (NULL, 'CRITICAL_ALERTS', 'Critical Alerts Open', 'Count of unresolved critical severity alerts', 'CT', 'v_ct_truth_snapshot', 'realtime', true)
ON CONFLICT (tenant_id, metric_code, metric_version) DO NOTHING;