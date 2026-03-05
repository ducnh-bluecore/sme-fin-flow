
CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(p_tenant_id TEXT, p_fc_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_fc_uuid UUID;
  v_tenant_uuid UUID := p_tenant_id::uuid;
  v_lifecycle_days INT := 180;
BEGIN
  BEGIN
    v_fc_uuid := p_fc_id::uuid;
    PERFORM 1 FROM inv_family_codes WHERE id = v_fc_uuid AND tenant_id = v_tenant_uuid;
    IF NOT FOUND THEN v_fc_uuid := NULL; END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_fc_uuid := NULL;
  END;

  IF v_fc_uuid IS NULL THEN
    SELECT fc.id INTO v_fc_uuid
    FROM inv_family_codes fc
    WHERE fc.tenant_id = v_tenant_uuid AND fc.fc_code = p_fc_id
    LIMIT 1;
  END IF;

  IF v_fc_uuid IS NULL THEN RETURN NULL; END IF;

  SELECT (t.milestones->-1->>'day')::int INTO v_lifecycle_days
  FROM inv_lifecycle_templates t
  WHERE t.tenant_id = v_tenant_uuid AND t.is_default = true
  LIMIT 1;
  v_lifecycle_days := COALESCE(v_lifecycle_days, 180);

  WITH fc_info AS (
    SELECT fc.id, fc.fc_code, fc.fc_name, fc.category
    FROM inv_family_codes fc
    WHERE fc.id = v_fc_uuid
  ),
  all_batches AS (
    SELECT
      b.id,
      b.batch_number,
      b.batch_qty,
      b.batch_start_date,
      b.first_sale_date,
      COALESCE(b.first_sale_date, b.batch_start_date) AS effective_start,
      b.source,
      b.is_completed,
      (CURRENT_DATE - COALESCE(b.first_sale_date, b.batch_start_date))::int AS age_days
    FROM inv_lifecycle_batches b
    WHERE b.tenant_id = v_tenant_uuid AND b.fc_id = v_fc_uuid
    ORDER BY b.batch_number
  ),
  active AS (
    SELECT *
    FROM all_batches
    WHERE is_completed = false
    ORDER BY batch_number DESC
    LIMIT 1
  ),
  latest_per_store AS (
    SELECT sp.store_id, MAX(sp.snapshot_date) AS max_sd
    FROM inv_state_positions sp
    JOIN inv_sku_fc_mapping m ON m.tenant_id = sp.tenant_id AND m.sku = sp.sku
    WHERE sp.tenant_id = v_tenant_uuid AND m.fc_id = v_fc_uuid
    GROUP BY sp.store_id
  ),
  current_stock AS (
    SELECT COALESCE(SUM(sp.on_hand), 0)::int AS total_on_hand
    FROM inv_state_positions sp
    JOIN inv_sku_fc_mapping m ON m.tenant_id = sp.tenant_id AND m.sku = sp.sku
    JOIN latest_per_store lps ON lps.store_id = sp.store_id AND lps.max_sd = sp.snapshot_date
    WHERE sp.tenant_id = v_tenant_uuid AND m.fc_id = v_fc_uuid
  ),
  sku_map AS (
    SELECT m.sku
    FROM inv_sku_fc_mapping m
    WHERE m.tenant_id = v_tenant_uuid AND m.fc_id = v_fc_uuid
  ),
  sales_data AS (
    SELECT COALESCE(SUM(oi.qty), 0)::int AS total_sold
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    JOIN sku_map sm ON sm.sku = oi.sku
    WHERE oi.tenant_id = v_tenant_uuid
      AND o.order_at >= COALESCE((SELECT a.effective_start FROM active a LIMIT 1), CURRENT_DATE - 180)
      AND o.status NOT IN ('cancelled', 'returned')
  ),
  computed AS (
    SELECT
      sd.total_sold,
      cs.total_on_hand,
      (sd.total_sold + cs.total_on_hand) AS initial_qty,
      CASE
        WHEN (sd.total_sold + cs.total_on_hand) > 0
          THEN ROUND(sd.total_sold::numeric / (sd.total_sold + cs.total_on_hand) * 100, 1)
        ELSE 0
      END AS sell_through_pct,
      COALESCE(a.age_days, 0) AS age_days,
      COALESCE(a.effective_start, CURRENT_DATE) AS effective_start
    FROM sales_data sd
    CROSS JOIN current_stock cs
    LEFT JOIN active a ON true
  ),
  template AS (
    SELECT t.milestones
    FROM inv_lifecycle_templates t
    WHERE t.tenant_id = v_tenant_uuid AND t.is_default = true
    LIMIT 1
  ),
  milestone_rows AS (
    SELECT
      (m->>'day')::int AS day,
      (m->>'target_pct')::numeric AS target_pct
    FROM template t2,
         jsonb_array_elements(t2.milestones) m
  ),
  milestone_materialized AS (
    SELECT
      mr.day,
      mr.target_pct,
      COALESCE(LAG(mr.day) OVER (ORDER BY mr.day) + 1, 0) AS stage_start_day
    FROM milestone_rows mr
  ),
  milestone_calc AS (
    SELECT json_agg(
      json_build_object(
        'day', mm.day,
        'target_pct', mm.target_pct,
        'actual_pct', CASE
          WHEN c.age_days >= mm.stage_start_day AND c.age_days <= mm.day THEN c.sell_through_pct
          WHEN c.age_days > mm.day THEN c.sell_through_pct
          ELSE NULL
        END,
        'status', CASE
          WHEN c.age_days < mm.stage_start_day THEN 'upcoming'
          WHEN c.sell_through_pct >= mm.target_pct THEN 'ahead'
          WHEN c.sell_through_pct >= mm.target_pct * 0.8 THEN 'on_track'
          ELSE 'behind'
        END
      )
      ORDER BY mm.day
    ) AS ms
    FROM (SELECT * FROM milestone_materialized) mm
    CROSS JOIN computed c
  )
  SELECT json_build_object(
    'product', json_build_object(
      'id', fi.id,
      'fc_code', fi.fc_code,
      'fc_name', fi.fc_name,
      'category', fi.category,
      'subcategory', NULL
    ),
    'batches', (
      SELECT COALESCE(json_agg(json_build_object(
        'batch_id', ab.id,
        'batch_number', ab.batch_number,
        'batch_qty', ab.batch_qty,
        'batch_start_date', ab.batch_start_date,
        'source', ab.source,
        'is_completed', ab.is_completed,
        'age_days', ab.age_days
      ) ORDER BY ab.batch_number), '[]'::json)
      FROM all_batches ab
    ),
    'active_batch', (
      SELECT json_build_object(
        'batch_id', a2.id,
        'batch_number', a2.batch_number,
        'batch_qty', a2.batch_qty,
        'batch_start_date', a2.batch_start_date,
        'source', a2.source,
        'is_completed', a2.is_completed,
        'age_days', a2.age_days
      )
      FROM active a2
    ),
    'current_on_hand', c.total_on_hand,
    'lifecycle_days', v_lifecycle_days,
    'milestones', COALESCE(mc.ms, '[]'::json),
    'first_sale_date', (SELECT a3.effective_start::text FROM active a3),
    'current_sell_through', c.sell_through_pct,
    'total_sold', c.total_sold,
    'initial_qty', c.initial_qty,
    'velocity_current', CASE WHEN c.age_days > 0 THEN ROUND(c.total_sold::numeric / c.age_days, 1) ELSE 0 END,
    'velocity_required', CASE
      WHEN (v_lifecycle_days - c.age_days) > 0 AND c.total_on_hand > 0
        THEN ROUND(c.total_on_hand::numeric / (v_lifecycle_days - c.age_days), 1)
      ELSE 0
    END,
    'cash_at_risk', 0
  ) INTO v_result
  FROM fc_info fi
  LEFT JOIN computed c ON true
  LEFT JOIN milestone_calc mc ON true;

  RETURN v_result;
END;
$$;
