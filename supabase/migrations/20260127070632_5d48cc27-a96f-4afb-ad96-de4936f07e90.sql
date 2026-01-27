-- PHASE 4 + 6 + 7: SSOT Migration for Variance Analysis, AR Operations, Working Capital
-- Create view for Variance Analysis with pre-computed isFavorable and variancePct
-- Update snapshot view with overdueARPercent
-- Create working_capital_targets table

-- ============================================
-- 1. VARIANCE ANALYSIS: Pre-compute isFavorable and variancePct
-- ============================================
CREATE OR REPLACE VIEW v_variance_with_status AS
SELECT 
  va.*,
  -- Pre-compute variance percentage
  CASE WHEN va.budget_amount != 0 
    THEN ROUND((va.variance_to_budget / va.budget_amount * 100)::NUMERIC, 1)
    ELSE 0 
  END as variance_pct,
  
  -- Pre-compute favorable status (revenue positive is good, expense negative is good)
  CASE 
    WHEN va.category = 'revenue' AND va.variance_to_budget >= 0 THEN true
    WHEN va.category = 'expense' AND va.variance_to_budget <= 0 THEN true
    WHEN va.category != 'revenue' AND va.category != 'expense' AND va.variance_to_budget <= 0 THEN true
    ELSE false
  END as is_favorable
FROM variance_analysis va;

-- ============================================
-- 2. WORKING CAPITAL TARGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS working_capital_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Days targets
  dso_target NUMERIC NOT NULL DEFAULT 30,
  dpo_target NUMERIC NOT NULL DEFAULT 45,
  dio_target NUMERIC NOT NULL DEFAULT 45,
  
  -- CCC thresholds multipliers
  ccc_benchmark NUMERIC NOT NULL DEFAULT 60,      -- Industry benchmark
  ccc_good_multiplier NUMERIC NOT NULL DEFAULT 1.0,      -- <= benchmark
  ccc_warning_multiplier NUMERIC NOT NULL DEFAULT 1.5,   -- <= benchmark * 1.5
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE working_capital_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tenant targets"
  ON working_capital_targets FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own tenant targets"
  ON working_capital_targets FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own tenant targets"
  ON working_capital_targets FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Seed default targets for existing tenants
INSERT INTO working_capital_targets (tenant_id, dso_target, dpo_target, dio_target)
SELECT id, 30, 45, 45 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- 3. VIEW FOR CCC WITH STATUS (using targets)
-- ============================================
CREATE OR REPLACE VIEW v_ccc_with_targets AS
SELECT 
  s.tenant_id,
  s.snapshot_at,
  s.dso,
  s.dpo,
  s.dio,
  s.ccc,
  s.total_ar,
  s.overdue_ar,
  
  -- Targets from table
  COALESCE(t.dso_target, 30) as dso_target,
  COALESCE(t.dpo_target, 45) as dpo_target,
  COALESCE(t.dio_target, 45) as dio_target,
  COALESCE(t.ccc_benchmark, 60) as ccc_benchmark,
  
  -- Pre-compute CCC status
  CASE 
    WHEN s.ccc <= COALESCE(t.ccc_benchmark, 60) * COALESCE(t.ccc_good_multiplier, 1.0) THEN 'good'
    WHEN s.ccc <= COALESCE(t.ccc_benchmark, 60) * COALESCE(t.ccc_warning_multiplier, 1.5) THEN 'warning'
    ELSE 'danger'
  END as ccc_status,
  
  -- Pre-compute individual status
  CASE WHEN s.dso <= COALESCE(t.dso_target, 30) THEN 'good'
       WHEN s.dso <= COALESCE(t.dso_target, 30) * 1.5 THEN 'warning'
       ELSE 'danger' END as dso_status,
       
  CASE WHEN s.dpo >= COALESCE(t.dpo_target, 45) THEN 'good'
       WHEN s.dpo >= COALESCE(t.dpo_target, 45) * 0.7 THEN 'warning'
       ELSE 'danger' END as dpo_status,
       
  CASE WHEN s.dio <= COALESCE(t.dio_target, 45) THEN 'good'
       WHEN s.dio <= COALESCE(t.dio_target, 45) * 1.5 THEN 'warning'
       ELSE 'danger' END as dio_status,
  
  -- Pre-compute improvement delta
  s.ccc - COALESCE(t.ccc_benchmark, 60) as ccc_improvement,
  
  -- Pre-compute overdue AR percent
  CASE WHEN s.total_ar > 0 
    THEN ROUND((s.overdue_ar / s.total_ar * 100)::NUMERIC, 1)
    ELSE 0 
  END as overdue_ar_percent

FROM central_metrics_snapshots s
LEFT JOIN working_capital_targets t ON s.tenant_id = t.tenant_id
WHERE s.snapshot_at = (
  SELECT MAX(snapshot_at) FROM central_metrics_snapshots WHERE tenant_id = s.tenant_id
);

-- ============================================
-- 4. Update update trigger for working_capital_targets
-- ============================================
CREATE OR REPLACE FUNCTION update_working_capital_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_working_capital_targets ON working_capital_targets;
CREATE TRIGGER trigger_update_working_capital_targets
  BEFORE UPDATE ON working_capital_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_working_capital_targets_updated_at();