
-- Server-side function to compute size transfer suggestions from CURRENT inventory
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
  -- Get latest snapshot date
  SELECT MAX(snapshot_date) INTO v_snapshot_date 
  FROM inv_state_positions WHERE tenant_id = p_tenant_id;
  
  IF v_snapshot_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no inventory snapshot found');
  END IF;

  -- Delete old transfer data for this tenant+date
  DELETE FROM state_size_transfer_daily 
  WHERE tenant_id = p_tenant_id::text AND as_of_date = p_as_of_date;

  -- Generate transfer suggestions:
  -- For each (fc_id, size_code): find stores with surplus → stores with stockout/low stock
  -- Only consider transfer-eligible stores
  WITH latest_inv AS (
    SELECT isp.fc_id, isp.store_id,
           upper(regexp_replace(isp.sku, '.*[0-9]', '')) AS size_code,
           isp.sku,
           SUM(isp.on_hand) AS on_hand
    FROM inv_state_positions isp
    JOIN inv_stores s ON s.id = isp.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    WHERE isp.tenant_id = p_tenant_id 
      AND isp.snapshot_date = v_snapshot_date
    GROUP BY isp.fc_id, isp.store_id, upper(regexp_replace(isp.sku, '.*[0-9]', '')), isp.sku
  ),
  -- Get velocity per fc+store+size from demand
  velocity AS (
    SELECT d.fc_id, d.store_id,
           upper(regexp_replace(d.sku, '.*[0-9]', '')) AS size_code,
           SUM(d.avg_daily_sales) AS daily_vel
    FROM inv_state_demand d
    JOIN inv_stores s ON s.id = d.store_id AND s.is_transfer_eligible = true AND s.location_type = 'store'
    WHERE d.tenant_id = p_tenant_id AND d.avg_daily_sales > 0
    GROUP BY d.fc_id, d.store_id, upper(regexp_replace(d.sku, '.*[0-9]', ''))
  ),
  -- Combine inventory + velocity
  store_size AS (
    SELECT i.fc_id, i.store_id, i.size_code, i.on_hand,
           COALESCE(v.daily_vel, 0) AS daily_vel,
           CASE WHEN COALESCE(v.daily_vel, 0) > 0 THEN i.on_hand / v.daily_vel ELSE 999 END AS days_cover,
           s.region
    FROM latest_inv i
    JOIN inv_stores s ON s.id = i.store_id
    LEFT JOIN velocity v ON v.fc_id = i.fc_id AND v.store_id = i.store_id AND v.size_code = i.size_code
  ),
  -- Source: stores with surplus (on_hand >= 4 AND days_cover > 30)
  sources AS (
    SELECT * FROM store_size WHERE on_hand >= 4 AND days_cover > 30
  ),
  -- Dest: stores with stockout or low stock (on_hand <= 1) AND has demand
  dests AS (
    SELECT * FROM store_size WHERE on_hand <= 1 AND daily_vel > 0
  ),
  -- Match source → dest for same fc+size
  matches AS (
    SELECT 
      src.fc_id,
      src.size_code,
      src.store_id AS source_store_id,
      dst.store_id AS dest_store_id,
      src.on_hand AS source_on_hand,
      dst.on_hand AS dest_on_hand,
      dst.daily_vel AS dest_velocity,
      -- Transfer qty: min(surplus above 30-day cover, 2-3 units)
      LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 30))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      ) AS transfer_qty,
      -- Estimated revenue gain: transfer_qty * price * velocity factor
      COALESCE(p.selling_price, 0) AS price,
      dst.daily_vel,
      -- Logistics cost: same region = 35k, cross region = 70k
      CASE WHEN src.region = dst.region THEN 35000 ELSE 70000 END AS logistics_cost,
      -- Reason
      CASE 
        WHEN dst.on_hand = 0 THEN 'stockout'
        ELSE 'low_stock'
      END || 
      CASE WHEN src.region != dst.region THEN ' + cross_region' ELSE '' END ||
      CASE WHEN dst.size_code IN ('S','M','L') THEN ' + core_size' ELSE '' END AS reason,
      src.days_cover AS source_days_cover
    FROM sources src
    JOIN dests dst ON dst.fc_id = src.fc_id AND dst.size_code = src.size_code AND dst.store_id != src.store_id
    LEFT JOIN products p ON p.id = src.fc_id AND p.tenant_id = p_tenant_id
    -- Source guardrail: after transfer, source must still have >= 30 days cover
    WHERE (src.on_hand - LEAST(
        GREATEST(1, (src.on_hand - CEIL(COALESCE(src.daily_vel, 0.03) * 30))::int),
        CASE WHEN dst.daily_vel >= 0.1 THEN 3 ELSE 2 END
      )) >= CEIL(COALESCE(src.daily_vel, 0.03) * 30)
  ),
  -- Rank and limit: top 1 source per (fc, size, dest) by surplus
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
    p_tenant_id::text,
    f.fc_id::text,
    f.size_code,
    f.source_store_id,
    f.dest_store_id,
    p_as_of_date,
    f.transfer_qty,
    -- Transfer score: higher = more urgent
    LEAST(100, (f.dest_velocity * 100 + CASE WHEN f.dest_on_hand = 0 THEN 50 ELSE 0 END)::numeric),
    f.source_on_hand,
    f.dest_on_hand,
    f.dest_velocity,
    (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14))::numeric,
    f.logistics_cost,
    (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14) - f.logistics_cost)::numeric,
    f.reason,
    'pending'
  FROM final f
  WHERE (f.transfer_qty * f.price * LEAST(1, f.daily_vel * 14) - f.logistics_cost) > 0;  -- Only positive net benefit

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
