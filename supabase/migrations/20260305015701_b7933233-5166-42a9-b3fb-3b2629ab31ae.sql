
-- Drop old functions with mismatched signatures
DROP FUNCTION IF EXISTS public.fn_lifecycle_progress(UUID, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.fn_lifecycle_product_detail(UUID, TEXT);

-- Recreate fn_lifecycle_progress with first_sale_date
CREATE OR REPLACE FUNCTION public.fn_lifecycle_progress(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  fc_id TEXT,
  fc_name TEXT,
  category TEXT,
  batch_number INT,
  initial_qty INT,
  current_qty INT,
  sold_qty INT,
  sell_through_pct NUMERIC,
  age_days INT,
  first_sale_date DATE,
  batch_start_date DATE,
  status TEXT,
  target_pct NUMERIC,
  gap_pct NUMERIC,
  days_behind INT,
  velocity_required NUMERIC,
  cash_at_risk NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '25s'
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(DISTINCT b.fc_id) INTO v_total
  FROM public.inv_lifecycle_batches b
  WHERE b.tenant_id = p_tenant_id
    AND b.is_completed = false
    AND (p_search IS NULL OR b.fc_id ILIKE '%' || p_search || '%');

  RETURN QUERY
  WITH active_batches AS (
    SELECT DISTINCT ON (b2.fc_id) 
      b2.fc_id,
      b2.batch_number,
      b2.batch_qty,
      COALESCE(b2.first_sale_date, b2.batch_start_date) AS effective_start,
      b2.first_sale_date AS raw_first_sale_date,
      b2.batch_start_date AS raw_batch_start_date
    FROM public.inv_lifecycle_batches b2
    WHERE b2.tenant_id = p_tenant_id
      AND b2.is_completed = false
      AND (p_search IS NULL OR b2.fc_id ILIKE '%' || p_search || '%')
    ORDER BY b2.fc_id, b2.batch_number DESC
  ),
  latest_stock AS (
    SELECT DISTINCT ON (sp.fc_code)
      sp.fc_code,
      sp.total_on_hand
    FROM public.inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
    ORDER BY sp.fc_code, sp.snapshot_date DESC
  ),
  fc_names AS (
    SELECT DISTINCT ON (m.fc_code)
      m.fc_code,
      m.fc_name,
      m.category
    FROM public.inv_sku_fc_mapping m
    WHERE m.tenant_id = p_tenant_id
  ),
  template AS (
    SELECT t.milestones
    FROM public.inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  ),
  progress AS (
    SELECT
      ab.fc_id,
      fn.fc_name,
      fn.category,
      ab.batch_number,
      ab.batch_qty AS initial_qty,
      COALESCE(ls.total_on_hand, 0)::int AS current_qty,
      GREATEST(ab.batch_qty - COALESCE(ls.total_on_hand, 0), 0)::int AS sold_qty,
      CASE WHEN ab.batch_qty > 0 
        THEN ROUND(GREATEST(ab.batch_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab.batch_qty * 100, 1)
        ELSE 0 END AS sell_through_pct,
      (CURRENT_DATE - ab.effective_start)::int AS age_days,
      ab.raw_first_sale_date,
      ab.raw_batch_start_date,
      t.milestones
    FROM active_batches ab
    LEFT JOIN latest_stock ls ON ls.fc_code = ab.fc_id
    LEFT JOIN fc_names fn ON fn.fc_code = ab.fc_id
    CROSS JOIN template t
  ),
  with_status AS (
    SELECT
      p.*,
      (SELECT (m2->>'target_pct')::numeric 
       FROM jsonb_array_elements(p.milestones) m2 
       WHERE (m2->>'day')::int <= p.age_days 
       ORDER BY (m2->>'day')::int DESC LIMIT 1) AS cur_target,
      CASE 
        WHEN p.sell_through_pct >= COALESCE(
          (SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.age_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) + 10
          THEN 'ahead'
        WHEN p.sell_through_pct >= COALESCE(
          (SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.age_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 5
          THEN 'on_track'
        WHEN p.sell_through_pct >= COALESCE(
          (SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.age_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 20
          THEN 'behind'
        ELSE 'critical'
      END AS computed_status
    FROM progress p
  )
  SELECT
    ws.fc_id,
    ws.fc_name,
    ws.category,
    ws.batch_number,
    ws.initial_qty,
    ws.current_qty,
    ws.sold_qty,
    ws.sell_through_pct,
    ws.age_days,
    ws.raw_first_sale_date,
    ws.raw_batch_start_date,
    ws.computed_status,
    ws.cur_target,
    CASE WHEN ws.cur_target IS NOT NULL THEN ws.sell_through_pct - ws.cur_target ELSE NULL END,
    CASE WHEN ws.cur_target IS NOT NULL AND ws.sell_through_pct < ws.cur_target 
      THEN ((ws.cur_target - ws.sell_through_pct) / GREATEST(ws.sell_through_pct / GREATEST(ws.age_days, 1), 0.01))::int
      ELSE 0 END,
    CASE WHEN ws.current_qty > 0 AND ws.initial_qty > 0
      THEN ROUND((ws.current_qty::numeric / GREATEST(180 - ws.age_days, 1)) * (180 - ws.age_days)::numeric / ws.initial_qty * 100, 1)
      ELSE 0 END,
    CASE WHEN ws.current_qty > 0
      THEN ws.current_qty * 250000
      ELSE 0 END,
    v_total
  FROM with_status ws
  WHERE (p_status IS NULL OR ws.computed_status = p_status)
  ORDER BY 
    CASE ws.computed_status 
      WHEN 'critical' THEN 1 
      WHEN 'behind' THEN 2 
      WHEN 'on_track' THEN 3 
      WHEN 'ahead' THEN 4 
    END,
    ws.age_days DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Recreate fn_lifecycle_product_detail
CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(
  p_tenant_id UUID,
  p_fc_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH batches AS (
    SELECT 
      b.id, b.batch_number, b.batch_qty, 
      b.batch_start_date, b.first_sale_date,
      COALESCE(b.first_sale_date, b.batch_start_date) AS effective_start,
      b.source, b.is_completed
    FROM public.inv_lifecycle_batches b
    WHERE b.tenant_id = p_tenant_id AND b.fc_id = p_fc_id
    ORDER BY b.batch_number DESC
  ),
  fc_info AS (
    SELECT DISTINCT ON (m.fc_code)
      m.fc_code, m.fc_name, m.category
    FROM public.inv_sku_fc_mapping m
    WHERE m.tenant_id = p_tenant_id AND m.fc_code = p_fc_id
  ),
  latest_stock AS (
    SELECT sp.total_on_hand
    FROM public.inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id AND sp.fc_code = p_fc_id
    ORDER BY sp.snapshot_date DESC LIMIT 1
  ),
  template AS (
    SELECT t.milestones
    FROM public.inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  ),
  active_batch AS (
    SELECT * FROM batches WHERE is_completed = false LIMIT 1
  )
  SELECT json_build_object(
    'fc_id', fi.fc_code,
    'fc_name', fi.fc_name,
    'category', fi.category,
    'current_stock', COALESCE(ls.total_on_hand, 0),
    'active_batch', (
      SELECT json_build_object(
        'batch_number', ab.batch_number,
        'batch_qty', ab.batch_qty,
        'batch_start_date', ab.batch_start_date,
        'first_sale_date', ab.first_sale_date,
        'effective_start', ab.effective_start,
        'age_days', (CURRENT_DATE - ab.effective_start)::int,
        'sold_qty', GREATEST(ab.batch_qty - COALESCE(ls.total_on_hand, 0), 0),
        'sell_through_pct', CASE WHEN ab.batch_qty > 0 
          THEN ROUND(GREATEST(ab.batch_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab.batch_qty * 100, 1)
          ELSE 0 END
      ) FROM active_batch ab
    ),
    'milestones', (
      SELECT json_agg(json_build_object(
        'day', (m->>'day')::int,
        'target_pct', (m->>'target_pct')::numeric,
        'actual_pct', CASE 
          WHEN ab2.effective_start IS NOT NULL AND (CURRENT_DATE - ab2.effective_start)::int >= (m->>'day')::int
          THEN CASE WHEN ab2.batch_qty > 0 
            THEN ROUND(GREATEST(ab2.batch_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab2.batch_qty * 100, 1)
            ELSE 0 END
          ELSE NULL END,
        'status', CASE
          WHEN ab2.effective_start IS NULL THEN 'unknown'
          WHEN (CURRENT_DATE - ab2.effective_start)::int < (m->>'day')::int THEN 'upcoming'
          WHEN CASE WHEN ab2.batch_qty > 0 
            THEN GREATEST(ab2.batch_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab2.batch_qty * 100
            ELSE 0 END >= (m->>'target_pct')::numeric THEN 'achieved'
          ELSE 'behind'
        END
      ) ORDER BY (m->>'day')::int)
      FROM jsonb_array_elements(t.milestones) m, active_batch ab2
    ),
    'all_batches', (SELECT json_agg(json_build_object(
      'batch_number', b.batch_number,
      'batch_qty', b.batch_qty,
      'batch_start_date', b.batch_start_date,
      'first_sale_date', b.first_sale_date,
      'source', b.source,
      'is_completed', b.is_completed
    ) ORDER BY b.batch_number) FROM batches b)
  ) INTO v_result
  FROM fc_info fi
  CROSS JOIN template t
  LEFT JOIN latest_stock ls ON true;

  RETURN v_result;
END;
$$;
