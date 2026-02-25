
-- Create RPC to aggregate store customer KPIs from store_daily_metrics
CREATE OR REPLACE FUNCTION public.fn_store_customer_kpis(
  p_tenant_id UUID,
  p_store_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'customer_count', COALESCE(SUM(customer_count), 0),
    'total_transactions', COALESCE(SUM(total_transactions), 0),
    'total_revenue', COALESCE(SUM(total_revenue), 0),
    'avg_order_value', ROUND(COALESCE(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 0)),
    'items_per_transaction', ROUND(CAST(COALESCE(SUM(total_transactions)::numeric / NULLIF(SUM(customer_count), 0), 0) AS numeric), 2),
    'return_rate', 0,
    'days_counted', COUNT(DISTINCT metrics_date),
    'period_start', MIN(metrics_date),
    'period_end', MAX(metrics_date),
    'daily_avg_customers', ROUND(COALESCE(SUM(customer_count)::numeric / NULLIF(COUNT(DISTINCT metrics_date), 0), 0), 1),
    'daily_avg_revenue', ROUND(COALESCE(SUM(total_revenue) / NULLIF(COUNT(DISTINCT metrics_date), 0), 0))
  ) INTO result
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id
    AND store_id = p_store_id
    AND metrics_date >= CURRENT_DATE - p_days;

  RETURN result;
END;
$$;
