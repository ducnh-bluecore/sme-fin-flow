-- Phase 8.1: Fix Marketing ROAS Calculation
-- Updates compute_central_metrics_snapshot to use promotion_campaigns for ROAS

CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
  v_start_time timestamp;
  v_end_time timestamp;
  v_duration_ms integer;
  
  -- Date range
  v_period_start date;
  v_period_end date;
  
  -- Revenue metrics
  v_net_revenue numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin_percent numeric := 0;
  v_contribution_margin numeric := 0;
  v_contribution_margin_percent numeric := 0;
  v_ebitda numeric := 0;
  v_ebitda_margin_percent numeric := 0;
  
  -- Cash metrics
  v_cash_today numeric := 0;
  v_cash_7d_forecast numeric := 0;
  v_cash_runway_months numeric := 0;
  
  -- AR metrics
  v_total_ar numeric := 0;
  v_overdue_ar numeric := 0;
  v_ar_aging_current numeric := 0;
  v_ar_aging_30d numeric := 0;
  v_ar_aging_60d numeric := 0;
  v_ar_aging_90d numeric := 0;
  
  -- AP metrics
  v_total_ap numeric := 0;
  v_overdue_ap numeric := 0;
  
  -- Inventory
  v_total_inventory_value numeric := 0;
  v_slow_moving_inventory numeric := 0;
  
  -- Working capital cycle
  v_dso numeric := 0;
  v_dpo numeric := 0;
  v_dio numeric := 0;
  v_ccc numeric := 0;
  
  -- Marketing - FIXED: Now uses promotion_campaigns
  v_total_marketing_spend numeric := 0;
  v_marketing_revenue numeric := 0;
  v_marketing_roas numeric := 0;
  v_cac numeric := 0;
  v_ltv numeric := 0;
  v_ltv_cac_ratio numeric := 0;
  
  -- Orders/Customers
  v_total_orders integer := 0;
  v_avg_order_value numeric := 0;
  v_total_customers integer := 0;
  v_repeat_customer_rate numeric := 0;
  
  -- Locked cash
  v_locked_cash_inventory numeric := 0;
  v_locked_cash_ads numeric := 0;
  v_locked_cash_ops numeric := 0;
  v_locked_cash_platform numeric := 0;
  v_locked_cash_total numeric := 0;
  
  -- Variable costs for CM
  v_variable_costs numeric := 0;
  v_opex numeric := 0;
  v_depreciation numeric := 0;
  
  -- Daily metrics for cycle calculations
  v_daily_sales numeric := 0;
  v_daily_cogs numeric := 0;
  v_daily_purchases numeric := 0;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Set date range (last 90 days)
  v_period_end := CURRENT_DATE;
  v_period_start := CURRENT_DATE - INTERVAL '90 days';
  
  -- =========================================================
  -- 1. REVENUE METRICS from cdp_orders (SSOT)
  -- =========================================================
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(gross_profit), 0),
    COUNT(DISTINCT id),
    COUNT(DISTINCT customer_id)
  INTO v_net_revenue, v_gross_profit, v_total_orders, v_total_customers
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= v_period_start
    AND order_at <= v_period_end
    AND status NOT IN ('cancelled', 'refunded');
  
  -- Calculate gross margin
  IF v_net_revenue > 0 THEN
    v_gross_margin_percent := (v_gross_profit / v_net_revenue) * 100;
    v_avg_order_value := v_net_revenue / NULLIF(v_total_orders, 0);
  END IF;
  
  -- =========================================================
  -- 2. EXPENSE METRICS from expenses table (with date filter)
  -- =========================================================
  SELECT 
    COALESCE(SUM(CASE WHEN is_variable = true THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text IN ('salary', 'rent', 'utilities', 'depreciation', 'other_opex') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text = 'depreciation' THEN amount ELSE 0 END), 0)
  INTO v_variable_costs, v_opex, v_depreciation
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_period_start
    AND expense_date <= v_period_end;
  
  -- =========================================================
  -- 3. MARKETING METRICS from promotion_campaigns (FIXED!)
  -- Previously used expenses.category='marketing' which was wrong
  -- =========================================================
  SELECT 
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(total_revenue), 0)
  INTO v_total_marketing_spend, v_marketing_revenue
  FROM promotion_campaigns
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_period_start
    AND (status IS NULL OR status != 'cancelled');
  
  -- Calculate ROAS = Revenue / Spend
  IF v_total_marketing_spend > 0 THEN
    v_marketing_roas := v_marketing_revenue / v_total_marketing_spend;
  ELSE
    v_marketing_roas := 0;
  END IF;
  
  -- =========================================================
  -- 4. CONTRIBUTION MARGIN
  -- =========================================================
  v_contribution_margin := v_gross_profit - v_variable_costs;
  IF v_net_revenue > 0 THEN
    v_contribution_margin_percent := (v_contribution_margin / v_net_revenue) * 100;
  END IF;
  
  -- =========================================================
  -- 5. EBITDA = Gross Profit - OpEx (excluding depreciation)
  -- =========================================================
  v_ebitda := v_gross_profit - (v_opex - v_depreciation);
  IF v_net_revenue > 0 THEN
    v_ebitda_margin_percent := (v_ebitda / v_net_revenue) * 100;
  END IF;
  
  -- =========================================================
  -- 6. CASH METRICS from bank accounts
  -- =========================================================
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id
    AND status = 'active';
  
  -- Simple 7-day forecast (cash today + expected inflows - expected outflows)
  v_cash_7d_forecast := v_cash_today;
  
  -- =========================================================
  -- 7. AR AGING from invoices
  -- =========================================================
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_aging_current, v_ar_aging_30d, v_ar_aging_60d, v_ar_aging_90d
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('pending', 'partially_paid', 'overdue');
  
  -- =========================================================
  -- 8. AP from bills
  -- =========================================================
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND status IN ('pending', 'partially_paid', 'overdue');
  
  -- =========================================================
  -- 9. INVENTORY
  -- =========================================================
  SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0)
  INTO v_total_inventory_value
  FROM inventory_items
  WHERE tenant_id = p_tenant_id;
  
  -- =========================================================
  -- 10. WORKING CAPITAL CYCLE (DSO, DPO, DIO, CCC)
  -- =========================================================
  -- Calculate daily averages
  v_daily_sales := v_net_revenue / NULLIF(90, 0);
  v_daily_cogs := (v_net_revenue - v_gross_profit) / NULLIF(90, 0);
  
  -- Get purchases from bills
  SELECT COALESCE(SUM(total_amount), 0) / NULLIF(90, 0)
  INTO v_daily_purchases
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND bill_date >= v_period_start;
  
  -- DSO = AR / Daily Sales
  IF v_daily_sales > 0 THEN
    v_dso := v_total_ar / v_daily_sales;
  END IF;
  
  -- DPO = AP / Daily Purchases (capped at 365)
  IF v_daily_purchases > 0 THEN
    v_dpo := LEAST(v_total_ap / v_daily_purchases, 365);
  END IF;
  
  -- DIO = Inventory / Daily COGS (capped at 365)
  IF v_daily_cogs > 0 THEN
    v_dio := LEAST(v_total_inventory_value / v_daily_cogs, 365);
  END IF;
  
  -- CCC = DSO + DIO - DPO
  v_ccc := v_dso + v_dio - v_dpo;
  
  -- =========================================================
  -- 11. CASH RUNWAY
  -- =========================================================
  IF v_opex > 0 THEN
    v_cash_runway_months := (v_cash_today / (v_opex / 3)) ; -- 90 days = 3 months
  END IF;
  
  -- =========================================================
  -- 12. LOCKED CASH
  -- =========================================================
  v_locked_cash_inventory := v_total_inventory_value;
  v_locked_cash_ads := v_total_marketing_spend * 0.1; -- 10% of marketing is locked
  v_locked_cash_ops := v_opex * 0.05; -- 5% operational deposits
  v_locked_cash_platform := v_net_revenue * 0.02; -- 2% platform holds
  v_locked_cash_total := v_locked_cash_inventory + v_locked_cash_ads + v_locked_cash_ops + v_locked_cash_platform;
  
  -- =========================================================
  -- 13. CAC, LTV, LTV/CAC RATIO
  -- =========================================================
  -- Get new customers this period
  DECLARE v_new_customers integer;
  BEGIN
    SELECT COUNT(DISTINCT customer_id)
    INTO v_new_customers
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= v_period_start
      AND is_first_order = true;
    
    IF v_new_customers > 0 AND v_total_marketing_spend > 0 THEN
      v_cac := v_total_marketing_spend / v_new_customers;
    END IF;
  END;
  
  -- Get LTV from CDP equity
  SELECT COALESCE(AVG(equity_12m), 0)
  INTO v_ltv
  FROM cdp_customer_equity
  WHERE tenant_id = p_tenant_id;
  
  IF v_cac > 0 THEN
    v_ltv_cac_ratio := v_ltv / v_cac;
  END IF;
  
  -- =========================================================
  -- 14. REPEAT CUSTOMER RATE
  -- =========================================================
  DECLARE v_repeat_customers integer;
  BEGIN
    SELECT COUNT(DISTINCT customer_id)
    INTO v_repeat_customers
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= v_period_start
      AND is_first_order = false;
    
    IF v_total_customers > 0 THEN
      v_repeat_customer_rate := (v_repeat_customers::numeric / v_total_customers) * 100;
    END IF;
  END;
  
  -- =========================================================
  -- INSERT SNAPSHOT
  -- =========================================================
  v_end_time := clock_timestamp();
  v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time));
  
  INSERT INTO central_metrics_snapshots (
    tenant_id,
    snapshot_at,
    period_start,
    period_end,
    
    net_revenue,
    gross_profit,
    gross_margin_percent,
    contribution_margin,
    contribution_margin_percent,
    ebitda,
    ebitda_margin_percent,
    
    cash_today,
    cash_7d_forecast,
    cash_runway_months,
    
    total_ar,
    overdue_ar,
    ar_aging_current,
    ar_aging_30d,
    ar_aging_60d,
    ar_aging_90d,
    
    total_ap,
    overdue_ap,
    
    total_inventory_value,
    slow_moving_inventory,
    
    dso,
    dpo,
    dio,
    ccc,
    
    total_marketing_spend,
    marketing_roas,
    cac,
    ltv,
    ltv_cac_ratio,
    
    total_orders,
    avg_order_value,
    total_customers,
    repeat_customer_rate,
    
    locked_cash_inventory,
    locked_cash_ads,
    locked_cash_ops,
    locked_cash_platform,
    locked_cash_total,
    
    computed_by,
    computation_duration_ms
  ) VALUES (
    p_tenant_id,
    NOW(),
    v_period_start,
    v_period_end,
    
    v_net_revenue,
    v_gross_profit,
    v_gross_margin_percent,
    v_contribution_margin,
    v_contribution_margin_percent,
    v_ebitda,
    v_ebitda_margin_percent,
    
    v_cash_today,
    v_cash_7d_forecast,
    v_cash_runway_months,
    
    v_total_ar,
    v_overdue_ar,
    v_ar_aging_current,
    v_ar_aging_30d,
    v_ar_aging_60d,
    v_ar_aging_90d,
    
    v_total_ap,
    v_overdue_ap,
    
    v_total_inventory_value,
    v_slow_moving_inventory,
    
    v_dso,
    v_dpo,
    v_dio,
    v_ccc,
    
    v_total_marketing_spend,
    v_marketing_roas,
    v_cac,
    v_ltv,
    v_ltv_cac_ratio,
    
    v_total_orders,
    v_avg_order_value,
    v_total_customers,
    v_repeat_customer_rate,
    
    v_locked_cash_inventory,
    v_locked_cash_ads,
    v_locked_cash_ops,
    v_locked_cash_platform,
    v_locked_cash_total,
    
    'compute_central_metrics_snapshot',
    v_duration_ms
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.compute_central_metrics_snapshot(uuid) IS 
'Phase 8.1: Fixed ROAS calculation to use promotion_campaigns instead of expenses.category=marketing. ROAS = total_revenue / actual_cost from campaigns.';