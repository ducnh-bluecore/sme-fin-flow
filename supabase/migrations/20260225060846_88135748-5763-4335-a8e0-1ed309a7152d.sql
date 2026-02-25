-- Add repeat customer columns to store_daily_metrics
ALTER TABLE public.store_daily_metrics
  ADD COLUMN IF NOT EXISTS repeat_customer_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_customer_count INT DEFAULT 0;

-- Update fn_store_customer_kpis to use the new columns
CREATE OR REPLACE FUNCTION public.fn_store_customer_kpis(p_tenant_id UUID, p_store_id UUID, p_days INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_max_date DATE;
BEGIN
  SELECT MAX(metrics_date) INTO v_max_date
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id AND store_id = p_store_id;

  IF v_max_date IS NULL THEN
    RETURN json_build_object(
      'customer_count', 0, 'total_transactions', 0, 'total_revenue', 0,
      'avg_order_value', 0, 'items_per_transaction', 0, 'return_rate', 0,
      'days_counted', 0, 'period_start', NULL, 'period_end', NULL,
      'daily_avg_customers', 0, 'daily_avg_revenue', 0,
      'repeat_customer_count', 0, 'new_customer_count', 0
    );
  END IF;

  SELECT json_build_object(
    'customer_count', COALESCE(SUM(customer_count), 0),
    'total_transactions', COALESCE(SUM(total_transactions), 0),
    'total_revenue', COALESCE(SUM(total_revenue), 0),
    'avg_order_value', ROUND(COALESCE(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 0)),
    'items_per_transaction', ROUND(CAST(COALESCE(SUM(total_transactions)::numeric / NULLIF(SUM(customer_count), 0), 0) AS numeric), 2),
    'return_rate', ROUND(CAST(
      COALESCE(SUM(repeat_customer_count)::numeric / NULLIF(SUM(customer_count), 0), 0) * 100
    AS numeric), 1),
    'days_counted', COUNT(DISTINCT metrics_date),
    'period_start', MIN(metrics_date),
    'period_end', MAX(metrics_date),
    'daily_avg_customers', ROUND(COALESCE(SUM(customer_count)::numeric / NULLIF(COUNT(DISTINCT metrics_date), 0), 0), 1),
    'daily_avg_revenue', ROUND(COALESCE(SUM(total_revenue) / NULLIF(COUNT(DISTINCT metrics_date), 0), 0)),
    'repeat_customer_count', COALESCE(SUM(repeat_customer_count), 0),
    'new_customer_count', COALESCE(SUM(new_customer_count), 0)
  ) INTO result
  FROM store_daily_metrics
  WHERE tenant_id = p_tenant_id
    AND store_id = p_store_id
    AND metrics_date >= v_max_date - p_days;

  RETURN result;
END;
$$;