
-- ============================================================
-- RPC fn_clearance_candidates: merge 6 client queries into 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_clearance_candidates(
  p_tenant_id UUID,
  p_min_risk INT DEFAULT 50
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  fc_code TEXT,
  category TEXT,
  season TEXT,
  collection_id UUID,
  collection_name TEXT,
  markdown_risk_score NUMERIC,
  markdown_eta_days INT,
  reason TEXT,
  health_score NUMERIC,
  curve_state TEXT,
  current_stock BIGINT,
  inventory_value NUMERIC,
  cash_locked NUMERIC,
  is_premium BOOLEAN,
  avg_daily_sales NUMERIC,
  sales_velocity NUMERIC,
  trend TEXT,
  days_to_clear INT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.product_id,
    COALESCE(fc.fc_name, '—')::TEXT AS product_name,
    COALESCE(fc.fc_code, '—')::TEXT AS fc_code,
    fc.category::TEXT,
    fc.season::TEXT,
    fc.collection_id,
    col.collection_name::TEXT,
    r.markdown_risk_score,
    r.markdown_eta_days::INT,
    r.reason::TEXT,
    h.size_health_score AS health_score,
    h.curve_state::TEXT,
    COALESCE(stk.total_on_hand, 0)::BIGINT AS current_stock,
    COALESCE(cl.inventory_value, 0) AS inventory_value,
    COALESCE(cl.cash_locked_value, 0) AS cash_locked,
    -- Premium detection
    (
      fc.metadata::jsonb ? 'tags' AND (
        fc.metadata::jsonb->'tags' @> '"premium"'::jsonb
        OR fc.metadata::jsonb->'tags' @> '"signature"'::jsonb
      )
      OR LOWER(COALESCE(fc.fc_name,'') || ' ' || COALESCE(fc.subcategory,'')) ~ '(premium|signature|embroidery|thêu|theu)'
    ) AS is_premium,
    COALESCE(d.avg_daily_sales, 0) AS avg_daily_sales,
    COALESCE(d.sales_velocity, 0) AS sales_velocity,
    d.trend::TEXT,
    CASE
      WHEN COALESCE(d.avg_daily_sales, 0) > 0
        THEN LEAST(ROUND(COALESCE(stk.total_on_hand, 0)::NUMERIC / d.avg_daily_sales)::INT, 9999)
      ELSE 9999
    END AS days_to_clear,
    fc.metadata::JSONB
  FROM state_markdown_risk_daily r
  JOIN inv_family_codes fc ON fc.id = r.product_id AND fc.tenant_id = p_tenant_id
  LEFT JOIN LATERAL (
    SELECT sh.size_health_score, sh.curve_state
    FROM state_size_health_daily sh
    WHERE sh.product_id = r.product_id
      AND sh.tenant_id = p_tenant_id
      AND sh.store_id IS NULL
    ORDER BY sh.as_of_date DESC
    LIMIT 1
  ) h ON TRUE
  LEFT JOIN LATERAL (
    SELECT cl2.inventory_value, cl2.cash_locked_value
    FROM state_cash_lock_daily cl2
    WHERE cl2.product_id = r.product_id
      AND cl2.tenant_id = p_tenant_id
    ORDER BY cl2.as_of_date DESC
    LIMIT 1
  ) cl ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(sp.on_hand) AS total_on_hand
    FROM inv_state_positions sp
    WHERE sp.fc_id = r.product_id
      AND sp.tenant_id = p_tenant_id
  ) stk ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      dm.avg_daily_sales,
      dm.sales_velocity,
      dm.trend
    FROM inv_state_demand dm
    WHERE dm.fc_id = r.product_id
      AND dm.tenant_id = p_tenant_id
    LIMIT 1
  ) d ON TRUE
  LEFT JOIN inv_collections col ON col.id = fc.collection_id AND col.tenant_id = p_tenant_id
  WHERE r.tenant_id = p_tenant_id
    AND r.markdown_risk_score >= p_min_risk
  ORDER BY r.markdown_risk_score DESC
  LIMIT 200;
END;
$$;

-- ============================================================
-- RPC fn_evidence_pack_by_fc: merge 4 Evidence Drawer queries
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_evidence_pack_by_fc(
  p_tenant_id UUID,
  p_fc_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_all_sizes TEXT[];
  v_missing TEXT[];
  v_partial TEXT[];
  v_present TEXT[];
  v_total_stores INT;
  v_surplus JSONB;
BEGIN
  -- 1. Get all expected sizes for this FC
  SELECT ARRAY_AGG(DISTINCT m.size ORDER BY m.size)
  INTO v_all_sizes
  FROM inv_sku_fc_mapping m
  WHERE m.fc_id = p_fc_id
    AND m.tenant_id = p_tenant_id
    AND m.is_active = TRUE
    AND m.size IS NOT NULL;

  IF v_all_sizes IS NULL THEN
    v_all_sizes := ARRAY[]::TEXT[];
  END IF;

  -- 2. Count stores and missing sizes per size
  WITH store_missing AS (
    SELECT sc.store_id, sc.missing_sizes
    FROM kpi_size_completeness sc
    WHERE sc.style_id = p_fc_id
      AND sc.tenant_id = p_tenant_id
  ),
  total AS (
    SELECT COUNT(DISTINCT store_id) AS cnt FROM store_missing
  ),
  size_miss_count AS (
    SELECT s.size_val, COUNT(*) AS miss_count
    FROM store_missing sm, LATERAL unnest(sm.missing_sizes) AS s(size_val)
    GROUP BY s.size_val
  )
  SELECT
    t.cnt,
    COALESCE(ARRAY_AGG(smc.size_val) FILTER (WHERE smc.miss_count >= t.cnt AND t.cnt > 0), ARRAY[]::TEXT[]),
    COALESCE(ARRAY_AGG(smc.size_val) FILTER (WHERE smc.miss_count > 0 AND smc.miss_count < t.cnt), ARRAY[]::TEXT[])
  INTO v_total_stores, v_missing, v_partial
  FROM total t
  LEFT JOIN size_miss_count smc ON TRUE
  GROUP BY t.cnt;

  IF v_total_stores IS NULL THEN v_total_stores := 0; END IF;
  IF v_missing IS NULL THEN v_missing := ARRAY[]::TEXT[]; END IF;
  IF v_partial IS NULL THEN v_partial := ARRAY[]::TEXT[]; END IF;

  -- Present = all_sizes - missing - partial
  SELECT ARRAY_AGG(s)
  INTO v_present
  FROM unnest(v_all_sizes) AS s
  WHERE s != ALL(v_missing) AND s != ALL(v_partial);

  IF v_present IS NULL THEN v_present := ARRAY[]::TEXT[]; END IF;

  -- 3. Surplus stores (stores with stock for missing/partial sizes)
  WITH problematic_sizes AS (
    SELECT unnest(v_missing || v_partial) AS size_val
  ),
  sku_for_sizes AS (
    SELECT m.sku, m.size
    FROM inv_sku_fc_mapping m
    JOIN problematic_sizes ps ON m.size = ps.size_val
    WHERE m.fc_id = p_fc_id
      AND m.tenant_id = p_tenant_id
      AND m.is_active = TRUE
  ),
  positions AS (
    SELECT sp.store_id, sfs.size, sp.on_hand
    FROM inv_state_positions sp
    JOIN sku_for_sizes sfs ON sp.sku = sfs.sku
    WHERE sp.fc_id = p_fc_id
      AND sp.tenant_id = p_tenant_id
      AND sp.on_hand > 0
  ),
  store_agg AS (
    SELECT
      p2.store_id,
      jsonb_object_agg(p2.size, p2.on_hand) AS sizes,
      SUM(p2.on_hand) AS total_qty
    FROM positions p2
    GROUP BY p2.store_id
    ORDER BY total_qty DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'store_id', sa.store_id,
      'store_name', COALESCE(st.store_name, LEFT(sa.store_id::text, 12)),
      'sizes', sa.sizes,
      'totalQty', sa.total_qty
    )
  ), '[]'::jsonb)
  INTO v_surplus
  FROM store_agg sa
  LEFT JOIN inv_stores st ON st.id = sa.store_id AND st.tenant_id = p_tenant_id;

  -- Build result
  v_result := jsonb_build_object(
    'all_sizes', v_all_sizes,
    'missing', v_missing,
    'partial', v_partial,
    'present', v_present,
    'total_stores', v_total_stores,
    'surplus_stores', v_surplus
  );

  RETURN v_result;
END;
$$;
