
CREATE OR REPLACE FUNCTION public.fn_allocation_engine(
  p_tenant_id uuid,
  p_run_id uuid,
  p_run_type text DEFAULT 'both'
)
RETURNS jsonb
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
DECLARE
  v_result jsonb;
  v_v1_count integer := 0;
  v_v2_count integer := 0;
  v_total_units integer := 0;
  
  v_no_broken_size boolean;
  v_min_cover_weeks numeric;
  v_core_hero_min_per_sku integer;
  v_avg_unit_price numeric;
  v_bst_scope_recent_count integer;
  v_cw_reserved_ranges jsonb;
  v_v1_min_stock_ranges jsonb;
  v_cw_total_skus integer;
  v_cw_reserve_min integer;
BEGIN
  -- Load constraints
  SELECT COALESCE((SELECT (constraint_value->>'enabled')::boolean FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'no_broken_size' AND is_active = true LIMIT 1), true) INTO v_no_broken_size;
  SELECT COALESCE((SELECT (constraint_value->>'weeks')::numeric FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'v2_min_cover_weeks' AND is_active = true LIMIT 1), 1) INTO v_min_cover_weeks;
  SELECT COALESCE((SELECT (constraint_value->>'min_pcs')::integer FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'cw_core_hero_min_per_sku' AND is_active = true LIMIT 1), 15) INTO v_core_hero_min_per_sku;
  SELECT COALESCE((SELECT (constraint_value->>'amount')::numeric FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'avg_unit_price_default' AND is_active = true LIMIT 1), 250000) INTO v_avg_unit_price;
  SELECT COALESCE((SELECT (constraint_value->>'count')::integer FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'bst_scope_recent_count' AND is_active = true LIMIT 1), 10) INTO v_bst_scope_recent_count;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'cw_reserved_min_by_total_sku' AND is_active = true LIMIT 1), '[{"max_sku":9999,"min_pcs":5}]'::jsonb) INTO v_cw_reserved_ranges;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'v1_min_store_stock_by_total_sku' AND is_active = true LIMIT 1), '[{"max_sku":9999,"min_qty":5}]'::jsonb) INTO v_v1_min_stock_ranges;

  -- CW stock
  CREATE TEMP TABLE tmp_cw_stock ON COMMIT DROP AS
  SELECT sp.fc_id, SUM(GREATEST(COALESCE(sp.on_hand,0) - COALESCE(sp.reserved,0) - COALESCE(sp.safety_stock,0), 0))::integer AS available
  FROM inv_state_positions sp
  JOIN inv_stores s ON s.id = sp.store_id AND s.tenant_id = p_tenant_id AND s.location_type = 'central_warehouse' AND s.is_active = true
  WHERE sp.tenant_id = p_tenant_id
  GROUP BY sp.fc_id
  HAVING SUM(GREATEST(COALESCE(sp.on_hand,0) - COALESCE(sp.reserved,0) - COALESCE(sp.safety_stock,0), 0)) > 0;
  
  CREATE INDEX ON tmp_cw_stock(fc_id);

  IF NOT EXISTS (SELECT 1 FROM tmp_cw_stock) THEN
    RETURN jsonb_build_object('total_recommendations', 0, 'v1_count', 0, 'v2_count', 0, 'total_units', 0, 'message', 'No CW stock available');
  END IF;

  SELECT COUNT(*) INTO v_cw_total_skus FROM tmp_cw_stock;
  SELECT COALESCE((SELECT (r->>'min_pcs')::integer FROM jsonb_array_elements(v_cw_reserved_ranges) r WHERE (r->>'max_sku')::integer >= v_cw_total_skus ORDER BY (r->>'max_sku')::integer LIMIT 1), 5) INTO v_cw_reserve_min;

  -- Size integrity (fc_id → complete?)
  CREATE TEMP TABLE tmp_size_ok ON COMMIT DROP AS
  SELECT fc_id FROM inv_state_size_integrity WHERE tenant_id = p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw_stock) GROUP BY fc_id HAVING bool_and(is_full_size_run);
  CREATE INDEX ON tmp_size_ok(fc_id);

  -- FCs with CW stock + size OK
  CREATE TEMP TABLE tmp_fcs ON COMMIT DROP AS
  SELECT f.id, f.fc_code, f.fc_name, f.is_core_hero, f.collection_id,
    COALESCE((SELECT sku_count FROM (SELECT fc_id, COUNT(*)::integer AS sku_count FROM inv_sku_fc_mapping WHERE tenant_id = p_tenant_id GROUP BY fc_id) sc WHERE sc.fc_id = f.id), 1) AS sku_count
  FROM inv_family_codes f
  WHERE f.tenant_id = p_tenant_id AND f.is_active = true AND f.id IN (SELECT fc_id FROM tmp_cw_stock)
    AND (NOT v_no_broken_size OR f.id IN (SELECT fc_id FROM tmp_size_ok) OR NOT EXISTS (SELECT 1 FROM inv_state_size_integrity WHERE tenant_id = p_tenant_id AND fc_id = f.id));
  CREATE INDEX ON tmp_fcs(id);

  -- Store positions aggregated
  CREATE TEMP TABLE tmp_pos ON COMMIT DROP AS
  SELECT store_id, fc_id, SUM(COALESCE(on_hand,0))::integer AS on_hand, SUM(COALESCE(in_transit,0))::integer AS in_transit
  FROM inv_state_positions WHERE tenant_id = p_tenant_id GROUP BY store_id, fc_id;
  CREATE INDEX ON tmp_pos(store_id, fc_id);

  -- Store fc count
  CREATE TEMP TABLE tmp_sfc ON COMMIT DROP AS
  SELECT store_id, COUNT(DISTINCT fc_id)::integer AS fc_count FROM inv_state_positions WHERE tenant_id = p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_sfc(store_id);

  -- Demand
  CREATE TEMP TABLE tmp_dem ON COMMIT DROP AS
  SELECT store_id, fc_id, COALESCE(avg_daily_sales, sales_velocity, 0)::numeric AS velocity,
    COALESCE(customer_orders_qty, 0)::integer AS co_qty, COALESCE(store_orders_qty, 0)::integer AS so_qty
  FROM inv_state_demand WHERE tenant_id = p_tenant_id AND fc_id IN (SELECT fc_id FROM tmp_cw_stock);
  CREATE INDEX ON tmp_dem(store_id, fc_id);

  -- Retail stores
  CREATE TEMP TABLE tmp_stores ON COMMIT DROP AS
  SELECT id, store_name, store_code, tier, capacity,
    CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tier_order
  FROM inv_stores WHERE tenant_id = p_tenant_id AND is_active = true AND location_type != 'central_warehouse';
  CREATE INDEX ON tmp_stores(id);

  -- Store total on hand
  CREATE TEMP TABLE tmp_st_oh ON COMMIT DROP AS
  SELECT store_id, SUM(COALESCE(on_hand,0))::integer AS total_oh FROM inv_state_positions WHERE tenant_id = p_tenant_id GROUP BY store_id;
  CREATE INDEX ON tmp_st_oh(store_id);

  -- ═══ V1: SET-BASED — compute all (fc, store) pairs at once ═══
  IF p_run_type IN ('V1', 'both') THEN
    -- V1 scope collections
    CREATE TEMP TABLE tmp_v1_fc ON COMMIT DROP AS
    SELECT f.id AS fc_id FROM tmp_fcs f
    LEFT JOIN inv_collections c ON c.id = f.collection_id AND c.tenant_id = p_tenant_id
    WHERE f.collection_id IS NULL OR c.is_new_collection = true
       OR f.collection_id IN (SELECT cc.id FROM inv_collections cc WHERE cc.tenant_id = p_tenant_id AND cc.air_date IS NOT NULL ORDER BY cc.air_date DESC LIMIT v_bst_scope_recent_count);

    -- Compute all V1 candidates with window functions to track CW depletion
    WITH v1_raw AS (
      SELECT 
        f.id AS fc_id, f.fc_name, f.fc_code, f.is_core_hero, f.sku_count,
        s.id AS store_id, s.store_name, s.store_code, s.tier, s.capacity, s.tier_order,
        cw.available AS cw_total,
        GREATEST(v_cw_reserve_min, CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku * f.sku_count ELSE 0 END) AS cw_reserve,
        COALESCE(p.on_hand, 0) + COALESCE(p.in_transit, 0) AS current_stock,
        COALESCE(sfc.fc_count, 0) AS store_fc_count,
        COALESCE(d.velocity, 0) AS velocity,
        COALESCE(stoh.total_oh, 0) AS store_total_oh
      FROM tmp_v1_fc vf
      JOIN tmp_fcs f ON f.id = vf.fc_id
      JOIN tmp_cw_stock cw ON cw.fc_id = f.id
      CROSS JOIN tmp_stores s
      LEFT JOIN tmp_pos p ON p.store_id = s.id AND p.fc_id = f.id
      LEFT JOIN tmp_sfc sfc ON sfc.store_id = s.id
      LEFT JOIN tmp_dem d ON d.store_id = s.id AND d.fc_id = f.id
      LEFT JOIN tmp_st_oh stoh ON stoh.store_id = s.id
      WHERE cw.available > GREATEST(v_cw_reserve_min, CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku * f.sku_count ELSE 0 END)
    ),
    v1_with_min AS (
      SELECT *,
        COALESCE((SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= store_fc_count ORDER BY (r->>'max_sku')::integer LIMIT 1), 5) AS min_qty
      FROM v1_raw
    ),
    v1_shortage AS (
      SELECT *,
        min_qty - current_stock AS shortage,
        LEAST(min_qty - current_stock, cw_total - cw_reserve) AS raw_alloc
      FROM v1_with_min
      WHERE min_qty - current_stock > 0
        AND (capacity <= 0 OR capacity - store_total_oh > 0)
    ),
    v1_ordered AS (
      SELECT *,
        LEAST(raw_alloc, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE raw_alloc END) AS alloc_before_depletion,
        ROW_NUMBER() OVER (PARTITION BY fc_id ORDER BY tier_order, shortage DESC) AS rn,
        SUM(LEAST(raw_alloc, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE raw_alloc END)) 
          OVER (PARTITION BY fc_id ORDER BY tier_order, shortage DESC ROWS UNBOUNDED PRECEDING) AS cumulative_alloc
      FROM v1_shortage
      WHERE LEAST(raw_alloc, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE raw_alloc END) > 0
    ),
    v1_final AS (
      SELECT *,
        CASE 
          WHEN cumulative_alloc <= cw_total - cw_reserve THEN alloc_before_depletion
          WHEN cumulative_alloc - alloc_before_depletion < cw_total - cw_reserve THEN (cw_total - cw_reserve) - (cumulative_alloc - alloc_before_depletion)
          ELSE 0
        END AS alloc_qty
      FROM v1_ordered
    )
    INSERT INTO inv_allocation_recommendations (
      tenant_id, run_id, fc_id, fc_name, store_id, store_name, sku,
      recommended_qty, current_on_hand, current_weeks_cover, projected_weeks_cover,
      sales_velocity, priority, reason, potential_revenue, status, stage,
      constraint_checks, explain_text, size_breakdown
    )
    SELECT 
      p_tenant_id, p_run_id, fc_id, COALESCE(fc_name, fc_code, ''),
      store_id, COALESCE(store_name, store_code, ''), NULL,
      alloc_qty::integer, current_stock,
      CASE WHEN velocity > 0 THEN current_stock / (velocity * 7) ELSE 99 END,
      CASE WHEN velocity > 0 THEN (current_stock + alloc_qty) / (velocity * 7) ELSE 99 END,
      velocity,
      CASE WHEN current_stock = 0 THEN 'P1' WHEN shortage > min_qty * 0.5 THEN 'P2' ELSE 'P3' END,
      format('V1: %s thiếu %s units (min=%s, tier=%s)', store_name, shortage, min_qty, tier),
      alloc_qty * v_avg_unit_price, 'pending', 'V1',
      jsonb_build_object('rule', 'v1_min_store_stock', 'tier', tier, 'min_qty_required', min_qty,
        'current_stock', current_stock, 'cw_reserve_floor', cw_reserve, 'is_core_hero', is_core_hero,
        'source_on_hand', cw_total, 'dest_on_hand', current_stock, 'sold_7d', ROUND(velocity * 7)::integer),
      format('V1 Phủ nền: FC %s, CH %s (tier %s) cần min %s, hiện %s, bổ sung %s.',
        COALESCE(fc_name, fc_code), store_name, tier, min_qty, current_stock, alloc_qty),
      NULL
    FROM v1_final
    WHERE alloc_qty > 0;

    GET DIAGNOSTICS v_v1_count = ROW_COUNT;
    SELECT COALESCE(SUM(recommended_qty), 0)::integer INTO v_total_units 
    FROM inv_allocation_recommendations WHERE run_id = p_run_id AND stage = 'V1';
    
    RAISE NOTICE '[V1] Inserted % recommendations, % units', v_v1_count, v_total_units;
  END IF;

  -- ═══ V2: SET-BASED demand allocation ═══
  IF p_run_type IN ('V2', 'both') THEN
    -- Update CW stock after V1 depletion
    UPDATE tmp_cw_stock c SET available = c.available - COALESCE(
      (SELECT SUM(recommended_qty) FROM inv_allocation_recommendations WHERE run_id = p_run_id AND stage = 'V1' AND fc_id = c.fc_id), 0
    );
    DELETE FROM tmp_cw_stock WHERE available <= 0;

    -- Update store totals after V1
    CREATE TEMP TABLE tmp_st_oh2 ON COMMIT DROP AS
    SELECT s.store_id, s.total_oh + COALESCE(v1a.added, 0) AS total_oh
    FROM tmp_st_oh s
    LEFT JOIN (SELECT store_id, SUM(recommended_qty)::integer AS added FROM inv_allocation_recommendations WHERE run_id = p_run_id AND stage = 'V1' GROUP BY store_id) v1a ON v1a.store_id = s.store_id;

    WITH v2_raw AS (
      SELECT 
        f.id AS fc_id, f.fc_name, f.fc_code, f.is_core_hero, f.sku_count,
        s.id AS store_id, s.store_name, s.store_code, s.tier, s.capacity,
        cw.available AS cw_total,
        GREATEST(v_cw_reserve_min, CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku * f.sku_count ELSE 0 END) AS cw_reserve,
        COALESCE(p.on_hand, 0) AS current_stock,
        d.velocity,
        CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) WHEN COALESCE(p.on_hand, 0) > 0 THEN 99 ELSE 0 END AS weeks_cover,
        d.co_qty, d.so_qty,
        CASE WHEN d.co_qty > 0 THEN 'customer_orders' WHEN d.so_qty > 0 THEN 'store_orders'
          WHEN d.velocity > 0 AND (CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) ELSE 99 END) < v_min_cover_weeks THEN 'top_fc'
        END AS priority_type,
        CASE WHEN d.co_qty > 0 THEN d.co_qty WHEN d.so_qty > 0 THEN d.so_qty
          WHEN d.velocity > 0 AND (CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) ELSE 99 END) < v_min_cover_weeks
          THEN CEIL(v_min_cover_weeks * d.velocity * 7 - COALESCE(p.on_hand, 0))::integer
          ELSE 0
        END AS demand_qty,
        COALESCE(stoh.total_oh, 0) AS store_total_oh
      FROM tmp_dem d
      JOIN tmp_fcs f ON f.id = d.fc_id
      JOIN tmp_stores s ON s.id = d.store_id
      JOIN tmp_cw_stock cw ON cw.fc_id = f.id AND cw.available > 0
      LEFT JOIN tmp_pos p ON p.store_id = s.id AND p.fc_id = f.id
      LEFT JOIN tmp_st_oh2 stoh ON stoh.store_id = s.id
      WHERE cw.available > GREATEST(v_cw_reserve_min, CASE WHEN f.is_core_hero THEN v_core_hero_min_per_sku * f.sku_count ELSE 0 END)
    ),
    v2_filtered AS (
      SELECT * FROM v2_raw WHERE priority_type IS NOT NULL AND demand_qty > 0
        AND (capacity <= 0 OR capacity - store_total_oh > 0)
    ),
    v2_ordered AS (
      SELECT *,
        LEAST(demand_qty, cw_total - cw_reserve, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE demand_qty END) AS alloc_before_depletion,
        SUM(LEAST(demand_qty, cw_total - cw_reserve, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE demand_qty END))
          OVER (PARTITION BY fc_id ORDER BY 
            CASE priority_type WHEN 'customer_orders' THEN 0 WHEN 'store_orders' THEN 1 ELSE 2 END,
            weeks_cover ROWS UNBOUNDED PRECEDING) AS cumulative_alloc
      FROM v2_filtered
      WHERE LEAST(demand_qty, cw_total - cw_reserve, CASE WHEN capacity > 0 THEN GREATEST(capacity - store_total_oh, 0) ELSE demand_qty END) > 0
    ),
    v2_final AS (
      SELECT *,
        CASE 
          WHEN cumulative_alloc <= cw_total - cw_reserve THEN alloc_before_depletion
          WHEN cumulative_alloc - alloc_before_depletion < cw_total - cw_reserve THEN (cw_total - cw_reserve) - (cumulative_alloc - alloc_before_depletion)
          ELSE 0
        END AS alloc_qty
      FROM v2_ordered
    )
    INSERT INTO inv_allocation_recommendations (
      tenant_id, run_id, fc_id, fc_name, store_id, store_name, sku,
      recommended_qty, current_on_hand, current_weeks_cover, projected_weeks_cover,
      sales_velocity, priority, reason, potential_revenue, status, stage,
      constraint_checks, explain_text, size_breakdown
    )
    SELECT 
      p_tenant_id, p_run_id, fc_id, COALESCE(fc_name, fc_code, ''),
      store_id, COALESCE(store_name, store_code, ''), NULL,
      alloc_qty::integer, current_stock, weeks_cover,
      CASE WHEN velocity > 0 THEN (current_stock + alloc_qty) / (velocity * 7) ELSE 99 END,
      velocity,
      CASE priority_type WHEN 'customer_orders' THEN 'P1' WHEN 'store_orders' THEN 'P2' ELSE 'P3' END,
      format('V2: %s — %s cần %s, chia %s',
        CASE priority_type WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH cửa hàng' ELSE 'Top bán FC' END,
        store_name, demand_qty, alloc_qty),
      alloc_qty * v_avg_unit_price, 'pending', 'V2',
      jsonb_build_object('rule', 'v2_demand', 'priority_type', priority_type, 'demand_qty', demand_qty,
        'cw_reserve_floor', cw_reserve, 'is_core_hero', is_core_hero,
        'source_on_hand', cw_total, 'dest_on_hand', current_stock, 'sold_7d', ROUND(velocity * 7)::integer),
      format('V2 %s: FC %s, CH %s cần %s, chia %s.',
        CASE priority_type WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH cửa hàng' ELSE 'Top bán FC' END,
        COALESCE(fc_name, fc_code), store_name, demand_qty, alloc_qty),
      NULL
    FROM v2_final
    WHERE alloc_qty > 0;

    GET DIAGNOSTICS v_v2_count = ROW_COUNT;
  END IF;

  -- Final counts
  SELECT COUNT(*)::integer, COALESCE(SUM(recommended_qty), 0)::integer
  INTO v_v1_count, v_total_units
  FROM inv_allocation_recommendations WHERE run_id = p_run_id;
  -- Split counts
  v_v1_count := (SELECT COUNT(*) FROM inv_allocation_recommendations WHERE run_id = p_run_id AND stage = 'V1');
  
  v_result := jsonb_build_object(
    'total_recommendations', v_v1_count + v_v2_count,
    'v1_count', v_v1_count,
    'v2_count', v_v2_count,
    'total_units', v_total_units
  );
  
  RETURN v_result;
END;
$$;
