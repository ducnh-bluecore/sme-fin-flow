
CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  v_snapshot_id UUID;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_days_in_period INTEGER;

  v_net_revenue NUMERIC := 0;
  v_gross_profit NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_daily_revenue NUMERIC := 0;
  v_daily_cogs NUMERIC := 0;
  v_annual_cogs NUMERIC := 0;
  v_estimated_annual_cogs NUMERIC := 0;
  v_cogs_ratio NUMERIC := 0;

  v_cash_today NUMERIC := 0;
  v_cash_7d_forecast NUMERIC := 0;
  v_cash_runway_months NUMERIC := 0;

  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  v_ar_current NUMERIC := 0;
  v_ar_30d NUMERIC := 0;
  v_ar_60d NUMERIC := 0;
  v_ar_90d NUMERIC := 0;

  v_inventory_value NUMERIC := 0;
  v_slow_inventory NUMERIC := 0;

  v_locked_inventory NUMERIC := 0;
  v_locked_ads NUMERIC := 0;
  v_locked_ops NUMERIC := 0;
  v_locked_platform NUMERIC := 0;
  v_locked_total NUMERIC := 0;

  v_total_opex NUMERIC := 0;
  v_variable_costs NUMERIC := 0;
  v_depreciation NUMERIC := 0;

  v_marketing_spend NUMERIC := 0;
  v_marketing_revenue NUMERIC := 0;
  v_marketing_roas NUMERIC := 0;

  v_contribution_margin NUMERIC := 0;
  v_ebitda NUMERIC := 0;
  v_gross_margin_pct NUMERIC := 0;
  v_contribution_margin_pct NUMERIC := 0;
  v_ebitda_margin_pct NUMERIC := 0;
  v_dso NUMERIC := 0;
  v_dpo NUMERIC := 0;
  v_dio NUMERIC := 0;
  v_ccc NUMERIC := 0;

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

  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');
  v_days_in_period := GREATEST((v_end_date - v_start_date)::INTEGER, 1);

  -- 1. REVENUE from cdp_orders
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
  v_avg_order_value := CASE WHEN v_total_orders > 0 THEN v_net_revenue / v_total_orders ELSE 0 END;

  -- BETTER COGS: Use cdp_order_items.line_cogs for more accurate COGS estimation
  SELECT 
    COALESCE(SUM(oi.line_cogs), 0),
    CASE WHEN SUM(oi.line_revenue) > 0 
      THEN SUM(oi.line_cogs) / SUM(oi.line_revenue) 
      ELSE 0 
    END
  INTO v_estimated_annual_cogs, v_cogs_ratio
  FROM cdp_order_items oi
  WHERE oi.tenant_id = p_tenant_id
    AND oi.line_cogs > 0 AND oi.line_revenue > 0;

  -- Use the better COGS if cdp_orders COGS is too low (< 5% of revenue = incomplete)
  IF v_total_cogs < v_net_revenue * 0.05 AND v_cogs_ratio > 0 THEN
    v_total_cogs := v_net_revenue * v_cogs_ratio;
    v_gross_profit := v_net_revenue - v_total_cogs;
  END IF;

  v_daily_cogs := v_total_cogs / v_days_in_period;
  v_annual_cogs := v_total_cogs * (365.0 / v_days_in_period);

  -- 2. Cash from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';
  v_cash_7d_forecast := v_cash_today;

  -- 3. RETAIL AR: orders in-transit/pending settlement
  SELECT COALESCE(SUM(net_revenue), 0)
  INTO v_total_ar
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= CURRENT_DATE - INTERVAL '60 days'
    AND LOWER(status) NOT IN (
      'cancelled', 'canceled', 'refunded', 'delivered', 'completed',
      'successful_delivery', 'returned', 'shipped_back', 'shipped_back_success',
      '1', '5', '130', '140', '122', '121'
    )
    AND LOWER(status) IN (
      '2', '3', 'shipped', 'confirmed', 'packed',
      'ready_to_ship', 'processed', 'to_confirm_receive',
      'delivering', 'in_transit', 'unpaid', 'to_return'
    );

  -- AR aging buckets
  SELECT 
    COALESCE(SUM(CASE WHEN order_at::date >= CURRENT_DATE - 7 THEN net_revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN order_at::date < CURRENT_DATE - 7 AND order_at::date >= CURRENT_DATE - 14 THEN net_revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN order_at::date < CURRENT_DATE - 14 AND order_at::date >= CURRENT_DATE - 30 THEN net_revenue ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN order_at::date < CURRENT_DATE - 30 THEN net_revenue ELSE 0 END), 0)
  INTO v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= CURRENT_DATE - INTERVAL '60 days'
    AND LOWER(status) NOT IN (
      'cancelled', 'canceled', 'refunded', 'delivered', 'completed',
      'successful_delivery', 'returned', 'shipped_back', 'shipped_back_success',
      '1', '5', '130', '140', '122', '121'
    )
    AND LOWER(status) IN (
      '2', '3', 'shipped', 'confirmed', 'packed',
      'ready_to_ship', 'processed', 'to_confirm_receive',
      'delivering', 'in_transit', 'unpaid', 'to_return'
    );

  -- Overdue AR
  SELECT COALESCE(SUM(net_revenue), 0)
  INTO v_overdue_ar
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at >= CURRENT_DATE - INTERVAL '60 days'
    AND order_at < CURRENT_DATE - INTERVAL '14 days'
    AND LOWER(status) NOT IN (
      'cancelled', 'canceled', 'refunded', 'delivered', 'completed',
      'successful_delivery', 'returned', 'shipped_back', 'shipped_back_success',
      '1', '5', '130', '140', '122', '121'
    )
    AND LOWER(status) IN (
      '2', '3', 'shipped', 'confirmed', 'packed',
      'ready_to_ship', 'processed', 'to_confirm_receive',
      'delivering', 'in_transit', 'unpaid', 'to_return'
    );

  -- 4. AP from bills
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending','overdue','partial','partially_paid') THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending','partial','partially_paid')) THEN total_amount - COALESCE(paid_amount,0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id;

  -- 5. Inventory from inv_state_positions
  SELECT COALESCE(SUM(isp.on_hand * p.cost_price), 0)
  INTO v_inventory_value
  FROM inv_state_positions isp
  JOIN products p ON p.sku = isp.sku AND p.tenant_id = isp.tenant_id
  WHERE isp.tenant_id = p_tenant_id AND isp.on_hand > 0;

  -- Slow-moving: use inv_state_demand (aggregate by SKU first to avoid duplicates)
  SELECT COALESCE(SUM(isp.on_hand * p.cost_price), 0)
  INTO v_slow_inventory
  FROM inv_state_positions isp
  JOIN products p ON p.sku = isp.sku AND p.tenant_id = isp.tenant_id
  LEFT JOIN (
    SELECT sku, tenant_id, MAX(avg_daily_sales) as max_daily_sales
    FROM inv_state_demand
    WHERE tenant_id = p_tenant_id
    GROUP BY sku, tenant_id
  ) d ON d.sku = isp.sku AND d.tenant_id = isp.tenant_id
  WHERE isp.tenant_id = p_tenant_id AND isp.on_hand > 0
    AND (d.max_daily_sales IS NULL OR d.max_daily_sales < 0.1);

  -- 6. Locked Cash
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

  v_locked_platform := v_total_ar;
  v_locked_total := v_locked_inventory + v_locked_ads + v_locked_ops + v_locked_platform;

  -- 7. Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category::text IN ('salary','rent','utilities','other','depreciation','other_opex') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text IN ('shipping','logistics','packaging','commission','payment_fee') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text = 'depreciation' THEN amount ELSE 0 END), 0)
  INTO v_total_opex, v_variable_costs, v_depreciation
  FROM expenses
  WHERE tenant_id = p_tenant_id 
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- 8. Marketing
  SELECT 
    COALESCE(SUM(actual_cost), 0),
    COALESCE(SUM(total_revenue), 0)
  INTO v_marketing_spend, v_marketing_revenue
  FROM promotion_campaigns
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_start_date
    AND created_at <= v_end_date
    AND (status IS NULL OR status != 'cancelled');

  v_marketing_roas := CASE WHEN v_marketing_spend > 0 THEN v_marketing_revenue / v_marketing_spend ELSE 0 END;

  -- 9. NEW / REPEAT customers
  SELECT COUNT(DISTINCT customer_id)
  INTO v_new_customers
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('cancelled', 'refunded')
    AND customer_id IN (
      SELECT customer_id FROM cdp_orders
      WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled', 'refunded')
      GROUP BY customer_id
      HAVING MIN(order_at::date) BETWEEN v_start_date AND v_end_date
    )
    AND order_at::date BETWEEN v_start_date AND v_end_date;

  v_repeat_customers := GREATEST(v_total_customers - v_new_customers, 0);
  v_repeat_customer_rate := CASE WHEN v_total_customers > 0 THEN (v_repeat_customers::NUMERIC / v_total_customers) * 100 ELSE 0 END;

  v_cac := CASE WHEN v_new_customers > 0 THEN v_marketing_spend / v_new_customers ELSE 0 END;

  -- LTV inline
  SELECT COALESCE(AVG(cust_revenue) * AVG(cust_orders), 0)
  INTO v_ltv
  FROM (
    SELECT customer_id, SUM(net_revenue) AS cust_revenue, COUNT(*) AS cust_orders
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled', 'refunded')
    GROUP BY customer_id
  ) sub;

  v_ltv_cac_ratio := CASE WHEN v_cac > 0 THEN v_ltv / v_cac ELSE 0 END;

  -- 10. DERIVED METRICS
  v_contribution_margin := v_gross_profit - v_marketing_spend - v_variable_costs;
  v_ebitda := v_contribution_margin - v_total_opex + v_depreciation;

  v_gross_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue) * 100 ELSE 0 END;
  v_contribution_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_contribution_margin / v_net_revenue) * 100 ELSE 0 END;
  v_ebitda_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue) * 100 ELSE 0 END;

  -- DSO, DPO, DIO, CCC
  v_dso := CASE WHEN v_daily_revenue > 0 THEN v_total_ar / v_daily_revenue ELSE 0 END;
  v_dpo := CASE WHEN v_daily_cogs > 0 THEN v_total_ap / v_daily_cogs ELSE 0 END;
  v_dio := CASE WHEN v_daily_cogs > 0 THEN v_inventory_value / v_daily_cogs ELSE 0 END;
  v_ccc := v_dso + v_dio - v_dpo;

  -- Cash runway
  v_cash_runway_months := CASE 
    WHEN (v_total_opex + v_variable_costs + v_marketing_spend) > 0 
    THEN v_cash_today / ((v_total_opex + v_variable_costs + v_marketing_spend) / GREATEST(v_days_in_period / 30.0, 1))
    ELSE NULL 
  END;

  v_duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  INSERT INTO central_metrics_snapshots (
    id, tenant_id, snapshot_at,
    net_revenue, gross_profit, gross_margin_percent,
    contribution_margin, contribution_margin_percent,
    ebitda, ebitda_margin_percent,
    cash_today, cash_7d_forecast, cash_runway_months,
    total_ar, overdue_ar, ar_aging_current, ar_aging_30d, ar_aging_60d, ar_aging_90d,
    total_ap, overdue_ap,
    total_inventory_value, slow_moving_inventory,
    dso, dpo, dio, ccc,
    total_marketing_spend, marketing_roas, cac, ltv, ltv_cac_ratio,
    total_orders, avg_order_value, total_customers, repeat_customer_rate,
    period_start, period_end, computed_by, computation_duration_ms,
    compute_version, compute_function,
    locked_cash_inventory, locked_cash_ads, locked_cash_ops, locked_cash_platform, locked_cash_total
  ) VALUES (
    gen_random_uuid(), p_tenant_id, NOW(),
    v_net_revenue, v_gross_profit, v_gross_margin_pct,
    v_contribution_margin, v_contribution_margin_pct,
    v_ebitda, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d_forecast, v_cash_runway_months,
    v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    v_total_ap, v_overdue_ap,
    v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_marketing_roas, v_cac, v_ltv, v_ltv_cac_ratio,
    v_total_orders, v_avg_order_value, v_total_customers, v_repeat_customer_rate,
    v_start_date, v_end_date, 'compute_central_metrics_snapshot', v_duration_ms,
    'v1.3', 'compute_central_metrics_snapshot',
    v_locked_inventory, v_locked_ads, v_locked_ops, v_locked_platform, v_locked_total
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;
