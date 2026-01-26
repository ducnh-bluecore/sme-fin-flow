-- ============================================
-- PHASE 1: REALTIME SYNC TRIGGER
-- external_orders → cdp_orders
-- ============================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_external_to_cdp ON external_orders;
DROP FUNCTION IF EXISTS sync_external_to_cdp_orders();

-- Create sync function with proper column mapping
CREATE OR REPLACE FUNCTION sync_external_to_cdp_orders()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_order_key TEXT;
BEGIN
  -- Generate order key
  v_order_key := COALESCE(NEW.external_order_id, NEW.order_number, NEW.id::text);
  
  -- Resolve existing customer by phone
  IF NEW.customer_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM cdp_customers 
    WHERE tenant_id = NEW.tenant_id 
      AND phone = NEW.customer_phone
    LIMIT 1;
    
    -- Create customer if not exists
    IF v_customer_id IS NULL THEN
      INSERT INTO cdp_customers (tenant_id, phone, name, email, created_at)
      VALUES (
        NEW.tenant_id, 
        NEW.customer_phone, 
        NEW.customer_name, 
        NEW.customer_email,
        NOW()
      )
      ON CONFLICT (tenant_id, phone) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, cdp_customers.name),
        email = COALESCE(EXCLUDED.email, cdp_customers.email)
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;
  
  -- Upsert to cdp_orders with proper column mapping
  INSERT INTO cdp_orders (
    tenant_id, 
    order_key, 
    customer_id, 
    order_at, 
    channel,
    payment_method, 
    currency, 
    gross_revenue, 
    discount_amount,
    net_revenue, 
    cogs, 
    gross_margin, 
    platform_fee,
    shipping_fee,
    is_discounted, 
    is_bundle,
    created_at
  ) VALUES (
    NEW.tenant_id,
    v_order_key,
    v_customer_id,
    COALESCE(NEW.order_date, NEW.created_at)::timestamptz,
    UPPER(COALESCE(NEW.channel, 'UNKNOWN')),
    COALESCE(NEW.payment_method, 'UNKNOWN'),
    COALESCE(NEW.currency, 'VND'),
    COALESCE(NEW.total_amount, 0),
    COALESCE(NEW.order_discount, 0),
    COALESCE(NEW.seller_income, NEW.total_amount, 0),
    COALESCE(NEW.cost_of_goods, 0),
    COALESCE(NEW.gross_profit, COALESCE(NEW.seller_income, NEW.total_amount, 0) - COALESCE(NEW.cost_of_goods, 0)),
    COALESCE(NEW.platform_fee, 0),
    COALESCE(NEW.shipping_fee, 0),
    COALESCE(NEW.order_discount, 0) > 0,
    false,
    NOW()
  )
  ON CONFLICT (tenant_id, order_key) 
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, cdp_orders.customer_id),
    order_at = EXCLUDED.order_at,
    channel = EXCLUDED.channel,
    gross_revenue = EXCLUDED.gross_revenue,
    discount_amount = EXCLUDED.discount_amount,
    net_revenue = EXCLUDED.net_revenue,
    cogs = EXCLUDED.cogs,
    gross_margin = EXCLUDED.gross_margin,
    platform_fee = EXCLUDED.platform_fee,
    shipping_fee = EXCLUDED.shipping_fee,
    is_discounted = EXCLUDED.is_discounted;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on external_orders
CREATE TRIGGER trigger_sync_external_to_cdp
  AFTER INSERT OR UPDATE ON external_orders
  FOR EACH ROW EXECUTE FUNCTION sync_external_to_cdp_orders();

-- Add comment for documentation
COMMENT ON FUNCTION sync_external_to_cdp_orders() IS 
'SSOT Sync: Automatically copies data from external_orders (staging) to cdp_orders (SSOT Layer 1).
Column mapping: total_amount→gross_revenue, seller_income→net_revenue, order_date→order_at, 
customer_phone→customer_id (via cdp_customers), cost_of_goods→cogs, gross_profit→gross_margin';

COMMENT ON TRIGGER trigger_sync_external_to_cdp ON external_orders IS 
'SSOT Realtime Sync: Fires on every INSERT/UPDATE to maintain cdp_orders as Single Source of Truth';