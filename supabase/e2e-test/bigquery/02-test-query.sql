-- ============================================================================
-- E2E BIGQUERY SYNC TEST - SCRIPT 02: TEST QUERY (L10)
-- ============================================================================
-- Test BigQuery connectivity using bigquery-query edge function
-- ============================================================================

-- This script documents the Edge Function call parameters
-- Execute via: POST /functions/v1/bigquery-query

/*
REQUEST BODY:
{
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "dataset": "olvboutique_shopee",
  "table": "shopee_Orders",
  "query_type": "raw_select",
  "columns": ["order_sn", "create_time", "total_amount", "order_status", "buyer_username", "payment_method"],
  "limit": 10,
  "order_by": [{"field": "create_time", "direction": "desc"}]
}

EXPECTED RESPONSE:
{
  "success": true,
  "row_count": 10,
  "rows": [...],
  "schema": [...],
  "query_time_ms": <number>,
  "cached": false
}
*/

-- Verify datasets available for service account
-- Call: POST /functions/v1/bigquery-list { "tenant_id": "...", "action": "list_datasets" }

-- Datasets confirmed accessible:
-- - olvboutique_shopee
-- - olvboutique_lazada
-- - olvboutique_tiktokshop
-- - olvboutique_tiki
