-- =====================================================
-- COMPUTE FINANCE EXPENSES DAILY
-- Aggregates data from expenses → finance_expenses_daily
-- =====================================================

-- 1) Create compute function
CREATE OR REPLACE FUNCTION compute_finance_expenses_daily(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO finance_expenses_daily (
    tenant_id, day, total_amount,
    cogs_amount, salary_amount, rent_amount, utilities_amount,
    marketing_amount, logistics_amount, depreciation_amount,
    interest_amount, tax_amount, other_amount, expense_count
  )
  SELECT
    e.tenant_id,
    e.expense_date::date as day,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COALESCE(SUM(CASE WHEN e.category = 'cogs' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'salary' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'rent' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'marketing' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'logistics' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'depreciation' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'interest' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category NOT IN ('cogs','salary','rent','utilities','marketing','logistics','depreciation','interest','tax') THEN e.amount ELSE 0 END), 0),
    COUNT(*)::integer
  FROM expenses e
  WHERE e.tenant_id = p_tenant_id
    AND e.expense_date IS NOT NULL
  GROUP BY e.tenant_id, e.expense_date::date
  ON CONFLICT (tenant_id, day) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    cogs_amount = EXCLUDED.cogs_amount,
    salary_amount = EXCLUDED.salary_amount,
    rent_amount = EXCLUDED.rent_amount,
    utilities_amount = EXCLUDED.utilities_amount,
    marketing_amount = EXCLUDED.marketing_amount,
    logistics_amount = EXCLUDED.logistics_amount,
    depreciation_amount = EXCLUDED.depreciation_amount,
    interest_amount = EXCLUDED.interest_amount,
    tax_amount = EXCLUDED.tax_amount,
    other_amount = EXCLUDED.other_amount,
    expense_count = EXCLUDED.expense_count,
    updated_at = now();
END;
$$;

-- 2) Populate historical data for active tenants
DO $$
DECLARE
  t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants WHERE is_active = true LOOP
    PERFORM compute_finance_expenses_daily(t_id);
  END LOOP;
END $$;

-- 3) Schedule daily refresh via pg_cron (runs at 3:10 AM daily)
SELECT cron.schedule(
  'refresh-finance-expenses-daily',
  '10 3 * * *',
  $$SELECT compute_finance_expenses_daily(id) FROM tenants WHERE is_active = true;$$
);