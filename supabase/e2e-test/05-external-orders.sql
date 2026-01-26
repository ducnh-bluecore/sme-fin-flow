-- ============================================================================
-- E2E TEST SUITE - SCRIPT 05: EXTERNAL ORDERS (Source Layer)
-- ============================================================================
-- Tạo external_orders từ cdp_orders để mô phỏng data warehouse sync
-- Đây là Layer 0 trong kiến trúc - data gốc từ các platform
--
-- MAPPING:
--   - cdp_orders → external_orders (1:1)
--   - Channel → integration_id mapping
--   - Thêm các fields: platform_fee, commission_fee, payment details
-- ============================================================================

-- Xóa external orders cũ của tenant test (nếu có)
DELETE FROM external_orders 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Insert external_orders từ cdp_orders
INSERT INTO external_orders (
  id, tenant_id, integration_id, external_order_id, order_number, channel,
  order_date, customer_name, customer_email, customer_phone,
  items, item_count, subtotal, item_discount, order_discount,
  platform_fee, commission_fee, payment_fee, 
  total_amount, seller_income, cost_of_goods,
  payment_method, payment_status, status, fulfillment_status,
  created_at, updated_at
)
SELECT
  -- Reuse order ID for traceability
  id,
  tenant_id,
  -- Map channel to integration_id
  CASE channel
    WHEN 'Shopee' THEN 'eeeeeeee-1111-1111-1111-111111111111'::uuid
    WHEN 'Lazada' THEN 'eeeeeeee-2222-2222-2222-222222222222'::uuid
    WHEN 'TikTok Shop' THEN 'eeeeeeee-3333-3333-3333-333333333333'::uuid
    ELSE 'eeeeeeee-4444-4444-4444-444444444444'::uuid
  END as integration_id,
  -- External order ID format per channel
  CASE channel
    WHEN 'Shopee' THEN 'SHP' || REPLACE(order_key, 'ORD-', '')
    WHEN 'Lazada' THEN 'LZD' || REPLACE(order_key, 'ORD-', '')
    WHEN 'TikTok Shop' THEN 'TIK' || REPLACE(order_key, 'ORD-', '')
    ELSE 'WEB' || REPLACE(order_key, 'ORD-', '')
  END as external_order_id,
  order_key as order_number,
  channel,
  order_at as order_date,
  -- Customer info (mock based on customer_id)
  'Customer ' || SUBSTRING(customer_id::text, 1, 8) as customer_name,
  'customer_' || SUBSTRING(customer_id::text, 1, 8) || '@example.com' as customer_email,
  '09' || LPAD((EXTRACT(EPOCH FROM order_at)::bigint % 100000000)::text, 8, '0') as customer_phone,
  -- Items JSONB (simplified)
  jsonb_build_array(
    jsonb_build_object(
      'sku', 'SKU-ITEM-1',
      'name', 'Product Item 1',
      'qty', 1,
      'price', (net_revenue * 0.5)::numeric(12,0)
    ),
    jsonb_build_object(
      'sku', 'SKU-ITEM-2', 
      'name', 'Product Item 2',
      'qty', 1,
      'price', (net_revenue * 0.5)::numeric(12,0)
    )
  ) as items,
  2 as item_count,
  gross_revenue as subtotal,
  discount_amount * 0.6 as item_discount,
  discount_amount * 0.4 as order_discount,
  -- Platform fees based on channel
  CASE channel
    WHEN 'Shopee' THEN net_revenue * 0.06
    WHEN 'Lazada' THEN net_revenue * 0.05
    WHEN 'TikTok Shop' THEN net_revenue * 0.04
    ELSE 0
  END as platform_fee,
  -- Commission fees (1-2%)
  net_revenue * 0.015 as commission_fee,
  -- Payment fees (0.5-1%)
  net_revenue * 0.008 as payment_fee,
  net_revenue as total_amount,
  -- Seller income = net - fees
  net_revenue - CASE channel
    WHEN 'Shopee' THEN net_revenue * 0.06
    WHEN 'Lazada' THEN net_revenue * 0.05
    WHEN 'TikTok Shop' THEN net_revenue * 0.04
    ELSE 0
  END - net_revenue * 0.015 - net_revenue * 0.008 as seller_income,
  cogs as cost_of_goods,
  -- Payment method
  CASE 
    WHEN channel = 'Website' THEN 'bank_transfer'
    WHEN order_at::date % 3 = 0 THEN 'cod'
    ELSE 'ewallet'
  END as payment_method,
  'paid' as payment_status,
  -- Status mapping
  CASE 
    WHEN is_discounted AND gross_margin < 0 THEN 'cancelled'::order_status
    WHEN is_discounted THEN 'completed'::order_status
    ELSE 'completed'::order_status
  END as status,
  'delivered' as fulfillment_status,
  order_at as created_at,
  order_at as updated_at
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Create external_order_items (simplified version)
DELETE FROM external_order_items 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Note: external_order_items might not exist, so we skip if it doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_order_items') THEN
    INSERT INTO external_order_items (
      tenant_id, order_id, product_code, product_name, 
      quantity, unit_price, subtotal, cogs_amount
    )
    SELECT
      tenant_id,
      order_id,
      product_id as product_code,
      'Product ' || product_id as product_name,
      qty as quantity,
      unit_price,
      line_revenue as subtotal,
      line_cogs as cogs_amount
    FROM cdp_order_items
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'external_order_items table does not exist, skipping...';
END $$;

-- Verification Query
SELECT 
  'EXTERNAL ORDERS VERIFICATION' as check_type,
  COUNT(*) as total_external_orders,
  SUM(total_amount) as total_revenue,
  SUM(platform_fee) as total_platform_fees,
  SUM(commission_fee) as total_commission_fees,
  SUM(cost_of_goods) as total_cogs,
  jsonb_build_object(
    'Shopee', COUNT(*) FILTER (WHERE channel = 'Shopee'),
    'Lazada', COUNT(*) FILTER (WHERE channel = 'Lazada'),
    'TikTok Shop', COUNT(*) FILTER (WHERE channel = 'TikTok Shop'),
    'Website', COUNT(*) FILTER (WHERE channel = 'Website')
  ) as by_channel
FROM external_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
