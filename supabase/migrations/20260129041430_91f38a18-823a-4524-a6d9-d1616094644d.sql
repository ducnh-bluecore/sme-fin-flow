-- Add payment_due_day column to expense_baselines
ALTER TABLE expense_baselines 
ADD COLUMN payment_due_day INTEGER;

-- Add check constraint via trigger (avoiding CHECK constraint issues with restoration)
CREATE OR REPLACE FUNCTION validate_payment_due_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_due_day IS NOT NULL AND (NEW.payment_due_day < 1 OR NEW.payment_due_day > 31) THEN
    RAISE EXCEPTION 'payment_due_day must be between 1 and 31';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_payment_due_day
BEFORE INSERT OR UPDATE ON expense_baselines
FOR EACH ROW
EXECUTE FUNCTION validate_payment_due_day();

-- Create view for upcoming payment alerts
CREATE OR REPLACE VIEW v_upcoming_payment_alerts AS
WITH calculated_dates AS (
  SELECT 
    eb.tenant_id,
    eb.id,
    eb.category,
    eb.name,
    eb.monthly_amount,
    eb.payment_due_day,
    -- Calculate next payment date
    CASE 
      WHEN eb.payment_due_day >= EXTRACT(DAY FROM CURRENT_DATE)::int 
      THEN make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        EXTRACT(MONTH FROM CURRENT_DATE)::int,
        LEAST(eb.payment_due_day, 
          DATE_PART('day', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::int)
      )
      ELSE make_date(
        EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL '1 month'))::int,
        EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '1 month'))::int,
        LEAST(eb.payment_due_day, 
          DATE_PART('day', DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day')::int)
      )
    END AS next_payment_date
  FROM expense_baselines eb
  WHERE eb.payment_due_day IS NOT NULL
    AND eb.effective_from <= CURRENT_DATE
    AND (eb.effective_to IS NULL OR eb.effective_to >= CURRENT_DATE)
)
SELECT 
  cd.tenant_id,
  cd.id,
  cd.category,
  cd.name,
  cd.monthly_amount,
  cd.payment_due_day,
  cd.next_payment_date,
  (cd.next_payment_date - CURRENT_DATE) AS days_until_due,
  CASE 
    WHEN (cd.next_payment_date - CURRENT_DATE) <= 1 THEN 'critical'
    WHEN (cd.next_payment_date - CURRENT_DATE) <= 3 THEN 'warning'
    WHEN (cd.next_payment_date - CURRENT_DATE) <= 7 THEN 'info'
    ELSE NULL
  END AS alert_level
FROM calculated_dates cd
WHERE (cd.next_payment_date - CURRENT_DATE) <= 7;