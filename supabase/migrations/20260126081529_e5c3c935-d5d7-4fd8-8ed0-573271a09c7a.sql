
-- ============================================================================
-- RPC 1: populate_central_metric_facts
-- Aggregates metrics by grain (SKU, Channel, Customer Segment) from cdp_orders
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

  -- Clear existing facts for this period
  DELETE FROM central_metric_facts
  WHERE tenant_id = p_tenant_id
    AND period_start = v_start_date
    AND period_end = v_end_date;

  -- Insert SKU-level facts
  INSERT INTO central_metric_facts (
    tenant_id, grain_type, grain_id, grain_name,
    revenue, cost, profit, margin_percent,
    quantity, order_count, period_start, period_end
  )
  SELECT 
    p_tenant_id,
    'sku' as grain_type,
    COALESCE(oi.sku, 'UNKNOWN') as grain_id,
    COALESCE(oi.product_name, oi.sku, 'Unknown Product') as grain_name,
    COALESCE(SUM(oi.line_total), 0) as revenue,
    COALESCE(SUM(oi.cogs_amount), 0) as cost,
    COALESCE(SUM(oi.line_total - COALESCE(oi.cogs_amount, 0)), 0) as profit,
    CASE WHEN SUM(oi.line_total) > 0 
      THEN ROUND(((SUM(oi.line_total) - SUM(COALESCE(oi.cogs_amount, 0))) / SUM(oi.line_total) * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    COALESCE(SUM(oi.quantity), 0)::integer as quantity,
    COUNT(DISTINCT oi.order_id)::integer as order_count,
    v_start_date,
    v_end_date
  FROM cdp_order_items oi
  JOIN cdp_orders co ON co.id = oi.order_id AND co.tenant_id = oi.tenant_id
  WHERE oi.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date
  GROUP BY oi.sku, oi.product_name;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Insert Channel-level facts
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
    COALESCE(SUM(co.total_cogs), 0) as cost,
    COALESCE(SUM(co.gross_margin), 0) as profit,
    CASE WHEN SUM(co.net_revenue) > 0 
      THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    COALESCE(SUM(co.quantity), 0)::integer as quantity,
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

COMMENT ON FUNCTION populate_central_metric_facts IS 
'Populate Central Metric Facts - Aggregates SKU and Channel metrics from cdp_orders/cdp_order_items';

-- ============================================================================
-- RPC 2: populate_finance_monthly_summary
-- Aggregates monthly finance data from cdp_orders + expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_finance_monthly_summary(
  p_tenant_id uuid,
  p_year_month text DEFAULT NULL  -- Format: 'YYYY-MM'
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
  -- If no month specified, populate all months from cdp_orders
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

  -- Loop through each month
  FOR v_month_rec IN 
    SELECT 
      DATE_TRUNC('month', d)::date as month_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::date as month_end,
      TO_CHAR(d, 'YYYY-MM') as year_month
    FROM generate_series(v_start_month, v_end_month, INTERVAL '1 month') d
  LOOP
    -- Delete existing record for this month
    DELETE FROM finance_monthly_summary
    WHERE tenant_id = p_tenant_id AND year_month = v_month_rec.year_month;

    -- Insert aggregated data
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
      -- Revenue metrics from cdp_orders
      COALESCE(order_agg.net_revenue, 0),
      COALESCE(order_agg.gross_profit, 0),
      COALESCE(order_agg.gross_margin_percent, 0),
      COALESCE(order_agg.contribution_margin, 0),
      COALESCE(order_agg.gross_profit - COALESCE(exp_agg.operating_expenses, 0), 0) as ebitda,
      -- Cost metrics
      COALESCE(order_agg.total_cogs, 0),
      COALESCE(exp_agg.marketing_spend, 0),
      COALESCE(exp_agg.operating_expenses, 0),
      -- Cash flow (simplified: revenue in, expenses out)
      COALESCE(order_agg.net_revenue, 0) as cash_inflows,
      COALESCE(exp_agg.total_expenses, 0) as cash_outflows,
      COALESCE(order_agg.net_revenue, 0) - COALESCE(exp_agg.total_expenses, 0) as net_cash_flow,
      0 as closing_cash, -- Would need running balance
      -- Balance sheet items (estimates)
      COALESCE(order_agg.net_revenue * 0.15, 0) as ar_balance, -- 15% outstanding
      COALESCE(exp_agg.total_expenses * 0.20, 0) as ap_balance, -- 20% unpaid
      COALESCE(order_agg.total_cogs * 0.5, 0) as inventory_balance, -- 0.5 months stock
      -- Cycle metrics
      CASE WHEN order_agg.daily_revenue > 0 
        THEN ROUND((order_agg.net_revenue * 0.15 / order_agg.daily_revenue)::numeric, 1)
        ELSE 30 
      END as dso,
      CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((exp_agg.total_expenses * 0.20 / order_agg.daily_cogs)::numeric, 1)
        ELSE 45 
      END as dpo,
      CASE WHEN order_agg.daily_cogs > 0 
        THEN ROUND((order_agg.total_cogs * 0.5 / order_agg.daily_cogs)::numeric, 1)
        ELSE 30 
      END as dio,
      0 as ccc, -- Will calculate: DSO + DIO - DPO
      -- Volume metrics
      COALESCE(order_agg.order_count, 0),
      COALESCE(order_agg.customer_count, 0),
      COALESCE(order_agg.avg_order_value, 0),
      -- Marketing metrics
      CASE WHEN exp_agg.marketing_spend > 0 
        THEN ROUND((order_agg.net_revenue / NULLIF(exp_agg.marketing_spend, 0))::numeric, 2)
        ELSE 0 
      END as roas,
      CASE WHEN order_agg.new_customers > 0 
        THEN ROUND((exp_agg.marketing_spend / NULLIF(order_agg.new_customers, 0))::numeric, 0)
        ELSE 0 
      END as cac,
      NOW()
    FROM (
      -- Order aggregation
      SELECT 
        SUM(net_revenue) as net_revenue,
        SUM(gross_margin) as gross_profit,
        CASE WHEN SUM(net_revenue) > 0 
          THEN ROUND((SUM(gross_margin) / SUM(net_revenue) * 100)::numeric, 2)
          ELSE 0 
        END as gross_margin_percent,
        SUM(contribution_margin) as contribution_margin,
        SUM(total_cogs) as total_cogs,
        SUM(net_revenue) / NULLIF(EXTRACT(DAY FROM v_month_rec.month_end - v_month_rec.month_start + 1), 0) as daily_revenue,
        SUM(total_cogs) / NULLIF(EXTRACT(DAY FROM v_month_rec.month_end - v_month_rec.month_start + 1), 0) as daily_cogs,
        COUNT(DISTINCT id) as order_count,
        COUNT(DISTINCT customer_id) as customer_count,
        COUNT(DISTINCT CASE WHEN is_first_order THEN customer_id END) as new_customers,
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
      -- Expense aggregation
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

  -- Update CCC = DSO + DIO - DPO
  UPDATE finance_monthly_summary
  SET ccc = dso + dio - dpo
  WHERE tenant_id = p_tenant_id
    AND (p_year_month IS NULL OR year_month = p_year_month);

  -- Update MoM change
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

  -- Update YoY change
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

COMMENT ON FUNCTION populate_finance_monthly_summary IS 
'Populate Finance Monthly Summary - Aggregates revenue from cdp_orders + expenses by month. Calculates DSO, DPO, DIO, CCC, ROAS, CAC.';
