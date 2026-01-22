
-- ============================================
-- CDP PRODUCT & DEMAND INSIGHT - MATERIALIZED VIEWS
-- Demand Intelligence, không phải Product Analytics
-- ============================================

-- 0) Base MV: Enriched Order Items (fact table chuẩn hóa)
-- Gộp order + items để insight dùng chung
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_order_items_enriched AS
SELECT
  oi.tenant_id,
  o.id AS order_id,
  o.customer_phone AS customer_id,
  o.order_date::date AS order_date,
  o.channel,
  oi.sku,
  COALESCE(oi.category, 'UNMAPPED') AS category,
  oi.quantity,
  oi.total_amount::numeric AS item_amount,
  oi.gross_profit::numeric AS item_margin
FROM external_order_items oi
JOIN external_orders o
  ON o.tenant_id = oi.tenant_id
 AND o.id = oi.external_order_id
WHERE o.status IN ('confirmed', 'processing', 'shipping', 'delivered')
  AND o.customer_phone IS NOT NULL;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_oi_enriched_pk
ON mv_cdp_order_items_enriched(tenant_id, order_id, sku);

CREATE INDEX IF NOT EXISTS idx_mv_cdp_oi_enriched_tenant_date
ON mv_cdp_order_items_enriched(tenant_id, order_date);

CREATE INDEX IF NOT EXISTS idx_mv_cdp_oi_enriched_tenant_customer
ON mv_cdp_order_items_enriched(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_mv_cdp_oi_enriched_tenant_category
ON mv_cdp_order_items_enriched(tenant_id, category);


-- 1) MV: Category Spend Daily (nền tảng cho share & shift)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_category_spend_daily AS
SELECT
  tenant_id,
  order_date,
  category,
  SUM(item_amount) AS gross_sales,
  SUM(item_margin) AS gross_margin,
  COUNT(DISTINCT order_id) AS orders,
  COUNT(DISTINCT customer_id) AS customers
FROM mv_cdp_order_items_enriched
GROUP BY tenant_id, order_date, category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_cat_spend_daily_pk
ON mv_cdp_category_spend_daily(tenant_id, order_date, category);


-- 2) MV: Category Share Shift (60d current vs 60d baseline)
-- Demand Shift: Dịch chuyển tỷ trọng chi tiêu
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_category_share_60d_vs_prev60d AS
WITH params AS (
  SELECT
    (CURRENT_DATE - INTERVAL '60 days')::date AS cur_start,
    (CURRENT_DATE - INTERVAL '120 days')::date AS base_start,
    (CURRENT_DATE - INTERVAL '60 days')::date AS base_end
),
cur AS (
  SELECT
    d.tenant_id,
    d.category,
    SUM(d.gross_sales) AS sales_cur,
    SUM(d.gross_margin) AS margin_cur,
    SUM(d.customers) AS customers_cur
  FROM mv_cdp_category_spend_daily d, params p
  WHERE d.order_date >= p.cur_start
  GROUP BY d.tenant_id, d.category
),
base AS (
  SELECT
    d.tenant_id,
    d.category,
    SUM(d.gross_sales) AS sales_base,
    SUM(d.gross_margin) AS margin_base,
    SUM(d.customers) AS customers_base
  FROM mv_cdp_category_spend_daily d, params p
  WHERE d.order_date >= p.base_start AND d.order_date < p.base_end
  GROUP BY d.tenant_id, d.category
),
tot AS (
  SELECT tenant_id, SUM(sales_cur) AS total_cur
  FROM cur GROUP BY tenant_id
),
totb AS (
  SELECT tenant_id, SUM(sales_base) AS total_base
  FROM base GROUP BY tenant_id
)
SELECT
  COALESCE(c.tenant_id, b.tenant_id) AS tenant_id,
  COALESCE(c.category, b.category) AS category,
  COALESCE(c.sales_cur, 0)::numeric AS sales_cur,
  COALESCE(b.sales_base, 0)::numeric AS sales_base,
  COALESCE(c.margin_cur, 0)::numeric AS margin_cur,
  COALESCE(b.margin_base, 0)::numeric AS margin_base,
  COALESCE(c.customers_cur, 0)::bigint AS customers_cur,
  COALESCE(b.customers_base, 0)::bigint AS customers_base,
  CASE WHEN t.total_cur > 0 THEN COALESCE(c.sales_cur, 0) / t.total_cur ELSE 0 END::numeric AS share_cur,
  CASE WHEN tb.total_base > 0 THEN COALESCE(b.sales_base, 0) / tb.total_base ELSE 0 END::numeric AS share_base,
  (CASE WHEN t.total_cur > 0 THEN COALESCE(c.sales_cur, 0) / t.total_cur ELSE 0 END
   - CASE WHEN tb.total_base > 0 THEN COALESCE(b.sales_base, 0) / tb.total_base ELSE 0 END)::numeric AS share_delta,
  CASE 
    WHEN COALESCE(b.sales_base, 0) > 0 
    THEN ((COALESCE(c.sales_cur, 0) - b.sales_base) / b.sales_base)::numeric 
    ELSE NULL 
  END AS sales_change_ratio
FROM cur c
FULL JOIN base b ON b.tenant_id = c.tenant_id AND b.category = c.category
LEFT JOIN tot t ON t.tenant_id = COALESCE(c.tenant_id, b.tenant_id)
LEFT JOIN totb tb ON tb.tenant_id = COALESCE(c.tenant_id, b.tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_cat_share_shift_pk
ON mv_cdp_category_share_60d_vs_prev60d(tenant_id, category);


-- 3) MV: Customer Primary Category (baseline vs current)
-- Dùng cho Substitution detection
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_customer_primary_category_baseline_current AS
WITH params AS (
  SELECT
    (CURRENT_DATE - INTERVAL '60 days')::date AS cur_start,
    (CURRENT_DATE - INTERVAL '120 days')::date AS base_start,
    (CURRENT_DATE - INTERVAL '60 days')::date AS base_end
),
base_last AS (
  SELECT DISTINCT ON (tenant_id, customer_id)
    tenant_id,
    customer_id,
    order_date,
    category
  FROM mv_cdp_order_items_enriched, params p
  WHERE order_date >= p.base_start AND order_date < p.base_end
  ORDER BY tenant_id, customer_id, order_date DESC
),
cur_last AS (
  SELECT DISTINCT ON (tenant_id, customer_id)
    tenant_id,
    customer_id,
    order_date,
    category
  FROM mv_cdp_order_items_enriched, params p
  WHERE order_date >= p.cur_start
  ORDER BY tenant_id, customer_id, order_date DESC
)
SELECT
  COALESCE(b.tenant_id, c.tenant_id) AS tenant_id,
  COALESCE(b.customer_id, c.customer_id) AS customer_id,
  b.category AS base_category,
  c.category AS cur_category,
  b.order_date AS base_last_date,
  c.order_date AS cur_last_date
FROM base_last b
FULL JOIN cur_last c
  ON c.tenant_id = b.tenant_id
 AND c.customer_id = b.customer_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_cust_cat_baseline_pk
ON mv_cdp_customer_primary_category_baseline_current(tenant_id, customer_id);


-- 4) MV: Category Substitution Matrix
-- Đo lường khách chuyển từ category A → B
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_category_substitution_matrix_60d AS
SELECT
  tenant_id,
  base_category,
  cur_category,
  COUNT(*) AS customers_shifted
FROM mv_cdp_customer_primary_category_baseline_current
WHERE base_category IS NOT NULL
  AND cur_category IS NOT NULL
  AND base_category <> cur_category
GROUP BY tenant_id, base_category, cur_category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_sub_matrix_pk
ON mv_cdp_category_substitution_matrix_60d(tenant_id, base_category, cur_category);


-- 5) MV: Basket Structure Daily
-- Đo số category/đơn, cross-category rate
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_basket_structure_daily AS
WITH basket AS (
  SELECT
    tenant_id,
    order_id,
    order_date,
    customer_id,
    COUNT(DISTINCT category) AS category_count,
    SUM(item_amount) AS order_amount
  FROM mv_cdp_order_items_enriched
  GROUP BY tenant_id, order_id, order_date, customer_id
)
SELECT
  tenant_id,
  order_date,
  AVG(category_count)::numeric(18,4) AS avg_categories_per_order,
  AVG(CASE WHEN category_count >= 2 THEN 1 ELSE 0 END)::numeric(18,4) AS cross_category_rate,
  AVG(order_amount)::numeric(18,2) AS avg_order_amount,
  COUNT(*) AS total_orders
FROM basket
GROUP BY tenant_id, order_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_basket_daily_pk
ON mv_cdp_basket_structure_daily(tenant_id, order_date);


-- 6) MV: Basket Structure Shift (60d vs prev 60d)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cdp_basket_structure_60d_vs_prev60d AS
WITH params AS (
  SELECT
    (CURRENT_DATE - INTERVAL '60 days')::date AS cur_start,
    (CURRENT_DATE - INTERVAL '120 days')::date AS base_start,
    (CURRENT_DATE - INTERVAL '60 days')::date AS base_end
),
cur AS (
  SELECT 
    tenant_id,
    AVG(avg_categories_per_order) AS avg_cat_cur,
    AVG(cross_category_rate) AS cross_rate_cur,
    AVG(avg_order_amount) AS aov_cur,
    SUM(total_orders) AS orders_cur
  FROM mv_cdp_basket_structure_daily d, params p
  WHERE d.order_date >= p.cur_start
  GROUP BY tenant_id
),
base AS (
  SELECT 
    tenant_id,
    AVG(avg_categories_per_order) AS avg_cat_base,
    AVG(cross_category_rate) AS cross_rate_base,
    AVG(avg_order_amount) AS aov_base,
    SUM(total_orders) AS orders_base
  FROM mv_cdp_basket_structure_daily d, params p
  WHERE d.order_date >= p.base_start AND d.order_date < p.base_end
  GROUP BY tenant_id
)
SELECT
  COALESCE(c.tenant_id, b.tenant_id) AS tenant_id,
  c.avg_cat_cur::numeric(18,4), 
  b.avg_cat_base::numeric(18,4),
  (COALESCE(c.avg_cat_cur, 0) - COALESCE(b.avg_cat_base, 0))::numeric(18,4) AS avg_cat_delta,
  c.cross_rate_cur::numeric(18,4), 
  b.cross_rate_base::numeric(18,4),
  (COALESCE(c.cross_rate_cur, 0) - COALESCE(b.cross_rate_base, 0))::numeric(18,4) AS cross_rate_delta,
  c.aov_cur::numeric(18,2), 
  b.aov_base::numeric(18,2),
  CASE WHEN COALESCE(b.aov_base, 0) > 0 
    THEN ((COALESCE(c.aov_cur, 0) - b.aov_base) / b.aov_base)::numeric(18,4) 
    ELSE NULL 
  END AS aov_change_ratio,
  COALESCE(c.orders_cur, 0)::bigint AS orders_cur,
  COALESCE(b.orders_base, 0)::bigint AS orders_base
FROM cur c
FULL JOIN base b ON b.tenant_id = c.tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cdp_basket_shift_pk
ON mv_cdp_basket_structure_60d_vs_prev60d(tenant_id);


-- 7) Helper function: Refresh all CDP Demand MVs
-- ============================================

CREATE OR REPLACE FUNCTION cdp_refresh_demand_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_order_items_enriched;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_category_spend_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_category_share_60d_vs_prev60d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_customer_primary_category_baseline_current;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_category_substitution_matrix_60d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_basket_structure_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_basket_structure_60d_vs_prev60d;
END;
$$;

GRANT EXECUTE ON FUNCTION cdp_refresh_demand_insights() TO authenticated;


-- 8) View: CDP Demand Insight Detection (query layer for UI)
-- ============================================

CREATE OR REPLACE VIEW v_cdp_demand_insights_triggered AS
SELECT
  tenant_id,
  'D01' AS insight_code,
  'demand_shift' AS category,
  category AS product_group,
  'Tỷ trọng chi tiêu cho ' || category || ' thay đổi ' || ROUND(ABS(share_delta) * 100, 1) || ' điểm %' AS title_vi,
  customers_cur AS affected_customers,
  ROUND(share_cur * 100, 1) AS revenue_contribution_pct,
  ROUND(share_delta * 100, 1) AS shift_percent,
  CASE WHEN share_delta < 0 THEN 'down' ELSE 'up' END AS shift_direction,
  CASE 
    WHEN ABS(share_delta) >= 0.10 THEN 'critical'
    WHEN ABS(share_delta) >= 0.05 THEN 'high'
    ELSE 'medium'
  END AS severity,
  sales_cur,
  sales_base
FROM mv_cdp_category_share_60d_vs_prev60d
WHERE ABS(share_delta) >= 0.05
  AND sales_base > 0

UNION ALL

SELECT
  tenant_id,
  'B03' AS insight_code,
  'basket_structure' AS category,
  'Đa nhóm' AS product_group,
  'Tỷ lệ cross-category thay đổi ' || ROUND(ABS(cross_rate_delta) * 100, 1) || '%' AS title_vi,
  orders_cur AS affected_customers,
  100 AS revenue_contribution_pct,
  ROUND(cross_rate_delta * 100, 1) AS shift_percent,
  CASE WHEN cross_rate_delta < 0 THEN 'down' ELSE 'up' END AS shift_direction,
  CASE 
    WHEN ABS(cross_rate_delta) >= 0.15 THEN 'critical'
    WHEN ABS(cross_rate_delta) >= 0.10 THEN 'high'
    ELSE 'medium'
  END AS severity,
  aov_cur AS sales_cur,
  aov_base AS sales_base
FROM mv_cdp_basket_structure_60d_vs_prev60d
WHERE ABS(cross_rate_delta) >= 0.05;

COMMENT ON VIEW v_cdp_demand_insights_triggered IS 
'CDP Demand Intelligence: Phát hiện dịch chuyển nhu cầu để hỗ trợ quyết định điều hành.';
