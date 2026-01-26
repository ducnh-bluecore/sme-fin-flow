
-- ============================================================================
-- FIX V3: populate_central_metric_facts and populate_finance_monthly_summary
-- Match actual cdp_orders schema: cogs (not total_cogs), no quantity, no contribution_margin
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_central_metric_facts(
  p_tenant_id uuid,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_inserted integer := 0;
BEGIN
  v_end_date := COALESCE(p_period_end, CURRENT_DATE);
  v_start_date := COALESCE(p_period_start, v_end_date - INTERVAL '30 days');

  DELETE FROM central_metric_facts
  WHERE tenant_id = p_tenant_id
    AND period_start = v_start_date
    AND period_end = v_end_date;

  -- SKU-level facts from cdp_order_items
  INSERT INTO central_metric_facts (
    tenant_id, grain_type, grain_id, grain_name,
    revenue, cost, profit, margin_percent,
    quantity, order_count, period_start, period_end
  )
  SELECT 
    p_tenant_id,
    'sku' as grain_type,
    COALESCE(oi.product_id, 'UNKNOWN') as grain_id,
    COALESCE(oi.product_id, 'Unknown Product') as grain_name,
    COALESCE(SUM(oi.line_revenue), 0) as revenue,
    COALESCE(SUM(oi.line_cogs), 0) as cost,
    COALESCE(SUM(oi.line_margin), 0) as profit,
    CASE WHEN SUM(oi.line_revenue) > 0 
      THEN ROUND((SUM(oi.line_margin) / SUM(oi.line_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    COALESCE(SUM(oi.qty), 0)::integer as quantity,
    COUNT(DISTINCT oi.order_id)::integer as order_count,
    v_start_date,
    v_end_date
  FROM cdp_order_items oi
  JOIN cdp_orders co ON co.id = oi.order_id AND co.tenant_id = oi.tenant_id
  WHERE oi.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date
  GROUP BY oi.product_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Channel-level facts from cdp_orders (use cogs, not total_cogs)
  INSERT INTO central_metric_facts (
    tenant_id, grain_type, grain_id, grain_name,
    revenue, cost, profit, margin_percent,
    quantity, order_count, period_start, period_end
  )
  SELECT 
    p_tenant_id,
    'channel' as grain_type,
    COALESCE(co.channel, 'direct') as grain_id,
    INITCAP(COALESCE(co.channel, 'Direct')) as grain_name,
    COALESCE(SUM(co.net_revenue), 0) as revenue,
    COALESCE(SUM(co.cogs), 0) as cost,
    COALESCE(SUM(co.gross_margin), 0) as profit,
    CASE WHEN SUM(co.net_revenue) > 0 
      THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    COUNT(DISTINCT co.id)::integer as quantity,  -- No quantity column, use order count
    COUNT(DISTINCT co.id)::integer as order_count,
    v_start_date,
    v_end_date
  FROM cdp_orders co
  WHERE co.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date
  GROUP BY co.channel;

  v_inserted := v_inserted + (SELECT COUNT(*) FROM central_metric_facts 
    WHERE tenant_id = p_tenant_id AND grain_type = 'channel' 
    AND period_start = v_start_date AND period_end = v_end_date);

  -- Update ranks
  UPDATE central_metric_facts cmf
  SET 
    revenue_rank = sub.rev_rank,
    profit_rank = sub.prof_rank
  FROM (
    SELECT 
      id,
      RANK() OVER (PARTITION BY grain_type ORDER BY revenue DESC) as rev_rank,
      RANK() OVER (PARTITION BY grain_type ORDER BY profit DESC) as prof_rank
    FROM central_metric_facts
    WHERE tenant_id = p_tenant_id
      AND period_start = v_start_date
      AND period_end = v_end_date
  ) sub
  WHERE cmf.id = sub.id;

  RETURN v_inserted;
END;
$$;

-- ============================================================================
-- FIX V3: populate_finance_monthly_summary
-- cdp_orders has: cogs (not total_cogs), gross_margin (not contribution_margin)
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
      -- contribution_margin = gross_margin - marketing (estimate)
      COALESCE(order_agg.gross_profit - exp_agg.marketing_spend, 0),
      -- ebitda = gross_profit - operating_expenses
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
      CASE WHEN order_agg.daily_revenue > 0 
        THEN ROUND((order_agg.net_revenue * 0.15 / order_agg.daily_revenue)::numeric, 1)
        ELSE 30 
      END,
      CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((exp_agg.total_expenses * 0.20 / order_agg.daily_cogs)::numeric, 1)
        ELSE 45 
      END,
      CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((order_agg.total_cogs * 0.5 / order_agg.daily_cogs)::numeric, 1)
        ELSE 30 
      END,
      0,
      COALESCE(order_agg.order_count, 0),
      COALESCE(order_agg.customer_count, 0),
      COALESCE(order_agg.avg_order_value, 0),
      CASE WHEN exp_agg.marketing_spend > 0 
        THEN ROUND((order_agg.net_revenue / NULLIF(exp_agg.marketing_spend, 0))::numeric, 2)
        ELSE 0 
      END,
      CASE WHEN order_agg.customer_count > 0 
        THEN ROUND((exp_agg.marketing_spend / NULLIF(order_agg.customer_count * 0.3, 0))::numeric, 0)
        ELSE 0 
      END,
      NOW()
    FROM (
      SELECT 
        SUM(net_revenue) as net_revenue,
        SUM(gross_margin) as gross_profit,
        CASE WHEN SUM(net_revenue) > 0 
          THEN ROUND((SUM(gross_margin) / SUM(net_revenue) * 100)::numeric, 2)
          ELSE 0 
        END as gross_margin_percent,
        SUM(cogs) as total_cogs,
        SUM(net_revenue) / NULLIF(EXTRACT(DAY FROM v_month_rec.month_end - v_month_rec.month_start + 1), 0) as daily_revenue,
        SUM(cogs) / NULLIF(EXTRACT(DAY FROM v_month_rec.month_end - v_month_rec.month_start + 1), 0) as daily_cogs,
        COUNT(DISTINCT id)::integer as order_count,
        COUNT(DISTINCT customer_id)::integer as customer_count,
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
