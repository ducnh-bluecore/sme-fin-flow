
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
  v_store_name text;
  v_store_tier text;
  v_result jsonb;
  v_price_segments jsonb;
  v_categories jsonb;
  v_collections jsonb;
  v_top_products jsonb;
  v_bottom_products jsonb;
BEGIN
  -- Get store name and tier for mapping
  SELECT store_name, tier INTO v_store_name, v_store_tier
  FROM inv_stores WHERE id = p_store_id AND tenant_id = p_tenant_id;

  -- ═══ 1. PRICE SEGMENT ANALYSIS ═══
  -- Store vs Chain vs Same-tier breakdown by price band
  WITH store_items AS (
    SELECT
      oi.unit_price,
      oi.total_amount,
      oi.quantity,
      oi.category,
      oi.product_name,
      oi.sku,
      CASE
        WHEN oi.unit_price < 500000 THEN '< 500K'
        WHEN oi.unit_price < 1000000 THEN '500K-1M'
        WHEN oi.unit_price < 2000000 THEN '1M-2M'
        ELSE '> 2M'
      END AS price_band,
      CASE
        WHEN oi.unit_price < 500000 THEN 1
        WHEN oi.unit_price < 1000000 THEN 2
        WHEN oi.unit_price < 2000000 THEN 3
        ELSE 4
      END AS band_order
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id
      AND o.shop_name = v_store_name
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.unit_price > 0
  ),
  chain_items AS (
    SELECT
      oi.unit_price,
      oi.total_amount,
      oi.quantity,
      o.shop_name,
      CASE
        WHEN oi.unit_price < 500000 THEN '< 500K'
        WHEN oi.unit_price < 1000000 THEN '500K-1M'
        WHEN oi.unit_price < 2000000 THEN '1M-2M'
        ELSE '> 2M'
      END AS price_band,
      CASE
        WHEN oi.unit_price < 500000 THEN 1
        WHEN oi.unit_price < 1000000 THEN 2
        WHEN oi.unit_price < 2000000 THEN 3
        ELSE 4
      END AS band_order
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    JOIN inv_stores s ON s.store_name = o.shop_name AND s.tenant_id = o.tenant_id AND s.location_type = 'store' AND s.is_active = true
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.unit_price > 0
  ),
  tier_items AS (
    SELECT ci.*
    FROM chain_items ci
    JOIN inv_stores s ON s.store_name = ci.shop_name AND s.tenant_id = p_tenant_id
    WHERE s.tier = v_store_tier
  ),
  store_total AS (SELECT COALESCE(SUM(total_amount),1) AS total FROM store_items),
  chain_total AS (SELECT COALESCE(SUM(total_amount),1) AS total FROM chain_items),
  tier_total AS (SELECT COALESCE(SUM(total_amount),1) AS total FROM tier_items)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'band', sub.price_band,
    'band_order', sub.band_order,
    'store_pct', sub.store_pct,
    'store_revenue', sub.store_rev,
    'store_qty', sub.store_qty,
    'chain_pct', sub.chain_pct,
    'tier_pct', sub.tier_pct
  ) ORDER BY sub.band_order), '[]'::jsonb) INTO v_price_segments
  FROM (
    SELECT 
      b.price_band,
      b.band_order,
      ROUND(COALESCE(SUM(si.total_amount),0) / st.total * 100, 1) AS store_pct,
      COALESCE(SUM(si.total_amount),0) AS store_rev,
      COALESCE(SUM(si.quantity),0) AS store_qty,
      ROUND(COALESCE((SELECT SUM(ci.total_amount) FROM chain_items ci WHERE ci.price_band = b.price_band),0) / ct.total * 100, 1) AS chain_pct,
      ROUND(COALESCE((SELECT SUM(ti.total_amount) FROM tier_items ti WHERE ti.price_band = b.price_band),0) / tt.total * 100, 1) AS tier_pct
    FROM (VALUES ('< 500K',1),('500K-1M',2),('1M-2M',3),('> 2M',4)) AS b(price_band, band_order)
    CROSS JOIN store_total st
    CROSS JOIN chain_total ct
    CROSS JOIN tier_total tt
    LEFT JOIN store_items si ON si.price_band = b.price_band
    GROUP BY b.price_band, b.band_order, st.total, ct.total, tt.total
  ) sub;

  -- ═══ 2. CATEGORY ANALYSIS ═══
  WITH store_cat AS (
    SELECT oi.category, SUM(oi.total_amount) AS revenue, SUM(oi.quantity) AS qty
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id AND o.shop_name = v_store_name
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
    GROUP BY oi.category
  ),
  chain_cat AS (
    SELECT oi.category, SUM(oi.total_amount) AS revenue
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    JOIN inv_stores s ON s.store_name = o.shop_name AND s.tenant_id = o.tenant_id AND s.location_type = 'store' AND s.is_active = true
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
    GROUP BY oi.category
  ),
  tier_cat AS (
    SELECT oi.category, SUM(oi.total_amount) AS revenue
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    JOIN inv_stores s ON s.store_name = o.shop_name AND s.tenant_id = o.tenant_id AND s.location_type = 'store' AND s.is_active = true AND s.tier = v_store_tier
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
    GROUP BY oi.category
  ),
  store_t AS (SELECT COALESCE(SUM(revenue),1) AS total FROM store_cat),
  chain_t AS (SELECT COALESCE(SUM(revenue),1) AS total FROM chain_cat),
  tier_t AS (SELECT COALESCE(SUM(revenue),1) AS total FROM tier_cat)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', sc.category,
    'store_pct', ROUND(sc.revenue / st.total * 100, 1),
    'store_revenue', sc.revenue,
    'store_qty', sc.qty,
    'chain_pct', ROUND(COALESCE(cc.revenue,0) / ct.total * 100, 1),
    'tier_pct', ROUND(COALESCE(tc.revenue,0) / tt.total * 100, 1)
  ) ORDER BY sc.revenue DESC), '[]'::jsonb) INTO v_categories
  FROM store_cat sc
  CROSS JOIN store_t st
  CROSS JOIN chain_t ct
  CROSS JOIN tier_t tt
  LEFT JOIN chain_cat cc ON cc.category = sc.category
  LEFT JOIN tier_cat tc ON tc.category = sc.category;

  -- ═══ 3. COLLECTION (BST) ANALYSIS ═══
  -- Extract collection from 5th char of fc_code (derived from SKU)
  WITH store_bst AS (
    SELECT
      CASE SUBSTRING(REGEXP_REPLACE(oi.sku, '[0-9]+$', ''), 5, 1)
        WHEN '1' THEN 'Áo'
        WHEN '2' THEN 'Quần'
        WHEN '3' THEN 'Đầm'
        WHEN '4' THEN 'Chân váy'
        WHEN '5' THEN 'Áo dài'
        WHEN '6' THEN 'Coat'
        WHEN '8' THEN 'Giày'
        WHEN '9' THEN 'Túi'
        ELSE 'Khác'
      END AS collection,
      SUM(oi.total_amount) AS revenue,
      SUM(oi.quantity) AS qty
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id AND o.shop_name = v_store_name
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.sku IS NOT NULL AND LENGTH(oi.sku) >= 5
    GROUP BY collection
  ),
  chain_bst AS (
    SELECT
      CASE SUBSTRING(REGEXP_REPLACE(oi.sku, '[0-9]+$', ''), 5, 1)
        WHEN '1' THEN 'Áo'
        WHEN '2' THEN 'Quần'
        WHEN '3' THEN 'Đầm'
        WHEN '4' THEN 'Chân váy'
        WHEN '5' THEN 'Áo dài'
        WHEN '6' THEN 'Coat'
        WHEN '8' THEN 'Giày'
        WHEN '9' THEN 'Túi'
        ELSE 'Khác'
      END AS collection,
      SUM(oi.total_amount) AS revenue
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    JOIN inv_stores s ON s.store_name = o.shop_name AND s.tenant_id = o.tenant_id AND s.location_type = 'store' AND s.is_active = true
    WHERE oi.tenant_id = p_tenant_id
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.sku IS NOT NULL AND LENGTH(oi.sku) >= 5
    GROUP BY collection
  ),
  sb_t AS (SELECT COALESCE(SUM(revenue),1) AS total FROM store_bst),
  cb_t AS (SELECT COALESCE(SUM(revenue),1) AS total FROM chain_bst)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'collection', sb.collection,
    'store_pct', ROUND(sb.revenue / sbt.total * 100, 1),
    'store_revenue', sb.revenue,
    'store_qty', sb.qty,
    'chain_pct', ROUND(COALESCE(cb.revenue,0) / cbt.total * 100, 1)
  ) ORDER BY sb.revenue DESC), '[]'::jsonb) INTO v_collections
  FROM store_bst sb
  CROSS JOIN sb_t sbt
  CROSS JOIN cb_t cbt
  LEFT JOIN chain_bst cb ON cb.collection = sb.collection;

  -- ═══ 4. TOP 5 PRODUCTS ═══
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', sub.product_name,
    'sku', sub.sku,
    'revenue', sub.revenue,
    'qty', sub.qty,
    'avg_price', sub.avg_price
  ) ORDER BY sub.revenue DESC), '[]'::jsonb) INTO v_top_products
  FROM (
    SELECT oi.product_name, oi.sku, SUM(oi.total_amount) AS revenue, SUM(oi.quantity) AS qty, AVG(oi.unit_price) AS avg_price
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id AND o.shop_name = v_store_name
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.total_amount > 0
    GROUP BY oi.product_name, oi.sku
    ORDER BY revenue DESC
    LIMIT 5
  ) sub;

  -- ═══ 5. BOTTOM 5 PRODUCTS (lowest revenue but still sold) ═══
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', sub.product_name,
    'sku', sub.sku,
    'revenue', sub.revenue,
    'qty', sub.qty,
    'avg_price', sub.avg_price
  ) ORDER BY sub.revenue ASC), '[]'::jsonb) INTO v_bottom_products
  FROM (
    SELECT oi.product_name, oi.sku, SUM(oi.total_amount) AS revenue, SUM(oi.quantity) AS qty, AVG(oi.unit_price) AS avg_price
    FROM external_order_items oi
    JOIN external_orders o ON o.id = oi.external_order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = p_tenant_id AND o.shop_name = v_store_name
      AND o.order_date::date >= p_from_date AND o.order_date::date <= p_to_date
      AND o.status IN ('confirmed','processing','shipping','delivered')
      AND oi.total_amount > 0
    GROUP BY oi.product_name, oi.sku
    HAVING SUM(oi.quantity) <= 3
    ORDER BY revenue ASC
    LIMIT 5
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
