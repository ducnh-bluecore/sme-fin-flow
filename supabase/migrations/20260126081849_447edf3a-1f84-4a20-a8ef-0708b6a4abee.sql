
-- ============================================================================
-- FIX V5: populate_finance_monthly_summary - wrap all nullable outputs with COALESCE
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_finance_monthly_summary(
  p_tenant_id uuid,
  p_year_month text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_month date;
  v_end_month date;
  v_inserted integer := 0;
  v_month_rec record;
  v_days_in_month integer;
BEGIN
  IF p_year_month IS NULL THEN
    v_start_month := (SELECT DATE_TRUNC('month', MIN(order_at))::date FROM cdp_orders WHERE tenant_id = p_tenant_id);
    v_end_month := (SELECT DATE_TRUNC('month', MAX(order_at))::date FROM cdp_orders WHERE tenant_id = p_tenant_id);
  ELSE
    v_start_month := (p_year_month || '-01')::date;
    v_end_month := v_start_month;
  END IF;

  IF v_start_month IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_month_rec IN 
    SELECT 
      DATE_TRUNC('month', d)::date as month_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::date as month_end,
      TO_CHAR(d, 'YYYY-MM') as year_month
    FROM generate_series(v_start_month, v_end_month, INTERVAL '1 month') d
  LOOP
    v_days_in_month := EXTRACT(DAY FROM (v_month_rec.month_end))::integer;
    
    DELETE FROM finance_monthly_summary
    WHERE tenant_id = p_tenant_id AND year_month = v_month_rec.year_month;

    INSERT INTO finance_monthly_summary (
      tenant_id, year_month, month_start, month_end,
      net_revenue, gross_profit, gross_margin_percent, contribution_margin, ebitda,
      cogs, marketing_spend, operating_expenses,
      cash_inflows, cash_outflows, net_cash_flow, closing_cash,
      ar_balance, ap_balance, inventory_balance,
      dso, dpo, dio, ccc,
      order_count, customer_count, avg_order_value,
      roas, cac, computed_at
    )
    SELECT 
      p_tenant_id,
      v_month_rec.year_month,
      v_month_rec.month_start,
      v_month_rec.month_end,
      COALESCE(order_agg.net_revenue, 0),
      COALESCE(order_agg.gross_profit, 0),
      COALESCE(order_agg.gross_margin_percent, 0),
      COALESCE(order_agg.gross_profit - exp_agg.marketing_spend, 0),
      COALESCE(order_agg.gross_profit - exp_agg.operating_expenses, 0),
      COALESCE(order_agg.total_cogs, 0),
      COALESCE(exp_agg.marketing_spend, 0),
      COALESCE(exp_agg.operating_expenses, 0),
      COALESCE(order_agg.net_revenue, 0),
      COALESCE(exp_agg.total_expenses, 0),
      COALESCE(order_agg.net_revenue, 0) - COALESCE(exp_agg.total_expenses, 0),
      0,
      COALESCE(order_agg.net_revenue * 0.15, 0),
      COALESCE(exp_agg.total_expenses * 0.20, 0),
      COALESCE(order_agg.total_cogs * 0.5, 0),
      COALESCE(CASE WHEN order_agg.daily_revenue > 0 
        THEN ROUND((order_agg.net_revenue * 0.15 / order_agg.daily_revenue)::numeric, 1)
        ELSE 30 
      END, 30),
      COALESCE(CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((exp_agg.total_expenses * 0.20 / order_agg.daily_cogs)::numeric, 1)
        ELSE 45 
      END, 45),
      COALESCE(CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((order_agg.total_cogs * 0.5 / order_agg.daily_cogs)::numeric, 1)
        ELSE 30 
      END, 30),
      0,
      COALESCE(order_agg.order_count, 0),
      COALESCE(order_agg.customer_count, 0),
      COALESCE(order_agg.avg_order_value, 0),
      -- ROAS: wrap with COALESCE to handle null
      COALESCE(
        CASE WHEN exp_agg.marketing_spend > 0 
          THEN ROUND((order_agg.net_revenue / exp_agg.marketing_spend)::numeric, 2)
          ELSE 0 
        END, 
        0
      ),
      -- CAC: wrap with COALESCE
      COALESCE(
        CASE WHEN order_agg.customer_count > 0 
          THEN ROUND((exp_agg.marketing_spend / (order_agg.customer_count * 0.3))::numeric, 0)
          ELSE 0 
        END,
        0
      ),
      NOW()
    FROM (
      SELECT 
        COALESCE(SUM(net_revenue), 0) as net_revenue,
        COALESCE(SUM(gross_margin), 0) as gross_profit,
        CASE WHEN SUM(net_revenue) > 0 
          THEN ROUND((SUM(gross_margin) / SUM(net_revenue) * 100)::numeric, 2)
          ELSE 0 
        END as gross_margin_percent,
        COALESCE(SUM(cogs), 0) as total_cogs,
        CASE WHEN v_days_in_month > 0 
          THEN COALESCE(SUM(net_revenue), 0) / v_days_in_month 
          ELSE 0 
        END as daily_revenue,
        CASE WHEN v_days_in_month > 0 
          THEN COALESCE(SUM(cogs), 0) / v_days_in_month 
          ELSE 0 
        END as daily_cogs,
        COALESCE(COUNT(DISTINCT id), 0)::integer as order_count,
        COALESCE(COUNT(DISTINCT customer_id), 0)::integer as customer_count,
        CASE WHEN COUNT(DISTINCT id) > 0 
          THEN ROUND((SUM(net_revenue) / COUNT(DISTINCT id))::numeric, 0)
          ELSE 0 
        END as avg_order_value
      FROM cdp_orders
      WHERE tenant_id = p_tenant_id
        AND DATE(order_at) >= v_month_rec.month_start
        AND DATE(order_at) <= v_month_rec.month_end
    ) order_agg
    CROSS JOIN (
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN category = 'marketing' THEN amount ELSE 0 END), 0) as marketing_spend,
        COALESCE(SUM(CASE WHEN category NOT IN ('marketing', 'cogs') THEN amount ELSE 0 END), 0) as operating_expenses
      FROM expenses
      WHERE tenant_id = p_tenant_id
        AND expense_date >= v_month_rec.month_start
        AND expense_date <= v_month_rec.month_end
    ) exp_agg;

    v_inserted := v_inserted + 1;
  END LOOP;

  UPDATE finance_monthly_summary
  SET ccc = dso + dio - dpo
  WHERE tenant_id = p_tenant_id
    AND (p_year_month IS NULL OR year_month = p_year_month);

  UPDATE finance_monthly_summary fms
  SET revenue_mom_change = CASE 
    WHEN prev.net_revenue > 0 
    THEN ROUND(((fms.net_revenue - prev.net_revenue) / prev.net_revenue * 100)::numeric, 2)
    ELSE NULL 
  END
  FROM finance_monthly_summary prev
  WHERE fms.tenant_id = p_tenant_id
    AND prev.tenant_id = p_tenant_id
    AND prev.year_month = TO_CHAR((fms.month_start - INTERVAL '1 month')::date, 'YYYY-MM')
    AND (p_year_month IS NULL OR fms.year_month = p_year_month);

  UPDATE finance_monthly_summary fms
  SET revenue_yoy_change = CASE 
    WHEN prev.net_revenue > 0 
    THEN ROUND(((fms.net_revenue - prev.net_revenue) / prev.net_revenue * 100)::numeric, 2)
    ELSE NULL 
  END
  FROM finance_monthly_summary prev
  WHERE fms.tenant_id = p_tenant_id
    AND prev.tenant_id = p_tenant_id
    AND prev.year_month = TO_CHAR((fms.month_start - INTERVAL '1 year')::date, 'YYYY-MM')
    AND (p_year_month IS NULL OR fms.year_month = p_year_month);

  RETURN v_inserted;
END;
$$;
