-- ============================================================================
-- E2E TEST SUITE - SCRIPT 03: INGESTION BATCHES (L1.5 Ingestion)
-- ============================================================================
-- Architecture: v1.4.2 Layer 1.5 - Ingestion
-- Creates:
--   - 4 Ingestion Batches (1 per channel)
--   - 4 Data Watermarks (sync tracking)
-- ============================================================================

-- Clean existing data
DELETE FROM ingestion_batches 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

DELETE FROM data_watermarks 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- CREATE INGESTION BATCHES
-- ============================================================================
INSERT INTO ingestion_batches (
  id, tenant_id, connector_integration_id, batch_type,
  status, started_at, completed_at, 
  records_processed, records_failed, error_count,
  metadata, created_at
)
VALUES
  -- Shopee Batch
  ('11111111-batch-0001-0001-000000000001',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-1111-1111-1111-111111111111',
   'orders',
   'completed',
   '2024-01-01 00:00:00'::timestamptz,
   '2024-01-01 00:05:00'::timestamptz,
   2200,  -- Shopee orders
   0,
   0,
   jsonb_build_object(
     'channel', 'Shopee',
     'sync_type', 'full',
     'date_range', '2024-01-01 to 2027-01-26'
   ),
   '2024-01-01'::timestamptz),
   
  -- Lazada Batch
  ('11111111-batch-0001-0001-000000000002',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-2222-2222-2222-222222222222',
   'orders',
   'completed',
   '2024-01-01 00:00:00'::timestamptz,
   '2024-01-01 00:04:00'::timestamptz,
   1375,  -- Lazada orders
   0,
   0,
   jsonb_build_object(
     'channel', 'Lazada',
     'sync_type', 'full',
     'date_range', '2024-01-01 to 2027-01-26'
   ),
   '2024-01-01'::timestamptz),
   
  -- TikTok Shop Batch
  ('11111111-batch-0001-0001-000000000003',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-3333-3333-3333-333333333333',
   'orders',
   'completed',
   '2024-01-01 00:00:00'::timestamptz,
   '2024-01-01 00:03:00'::timestamptz,
   1100,  -- TikTok orders
   0,
   0,
   jsonb_build_object(
     'channel', 'TikTok Shop',
     'sync_type', 'full',
     'date_range', '2024-01-01 to 2027-01-26'
   ),
   '2024-01-01'::timestamptz),
   
  -- Website Batch
  ('11111111-batch-0001-0001-000000000004',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-4444-4444-4444-444444444444',
   'orders',
   'completed',
   '2024-01-01 00:00:00'::timestamptz,
   '2024-01-01 00:02:00'::timestamptz,
   825,  -- Website orders
   0,
   0,
   jsonb_build_object(
     'channel', 'Website',
     'sync_type', 'full',
     'date_range', '2024-01-01 to 2027-01-26'
   ),
   '2024-01-01'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  records_processed = EXCLUDED.records_processed;

-- ============================================================================
-- CREATE DATA WATERMARKS
-- ============================================================================
INSERT INTO data_watermarks (
  id, tenant_id, connector_integration_id, table_name,
  last_sync_at, last_sync_value, sync_status,
  metadata, created_at, updated_at
)
VALUES
  -- Shopee Watermark
  ('22222222-wmrk-0001-0001-000000000001',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-1111-1111-1111-111111111111',
   'master_orders',
   '2027-01-26 23:59:59'::timestamptz,
   '2027-01-26T23:59:59Z',
   'synced',
   jsonb_build_object(
     'channel', 'Shopee',
     'total_synced', 2200,
     'incremental_supported', true
   ),
   '2024-01-01'::timestamptz,
   '2027-01-26'::timestamptz),
   
  -- Lazada Watermark
  ('22222222-wmrk-0001-0001-000000000002',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-2222-2222-2222-222222222222',
   'master_orders',
   '2027-01-26 23:59:59'::timestamptz,
   '2027-01-26T23:59:59Z',
   'synced',
   jsonb_build_object(
     'channel', 'Lazada',
     'total_synced', 1375,
     'incremental_supported', true
   ),
   '2024-01-01'::timestamptz,
   '2027-01-26'::timestamptz),
   
  -- TikTok Shop Watermark
  ('22222222-wmrk-0001-0001-000000000003',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-3333-3333-3333-333333333333',
   'master_orders',
   '2027-01-26 23:59:59'::timestamptz,
   '2027-01-26T23:59:59Z',
   'synced',
   jsonb_build_object(
     'channel', 'TikTok Shop',
     'total_synced', 1100,
     'incremental_supported', true
   ),
   '2024-01-01'::timestamptz,
   '2027-01-26'::timestamptz),
   
  -- Website Watermark
  ('22222222-wmrk-0001-0001-000000000004',
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   'eeeeeeee-4444-4444-4444-444444444444',
   'master_orders',
   '2027-01-26 23:59:59'::timestamptz,
   '2027-01-26T23:59:59Z',
   'synced',
   jsonb_build_object(
     'channel', 'Website',
     'total_synced', 825,
     'incremental_supported', true
   ),
   '2024-01-01'::timestamptz,
   '2027-01-26'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
  last_sync_at = EXCLUDED.last_sync_at,
  last_sync_value = EXCLUDED.last_sync_value,
  sync_status = EXCLUDED.sync_status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L1.5_INGESTION: BATCHES' as layer,
  COUNT(*) as batch_count,
  SUM(records_processed) as total_records,
  SUM(records_failed) as total_failed,
  jsonb_agg(jsonb_build_object(
    'channel', metadata->>'channel',
    'records', records_processed
  ) ORDER BY metadata->>'channel') as by_channel
FROM ingestion_batches
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L1.5_INGESTION: WATERMARKS' as layer,
  COUNT(*) as watermark_count,
  MIN(last_sync_at) as earliest_sync,
  MAX(last_sync_at) as latest_sync,
  COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_count
FROM data_watermarks
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
