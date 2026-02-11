
-- =============================================
-- FIX 1: Drop duplicate RPC overload causing PGRST203
-- =============================================
DROP FUNCTION IF EXISTS get_fdp_period_summary(uuid, date, date);

-- =============================================
-- FIX 2: Create optimized channel performance RPC with date filter
-- Replaces v_channel_performance view that scans all 1.2M rows
-- =============================================
CREATE OR REPLACE FUNCTION get_channel_performance(
  p_tenant_id UUID,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE(
  channel TEXT,
  order_count BIGINT,
  gross_revenue NUMERIC,
  net_revenue NUMERIC,
  total_fees NUMERIC,
  cogs NUMERIC,
  gross_margin NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
  SELECT
    COALESCE(o.channel, 'OTHER') AS channel,
    COUNT(*)::BIGINT AS order_count,
    COALESCE(SUM(o.gross_revenue), 0) AS gross_revenue,
    COALESCE(SUM(o.net_revenue), 0) AS net_revenue,
    COALESCE(SUM(o.total_fees), 0) AS total_fees,
    COALESCE(SUM(o.cogs), 0) AS cogs,
    COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0) AS gross_margin
  FROM cdp_orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.order_at >= p_start_date::timestamp
    AND o.order_at < (p_end_date::date + 1)::timestamp
  GROUP BY o.channel
  ORDER BY net_revenue DESC;
$$;
