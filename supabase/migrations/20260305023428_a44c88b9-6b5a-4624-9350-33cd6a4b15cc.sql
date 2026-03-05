CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(p_tenant_id text, p_fc_id text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_fc_uuid UUID;
  v_lifecycle_days INT := 180;
BEGIN
  -- Resolve fc_code to UUID
  SELECT fc.id INTO v_fc_uuid
  FROM inv_family_codes fc
  WHERE fc.tenant_id = p_tenant_id AND fc.fc_code = p_fc_id
  LIMIT 1;

  IF v_fc_uuid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get lifecycle_days from default template
  SELECT (t.milestones->-1->>'day')::int INTO v_lifecycle_days
  FROM inv_lifecycle_templates t
  WHERE t.tenant_id = p_tenant_id AND t.is_default = true
  LIMIT 1;
  v_lifecycle_days := COALESCE(v_lifecycle_days, 180);

  WITH fc_info AS (
    SELECT fc.id, fc.fc_code, fc.fc_name, fc.category
    FROM inv_family_codes fc
    WHERE fc.id = v_fc_uuid
  ),
  all_batches AS (
    SELECT b.id, b.batch_number, b.batch_qty, b.batch_start_date, b.first_sale_date,
      COALESCE(b.first_sale_date, b.batch_start_date) AS effective_start,
      b.source, b.is_completed,
      (CURRENT_DATE - COALESCE(b.first_sale_date, b.batch_start_date))::int AS age_days
    FROM inv_lifecycle_batches b
    WHERE b.tenant_id = p_tenant_id AND b.fc_id = v_fc_uuid
    ORDER BY b.batch_number
  ),
  active AS (
    SELECT * FROM all_batches WHERE is_completed = false ORDER BY batch_number DESC LIMIT 1
  ),
  latest_snap AS (
    SELECT MAX(sp.snapshot_date) AS sd
    FROM inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
  ),
  current_stock AS (
    SELECT COALESCE(SUM(sp.on_hand), 0)::int AS total_on_hand
    FROM inv_state_positions sp, latest_snap ls2
    WHERE sp.tenant_id = p_tenant_id AND sp.fc_id = v_fc_uuid
      AND sp.snapshot_date = ls2.sd
  ),
  -- Sales from cdp_orders (SSOT)
  sku_map AS (
    SELECT m.sku
    FROM inv_sku_fc_mapping m
    WHERE m.tenant_id = p_tenant_id AND m.fc_id = v_fc_uuid
  ),
  sales_data AS (
    SELECT 
      COALESCE(SUM(oi.qty), 0)::int AS total_sold
    FROM cdp_order_items oi
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = p_tenant_id
    JOIN sku_map sm ON oi.sku = sm.sku
    WHERE o.tenant_id = p_tenant_id
      AND o.order_date >= (SELECT COALESCE(a.effective_start, CURRENT_DATE - 180) FROM active a)
      AND o.status NOT IN ('cancelled', 'returned')
  ),
  computed AS (
    SELECT
      sd.total_sold,
      cs.total_on_hand,
      (sd.total_sold + cs.total_on_hand) AS initial_qty,
      CASE WHEN (sd.total_sold + cs.total_on_hand) > 0
        THEN ROUND(sd.total_sold::numeric / (sd.total_sold + cs.total_on_hand) * 100, 1)
        ELSE 0 END AS sell_through_pct,
      a.age_days,
      a.effective_start
    FROM sales_data sd, current_stock cs, active a
  ),
  template AS (
    SELECT t.milestones
    FROM inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  ),
  milestone_calc AS (
    SELECT json_agg(json_build_object(
      'day', (m->>'day')::int,
      'target_pct', (m->>'target_pct')::numeric,
      'actual_pct', CASE 
        WHEN c.age_days >= (m->>'day')::int THEN c.sell_through_pct
        ELSE NULL END,
      'status', CASE
        WHEN c.age_days < (m->>'day')::int THEN 'upcoming'
        WHEN c.sell_through_pct >= (m->>'target_pct')::numeric THEN 'ahead'
        WHEN c.sell_through_pct >= (m->>'target_pct')::numeric * 0.8 THEN 'on_track'
        ELSE 'behind'
      END
    ) ORDER BY (m->>'day')::int) AS ms
    FROM template t2, computed c, jsonb_array_elements(t2.milestones) m
  )
  SELECT json_build_object(
    'product', json_build_object(
      'id', fi.id,
      'fc_code', fi.fc_code,
      'fc_name', fi.fc_name,
      'category', fi.category,
      'subcategory', null
    ),
    'batches', (SELECT COALESCE(json_agg(json_build_object(
      'batch_id', ab.id,
      'batch_number', ab.batch_number,
      'batch_qty', ab.batch_qty,
      'batch_start_date', ab.batch_start_date,
      'source', ab.source,
      'is_completed', ab.is_completed,
      'age_days', ab.age_days
    ) ORDER BY ab.batch_number), '[]'::json) FROM all_batches ab),
    'active_batch', (SELECT json_build_object(
      'batch_id', a2.id,
      'batch_number', a2.batch_number,
      'batch_qty', a2.batch_qty,
      'batch_start_date', a2.batch_start_date,
      'source', a2.source,
      'is_completed', a2.is_completed,
      'age_days', a2.age_days
    ) FROM active a2),
    'current_on_hand', c.total_on_hand,
    'lifecycle_days', v_lifecycle_days,
    'milestones', COALESCE(mc.ms, '[]'::json),
    'first_sale_date', (SELECT MIN(a3.effective_start)::text FROM all_batches a3),
    'current_sell_through', c.sell_through_pct,
    'velocity_current', CASE WHEN c.age_days > 0 
      THEN ROUND(c.total_sold::numeric / c.age_days, 1) ELSE 0 END,
    'velocity_required', CASE WHEN (v_lifecycle_days - c.age_days) > 0 AND c.total_on_hand > 0
      THEN ROUND(c.total_on_hand::numeric / (v_lifecycle_days - c.age_days), 1) ELSE 0 END,
    'cash_at_risk', 0
  ) INTO v_result
  FROM fc_info fi
  LEFT JOIN computed c ON true
  LEFT JOIN milestone_calc mc ON true;

  RETURN v_result;
END;
$$;