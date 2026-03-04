
CREATE OR REPLACE FUNCTION public.fn_store_product_mix(
  p_tenant_id uuid,
  p_store_id uuid,
  p_from_date date DEFAULT (date_trunc('month', CURRENT_DATE - interval '3 months'))::date,
  p_to_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_code text;
  v_store_tier text;
  v_result jsonb;
  v_price_segments jsonb;
  v_categories jsonb;
  v_collections jsonb;
  v_top_products jsonb;
  v_bottom_products jsonb;
BEGIN
  -- Get store code and tier
  SELECT store_code, tier INTO v_store_code, v_store_tier
  FROM inv_stores WHERE id = p_store_id AND tenant_id = p_tenant_id;

  IF v_store_code IS NULL THEN
    RETURN jsonb_build_object('price_segments','[]'::jsonb,'categories','[]'::jsonb,'collections','[]'::jsonb,'top_products','[]'::jsonb,'bottom_products','[]'::jsonb,'period',jsonb_build_object('from',p_from_date,'to',p_to_date));
  END IF;

  -- ═══ 1. PRICE SEGMENT ANALYSIS ═══
  WITH store_items AS (
    SELECT
      im.product_code,
      im.product_name,
      im.net_revenue,
      im.sold_qty,
      CASE WHEN im.sold_qty > 0 THEN im.net_revenue / im.sold_qty ELSE 0 END AS unit_price,
      CASE
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 500000 THEN '< 500K'
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 1000000 THEN '500K-1M'
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 2000000 THEN '1M-2M'
        ELSE '> 2M'
      END AS price_band,
      CASE
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 500000 THEN 1
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 1000000 THEN 2
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 2000000 THEN 3
        ELSE 4
      END AS band_order
    FROM inventory_movements im
    WHERE im.tenant_id = p_tenant_id
      AND im.branch_id = v_store_code
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
  ),
  chain_items AS (
    SELECT
      im.net_revenue,
      im.sold_qty,
      im.branch_id,
      CASE
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 500000 THEN '< 500K'
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 1000000 THEN '500K-1M'
        WHEN im.sold_qty > 0 AND (im.net_revenue / im.sold_qty) < 2000000 THEN '1M-2M'
        ELSE '> 2M'
      END AS price_band
    FROM inventory_movements im
    JOIN inv_stores s ON s.store_code = im.branch_id AND s.tenant_id = im.tenant_id
      AND s.location_type = 'store' AND s.is_active = true
    WHERE im.tenant_id = p_tenant_id
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
  ),
  tier_items AS (
    SELECT ci.* FROM chain_items ci
    JOIN inv_stores s ON s.store_code = ci.branch_id AND s.tenant_id = p_tenant_id
    WHERE s.tier = v_store_tier
  ),
  store_total AS (SELECT GREATEST(SUM(net_revenue),1) AS total FROM store_items),
  chain_total AS (SELECT GREATEST(SUM(net_revenue),1) AS total FROM chain_items),
  tier_total AS (SELECT GREATEST(SUM(net_revenue),1) AS total FROM tier_items)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'band', sub.price_band, 'band_order', sub.band_order,
    'store_pct', sub.store_pct, 'store_revenue', sub.store_rev, 'store_qty', sub.store_qty,
    'chain_pct', sub.chain_pct, 'tier_pct', sub.tier_pct
  ) ORDER BY sub.band_order), '[]'::jsonb) INTO v_price_segments
  FROM (
    SELECT 
      b.price_band, b.band_order,
      ROUND(COALESCE(SUM(si.net_revenue),0) / st.total * 100, 1) AS store_pct,
      COALESCE(SUM(si.net_revenue),0)::bigint AS store_rev,
      COALESCE(SUM(si.sold_qty),0)::bigint AS store_qty,
      ROUND(COALESCE((SELECT SUM(ci.net_revenue) FROM chain_items ci WHERE ci.price_band = b.price_band),0) / ct.total * 100, 1) AS chain_pct,
      ROUND(COALESCE((SELECT SUM(ti.net_revenue) FROM tier_items ti WHERE ti.price_band = b.price_band),0) / tt.total * 100, 1) AS tier_pct
    FROM (VALUES ('< 500K',1),('500K-1M',2),('1M-2M',3),('> 2M',4)) AS b(price_band, band_order)
    CROSS JOIN store_total st CROSS JOIN chain_total ct CROSS JOIN tier_total tt
    LEFT JOIN store_items si ON si.price_band = b.price_band
    GROUP BY b.price_band, b.band_order, st.total, ct.total, tt.total
  ) sub;

  -- ═══ 2. CATEGORY ANALYSIS ═══
  WITH store_cat AS (
    SELECT COALESCE(p.category, 'UNMAPPED') AS category, SUM(im.net_revenue) AS revenue, SUM(im.sold_qty) AS qty
    FROM inventory_movements im
    LEFT JOIN products p ON p.sku = im.product_code AND p.tenant_id = im.tenant_id
    WHERE im.tenant_id = p_tenant_id AND im.branch_id = v_store_code
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
    GROUP BY COALESCE(p.category, 'UNMAPPED')
  ),
  chain_cat AS (
    SELECT COALESCE(p.category, 'UNMAPPED') AS category, SUM(im.net_revenue) AS revenue
    FROM inventory_movements im
    JOIN inv_stores s ON s.store_code = im.branch_id AND s.tenant_id = im.tenant_id AND s.location_type = 'store' AND s.is_active = true
    LEFT JOIN products p ON p.sku = im.product_code AND p.tenant_id = im.tenant_id
    WHERE im.tenant_id = p_tenant_id
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
    GROUP BY COALESCE(p.category, 'UNMAPPED')
  ),
  tier_cat AS (
    SELECT COALESCE(p.category, 'UNMAPPED') AS category, SUM(im.net_revenue) AS revenue
    FROM inventory_movements im
    JOIN inv_stores s ON s.store_code = im.branch_id AND s.tenant_id = im.tenant_id AND s.location_type = 'store' AND s.is_active = true AND s.tier = v_store_tier
    LEFT JOIN products p ON p.sku = im.product_code AND p.tenant_id = im.tenant_id
    WHERE im.tenant_id = p_tenant_id
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
    GROUP BY COALESCE(p.category, 'UNMAPPED')
  ),
  store_t AS (SELECT GREATEST(SUM(revenue),1) AS total FROM store_cat),
  chain_t AS (SELECT GREATEST(SUM(revenue),1) AS total FROM chain_cat),
  tier_t AS (SELECT GREATEST(SUM(revenue),1) AS total FROM tier_cat)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', sc.category, 'store_pct', ROUND(sc.revenue / st.total * 100, 1),
    'store_revenue', sc.revenue::bigint, 'store_qty', sc.qty::bigint,
    'chain_pct', ROUND(COALESCE(cc.revenue,0) / ct.total * 100, 1),
    'tier_pct', ROUND(COALESCE(tc.revenue,0) / tt.total * 100, 1)
  ) ORDER BY sc.revenue DESC), '[]'::jsonb) INTO v_categories
  FROM store_cat sc
  CROSS JOIN store_t st CROSS JOIN chain_t ct CROSS JOIN tier_t tt
  LEFT JOIN chain_cat cc ON cc.category = sc.category
  LEFT JOIN tier_cat tc ON tc.category = sc.category;

  -- ═══ 3. COLLECTION (BST type) ANALYSIS ═══
  WITH store_bst AS (
    SELECT
      CASE SUBSTRING(REGEXP_REPLACE(im.product_code, '[0-9]+$', ''), 5, 1)
        WHEN '1' THEN 'Áo' WHEN '2' THEN 'Quần' WHEN '3' THEN 'Đầm'
        WHEN '4' THEN 'Chân váy' WHEN '5' THEN 'Áo dài' WHEN '6' THEN 'Coat'
        WHEN '8' THEN 'Giày' WHEN '9' THEN 'Túi' ELSE 'Khác'
      END AS collection,
      SUM(im.net_revenue) AS revenue, SUM(im.sold_qty) AS qty
    FROM inventory_movements im
    WHERE im.tenant_id = p_tenant_id AND im.branch_id = v_store_code
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
      AND LENGTH(im.product_code) >= 5
    GROUP BY collection
  ),
  chain_bst AS (
    SELECT
      CASE SUBSTRING(REGEXP_REPLACE(im.product_code, '[0-9]+$', ''), 5, 1)
        WHEN '1' THEN 'Áo' WHEN '2' THEN 'Quần' WHEN '3' THEN 'Đầm'
        WHEN '4' THEN 'Chân váy' WHEN '5' THEN 'Áo dài' WHEN '6' THEN 'Coat'
        WHEN '8' THEN 'Giày' WHEN '9' THEN 'Túi' ELSE 'Khác'
      END AS collection,
      SUM(im.net_revenue) AS revenue
    FROM inventory_movements im
    JOIN inv_stores s ON s.store_code = im.branch_id AND s.tenant_id = im.tenant_id AND s.location_type = 'store' AND s.is_active = true
    WHERE im.tenant_id = p_tenant_id
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
      AND LENGTH(im.product_code) >= 5
    GROUP BY collection
  ),
  sb_t AS (SELECT GREATEST(SUM(revenue),1) AS total FROM store_bst),
  cb_t AS (SELECT GREATEST(SUM(revenue),1) AS total FROM chain_bst)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'collection', sb.collection,
    'store_pct', ROUND(sb.revenue / sbt.total * 100, 1),
    'store_revenue', sb.revenue::bigint, 'store_qty', sb.qty::bigint,
    'chain_pct', ROUND(COALESCE(cb.revenue,0) / cbt.total * 100, 1)
  ) ORDER BY sb.revenue DESC), '[]'::jsonb) INTO v_collections
  FROM store_bst sb
  CROSS JOIN sb_t sbt CROSS JOIN cb_t cbt
  LEFT JOIN chain_bst cb ON cb.collection = sb.collection;

  -- ═══ 4. TOP 5 PRODUCTS ═══
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', sub.product_name, 'sku', sub.product_code,
    'revenue', sub.revenue, 'qty', sub.qty,
    'avg_price', CASE WHEN sub.qty > 0 THEN sub.revenue / sub.qty ELSE 0 END
  ) ORDER BY sub.revenue DESC), '[]'::jsonb) INTO v_top_products
  FROM (
    SELECT im.product_code, MAX(im.product_name) AS product_name,
      SUM(im.net_revenue)::bigint AS revenue, SUM(im.sold_qty)::bigint AS qty
    FROM inventory_movements im
    WHERE im.tenant_id = p_tenant_id AND im.branch_id = v_store_code
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
    GROUP BY im.product_code
    ORDER BY revenue DESC LIMIT 5
  ) sub;

  -- ═══ 5. BOTTOM 5 PRODUCTS ═══
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', sub.product_name, 'sku', sub.product_code,
    'revenue', sub.revenue, 'qty', sub.qty,
    'avg_price', CASE WHEN sub.qty > 0 THEN sub.revenue / sub.qty ELSE 0 END
  ) ORDER BY sub.revenue ASC), '[]'::jsonb) INTO v_bottom_products
  FROM (
    SELECT im.product_code, MAX(im.product_name) AS product_name,
      SUM(im.net_revenue)::bigint AS revenue, SUM(im.sold_qty)::bigint AS qty
    FROM inventory_movements im
    WHERE im.tenant_id = p_tenant_id AND im.branch_id = v_store_code
      AND im.movement_date >= p_from_date AND im.movement_date <= p_to_date
      AND im.sold_qty > 0 AND im.net_revenue > 0
    GROUP BY im.product_code
    HAVING SUM(im.sold_qty) <= 3
    ORDER BY revenue ASC LIMIT 5
  ) sub;

  v_result := jsonb_build_object(
    'price_segments', v_price_segments,
    'categories', v_categories,
    'collections', v_collections,
    'top_products', v_top_products,
    'bottom_products', v_bottom_products,
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date)
  );

  RETURN v_result;
END;
$$;
