
-- =============================================
-- 1. fn_lifecycle_progress with pagination + search + status filter
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_lifecycle_progress(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  fc_id UUID,
  fc_code TEXT,
  fc_name TEXT,
  category TEXT,
  batch_number INTEGER,
  batch_qty INTEGER,
  batch_start_date DATE,
  age_days INTEGER,
  current_on_hand INTEGER,
  batch_sold INTEGER,
  sell_through_pct NUMERIC,
  target_pct NUMERIC,
  gap_pct NUMERIC,
  status TEXT,
  velocity_current NUMERIC,
  velocity_required NUMERIC,
  is_restocked BOOLEAN,
  total_batches INTEGER,
  cash_at_risk NUMERIC,
  source TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      b.fc_id AS ab_fc_id, b.batch_number AS ab_batch_number, b.batch_qty AS ab_batch_qty, 
      b.batch_start_date AS ab_batch_start_date, b.source AS ab_source, b.lifecycle_template_id,
      (v_today - b.batch_start_date) AS age_days_val
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
    SELECT b2.fc_id AS bc_fc_id, COUNT(*)::INTEGER AS total_batch_count, MAX(b2.batch_number) AS max_batch
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
    SELECT m.fc_id AS cs_fc_id, SUM(p.on_hand)::INTEGER AS total_on_hand
    FROM inv_state_positions p
    JOIN latest_snapshots ls ON ls.store_id = p.store_id AND ls.max_date = p.snapshot_date
    JOIN inv_sku_fc_mapping m ON m.sku = p.sku AND m.tenant_id = p.tenant_id
    WHERE p.tenant_id = p_tenant_id
    GROUP BY m.fc_id
  ),
  computed AS (
    SELECT
      ab.ab_fc_id, fc.fc_code AS c_fc_code, fc.fc_name AS c_fc_name, fc.category AS c_category,
      ab.ab_batch_number, ab.ab_batch_qty, ab.ab_batch_start_date,
      ab.age_days_val::INTEGER AS c_age_days,
      COALESCE(cs.total_on_hand, 0)::INTEGER AS c_on_hand,
      GREATEST(ab.ab_batch_qty - COALESCE(cs.total_on_hand, 0), 0)::INTEGER AS c_sold,
      CASE WHEN ab.ab_batch_qty > 0 
        THEN ROUND(GREATEST(ab.ab_batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.ab_batch_qty * 100, 1)
        ELSE 0 END AS c_sell_through,
      COALESCE(
        (SELECT (mi->>'target_pct')::NUMERIC
         FROM jsonb_array_elements(COALESCE(
           (SELECT t2.milestones FROM inv_lifecycle_templates t2 WHERE t2.id = ab.lifecycle_template_id),
           v_milestones
         )) mi
         WHERE (mi->>'day')::INTEGER >= ab.age_days_val
         ORDER BY (mi->>'day')::INTEGER ASC LIMIT 1),
        100)::NUMERIC AS c_target_pct,
      ab.ab_source,
      ab.lifecycle_template_id,
      COALESCE(bc.max_batch, 1) > 1 AS c_is_restocked,
      COALESCE(bc.total_batch_count, 1)::INTEGER AS c_total_batches,
      ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC * 200000 / 1000000, 1) AS c_cash_at_risk,
      CASE WHEN ab.age_days_val > 0 
        THEN ROUND(GREATEST(ab.ab_batch_qty - COALESCE(cs.total_on_hand, 0), 0)::NUMERIC / ab.age_days_val, 2)
        ELSE 0 END AS c_velocity_current,
      CASE WHEN v_lifecycle_days - ab.age_days_val > 0
        THEN ROUND(COALESCE(cs.total_on_hand, 0)::NUMERIC / GREATEST(v_lifecycle_days - ab.age_days_val, 1), 2)
        ELSE 0 END AS c_velocity_required
    FROM active_batches ab
    JOIN inv_family_codes fc ON fc.id = ab.ab_fc_id
    LEFT JOIN current_stock cs ON cs.cs_fc_id = ab.ab_fc_id
    LEFT JOIN batch_counts bc ON bc.bc_fc_id = ab.ab_fc_id
  ),
  with_status AS (
    SELECT c.*,
      CASE
        WHEN c.ab_batch_qty <= 0 THEN 'no_data'
        WHEN c.c_sell_through >= c.c_target_pct THEN 'ahead'
        WHEN c.c_sell_through >= c.c_target_pct - 15 THEN 'on_track'
        WHEN c.c_sell_through >= c.c_target_pct - 30 THEN 'behind'
        ELSE 'critical'
      END AS c_status
    FROM computed c
  ),
  filtered AS (
    SELECT ws.*
    FROM with_status ws
    WHERE (p_search IS NULL OR p_search = '' OR 
           ws.c_fc_code ILIKE '%' || p_search || '%' OR 
           ws.c_fc_name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR ws.c_status = p_status)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered
  )
  SELECT
    f.ab_fc_id, f.c_fc_code, f.c_fc_name, f.c_category,
    f.ab_batch_number, f.ab_batch_qty, f.ab_batch_start_date,
    f.c_age_days, f.c_on_hand, f.c_sold,
    f.c_sell_through, f.c_target_pct,
    f.c_sell_through - f.c_target_pct,
    f.c_status,
    f.c_velocity_current, f.c_velocity_required,
    f.c_is_restocked, f.c_total_batches,
    f.c_cash_at_risk, f.ab_source,
    cnt.cnt
  FROM filtered f, counted cnt
  ORDER BY
    CASE WHEN f.c_status = 'critical' THEN 0
         WHEN f.c_status = 'behind' THEN 1
         WHEN f.c_status = 'on_track' THEN 2
         ELSE 3 END,
    f.c_on_hand DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =============================================
-- 2. fn_lifecycle_product_detail - Product detail with all batches + milestone progress
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(
  p_tenant_id UUID,
  p_fc_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  all_batches AS (
    SELECT 
      b.id AS batch_id, b.batch_number, b.batch_qty, b.batch_start_date, 
      b.source, b.is_completed,
      (v_today - b.batch_start_date) AS age_days,
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
$$;
