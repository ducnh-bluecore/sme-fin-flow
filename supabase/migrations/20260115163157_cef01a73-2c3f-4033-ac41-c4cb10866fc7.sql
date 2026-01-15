-- =====================================================
-- MIGRATION: Cải thiện Decision Tracking
-- =====================================================

-- 1. Thêm cột selected_action cho decision_audit_log
ALTER TABLE decision_audit_log 
ADD COLUMN IF NOT EXISTS selected_action_type TEXT,
ADD COLUMN IF NOT EXISTS selected_action_label TEXT,
ADD COLUMN IF NOT EXISTS action_parameters JSONB,
ADD COLUMN IF NOT EXISTS expected_impact_amount NUMERIC,
ADD COLUMN IF NOT EXISTS expected_outcome TEXT,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled'));

-- 2. Tạo bảng decision_outcomes để theo dõi kết quả thực tế
CREATE TABLE IF NOT EXISTS decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision_audit_id UUID NOT NULL REFERENCES decision_audit_log(id) ON DELETE CASCADE,
  
  -- Outcome measurement
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_by UUID REFERENCES auth.users(id),
  
  -- Actual vs Expected
  actual_impact_amount NUMERIC,
  impact_variance NUMERIC,  -- actual - expected
  impact_variance_percent NUMERIC,  -- (actual - expected) / expected * 100
  
  -- Outcome status
  outcome_status TEXT NOT NULL CHECK (outcome_status IN ('positive', 'neutral', 'negative', 'too_early')),
  outcome_summary TEXT NOT NULL,
  outcome_details TEXT,
  
  -- Lessons learned
  lessons_learned TEXT,
  would_repeat BOOLEAN,
  
  -- Supporting data
  supporting_metrics JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_decision ON decision_outcomes(decision_audit_id);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_tenant ON decision_outcomes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decision_audit_follow_up ON decision_audit_log(follow_up_date, follow_up_status) 
  WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_audit_selected_action ON decision_audit_log(selected_action_type) 
  WHERE selected_action_type IS NOT NULL;

-- 4. RLS cho decision_outcomes
ALTER TABLE decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant outcomes" ON decision_outcomes
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own tenant outcomes" ON decision_outcomes
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own tenant outcomes" ON decision_outcomes
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- 5. VIEW: Decisions pending follow-up
CREATE OR REPLACE VIEW decisions_pending_followup AS
SELECT 
  dal.id,
  dal.tenant_id,
  dal.card_type,
  dal.entity_type,
  dal.entity_id,
  dal.entity_label,
  dal.selected_action_type,
  dal.selected_action_label,
  dal.decided_at,
  dal.follow_up_date,
  dal.follow_up_status,
  dal.expected_impact_amount,
  dal.expected_outcome,
  dal.impact_amount as original_impact,
  CASE 
    WHEN dal.follow_up_date < CURRENT_DATE AND dal.follow_up_status = 'pending' THEN 'overdue'
    WHEN dal.follow_up_date = CURRENT_DATE THEN 'due_today'
    WHEN dal.follow_up_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency,
  (SELECT COUNT(*) FROM decision_outcomes WHERE decision_audit_id = dal.id) as outcome_count
FROM decision_audit_log dal
WHERE dal.follow_up_date IS NOT NULL
  AND dal.follow_up_status IN ('pending', 'in_progress')
ORDER BY 
  CASE dal.follow_up_status 
    WHEN 'pending' THEN 1 
    WHEN 'in_progress' THEN 2 
  END,
  dal.follow_up_date ASC;