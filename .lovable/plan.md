
# PLAN: Test End-to-End BigQuery Sync theo Architecture v1.4.2

## 1. TỔNG QUAN

Test đồng bộ dữ liệu từ BigQuery lên các layers của Supabase theo kiến trúc:

```text
BigQuery (Raw Data)
      │
      ▼ sync-bigquery / bigquery-query
L2 MASTER MODEL (SSOT)
      │ cdp_orders, cdp_order_items
      │
      ▼ compute_kpi_facts_daily()
L3 KPI AGGREGATION
      │ kpi_facts_daily, kpi_targets
      │
      ▼ detect_threshold_breaches()
L4 ALERT/DECISION
      │ alert_instances, decision_cards
```

## 2. PREREQUISITE CHECK - COMPLETED ✅

| Component | Status | Result |
|-----------|--------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` secret | ✅ Configured | Access to olvboutique_* datasets |
| `bigquery-query` Edge Function | ✅ Deployed | 20 rows queried successfully |
| `sync-bigquery` Edge Function | ✅ Deployed | Memory limit hit with 5000 rows |
| `scheduled-bigquery-sync` Function | ✅ Deployed | Works with smaller batches |
| `bigquery_data_models` table | ✅ Model Created | shopee_orders → cdp_orders |
| `bigquery_sync_watermarks` table | ✅ Exists | Ready for incremental sync |
| `tenants` table | ✅ Test Tenant Created | e2e-bq-test (SMB tier) |
| `cdp_orders` table | ✅ 7 Orders Synced | 4.1M VND gross revenue |
| `central_metric_facts` table | ✅ KPI Aggregated | 6 orders, 90% margin |
| `alert_instances` table | ✅ 2 Alerts Created | Cancellation + Revenue alerts |

## TEST RESULTS SUMMARY

```text
═══════════════════════════════════════════════════════════════════════
              BIGQUERY SYNC E2E TEST - ARCHITECTURE v1.4.2             
═══════════════════════════════════════════════════════════════════════

STEP 1: BigQuery Connectivity (L10)
  ✅ Query executed successfully via bigquery-query
  ✅ Returned 20 rows from olvboutique_shopee.shopee_Orders
  ✅ Schema detected: 40+ fields

STEP 2: Sync to L2 Master Model (cdp_orders)
  ✅ 7 orders synced to cdp_orders
  ✅ Total gross revenue: 4,096,498 VND
  ✅ Total net revenue: 3,101,398 VND
  ✅ 1 cancelled order tracked

STEP 3: KPI Aggregation (L3 - central_metric_facts)
  ✅ Daily channel metrics computed
  ✅ Revenue: 3,445,998 VND (excluding cancelled)
  ✅ Margin: 90%
  ✅ Order count: 6

STEP 4: Alert Detection (L4 - alert_instances)
  ✅ 2 alerts generated:
     - Cancellation rate: 14.3% (threshold: 10%)
     - Revenue threshold: 3.4M VND reached

═══════════════════════════════════════════════════════════════════════
                    ALL LAYERS VERIFIED ✅
═══════════════════════════════════════════════════════════════════════
```

## KNOWN ISSUES

1. **Memory Limit**: scheduled-bigquery-sync hits memory limit with 5000 rows
   - Workaround: Use smaller batch sizes or manual sync
   - TODO: Add batch_size parameter support

2. **Dataset Access**: Service account only has access to `olvboutique_*` datasets
   - Updated data model to use correct dataset

## 3. TEST WORKFLOW

### Phase 1: Setup Test Tenant & BigQuery Config

Tạo tenant và cấu hình BigQuery data model:

```sql
-- Step 1.1: Create test tenant
INSERT INTO tenants (id, name, slug, plan)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'E2E BigQuery Test',
  'e2e-bq-test',
  'pro'
) ON CONFLICT (id) DO NOTHING;

-- Step 1.2: Create BigQuery config
INSERT INTO bigquery_configs (tenant_id, project_id, is_active)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bluecore-dcp',
  true
) ON CONFLICT (tenant_id) DO UPDATE SET is_active = true;

-- Step 1.3: Create data models for sync
INSERT INTO bigquery_data_models (
  tenant_id, model_name, model_label, bigquery_dataset, bigquery_table,
  primary_key_field, timestamp_field, target_table, is_enabled
) VALUES 
  -- Orders model
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'shopee_orders',
    'Shopee Orders',
    'bluecoredcp_shopee',
    'shopee_Orders',
    'order_sn',
    'create_time',
    'cdp_orders',
    true
  ),
  -- Order Items model
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'shopee_order_items',
    'Shopee Order Items',
    'bluecoredcp_shopee',
    'shopee_OrderItems',
    'item_id',
    NULL,
    'cdp_order_items',
    true
  )
ON CONFLICT (tenant_id, model_name) DO UPDATE SET is_enabled = true;
```

### Phase 2: Test BigQuery Query (L10)

Test direct query từ BigQuery để verify connectivity:

```typescript
// Via Edge Function
POST /functions/v1/bigquery-query
{
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "dataset": "bluecoredcp_shopee",
  "table": "shopee_Orders",
  "query_type": "filtered",
  "columns": ["order_sn", "create_time", "total_amount", "order_status"],
  "limit": 10,
  "order_by": [{ "field": "create_time", "direction": "desc" }]
}
```

**Expected Result:**
- `success: true`
- `row_count: 10`
- `rows[]` chứa order data từ BigQuery

### Phase 3: Test BigQuery Sync to L2 (Master Model)

Sync data từ BigQuery vào cdp_orders:

```typescript
// Via Edge Function
POST /functions/v1/sync-bigquery
Authorization: Bearer {SERVICE_ROLE_KEY}
{
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "action": "sync_from_models",
  "batch_size": 100
}
```

**Verification:**
```sql
-- Check synced orders
SELECT 
  COUNT(*) as total_orders,
  SUM(gross_revenue) as total_revenue,
  MIN(order_at) as first_order,
  MAX(order_at) as last_order
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Check sync watermarks
SELECT * FROM bigquery_sync_watermarks
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

### Phase 4: Test KPI Aggregation (L3)

Sau khi có data ở L2, chạy KPI aggregation:

```sql
-- Option A: Call function if exists
SELECT compute_kpi_facts_daily(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  CURRENT_DATE
);

-- Option B: Direct aggregation
INSERT INTO kpi_facts_daily (tenant_id, kpi_id, fact_date, value, grain)
SELECT
  tenant_id,
  (SELECT id FROM kpi_definitions WHERE code = 'REVENUE' LIMIT 1),
  order_at::date,
  SUM(net_revenue),
  'daily'
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY tenant_id, order_at::date;
```

**Verification:**
```sql
SELECT 
  fact_date,
  SUM(value) as total_value,
  COUNT(*) as kpi_count
FROM kpi_facts_daily
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY fact_date
ORDER BY fact_date DESC
LIMIT 10;
```

### Phase 5: Test Alert Detection (L4)

Trigger alert detection dựa trên KPI thresholds:

```sql
-- Check if detect function exists
SELECT detect_threshold_breaches(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);

-- Verify alerts
SELECT * FROM alert_instances
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY created_at DESC
LIMIT 10;
```

## 4. TEST SCRIPT CHI TIẾT

### Script 1: Setup (`test-bq-01-setup.sql`)

```sql
-- ============================================================================
-- BIGQUERY SYNC TEST - SETUP
-- ============================================================================

-- Cleanup existing test data
DELETE FROM bigquery_sync_watermarks 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

DELETE FROM bigquery_data_models 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

DELETE FROM cdp_orders 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Create tenant
INSERT INTO tenants (id, name, slug, plan)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'E2E BigQuery Test',
  'e2e-bq-test',
  'pro'
) ON CONFLICT (id) DO UPDATE SET name = 'E2E BigQuery Test';

-- Create BigQuery config
INSERT INTO bigquery_configs (tenant_id, project_id, is_active)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bluecore-dcp',
  true
) ON CONFLICT (tenant_id) DO UPDATE SET is_active = true;

-- Create connector integration
INSERT INTO connector_integrations (
  id, tenant_id, connector_type, connector_name, status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'bigquery',
  'BigQuery - Shopee',
  'active'
) ON CONFLICT (id) DO UPDATE SET status = 'active';

-- Create data models
INSERT INTO bigquery_data_models (
  tenant_id, model_name, model_label, bigquery_dataset, bigquery_table,
  primary_key_field, timestamp_field, target_table, is_enabled, sync_frequency_hours
) VALUES 
(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'shopee_orders',
  'Shopee Orders',
  'bluecoredcp_shopee',
  'shopee_Orders',
  'order_sn',
  'create_time',
  'cdp_orders',
  true,
  1
)
ON CONFLICT (tenant_id, model_name) DO UPDATE SET is_enabled = true;

SELECT 'Setup completed' as status;
```

### Script 2: Verify BigQuery Query (`test-bq-02-query.ts`)

```typescript
// Test via Edge Function
async function testBigQueryQuery() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/bigquery-query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        tenant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        dataset: 'bluecoredcp_shopee',
        table: 'shopee_Orders',
        query_type: 'filtered',
        columns: ['order_sn', 'create_time', 'total_amount'],
        limit: 5,
      }),
    }
  );
  
  const result = await response.json();
  console.log('Query result:', result);
  
  return {
    success: result.success,
    row_count: result.row_count,
    has_schema: result.schema?.length > 0,
  };
}
```

### Script 3: Sync & Verify (`test-bq-03-sync.ts`)

```typescript
// Trigger sync
async function testBigQuerySync() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/sync-bigquery`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        tenant_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        action: 'sync_from_models',
        batch_size: 100,
      }),
    }
  );
  
  return await response.json();
}

// Verify sync
async function verifySyncResults() {
  const { data: orders } = await supabase
    .from('cdp_orders')
    .select('*', { count: 'exact' })
    .eq('tenant_id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    
  const { data: watermarks } = await supabase
    .from('bigquery_sync_watermarks')
    .select('*')
    .eq('tenant_id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    
  return {
    orders_synced: orders?.length || 0,
    watermark_status: watermarks?.[0]?.sync_status,
    last_sync: watermarks?.[0]?.last_sync_at,
  };
}
```

## 5. FILES TO CREATE

| File | Purpose |
|------|---------|
| `supabase/e2e-test/bigquery/01-setup.sql` | Setup tenant & config |
| `supabase/e2e-test/bigquery/02-test-query.sql` | Test BigQuery query |
| `supabase/e2e-test/bigquery/03-test-sync.sql` | Test sync to L2 |
| `supabase/e2e-test/bigquery/04-verify-l3.sql` | Verify KPI aggregation |
| `supabase/e2e-test/bigquery/05-verify-l4.sql` | Verify alert detection |
| `supabase/e2e-test/bigquery/99-cleanup.sql` | Cleanup test data |

## 6. IMPLEMENTATION STEPS

1. **Create test folder structure** - `supabase/e2e-test/bigquery/`
2. **Create setup script** - Insert tenant, config, data models
3. **Test BigQuery connectivity** - Via `bigquery-query` function
4. **Test sync flow** - Via `sync-bigquery` function
5. **Verify L2 data** - Check cdp_orders populated
6. **Run L3 aggregation** - Generate kpi_facts_daily
7. **Run L4 detection** - Generate alerts if thresholds breached
8. **Create verification script** - Summary report

## 7. EXPECTED OUTPUT

```text
═══════════════════════════════════════════════════════════════════════
              BIGQUERY SYNC E2E TEST - ARCHITECTURE v1.4.2             
═══════════════════════════════════════════════════════════════════════

STEP 1: BigQuery Connectivity
  ✅ Query executed successfully
  ✅ Returned 5 rows from shopee_Orders
  ✅ Schema detected: 15 fields

STEP 2: Sync to L2 Master Model
  ✅ sync-bigquery function called
  ✅ cdp_orders: 100 records synced
  ✅ Watermark updated: completed

STEP 3: KPI Aggregation (L3)
  ✅ kpi_facts_daily: 30 records generated
  ✅ Revenue metrics computed

STEP 4: Alert Detection (L4)
  ✅ Threshold check completed
  ✅ alert_instances: 3 alerts generated

═══════════════════════════════════════════════════════════════════════
                    ALL LAYERS VERIFIED ✅
═══════════════════════════════════════════════════════════════════════
```

## 8. TECHNICAL NOTES

### BigQuery Datasets Available
- `bluecoredcp_shopee` - Shopee data
- `bluecoredcp_lazada` - Lazada data
- `bluecoredcp_tiktokshop` - TikTok data
- `bluecoredcp_sapo` - Sapo data

### Key Functions
- `sync-bigquery` - Main sync function (requires service role key)
- `bigquery-query` - Query function (anon key OK)
- `scheduled-bigquery-sync` - Cron-triggered sync

### Security
- `sync-bigquery` validates `Authorization: Bearer {SERVICE_ROLE_KEY}`
- Tenant isolation via `tenant_id` filter
- SQL injection prevention in query builder
