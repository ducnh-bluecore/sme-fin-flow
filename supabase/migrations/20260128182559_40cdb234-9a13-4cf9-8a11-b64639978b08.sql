-- Add missing columns for outcome recording workflow
ALTER TABLE decision_outcome_records 
  ADD COLUMN IF NOT EXISTS decision_title TEXT,
  ADD COLUMN IF NOT EXISTS predicted_impact_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_impact_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS followup_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ DEFAULT NOW();

-- Update decided_at with decision_date for existing records
UPDATE decision_outcome_records 
SET decided_at = decision_date 
WHERE decided_at IS NULL AND decision_date IS NOT NULL;

-- View for aggregated decision effectiveness metrics
CREATE OR REPLACE VIEW v_decision_effectiveness AS
SELECT 
  tenant_id,
  COALESCE(decision_type, 'UNKNOWN') as decision_type,
  COUNT(*) as total_decisions,
  COUNT(CASE WHEN outcome_verdict IN ('better_than_expected', 'as_expected') THEN 1 END) as successful_count,
  COUNT(CASE WHEN outcome_verdict = 'worse_than_expected' THEN 1 END) as failed_count,
  COUNT(CASE WHEN outcome_verdict = 'pending_followup' THEN 1 END) as pending_count,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(CASE WHEN outcome_verdict IN ('better_than_expected', 'as_expected') THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 1)
    ELSE 0 
  END as success_rate,
  COALESCE(AVG(
    CASE 
      WHEN predicted_impact_amount > 0 AND actual_impact_amount IS NOT NULL
      THEN LEAST(100, (actual_impact_amount / predicted_impact_amount) * 100)
      ELSE NULL 
    END
  ), 0) as avg_accuracy,
  COALESCE(SUM(actual_impact_amount), 0) as total_actual_value,
  COALESCE(SUM(predicted_impact_amount), 0) as total_predicted_value
FROM decision_outcome_records
WHERE outcome_verdict IS NOT NULL
GROUP BY tenant_id, decision_type;

-- View for pending follow-ups (decisions that need outcome measurement)
CREATE OR REPLACE VIEW v_decision_pending_followup AS
SELECT 
  id,
  tenant_id,
  decision_id,
  decision_type,
  decision_title,
  predicted_impact_amount,
  decided_at,
  followup_due_date,
  outcome_verdict,
  CASE 
    WHEN followup_due_date < NOW() THEN 'overdue'
    WHEN followup_due_date < NOW() + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency_status,
  EXTRACT(DAY FROM followup_due_date - NOW()) as days_until_due
FROM decision_outcome_records
WHERE outcome_verdict = 'pending_followup'
  AND followup_due_date IS NOT NULL
ORDER BY followup_due_date ASC;