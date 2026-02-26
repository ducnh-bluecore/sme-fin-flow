
CREATE OR REPLACE FUNCTION public.compute_size_transfers(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
DECLARE
  v_count int := 0;
  v_start timestamptz := clock_timestamp();
  v_snapshot_date date;
BEGIN
  SELECT MAX(snapshot_date) INTO v_snapshot_date 
  FROM inv_state_positions WHERE tenant_id = p_tenant_id;
  
  IF v_snapshot_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no inventory snapshot found');
  END IF;

  DELETE FROM state_size_transfer_daily 
  WHERE tenant_id = p_tenant_id::text AND as_of_date = p_as_of_date;

  WITH latest_inv AS (
    SELECT isp.fc_id, isp.store_id,
           upper(regexp_replace(isp.sku, '.*[0-9]', '')) AS size_code,
           SUM(isp.on_hand) AS on_hand
    FROM inv_state_positions isp
    JOIN inv_stores s ON s.id = isp.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    WHERE isp.tenant_id = p_tenant_id 
      AND isp.snapshot_date = v_snapshot_date
    GROUP BY isp.fc_id, isp.store_id, upper(regexp_replace(isp.sku, '.*[0-9]', ''))
  ),
  velocity AS (
    SELECT d.fc_id, d.store_id,
           upper(regexp_replace(d.sku, '.*[0-9]', '')) AS size_code,
           SUM(d.avg_daily_sales) AS daily_vel
    FROM inv_state_demand d
    JOIN inv_stores s ON s.id = d.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    WHERE d.tenant_id = p_tenant_id AND d.avg_daily_sales > 0
    GROUP BY d.fc_id, d.store_id, upper(regexp_replace(d.sku, '.*[0-9]', ''))
  ),
  store_size AS (
    SELECT i.fc_id, i.store_id, i.size_code, i.on_hand,
           COALESCE(v.daily_vel, 0) AS daily_vel,
           CASE WHEN COALESCE(v.daily_vel, 0) > 0 THEN i.on_hand / v.daily_vel ELSE 999 END AS days_cover,
           s.region
    FROM latest_inv i
    JOIN inv_stores s ON s.id = i.store_id
    LEFT JOIN velocity v ON v.fc_id = i.fc_id AND v.store_id = i.store_id AND v.size_code = i.size_code
  ),
  -- Source: stores with >= 3 units AND > 14 days cover (relaxed guardrail)
  sources AS (
    SELECT * FROM store_size WHERE on_hand >= 3 AND days_cover > 14
  ),
  -- Dest: stores with stockout or low (<=1) AND has demand
  dests AS (
    SELECT * FROM store_size WHERE on_hand <= 1 AND daily_vel > 0
  ),
  matches AS (
    SELECT 
      src.fc_id, src.size_code,
      src.store_id AS source_store_id,
      dst.store_id AS dest_store_id,
      src.on_hand AS source_on_hand,
      dst.on_hand AS dest_on_hand,
      dst.daily_vel AS dest_velocity,
      -- Transfer qty: leave at least 14 days cover at source
      LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 14))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      ) AS transfer_qty,
      COALESCE(p.selling_price, 0) AS price,
      dst.daily_vel,
      CASE WHEN src.region = dst.region THEN 35000 ELSE 70000 END AS logistics_cost,
      CASE WHEN dst.on_hand = 0 THEN 'stockout' ELSE 'low_stock' END || 
      CASE WHEN src.region != dst.region THEN ' + cross_region' ELSE '' END ||
      CASE WHEN dst.size_code IN ('S','M','L') THEN ' + core_size' ELSE '' END AS reason,
      src.on_hand AS src_oh, src.daily_vel AS src_vel
    FROM sources src
    JOIN dests dst ON dst.fc_id = src.fc_id AND dst.size_code = src.size_code AND dst.store_id != src.store_id
    LEFT JOIN products p ON p.id = src.fc_id AND p.tenant_id = p_tenant_id
    -- Post-transfer guardrail: source must keep >= 14 days cover
    WHERE (src.on_hand - LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 14))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      )) >= CEIL(COALESCE(src.daily_vel, 0.03) * 14)
  ),
  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY fc_id, size_code, dest_store_id ORDER BY source_on_hand DESC) AS rn
    FROM matches
  ),
  final AS (
    SELECT * FROM ranked WHERE rn = 1
  )
  INSERT INTO state_size_transfer_daily (
    tenant_id, product_id, size_code, source_store_id, dest_store_id, as_of_date,
    transfer_qty, transfer_score, source_on_hand, dest_on_hand, dest_velocity,
    estimated_revenue_gain, estimated_transfer_cost, net_benefit, reason, status
  )
  SELECT
    p_tenant_id::text, f.fc_id::text, f.size_code,
    f.source_store_id, f.dest_store_id, p_as_of_date,
    f.transfer_qty,
    LEAST(100, (f.dest_velocity * 100 + CASE WHEN f.dest_on_hand = 0 THEN 50 ELSE 0 END)::numeric),
    f.source_on_hand, f.dest_on_hand, f.dest_velocity,
    (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14))::numeric,
    f.logistics_cost,
    (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14) - f.logistics_cost)::numeric,
    f.reason, 'pending'
  FROM final f
  WHERE (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14) - f.logistics_cost) > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'transfers_generated', v_count,
    'snapshot_date', v_snapshot_date,
    'as_of_date', p_as_of_date,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::int
  );
END;
$$;
