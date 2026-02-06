-- ============================================================================
-- E2E BIGQUERY FULL TEST - SCRIPT 11: BACKFILL CUSTOMERS
-- ============================================================================
-- Sync customers from 3 BigQuery sources with phone/email deduplication
-- Expected: ~454K raw → ~300-350K unique customers
-- ============================================================================

-- This script documents the Edge Function call parameters
-- Execute via: POST /functions/v1/backfill-bigquery

/*
============================================================================
STEP 1: Start Customer Backfill
============================================================================

POST /functions/v1/backfill-bigquery
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "customers",
  "options": {
    "batch_size": 500,
    "date_from": "2020-01-01"
  }
}

EXPECTED RESPONSE:
{
  "success": true,
  "job_id": "<uuid>",
  "model_type": "customers",
  "result": {
    "processed": 454000,
    "created": 350000,
    "merged": 104000
  },
  "duration_ms": <number>
}

============================================================================
STEP 2: Check Status
============================================================================

POST /functions/v1/backfill-bigquery
{
  "action": "status",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "customers"
}

============================================================================
STEP 3: Verify Results (Run in SQL after sync complete)
============================================================================
*/

-- Verification Query 1: Customer counts by acquisition source
SELECT 
  'CUSTOMER_DEDUP_VERIFICATION' as check_name,
  COUNT(*) as total_customers,
  COUNT(DISTINCT phone) as unique_phones,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) FILTER (WHERE acquisition_source = 'kiotviet') as from_kiotviet,
  COUNT(*) FILTER (WHERE acquisition_source = 'haravan') as from_haravan,
  COUNT(*) FILTER (WHERE acquisition_source = 'bluecore') as from_bluecore
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Verification Query 2: Merged profiles (customers with multiple source IDs)
SELECT 
  'MERGED_PROFILES' as check_name,
  COUNT(*) as total_merged,
  ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM cdp_customers WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), 0) * 100, 1) as merge_percent
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND jsonb_array_length(external_ids) > 1;

-- Verification Query 3: Top 10 customers by lifetime value
SELECT 
  customer_key,
  name,
  phone,
  acquisition_source,
  lifetime_value,
  loyalty_points,
  jsonb_array_length(external_ids) as source_count
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY lifetime_value DESC NULLS LAST
LIMIT 10;

-- Verification Query 4: Phone format validation
SELECT 
  'PHONE_FORMAT_CHECK' as check_name,
  COUNT(*) as total_with_phone,
  COUNT(*) FILTER (WHERE phone ~ '^0[0-9]{9,10}$') as valid_format,
  COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone !~ '^0[0-9]{9,10}$') as invalid_format
FROM cdp_customers
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND phone IS NOT NULL;

/*
============================================================================
EXPECTED RESULTS
============================================================================

Check 1 - Customer Counts:
- total_customers: 300,000 - 350,000
- unique_phones: ~290,000 - 340,000
- from_kiotviet: largest (primary acquisition)
- from_haravan: ~50,000 - 55,000
- from_bluecore: ~50,000 - 53,000

Check 2 - Merged Profiles:
- total_merged: 50,000 - 100,000
- merge_percent: 20% - 30%

Check 4 - Phone Format:
- valid_format: > 95%
- invalid_format: < 5%

============================================================================
SUCCESS CRITERIA
============================================================================
[ ] Total customers: 300K - 350K (after dedup from 454K raw)
[ ] Merge rate: 20-30% 
[ ] Phone format valid: > 95%
[ ] All 3 sources represented
[ ] Lifetime value populated for kiotviet/haravan sources
*/
