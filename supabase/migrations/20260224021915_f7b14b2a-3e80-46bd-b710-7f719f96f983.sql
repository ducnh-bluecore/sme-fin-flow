DROP FUNCTION IF EXISTS public.fn_clearance_candidates(uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_clearance_candidates(p_tenant_id uuid, p_min_risk integer DEFAULT 50)
 RETURNS TABLE(product_id uuid, product_name text, fc_code text, category text, season text, collection_id uuid, collection_name text, markdown_risk_score numeric, markdown_eta_days integer, reason text, health_score numeric, curve_state text, current_stock bigint, inventory_value numeric, cash_locked numeric, is_premium boolean, avg_daily_sales numeric, sales_velocity numeric, trend text, days_to_clear integer, metadata jsonb, demand_space text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    fc.id AS product_id,
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
    fc.metadata::JSONB,
    fc.demand_space::TEXT
  FROM state_markdown_risk_daily r
  JOIN inv_family_codes fc ON fc.id::text = r.product_id AND fc.tenant_id::text = r.tenant_id
  LEFT JOIN LATERAL (
    SELECT sh.size_health_score, sh.curve_state
    FROM state_size_health_daily sh
    WHERE sh.product_id = r.product_id
      AND sh.tenant_id = r.tenant_id
      AND sh.store_id IS NULL
    ORDER BY sh.as_of_date DESC
    LIMIT 1
  ) h ON TRUE
  LEFT JOIN LATERAL (
    SELECT cl2.inventory_value, cl2.cash_locked_value
    FROM state_cash_lock_daily cl2
    WHERE cl2.product_id = r.product_id
      AND cl2.tenant_id = r.tenant_id
    ORDER BY cl2.as_of_date DESC
    LIMIT 1
  ) cl ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(sp.on_hand) AS total_on_hand
    FROM inv_state_positions sp
    WHERE sp.fc_id = fc.id
      AND sp.tenant_id = p_tenant_id
  ) stk ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      dm.avg_daily_sales,
      dm.sales_velocity,
      dm.trend
    FROM inv_state_demand dm
    WHERE dm.fc_id = fc.id
      AND dm.tenant_id = p_tenant_id
    LIMIT 1
  ) d ON TRUE
  LEFT JOIN inv_collections col ON col.id = fc.collection_id AND col.tenant_id = p_tenant_id
  WHERE r.tenant_id = p_tenant_id::text
    AND r.markdown_risk_score >= p_min_risk
  ORDER BY r.markdown_risk_score DESC
  LIMIT 200;
END;
$function$;