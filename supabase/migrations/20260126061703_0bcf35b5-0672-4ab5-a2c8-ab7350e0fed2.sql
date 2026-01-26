-- Fix compute_central_metrics_snapshot: use correct column name external_order_id instead of order_id
CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id uuid, 
  p_period_start date DEFAULT ((CURRENT_DATE - '90 days'::interval))::date, 
  p_period_end date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_snapshot_id UUID;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_net_revenue NUMERIC := 0;
  v_cogs NUMERIC := 0;
  v_gross_profit NUMERIC := 0;
  v_gross_margin_pct NUMERIC := 0;
  v_contribution_margin NUMERIC := 0;
  v_cm_pct NUMERIC := 0;
  v_ebitda NUMERIC := 0;
  v_ebitda_margin_pct NUMERIC := 0;
  v_cash_today NUMERIC := 0;
  v_cash_7d NUMERIC := 0;
  v_runway_months NUMERIC := 0;
  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_ar_current NUMERIC := 0;
  v_ar_30d NUMERIC := 0;
  v_ar_60d NUMERIC := 0;
  v_ar_90d NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  v_inventory_value NUMERIC := 0;
  v_slow_inventory NUMERIC := 0;
  v_dso NUMERIC := 0;
  v_dpo NUMERIC := 0;
  v_dio NUMERIC := 0;
  v_ccc NUMERIC := 0;
  v_marketing_spend NUMERIC := 0;
  v_roas NUMERIC := 0;
  v_cac NUMERIC := 0;
  v_ltv NUMERIC := 0;
  v_ltv_cac_ratio NUMERIC := 0;
  v_total_orders INTEGER := 0;
  v_aov NUMERIC := 0;
  v_total_customers INTEGER := 0;
  v_repeat_rate NUMERIC := 0;
  v_days_in_period NUMERIC;
  v_daily_revenue NUMERIC;
  v_daily_cogs NUMERIC;
  v_opex NUMERIC := 0;
  v_monthly_burn NUMERIC := 0;
BEGIN
  v_days_in_period := GREATEST(1, p_period_end - p_period_start);

  -- REVENUE from external_orders
  SELECT COALESCE(SUM(
    CASE WHEN status NOT IN ('cancelled', 'returned', 'refunded') 
    THEN total_amount - COALESCE(platform_fee, 0) - COALESCE(shipping_fee, 0) ELSE 0 END
  ), 0) INTO v_net_revenue
  FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end;

  -- COGS from external_order_items (FIX: use external_order_id instead of order_id)
  SELECT COALESCE(SUM(COALESCE(eoi.quantity, 1) * COALESCE(p.unit_cost, eoi.unit_price * 0.6)), 0) INTO v_cogs
  FROM external_order_items eoi
  JOIN external_orders eo ON eoi.external_order_id = eo.id
  LEFT JOIN products p ON eoi.sku = p.sku AND p.tenant_id = p_tenant_id
  WHERE eo.tenant_id = p_tenant_id AND eo.order_date BETWEEN p_period_start AND p_period_end
    AND eo.status NOT IN ('cancelled', 'returned', 'refunded');

  v_gross_profit := v_net_revenue - v_cogs;
  v_gross_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue) * 100 ELSE 0 END;

  -- OPEX from expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_opex
  FROM expenses WHERE tenant_id = p_tenant_id AND expense_date BETWEEN p_period_start AND p_period_end
    AND category NOT IN ('cogs', 'cost_of_goods_sold', 'marketing', 'advertising');

  -- MARKETING SPEND
  SELECT COALESCE(SUM(amount), 0) INTO v_marketing_spend
  FROM expenses WHERE tenant_id = p_tenant_id AND expense_date BETWEEN p_period_start AND p_period_end
    AND category IN ('marketing', 'advertising', 'ads', 'promotion');

  v_contribution_margin := v_gross_profit - v_marketing_spend;
  v_cm_pct := CASE WHEN v_net_revenue > 0 THEN (v_contribution_margin / v_net_revenue) * 100 ELSE 0 END;
  v_ebitda := v_gross_profit - v_opex - v_marketing_spend;
  v_ebitda_margin_pct := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue) * 100 ELSE 0 END;

  -- CASH TODAY from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_today
  FROM bank_accounts WHERE tenant_id = p_tenant_id AND status = 'active';

  -- CASH 7D FORECAST
  SELECT COALESCE(SUM(closing_balance), v_cash_today) INTO v_cash_7d
  FROM cash_forecasts WHERE tenant_id = p_tenant_id AND forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;

  -- AR METRICS from invoices
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE - 1 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date BETWEEN CURRENT_DATE - 60 AND CURRENT_DATE - 31 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM invoices WHERE tenant_id = p_tenant_id AND status != 'paid';

  -- AP METRICS from bills
  SELECT 
    COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'paid' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills WHERE tenant_id = p_tenant_id AND status != 'paid';

  -- INVENTORY
  SELECT COALESCE(SUM(quantity * unit_cost), 0), 
         COALESCE(SUM(CASE WHEN last_sold_at < CURRENT_DATE - 90 THEN quantity * unit_cost ELSE 0 END), 0)
  INTO v_inventory_value, v_slow_inventory
  FROM inventory WHERE tenant_id = p_tenant_id;

  -- WORKING CAPITAL CYCLE
  v_daily_revenue := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_cogs / v_days_in_period;
  
  v_dso := CASE WHEN v_daily_revenue > 0 THEN v_total_ar / v_daily_revenue ELSE 0 END;
  v_dpo := CASE WHEN v_daily_cogs > 0 THEN v_total_ap / v_daily_cogs ELSE 0 END;
  v_dio := CASE WHEN v_daily_cogs > 0 THEN v_inventory_value / v_daily_cogs ELSE 0 END;
  v_ccc := v_dso + v_dio - v_dpo;

  -- ORDERS & CUSTOMERS
  SELECT COUNT(*), COALESCE(AVG(total_amount), 0), COUNT(DISTINCT customer_id)
  INTO v_total_orders, v_aov, v_total_customers
  FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end
    AND status NOT IN ('cancelled', 'returned', 'refunded');

  -- REPEAT RATE
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE order_count > 1))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 0
  ) INTO v_repeat_rate
  FROM (
    SELECT customer_id, COUNT(*) as order_count
    FROM external_orders WHERE tenant_id = p_tenant_id AND order_date BETWEEN p_period_start AND p_period_end
      AND status NOT IN ('cancelled', 'returned', 'refunded')
    GROUP BY customer_id
  ) sub;

  -- CAC & LTV (simplified)
  v_cac := CASE WHEN v_total_customers > 0 THEN v_marketing_spend / v_total_customers ELSE 0 END;
  v_ltv := v_aov * 3; -- Simple estimate: 3 orders lifetime
  v_ltv_cac_ratio := CASE WHEN v_cac > 0 THEN v_ltv / v_cac ELSE 0 END;
  v_roas := CASE WHEN v_marketing_spend > 0 THEN v_net_revenue / v_marketing_spend ELSE 0 END;

  -- RUNWAY
  v_monthly_burn := (v_opex + v_marketing_spend) / (v_days_in_period / 30);
  v_runway_months := CASE WHEN v_monthly_burn > 0 THEN v_cash_today / v_monthly_burn ELSE 99 END;

  -- INSERT SNAPSHOT
  INSERT INTO central_metrics_snapshots (
    tenant_id, snapshot_at, period_start, period_end,
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
    computed_by, computation_duration_ms
  ) VALUES (
    p_tenant_id, NOW(), p_period_start, p_period_end,
    v_net_revenue, v_gross_profit, v_gross_margin_pct,
    v_contribution_margin, v_cm_pct,
    v_ebitda, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d, v_runway_months,
    v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    v_total_ap, v_overdue_ap,
    v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_roas, v_cac, v_ltv, v_ltv_cac_ratio,
    v_total_orders, v_aov, v_total_customers, v_repeat_rate,
    'compute_central_metrics_snapshot', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  ) RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$function$;