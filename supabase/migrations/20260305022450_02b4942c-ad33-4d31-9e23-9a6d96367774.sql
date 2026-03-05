
DROP FUNCTION IF EXISTS public.fn_lifecycle_progress(UUID, TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.fn_lifecycle_progress(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  fc_id UUID,
  fc_name TEXT,
  category TEXT,
  collection_id UUID,
  collection_name TEXT,
  collection_season TEXT,
  batch_number INT,
  initial_qty BIGINT,
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
  cash_at_risk BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_cutoff_date DATE := CURRENT_DATE - 180;
BEGIN
  -- Only count products created within last 6 months
  SELECT COUNT(DISTINCT b.fc_id) INTO v_total
  FROM public.inv_lifecycle_batches b
  JOIN public.inv_family_codes fc ON fc.id = b.fc_id AND fc.tenant_id = b.tenant_id
  WHERE b.tenant_id = p_tenant_id
    AND b.is_completed = false
    AND fc.product_created_date >= v_cutoff_date
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
      AND fc2.product_created_date >= v_cutoff_date
      AND (p_search IS NULL OR fc2.fc_code ILIKE '%' || p_search || '%' OR fc2.fc_name ILIKE '%' || p_search || '%')
    ORDER BY b2.fc_id, b2.batch_number DESC
  ),
  -- Use per-store max snapshot_date for accuracy
  store_max_dates AS (
    SELECT sp.store_id, MAX(sp.snapshot_date) as max_date
    FROM public.inv_state_positions sp
    WHERE sp.tenant_id = p_tenant_id
    GROUP BY sp.store_id
  ),
  latest_stock AS (
    SELECT sp.fc_id AS stock_fc_id, SUM(sp.on_hand)::bigint AS total_on_hand
    FROM public.inv_state_positions sp
    JOIN store_max_dates smd ON smd.store_id = sp.store_id AND smd.max_date = sp.snapshot_date
    WHERE sp.tenant_id = p_tenant_id
    GROUP BY sp.fc_id
  ),
  fc_info AS (
    SELECT fc3.id AS info_fc_id, fc3.fc_code, fc3.fc_name, fc3.category, fc3.collection_id
    FROM public.inv_family_codes fc3
    WHERE fc3.tenant_id = p_tenant_id
  ),
  coll_info AS (
    SELECT c.id AS coll_id, c.collection_name, c.season
    FROM public.inv_collections c
    WHERE c.tenant_id = p_tenant_id
  ),
  template AS (
    SELECT t.milestones
    FROM public.inv_lifecycle_templates t
    WHERE t.tenant_id = p_tenant_id AND t.is_default = true
    LIMIT 1
  ),
  progress AS (
    SELECT
      fi.info_fc_id AS p_fc_id,
      fi.fc_name,
      fi.category,
      fi.collection_id AS p_collection_id,
      ci.collection_name AS p_collection_name,
      ci.season AS p_collection_season,
      ab.b_number,
      ab.b_qty,
      COALESCE(ls.total_on_hand, 0)::int AS cur_qty,
      GREATEST(ab.b_qty - COALESCE(ls.total_on_hand, 0), 0)::int AS s_qty,
      CASE
        WHEN ab.b_qty > 0 THEN ROUND(GREATEST(ab.b_qty - COALESCE(ls.total_on_hand, 0), 0)::numeric / ab.b_qty * 100, 1)
        ELSE 0
      END AS st_pct,
      (CURRENT_DATE - ab.effective_start)::int AS a_days,
      ab.raw_first_sale_date,
      ab.raw_batch_start_date,
      t.milestones
    FROM active_batches ab
    LEFT JOIN latest_stock ls ON ls.stock_fc_id = ab.batch_fc_id
    LEFT JOIN fc_info fi ON fi.info_fc_id = ab.batch_fc_id
    LEFT JOIN coll_info ci ON ci.coll_id = fi.collection_id
    CROSS JOIN template t
  ),
  with_status AS (
    SELECT
      p.*,
      (
        SELECT (m2->>'target_pct')::numeric
        FROM jsonb_array_elements(p.milestones) m2
        WHERE (m2->>'day')::int <= p.a_days
        ORDER BY (m2->>'day')::int DESC
        LIMIT 1
      ) AS cur_target,
      CASE
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) + 10 THEN 'ahead'
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 5 THEN 'on_track'
        WHEN p.st_pct >= COALESCE((SELECT (m3->>'target_pct')::numeric FROM jsonb_array_elements(p.milestones) m3 WHERE (m3->>'day')::int <= p.a_days ORDER BY (m3->>'day')::int DESC LIMIT 1), 0) - 20 THEN 'behind'
        ELSE 'critical'
      END AS computed_status
    FROM progress p
  )
  SELECT
    ws.p_fc_id,
    ws.fc_name,
    ws.category,
    ws.p_collection_id,
    ws.p_collection_name,
    ws.p_collection_season,
    ws.b_number,
    ws.b_qty::bigint,
    ws.cur_qty,
    ws.s_qty,
    ws.st_pct,
    ws.a_days,
    ws.raw_first_sale_date,
    ws.raw_batch_start_date,
    ws.computed_status,
    ws.cur_target,
    CASE WHEN ws.cur_target IS NOT NULL THEN ws.st_pct - ws.cur_target ELSE NULL END,
    CASE
      WHEN ws.cur_target IS NOT NULL AND ws.st_pct < ws.cur_target THEN ((ws.cur_target - ws.st_pct) / GREATEST(ws.st_pct / GREATEST(ws.a_days, 1), 0.01))::int
      ELSE 0
    END,
    CASE
      WHEN ws.cur_qty > 0 AND ws.b_qty > 0 THEN ROUND((ws.cur_qty::numeric / GREATEST(180 - ws.a_days, 1)), 1)
      ELSE 0
    END,
    CASE
      WHEN ws.cur_qty > 0 THEN (ws.cur_qty * 250000)::bigint
      ELSE 0::bigint
    END,
    v_total
  FROM with_status ws
  WHERE (p_status IS NULL OR ws.computed_status = p_status)
  ORDER BY
    ws.p_collection_name NULLS LAST,
    CASE ws.computed_status WHEN 'critical' THEN 1 WHEN 'behind' THEN 2 WHEN 'on_track' THEN 3 WHEN 'ahead' THEN 4 END,
    ws.a_days DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
