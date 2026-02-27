
-- RPC to aggregate pl_report_cache rows in DB instead of client-side .reduce()
CREATE OR REPLACE FUNCTION public.get_pl_cache_aggregated(
  p_tenant_id UUID,
  p_start_year INT,
  p_end_year INT
)
RETURNS TABLE(
  invoice_revenue NUMERIC,
  contract_revenue NUMERIC,
  integrated_revenue NUMERIC,
  opex_salaries NUMERIC,
  opex_rent NUMERIC,
  opex_utilities NUMERIC,
  opex_marketing NUMERIC,
  opex_depreciation NUMERIC,
  opex_insurance NUMERIC,
  opex_supplies NUMERIC,
  opex_maintenance NUMERIC,
  opex_professional NUMERIC,
  opex_other NUMERIC,
  sales_returns NUMERIC,
  sales_discounts NUMERIC,
  other_income NUMERIC,
  interest_expense NUMERIC,
  income_before_tax NUMERIC,
  income_tax NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(c.invoice_revenue), 0)::NUMERIC,
    COALESCE(SUM(c.contract_revenue), 0)::NUMERIC,
    COALESCE(SUM(c.integrated_revenue), 0)::NUMERIC,
    COALESCE(SUM(c.opex_salaries), 0)::NUMERIC,
    COALESCE(SUM(c.opex_rent), 0)::NUMERIC,
    COALESCE(SUM(c.opex_utilities), 0)::NUMERIC,
    COALESCE(SUM(c.opex_marketing), 0)::NUMERIC,
    COALESCE(SUM(c.opex_depreciation), 0)::NUMERIC,
    COALESCE(SUM(c.opex_insurance), 0)::NUMERIC,
    COALESCE(SUM(c.opex_supplies), 0)::NUMERIC,
    COALESCE(SUM(c.opex_maintenance), 0)::NUMERIC,
    COALESCE(SUM(c.opex_professional), 0)::NUMERIC,
    COALESCE(SUM(c.opex_other), 0)::NUMERIC,
    COALESCE(SUM(c.sales_returns), 0)::NUMERIC,
    COALESCE(SUM(c.sales_discounts), 0)::NUMERIC,
    COALESCE(SUM(c.other_income), 0)::NUMERIC,
    COALESCE(SUM(c.interest_expense), 0)::NUMERIC,
    COALESCE(SUM(c.income_before_tax), 0)::NUMERIC,
    COALESCE(SUM(c.income_tax), 0)::NUMERIC
  FROM pl_report_cache c
  WHERE c.tenant_id = p_tenant_id
    AND c.period_month IS NOT NULL
    AND c.period_year BETWEEN p_start_year AND p_end_year;
END;
$$;

-- RPC to aggregate channel PL with all calculations in DB
-- Replaces buildChannelResult client-side logic
CREATE OR REPLACE FUNCTION public.get_channel_pl_computed(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  channel TEXT,
  total_revenue NUMERIC,
  total_fees NUMERIC,
  total_cogs NUMERIC,
  gross_profit NUMERIC,
  operating_profit NUMERIC,
  order_count BIGINT,
  avg_order_value NUMERIC,
  gross_margin NUMERIC,
  operating_margin NUMERIC,
  revenue_share NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grand_total_revenue NUMERIC := 0;
BEGIN
  -- First compute grand total revenue for revenue_share calculation
  SELECT COALESCE(SUM(ch.gross_revenue), 0)
  INTO v_grand_total_revenue
  FROM v_channel_pl_summary ch
  WHERE ch.tenant_id = p_tenant_id
    AND ch.period >= p_start_date::TEXT
    AND ch.period <= p_end_date::TEXT;

  RETURN QUERY
  WITH raw AS (
    SELECT
      UPPER(TRIM(COALESCE(
        CASE 
          WHEN UPPER(TRIM(ch.channel)) IN ('TIKTOKSHOP','TIKTOK SHOP') THEN 'TIKTOK'
          ELSE ch.channel
        END, 'UNKNOWN'))) AS ch_name,
      COALESCE(ch.gross_revenue, 0) AS revenue,
      COALESCE(ch.cogs, 0) AS cogs,
      COALESCE(ch.gross_revenue, 0) - COALESCE(ch.net_revenue, 0) AS fees,
      COALESCE(ch.order_count, 0) AS orders
    FROM v_channel_pl_summary ch
    WHERE ch.tenant_id = p_tenant_id
      AND ch.period >= p_start_date::TEXT
      AND ch.period <= p_end_date::TEXT
  ),
  agg AS (
    SELECT
      r.ch_name,
      SUM(r.revenue) AS total_rev,
      SUM(r.fees) AS total_f,
      SUM(r.cogs) AS total_c,
      SUM(r.orders) AS total_o
    FROM raw r
    GROUP BY r.ch_name
    HAVING SUM(r.revenue) > 0
  ),
  with_cogs_ratio AS (
    SELECT
      CASE WHEN SUM(CASE WHEN total_c > 0 THEN total_rev ELSE 0 END) > 0
           THEN SUM(CASE WHEN total_c > 0 THEN total_c ELSE 0 END)::NUMERIC / SUM(CASE WHEN total_c > 0 THEN total_rev ELSE 0 END)
           ELSE 0 END AS overall_cogs_ratio
    FROM agg
  )
  SELECT
    a.ch_name::TEXT,
    a.total_rev,
    a.total_f,
    CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
         THEN a.total_rev * wcr.overall_cogs_ratio
         ELSE a.total_c END AS effective_cogs,
    a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                        THEN a.total_rev * wcr.overall_cogs_ratio
                        ELSE a.total_c END) AS gp,
    a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                        THEN a.total_rev * wcr.overall_cogs_ratio
                        ELSE a.total_c END) - a.total_f AS op,
    a.total_o,
    CASE WHEN a.total_o > 0 THEN a.total_rev / a.total_o ELSE 0 END,
    CASE WHEN a.total_rev > 0
         THEN ((a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                                    THEN a.total_rev * wcr.overall_cogs_ratio
                                    ELSE a.total_c END)) / a.total_rev) * 100
         ELSE 0 END,
    CASE WHEN a.total_rev > 0
         THEN ((a.total_rev - (CASE WHEN a.total_c <= 0 AND a.total_rev > 0 AND wcr.overall_cogs_ratio > 0
                                    THEN a.total_rev * wcr.overall_cogs_ratio
                                    ELSE a.total_c END) - a.total_f) / a.total_rev) * 100
         ELSE 0 END,
    CASE WHEN v_grand_total_revenue > 0 THEN (a.total_rev / v_grand_total_revenue) * 100 ELSE 0 END
  FROM agg a
  CROSS JOIN with_cogs_ratio wcr
  ORDER BY a.total_rev DESC;
END;
$$;

-- RPC to aggregate channel analytics invoice/revenue rows in DB
CREATE OR REPLACE FUNCTION public.get_channel_analytics_aggregated(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  source_type TEXT,
  total_revenue NUMERIC,
  paid_amount NUMERIC,
  total_orders BIGINT,
  avg_order_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invoice aggregation
  RETURN QUERY
  SELECT
    'invoice'::TEXT,
    COALESCE(SUM(i.total_amount), 0)::NUMERIC,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0)::NUMERIC,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(i.total_amount), 0) / COUNT(*))::NUMERIC ELSE 0 END
  FROM invoices i
  WHERE i.tenant_id = p_tenant_id
    AND i.issue_date >= p_start_date
    AND i.issue_date <= p_end_date;

  -- Revenue aggregation
  RETURN QUERY
  SELECT
    'revenue'::TEXT,
    COALESCE(SUM(r.amount), 0)::NUMERIC,
    COALESCE(SUM(r.amount), 0)::NUMERIC,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(r.amount), 0) / COUNT(*))::NUMERIC ELSE 0 END
  FROM revenues r
  WHERE r.tenant_id = p_tenant_id
    AND r.start_date >= p_start_date
    AND r.start_date <= p_end_date;
END;
$$;
