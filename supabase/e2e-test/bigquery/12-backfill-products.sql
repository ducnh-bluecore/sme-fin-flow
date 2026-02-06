-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 12: BACKFILL PRODUCTS
-- ============================================================================
-- Sync products from bdm_master_data_products
-- Expected: ~16,700 products
-- ============================================================================

/*
============================================================================
STEP 1: Start Product Backfill
============================================================================

POST /functions/v1/backfill-bigquery
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "products",
  "options": {
    "batch_size": 500
  }
}

EXPECTED RESPONSE:
{
  "success": true,
  "job_id": "<uuid>",
  "model_type": "products",
  "result": {
    "processed": 16700,
    "inserted": 16700
  },
  "duration_ms": <number>
}

============================================================================
STEP 2: Verify Results
============================================================================
*/

-- Verification Query 1: Product counts and pricing
SELECT 
  'PRODUCT_VERIFICATION' as check_name,
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE cost_price > 0) as has_cost_price,
  COUNT(*) FILTER (WHERE sell_price > 0) as has_sell_price,
  COUNT(DISTINCT category) as category_count,
  COUNT(DISTINCT brand) as brand_count
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Verification Query 2: Margin analysis
SELECT 
  'MARGIN_ANALYSIS' as check_name,
  ROUND(AVG(sell_price - cost_price), 0) as avg_margin_vnd,
  ROUND(AVG((sell_price - cost_price) / NULLIF(sell_price, 0) * 100), 1) as avg_margin_percent,
  ROUND(MIN((sell_price - cost_price) / NULLIF(sell_price, 0) * 100), 1) as min_margin_percent,
  ROUND(MAX((sell_price - cost_price) / NULLIF(sell_price, 0) * 100), 1) as max_margin_percent
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND cost_price > 0 AND sell_price > 0;

-- Verification Query 3: Top categories
SELECT 
  category,
  COUNT(*) as product_count,
  ROUND(AVG(sell_price), 0) as avg_price
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY category
ORDER BY product_count DESC
LIMIT 10;

-- Verification Query 4: Products without pricing (potential issues)
SELECT 
  'MISSING_PRICING' as check_name,
  COUNT(*) FILTER (WHERE cost_price IS NULL OR cost_price = 0) as missing_cost,
  COUNT(*) FILTER (WHERE sell_price IS NULL OR sell_price = 0) as missing_sell,
  COUNT(*) FILTER (WHERE base_price IS NULL OR base_price = 0) as missing_base
FROM products
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/*
============================================================================
EXPECTED RESULTS
============================================================================

Check 1 - Product Counts:
- total_products: ~16,700
- has_cost_price: > 90% (> 15,000)
- has_sell_price: > 95% (> 15,800)
- category_count: 50 - 200
- brand_count: 20 - 100

Check 2 - Margin Analysis:
- avg_margin_percent: 30% - 50% (typical fashion retail)

============================================================================
SUCCESS CRITERIA
============================================================================
[ ] Total products: ~16,700
[ ] Cost price populated: > 90%
[ ] Sell price populated: > 95%
[ ] Categories populated
[ ] SKU unique constraint passes
*/
