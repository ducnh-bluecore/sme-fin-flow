
-- =============================================
-- ADD MISSING COLUMNS AND TABLES FOR 100% KPI RULES
-- =============================================

-- 1. Add missing columns to existing tables
ALTER TABLE channel_analytics ADD COLUMN IF NOT EXISTS shop_score numeric DEFAULT 0;
ALTER TABLE channel_analytics ADD COLUMN IF NOT EXISTS prev_shop_score numeric DEFAULT 0;
ALTER TABLE channel_analytics ADD COLUMN IF NOT EXISTS shop_rating numeric DEFAULT 0;
ALTER TABLE channel_analytics ADD COLUMN IF NOT EXISTS response_rate numeric DEFAULT 0;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS area_sqm numeric DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rent_per_sqm numeric DEFAULT 0;

-- 2. Create violations table (platform violation warnings)
CREATE TABLE IF NOT EXISTS public.platform_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel varchar NOT NULL,
  violation_type varchar NOT NULL,
  violation_code varchar,
  description text,
  severity varchar DEFAULT 'warning',
  status varchar DEFAULT 'pending',
  detected_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  penalty_amount numeric DEFAULT 0,
  affected_products text[],
  action_required text,
  deadline timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.platform_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant violations" ON public.platform_violations FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant violations" ON public.platform_violations FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 3. Create social_mentions table (social media monitoring)
CREATE TABLE IF NOT EXISTS public.social_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  platform varchar NOT NULL,
  mention_type varchar DEFAULT 'mention',
  content text,
  author_name varchar,
  author_handle varchar,
  sentiment varchar DEFAULT 'neutral',
  sentiment_score numeric,
  reach_count integer DEFAULT 0,
  engagement_count integer DEFAULT 0,
  post_url text,
  detected_at timestamp with time zone DEFAULT now(),
  is_responded boolean DEFAULT false,
  responded_at timestamp with time zone,
  response_content text,
  priority varchar DEFAULT 'normal',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.social_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant mentions" ON public.social_mentions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant mentions" ON public.social_mentions FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 4. Create sync_logs table (platform sync status)
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  sync_type varchar NOT NULL,
  channel varchar,
  status varchar DEFAULT 'pending',
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  error_details jsonb,
  retry_count integer DEFAULT 0,
  next_retry_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant sync logs" ON public.sync_logs FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant sync logs" ON public.sync_logs FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 5. Create pos_terminals table (POS connection status)
CREATE TABLE IF NOT EXISTS public.pos_terminals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  store_id uuid REFERENCES stores(id),
  terminal_code varchar NOT NULL,
  terminal_name varchar,
  status varchar DEFAULT 'online',
  last_heartbeat_at timestamp with time zone,
  last_transaction_at timestamp with time zone,
  ip_address varchar,
  software_version varchar,
  is_active boolean DEFAULT true,
  offline_since timestamp with time zone,
  total_downtime_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant terminals" ON public.pos_terminals FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant terminals" ON public.pos_terminals FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 6. Create warehouse_operations table (Pick & Pack metrics)
CREATE TABLE IF NOT EXISTS public.warehouse_operations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  operation_date date NOT NULL,
  warehouse_location varchar,
  total_orders_received integer DEFAULT 0,
  orders_picked integer DEFAULT 0,
  orders_packed integer DEFAULT 0,
  orders_shipped integer DEFAULT 0,
  avg_pick_time_minutes numeric DEFAULT 0,
  avg_pack_time_minutes numeric DEFAULT 0,
  pick_accuracy_rate numeric DEFAULT 100,
  pack_accuracy_rate numeric DEFAULT 100,
  capacity_used_percent numeric DEFAULT 0,
  staff_count integer DEFAULT 0,
  orders_per_staff numeric DEFAULT 0,
  backlog_orders integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.warehouse_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant warehouse ops" ON public.warehouse_operations FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant warehouse ops" ON public.warehouse_operations FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 7. Create purchase_orders table (Supplier lead time tracking)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  po_number varchar NOT NULL,
  vendor_id uuid REFERENCES vendors(id),
  vendor_name varchar,
  status varchar DEFAULT 'draft',
  order_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  lead_time_days integer,
  expected_lead_time_days integer,
  is_on_time boolean,
  total_amount numeric DEFAULT 0,
  received_amount numeric DEFAULT 0,
  items_count integer DEFAULT 0,
  items_received integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant POs" ON public.purchase_orders FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant POs" ON public.purchase_orders FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 8. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  sku varchar,
  product_name varchar,
  quantity_ordered integer DEFAULT 0,
  quantity_received integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant PO items" ON public.purchase_order_items FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant PO items" ON public.purchase_order_items FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 9. Create market_data table (Market share tracking)
CREATE TABLE IF NOT EXISTS public.market_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  data_date date NOT NULL,
  category varchar,
  channel varchar,
  our_revenue numeric DEFAULT 0,
  market_total_revenue numeric DEFAULT 0,
  market_share_percent numeric DEFAULT 0,
  prev_market_share_percent numeric DEFAULT 0,
  market_share_change numeric DEFAULT 0,
  competitor_count integer DEFAULT 0,
  our_ranking integer,
  data_source varchar,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant market data" ON public.market_data FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant market data" ON public.market_data FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- 10. Create warehouse_capacity table
CREATE TABLE IF NOT EXISTS public.warehouse_capacity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  warehouse_code varchar NOT NULL,
  warehouse_name varchar,
  total_capacity_units integer DEFAULT 0,
  used_capacity_units integer DEFAULT 0,
  capacity_percent numeric DEFAULT 0,
  total_sku_count integer DEFAULT 0,
  active_sku_count integer DEFAULT 0,
  last_updated_at timestamp with time zone DEFAULT now(),
  alert_threshold_percent numeric DEFAULT 90,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.warehouse_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant warehouse capacity" ON public.warehouse_capacity FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own tenant warehouse capacity" ON public.warehouse_capacity FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_violations_tenant ON public.platform_violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_violations_status ON public.platform_violations(status);
CREATE INDEX IF NOT EXISTS idx_social_mentions_tenant ON public.social_mentions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_mentions_sentiment ON public.social_mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON public.sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_tenant ON public.pos_terminals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_status ON public.pos_terminals(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_operations_tenant ON public.warehouse_operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_operations_date ON public.warehouse_operations(operation_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_data_tenant ON public.market_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_market_data_date ON public.market_data(data_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_tenant ON public.warehouse_capacity(tenant_id);
