-- =============================================================
-- FDP IMPROVEMENT PHASE 0: DATA INTEGRITY & COST DEFINITION
-- =============================================================

-- PART 1: Fix DIO Calculation (use annualized COGS, cap at 365 days)
-- =============================================================

DROP FUNCTION IF EXISTS public.compute_central_metrics_snapshot(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_days_in_period INTEGER;
  
  -- Revenue metrics
  v_net_revenue NUMERIC := 0;
  v_gross_profit NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_daily_revenue NUMERIC := 0;
  v_daily_cogs NUMERIC := 0;
  v_annual_cogs NUMERIC := 0;
  
  -- Cash metrics
  v_cash_today NUMERIC := 0;
  v_cash_7d_forecast NUMERIC := 0;
  
  -- AR/AP metrics
  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  v_ar_current NUMERIC := 0;
  v_ar_30d NUMERIC := 0;
  v_ar_60d NUMERIC := 0;
  v_ar_90d NUMERIC := 0;
  
  -- Inventory
  v_inventory_value NUMERIC := 0;
  v_slow_inventory NUMERIC := 0;
  
  -- Expense metrics
  v_total_opex NUMERIC := 0;
  v_marketing_spend NUMERIC := 0;
  v_variable_costs NUMERIC := 0;
  
  -- Computed metrics
  v_contribution_margin NUMERIC := 0;
  v_ebitda NUMERIC := 0;
  v_gross_margin_pct NUMERIC := 0;
  v_contribution_margin_pct NUMERIC := 0;
  v_ebitda_margin_pct NUMERIC := 0;
  v_dso NUMERIC := 0;
  v_dpo NUMERIC := 0;
  v_dio NUMERIC := 0;
  v_ccc NUMERIC := 0;
  
  -- Order metrics
  v_total_orders INTEGER := 0;
  v_total_customers INTEGER := 0;
  v_avg_order_value NUMERIC := 0;
BEGIN
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');
  v_days_in_period := GREATEST((v_end_date - v_start_date)::INTEGER, 1);

  -- 1. Revenue from cdp_orders
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(gross_margin), 0),
    COALESCE(SUM(cogs), 0),
    COUNT(*),
    COUNT(DISTINCT customer_id)
  INTO v_net_revenue, v_gross_profit, v_total_cogs, v_total_orders, v_total_customers
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at::date BETWEEN v_start_date AND v_end_date;

  v_daily_revenue := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_total_cogs / v_days_in_period;
  v_avg_order_value := CASE WHEN v_total_orders > 0 THEN v_net_revenue / v_total_orders ELSE 0 END;
  
  -- FIXED: Annualize COGS for industry-standard DIO/DPO
  v_annual_cogs := v_total_cogs * (365.0 / v_days_in_period);

  -- 2. Cash from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  v_cash_7d_forecast := v_cash_today;

  -- 3. AR from invoices with aging buckets
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('sent', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM invoices
  WHERE tenant_id = p_tenant_id AND status IN ('sent', 'overdue', 'partial');

  -- 4. AP from bills
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id;

  -- 5. Inventory from products
  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_inventory_value
  FROM products
  WHERE tenant_id = p_tenant_id AND is_active = true;
  
  v_slow_inventory := 0;

  -- 6. Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category::text IN ('salary', 'rent', 'utilities', 'other') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text = 'marketing' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text IN ('logistics', 'marketing') THEN amount ELSE 0 END), 0)
  INTO v_total_opex, v_marketing_spend, v_variable_costs
  FROM expenses
  WHERE tenant_id = p_tenant_id AND expense_date BETWEEN v_start_date AND v_end_date;

  -- 7. Computed metrics
  v_contribution_margin := v_gross_profit - v_variable_costs;
  v_ebitda := v_gross_profit - v_total_opex;
  
  IF v_net_revenue > 0 THEN
    v_gross_margin_pct := (v_gross_profit / v_net_revenue) * 100;
    v_contribution_margin_pct := (v_contribution_margin / v_net_revenue) * 100;
    v_ebitda_margin_pct := (v_ebitda / v_net_revenue) * 100;
  END IF;

  -- 8. FIXED: Cash cycle metrics with annualized COGS and caps
  IF v_daily_revenue > 0 THEN
    v_dso := LEAST(v_total_ar / v_daily_revenue, 365);
  END IF;
  
  IF v_annual_cogs > 0 THEN
    v_dio := LEAST((v_inventory_value / v_annual_cogs) * 365, 365);
    v_dpo := LEAST((v_total_ap / v_annual_cogs) * 365, 365);
  END IF;
  
  v_ccc := v_dso + v_dio - v_dpo;

  v_snapshot_id := gen_random_uuid();

  INSERT INTO central_metrics_snapshots (
    id, tenant_id, snapshot_at, period_start, period_end,
    net_revenue, gross_profit, contribution_margin, ebitda,
    gross_margin_percent, contribution_margin_percent, ebitda_margin_percent,
    cash_today, cash_7d_forecast, total_ar, overdue_ar, total_ap, overdue_ap,
    total_inventory_value, slow_moving_inventory,
    dso, dpo, dio, ccc,
    total_marketing_spend, total_orders, avg_order_value, total_customers,
    ar_aging_current, ar_aging_30d, ar_aging_60d, ar_aging_90d,
    created_at
  ) VALUES (
    v_snapshot_id, p_tenant_id, NOW(), v_start_date, v_end_date,
    v_net_revenue, v_gross_profit, v_contribution_margin, v_ebitda,
    v_gross_margin_pct, v_contribution_margin_pct, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d_forecast, v_total_ar, v_overdue_ar, v_total_ap, v_overdue_ap,
    v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_total_orders, v_avg_order_value, v_total_customers,
    v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    NOW()
  )
  ON CONFLICT (tenant_id, snapshot_at) 
  DO UPDATE SET
    period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end,
    net_revenue = EXCLUDED.net_revenue, gross_profit = EXCLUDED.gross_profit,
    contribution_margin = EXCLUDED.contribution_margin, ebitda = EXCLUDED.ebitda,
    gross_margin_percent = EXCLUDED.gross_margin_percent,
    contribution_margin_percent = EXCLUDED.contribution_margin_percent,
    ebitda_margin_percent = EXCLUDED.ebitda_margin_percent,
    cash_today = EXCLUDED.cash_today, cash_7d_forecast = EXCLUDED.cash_7d_forecast,
    total_ar = EXCLUDED.total_ar, overdue_ar = EXCLUDED.overdue_ar,
    total_ap = EXCLUDED.total_ap, overdue_ap = EXCLUDED.overdue_ap,
    total_inventory_value = EXCLUDED.total_inventory_value,
    slow_moving_inventory = EXCLUDED.slow_moving_inventory,
    dso = EXCLUDED.dso, dpo = EXCLUDED.dpo, dio = EXCLUDED.dio, ccc = EXCLUDED.ccc,
    total_marketing_spend = EXCLUDED.total_marketing_spend,
    total_orders = EXCLUDED.total_orders, avg_order_value = EXCLUDED.avg_order_value,
    total_customers = EXCLUDED.total_customers,
    ar_aging_current = EXCLUDED.ar_aging_current, ar_aging_30d = EXCLUDED.ar_aging_30d,
    ar_aging_60d = EXCLUDED.ar_aging_60d, ar_aging_90d = EXCLUDED.ar_aging_90d,
    created_at = NOW();

  RETURN v_snapshot_id;
END;
$$;

-- PART 2: Add AR Aging columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'central_metrics_snapshots' 
    AND column_name = 'ar_aging_current') THEN
    ALTER TABLE central_metrics_snapshots 
      ADD COLUMN ar_aging_current NUMERIC DEFAULT 0,
      ADD COLUMN ar_aging_30d NUMERIC DEFAULT 0,
      ADD COLUMN ar_aging_60d NUMERIC DEFAULT 0,
      ADD COLUMN ar_aging_90d NUMERIC DEFAULT 0;
  END IF;
END $$;

-- PART 3: Create expense_baselines table (Fixed Costs)
CREATE TABLE IF NOT EXISTS expense_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary', 'rent', 'utilities', 'other')),
  name TEXT NOT NULL,
  monthly_amount NUMERIC(15,2) NOT NULL CHECK (monthly_amount >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT expense_baselines_unique UNIQUE(tenant_id, category, name, effective_from),
  CONSTRAINT expense_baselines_date_order CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_expense_baselines_tenant ON expense_baselines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_baselines_effective ON expense_baselines(tenant_id, effective_from, effective_to);

ALTER TABLE expense_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_baselines_select" ON expense_baselines FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "expense_baselines_insert" ON expense_baselines FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "expense_baselines_update" ON expense_baselines FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "expense_baselines_delete" ON expense_baselines FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'owner'));

-- PART 4: Create expense_estimates table (Variable Costs)
CREATE TABLE IF NOT EXISTS expense_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category TEXT NOT NULL CHECK (category IN ('marketing', 'logistics', 'other_variable')),
  channel TEXT,
  estimated_amount NUMERIC(15,2) NOT NULL CHECK (estimated_amount >= 0),
  actual_amount NUMERIC(15,2) CHECK (actual_amount IS NULL OR actual_amount >= 0),
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'closed')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_estimates_tenant ON expense_estimates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_estimates_period ON expense_estimates(tenant_id, year, month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_estimates_unique ON expense_estimates(tenant_id, year, month, category, COALESCE(channel, ''));

ALTER TABLE expense_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_estimates_select" ON expense_estimates FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "expense_estimates_insert" ON expense_estimates FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "expense_estimates_update" ON expense_estimates FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')) AND status != 'locked');

CREATE POLICY "expense_estimates_delete" ON expense_estimates FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'owner') AND status = 'draft');

-- PART 5: Create v_expense_plan_summary view
CREATE OR REPLACE VIEW v_expense_plan_summary AS
WITH fixed_costs AS (
  SELECT tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::int AS year, EXTRACT(MONTH FROM CURRENT_DATE)::int AS month,
    SUM(monthly_amount) AS total_fixed, COUNT(*) AS fixed_count
  FROM expense_baselines
  WHERE effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  GROUP BY tenant_id
),
variable_costs AS (
  SELECT tenant_id, year, month, SUM(estimated_amount) AS total_estimated,
    SUM(COALESCE(actual_amount, 0)) AS total_actual,
    COUNT(*) AS estimate_count, COUNT(actual_amount) AS actual_count
  FROM expense_estimates
  GROUP BY tenant_id, year, month
)
SELECT 
  COALESCE(f.tenant_id, v.tenant_id) AS tenant_id,
  COALESCE(v.year, f.year) AS year, COALESCE(v.month, f.month) AS month,
  COALESCE(f.total_fixed, 0) AS fixed_baseline,
  COALESCE(f.fixed_count, 0)::int AS fixed_cost_items,
  COALESCE(v.total_estimated, 0) AS variable_estimated,
  COALESCE(v.total_actual, 0) AS variable_actual,
  COALESCE(v.estimate_count, 0)::int AS variable_estimate_items,
  COALESCE(v.actual_count, 0)::int AS variable_actual_items,
  COALESCE(f.total_fixed, 0) + COALESCE(v.total_estimated, 0) AS total_planned,
  COALESCE(f.total_fixed, 0) + COALESCE(v.total_actual, 0) AS total_actual,
  (COALESCE(v.total_actual, 0) - COALESCE(v.total_estimated, 0)) AS variance,
  CASE WHEN COALESCE(v.estimate_count, 0) > 0 
    THEN ROUND((COALESCE(v.actual_count, 0)::numeric / v.estimate_count::numeric) * 100, 1) ELSE 0 END AS data_completeness_percent
FROM fixed_costs f
FULL OUTER JOIN variable_costs v ON f.tenant_id = v.tenant_id AND f.year = v.year AND f.month = v.month;

-- PART 6: Update detect_real_alerts with AP critical warning
CREATE OR REPLACE FUNCTION public.detect_real_alerts(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_rows integer := 0;
  v_now timestamp with time zone := now();
  v_total_ap numeric := 0;
  v_overdue_ap numeric := 0;
  v_overdue_percent numeric := 0;
BEGIN
  DELETE FROM alert_instances WHERE tenant_id = p_tenant_id AND status = 'active' AND created_at < v_now - interval '1 hour';

  -- 1. LOW MARGIN SKUs
  INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
  SELECT p_tenant_id, 'low_margin', 'product',
    CASE WHEN pm.gross_margin_percent < 0 THEN 'critical' WHEN pm.gross_margin_percent < 5 THEN 'warning' ELSE 'info' END,
    'Margin thấp: ' || COALESCE(pm.product_name, pm.sku),
    pm.sku || ': Margin ' || ROUND(COALESCE(pm.gross_margin_percent, 0)::numeric, 1) || '%',
    COALESCE(pm.product_name, pm.sku), 'product', COALESCE(pm.gross_margin_percent, 0), 5,
    ABS(COALESCE(pm.gross_profit_30d, 0)), 'active', v_now
  FROM product_metrics pm
  WHERE pm.tenant_id = p_tenant_id AND pm.total_quantity_30d > 0 AND COALESCE(pm.gross_margin_percent, 100) < 5
  LIMIT 20;
  GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;

  -- 2. OVERDUE AR
  INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
  SELECT p_tenant_id, 'overdue_ar', 'finance',
    CASE WHEN (CURRENT_DATE - i.due_date) > 30 THEN 'critical' WHEN (CURRENT_DATE - i.due_date) > 14 THEN 'warning' ELSE 'info' END,
    'Công nợ quá hạn: ' || i.invoice_number,
    'Khách: ' || COALESCE(i.customer_name, 'N/A') || '. Quá hạn ' || (CURRENT_DATE - i.due_date) || ' ngày',
    i.invoice_number, 'invoice', (CURRENT_DATE - i.due_date), 0,
    i.total_amount - COALESCE(i.paid_amount, 0), 'active', v_now
  FROM invoices i
  WHERE i.tenant_id = p_tenant_id AND i.status IN ('sent', 'partial', 'overdue') AND i.due_date < CURRENT_DATE AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
  ORDER BY (i.total_amount - COALESCE(i.paid_amount, 0)) DESC LIMIT 20;
  GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;

  -- 3. LOW CASH
  INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
  SELECT p_tenant_id, 'low_cash', 'finance',
    CASE WHEN total_cash < 10000000 THEN 'critical' WHEN total_cash < 50000000 THEN 'warning' ELSE 'info' END,
    'Cảnh báo tiền mặt thấp', 'Tổng số dư: ' || total_cash::text || ' VND',
    'Cash Position', 'cash', total_cash, 50000000, 50000000 - total_cash, 'active', v_now
  FROM (SELECT COALESCE(SUM(current_balance), 0) AS total_cash FROM bank_accounts WHERE tenant_id = p_tenant_id AND status = 'active') cs
  WHERE total_cash < 50000000;
  GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;

  -- 4. PENDING BILLS
  INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
  SELECT p_tenant_id, 'pending_bill', 'finance',
    CASE WHEN (CURRENT_DATE - b.due_date) > 14 THEN 'critical' WHEN (CURRENT_DATE - b.due_date) > 7 THEN 'warning' ELSE 'info' END,
    'Hóa đơn NCC: ' || b.bill_number,
    'NCC: ' || COALESCE(b.vendor_name, 'N/A') || CASE WHEN b.due_date < CURRENT_DATE THEN '. Quá hạn ' || (CURRENT_DATE - b.due_date) || ' ngày' ELSE '. Đến hạn ' || (b.due_date - CURRENT_DATE) || ' ngày' END,
    b.bill_number, 'bill', CASE WHEN b.due_date < CURRENT_DATE THEN (CURRENT_DATE - b.due_date) ELSE 0 END, 7,
    b.total_amount - COALESCE(b.paid_amount, 0), 'active', v_now
  FROM bills b
  WHERE b.tenant_id = p_tenant_id AND b.status IN ('pending', 'approved', 'partial') AND b.due_date <= CURRENT_DATE + 7 AND (b.total_amount - COALESCE(b.paid_amount, 0)) > 0
  ORDER BY b.due_date ASC LIMIT 20;
  GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;

  -- 5. HIGH RETURN
  INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
  SELECT p_tenant_id, 'high_return', 'operations',
    CASE WHEN pm.return_rate > 10 THEN 'critical' WHEN pm.return_rate > 5 THEN 'warning' ELSE 'info' END,
    'Tỷ lệ hoàn cao: ' || COALESCE(pm.product_name, pm.sku),
    pm.sku || ': Tỷ lệ hoàn ' || ROUND(pm.return_rate::numeric, 1) || '%',
    COALESCE(pm.product_name, pm.sku), 'product', pm.return_rate, 5,
    COALESCE(pm.total_revenue_30d, 0) * pm.return_rate / 100, 'active', v_now
  FROM product_metrics pm
  WHERE pm.tenant_id = p_tenant_id AND pm.total_quantity_30d > 10 AND pm.return_rate > 5
  LIMIT 10;
  GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;

  -- 6. NEW: CRITICAL AP OVERDUE (>=95%)
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap FROM bills WHERE tenant_id = p_tenant_id;

  IF v_total_ap > 0 THEN
    v_overdue_percent := (v_overdue_ap / v_total_ap) * 100;
    IF v_overdue_percent >= 95 THEN
      INSERT INTO alert_instances (tenant_id, alert_type, category, severity, title, message, object_name, object_type, current_value, threshold_value, impact_amount, status, created_at)
      VALUES (p_tenant_id, 'ap_critical', 'finance', 'critical',
        'CẢNH BÁO: Toàn bộ công nợ phải trả đã quá hạn',
        'Tỷ lệ quá hạn: ' || ROUND(v_overdue_percent, 1) || '%. Tổng: ' || v_total_ap::text,
        'AP Portfolio', 'ap', v_overdue_percent, 95, v_overdue_ap, 'active', v_now);
      v_count := v_count + 1;
    END IF;
  END IF;

  RETURN v_count;
END;
$$;