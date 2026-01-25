-- =============================================================================
-- CDP Product Forecast: Data Foundation
-- Tính năng ước lượng doanh số sản phẩm mới dựa trên affinity matching + benchmark
-- =============================================================================

-- 1. Bảng lưu forecast sản phẩm
CREATE TABLE IF NOT EXISTS cdp_product_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Định nghĩa sản phẩm mới
  forecast_name TEXT NOT NULL,
  product_definition JSONB NOT NULL DEFAULT '{}', -- {category, price_min, price_max, style...}
  
  -- SP benchmark được chọn (cả tự động và thủ công)
  benchmark_product_ids TEXT[] DEFAULT '{}',
  benchmark_auto_suggested TEXT[] DEFAULT '{}', -- SP gợi ý tự động
  benchmark_manual_selected TEXT[] DEFAULT '{}', -- SP user chọn thêm/bớt
  
  -- Kết quả ước lượng
  matched_customer_count INT DEFAULT 0,
  estimated_existing_orders INT DEFAULT 0,
  estimated_new_orders INT DEFAULT 0,
  estimated_total_orders INT DEFAULT 0,
  new_customer_pct NUMERIC(5,2) DEFAULT 0, -- Tỷ lệ khách mới từ benchmark
  conversion_rate NUMERIC(5,2) DEFAULT 0, -- CR từ khách cũ
  
  -- Confidence & metadata
  confidence_level TEXT DEFAULT 'medium', -- high, medium, low
  calculation_details JSONB DEFAULT '{}',
  
  -- Tracking
  status TEXT DEFAULT 'draft', -- draft, active, archived
  actual_orders INT, -- Sau khi launch, so sánh thực tế
  accuracy_pct NUMERIC(5,2), -- Độ chính xác = actual/estimated
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS cho cdp_product_forecasts
ALTER TABLE cdp_product_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecasts of their tenant"
  ON cdp_product_forecasts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can insert forecasts for their tenant"
  ON cdp_product_forecasts FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can update forecasts of their tenant"
  ON cdp_product_forecasts FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can delete forecasts of their tenant"
  ON cdp_product_forecasts FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- Index
CREATE INDEX idx_cdp_product_forecasts_tenant ON cdp_product_forecasts(tenant_id);
CREATE INDEX idx_cdp_product_forecasts_status ON cdp_product_forecasts(tenant_id, status);

-- 2. View benchmark sản phẩm - performance trong 6 tháng đầu
CREATE OR REPLACE VIEW v_cdp_product_benchmark AS
WITH product_first_sale AS (
  -- Ngày bán đầu tiên của mỗi sản phẩm
  SELECT 
    oi.tenant_id,
    oi.product_id,
    oi.category,
    MIN(o.order_at) as first_sale_date
  FROM cdp_order_items oi
  JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
  WHERE oi.product_id IS NOT NULL
  GROUP BY oi.tenant_id, oi.product_id, oi.category
),
product_6m_performance AS (
  -- Performance trong 6 tháng đầu
  SELECT 
    pfs.tenant_id,
    pfs.product_id,
    pfs.category,
    pfs.first_sale_date,
    COUNT(DISTINCT oi.order_id) as total_orders,
    COUNT(DISTINCT o.customer_id) as unique_customers,
    SUM(oi.line_revenue) as total_revenue,
    AVG(oi.line_revenue) as avg_order_value,
    AVG(oi.unit_price) as avg_unit_price,
    MIN(oi.unit_price) as min_price,
    MAX(oi.unit_price) as max_price
  FROM product_first_sale pfs
  JOIN cdp_order_items oi ON (
    oi.tenant_id = pfs.tenant_id 
    AND oi.product_id = pfs.product_id
  )
  JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
  WHERE o.order_at >= pfs.first_sale_date 
    AND o.order_at < pfs.first_sale_date + INTERVAL '6 months'
  GROUP BY pfs.tenant_id, pfs.product_id, pfs.category, pfs.first_sale_date
),
customer_first_order AS (
  -- Xác định đơn đầu tiên của mỗi khách
  SELECT 
    tenant_id,
    customer_id,
    MIN(order_at) as first_order_date
  FROM cdp_orders
  GROUP BY tenant_id, customer_id
),
product_new_customer_stats AS (
  -- Đếm khách mới vs khách cũ cho mỗi sản phẩm
  SELECT 
    pfs.tenant_id,
    pfs.product_id,
    COUNT(DISTINCT CASE 
      WHEN o.order_at = cfo.first_order_date THEN o.customer_id 
    END) as new_customers,
    COUNT(DISTINCT CASE 
      WHEN o.order_at > cfo.first_order_date THEN o.customer_id 
    END) as existing_customers
  FROM product_first_sale pfs
  JOIN cdp_order_items oi ON (
    oi.tenant_id = pfs.tenant_id 
    AND oi.product_id = pfs.product_id
  )
  JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
  JOIN customer_first_order cfo ON cfo.customer_id = o.customer_id AND cfo.tenant_id = o.tenant_id
  WHERE o.order_at >= pfs.first_sale_date 
    AND o.order_at < pfs.first_sale_date + INTERVAL '6 months'
  GROUP BY pfs.tenant_id, pfs.product_id
)
SELECT 
  p6m.tenant_id,
  p6m.product_id,
  p6m.category,
  p6m.first_sale_date,
  p6m.total_orders,
  p6m.unique_customers,
  p6m.total_revenue,
  p6m.avg_order_value,
  p6m.avg_unit_price,
  p6m.min_price,
  p6m.max_price,
  COALESCE(pnc.new_customers, 0) as new_customers,
  COALESCE(pnc.existing_customers, 0) as existing_customers,
  CASE 
    WHEN COALESCE(pnc.new_customers, 0) + COALESCE(pnc.existing_customers, 0) > 0
    THEN ROUND(
      COALESCE(pnc.new_customers, 0)::NUMERIC * 100 / 
      (COALESCE(pnc.new_customers, 0) + COALESCE(pnc.existing_customers, 0)), 
      1
    )
    ELSE 0
  END as new_customer_pct,
  -- Price tier dựa trên percentile
  CASE 
    WHEN p6m.avg_unit_price < 200000 THEN 'budget'
    WHEN p6m.avg_unit_price < 500000 THEN 'mid'
    WHEN p6m.avg_unit_price < 1000000 THEN 'premium'
    ELSE 'luxury'
  END as price_tier
FROM product_6m_performance p6m
LEFT JOIN product_new_customer_stats pnc 
  ON pnc.tenant_id = p6m.tenant_id AND pnc.product_id = p6m.product_id
WHERE p6m.total_orders >= 5; -- Chỉ lấy SP có đủ data

-- 3. View customer category affinity - để match khách hàng phù hợp
CREATE OR REPLACE VIEW v_cdp_customer_category_affinity AS
WITH customer_category_stats AS (
  SELECT 
    o.tenant_id,
    o.customer_id,
    oi.category,
    COUNT(DISTINCT o.id) as order_count,
    SUM(oi.line_revenue) as total_spend,
    AVG(oi.unit_price) as avg_price_bought,
    MAX(o.order_at) as last_purchase
  FROM cdp_orders o
  JOIN cdp_order_items oi ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
  WHERE oi.category IS NOT NULL
  GROUP BY o.tenant_id, o.customer_id, oi.category
),
customer_overall AS (
  SELECT 
    tenant_id,
    customer_id,
    SUM(order_count) as total_orders,
    SUM(total_spend) as total_spend,
    MAX(last_purchase) as last_purchase
  FROM customer_category_stats
  GROUP BY tenant_id, customer_id
)
SELECT 
  ccs.tenant_id,
  ccs.customer_id,
  ccs.category,
  ccs.order_count as category_orders,
  ccs.total_spend as category_spend,
  ccs.avg_price_bought,
  ccs.last_purchase as category_last_purchase,
  co.total_orders,
  co.total_spend as overall_spend,
  co.last_purchase as overall_last_purchase,
  -- Affinity score (0-100)
  ROUND(
    (ccs.order_count::NUMERIC / NULLIF(co.total_orders, 0) * 50) + -- Category preference weight
    (CASE WHEN ccs.last_purchase > NOW() - INTERVAL '90 days' THEN 30 ELSE 
      CASE WHEN ccs.last_purchase > NOW() - INTERVAL '180 days' THEN 15 ELSE 5 END
    END) + -- Recency weight
    (LEAST(ccs.total_spend / NULLIF(co.total_spend, 0) * 20, 20)) -- Spend share weight
  , 0) as affinity_score,
  -- Price sensitivity tier
  CASE 
    WHEN ccs.avg_price_bought < 200000 THEN 'budget'
    WHEN ccs.avg_price_bought < 500000 THEN 'mid'
    WHEN ccs.avg_price_bought < 1000000 THEN 'premium'
    ELSE 'luxury'
  END as price_tier,
  -- Recency status
  CASE 
    WHEN ccs.last_purchase > NOW() - INTERVAL '30 days' THEN 'hot'
    WHEN ccs.last_purchase > NOW() - INTERVAL '90 days' THEN 'warm'
    WHEN ccs.last_purchase > NOW() - INTERVAL '180 days' THEN 'cool'
    ELSE 'cold'
  END as recency_status
FROM customer_category_stats ccs
JOIN customer_overall co ON co.tenant_id = ccs.tenant_id AND co.customer_id = ccs.customer_id;

-- 4. View category conversion rate - tỷ lệ chuyển đổi lịch sử
CREATE OR REPLACE VIEW v_cdp_category_conversion_stats AS
WITH category_stats AS (
  SELECT 
    o.tenant_id,
    oi.category,
    COUNT(DISTINCT o.customer_id) as unique_buyers,
    COUNT(DISTINCT o.id) as total_orders,
    AVG(oi.unit_price) as avg_price,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY oi.unit_price) as price_p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY oi.unit_price) as price_p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY oi.unit_price) as price_p75
  FROM cdp_orders o
  JOIN cdp_order_items oi ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
  WHERE oi.category IS NOT NULL
    AND o.order_at >= NOW() - INTERVAL '12 months'
  GROUP BY o.tenant_id, oi.category
),
total_customers AS (
  SELECT 
    tenant_id,
    COUNT(DISTINCT customer_id) as total_active_customers
  FROM cdp_orders
  WHERE order_at >= NOW() - INTERVAL '12 months'
  GROUP BY tenant_id
)
SELECT 
  cs.tenant_id,
  cs.category,
  cs.unique_buyers,
  cs.total_orders,
  tc.total_active_customers,
  -- Conversion rate = % khách hàng active đã mua category này
  ROUND(cs.unique_buyers::NUMERIC * 100 / NULLIF(tc.total_active_customers, 0), 2) as category_penetration_pct,
  -- Repeat rate trong category
  ROUND(cs.total_orders::NUMERIC / NULLIF(cs.unique_buyers, 0), 2) as orders_per_buyer,
  cs.avg_price,
  cs.price_p25,
  cs.price_p50,
  cs.price_p75
FROM category_stats cs
JOIN total_customers tc ON tc.tenant_id = cs.tenant_id;