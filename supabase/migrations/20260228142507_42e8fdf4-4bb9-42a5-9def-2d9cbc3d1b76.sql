
CREATE OR REPLACE FUNCTION public.fn_batch_size_split_alloc(
  p_tenant_id uuid,
  p_run_id uuid,
  p_batch_size int DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rec record;
  v_size_data jsonb;
  v_updated int := 0;
  v_skipped int := 0;
BEGIN
  FOR rec IN
    SELECT id, fc_id, store_id, recommended_qty
    FROM inv_allocation_recommendations
    WHERE tenant_id = p_tenant_id
      AND run_id = p_run_id
      AND size_breakdown IS NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      SELECT fn_allocate_size_split(
        p_tenant_id,
        rec.fc_id,
        NULL::uuid,
        rec.store_id,
        COALESCE(rec.recommended_qty, 0)
      ) INTO v_size_data;

      UPDATE inv_allocation_recommendations
      SET size_breakdown = COALESCE(v_size_data, '[]'::jsonb)
      WHERE id = rec.id;

      v_updated := v_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('updated', v_updated, 'skipped', v_skipped);
END;
$$;

-- Fix fn_allocate_size_split to account for already-allocated qty from the same run
-- The source_on_hand should reflect remaining stock after prior allocations
CREATE OR REPLACE FUNCTION public.fn_allocate_size_split(
  p_tenant_id UUID,
  p_fc_id UUID,
  p_source_store_id UUID,
  p_dest_store_id UUID,
  p_total_qty INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_total_v NUMERIC;
  v_count INT;
  v_allocated INT := 0;
  v_remaining INT;
  r RECORD;
  v_qty INT;
  i INT;
BEGIN
  -- Get totals first (sizes that have stock at source)
  SELECT 
    COALESCE(NULLIF(SUM(COALESCE(dv.velocity, 0)), 0), COUNT(*)::numeric),
    COUNT(*)
  INTO v_total_v, v_count
  FROM inv_sku_fc_mapping m
  INNER JOIN (
    SELECT m2.sku, COALESCE(SUM(sp.on_hand), 0) AS src_oh
    FROM inv_sku_fc_mapping m2
    LEFT JOIN inv_state_positions sp 
      ON sp.sku = m2.sku AND sp.tenant_id = p_tenant_id
      AND (CASE WHEN p_source_store_id IS NOT NULL THEN sp.store_id = p_source_store_id
           ELSE sp.store_id IN (SELECT id FROM inv_stores WHERE tenant_id = p_tenant_id AND location_type = 'central_warehouse' AND is_active = true) END)
    WHERE m2.fc_id = p_fc_id AND m2.tenant_id = p_tenant_id AND m2.is_active = true
    GROUP BY m2.sku HAVING COALESCE(SUM(sp.on_hand), 0) > 0
  ) src ON src.sku = m.sku
  LEFT JOIN (
    SELECT m3.sku, COALESCE(d.sales_velocity, 0) AS velocity
    FROM inv_sku_fc_mapping m3
    LEFT JOIN inv_state_demand d ON d.fc_id = p_fc_id AND d.store_id = p_dest_store_id AND d.tenant_id = p_tenant_id
    WHERE m3.fc_id = p_fc_id AND m3.tenant_id = p_tenant_id AND m3.is_active = true
  ) dv ON dv.sku = m.sku
  WHERE m.fc_id = p_fc_id AND m.tenant_id = p_tenant_id AND m.is_active = true;

  IF v_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Loop and build result
  FOR r IN
    SELECT 
      m.sku,
      COALESCE(m.size, 'FS') AS size,
      src.src_oh AS source_on_hand,
      COALESCE(dv.velocity, 0)::numeric AS velocity,
      COALESCE(dp.dest_oh, 0)::int AS dest_on_hand
    FROM inv_sku_fc_mapping m
    INNER JOIN (
      SELECT m2.sku, COALESCE(SUM(sp.on_hand), 0)::int AS src_oh
      FROM inv_sku_fc_mapping m2
      LEFT JOIN inv_state_positions sp 
        ON sp.sku = m2.sku AND sp.tenant_id = p_tenant_id
        AND (CASE WHEN p_source_store_id IS NOT NULL THEN sp.store_id = p_source_store_id
             ELSE sp.store_id IN (SELECT id FROM inv_stores WHERE tenant_id = p_tenant_id AND location_type = 'central_warehouse' AND is_active = true) END)
      WHERE m2.fc_id = p_fc_id AND m2.tenant_id = p_tenant_id AND m2.is_active = true
      GROUP BY m2.sku HAVING COALESCE(SUM(sp.on_hand), 0) > 0
    ) src ON src.sku = m.sku
    LEFT JOIN (
      SELECT m3.sku, COALESCE(d.sales_velocity, 0) AS velocity
      FROM inv_sku_fc_mapping m3
      LEFT JOIN inv_state_demand d ON d.fc_id = p_fc_id AND d.store_id = p_dest_store_id AND d.tenant_id = p_tenant_id
      WHERE m3.fc_id = p_fc_id AND m3.tenant_id = p_tenant_id AND m3.is_active = true
    ) dv ON dv.sku = m.sku
    LEFT JOIN (
      SELECT sp2.sku, COALESCE(SUM(sp2.on_hand), 0)::int AS dest_oh
      FROM inv_state_positions sp2
      WHERE sp2.store_id = p_dest_store_id AND sp2.tenant_id = p_tenant_id
      GROUP BY sp2.sku
    ) dp ON dp.sku = m.sku
    WHERE m.fc_id = p_fc_id AND m.tenant_id = p_tenant_id AND m.is_active = true
    ORDER BY COALESCE(dv.velocity, 0) DESC, src.src_oh DESC
  LOOP
    IF v_total_v > 0 AND r.velocity > 0 THEN
      v_qty := GREATEST(1, ROUND(p_total_qty * r.velocity / v_total_v)::int);
    ELSE
      v_qty := GREATEST(1, ROUND(p_total_qty::numeric / v_count)::int);
    END IF;
    v_qty := LEAST(v_qty, r.source_on_hand);
    v_allocated := v_allocated + v_qty;
    
    v_result := v_result || jsonb_build_object(
      'sku', r.sku, 'size', r.size, 'qty', v_qty,
      'source_on_hand', r.source_on_hand, 'dest_on_hand', r.dest_on_hand, 'velocity', r.velocity
    );
  END LOOP;

  -- Adjust to match total
  v_remaining := p_total_qty - v_allocated;
  IF v_remaining > 0 THEN
    FOR i IN 0..jsonb_array_length(v_result) - 1 LOOP
      EXIT WHEN v_remaining <= 0;
      DECLARE cur INT := (v_result->i->>'qty')::int; mx INT := (v_result->i->>'source_on_hand')::int; a INT;
      BEGIN a := LEAST(v_remaining, mx - cur); IF a > 0 THEN v_result := jsonb_set(v_result, ARRAY[i::text,'qty'], to_jsonb(cur+a)); v_remaining := v_remaining - a; END IF; END;
    END LOOP;
  ELSIF v_remaining < 0 THEN
    FOR i IN REVERSE jsonb_array_length(v_result)-1..0 LOOP
      EXIT WHEN v_remaining >= 0;
      DECLARE cur INT := (v_result->i->>'qty')::int; rd INT;
      BEGIN rd := LEAST(-v_remaining, cur-1); IF rd > 0 THEN v_result := jsonb_set(v_result, ARRAY[i::text,'qty'], to_jsonb(cur-rd)); v_remaining := v_remaining + rd; END IF; END;
    END LOOP;
  END IF;

  -- Remove zero-qty items
  DECLARE v_filtered JSONB := '[]'::jsonb;
  BEGIN
    FOR i IN 0..jsonb_array_length(v_result)-1 LOOP
      IF (v_result->i->>'qty')::int > 0 THEN v_filtered := v_filtered || (v_result->i); END IF;
    END LOOP;
    v_result := v_filtered;
  END;

  RETURN v_result;
END;
$$;
