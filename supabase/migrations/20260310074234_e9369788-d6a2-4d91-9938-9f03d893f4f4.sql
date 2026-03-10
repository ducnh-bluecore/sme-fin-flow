-- Step 1: Clean OLV legacy products (all are KiotViet/Shopee/Tiki = OLV data)
DELETE FROM tenant_icondenim.products WHERE channel IN ('kiotviet', 'shopee', 'tiki', 'lazada');

-- Step 2: Clean OLV legacy orders (non-haravan channels) in batches
-- First batch: delete non-haravan cdp_orders
DELETE FROM tenant_icondenim.cdp_orders WHERE channel IN ('kiotviet', 'shopee', 'lazada', 'tiki', 'tiktok');

-- Step 3: Clean OLV legacy customers that don't belong to Icon Denim
-- We'll keep all customers for now since they might be shared; 
-- the Haravan backfill already wrote correct customer data