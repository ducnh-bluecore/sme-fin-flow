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
BEGIN
  -- Build combined data into a temp table
  CREATE TEMP TABLE _size_split ON COMMIT DROP AS
  WITH source_sizes AS (
    SELECT 
      m.sku,
      m.size,
      COALESCE(SUM(sp.on_hand), 0)::int AS source_on_hand
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
  )
  SELECT 
    s.sku,
    COALESCE(s.size, 'FS') AS size,
    s.source_on_hand,
    COALESCE(dv.velocity, 0)::numeric AS velocity,
    COALESCE(dp.dest_on_hand, 0)::int AS dest_on_hand
  FROM source_sizes s
  LEFT JOIN (
    SELECT m.sku, COALESCE(d.sales_velocity, 0) AS velocity
    FROM inv_sku_fc_mapping m
    LEFT JOIN inv_state_demand d 
      ON d.fc_id = p_fc_id AND d.store_id = p_dest_store_id AND d.tenant_id = p_tenant_id
    WHERE m.fc_id = p_fc_id AND m.tenant_id = p_tenant_id AND m.is_active = true
  ) dv ON dv.sku = s.sku
  LEFT JOIN (
    SELECT sp.sku, COALESCE(SUM(sp.on_hand), 0)::int AS dest_on_hand
    FROM inv_state_positions sp
    WHERE sp.store_id = p_dest_store_id AND sp.tenant_id = p_tenant_id
    GROUP BY sp.sku
  ) dp ON dp.sku = s.sku
  ORDER BY COALESCE(dv.velocity, 0) DESC, s.source_on_hand DESC;

  -- Get totals
  SELECT COALESCE(NULLIF(SUM(velocity), 0), COUNT(*)::numeric), COUNT(*)
    INTO v_total_v, v_count
  FROM _size_split;

  IF v_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- First pass: proportional allocation
  v_result := '[]'::jsonb;
  FOR r IN SELECT * FROM _size_split LOOP
    IF v_total_v > 0 AND r.velocity > 0 THEN
      v_qty := GREATEST(1, ROUND(p_total_qty * r.velocity / v_total_v)::int);
    ELSE
      v_qty := GREATEST(1, ROUND(p_total_qty::numeric / v_count)::int);
    END IF;
    -- Constrain by source
    v_qty := LEAST(v_qty, r.source_on_hand);
    v_allocated := v_allocated + v_qty;
    
    v_result := v_result || jsonb_build_object(
      'sku', r.sku,
      'size', r.size,
      'qty', v_qty,
      'source_on_hand', r.source_on_hand,
      'dest_on_hand', r.dest_on_hand,
      'velocity', r.velocity
    );
  END LOOP;

  -- Second pass: adjust to match p_total_qty
  v_remaining := p_total_qty - v_allocated;
  
  IF v_remaining > 0 THEN
    FOR i IN 0..jsonb_array_length(v_result) - 1 LOOP
      EXIT WHEN v_remaining <= 0;
      DECLARE
        cur_qty INT := (v_result->i->>'qty')::int;
        max_qty INT := (v_result->i->>'source_on_hand')::int;
        add_qty INT;
      BEGIN
        add_qty := LEAST(v_remaining, max_qty - cur_qty);
        IF add_qty > 0 THEN
          v_result := jsonb_set(v_result, ARRAY[i::text, 'qty'], to_jsonb(cur_qty + add_qty));
          v_remaining := v_remaining - add_qty;
        END IF;
      END;
    END LOOP;
  ELSIF v_remaining < 0 THEN
    FOR i IN REVERSE jsonb_array_length(v_result) - 1..0 LOOP
      EXIT WHEN v_remaining >= 0;
      DECLARE
        cur_qty INT := (v_result->i->>'qty')::int;
        red_qty INT;
      BEGIN
        red_qty := LEAST(-v_remaining, cur_qty - 1);
        IF red_qty > 0 THEN
          v_result := jsonb_set(v_result, ARRAY[i::text, 'qty'], to_jsonb(cur_qty - red_qty));
          v_remaining := v_remaining + red_qty;
        END IF;
      END;
    END LOOP;
  END IF;

  -- Remove items with qty = 0
  DECLARE
    v_filtered JSONB := '[]'::jsonb;
  BEGIN
    FOR i IN 0..jsonb_array_length(v_result) - 1 LOOP
      IF (v_result->i->>'qty')::int > 0 THEN
        v_filtered := v_filtered || (v_result->i);
      END IF;
    END LOOP;
    v_result := v_filtered;
  END;

  DROP TABLE IF EXISTS _size_split;
  RETURN v_result;
END;
$$;