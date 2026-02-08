
-- Drop both overloads
DROP FUNCTION IF EXISTS public.compute_central_metrics_snapshot(uuid);
DROP FUNCTION IF EXISTS public.compute_central_metrics_snapshot(uuid, date, date);

CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_snapshot_id UUID;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
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
  v_cash_runway_months NUMERIC := 0;

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

  -- Locked Cash
  v_locked_inventory NUMERIC := 0;
  v_locked_ads NUMERIC := 0;
  v_locked_ops NUMERIC := 0;
  v_locked_platform NUMERIC := 0;
  v_locked_total NUMERIC := 0;

  -- Expense metrics
  v_total_opex NUMERIC := 0;
  v_variable_costs NUMERIC := 0;
  v_depreciation NUMERIC := 0;

  -- Marketing
  v_marketing_spend NUMERIC := 0;
  v_marketing_revenue NUMERIC := 0;
  v_marketing_roas NUMERIC := 0;

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

  -- Order/Customer metrics
  v_total_orders INTEGER := 0;
  v_total_customers INTEGER := 0;
  v_avg_order_value NUMERIC := 0;
  v_new_customers INTEGER := 0;
  v_repeat_customers INTEGER := 0;
  v_repeat_customer_rate NUMERIC := 0;
  v_cac NUMERIC := 0;
  v_ltv NUMERIC := 0;
  v_ltv_cac_ratio NUMERIC := 0;
BEGIN
  v_start_time := clock_timestamp();

  -- ✅ FIX 4: Use parameters, not hardcoded 90 days
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');
  v_days_in_period := GREATEST((v_end_date - v_start_date)::INTEGER, 1);

  -- =========================================================
  -- 1. REVENUE from cdp_orders
  -- ✅ FIX 1: Use gross_margin, not gross_profit
  -- =========================================================
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(CASE 
      WHEN gross_margin IS NOT NULL AND gross_margin != 0 THEN gross_margin
      ELSE net_revenue - COALESCE(cogs, 0)
    END), 0),
    COALESCE(SUM(cogs), 0),
    COUNT(*),
    COUNT(DISTINCT customer_id)
  INTO v_net_revenue, v_gross_profit, v_total_cogs, v_total_orders, v_total_customers
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at::date BETWEEN v_start_date AND v_end_date
    AND status NOT IN ('cancelled', 'refunded');

  v_daily_revenue := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_total_cogs / v_days_in_period;
  v_avg_order_value := CASE WHEN v_total_orders > 0 THEN v_net_revenue / v_total_orders ELSE 0 END;
  v_annual_cogs := v_total_cogs * (365.0 / v_days_in_period);

  -- =========================================================
  -- 2. Cash from bank_accounts
  -- =========================================================
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  v_cash_7d_forecast := v_cash_today;

  -- =========================================================
  -- 3. AR from invoices
  -- =========================================================
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('sent','overdue','partial','pending','partially_paid') THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('sent','partial','pending','partially_paid')) THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('sent','overdue','partial','pending','partially_paid');

  -- =========================================================
  -- 4. AP from bills
  -- =========================================================
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending','overdue','partial','partially_paid') THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending','partial','partially_paid')) THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id;

  -- =========================================================
  -- 5. Inventory from products
  -- =========================================================
  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_inventory_value
  FROM products
  WHERE tenant_id = p_tenant_id AND is_active = true;

  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_slow_inventory
  FROM products
  WHERE tenant_id = p_tenant_id 
    AND is_active = true
    AND (last_sale_date IS NULL OR last_sale_date < CURRENT_DATE - INTERVAL '90 days');

  -- =========================================================
  -- 6. Locked Cash
  -- =========================================================
  v_locked_inventory := v_inventory_value;

  BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_locked_ads
    FROM marketing_expenses
    WHERE tenant_id = p_tenant_id
      AND expense_date > CURRENT_DATE - INTERVAL '14 days';
  EXCEPTION WHEN undefined_table THEN
    v_locked_ads := 0;
  END;

  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount,0)), 0)
  INTO v_locked_ops
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND status IN ('pending','partial','overdue')
    AND expense_category IN ('shipping','logistics','fulfillment','delivery');

  SELECT COALESCE(SUM(net_revenue), 0) * 0.85
  INTO v_locked_platform
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at > CURRENT_DATE - INTERVAL '14 days'
    AND LOWER(channel) IN ('shopee','lazada','tiktok shop','tiktok');

  v_locked_total := v_locked_inventory + v_locked_ads + v_locked_ops + v_locked_platform;

  -- =========================================================
  -- 7. Expenses
  -- =========================================================
  SELECT 
    COALESCE(SUM(CASE WHEN category::text IN ('salary','rent','utilities','other','depreciation','other_opex') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_variable = true THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text = 'depreciation' THEN amount ELSE 0 END), 0)
  INTO v_total_opex, v_variable_costs, v_depreciation
  FROM expenses
  WHERE tenant_id = p_tenant_id 
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- =========================================================
  -- 8. MARKETING from promotion_campaigns (NOT expenses)
  -- ✅ FIX 4: Add end-date filter
  -- =========================================================
  SELECT 
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(total_revenue), 0)
  INTO v_marketing_spend, v_marketing_revenue
  FROM promotion_campaigns
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND (status IS NULL OR status != 'cancelled');

  IF v_marketing_spend > 0 THEN
    v_marketing_roas := v_marketing_revenue / v_marketing_spend;
  END IF;

  -- =========================================================
  -- 9. Computed margins
  -- =========================================================
  v_contribution_margin := v_gross_profit - v_variable_costs;
  v_ebitda := v_gross_profit - (v_total_opex - v_depreciation);

  IF v_net_revenue > 0 THEN
    v_gross_margin_pct := (v_gross_profit / v_net_revenue) * 100;
    v_contribution_margin_pct := (v_contribution_margin / v_net_revenue) * 100;
    v_ebitda_margin_pct := (v_ebitda / v_net_revenue) * 100;
  END IF;

  -- =========================================================
  -- 10. Cash cycle (DSO, DPO, DIO, CCC)
  -- =========================================================
  IF v_daily_revenue > 0 THEN
    v_dso := LEAST(v_total_ar / v_daily_revenue, 365);
  END IF;

  IF v_annual_cogs > 0 THEN
    v_dio := LEAST((v_inventory_value / v_annual_cogs) * 365, 365);
    v_dpo := LEAST((v_total_ap / v_annual_cogs) * 365, 365);
  END IF;

  v_ccc := v_dso + v_dio - v_dpo;

  -- =========================================================
  -- 11. Cash Runway
  -- =========================================================
  IF v_total_opex > 0 THEN
    v_cash_runway_months := v_cash_today / (v_total_opex / (v_days_in_period / 30.0));
  END IF;

  -- =========================================================
  -- 12. CAC - ✅ FIX 2: No is_first_order, use MIN(order_at) subquery
  -- =========================================================
  SELECT COUNT(*)
  INTO v_new_customers
  FROM (
    SELECT customer_id
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND customer_id IS NOT NULL
      AND status NOT IN ('cancelled','refunded')
    GROUP BY customer_id
    HAVING MIN(order_at::date) BETWEEN v_start_date AND v_end_date
  ) new_custs;

  IF v_new_customers > 0 AND v_marketing_spend > 0 THEN
    v_cac := v_marketing_spend / v_new_customers;
  END IF;

  -- =========================================================
  -- 13. LTV - ✅ FIX 3: Inline from cdp_orders, no cdp_customer_equity
  -- =========================================================
  SELECT COALESCE(
    AVG(cust_revenue) * AVG(cust_order_count),
    0
  )
  INTO v_ltv
  FROM (
    SELECT 
      customer_id,
      SUM(net_revenue) as cust_revenue,
      COUNT(*) as cust_order_count
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND customer_id IS NOT NULL
      AND status NOT IN ('cancelled','refunded')
    GROUP BY customer_id
  ) cust_stats;

  IF v_cac > 0 THEN
    v_ltv_cac_ratio := v_ltv / v_cac;
  END IF;

  -- =========================================================
  -- 14. Repeat Rate - ✅ FIX 2: No is_first_order
  -- =========================================================
  IF v_total_customers > 0 THEN
    SELECT COUNT(*)
    INTO v_repeat_customers
    FROM (
      SELECT customer_id
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND order_at::date BETWEEN v_start_date AND v_end_date
        AND customer_id IS NOT NULL
        AND status NOT IN ('cancelled','refunded')
      GROUP BY customer_id
      HAVING COUNT(*) > 1
    ) repeat_custs;

    v_repeat_customer_rate := (v_repeat_customers::numeric / v_total_customers) * 100;
  END IF;

  -- =========================================================
  -- INSERT SNAPSHOT
  -- =========================================================
  v_snapshot_id := gen_random_uuid();
  v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;

  INSERT INTO central_metrics_snapshots (
    id, tenant_id, snapshot_at, period_start, period_end,
    net_revenue, gross_profit, contribution_margin, ebitda,
    gross_margin_percent, contribution_margin_percent, ebitda_margin_percent,
    cash_today, cash_7d_forecast, cash_runway_months,
    total_ar, overdue_ar, total_ap, overdue_ap,
    ar_aging_current, ar_aging_30d, ar_aging_60d, ar_aging_90d,
    total_inventory_value, slow_moving_inventory,
    dso, dpo, dio, ccc,
    total_marketing_spend, marketing_roas,
    cac, ltv, ltv_cac_ratio,
    total_orders, avg_order_value, total_customers, repeat_customer_rate,
    locked_cash_inventory, locked_cash_ads, locked_cash_ops, locked_cash_platform, locked_cash_total,
    computed_by, computation_duration_ms,
    created_at
  ) VALUES (
    v_snapshot_id, p_tenant_id, NOW(), v_start_date, v_end_date,
    v_net_revenue, v_gross_profit, v_contribution_margin, v_ebitda,
    v_gross_margin_pct, v_contribution_margin_pct, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d_forecast, v_cash_runway_months,
    v_total_ar, v_overdue_ar, v_total_ap, v_overdue_ap,
    v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_marketing_roas,
    v_cac, v_ltv, v_ltv_cac_ratio,
    v_total_orders, v_avg_order_value, v_total_customers, v_repeat_customer_rate,
    v_locked_inventory, v_locked_ads, v_locked_ops, v_locked_platform, v_locked_total,
    'compute_central_metrics_snapshot', v_duration_ms,
    NOW()
  );

  RETURN v_snapshot_id;
END;
$function$;
