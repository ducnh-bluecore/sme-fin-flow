-- ================================================================
-- PHASE 1: SSOT-COMPLIANT P&L AGGREGATION
-- Move all calculations from usePLData.ts to database
-- ================================================================

-- 1.1 RPC: get_pl_aggregated - replaces aggregateCacheRows()
CREATE OR REPLACE FUNCTION public.get_pl_aggregated(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  gross_sales NUMERIC,
  net_sales NUMERIC,
  cogs NUMERIC,
  gross_profit NUMERIC,
  total_opex NUMERIC,
  operating_income NUMERIC,
  net_income NUMERIC,
  gross_margin_pct NUMERIC,
  operating_margin_pct NUMERIC,
  net_margin_pct NUMERIC,
  -- Pre-formatted for display (in millions)
  net_sales_m NUMERIC,
  cogs_m NUMERIC,
  gross_profit_m NUMERIC,
  opex_m NUMERIC,
  net_income_m NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_gross_sales NUMERIC;
  v_net_sales NUMERIC;
  v_cogs NUMERIC;
  v_gross_profit NUMERIC;
  v_total_opex NUMERIC;
  v_operating_income NUMERIC;
  v_net_income NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(c.gross_sales), 0),
    COALESCE(SUM(c.net_sales), 0),
    COALESCE(SUM(c.cogs), 0),
    COALESCE(SUM(c.gross_profit), 0),
    COALESCE(SUM(c.total_opex), 0),
    COALESCE(SUM(c.operating_income), 0),
    COALESCE(SUM(c.net_income), 0)
  INTO v_gross_sales, v_net_sales, v_cogs, v_gross_profit, v_total_opex, v_operating_income, v_net_income
  FROM pl_report_cache c
  WHERE c.tenant_id = p_tenant_id
    AND c.period_month IS NOT NULL
    AND make_date(c.period_year, c.period_month, 1) BETWEEN p_start_date AND p_end_date;

  RETURN QUERY SELECT
    v_gross_sales,
    v_net_sales,
    v_cogs,
    v_gross_profit,
    v_total_opex,
    v_operating_income,
    v_net_income,
    -- Pre-calculated margins (as %)
    CASE WHEN v_net_sales > 0 
      THEN ROUND((v_gross_profit / v_net_sales * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    CASE WHEN v_net_sales > 0 
      THEN ROUND((v_operating_income / v_net_sales * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    CASE WHEN v_net_sales > 0 
      THEN ROUND((v_net_income / v_net_sales * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    -- Pre-formatted in millions
    ROUND(v_net_sales / 1000000, 1),
    ROUND(v_cogs / 1000000, 1),
    ROUND(v_gross_profit / 1000000, 1),
    ROUND(v_total_opex / 1000000, 1),
    ROUND(v_net_income / 1000000, 1);
END;
$$;

-- 1.2 RPC: get_pl_comparison - replaces calcChange()
CREATE OR REPLACE FUNCTION public.get_pl_comparison(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  metric TEXT,
  current_value NUMERIC,
  previous_value NUMERIC,
  change_pct NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COALESCE(SUM(net_sales), 0) as net_sales,
      COALESCE(SUM(gross_profit), 0) as gross_profit,
      COALESCE(SUM(operating_income), 0) as operating_income,
      COALESCE(SUM(net_income), 0) as net_income
    FROM pl_report_cache
    WHERE tenant_id = p_tenant_id
      AND period_month IS NOT NULL
      AND make_date(period_year, period_month, 1) BETWEEN p_start_date AND p_end_date
  ),
  previous_period AS (
    SELECT 
      COALESCE(SUM(net_sales), 0) as net_sales,
      COALESCE(SUM(gross_profit), 0) as gross_profit,
      COALESCE(SUM(operating_income), 0) as operating_income,
      COALESCE(SUM(net_income), 0) as net_income
    FROM pl_report_cache
    WHERE tenant_id = p_tenant_id
      AND period_month IS NOT NULL
      AND make_date(period_year, period_month, 1) 
          BETWEEN (p_start_date - INTERVAL '1 year')::DATE AND (p_end_date - INTERVAL '1 year')::DATE
  )
  SELECT 'net_sales'::TEXT, c.net_sales, p.net_sales,
    CASE WHEN ABS(p.net_sales) > 0 
      THEN ROUND(((c.net_sales - p.net_sales) / ABS(p.net_sales) * 100)::NUMERIC, 1)
      ELSE 0 END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'gross_profit'::TEXT, c.gross_profit, p.gross_profit,
    CASE WHEN ABS(p.gross_profit) > 0 
      THEN ROUND(((c.gross_profit - p.gross_profit) / ABS(p.gross_profit) * 100)::NUMERIC, 1)
      ELSE 0 END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'operating_income'::TEXT, c.operating_income, p.operating_income,
    CASE WHEN ABS(p.operating_income) > 0 
      THEN ROUND(((c.operating_income - p.operating_income) / ABS(p.operating_income) * 100)::NUMERIC, 1)
      ELSE 0 END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'net_income'::TEXT, c.net_income, p.net_income,
    CASE WHEN ABS(p.net_income) > 0 
      THEN ROUND(((c.net_income - p.net_income) / ABS(p.net_income) * 100)::NUMERIC, 1)
      ELSE 0 END
  FROM current_period c, previous_period p;
END;
$$;

-- 1.3 View: v_pl_monthly_summary - pre-computed monthly with margins
CREATE OR REPLACE VIEW public.v_pl_monthly_summary AS
SELECT 
  tenant_id,
  period_year,
  period_month,
  to_char(make_date(period_year, period_month, 1), 'YYYY-MM') as year_month,
  -- Raw values
  COALESCE(gross_sales, 0) as gross_sales,
  COALESCE(net_sales, 0) as net_sales,
  COALESCE(cogs, 0) as cogs,
  COALESCE(gross_profit, 0) as gross_profit,
  COALESCE(total_opex, 0) as total_opex,
  COALESCE(operating_income, 0) as operating_income,
  COALESCE(net_income, 0) as net_income,
  -- Pre-calculated margins (as %)
  CASE WHEN COALESCE(net_sales, 0) > 0 
    THEN ROUND((COALESCE(gross_profit, 0) / net_sales * 100)::NUMERIC, 1)
    ELSE 0 
  END as gross_margin_pct,
  CASE WHEN COALESCE(net_sales, 0) > 0 
    THEN ROUND((COALESCE(operating_income, 0) / net_sales * 100)::NUMERIC, 1)
    ELSE 0 
  END as operating_margin_pct,
  CASE WHEN COALESCE(net_sales, 0) > 0 
    THEN ROUND((COALESCE(net_income, 0) / net_sales * 100)::NUMERIC, 1)
    ELSE 0 
  END as net_margin_pct,
  -- Pre-formatted in millions
  ROUND(COALESCE(net_sales, 0) / 1000000, 1) as net_sales_m,
  ROUND(COALESCE(cogs, 0) / 1000000, 1) as cogs_m,
  ROUND(COALESCE(gross_profit, 0) / 1000000, 1) as gross_profit_m,
  ROUND(COALESCE(total_opex, 0) / 1000000, 1) as opex_m,
  ROUND(COALESCE(net_income, 0) / 1000000, 1) as net_income_m
FROM pl_report_cache
WHERE period_month IS NOT NULL;

-- 1.4 RPC: get_category_pl_aggregated - replaces category forEach aggregation
CREATE OR REPLACE FUNCTION public.get_category_pl_aggregated(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  category TEXT,
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  gross_profit NUMERIC,
  margin_pct NUMERIC,
  contribution_pct NUMERIC,
  -- Pre-formatted
  revenue_m NUMERIC,
  cogs_m NUMERIC,
  profit_m NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_revenue NUMERIC;
BEGIN
  -- Get total revenue for contribution calculation
  SELECT COALESCE(SUM(oi.line_revenue), 0)
  INTO v_total_revenue
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
  WHERE oi.tenant_id = p_tenant_id
    AND o.order_at::DATE BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT 
    COALESCE(oi.category, 'Không phân loại')::TEXT,
    COALESCE(SUM(oi.line_revenue), 0),
    COALESCE(SUM(oi.line_cogs), 0),
    COALESCE(SUM(oi.line_revenue), 0) - COALESCE(SUM(oi.line_cogs), 0),
    -- Margin %
    CASE WHEN SUM(oi.line_revenue) > 0 
      THEN ROUND(((SUM(oi.line_revenue) - SUM(oi.line_cogs)) / SUM(oi.line_revenue) * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    -- Contribution %
    CASE WHEN v_total_revenue > 0 
      THEN ROUND((SUM(oi.line_revenue) / v_total_revenue * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    -- Pre-formatted millions
    ROUND(COALESCE(SUM(oi.line_revenue), 0) / 1000000, 1),
    ROUND(COALESCE(SUM(oi.line_cogs), 0) / 1000000, 1),
    ROUND((COALESCE(SUM(oi.line_revenue), 0) - COALESCE(SUM(oi.line_cogs), 0)) / 1000000, 1)
  FROM cdp_order_items oi
  JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
  WHERE oi.tenant_id = p_tenant_id
    AND o.order_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY COALESCE(oi.category, 'Không phân loại')
  ORDER BY SUM(oi.line_revenue) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pl_aggregated(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pl_comparison(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_pl_aggregated(UUID, DATE, DATE) TO authenticated;

-- Grant view access
GRANT SELECT ON public.v_pl_monthly_summary TO authenticated;