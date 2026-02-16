
CREATE OR REPLACE FUNCTION public.fn_clearance_demand_by_fc(
  p_tenant_id uuid,
  p_fc_ids uuid[]
)
RETURNS TABLE(
  fc_id uuid,
  avg_daily_sales numeric,
  sales_velocity numeric,
  trend text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.fc_id,
    COALESCE(AVG(d.avg_daily_sales), 0) AS avg_daily_sales,
    COALESCE(AVG(d.sales_velocity), 0) AS sales_velocity,
    MODE() WITHIN GROUP (ORDER BY d.trend) AS trend
  FROM inv_state_demand d
  WHERE d.tenant_id = p_tenant_id
    AND d.fc_id = ANY(p_fc_ids)
  GROUP BY d.fc_id;
$$;
