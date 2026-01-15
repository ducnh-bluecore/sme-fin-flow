
-- =====================================================
-- MIGRATION: Chuẩn hóa Decision Cards Schema
-- =====================================================

-- 1. Thêm cột card_source vào decision_cards để phân biệt nguồn
ALTER TABLE decision_cards 
ADD COLUMN IF NOT EXISTS card_source TEXT DEFAULT 'manual' CHECK (card_source IN ('manual', 'auto', 'rule'));

-- 2. Thêm cột auto_card_id để link với auto cards (nếu card được promote từ auto)
ALTER TABLE decision_cards 
ADD COLUMN IF NOT EXISTS auto_card_id TEXT;

-- 3. Tạo bảng UNIFIED decision_audit_log cho tất cả quyết định
CREATE TABLE IF NOT EXISTS decision_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Card identification (works for both DB and Auto cards)
  card_id UUID,  -- NULL nếu là auto card
  auto_card_id TEXT,  -- NULL nếu là DB card
  card_type TEXT NOT NULL,  -- GROWTH_SCALE_SKU, CASH_SURVIVAL, etc.
  entity_type TEXT NOT NULL,  -- SKU, CHANNEL, CASH, etc.
  entity_id TEXT,
  entity_label TEXT,
  
  -- Decision details
  action_type TEXT NOT NULL,  -- DECIDE, DISMISS, SNOOZE, APPROVE, REJECT
  action_label TEXT,
  decision_status TEXT,  -- DECIDED, DISMISSED, SNOOZED
  
  -- Context
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comment TEXT,
  dismiss_reason TEXT,
  snoozed_until TIMESTAMPTZ,
  
  -- Impact tracking
  impact_amount NUMERIC,
  impact_currency TEXT DEFAULT 'VND',
  
  -- Snapshot for audit trail
  card_snapshot JSONB,
  
  -- Outcome tracking
  outcome_tracking_key TEXT,
  outcome_recorded_at TIMESTAMPTZ,
  outcome_value NUMERIC,
  outcome_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Migrate data từ decision_card_decisions
INSERT INTO decision_audit_log (
  tenant_id, card_id, card_type, entity_type, entity_id, entity_label,
  action_type, action_label, decision_status,
  decided_by, decided_at, comment, dismiss_reason,
  impact_amount, impact_currency,
  outcome_tracking_key, outcome_recorded_at, outcome_value, outcome_notes
)
SELECT 
  dcd.tenant_id,
  dcd.card_id,
  dc.card_type,
  dc.entity_type,
  dc.entity_id,
  dc.entity_label,
  dcd.action_type,
  dcd.action_label,
  dc.status,
  dcd.decided_by,
  dcd.decided_at,
  dcd.comment,
  dcd.dismiss_reason,
  dc.impact_amount,
  dc.impact_currency,
  dcd.outcome_tracking_key,
  dcd.outcome_recorded_at,
  dcd.outcome_value,
  dcd.outcome_notes
FROM decision_card_decisions dcd
JOIN decision_cards dc ON dcd.card_id = dc.id
ON CONFLICT DO NOTHING;

-- 5. Migrate data từ auto_decision_card_states
INSERT INTO decision_audit_log (
  tenant_id, auto_card_id, card_type, entity_type, entity_id, entity_label,
  action_type, decision_status,
  decided_by, decided_at, comment, dismiss_reason, snoozed_until,
  impact_amount, impact_currency, card_snapshot
)
SELECT 
  ads.tenant_id,
  ads.auto_card_id,
  (ads.card_snapshot->>'card_type')::TEXT,
  (ads.card_snapshot->>'entity_type')::TEXT,
  (ads.card_snapshot->>'entity_id')::TEXT,
  (ads.card_snapshot->>'entity_label')::TEXT,
  ads.status,  -- DECIDED, DISMISSED, SNOOZED
  ads.status,
  ads.decided_by,
  COALESCE(ads.decided_at, ads.created_at),
  ads.comment,
  ads.dismiss_reason,
  ads.snoozed_until,
  (ads.card_snapshot->>'impact_amount')::NUMERIC,
  COALESCE((ads.card_snapshot->>'impact_currency')::TEXT, 'VND'),
  ads.card_snapshot
FROM auto_decision_card_states ads
ON CONFLICT DO NOTHING;

-- 6. Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_decision_audit_log_tenant ON decision_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decision_audit_log_card_id ON decision_audit_log(card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_audit_log_auto_card_id ON decision_audit_log(auto_card_id) WHERE auto_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decision_audit_log_decided_at ON decision_audit_log(decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_audit_log_entity ON decision_audit_log(entity_type, entity_id);

-- 7. Tạo VIEW thống nhất để query tất cả decisions
CREATE OR REPLACE VIEW unified_decision_history AS
SELECT 
  id,
  tenant_id,
  COALESCE(card_id::TEXT, auto_card_id) as card_identifier,
  CASE WHEN card_id IS NOT NULL THEN 'db' ELSE 'auto' END as card_source,
  card_type,
  entity_type,
  entity_id,
  entity_label,
  action_type,
  action_label,
  decision_status,
  decided_by,
  decided_at,
  comment,
  dismiss_reason,
  snoozed_until,
  impact_amount,
  impact_currency,
  outcome_value,
  outcome_notes,
  created_at
FROM decision_audit_log
ORDER BY decided_at DESC;

-- 8. Enable RLS
ALTER TABLE decision_audit_log ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
CREATE POLICY "Users can view audit logs of their tenant"
ON decision_audit_log FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit logs for their tenant"
ON decision_audit_log FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- 10. Add comment for documentation
COMMENT ON TABLE decision_audit_log IS 'Unified audit log for all decision card actions (both DB cards and Auto-generated cards)';
COMMENT ON VIEW unified_decision_history IS 'Unified view combining all decision history from both DB and Auto cards';
