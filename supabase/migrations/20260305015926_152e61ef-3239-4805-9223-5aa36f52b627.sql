
-- Drop and recreate with correct schema references
DROP FUNCTION IF EXISTS public.fn_lifecycle_progress(UUID, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.fn_lifecycle_product_detail(UUID, TEXT);
DROP FUNCTION IF EXISTS public.populate_first_sale_dates(UUID);

-- Populate first_sale_dates using correct schema
CREATE OR REPLACE FUNCTION public.populate_first_sale_dates(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inv_lifecycle_batches lb
  SET first_sale_date = sub.min_order_date
  FROM (
    SELECT 
      m.fc_id,
      MIN(o.order_at::date) AS min_order_date
    FROM public.cdp_order_items oi
    JOIN public.cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    JOIN public.inv_sku_fc_mapping m ON m.sku = oi.sku AND m.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_at IS NOT NULL
    GROUP BY m.fc_id
  ) sub
  WHERE lb.tenant_id = p_tenant_id
    AND lb.fc_id = sub.fc_id
    AND lb.first_sale_date IS NULL;
END;
$$;

-- fn_lifecycle_progress using correct columns
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
SET search_path = public
SET statement_timeout = '25s'
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Count matching batches
  SELECT COUNT(DISTINCT b.fc_id) INTO v_total
  FROM public.inv_lifecycle_batches b
  JOIN public.inv_family_codes fc ON fc.id = b.fc_id AND fc.tenant_id = b.tenant_id
  WHERE b.tenant_id = p_tenant_id
    AND b.is_completed = false
    AND (p_search IS NULL OR fc.fc_code ILIKE '%' || p_search || '%' OR fc.fc_name ILIKE '%' || p_search || '%');

  RETURN QUERY
  WITH active_batches AS (
    SELECT DISTINCT ON (b2.fc_id) 
      b2.fc_id AS batch_fc_id,
      b2.batch_number AS b_number,
      b2.batch_qty AS b_qty,
      COALESCE(b2.first_sale_date, b2.batch_start_date) AS effective_start,
      b2.first_sale_date AS raw_first_sale_date,
      b2.batch_start_date AS raw_batch_start_date
    FROM public.inv_lifecycle_batches b2
    JOIN public.inv_family_codes fc2 ON fc2.id = b2.fc_id AND fc2.tenant_id = b2.tenant_id
    WHERE b2.tenant_id = p_tenant_id
      AND b2.is_completed = false
      AND (p_search IS NULL OR fc2.fc_code ILIKE '%' || p_search || '%' OR fc2.fc_name ILIKE '%' || p_search || '%')
    ORDER BY b2.fc_id, b2.batch_number DESC
  ),
  latest_stock AS (
    SELECT sp.fc_id AS stock_fc_id, SUM(sp.on_hand) AS total_on_hand
    FROM public.inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
      AND sp.snapshot_date = (SELECT MAX(sp2.snapshot_date) FROM public.inv_state_positions sp2 WHERE sp2.tenant_id = p_tenant_id)
    GROUP BY sp.fc_id
  ),
  fc_info AS (
    SELECT fc3.id AS info_fc_id, fc3.fc_code, fc3.fc_name, fc3.category
    FROM public.inv_family_codes fc3
    WHERE fc3.tenant_id = p_tenant_id
  ),
  template AS (
    SELECT t.milestones
    FROM public.inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  ),
  progress AS (
    SELECT
      fi.fc_code,
      fi.fc_name,
      fi.category,
      ab.b_number,
      ab.b_qty,
      COALESCE(ls.total_on_hand, 0)::int AS cur_qty,
      GREATEST(ab.b_qty - COALESCE(ls.total_on_hand, 0), 0)::int AS s_qty,
      CASE WHEN ab.b_qty > 0 
        THEN ROUND(GREATEST(ab.b_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab.b_qty * 100, 1)
        ELSE 0 END AS st_pct,
      (CURRENT_DATE - ab.effective_start)::int AS a_days,
      ab.raw_first_sale_date,
      ab.raw_batch_start_date,
      t.milestones
    FROM active_batches ab
    LEFT JOIN latest_stock ls ON ls.stock_fc_id = ab.batch_fc_id
    LEFT JOIN fc_info fi ON fi.info_fc_id = ab.batch_fc_id
    CROSS JOIN template t
  ),
  with_status AS (
    SELECT
      p.*,
      (SELECT (m2->>'target_pct')::numeric 
       FROM jsonb_array_elements(p.milestones) m2 
       WHERE (m2->>'day')::int <= p.a_days 
       ORDER BY (m2->>'day')::int DESC LIMIT 1) AS cur_target,
      CASE 
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) + 10 THEN 'ahead'
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 5 THEN 'on_track'
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 20 THEN 'behind'
        ELSE 'critical'
      END AS computed_status
    FROM progress p
  )
  SELECT
    ws.fc_code,
    ws.fc_name,
    ws.category,
    ws.b_number,
    ws.b_qty,
    ws.cur_qty,
    ws.s_qty,
    ws.st_pct,
    ws.a_days,
    ws.raw_first_sale_date,
    ws.raw_batch_start_date,
    ws.computed_status,
    ws.cur_target,
    CASE WHEN ws.cur_target IS NOT NULL THEN ws.st_pct - ws.cur_target ELSE NULL END,
    CASE WHEN ws.cur_target IS NOT NULL AND ws.st_pct < ws.cur_target 
      THEN ((ws.cur_target - ws.st_pct) / GREATEST(ws.st_pct / GREATEST(ws.a_days, 1), 0.01))::int
      ELSE 0 END,
    CASE WHEN ws.cur_qty > 0 AND ws.b_qty > 0
      THEN ROUND((ws.cur_qty::numeric / GREATEST(180 - ws.a_days, 1)), 1)
      ELSE 0 END,
    CASE WHEN ws.cur_qty > 0
      THEN ws.cur_qty * 250000
      ELSE 0 END,
    v_total
  FROM with_status ws
  WHERE (p_status IS NULL OR ws.computed_status = p_status)
  ORDER BY 
    CASE ws.computed_status WHEN 'critical' THEN 1 WHEN 'behind' THEN 2 WHEN 'on_track' THEN 3 WHEN 'ahead' THEN 4 END,
    ws.a_days DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- fn_lifecycle_product_detail using correct columns
CREATE OR REPLACE FUNCTION public.fn_lifecycle_product_detail(
  p_tenant_id UUID,
  p_fc_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_result JSON;
  v_fc_uuid UUID;
BEGIN
  -- Resolve fc_code to UUID
  SELECT fc.id INTO v_fc_uuid
  FROM public.inv_family_codes fc
  WHERE fc.tenant_id = p_tenant_id AND fc.fc_code = p_fc_id
  LIMIT 1;

  IF v_fc_uuid IS NULL THEN
    RETURN NULL;
  END IF;

  WITH batches AS (
    SELECT b.id, b.batch_number, b.batch_qty, b.batch_start_date, b.first_sale_date,
      COALESCE(b.first_sale_date, b.batch_start_date) AS effective_start,
      b.source, b.is_completed
    FROM public.inv_lifecycle_batches b
    WHERE b.tenant_id = p_tenant_id AND b.fc_id = v_fc_uuid
    ORDER BY b.batch_number DESC
  ),
  fc_info AS (
    SELECT fc.fc_code, fc.fc_name, fc.category
    FROM public.inv_family_codes fc
    WHERE fc.id = v_fc_uuid
  ),
  latest_stock AS (
    SELECT SUM(sp.on_hand)::int AS total_on_hand
    FROM public.inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id AND sp.fc_id = v_fc_uuid
      AND sp.snapshot_date = (SELECT MAX(sp2.snapshot_date) FROM public.inv_state_positions sp2 WHERE sp2.tenant_id = p_tenant_id)
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
