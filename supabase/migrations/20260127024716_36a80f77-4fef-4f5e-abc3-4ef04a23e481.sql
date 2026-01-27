-- Phase 1: Add collection rate settings to formula_settings
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS collection_rate_current NUMERIC(5,2) DEFAULT 85.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS collection_rate_30d NUMERIC(5,2) DEFAULT 70.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS collection_rate_60d NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS collection_rate_90d NUMERIC(5,2) DEFAULT 30.00;
ALTER TABLE formula_settings ADD COLUMN IF NOT EXISTS collection_rate_over90 NUMERIC(5,2) DEFAULT 10.00;

-- Add comments
COMMENT ON COLUMN formula_settings.collection_rate_current IS 'Expected collection rate for current AR (not yet due)';
COMMENT ON COLUMN formula_settings.collection_rate_30d IS 'Expected collection rate for AR overdue 1-30 days';
COMMENT ON COLUMN formula_settings.collection_rate_60d IS 'Expected collection rate for AR overdue 31-60 days';
COMMENT ON COLUMN formula_settings.collection_rate_90d IS 'Expected collection rate for AR overdue 61-90 days';
COMMENT ON COLUMN formula_settings.collection_rate_over90 IS 'Expected collection rate for AR overdue >90 days (bad debt)';