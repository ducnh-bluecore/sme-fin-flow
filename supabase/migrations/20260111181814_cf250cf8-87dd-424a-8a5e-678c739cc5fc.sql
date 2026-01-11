-- =====================================================
-- ALERT SYSTEM DATA TABLES
-- Tạo các bảng dữ liệu cần thiết cho 47+ KPI Alert Rules
-- =====================================================

-- 1. PRODUCTS - Bảng sản phẩm chính
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  sku VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  
  unit VARCHAR(30) DEFAULT 'cái',
  cost_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  
  -- Trường cho Alert
  current_stock INTEGER DEFAULT 0,
  avg_daily_sales DECIMAL(10,2) DEFAULT 0,
  last_sale_date TIMESTAMP WITH TIME ZONE,
  reorder_point INTEGER DEFAULT 10,
  platform_stock JSONB DEFAULT '{}',
  sales_velocity DECIMAL(10,2) DEFAULT 0,
  prev_sales_velocity DECIMAL(10,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. STORES - Cửa hàng
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  store_code VARCHAR(50),
  store_name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  
  manager_name VARCHAR(100),
  
  -- Trường cho Alert
  daily_sales_target DECIMAL(15,2) DEFAULT 0,
  current_daily_sales DECIMAL(15,2) DEFAULT 0,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ORDER_RETURNS - Quản lý hoàn trả
CREATE TABLE IF NOT EXISTS order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  return_type VARCHAR(20) DEFAULT 'return',
  return_reason VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',
  
  return_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  refund_amount DECIMAL(15,2) DEFAULT 0,
  handling_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INVENTORY_BATCHES - Quản lý lô hàng (HSD)
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  batch_number VARCHAR(50),
  quantity INTEGER DEFAULT 0,
  
  manufacture_date DATE,
  expiry_date DATE,
  
  cost_price DECIMAL(15,2),
  warehouse_location VARCHAR(100),
  
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CHANNEL_ANALYTICS - Phân tích kênh bán
CREATE TABLE IF NOT EXISTS channel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  channel VARCHAR(30) NOT NULL,
  analytics_date DATE NOT NULL,
  
  revenue DECIMAL(15,2) DEFAULT 0,
  prev_revenue DECIMAL(15,2) DEFAULT 0,
  
  total_orders INTEGER DEFAULT 0,
  avg_order_value DECIMAL(15,2) DEFAULT 0,
  prev_aov DECIMAL(15,2) DEFAULT 0,
  
  platform_fee DECIMAL(15,2) DEFAULT 0,
  prev_platform_fee DECIMAL(15,2) DEFAULT 0,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  marketing_cost DECIMAL(15,2) DEFAULT 0,
  
  total_cogs DECIMAL(15,2) DEFAULT 0,
  gross_margin DECIMAL(10,4) DEFAULT 0,
  
  sessions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  conversion_rate DECIMAL(8,4) DEFAULT 0,
  bounce_rate DECIMAL(8,4) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, channel, analytics_date)
);

-- 6. PROMOTION_CAMPAIGNS - Chiến dịch khuyến mãi
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  campaign_name VARCHAR(200) NOT NULL,
  campaign_type VARCHAR(30),
  channel VARCHAR(30),
  
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  budget DECIMAL(15,2) DEFAULT 0,
  actual_cost DECIMAL(15,2) DEFAULT 0,
  
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_discount_given DECIMAL(15,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'draft',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VOUCHER_USAGE - Theo dõi sử dụng voucher
CREATE TABLE IF NOT EXISTS voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  
  voucher_code VARCHAR(50) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR(20),
  
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SHIPMENTS - Theo dõi vận chuyển
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  carrier_code VARCHAR(30),
  carrier_name VARCHAR(100),
  tracking_number VARCHAR(100),
  
  status VARCHAR(30) DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  picked_up_at TIMESTAMP WITH TIME ZONE,
  in_transit_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_days INTEGER,
  is_on_time BOOLEAN,
  
  shipping_fee DECIMAL(15,2) DEFAULT 0,
  cod_amount DECIMAL(15,2) DEFAULT 0,
  cod_collected BOOLEAN DEFAULT FALSE,
  
  failure_reason VARCHAR(200),
  attempt_count INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CARRIER_PERFORMANCE - Hiệu suất vận chuyển
CREATE TABLE IF NOT EXISTS carrier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  carrier_code VARCHAR(30) NOT NULL,
  performance_date DATE NOT NULL,
  
  total_shipments INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  delayed_count INTEGER DEFAULT 0,
  
  on_time_rate DECIMAL(8,4) DEFAULT 0,
  delay_rate DECIMAL(8,4) DEFAULT 0,
  failure_rate DECIMAL(8,4) DEFAULT 0,
  
  avg_delivery_days DECIMAL(5,2) DEFAULT 0,
  avg_cost_per_shipment DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, carrier_code, performance_date)
);

-- 10. WAREHOUSE_CAPACITY - Công suất kho
CREATE TABLE IF NOT EXISTS warehouse_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  warehouse_code VARCHAR(50) NOT NULL,
  warehouse_name VARCHAR(200),
  address TEXT,
  
  max_orders_per_hour INTEGER DEFAULT 50,
  max_orders_per_day INTEGER DEFAULT 500,
  max_storage_units INTEGER,
  
  current_staff_count INTEGER DEFAULT 0,
  current_utilization DECIMAL(8,4) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. REVIEWS - Đánh giá khách hàng
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  channel VARCHAR(30),
  platform_review_id VARCHAR(100),
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_content TEXT,
  review_images TEXT[],
  
  sentiment VARCHAR(20),
  
  is_responded BOOLEAN DEFAULT FALSE,
  response_content TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  
  review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. SUPPORT_TICKETS - Yêu cầu hỗ trợ
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  ticket_number VARCHAR(50),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  channel VARCHAR(30),
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'open',
  
  subject VARCHAR(200),
  description TEXT,
  
  assigned_to UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. CHAT_MESSAGES - Tin nhắn chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  channel VARCHAR(30) NOT NULL,
  conversation_id VARCHAR(100),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  message_type VARCHAR(20) NOT NULL,
  message_content TEXT,
  
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_time_minutes INTEGER,
  
  is_read BOOLEAN DEFAULT FALSE,
  is_responded BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. CASH_FLOW_DAILY - Dòng tiền hàng ngày
CREATE TABLE IF NOT EXISTS cash_flow_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  flow_date DATE NOT NULL,
  
  opening_balance DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  
  total_inflow DECIMAL(15,2) DEFAULT 0,
  total_outflow DECIMAL(15,2) DEFAULT 0,
  net_cash_flow DECIMAL(15,2) DEFAULT 0,
  
  inflow_sales DECIMAL(15,2) DEFAULT 0,
  inflow_platform DECIMAL(15,2) DEFAULT 0,
  inflow_cod DECIMAL(15,2) DEFAULT 0,
  inflow_other DECIMAL(15,2) DEFAULT 0,
  
  outflow_inventory DECIMAL(15,2) DEFAULT 0,
  outflow_shipping DECIMAL(15,2) DEFAULT 0,
  outflow_marketing DECIMAL(15,2) DEFAULT 0,
  outflow_salary DECIMAL(15,2) DEFAULT 0,
  outflow_rent DECIMAL(15,2) DEFAULT 0,
  outflow_other DECIMAL(15,2) DEFAULT 0,
  
  avg_daily_expenses DECIMAL(15,2) DEFAULT 0,
  cash_runway_days INTEGER,
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, flow_date)
);

-- 15. WEBSITE_ANALYTICS - Phân tích website
CREATE TABLE IF NOT EXISTS website_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  analytics_date DATE NOT NULL,
  
  sessions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  pages_per_session DECIMAL(5,2) DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  
  bounce_rate DECIMAL(8,4) DEFAULT 0,
  cart_adds INTEGER DEFAULT 0,
  cart_abandonment_rate DECIMAL(8,4) DEFAULT 0,
  checkouts_started INTEGER DEFAULT 0,
  checkouts_completed INTEGER DEFAULT 0,
  conversion_rate DECIMAL(8,4) DEFAULT 0,
  
  checkout_errors_count INTEGER DEFAULT 0,
  payment_errors_count INTEGER DEFAULT 0,
  
  avg_load_time_ms INTEGER DEFAULT 0,
  
  revenue DECIMAL(15,2) DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, analytics_date)
);

-- 16. STORE_DAILY_METRICS - Số liệu cửa hàng hàng ngày
CREATE TABLE IF NOT EXISTS store_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  
  metrics_date DATE NOT NULL,
  
  total_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  cash_revenue DECIMAL(15,2) DEFAULT 0,
  card_revenue DECIMAL(15,2) DEFAULT 0,
  ewallet_revenue DECIMAL(15,2) DEFAULT 0,
  
  daily_target DECIMAL(15,2) DEFAULT 0,
  target_achieved_percent DECIMAL(8,4) DEFAULT 0,
  
  customer_count INTEGER DEFAULT 0,
  avg_transaction_value DECIMAL(15,2) DEFAULT 0,
  
  open_time TIME,
  close_time TIME,
  staff_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, store_id, metrics_date)
);

-- Bổ sung trường cho bảng orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS platform_sla_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS carrier_code VARCHAR(30);

-- Bổ sung trường cho bảng customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clv_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prev_clv_value DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS acquisition_cost DECIMAL(15,2) DEFAULT 0;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_daily_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

CREATE POLICY "products_tenant_access" ON products
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "stores_tenant_access" ON stores
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "order_returns_tenant_access" ON order_returns
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "inventory_batches_tenant_access" ON inventory_batches
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "channel_analytics_tenant_access" ON channel_analytics
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "promotion_campaigns_tenant_access" ON promotion_campaigns
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "voucher_usage_tenant_access" ON voucher_usage
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "shipments_tenant_access" ON shipments
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "carrier_performance_tenant_access" ON carrier_performance
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "warehouse_capacity_tenant_access" ON warehouse_capacity
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "reviews_tenant_access" ON reviews
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "support_tickets_tenant_access" ON support_tickets
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "chat_messages_tenant_access" ON chat_messages
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "cash_flow_daily_tenant_access" ON cash_flow_daily
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "website_analytics_tenant_access" ON website_analytics
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "store_daily_metrics_tenant_access" ON store_daily_metrics
FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(tenant_id, current_stock);

CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id);

CREATE INDEX IF NOT EXISTS idx_order_returns_tenant ON order_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_returns_created ON order_returns(tenant_id, return_created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_tenant ON inventory_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(tenant_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON inventory_batches(product_id);

CREATE INDEX IF NOT EXISTS idx_channel_analytics_tenant ON channel_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_date ON channel_analytics(tenant_id, analytics_date);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel ON channel_analytics(tenant_id, channel, analytics_date);

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_tenant ON promotion_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_status ON promotion_campaigns(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_voucher_usage_tenant ON voucher_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_customer ON voucher_usage(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(tenant_id, carrier_code);

CREATE INDEX IF NOT EXISTS idx_carrier_performance_tenant ON carrier_performance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carrier_performance_date ON carrier_performance(tenant_id, performance_date);

CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_tenant ON warehouse_capacity(tenant_id);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(tenant_id, rating);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_responded ON chat_messages(tenant_id, is_responded);

CREATE INDEX IF NOT EXISTS idx_cash_flow_daily_tenant ON cash_flow_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_daily_date ON cash_flow_daily(tenant_id, flow_date);

CREATE INDEX IF NOT EXISTS idx_website_analytics_tenant ON website_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_analytics_date ON website_analytics(tenant_id, analytics_date);

CREATE INDEX IF NOT EXISTS idx_store_daily_metrics_tenant ON store_daily_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_daily_metrics_date ON store_daily_metrics(tenant_id, metrics_date);