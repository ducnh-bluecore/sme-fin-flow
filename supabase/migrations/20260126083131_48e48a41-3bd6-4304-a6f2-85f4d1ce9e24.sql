-- Drop and recreate with correct schema
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
  
  -- Cash metrics
  v_cash_today NUMERIC := 0;
  v_cash_7d_forecast NUMERIC := 0;
  
  -- AR/AP metrics
  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  
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
  -- Set date range
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');
  v_days_in_period := GREATEST((v_end_date - v_start_date)::INTEGER, 1);

  -- 1. Revenue from cdp_orders (using order_at not order_date)
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

  -- Daily averages
  v_daily_revenue := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_total_cogs / v_days_in_period;
  v_avg_order_value := CASE WHEN v_total_orders > 0 THEN v_net_revenue / v_total_orders ELSE 0 END;

  -- 2. Cash from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id
    AND is_active = true;

  -- 3. Cash 7-day forecast - default to cash_today
  v_cash_7d_forecast := v_cash_today;

  -- 4. AR from invoices
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('sent', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar
  FROM invoices
  WHERE tenant_id = p_tenant_id;

  -- 5. AP from bills
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id;

  -- 6. Inventory from products
  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_inventory_value
  FROM products
  WHERE tenant_id = p_tenant_id
    AND is_active = true;
  
  v_slow_inventory := 0;

  -- 7. Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category IN ('salaries', 'rent', 'utilities', 'office', 'other') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'marketing' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('shipping', 'marketing', 'platform_fees') THEN amount ELSE 0 END), 0)
  INTO v_total_opex, v_marketing_spend, v_variable_costs
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- 8. Computed metrics
  v_contribution_margin := v_gross_profit - v_variable_costs;
  v_ebitda := v_gross_profit - v_total_opex;
  
  IF v_net_revenue > 0 THEN
    v_gross_margin_pct := (v_gross_profit / v_net_revenue) * 100;
    v_contribution_margin_pct := (v_contribution_margin / v_net_revenue) * 100;
    v_ebitda_margin_pct := (v_ebitda / v_net_revenue) * 100;
  END IF;

  -- 9. Cash cycle metrics
  IF v_daily_revenue > 0 THEN
    v_dso := v_total_ar / v_daily_revenue;
  END IF;
  
  IF v_daily_cogs > 0 THEN
    v_dio := v_inventory_value / v_daily_cogs;
    v_dpo := v_total_ap / v_daily_cogs;
  END IF;
  
  v_ccc := v_dso + v_dio - v_dpo;

  -- Generate snapshot ID
  v_snapshot_id := gen_random_uuid();

  -- Insert snapshot (using correct column names from actual schema)
  INSERT INTO central_metrics_snapshots (
    id,
    tenant_id,
    snapshot_at,
    period_start,
    period_end,
    net_revenue,
    gross_profit,
    contribution_margin,
    ebitda,
    gross_margin_percent,
    contribution_margin_percent,
    ebitda_margin_percent,
    cash_today,
    cash_7d_forecast,
    total_ar,
    overdue_ar,
    total_ap,
    overdue_ap,
    total_inventory_value,
    slow_moving_inventory,
    dso,
    dpo,
    dio,
    ccc,
    total_marketing_spend,
    total_orders,
    avg_order_value,
    total_customers,
    created_at
  ) VALUES (
    v_snapshot_id,
    p_tenant_id,
    NOW(),
    v_start_date,
    v_end_date,
    v_net_revenue,
    v_gross_profit,
    v_contribution_margin,
    v_ebitda,
    v_gross_margin_pct,
    v_contribution_margin_pct,
    v_ebitda_margin_pct,
    v_cash_today,
    v_cash_7d_forecast,
    v_total_ar,
    v_overdue_ar,
    v_total_ap,
    v_overdue_ap,
    v_inventory_value,
    v_slow_inventory,
    v_dso,
    v_dpo,
    v_dio,
    v_ccc,
    v_marketing_spend,
    v_total_orders,
    v_avg_order_value,
    v_total_customers,
    NOW()
  )
  ON CONFLICT (tenant_id, snapshot_at) 
  DO UPDATE SET
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    net_revenue = EXCLUDED.net_revenue,
    gross_profit = EXCLUDED.gross_profit,
    contribution_margin = EXCLUDED.contribution_margin,
    ebitda = EXCLUDED.ebitda,
    gross_margin_percent = EXCLUDED.gross_margin_percent,
    contribution_margin_percent = EXCLUDED.contribution_margin_percent,
    ebitda_margin_percent = EXCLUDED.ebitda_margin_percent,
    cash_today = EXCLUDED.cash_today,
    cash_7d_forecast = EXCLUDED.cash_7d_forecast,
    total_ar = EXCLUDED.total_ar,
    overdue_ar = EXCLUDED.overdue_ar,
    total_ap = EXCLUDED.total_ap,
    overdue_ap = EXCLUDED.overdue_ap,
    total_inventory_value = EXCLUDED.total_inventory_value,
    slow_moving_inventory = EXCLUDED.slow_moving_inventory,
    dso = EXCLUDED.dso,
    dpo = EXCLUDED.dpo,
    dio = EXCLUDED.dio,
    ccc = EXCLUDED.ccc,
    total_marketing_spend = EXCLUDED.total_marketing_spend,
    total_orders = EXCLUDED.total_orders,
    avg_order_value = EXCLUDED.avg_order_value,
    total_customers = EXCLUDED.total_customers,
    created_at = NOW();

  RETURN v_snapshot_id;
END;
$$;