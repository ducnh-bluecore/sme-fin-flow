
-- RPC to get monthly revenue aggregation per store (last N months)
CREATE OR REPLACE FUNCTION public.fn_store_monthly_revenue(
  p_tenant_id UUID,
  p_store_id UUID DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE(
  store_id UUID,
  month_value TEXT,
  total_revenue NUMERIC,
  total_transactions BIGINT,
  total_customers BIGINT,
  avg_aov NUMERIC,
  days_with_data BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sdm.store_id,
    to_char(sdm.metrics_date, 'YYYY-MM') AS month_value,
    COALESCE(SUM(sdm.total_revenue), 0) AS total_revenue,
    COALESCE(SUM(sdm.total_transactions), 0) AS total_transactions,
    COALESCE(SUM(sdm.customer_count), 0) AS total_customers,
    CASE WHEN SUM(sdm.total_transactions) > 0
      THEN SUM(sdm.total_revenue) / SUM(sdm.total_transactions)
      ELSE 0
    END AS avg_aov,
    COUNT(DISTINCT sdm.metrics_date) AS days_with_data
  FROM store_daily_metrics sdm
  WHERE sdm.tenant_id = p_tenant_id
    AND (p_store_id IS NULL OR sdm.store_id = p_store_id)
    AND sdm.metrics_date >= (
      SELECT COALESCE(MAX(m2.metrics_date), CURRENT_DATE)
      FROM store_daily_metrics m2
      WHERE m2.tenant_id = p_tenant_id
        AND (p_store_id IS NULL OR m2.store_id = p_store_id)
    ) - (p_months * INTERVAL '30 days')
  GROUP BY sdm.store_id, to_char(sdm.metrics_date, 'YYYY-MM')
  ORDER BY sdm.store_id, month_value;
$$;
