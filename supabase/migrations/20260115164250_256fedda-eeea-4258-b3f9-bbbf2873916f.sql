-- =====================================================
-- MIGRATION: Auto-measure Outcome Support
-- =====================================================

-- 1. Thêm cột cho auto-measured data trong decision_audit_log
ALTER TABLE decision_audit_log 
ADD COLUMN IF NOT EXISTS baseline_metrics JSONB,
ADD COLUMN IF NOT EXISTS measurement_config JSONB;

-- 2. Thêm cột cho auto-measured outcomes
ALTER TABLE decision_outcomes
ADD COLUMN IF NOT EXISTS is_auto_measured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS baseline_metrics JSONB,
ADD COLUMN IF NOT EXISTS current_metrics JSONB,
ADD COLUMN IF NOT EXISTS measurement_timestamp TIMESTAMPTZ;