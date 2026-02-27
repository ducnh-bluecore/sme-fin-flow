
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
  v_total_recs integer := 0;
  v_v1_count integer := 0;
  v_v2_count integer := 0;
  v_total_units integer := 0;
  
  -- Constraint values
  v_no_broken_size boolean;
  v_min_cover_weeks numeric;
  v_core_hero_min_per_sku integer;
  v_avg_unit_price numeric;
  v_bst_scope_recent_count integer;
  v_cw_reserved_ranges jsonb;
  v_v1_min_stock_ranges jsonb;
  v_v2_priority_order jsonb;
  
  -- Working vars
  v_cw_total_skus integer;
  v_cw_reserve_min integer;
  
  rec record;
  fc_rec record;
  store_rec record;
  entry_rec record;
  
  v_cw_available integer;
  v_effective_cw_reserve integer;
  v_core_hero_reserve integer;
  v_fc_sku_count integer;
  v_current_stock integer;
  v_total_sku_at_store integer;
  v_min_qty integer;
  v_shortage integer;
  v_alloc_qty integer;
  v_velocity numeric;
  v_new_cover numeric;
  v_current_cover numeric;
  v_remaining_capacity integer;
  v_capacity_capped boolean;
  v_current_total_on_hand integer;
  v_sold_7d integer;
  v_priority text;
BEGIN
  -- ═══ Load constraints ═══
  SELECT COALESCE((SELECT (constraint_value->>'enabled')::boolean FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'no_broken_size' AND is_active), true) INTO v_no_broken_size;
  SELECT COALESCE((SELECT (constraint_value->>'weeks')::numeric FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'v2_min_cover_weeks' AND is_active), 1) INTO v_min_cover_weeks;
  SELECT COALESCE((SELECT (constraint_value->>'min_pcs')::integer FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'cw_core_hero_min_per_sku' AND is_active), 15) INTO v_core_hero_min_per_sku;
  SELECT COALESCE((SELECT (constraint_value->>'amount')::numeric FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'avg_unit_price_default' AND is_active), 250000) INTO v_avg_unit_price;
  SELECT COALESCE((SELECT (constraint_value->>'count')::integer FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'bst_scope_recent_count' AND is_active), 10) INTO v_bst_scope_recent_count;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'cw_reserved_min_by_total_sku' AND is_active), '[{"max_sku":9999,"min_pcs":5}]'::jsonb) INTO v_cw_reserved_ranges;
  SELECT COALESCE((SELECT constraint_value->'ranges' FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'v1_min_store_stock_by_total_sku' AND is_active), '[{"max_sku":9999,"min_qty":5}]'::jsonb) INTO v_v1_min_stock_ranges;
  SELECT COALESCE((SELECT constraint_value FROM inv_constraint_registry WHERE tenant_id = p_tenant_id AND constraint_key = 'v2_priority_order' AND is_active), '["customer_orders","store_orders","top_fc"]'::jsonb) INTO v_v2_priority_order;

  -- ═══ Create temp tables ═══
  
  -- Aggregated CW stock by FC
  CREATE TEMP TABLE tmp_cw_stock AS
  SELECT 
    sp.fc_id,
    SUM(GREATEST(COALESCE(sp.on_hand,0) - COALESCE(sp.reserved,0) - COALESCE(sp.safety_stock,0), 0))::integer AS available
  FROM inv_state_positions sp
  JOIN inv_stores s ON s.id = sp.store_id AND s.tenant_id = p_tenant_id
  WHERE sp.tenant_id = p_tenant_id
    AND s.location_type = 'central_warehouse'
    AND s.is_active = true
  GROUP BY sp.fc_id
  HAVING SUM(GREATEST(COALESCE(sp.on_hand,0) - COALESCE(sp.reserved,0) - COALESCE(sp.safety_stock,0), 0)) > 0;
  
  -- Early exit
  IF NOT EXISTS (SELECT 1 FROM tmp_cw_stock) THEN
    DROP TABLE IF EXISTS tmp_cw_stock;
    RETURN jsonb_build_object('total_recommendations', 0, 'v1_count', 0, 'v2_count', 0, 'total_units', 0, 'message', 'No CW stock available');
  END IF;

  -- CW total SKUs for reserve lookup
  SELECT COUNT(DISTINCT fc_id) INTO v_cw_total_skus FROM tmp_cw_stock;
  
  -- Lookup CW reserve min from ranges
  SELECT COALESCE(
    (SELECT (r->>'min_pcs')::integer FROM jsonb_array_elements(v_cw_reserved_ranges) r WHERE (r->>'max_sku')::integer >= v_cw_total_skus ORDER BY (r->>'max_sku')::integer LIMIT 1),
    5
  ) INTO v_cw_reserve_min;
  
  -- Retail stores sorted by tier
  CREATE TEMP TABLE tmp_retail_stores AS
  SELECT id, store_name, store_code, tier, region, location_type, capacity, display_capacity,
    CASE tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 9 END AS tier_order
  FROM inv_stores
  WHERE tenant_id = p_tenant_id AND is_active = true AND location_type != 'central_warehouse'
  ORDER BY tier_order;
  
  -- Store total on-hand (for capacity checks)
  CREATE TEMP TABLE tmp_store_totals AS
  SELECT store_id, SUM(COALESCE(on_hand,0))::integer AS total_on_hand
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id;
  
  -- Store FC count (for min stock lookup)
  CREATE TEMP TABLE tmp_store_fc_count AS
  SELECT store_id, COUNT(DISTINCT fc_id)::integer AS fc_count
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id;
  
  -- Positions aggregated by store+fc
  CREATE TEMP TABLE tmp_positions AS
  SELECT store_id, fc_id,
    SUM(COALESCE(on_hand,0))::integer AS on_hand,
    SUM(COALESCE(in_transit,0))::integer AS in_transit
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
  GROUP BY store_id, fc_id;
  
  -- Demand
  CREATE TEMP TABLE tmp_demand AS
  SELECT store_id, fc_id, 
    COALESCE(avg_daily_sales, sales_velocity, 0)::numeric AS velocity,
    COALESCE(customer_orders_qty, 0)::integer AS customer_orders_qty,
    COALESCE(store_orders_qty, 0)::integer AS store_orders_qty
  FROM inv_state_demand
  WHERE tenant_id = p_tenant_id
    AND fc_id IN (SELECT fc_id FROM tmp_cw_stock);
  
  -- Size integrity
  CREATE TEMP TABLE tmp_size_int AS
  SELECT fc_id, bool_and(is_full_size_run) AS is_complete
  FROM inv_state_size_integrity
  WHERE tenant_id = p_tenant_id
    AND fc_id IN (SELECT fc_id FROM tmp_cw_stock)
  GROUP BY fc_id;
  
  -- SKU count per FC
  CREATE TEMP TABLE tmp_fc_sku_count AS
  SELECT fc_id, COUNT(*)::integer AS sku_count
  FROM inv_sku_fc_mapping
  WHERE tenant_id = p_tenant_id
    AND fc_id IN (SELECT fc_id FROM tmp_cw_stock)
  GROUP BY fc_id;
  
  -- FCs with CW stock
  CREATE TEMP TABLE tmp_fcs AS
  SELECT f.id, f.fc_code, f.fc_name, f.is_core_hero, f.collection_id, f.product_created_date
  FROM inv_family_codes f
  WHERE f.tenant_id = p_tenant_id
    AND f.is_active = true
    AND f.id IN (SELECT fc_id FROM tmp_cw_stock);

  -- V1 scope FCs (collections-based)
  CREATE TEMP TABLE tmp_v1_scope AS
  SELECT f.id AS fc_id
  FROM tmp_fcs f
  LEFT JOIN inv_collections c ON c.id = f.collection_id AND c.tenant_id = p_tenant_id
  WHERE f.collection_id IS NULL  -- general/restock items
     OR c.is_new_collection = true  -- new collections
     OR c.id IN (
       SELECT cc.id FROM inv_collections cc 
       WHERE cc.tenant_id = p_tenant_id AND cc.air_date IS NOT NULL
       ORDER BY cc.air_date DESC 
       LIMIT v_bst_scope_recent_count
     );

  -- ═══ V1: Baseline by Collection/Tier ═══
  IF p_run_type IN ('V1', 'both') THEN
    FOR fc_rec IN 
      SELECT vs.fc_id, f.fc_name, f.fc_code, f.is_core_hero, cw.available AS cw_available
      FROM tmp_v1_scope vs
      JOIN tmp_fcs f ON f.id = vs.fc_id
      JOIN tmp_cw_stock cw ON cw.fc_id = vs.fc_id
      WHERE cw.available > 0
        AND (NOT v_no_broken_size OR COALESCE((SELECT is_complete FROM tmp_size_int WHERE fc_id = vs.fc_id), true))
    LOOP
      v_cw_available := fc_rec.cw_available;
      
      -- Compute effective CW reserve
      v_fc_sku_count := COALESCE((SELECT sku_count FROM tmp_fc_sku_count WHERE fc_id = fc_rec.fc_id), 1);
      v_core_hero_reserve := CASE WHEN fc_rec.is_core_hero THEN v_core_hero_min_per_sku * v_fc_sku_count ELSE 0 END;
      v_effective_cw_reserve := GREATEST(v_cw_reserve_min, v_core_hero_reserve);
      
      IF v_cw_available <= v_effective_cw_reserve THEN CONTINUE; END IF;
      
      FOR store_rec IN SELECT * FROM tmp_retail_stores ORDER BY tier_order LOOP
        IF v_cw_available <= v_effective_cw_reserve THEN EXIT; END IF;
        
        -- Min stock for this store
        v_total_sku_at_store := COALESCE((SELECT fc_count FROM tmp_store_fc_count WHERE store_id = store_rec.id), 0);
        SELECT COALESCE(
          (SELECT (r->>'min_qty')::integer FROM jsonb_array_elements(v_v1_min_stock_ranges) r WHERE (r->>'max_sku')::integer >= v_total_sku_at_store ORDER BY (r->>'max_sku')::integer LIMIT 1),
          5
        ) INTO v_min_qty;
        
        -- Current stock at store for this FC
        SELECT COALESCE(on_hand, 0) + COALESCE(in_transit, 0)
        INTO v_current_stock
        FROM tmp_positions WHERE store_id = store_rec.id AND fc_id = fc_rec.fc_id;
        v_current_stock := COALESCE(v_current_stock, 0);
        
        v_shortage := v_min_qty - v_current_stock;
        IF v_shortage <= 0 THEN CONTINUE; END IF;
        
        v_alloc_qty := LEAST(v_shortage, v_cw_available - v_effective_cw_reserve);
        IF v_alloc_qty <= 0 THEN CONTINUE; END IF;
        
        -- Capacity check
        v_capacity_capped := false;
        IF store_rec.capacity > 0 THEN
          v_current_total_on_hand := COALESCE((SELECT total_on_hand FROM tmp_store_totals WHERE store_id = store_rec.id), 0);
          v_remaining_capacity := store_rec.capacity - v_current_total_on_hand;
          IF v_remaining_capacity <= 0 THEN CONTINUE; END IF;
          IF v_alloc_qty > v_remaining_capacity THEN
            v_alloc_qty := v_remaining_capacity;
            v_capacity_capped := true;
          END IF;
        END IF;
        IF v_alloc_qty <= 0 THEN CONTINUE; END IF;
        
        -- Velocity & cover
        v_velocity := COALESCE((SELECT velocity FROM tmp_demand WHERE store_id = store_rec.id AND fc_id = fc_rec.fc_id), 0);
        v_current_cover := CASE WHEN v_velocity > 0 THEN v_current_stock / (v_velocity * 7) ELSE 99 END;
        v_new_cover := CASE WHEN v_velocity > 0 THEN (v_current_stock + v_alloc_qty) / (v_velocity * 7) ELSE 99 END;
        v_sold_7d := ROUND(v_velocity * 7)::integer;
        v_priority := CASE WHEN v_current_stock = 0 THEN 'P1' WHEN v_shortage > v_min_qty * 0.5 THEN 'P2' ELSE 'P3' END;
        
        INSERT INTO inv_allocation_recommendations (
          tenant_id, run_id, fc_id, fc_name, store_id, store_name, sku,
          recommended_qty, current_on_hand, current_weeks_cover, projected_weeks_cover,
          sales_velocity, priority, reason, potential_revenue, status, stage,
          constraint_checks, explain_text, size_breakdown
        ) VALUES (
          p_tenant_id, p_run_id, fc_rec.fc_id, COALESCE(fc_rec.fc_name, fc_rec.fc_code, ''),
          store_rec.id, COALESCE(store_rec.store_name, store_rec.store_code, ''), NULL,
          v_alloc_qty, v_current_stock, v_current_cover, v_new_cover,
          v_velocity, v_priority,
          format('V1: %s thiếu %s units (min=%s, tier=%s)', store_rec.store_name, v_shortage, v_min_qty, store_rec.tier),
          v_alloc_qty * v_avg_unit_price, 'pending', 'V1',
          jsonb_build_object(
            'rule', 'v1_min_store_stock', 'tier', store_rec.tier,
            'total_sku_at_store', v_total_sku_at_store, 'min_qty_required', v_min_qty,
            'current_stock', v_current_stock, 'cw_available_before', v_cw_available,
            'cw_reserve_floor', v_effective_cw_reserve, 'is_core_hero', fc_rec.is_core_hero,
            'size_integrity', true, 'capacity_capped', v_capacity_capped,
            'store_capacity', store_rec.capacity,
            'source_on_hand', v_cw_available, 'dest_on_hand', v_current_stock,
            'sold_7d', v_sold_7d
          ),
          format('V1 Phủ nền: FC %s, CH %s (tier %s) cần min %s units, hiện có %s, bổ sung %s. CW còn %s sau chia.',
            COALESCE(fc_rec.fc_name, fc_rec.fc_code), store_rec.store_name, store_rec.tier,
            v_min_qty, v_current_stock, v_alloc_qty, v_cw_available - v_alloc_qty),
          NULL
        );
        
        v_v1_count := v_v1_count + 1;
        v_total_units := v_total_units + v_alloc_qty;
        v_cw_available := v_cw_available - v_alloc_qty;
        
        -- Update CW stock tracker
        UPDATE tmp_cw_stock SET available = v_cw_available WHERE fc_id = fc_rec.fc_id;
        -- Update store capacity tracker
        UPDATE tmp_store_totals SET total_on_hand = total_on_hand + v_alloc_qty WHERE store_id = store_rec.id;
        IF NOT FOUND THEN
          INSERT INTO tmp_store_totals VALUES (store_rec.id, v_alloc_qty);
        END IF;
      END LOOP;
    END LOOP;
    
    RAISE NOTICE '[V1] Generated % recommendations', v_v1_count;
  END IF;

  -- ═══ V2: Demand-based allocation ═══
  IF p_run_type IN ('V2', 'both') THEN
    -- Build demand entries with priority
    CREATE TEMP TABLE tmp_v2_entries AS
    WITH demand_scored AS (
      SELECT 
        rs.id AS store_id, rs.store_name, rs.store_code, rs.tier, rs.capacity,
        f.id AS fc_id, f.fc_name, f.fc_code, f.is_core_hero,
        COALESCE(p.on_hand, 0) AS current_stock,
        COALESCE(d.velocity, 0) AS velocity,
        CASE WHEN COALESCE(d.velocity, 0) > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) 
             WHEN COALESCE(p.on_hand, 0) > 0 THEN 99 ELSE 0 END AS weeks_cover,
        COALESCE(d.customer_orders_qty, 0) AS customer_orders_qty,
        COALESCE(d.store_orders_qty, 0) AS store_orders_qty,
        -- Priority type
        CASE
          WHEN COALESCE(d.customer_orders_qty, 0) > 0 THEN 'customer_orders'
          WHEN COALESCE(d.store_orders_qty, 0) > 0 THEN 'store_orders'
          WHEN COALESCE(d.velocity, 0) > 0 
            AND (CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) ELSE 99 END) < v_min_cover_weeks
            THEN 'top_fc'
          ELSE NULL
        END AS priority_type,
        -- Demand qty
        CASE
          WHEN COALESCE(d.customer_orders_qty, 0) > 0 THEN d.customer_orders_qty
          WHEN COALESCE(d.store_orders_qty, 0) > 0 THEN d.store_orders_qty
          WHEN COALESCE(d.velocity, 0) > 0 
            AND (CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) ELSE 99 END) < v_min_cover_weeks
            THEN CEIL(v_min_cover_weeks * d.velocity * 7 - COALESCE(p.on_hand, 0))::integer
          ELSE 0
        END AS demand_qty
      FROM tmp_retail_stores rs
      CROSS JOIN tmp_fcs f
      LEFT JOIN tmp_positions p ON p.store_id = rs.id AND p.fc_id = f.id
      LEFT JOIN tmp_demand d ON d.store_id = rs.id AND d.fc_id = f.id
      JOIN tmp_cw_stock cw ON cw.fc_id = f.id AND cw.available > 0
      WHERE (NOT v_no_broken_size OR COALESCE((SELECT is_complete FROM tmp_size_int si WHERE si.fc_id = f.id), true))
        AND (COALESCE(d.customer_orders_qty, 0) > 0 OR COALESCE(d.store_orders_qty, 0) > 0
          OR (COALESCE(d.velocity, 0) > 0 AND (CASE WHEN d.velocity > 0 THEN COALESCE(p.on_hand, 0) / (d.velocity * 7) ELSE 99 END) < v_min_cover_weeks))
    )
    SELECT * FROM demand_scored
    WHERE priority_type IS NOT NULL AND demand_qty > 0
    ORDER BY
      CASE priority_type WHEN 'customer_orders' THEN 0 WHEN 'store_orders' THEN 1 WHEN 'top_fc' THEN 2 ELSE 9 END,
      weeks_cover ASC;
    
    FOR entry_rec IN SELECT * FROM tmp_v2_entries LOOP
      v_cw_available := COALESCE((SELECT available FROM tmp_cw_stock WHERE fc_id = entry_rec.fc_id), 0);
      IF v_cw_available <= 0 THEN CONTINUE; END IF;
      
      v_fc_sku_count := COALESCE((SELECT sku_count FROM tmp_fc_sku_count WHERE fc_id = entry_rec.fc_id), 1);
      v_core_hero_reserve := CASE WHEN entry_rec.is_core_hero THEN v_core_hero_min_per_sku * v_fc_sku_count ELSE 0 END;
      v_effective_cw_reserve := GREATEST(v_cw_reserve_min, v_core_hero_reserve);
      
      IF v_cw_available <= v_effective_cw_reserve THEN CONTINUE; END IF;
      
      v_alloc_qty := LEAST(entry_rec.demand_qty, v_cw_available - v_effective_cw_reserve);
      IF v_alloc_qty <= 0 THEN CONTINUE; END IF;
      
      -- Capacity check
      v_capacity_capped := false;
      IF entry_rec.capacity > 0 THEN
        v_current_total_on_hand := COALESCE((SELECT total_on_hand FROM tmp_store_totals WHERE store_id = entry_rec.store_id), 0);
        v_remaining_capacity := entry_rec.capacity - v_current_total_on_hand;
        IF v_remaining_capacity <= 0 THEN CONTINUE; END IF;
        IF v_alloc_qty > v_remaining_capacity THEN
          v_alloc_qty := v_remaining_capacity;
          v_capacity_capped := true;
        END IF;
      END IF;
      IF v_alloc_qty <= 0 THEN CONTINUE; END IF;
      
      v_new_cover := CASE WHEN entry_rec.velocity > 0 THEN (entry_rec.current_stock + v_alloc_qty) / (entry_rec.velocity * 7) ELSE 99 END;
      v_sold_7d := ROUND(entry_rec.velocity * 7)::integer;
      v_priority := CASE entry_rec.priority_type WHEN 'customer_orders' THEN 'P1' WHEN 'store_orders' THEN 'P2' ELSE 'P3' END;
      
      INSERT INTO inv_allocation_recommendations (
        tenant_id, run_id, fc_id, fc_name, store_id, store_name, sku,
        recommended_qty, current_on_hand, current_weeks_cover, projected_weeks_cover,
        sales_velocity, priority, reason, potential_revenue, status, stage,
        constraint_checks, explain_text, size_breakdown
      ) VALUES (
        p_tenant_id, p_run_id, entry_rec.fc_id, COALESCE(entry_rec.fc_name, entry_rec.fc_code, ''),
        entry_rec.store_id, COALESCE(entry_rec.store_name, entry_rec.store_code, ''), NULL,
        v_alloc_qty, entry_rec.current_stock, entry_rec.weeks_cover, v_new_cover,
        entry_rec.velocity, v_priority,
        format('V2: %s — %s cần %s, chia %s',
          CASE entry_rec.priority_type WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH cửa hàng' ELSE 'Top bán FC' END,
          entry_rec.store_name, entry_rec.demand_qty, v_alloc_qty),
        v_alloc_qty * v_avg_unit_price, 'pending', 'V2',
        jsonb_build_object(
          'rule', 'v2_demand', 'priority_type', entry_rec.priority_type,
          'demand_qty', entry_rec.demand_qty, 'cw_available_before', v_cw_available,
          'cw_reserve_floor', v_effective_cw_reserve, 'is_core_hero', entry_rec.is_core_hero,
          'size_integrity', true, 'cover_after', v_new_cover, 'min_cover_weeks', v_min_cover_weeks,
          'capacity_capped', v_capacity_capped, 'store_capacity', entry_rec.capacity,
          'source_on_hand', v_cw_available, 'dest_on_hand', entry_rec.current_stock,
          'sold_7d', v_sold_7d
        ),
        format('V2 %s: FC %s, CH %s cần %s units (%s), chia %s. Cover sau: %sw. CW còn %s.',
          CASE entry_rec.priority_type WHEN 'customer_orders' THEN 'ĐH khách' WHEN 'store_orders' THEN 'ĐH cửa hàng' ELSE 'Top bán FC' END,
          COALESCE(entry_rec.fc_name, entry_rec.fc_code), entry_rec.store_name,
          entry_rec.demand_qty, entry_rec.priority_type, v_alloc_qty,
          ROUND(v_new_cover::numeric, 1), v_cw_available - v_alloc_qty),
        NULL
      );
      
      v_v2_count := v_v2_count + 1;
      v_total_units := v_total_units + v_alloc_qty;
      
      UPDATE tmp_cw_stock SET available = available - v_alloc_qty WHERE fc_id = entry_rec.fc_id;
      UPDATE tmp_store_totals SET total_on_hand = total_on_hand + v_alloc_qty WHERE store_id = entry_rec.store_id;
      IF NOT FOUND THEN
        INSERT INTO tmp_store_totals VALUES (entry_rec.store_id, v_alloc_qty);
      END IF;
    END LOOP;
    
    DROP TABLE IF EXISTS tmp_v2_entries;
    RAISE NOTICE '[V2] Generated % recommendations', v_v2_count;
  END IF;

  -- ═══ Cleanup ═══
  DROP TABLE IF EXISTS tmp_cw_stock;
  DROP TABLE IF EXISTS tmp_retail_stores;
  DROP TABLE IF EXISTS tmp_store_totals;
  DROP TABLE IF EXISTS tmp_store_fc_count;
  DROP TABLE IF EXISTS tmp_positions;
  DROP TABLE IF EXISTS tmp_demand;
  DROP TABLE IF EXISTS tmp_size_int;
  DROP TABLE IF EXISTS tmp_fc_sku_count;
  DROP TABLE IF EXISTS tmp_fcs;
  DROP TABLE IF EXISTS tmp_v1_scope;

  v_total_recs := v_v1_count + v_v2_count;
  
  v_result := jsonb_build_object(
    'total_recommendations', v_total_recs,
    'v1_count', v_v1_count,
    'v2_count', v_v2_count,
    'total_units', v_total_units
  );
  
  RETURN v_result;
END;
$$;
