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
  v_remaining INT := p_total_qty;
  v_row RECORD;
BEGIN
  WITH source_sizes AS (
    SELECT 
      m.sku,
      m.size,
      COALESCE(SUM(sp.on_hand), 0) AS source_on_hand
    FROM inv_sku_fc_mapping m
    LEFT JOIN inv_state_positions sp 
      ON sp.sku = m.sku 
      AND sp.tenant_id = p_tenant_id
      AND (
        CASE WHEN p_source_store_id IS NOT NULL 
          THEN sp.store_id = p_source_store_id
          ELSE sp.store_id IN (
            SELECT id FROM inv_stores 
            WHERE tenant_id = p_tenant_id 
              AND location_type = 'central_warehouse' 
              AND is_active = true
          )
        END
      )
    WHERE m.fc_id = p_fc_id 
      AND m.tenant_id = p_tenant_id
      AND m.is_active = true
    GROUP BY m.sku, m.size
    HAVING COALESCE(SUM(sp.on_hand), 0) > 0
  ),
  dest_velocity AS (
    SELECT 
      m.sku,
      COALESCE(d.sales_velocity, 0) AS velocity
    FROM inv_sku_fc_mapping m
    LEFT JOIN inv_state_demand d 
      ON d.fc_id = p_fc_id 
      AND d.store_id = p_dest_store_id
      AND d.tenant_id = p_tenant_id
    WHERE m.fc_id = p_fc_id 
      AND m.tenant_id = p_tenant_id
      AND m.is_active = true
  ),
  dest_positions AS (
    SELECT 
      sp.sku,
      COALESCE(SUM(sp.on_hand), 0) AS dest_on_hand
    FROM inv_state_positions sp
    WHERE sp.store_id = p_dest_store_id
      AND sp.tenant_id = p_tenant_id
      AND sp.sku IN (SELECT sku FROM source_sizes)
    GROUP BY sp.sku
  ),
  combined AS (
    SELECT 
      s.sku,
      s.size,
      s.source_on_hand,
      COALESCE(dv.velocity, 0) AS velocity,
      COALESCE(dp.dest_on_hand, 0) AS dest_on_hand
    FROM source_sizes s
    LEFT JOIN dest_velocity dv ON dv.sku = s.sku
    LEFT JOIN dest_positions dp ON dp.sku = s.sku
    ORDER BY 
      COALESCE(dv.velocity, 0) DESC,
      s.source_on_hand DESC
  ),
  total_velocity AS (
    SELECT COALESCE(NULLIF(SUM(velocity), 0), COUNT(*)::numeric) AS total_v
    FROM combined
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'sku', c.sku,
      'size', COALESCE(c.size, 'FS'),
      'qty', LEAST(
        CASE 
          WHEN tv.total_v > 0 AND SUM(c.velocity) OVER () > 0
            THEN GREATEST(1, ROUND(p_total_qty * c.velocity / tv.total_v)::int)
          ELSE GREATEST(1, ROUND(p_total_qty::numeric / (SELECT COUNT(*) FROM combined))::int)
        END,
        c.source_on_hand
      ),
      'source_on_hand', c.source_on_hand,
      'dest_on_hand', c.dest_on_hand,
      'velocity', c.velocity
    )
  ) INTO v_result
  FROM combined c
  CROSS JOIN total_velocity tv;

  IF v_result IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Post-process: ensure total allocated = p_total_qty
  DECLARE
    v_allocated INT;
    v_items JSONB;
    v_item JSONB;
    v_idx INT;
    v_diff INT;
  BEGIN
    v_items := v_result;
    v_allocated := 0;
    
    FOR v_idx IN 0..jsonb_array_length(v_items) - 1 LOOP
      v_allocated := v_allocated + (v_items->v_idx->>'qty')::int;
    END LOOP;
    
    v_diff := p_total_qty - v_allocated;
    
    IF v_diff > 0 THEN
      FOR v_idx IN 0..jsonb_array_length(v_items) - 1 LOOP
        EXIT WHEN v_diff <= 0;
        DECLARE
          v_current_qty INT := (v_items->v_idx->>'qty')::int;
          v_max_qty INT := (v_items->v_idx->>'source_on_hand')::int;
          v_add INT;
        BEGIN
          v_add := LEAST(v_diff, v_max_qty - v_current_qty);
          IF v_add > 0 THEN
            v_items := jsonb_set(v_items, ARRAY[v_idx::text, 'qty'], to_jsonb(v_current_qty + v_add));
            v_diff := v_diff - v_add;
          END IF;
        END;
      END LOOP;
    ELSIF v_diff < 0 THEN
      FOR v_idx IN REVERSE jsonb_array_length(v_items) - 1..0 LOOP
        EXIT WHEN v_diff >= 0;
        DECLARE
          v_current_qty INT := (v_items->v_idx->>'qty')::int;
          v_reduce INT;
        BEGIN
          v_reduce := LEAST(-v_diff, v_current_qty - 1);
          IF v_reduce > 0 THEN
            v_items := jsonb_set(v_items, ARRAY[v_idx::text, 'qty'], to_jsonb(v_current_qty - v_reduce));
            v_diff := v_diff + v_reduce;
          END IF;
        END;
      END LOOP;
    END IF;
    
    v_result := v_items;
  END;

  RETURN v_result;
END;
$$;