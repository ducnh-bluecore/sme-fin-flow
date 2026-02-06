-- Migration: Extend cdp_orders schema for direct BigQuery sync (SSOT)
-- This allows Edge Functions to sync directly to cdp_orders instead of external_orders

-- ============================================
-- 1. ADD COLUMNS TO cdp_orders
-- ============================================
ALTER TABLE cdp_orders 
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES connector_integrations(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS buyer_id text,
  ADD COLUMN IF NOT EXISTS province_code text,
  ADD COLUMN IF NOT EXISTS province_name text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS shop_id text,
  ADD COLUMN IF NOT EXISTS shop_name text,
  ADD COLUMN IF NOT EXISTS commission_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_fees numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_income numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS item_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- ============================================
-- 2. ADD COLUMNS TO cdp_order_items
-- ============================================
ALTER TABLE cdp_order_items
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES connector_integrations(id),
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS variation_name text,
  ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cogs numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_returned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- ============================================
-- 3. ADD UNIQUE CONSTRAINT FOR UPSERT
-- ============================================
-- Drop existing constraint if any
ALTER TABLE cdp_orders DROP CONSTRAINT IF EXISTS cdp_orders_tenant_integration_order_key;

-- Add new unique constraint for upsert operations
ALTER TABLE cdp_orders 
  ADD CONSTRAINT cdp_orders_tenant_integration_order_key 
  UNIQUE (tenant_id, integration_id, order_key);

-- ============================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cdp_orders_integration ON cdp_orders(integration_id);
CREATE INDEX IF NOT EXISTS idx_cdp_orders_status ON cdp_orders(status);
CREATE INDEX IF NOT EXISTS idx_cdp_orders_last_synced ON cdp_orders(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_sku ON cdp_order_items(sku);

-- ============================================
-- 5. COMMENT
-- ============================================
COMMENT ON COLUMN cdp_orders.integration_id IS 'Source connector integration for SSOT sync';
COMMENT ON COLUMN cdp_orders.raw_data IS 'Original BigQuery/Connector data for debugging';