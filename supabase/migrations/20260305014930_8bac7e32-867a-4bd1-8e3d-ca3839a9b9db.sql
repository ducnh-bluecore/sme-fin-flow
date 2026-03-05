
-- Drop existing function with old signature first
DROP FUNCTION IF EXISTS public.fn_lifecycle_progress(UUID, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.fn_lifecycle_progress(UUID);

-- Recreate with new return type including first_sale_date
CREATE OR REPLACE FUNCTION public.fn_lifecycle_progress(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  fc_id UUID, fc_code TEXT, fc_name TEXT, category TEXT,
  batch_number INTEGER, batch_qty INTEGER, batch_start_date DATE,
  first_sale_date DATE, age_days INTEGER,
  current_on_hand INTEGER, batch_sold INTEGER, sell_through_pct NUMERIC,
  target_pct NUMERIC, gap_pct NUMERIC, status TEXT,
  velocity_current NUMERIC, velocity_required NUMERIC,
  is_restocked BOOLEAN, total_batches INTEGER, cash_at_risk NUMERIC,
  source TEXT, total_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_milestones JSONB;
  v_lifecycle_days INTEGER;
BEGIN
  SELECT t.milestones, t.lifecycle_days INTO v_milestones, v_lifecycle_days
  FROM inv_lifecycle_templates t
  WHERE t.tenant_id = p_tenant_id AND t.is_default = true
  LIMIT 1;

  v_lifecycle_days := COALESCE(v_lifecycle_days, 180);

  RETURN QUERY
  WITH active_batches AS (
    SELECT DISTINCT ON (b.fc_id)
      b.fc_id, b.batch_number, b.batch_qty, b.batch_start_date,
      b.first_sale_date AS batch_first_sale_date,
      b.source, b.lifecycle_template_id,
      (v_today - COALESCE(b.first_sale_date, b.batch_start_date)) AS age_days_val
    FROM inv_lifecycle_batches b
    JOIN inv_family_codes fc2 ON fc2.id = b.fc_id
    WHERE b.tenant_id = p_tenant_id AND b.is_completed = false
      AND fc2.fc_code NOT LIKE 'SP%'
      AND fc2.fc_code NOT LIKE 'GIFT%'
      AND fc2.fc_code NOT LIKE 'BAG%'
      AND fc2.fc_code NOT LIKE 'BOX%'
      AND fc2.fc_code NOT LIKE 'LB%'
      AND fc2.fc_code NOT LIKE 'BVSE%'
      AND fc2.fc_code NOT LIKE 'VC0%'
      AND fc2.fc_code NOT LIKE 'VCOLV%'
      AND fc2.fc_code NOT LIKE '333.0%'
    ORDER BY b.fc_id, b.batch_number DESC
  ),
  batch_counts AS (
    SELECT b2.fc_id, COUNT(*)::INTEGER AS total_batch_count
    FROM inv_lifecycle_batches b2
    WHERE b2.tenant_id = p_tenant_id
    GROUP BY b2.fc_id
  ),
  latest_snapshots AS (
    SELECT p.store_id, MAX(p.snapshot_date) AS max_date
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
    GROUP BY p.store_id
  ),
  current_stock AS (
    SELECT m.fc_id, SUM(p.on_hand)::INTEGER AS total_on_hand
    FROM inv_state_positions p
    JOIN latest_snapshots ls ON ls.store_id = p.store_id AND ls.max_date = p.snapshot_date
    JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id
    GROUP BY m.fc_id
  ),
  computed AS (
    SELECT
      ab.fc_id, fc.fc_code, fc.fc_name, fc.category,
      ab.batch_number, ab.batch_qty, ab.batch_start_date,
      ab.batch_first_sale_date,
      ab.age_days_val::INTEGER AS age_days_val,
      COALESCE(cs.total_on_hand, 0)::INTEGER AS current_on_hand_val,
      GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::INTEGER AS batch_sold_val,
      CASE WHEN ab.batch_qty > 0 
        THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
        ELSE 0 END AS sell_through_pct_val,
      COALESCE(
        (SELECT (mi->>'target_pct')::NUMERIC
         FROM jsonb_array_elements(COALESCE(
           (SELECT t2.milestones FROM inv_lifecycle_templates t2 WHERE t2.id = ab.lifecycle_template_id),
           v_milestones
         )) mi
         WHERE (mi->>'day')::INTEGER >= ab.age_days_val
         ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1),
        100)::NUMERIC AS target_pct_val,
      bc.total_batch_count,
      ab.source
    FROM active_batches ab
    JOIN inv_family_codes fc ON fc.id = ab.fc_id
    LEFT JOIN current_stock cs ON cs.fc_id = ab.fc_id
    LEFT JOIN batch_counts bc ON bc.fc_id = ab.fc_id
    WHERE
      (p_search IS NULL OR p_search = '' OR 
       fc.fc_code ILIKE '%' || p_search || '%' OR 
       fc.fc_name ILIKE '%' || p_search || '%')
  ),
  filtered AS (
    SELECT c.*,
      c.sell_through_pct_val - c.target_pct_val AS gap_val,
      CASE
        WHEN c.batch_qty <= 0 THEN 'no_data'
        WHEN c.sell_through_pct_val >= c.target_pct_val THEN 'ahead'
        WHEN c.sell_through_pct_val >= c.target_pct_val - 15 THEN 'on_track'
        WHEN c.sell_through_pct_val >= c.target_pct_val - 30 THEN 'behind'
        ELSE 'critical'
      END AS status_val
    FROM computed c
  ),
  status_filtered AS (
    SELECT * FROM filtered f
    WHERE p_status IS NULL OR p_status = '' OR f.status_val = p_status
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM status_filtered
  )
  SELECT
    sf.fc_id, sf.fc_code, sf.fc_name, sf.category,
    sf.batch_number, sf.batch_qty, sf.batch_start_date,
    sf.batch_first_sale_date,
    sf.age_days_val,
    sf.current_on_hand_val,
    sf.batch_sold_val,
    sf.sell_through_pct_val,
    sf.target_pct_val,
    sf.gap_val,
    sf.status_val,
    CASE WHEN sf.age_days_val > 0 AND sf.batch_qty > 0
      THEN ROUND(sf.batch_sold_val::NUMERIC / sf.age_days_val, 2)
      ELSE 0 END,
    CASE WHEN v_lifecycle_days - sf.age_days_val > 0
      THEN ROUND(sf.current_on_hand_val::NUMERIC / GREATEST(v_lifecycle_days - sf.age_days_val, 1), 2)
      ELSE 0 END,
    COALESCE(sf.total_batch_count, 1) > 1,
    COALESCE(sf.total_batch_count, 1),
    ROUND(sf.current_on_hand_val::NUMERIC * 200000 / 1000000, 1),
    sf.source,
    cnt.total
  FROM status_filtered sf
  CROSS JOIN counted cnt
  ORDER BY sf.gap_val ASC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Update fn_lifecycle_product_detail to use first_sale_date
CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(p_tenant_id UUID, p_fc_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_result JSON;
  v_today DATE := CURRENT_DATE;
  v_milestones JSONB;
  v_lifecycle_days INTEGER;
BEGIN
  SELECT t.milestones, t.lifecycle_days INTO v_milestones, v_lifecycle_days
  FROM inv_lifecycle_templates t
  WHERE t.tenant_id = p_tenant_id AND t.is_default = true
  LIMIT 1;

  v_lifecycle_days := COALESCE(v_lifecycle_days, 180);

  WITH fc_info AS (
    SELECT fc.id, fc.fc_code, fc.fc_name, fc.category, fc.subcategory
    FROM inv_family_codes fc
    WHERE fc.id = p_fc_id AND fc.tenant_id = p_tenant_id
  ),
  first_order AS (
    SELECT MIN(o.order_at::DATE) AS first_order_date
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    JOIN inv_sku_fc_mapping m ON TRIM(oi.sku) = m.sku AND m.tenant_id = oi.tenant_id
    WHERE m.fc_id = p_fc_id AND oi.tenant_id = p_tenant_id
  ),
  all_batches AS (
    SELECT 
      b.id AS batch_id, b.batch_number, b.batch_qty, b.batch_start_date, 
      b.first_sale_date,
      b.source, b.is_completed,
      (v_today - COALESCE(b.first_sale_date, b.batch_start_date)) AS age_days,
      b.lifecycle_template_id
    FROM inv_lifecycle_batches b
    WHERE b.fc_id = p_fc_id AND b.tenant_id = p_tenant_id
    ORDER BY b.batch_number
  ),
  active_batch AS (
    SELECT * FROM all_batches WHERE is_completed = false ORDER BY batch_number DESC LIMIT 1
  ),
  latest_snapshots AS (
    SELECT p.store_id, MAX(p.snapshot_date) AS max_date
    FROM inv_state_positions p
    WHERE p.tenant_id = p_tenant_id
    GROUP BY p.store_id
  ),
  current_stock AS (
    SELECT SUM(p.on_hand)::INTEGER AS total_on_hand
    FROM inv_state_positions p
    JOIN latest_snapshots ls ON ls.store_id = p.store_id AND ls.max_date = p.snapshot_date
    JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id AND m.fc_id = p_fc_id
  ),
  milestone_progress AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'day', (mi->>'day')::INTEGER,
        'target_pct', (mi->>'target_pct')::NUMERIC,
        'actual_pct', CASE 
          WHEN ab.age_days >= (mi->>'day')::INTEGER AND ab.batch_qty > 0 
          THEN ROUND(GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100, 1)
          ELSE NULL END,
        'status', CASE
          WHEN ab.age_days < (mi->>'day')::INTEGER THEN 'upcoming'
          WHEN ab.batch_qty <= 0 THEN 'no_data'
          WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100 >= (mi->>'target_pct')::NUMERIC THEN 'ahead'
          WHEN GREATEST(ab.batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.batch_qty * 100 >= (mi->>'target_pct')::NUMERIC - 15 THEN 'on_track'
          ELSE 'behind'
        END
      ) ORDER BY (mi->>'day')::INTEGER
    ) AS milestones_result
    FROM active_batch ab
    CROSS JOIN current_stock cs
    CROSS JOIN jsonb_array_elements(
      COALESCE(
        (SELECT t2.milestones FROM inv_lifecycle_templates t2 WHERE t2.id = ab.lifecycle_template_id),
        v_milestones
      )
    ) mi
  )
  SELECT json_build_object(
    'product', row_to_json(fi),
    'batches', (SELECT json_agg(row_to_json(ab)) FROM all_batches ab),
    'active_batch', (SELECT row_to_json(ab) FROM active_batch ab),
    'current_on_hand', COALESCE((SELECT total_on_hand FROM current_stock), 0),
    'lifecycle_days', v_lifecycle_days,
    'milestones', COALESCE((SELECT milestones_result FROM milestone_progress), '[]'::jsonb),
    'first_sale_date', (SELECT first_order_date FROM first_order),
    'current_sell_through', CASE 
      WHEN (SELECT batch_qty FROM active_batch) > 0 
      THEN ROUND(GREATEST((SELECT batch_qty FROM active_batch) - COALESCE((SELECT total_on_hand FROM current_stock), 0), 0)::NUMERIC / (SELECT batch_qty FROM active_batch) * 100, 1)
      ELSE 0 END,
    'velocity_current', CASE 
      WHEN (SELECT age_days FROM active_batch) > 0 AND (SELECT batch_qty FROM active_batch) > 0
      THEN ROUND(GREATEST((SELECT batch_qty FROM active_batch) - COALESCE((SELECT total_on_hand FROM current_stock), 0), 0)::NUMERIC / (SELECT age_days FROM active_batch), 2)
      ELSE 0 END,
    'velocity_required', CASE 
      WHEN v_lifecycle_days - COALESCE((SELECT age_days FROM active_batch), 0) > 0
      THEN ROUND(COALESCE((SELECT total_on_hand FROM current_stock), 0)::NUMERIC / GREATEST(v_lifecycle_days - COALESCE((SELECT age_days FROM active_batch), 0), 1), 2)
      ELSE 0 END,
    'cash_at_risk', ROUND(COALESCE((SELECT total_on_hand FROM current_stock), 0)::NUMERIC * 200000 / 1000000, 1)
  ) INTO v_result
  FROM fc_info fi;

  RETURN v_result;
END;
$function$;
