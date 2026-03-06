CREATE OR REPLACE FUNCTION fn_batch_size_split_v2(
  p_tenant_id uuid,
  p_run_id uuid,
  p_table_name text,
  p_max_records integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SET statement_timeout = '120s'
AS $$
DECLARE
  rec record;
  v_updated int := 0;
  v_skipped int := 0;
  v_total int := 0;
  v_sku_row record;
  v_total_v numeric;
  v_count int;
  v_allocated int;
  v_remaining int;
  v_qty int;
  v_arr jsonb;
  v_i int;
  v_size_ratios jsonb;
BEGIN
  -- Pre-compute max snapshot_date per store ONCE (43 stores = 43 rows, instant)
  CREATE TEMP TABLE IF NOT EXISTS _tmp_max_dates (
    store_id uuid PRIMARY KEY, max_date date
  ) ON COMMIT DROP;
  TRUNCATE _tmp_max_dates;
  INSERT INTO _tmp_max_dates (store_id, max_date)
  SELECT sp.store_id, MAX(sp.snapshot_date)
  FROM inv_state_positions sp
  WHERE sp.tenant_id = p_tenant_id
  GROUP BY sp.store_id;

  CREATE TEMP TABLE IF NOT EXISTS _tmp_size_curves (
    profile_name text PRIMARY KEY, size_ratios jsonb
  ) ON COMMIT DROP;
  TRUNCATE _tmp_size_curves;
  INSERT INTO _tmp_size_curves (profile_name, size_ratios)
  SELECT profile_name, size_ratios
  FROM sem_size_curve_profiles
  WHERE tenant_id = p_tenant_id AND is_current = true
  ON CONFLICT DO NOTHING;

  CREATE TEMP TABLE IF NOT EXISTS _tmp_cw_stock (
    fc_id uuid, sku text, size text, src_oh int, PRIMARY KEY (fc_id, sku)
  ) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _tmp_dest_stock (
    store_id uuid, sku text, dest_oh int, PRIMARY KEY (store_id, sku)
  ) ON COMMIT DROP;
  TRUNCATE _tmp_cw_stock;
  TRUNCATE _tmp_dest_stock;

  -- JOIN on _tmp_max_dates instead of correlated subquery (eliminates N+1 on 2M rows)
  INSERT INTO _tmp_cw_stock (fc_id, sku, size, src_oh)
  SELECT m.fc_id, m.sku, COALESCE(m.size, 'FS'), COALESCE(SUM(sp.on_hand), 0)::int
  FROM inv_sku_fc_mapping m
  JOIN inv_state_positions sp ON sp.sku = m.sku AND sp.tenant_id = p_tenant_id
    AND sp.store_id IN (SELECT id FROM inv_stores WHERE tenant_id = p_tenant_id AND location_type = 'central_warehouse' AND is_active = true)
  JOIN _tmp_max_dates md ON md.store_id = sp.store_id AND sp.snapshot_date = md.max_date
  WHERE m.tenant_id = p_tenant_id AND m.is_active = true
  GROUP BY m.fc_id, m.sku, m.size
  HAVING COALESCE(SUM(sp.on_hand), 0) > 0;

  IF p_table_name = 'alloc' THEN
    INSERT INTO _tmp_dest_stock (store_id, sku, dest_oh)
    SELECT sp.store_id, sp.sku, COALESCE(SUM(sp.on_hand), 0)::int
    FROM inv_state_positions sp
    JOIN _tmp_max_dates md ON md.store_id = sp.store_id AND sp.snapshot_date = md.max_date
    WHERE sp.tenant_id = p_tenant_id
      AND sp.store_id IN (SELECT DISTINCT store_id FROM inv_allocation_recommendations WHERE tenant_id = p_tenant_id AND run_id = p_run_id AND size_breakdown IS NULL LIMIT p_max_records)
    GROUP BY sp.store_id, sp.sku ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO _tmp_dest_stock (store_id, sku, dest_oh)
    SELECT sp.store_id, sp.sku, COALESCE(SUM(sp.on_hand), 0)::int
    FROM inv_state_positions sp
    JOIN _tmp_max_dates md ON md.store_id = sp.store_id AND sp.snapshot_date = md.max_date
    WHERE sp.tenant_id = p_tenant_id
      AND sp.store_id IN (SELECT DISTINCT to_location FROM inv_rebalance_suggestions WHERE tenant_id = p_tenant_id AND run_id = p_run_id AND size_breakdown IS NULL LIMIT p_max_records)
    GROUP BY sp.store_id, sp.sku ON CONFLICT DO NOTHING;
  END IF;

  IF p_table_name = 'alloc' THEN
    FOR rec IN
      SELECT r.id, r.fc_id, r.store_id AS dest_id, COALESCE(r.recommended_qty, 0) AS qty,
        COALESCE(fc.category, '') AS fc_category
      FROM inv_allocation_recommendations r
      LEFT JOIN inv_family_codes fc ON fc.id = r.fc_id AND fc.tenant_id = p_tenant_id
      WHERE r.tenant_id = p_tenant_id AND r.run_id = p_run_id AND r.size_breakdown IS NULL
      LIMIT p_max_records
    LOOP
      v_total := v_total + 1;
      BEGIN
        v_size_ratios := NULL;
        IF rec.fc_category IS NOT NULL AND rec.fc_category != '' THEN
          SELECT sc.size_ratios INTO v_size_ratios FROM _tmp_size_curves sc
          WHERE sc.profile_name ILIKE '%' || rec.fc_category || '%' LIMIT 1;
        END IF;

        SELECT COALESCE(NULLIF(SUM(cs.src_oh), 0), COUNT(*)::numeric), COUNT(*)
        INTO v_total_v, v_count FROM _tmp_cw_stock cs WHERE cs.fc_id = rec.fc_id;

        IF v_count = 0 THEN
          UPDATE inv_allocation_recommendations SET size_breakdown = '[]'::jsonb WHERE id = rec.id;
          v_updated := v_updated + 1; CONTINUE;
        END IF;

        v_arr := '[]'::jsonb; v_allocated := 0;
        FOR v_sku_row IN
          SELECT cs.sku, cs.size, cs.src_oh, COALESCE(ds.dest_oh, 0) as dest_oh
          FROM _tmp_cw_stock cs LEFT JOIN _tmp_dest_stock ds ON ds.store_id = rec.dest_id AND ds.sku = cs.sku
          WHERE cs.fc_id = rec.fc_id ORDER BY cs.src_oh DESC
        LOOP
          IF v_size_ratios IS NOT NULL AND v_size_ratios ? v_sku_row.size THEN
            v_qty := GREATEST(1, ROUND(rec.qty::numeric * COALESCE((v_size_ratios->>v_sku_row.size)::numeric, 0)))::int;
          ELSE
            v_qty := GREATEST(1, ROUND(rec.qty::numeric * v_sku_row.src_oh / v_total_v)::int);
          END IF;
          v_qty := LEAST(v_qty, v_sku_row.src_oh);
          v_allocated := v_allocated + v_qty;
          v_arr := v_arr || jsonb_build_object('sku', v_sku_row.sku, 'size', v_sku_row.size, 'qty', v_qty, 'source_on_hand', v_sku_row.src_oh, 'dest_on_hand', v_sku_row.dest_oh, 'velocity', 0);
        END LOOP;

        v_remaining := rec.qty - v_allocated;
        IF v_remaining > 0 AND jsonb_array_length(v_arr) > 0 THEN
          FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP EXIT WHEN v_remaining<=0;
            DECLARE cur INT:=(v_arr->v_i->>'qty')::int; mx INT:=(v_arr->v_i->>'source_on_hand')::int; a INT;
            BEGIN a:=LEAST(v_remaining,mx-cur); IF a>0 THEN v_arr:=jsonb_set(v_arr,ARRAY[v_i::text,'qty'],to_jsonb(cur+a)); v_remaining:=v_remaining-a; END IF; END;
          END LOOP;
        ELSIF v_remaining < 0 AND jsonb_array_length(v_arr) > 0 THEN
          FOR v_i IN REVERSE jsonb_array_length(v_arr)-1..0 LOOP EXIT WHEN v_remaining>=0;
            DECLARE cur INT:=(v_arr->v_i->>'qty')::int; rd INT;
            BEGIN rd:=LEAST(-v_remaining,cur-1); IF rd>0 THEN v_arr:=jsonb_set(v_arr,ARRAY[v_i::text,'qty'],to_jsonb(cur-rd)); v_remaining:=v_remaining+rd; END IF; END;
          END LOOP;
        END IF;
        DECLARE v_filtered JSONB:='[]'::jsonb;
        BEGIN FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP IF (v_arr->v_i->>'qty')::int>0 THEN v_filtered:=v_filtered||(v_arr->v_i); END IF; END LOOP; v_arr:=v_filtered; END;

        UPDATE inv_allocation_recommendations SET size_breakdown = v_arr WHERE id = rec.id;
        v_updated := v_updated + 1;
      EXCEPTION WHEN OTHERS THEN v_skipped := v_skipped + 1;
      END;
    END LOOP;

  ELSIF p_table_name = 'rebalance' THEN
    FOR rec IN
      SELECT r.id, r.fc_id, r.to_location AS dest_id, COALESCE(r.qty, 0) AS qty,
        COALESCE(fc.category, '') AS fc_category
      FROM inv_rebalance_suggestions r
      LEFT JOIN inv_family_codes fc ON fc.id = r.fc_id AND fc.tenant_id = p_tenant_id
      WHERE r.tenant_id = p_tenant_id AND r.run_id = p_run_id AND r.size_breakdown IS NULL
      LIMIT p_max_records
    LOOP
      v_total := v_total + 1;
      BEGIN
        v_size_ratios := NULL;
        IF rec.fc_category IS NOT NULL AND rec.fc_category != '' THEN
          SELECT sc.size_ratios INTO v_size_ratios FROM _tmp_size_curves sc
          WHERE sc.profile_name ILIKE '%' || rec.fc_category || '%' LIMIT 1;
        END IF;

        SELECT COALESCE(NULLIF(SUM(cs.src_oh), 0), COUNT(*)::numeric), COUNT(*)
        INTO v_total_v, v_count FROM _tmp_cw_stock cs WHERE cs.fc_id = rec.fc_id;

        IF v_count = 0 THEN
          UPDATE inv_rebalance_suggestions SET size_breakdown = '[]'::jsonb WHERE id = rec.id;
          v_updated := v_updated + 1; CONTINUE;
        END IF;

        v_arr := '[]'::jsonb; v_allocated := 0;
        FOR v_sku_row IN
          SELECT cs.sku, cs.size, cs.src_oh, COALESCE(ds.dest_oh, 0) as dest_oh
          FROM _tmp_cw_stock cs LEFT JOIN _tmp_dest_stock ds ON ds.store_id = rec.dest_id AND ds.sku = cs.sku
          WHERE cs.fc_id = rec.fc_id ORDER BY cs.src_oh DESC
        LOOP
          IF v_size_ratios IS NOT NULL AND v_size_ratios ? v_sku_row.size THEN
            v_qty := GREATEST(1, ROUND(rec.qty::numeric * COALESCE((v_size_ratios->>v_sku_row.size)::numeric, 0)))::int;
          ELSE
            v_qty := GREATEST(1, ROUND(rec.qty::numeric * v_sku_row.src_oh / v_total_v)::int);
          END IF;
          v_qty := LEAST(v_qty, v_sku_row.src_oh);
          v_allocated := v_allocated + v_qty;
          v_arr := v_arr || jsonb_build_object('sku', v_sku_row.sku, 'size', v_sku_row.size, 'qty', v_qty, 'source_on_hand', v_sku_row.src_oh, 'dest_on_hand', v_sku_row.dest_oh, 'velocity', 0);
        END LOOP;

        v_remaining := rec.qty - v_allocated;
        IF v_remaining > 0 AND jsonb_array_length(v_arr) > 0 THEN
          FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP EXIT WHEN v_remaining<=0;
            DECLARE cur INT:=(v_arr->v_i->>'qty')::int; mx INT:=(v_arr->v_i->>'source_on_hand')::int; a INT;
            BEGIN a:=LEAST(v_remaining,mx-cur); IF a>0 THEN v_arr:=jsonb_set(v_arr,ARRAY[v_i::text,'qty'],to_jsonb(cur+a)); v_remaining:=v_remaining-a; END IF; END;
          END LOOP;
        ELSIF v_remaining < 0 AND jsonb_array_length(v_arr) > 0 THEN
          FOR v_i IN REVERSE jsonb_array_length(v_arr)-1..0 LOOP EXIT WHEN v_remaining>=0;
            DECLARE cur INT:=(v_arr->v_i->>'qty')::int; rd INT;
            BEGIN rd:=LEAST(-v_remaining,cur-1); IF rd>0 THEN v_arr:=jsonb_set(v_arr,ARRAY[v_i::text,'qty'],to_jsonb(cur-rd)); v_remaining:=v_remaining+rd; END IF; END;
          END LOOP;
        END IF;
        DECLARE v_filtered JSONB:='[]'::jsonb;
        BEGIN FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP IF (v_arr->v_i->>'qty')::int>0 THEN v_filtered:=v_filtered||(v_arr->v_i); END IF; END LOOP; v_arr:=v_filtered; END;

        UPDATE inv_rebalance_suggestions SET size_breakdown = v_arr WHERE id = rec.id;
        v_updated := v_updated + 1;
      EXCEPTION WHEN OTHERS THEN v_skipped := v_skipped + 1;
      END;
    END LOOP;
  END IF;

  DROP TABLE IF EXISTS _tmp_max_dates;
  DROP TABLE IF EXISTS _tmp_cw_stock;
  DROP TABLE IF EXISTS _tmp_dest_stock;
  DROP TABLE IF EXISTS _tmp_size_curves;

  RETURN jsonb_build_object('total', v_total, 'updated', v_updated, 'skipped', v_skipped);
END;
$$;

-- Also optimize fn_store_inventory_value with same CTE pattern
CREATE OR REPLACE FUNCTION fn_store_inventory_value(p_tenant_id uuid)
RETURNS TABLE(store_id uuid, total_value numeric, total_on_hand bigint, avg_unit_cost numeric)
LANGUAGE sql STABLE
SET statement_timeout = '60s'
AS $$
  WITH max_dates AS (
    SELECT sp.store_id, MAX(sp.snapshot_date) as max_date
    FROM inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
    GROUP BY sp.store_id
  ),
  pos AS (
    SELECT p.store_id, p.sku, p.on_hand
    FROM inv_state_positions p
    JOIN max_dates md ON md.store_id = p.store_id AND p.snapshot_date = md.max_date
    WHERE p.tenant_id = p_tenant_id
      AND p.on_hand > 0
  ),
  priced AS (
    SELECT 
      pos.store_id,
      pos.on_hand,
      COALESCE(pr.cost_price, pr.selling_price * 0.6, 150000) AS unit_cost
    FROM pos
    LEFT JOIN LATERAL (
      SELECT cost_price, selling_price
      FROM products
      WHERE tenant_id = p_tenant_id AND sku = pos.sku AND (cost_price > 0 OR selling_price > 0)
      LIMIT 1
    ) pr ON true
  )
  SELECT 
    priced.store_id,
    SUM(priced.on_hand * priced.unit_cost)::NUMERIC AS total_value,
    SUM(priced.on_hand)::BIGINT AS total_on_hand,
    CASE WHEN SUM(priced.on_hand) > 0 
      THEN (SUM(priced.on_hand * priced.unit_cost) / SUM(priced.on_hand))::NUMERIC 
      ELSE 0 
    END AS avg_unit_cost
  FROM priced
  GROUP BY priced.store_id;
$$;