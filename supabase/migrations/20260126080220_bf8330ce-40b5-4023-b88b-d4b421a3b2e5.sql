-- ============================================================================
-- SSOT FIX: All views/RPCs now read from cdp_orders/cdp_order_items (Layer 2)
-- ============================================================================
-- Problem: Multiple views reading from external_orders (Layer 0) → SSOT violation
-- Solution: All modules read from cdp_orders/cdp_order_items as Single Source of Truth
-- Note: cdp_orders columns: id, tenant_id, order_key, customer_id, order_at, channel,
--       payment_method, currency, gross_revenue, discount_amount, net_revenue, 
--       cogs, gross_margin, is_discounted, is_bundle, created_at
-- ============================================================================

-- ============================================================================
-- 1. FIX: channel_performance_summary
-- ============================================================================
DROP VIEW IF EXISTS channel_performance_summary CASCADE;

CREATE OR REPLACE VIEW channel_performance_summary AS
SELECT 
  co.tenant_id,
  co.channel,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.net_revenue) as total_revenue,
  SUM(co.cogs) as total_cogs,
  SUM(co.gross_margin) as gross_profit,
  CASE WHEN SUM(co.net_revenue) > 0 
    THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  AVG(co.net_revenue) as avg_order_value,
  COUNT(DISTINCT co.customer_id) as unique_customers
FROM cdp_orders co
GROUP BY co.tenant_id, co.channel;

COMMENT ON VIEW channel_performance_summary IS 
'Channel Performance - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON channel_performance_summary TO authenticated;
GRANT SELECT ON channel_performance_summary TO anon;

-- ============================================================================
-- 2. FIX: daily_channel_revenue
-- ============================================================================
DROP VIEW IF EXISTS daily_channel_revenue CASCADE;

CREATE OR REPLACE VIEW daily_channel_revenue AS
SELECT 
  co.tenant_id,
  DATE(co.order_at) as revenue_date,
  co.channel,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.net_revenue) as revenue,
  SUM(co.cogs) as cogs,
  SUM(co.gross_margin) as gross_profit
FROM cdp_orders co
GROUP BY co.tenant_id, DATE(co.order_at), co.channel;

COMMENT ON VIEW daily_channel_revenue IS 
'Daily Channel Revenue - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON daily_channel_revenue TO authenticated;
GRANT SELECT ON daily_channel_revenue TO anon;

-- ============================================================================
-- 3. FIX: fdp_channel_summary
-- ============================================================================
DROP VIEW IF EXISTS fdp_channel_summary CASCADE;

CREATE OR REPLACE VIEW fdp_channel_summary AS
SELECT 
  co.tenant_id,
  co.channel,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.net_revenue) as total_revenue,
  SUM(co.cogs) as total_cogs,
  0::numeric as total_fees,
  SUM(co.gross_margin) as gross_profit,
  CASE WHEN SUM(co.net_revenue) > 0 
    THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  AVG(co.net_revenue) as avg_order_value,
  COUNT(DISTINCT co.customer_id) as unique_customers,
  MIN(co.order_at) as first_order_date,
  MAX(co.order_at) as last_order_date
FROM cdp_orders co
GROUP BY co.tenant_id, co.channel;

COMMENT ON VIEW fdp_channel_summary IS 
'FDP Channel Summary - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON fdp_channel_summary TO authenticated;
GRANT SELECT ON fdp_channel_summary TO anon;

-- ============================================================================
-- 4. FIX: fdp_daily_metrics
-- ============================================================================
DROP VIEW IF EXISTS fdp_daily_metrics CASCADE;

CREATE OR REPLACE VIEW fdp_daily_metrics AS
SELECT 
  co.tenant_id,
  DATE(co.order_at) as metric_date,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.net_revenue) as revenue,
  SUM(co.cogs) as cogs,
  0::numeric as fees,
  SUM(co.gross_margin) as gross_profit,
  CASE WHEN SUM(co.net_revenue) > 0 
    THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  AVG(co.net_revenue) as avg_order_value,
  COUNT(DISTINCT co.customer_id) as unique_customers
FROM cdp_orders co
GROUP BY co.tenant_id, DATE(co.order_at);

COMMENT ON VIEW fdp_daily_metrics IS 
'FDP Daily Metrics - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON fdp_daily_metrics TO authenticated;
GRANT SELECT ON fdp_daily_metrics TO anon;

-- ============================================================================
-- 5. FIX: fdp_monthly_metrics
-- ============================================================================
DROP VIEW IF EXISTS fdp_monthly_metrics CASCADE;

CREATE OR REPLACE VIEW fdp_monthly_metrics AS
SELECT 
  co.tenant_id,
  DATE_TRUNC('month', co.order_at)::date as month_start,
  TO_CHAR(co.order_at, 'YYYY-MM') as month_label,
  COUNT(DISTINCT co.id) as order_count,
  SUM(co.net_revenue) as revenue,
  SUM(co.cogs) as cogs,
  0::numeric as fees,
  SUM(co.gross_margin) as gross_profit,
  CASE WHEN SUM(co.net_revenue) > 0 
    THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
    ELSE 0 
  END as margin_percent,
  AVG(co.net_revenue) as avg_order_value,
  COUNT(DISTINCT co.customer_id) as unique_customers
FROM cdp_orders co
GROUP BY co.tenant_id, DATE_TRUNC('month', co.order_at), TO_CHAR(co.order_at, 'YYYY-MM');

COMMENT ON VIEW fdp_monthly_metrics IS 
'FDP Monthly Metrics - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON fdp_monthly_metrics TO authenticated;
GRANT SELECT ON fdp_monthly_metrics TO anon;

-- ============================================================================
-- 6. FIX: v_cdp_data_quality
-- ============================================================================
DROP VIEW IF EXISTS v_cdp_data_quality CASCADE;

CREATE OR REPLACE VIEW v_cdp_data_quality AS
SELECT 
  co.tenant_id,
  COUNT(DISTINCT co.id) as total_orders,
  COUNT(DISTINCT co.customer_id) as total_customers,
  COUNT(DISTINCT CASE WHEN co.customer_id IS NULL THEN co.id END) as orders_missing_customer,
  COUNT(DISTINCT CASE WHEN co.net_revenue IS NULL OR co.net_revenue = 0 THEN co.id END) as orders_missing_revenue,
  COUNT(DISTINCT CASE WHEN co.cogs IS NULL THEN co.id END) as orders_missing_cogs,
  CASE 
    WHEN COUNT(DISTINCT co.id) = 0 THEN 0
    ELSE ROUND(
      (1.0 - (
        COALESCE(COUNT(DISTINCT CASE WHEN co.customer_id IS NULL THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.3 +
        COALESCE(COUNT(DISTINCT CASE WHEN co.net_revenue IS NULL OR co.net_revenue = 0 THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.4 +
        COALESCE(COUNT(DISTINCT CASE WHEN co.cogs IS NULL THEN co.id END)::numeric / NULLIF(COUNT(DISTINCT co.id), 0), 0) * 0.3
      )) * 100, 1
    )
  END as data_quality_score
FROM cdp_orders co
GROUP BY co.tenant_id;

COMMENT ON VIEW v_cdp_data_quality IS 
'CDP Data Quality - SSOT Compliant. Reads from cdp_orders (Layer 2).';

GRANT SELECT ON v_cdp_data_quality TO authenticated;
GRANT SELECT ON v_cdp_data_quality TO anon;

-- ============================================================================
-- 7. FIX: get_control_tower_summary RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION get_control_tower_summary(
  p_tenant_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_start_date date;
  v_end_date date;
BEGIN
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '30 days');

  SELECT jsonb_build_object(
    'period_start', v_start_date,
    'period_end', v_end_date,
    'total_orders', COALESCE(COUNT(DISTINCT co.id), 0),
    'total_revenue', COALESCE(SUM(co.net_revenue), 0),
    'total_cogs', COALESCE(SUM(co.cogs), 0),
    'total_fees', 0,
    'gross_profit', COALESCE(SUM(co.gross_margin), 0),
    'gross_margin_percent', CASE 
      WHEN COALESCE(SUM(co.net_revenue), 0) > 0 
      THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
      ELSE 0 
    END,
    'avg_order_value', CASE 
      WHEN COUNT(DISTINCT co.id) > 0 
      THEN ROUND((SUM(co.net_revenue) / COUNT(DISTINCT co.id))::numeric, 0)
      ELSE 0 
    END,
    'unique_customers', COUNT(DISTINCT co.customer_id),
    'data_source', 'cdp_orders',
    'ssot_compliant', true
  ) INTO v_result
  FROM cdp_orders co
  WHERE co.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_control_tower_summary IS 
'Control Tower Summary - SSOT Compliant. Reads from cdp_orders (Layer 2).';

-- ============================================================================
-- 8. FIX: get_sku_profitability_by_date_range RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sku_profitability_by_date_range(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  sku text,
  product_name text,
  channel text,
  total_quantity numeric,
  total_revenue numeric,
  total_cogs numeric,
  total_fees numeric,
  gross_profit numeric,
  margin_percent numeric,
  aov numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.sku, coi.product_id) as sku,
    COALESCE(p.name, 'Product ' || coi.product_id) as product_name,
    co.channel,
    SUM(coi.qty)::numeric as total_quantity,
    SUM(coi.line_revenue)::numeric as total_revenue,
    SUM(coi.line_cogs)::numeric as total_cogs,
    0::numeric as total_fees,
    SUM(coi.line_margin)::numeric as gross_profit,
    CASE WHEN SUM(coi.line_revenue) > 0 
      THEN ROUND((SUM(coi.line_margin) / SUM(coi.line_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as margin_percent,
    CASE WHEN SUM(coi.qty) > 0 
      THEN ROUND((SUM(coi.line_revenue) / SUM(coi.qty))::numeric, 0)
      ELSE 0 
    END as aov,
    CASE 
      WHEN SUM(coi.line_revenue) > 0 AND (SUM(coi.line_margin) / SUM(coi.line_revenue) * 100) >= 10 THEN 'profitable'
      WHEN SUM(coi.line_revenue) > 0 AND (SUM(coi.line_margin) / SUM(coi.line_revenue) * 100) >= 0 THEN 'marginal'
      ELSE 'loss'
    END as status
  FROM cdp_order_items coi
  JOIN cdp_orders co ON co.id = coi.order_id AND co.tenant_id = coi.tenant_id
  LEFT JOIN products p ON p.id = coi.product_id::uuid
  WHERE coi.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= p_start_date
    AND DATE(co.order_at) <= p_end_date
  GROUP BY COALESCE(p.sku, coi.product_id), COALESCE(p.name, 'Product ' || coi.product_id), co.channel;
END;
$$;

COMMENT ON FUNCTION get_sku_profitability_by_date_range IS 
'SKU Profitability by Date Range - SSOT Compliant. Reads from cdp_order_items (Layer 2).';

-- ============================================================================
-- 9. FIX: compute_central_metrics_snapshot RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_central_metrics_snapshot(
  p_tenant_id uuid,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id uuid;
  v_start_date date;
  v_end_date date;
  v_metrics record;
BEGIN
  v_end_date := COALESCE(p_period_end, CURRENT_DATE);
  v_start_date := COALESCE(p_period_start, DATE_TRUNC('month', v_end_date)::date);

  SELECT 
    COALESCE(SUM(co.net_revenue), 0) as total_revenue,
    COALESCE(SUM(co.cogs), 0) as total_cogs,
    0::numeric as total_fees,
    COALESCE(SUM(co.gross_margin), 0) as gross_profit,
    COALESCE(COUNT(DISTINCT co.id), 0) as order_count,
    COALESCE(COUNT(DISTINCT co.customer_id), 0) as customer_count,
    CASE WHEN SUM(co.net_revenue) > 0 
      THEN ROUND((SUM(co.gross_margin) / SUM(co.net_revenue) * 100)::numeric, 2)
      ELSE 0 
    END as gross_margin_percent,
    CASE WHEN COUNT(DISTINCT co.id) > 0 
      THEN ROUND((SUM(co.net_revenue) / COUNT(DISTINCT co.id))::numeric, 0)
      ELSE 0 
    END as avg_order_value
  INTO v_metrics
  FROM cdp_orders co
  WHERE co.tenant_id = p_tenant_id
    AND DATE(co.order_at) >= v_start_date
    AND DATE(co.order_at) <= v_end_date;

  INSERT INTO central_metrics_snapshots (
    tenant_id,
    period_start,
    period_end,
    net_revenue,
    total_cogs,
    total_fees,
    gross_profit,
    gross_margin_percent,
    order_count,
    customer_count,
    avg_order_value,
    snapshot_type,
    computed_at
  ) VALUES (
    p_tenant_id,
    v_start_date,
    v_end_date,
    v_metrics.total_revenue,
    v_metrics.total_cogs,
    v_metrics.total_fees,
    v_metrics.gross_profit,
    v_metrics.gross_margin_percent,
    v_metrics.order_count,
    v_metrics.customer_count,
    v_metrics.avg_order_value,
    'daily',
    NOW()
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION compute_central_metrics_snapshot IS 
'Compute Central Metrics Snapshot - SSOT Compliant. Reads from cdp_orders (Layer 2).';