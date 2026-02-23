
-- Step 1: Add size_breakdown column to inv_allocation_recommendations
ALTER TABLE public.inv_allocation_recommendations 
ADD COLUMN IF NOT EXISTS size_breakdown jsonb DEFAULT NULL;

-- Step 2: Also add to inv_rebalance_suggestions (lateral transfers)
ALTER TABLE public.inv_rebalance_suggestions
ADD COLUMN IF NOT EXISTS size_breakdown jsonb DEFAULT NULL;

-- Step 3: Create fn_allocate_size_split function
-- Allocates total_qty across sizes for a given FC, prioritizing by sales velocity at destination
CREATE OR REPLACE FUNCTION public.fn_allocate_size_split(
  p_tenant_id UUID,
  p_fc_id UUID,
  p_source_store_id UUID,  -- NULL = all central warehouses
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
  -- Build a temp table of available sizes at source with velocity at dest
  -- Then allocate proportionally
  
  WITH source_sizes AS (
    -- Get all SKUs for this FC that have stock at source
    SELECT 
      m.sku,
      m.size_code,
      COALESCE(SUM(sp.on_hand), 0) AS source_on_hand
    FROM inv_sku_fc_mapping m
    LEFT JOIN inv_state_positions sp 
      ON sp.sku = m.sku 
      AND sp.tenant_id = p_tenant_id
      AND (
        -- If source specified, match it; otherwise match any central warehouse
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
    GROUP BY m.sku, m.size_code
    HAVING COALESCE(SUM(sp.on_hand), 0) > 0
  ),
  dest_velocity AS (
    -- Get sales velocity per SKU at destination from demand data
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
    -- Get current stock at destination per SKU
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
      s.size_code,
      s.source_on_hand,
      COALESCE(dv.velocity, 0) AS velocity,
      COALESCE(dp.dest_on_hand, 0) AS dest_on_hand
    FROM source_sizes s
    LEFT JOIN dest_velocity dv ON dv.sku = s.sku
    LEFT JOIN dest_positions dp ON dp.sku = s.sku
    ORDER BY 
      COALESCE(dv.velocity, 0) DESC,  -- highest velocity first
      s.source_on_hand DESC            -- then by availability
  ),
  total_velocity AS (
    SELECT COALESCE(NULLIF(SUM(velocity), 0), COUNT(*)::numeric) AS total_v
    FROM combined
  )
  -- Allocate proportionally by velocity, constrained by source availability
  SELECT jsonb_agg(
    jsonb_build_object(
      'sku', c.sku,
      'size', COALESCE(c.size_code, 'FS'),
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

  -- If no sizes found, return empty array
  IF v_result IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Post-process: ensure total allocated = p_total_qty
  -- Adjust quantities to match the requested total
  DECLARE
    v_allocated INT;
    v_items JSONB;
    v_item JSONB;
    v_idx INT;
    v_diff INT;
  BEGIN
    v_items := v_result;
    v_allocated := 0;
    
    -- Sum current allocation
    FOR v_idx IN 0..jsonb_array_length(v_items) - 1 LOOP
      v_allocated := v_allocated + (v_items->v_idx->>'qty')::int;
    END LOOP;
    
    v_diff := p_total_qty - v_allocated;
    
    -- Distribute difference to items with available stock
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
      -- Remove excess from last items
      FOR v_idx IN REVERSE jsonb_array_length(v_items) - 1..0 LOOP
        EXIT WHEN v_diff >= 0;
        DECLARE
          v_current_qty INT := (v_items->v_idx->>'qty')::int;
          v_remove INT;
        BEGIN
          v_remove := LEAST(-v_diff, v_current_qty - 1);  -- keep at least 1
          IF v_remove > 0 THEN
            v_items := jsonb_set(v_items, ARRAY[v_idx::text, 'qty'], to_jsonb(v_current_qty - v_remove));
            v_diff := v_diff + v_remove;
          END IF;
        END;
      END LOOP;
    END IF;
    
    -- Remove items with qty = 0
    v_result := '[]'::jsonb;
    FOR v_idx IN 0..jsonb_array_length(v_items) - 1 LOOP
      IF (v_items->v_idx->>'qty')::int > 0 THEN
        v_result := v_result || jsonb_build_array(v_items->v_idx);
      END IF;
    END LOOP;
  END;

  RETURN v_result;
END;
$$;
