-- =============================================
-- MIGRATION: Add missing columns & tables for BigQuery optimization
-- =============================================

-- 1. ADD MISSING COLUMNS TO external_orders
ALTER TABLE public.external_orders 
  ADD COLUMN IF NOT EXISTS buyer_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_username TEXT,
  ADD COLUMN IF NOT EXISTS shop_id TEXT,
  ADD COLUMN IF NOT EXISTS shop_name TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS province_name TEXT,
  ADD COLUMN IF NOT EXISTS district_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_seller NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_platform NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_revenue NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_profit NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_quantity INTEGER DEFAULT 0;

-- 2. CREATE external_order_items table
CREATE TABLE IF NOT EXISTS public.external_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  external_order_id UUID NOT NULL REFERENCES public.external_orders(id) ON DELETE CASCADE,
  
  -- Item Identification
  item_id TEXT,
  sku TEXT,
  product_id TEXT,
  variation_id TEXT,
  
  -- Product Info
  product_name TEXT,
  variation_name TEXT,
  category TEXT,
  
  -- Quantity & Pricing
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(18,2) DEFAULT 0,
  original_price NUMERIC(18,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) DEFAULT 0,
  
  -- Cost & Profit
  unit_cogs NUMERIC(18,2) DEFAULT 0,
  total_cogs NUMERIC(18,2) DEFAULT 0,
  gross_profit NUMERIC(18,2) DEFAULT 0,
  margin_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Status
  item_status TEXT,
  is_returned BOOLEAN DEFAULT false,
  return_quantity INTEGER DEFAULT 0,
  
  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. CREATE product_master table
CREATE TABLE IF NOT EXISTS public.product_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Identification
  sku TEXT NOT NULL,
  barcode TEXT,
  internal_product_id UUID REFERENCES public.products(id),
  
  -- Product Info
  product_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  brand TEXT,
  
  -- Pricing
  cost_price NUMERIC(18,2) DEFAULT 0,
  selling_price NUMERIC(18,2) DEFAULT 0,
  avg_selling_price NUMERIC(18,2) DEFAULT 0,
  
  -- Inventory
  current_stock INTEGER DEFAULT 0,
  
  -- Performance metrics (cached)
  total_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC(18,2) DEFAULT 0,
  total_profit NUMERIC(18,2) DEFAULT 0,
  avg_margin_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Channel mapping
  channel_skus JSONB DEFAULT '{}'::jsonb, -- {"shopee": "sku1", "lazada": "sku2"}
  
  -- Metadata
  attributes JSONB,
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(tenant_id, sku)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_external_orders_buyer ON public.external_orders(tenant_id, buyer_id);
CREATE INDEX IF NOT EXISTS idx_external_orders_province ON public.external_orders(tenant_id, province_code);
CREATE INDEX IF NOT EXISTS idx_external_orders_shop ON public.external_orders(tenant_id, shop_id);

CREATE INDEX IF NOT EXISTS idx_external_order_items_order ON public.external_order_items(external_order_id);
CREATE INDEX IF NOT EXISTS idx_external_order_items_sku ON public.external_order_items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_external_order_items_product ON public.external_order_items(tenant_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_master_sku ON public.product_master(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_product_master_category ON public.product_master(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_product_master_brand ON public.product_master(tenant_id, brand);

-- 5. RLS POLICIES
ALTER TABLE public.external_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_master ENABLE ROW LEVEL SECURITY;

-- External Order Items policies
CREATE POLICY "Users can view their tenant order items" 
ON public.external_order_items FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert order items for their tenant" 
ON public.external_order_items FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update order items for their tenant" 
ON public.external_order_items FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete order items for their tenant" 
ON public.external_order_items FOR DELETE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Product Master policies
CREATE POLICY "Users can view their tenant products" 
ON public.product_master FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant products" 
ON public.product_master FOR ALL 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 6. UPDATE TRIGGER for product_master
CREATE OR REPLACE FUNCTION public.update_product_master_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_master_timestamp ON public.product_master;
CREATE TRIGGER update_product_master_timestamp
BEFORE UPDATE ON public.product_master
FOR EACH ROW EXECUTE FUNCTION public.update_product_master_timestamp();

-- 7. Add missing columns to channel_settlements if needed
ALTER TABLE public.channel_settlements
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID,
  ADD COLUMN IF NOT EXISTS variance_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance_notes TEXT;