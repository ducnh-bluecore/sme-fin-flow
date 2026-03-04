
CREATE OR REPLACE FUNCTION public.fn_store_velocity_for_fc(
  p_tenant_id UUID,
  p_fc_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_fc_id UUID;
BEGIN
  v_fc_id := p_fc_id::UUID;

  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT
      s.id AS store_id,
      s.store_name,
      COALESCE(pos.total_on_hand, 0) AS on_hand,
      COALESCE(dem.avg_daily_sales, 0) AS avg_daily_sales,
      COALESCE(dem.total_sold, 0) AS total_sold,
      COALESCE(dem.sales_velocity, 0) AS sales_velocity
    FROM inv_stores s
    LEFT JOIN LATERAL (
      SELECT SUM(p.on_hand) AS total_on_hand
      FROM inv_state_positions p
      WHERE p.tenant_id = p_tenant_id
        AND p.store_id = s.id
        AND p.fc_id = v_fc_id
        AND p.snapshot_date = (
          SELECT MAX(p2.snapshot_date)
          FROM inv_state_positions p2
          WHERE p2.tenant_id = p_tenant_id
            AND p2.store_id = s.id
            AND p2.fc_id = v_fc_id
        )
      GROUP BY p.store_id
    ) pos ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        SUM(d.avg_daily_sales) AS avg_daily_sales,
        SUM(d.total_sold) AS total_sold,
        AVG(d.sales_velocity) AS sales_velocity
      FROM inv_state_demand d
      WHERE d.tenant_id = p_tenant_id
        AND d.store_id = s.id
        AND d.fc_id = v_fc_id
    ) dem ON TRUE
    WHERE s.tenant_id = p_tenant_id
      AND s.is_active = true
      AND (COALESCE(pos.total_on_hand, 0) > 0 OR COALESCE(dem.total_sold, 0) > 0)
    ORDER BY s.store_name
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
