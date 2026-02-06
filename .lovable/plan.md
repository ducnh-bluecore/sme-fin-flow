
# KẾ HOẠCH TEST TỔNG THỂ: BigQuery → L2 SSOT (10 Master Models)

## 1. TỔNG QUAN

### 1.1 Mục tiêu
Test toàn bộ flow sync dữ liệu từ BigQuery vào L2 Master Model (SSOT), sau đó aggregate qua L3 KPI và detect alerts ở L4.

### 1.2 Phạm vi Test

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              BIGQUERY → L2 → L3 → L4 TEST FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐           │
│  │ BIGQUERY        │    │ L2 MASTER MODEL │    │ L3 KPI LAYER    │    │ L4 ALERT LAYER  │           │
│  │ SOURCE DATA     │ ─► │ (SSOT)          │ ─► │                 │ ─► │                 │           │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤           │
│  │ Customers 454K  │    │ cdp_customers   │    │ kpi_facts_daily │    │ alert_instances │           │
│  │ Products 16.7K  │    │ products        │    │ kpi_targets     │    │ decision_cards  │           │
│  │ Orders 560K     │    │ cdp_orders      │    │ kpi_thresholds  │    │ priority_queue  │           │
│  │ Refunds 17K     │    │ cdp_refunds     │    │                 │    │                 │           │
│  │ Payments 468K   │    │ cdp_payments    │    │                 │    │                 │           │
│  │ Fulfillments    │    │ cdp_fulfillments│    │                 │    │                 │           │
│  │ Inventory 3.9M  │    │ inventory_moves │    │                 │    │                 │           │
│  │ Campaigns 2K    │    │ campaigns       │    │                 │    │                 │           │
│  │ Ad Spend 44K    │    │ ad_spend        │    │                 │    │                 │           │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘           │
│                                                                                                      │
│  TOTAL: ~6.9M records → ~350K unique customers + 560K orders + related entities                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DATA SOURCE MATRIX

| Master Model | BigQuery Source | Records | Dedup Strategy |
|--------------|-----------------|---------|----------------|
| **Customers** | raw_kiotviet_Customers + raw_hrv_Customers + BCApp_MemberInfo | 454K → 300-350K | Phone/Email |
| **Products** | bdm_master_data_products | 16.7K | SKU unique |
| **Orders** | 5 channels (Shopee/Lazada/TikTok/Tiki/KiotViet) | 560K | channel + order_key |
| **Order Items** | Từ order data | 1.2M | FK to orders |
| **Refunds** | shopee_Returns + lazada_ReverseOrders + tiktok_Returns | 17K | refund_key |
| **Payments** | shopee_Escrows + lazada_FinanceTransactionDetails | 468K | payment_key |
| **Fulfillments** | shopee_TrackingInfo + lazada_LogisticOrderTraces | 285K | tracking_key |
| **Inventory** | bdm_kov_xuat_nhap_ton | 3.9M | date + sku + warehouse |
| **Campaigns** | fb_Ads_Campaigns + tiktok_Ads_Campaigns | 2K | campaign_id |
| **Ad Spend** | fb_Ads_Insights + tiktok_Ads_Insights | 44K | date + campaign |

---

## 3. SCHEMA CHANGES REQUIRED

### 3.1 Migration: cdp_customers (Add Customer Profile Fields)

```sql
-- Thêm columns cho customer profile
ALTER TABLE cdp_customers
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Index cho deduplication
CREATE INDEX IF NOT EXISTS idx_cdp_customers_phone 
ON cdp_customers(tenant_id, phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdp_customers_email 
ON cdp_customers(tenant_id, email) WHERE email IS NOT NULL;
```

### 3.2 Migration: cdp_orders (Update Unique Constraint)

```sql
-- Drop old constraint and create new one with channel
DROP INDEX IF EXISTS idx_cdp_orders_key;
CREATE UNIQUE INDEX idx_cdp_orders_channel_key 
ON cdp_orders(tenant_id, channel, order_key);
```

### 3.3 Migration: bigquery_backfill_jobs (New Table)

```sql
CREATE TABLE bigquery_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  model_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  last_processed_date DATE,
  last_watermark TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_backfill_jobs_tenant_model 
ON bigquery_backfill_jobs(tenant_id, model_type);
```

---

## 4. TEST PHASES

### Phase 0: Infrastructure Setup

| Step | Task | Files to Create | Validation |
|------|------|-----------------|------------|
| 0.1 | Create test tenant | `bigquery/10-setup-test-tenant.sql` | Tenant exists |
| 0.2 | Create BigQuery config | `bigquery/11-setup-bigquery-config.sql` | Config active |
| 0.3 | Apply schema migrations | Migration files | Tables updated |

### Phase 1: Core Master Models (Priority 1)

| Step | Model | Source | Target Records | Time Est. |
|------|-------|--------|----------------|-----------|
| 1.1 | Customers (KiotViet) | raw_kiotviet_Customers | 338K | 30 min |
| 1.2 | Customers (Haravan) | raw_hrv_Customers | 57K | 10 min |
| 1.3 | Customers (Bluecore) | BCApp_MemberInfo | 53K | 5 min |
| 1.4 | Customer Dedup | All 3 sources | ~300-350K unique | 15 min |
| 1.5 | Products | bdm_master_data_products | 16.7K | 5 min |
| 1.6 | Orders (all channels) | 5 marketplace sources | 560K | 1-2 hr |

### Phase 2: Transaction Models

| Step | Model | Source | Target Records | Time Est. |
|------|-------|--------|----------------|-----------|
| 2.1 | Order Items | Derived from orders | 1.2M | 1 hr |
| 2.2 | Refunds | shopee/lazada/tiktok_Returns | 17K | 5 min |
| 2.3 | Payments | Escrows + Finance | 468K | 45 min |
| 2.4 | Fulfillments | Tracking data | 285K | 30 min |

### Phase 3: Marketing Models

| Step | Model | Source | Target Records | Time Est. |
|------|-------|--------|----------------|-----------|
| 3.1 | Campaigns | fb/tiktok_Campaigns | 2K | 2 min |
| 3.2 | Ad Spend Daily | fb/tiktok_Insights | 44K | 10 min |

### Phase 4: Inventory (Largest Volume)

| Step | Model | Source | Target Records | Time Est. |
|------|-------|--------|----------------|-----------|
| 4.1 | Inventory Movements | bdm_kov_xuat_nhap_ton | 3.9M | 4-5 hr |

### Phase 5: L3 KPI Aggregation

| Step | Task | Function/Query |
|------|------|----------------|
| 5.1 | Compute KPI facts | `compute_kpi_facts_daily()` |
| 5.2 | Set KPI targets | Insert into `kpi_targets` |
| 5.3 | Define thresholds | Insert into `kpi_thresholds` |

### Phase 6: L4 Alert Detection

| Step | Task | Function/Query |
|------|------|----------------|
| 6.1 | Detect threshold breaches | `detect_threshold_breaches()` |
| 6.2 | Generate decision cards | `generate_decision_cards()` |
| 6.3 | Populate priority queue | `populate_priority_queue()` |

---

## 5. TEST FILES TO CREATE

```text
supabase/e2e-test/bigquery/
├── 10-setup-test-tenant.sql          # Test tenant + BigQuery config
├── 11-backfill-customers.sql         # Sync 3 customer sources + dedup
├── 12-backfill-products.sql          # Sync products
├── 13-backfill-orders.sql            # Sync 5 channel orders
├── 14-backfill-order-items.sql       # Sync order line items
├── 15-backfill-transactions.sql      # Refunds + Payments + Fulfillments
├── 16-backfill-marketing.sql         # Campaigns + Ad Spend
├── 17-backfill-inventory.sql         # Inventory movements (largest)
├── 20-verify-l2-integrity.sql        # Verify L2 Master Model
├── 21-run-l3-aggregation.sql         # Compute L3 KPI facts
├── 22-run-l4-detection.sql           # Detect alerts
├── 30-comprehensive-verify.sql       # Full verification report
└── 99-cleanup.sql                    # Cleanup test data
```

---

## 6. EDGE FUNCTION: backfill-bigquery

### 6.1 API Design

```typescript
// POST /functions/v1/backfill-bigquery
{
  "action": "start" | "continue" | "status" | "cancel",
  "tenant_id": "uuid",
  "model_type": "customers" | "products" | "orders" | ...,
  "options": {
    "source_table": "raw_kiotviet_Customers",
    "batch_size": 500,
    "date_from": "2025-01-01",
    "date_to": "2026-01-31"
  }
}
```

### 6.2 Customer Sync Mode (with Dedup)

```typescript
// Pseudocode for customer dedup
async function syncCustomers(tenantId, sources) {
  const customerMap = new Map(); // phone -> customer data
  
  for (const source of sources) {
    const rows = await queryBigQuery(source.query);
    
    for (const row of rows) {
      const phone = normalizePhone(row.phone);
      const email = row.email?.toLowerCase();
      
      const existingKey = phone || email;
      
      if (customerMap.has(existingKey)) {
        // Merge: keep earliest created_at, sum lifetime_value
        const existing = customerMap.get(existingKey);
        existing.external_ids.push({ source: source.name, id: row.id });
        existing.lifetime_value += row.total_spent || 0;
      } else {
        customerMap.set(existingKey, {
          phone, email,
          name: row.name,
          external_ids: [{ source: source.name, id: row.id }],
          ...
        });
      }
    }
  }
  
  // Upsert to cdp_customers
  await upsertCustomers(customerMap.values());
}
```

---

## 7. EXPECTED VALUES (SUCCESS CRITERIA)

### 7.1 L2 Master Model Counts

| Table | Expected Count | Tolerance |
|-------|----------------|-----------|
| cdp_customers | 300,000 - 350,000 | ±5% |
| products | 16,700 | 0% |
| cdp_orders | 560,000 | ±2% |
| cdp_order_items | 1,200,000 | ±5% |
| cdp_refunds | 17,000 | ±5% |
| cdp_payments | 468,000 | ±5% |
| cdp_fulfillments | 285,000 | ±5% |
| campaigns | 2,000 | ±5% |
| ad_spend_daily | 44,000 | ±5% |
| inventory_movements | 3,900,000 | ±5% |

### 7.2 Data Integrity Checks

| Check | Expected Result |
|-------|-----------------|
| Orders without customer link | < 5% |
| Order items orphaned | 0 |
| Duplicate order_key per channel | 0 |
| Customer dedup ratio | ~25-35% (454K → 300-350K) |
| Products with cost_price | > 90% |

### 7.3 L3/L4 Aggregation

| Metric | Expected Range |
|--------|----------------|
| KPI facts daily rows | 500 - 800 |
| Alert instances | 10 - 30 |
| Priority queue items | 5 - 15 |

---

## 8. VERIFICATION QUERIES

### 8.1 L2 Master Model Verification

```sql
-- Customer dedup verification
SELECT 
  COUNT(*) as total_customers,
  COUNT(DISTINCT phone) as unique_phones,
  COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) > 1) as merged_profiles,
  ROUND(COUNT(*) FILTER (WHERE jsonb_array_length(external_ids) > 1)::numeric / COUNT(*) * 100, 1) as merge_percent
FROM cdp_customers
WHERE tenant_id = :tenant_id;

-- Order distribution by channel
SELECT 
  channel,
  COUNT(*) as order_count,
  SUM(net_revenue) as total_revenue,
  AVG(net_revenue) as avg_order_value
FROM cdp_orders
WHERE tenant_id = :tenant_id
  AND order_at >= '2025-01-01'
GROUP BY channel
ORDER BY order_count DESC;

-- Data integrity: orphaned order items
SELECT COUNT(*) as orphaned_items
FROM cdp_order_items oi
LEFT JOIN cdp_orders o ON o.id = oi.order_id
WHERE oi.tenant_id = :tenant_id
  AND o.id IS NULL;
```

### 8.2 Cross-Layer Verification

```sql
-- L2 → L3 flow
SELECT 
  'L2_TO_L3' as check,
  (SELECT COUNT(*) FROM cdp_orders WHERE tenant_id = :tenant_id) as l2_orders,
  (SELECT COUNT(*) FROM kpi_facts_daily WHERE tenant_id = :tenant_id) as l3_facts,
  CASE 
    WHEN (SELECT COUNT(*) FROM kpi_facts_daily WHERE tenant_id = :tenant_id) > 0 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as status;
```

---

## 9. TIMELINE ESTIMATE

| Phase | Duration | Parallel? |
|-------|----------|-----------|
| Phase 0: Setup | 15 min | No |
| Phase 1: Core Models | 2-3 hr | Customers/Products parallel |
| Phase 2: Transactions | 2 hr | Sequential (FK deps) |
| Phase 3: Marketing | 15 min | Parallel |
| Phase 4: Inventory | 4-5 hr | Independent |
| Phase 5: L3 Aggregation | 30 min | After L2 |
| Phase 6: L4 Detection | 15 min | After L3 |
| Verification | 30 min | After all |

**TOTAL: ~10-12 hours for full sync + verification**

---

## 10. RISK MITIGATION

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Memory overflow (3.9M inventory) | High | Chunk by date, 500 records/batch |
| Customer dedup collision | Medium | Phone normalization, email fallback |
| Order FK resolution | Medium | Lookup map order_key → UUID |
| BigQuery rate limits | Low | Exponential backoff, 10s delay |
| Timeout (Edge Function 150s) | High | Resume capability via watermark |

---

## 11. FILES TO MODIFY/CREATE

### 11.1 Database Migrations

| File | Action | Description |
|------|--------|-------------|
| `migrations/xxx_cdp_customers_profile_fields.sql` | CREATE | Add name, phone, email, external_ids |
| `migrations/xxx_cdp_orders_channel_constraint.sql` | CREATE | Update unique constraint |
| `migrations/xxx_bigquery_backfill_jobs.sql` | CREATE | Backfill tracking table |

### 11.2 Edge Functions

| File | Action | Description |
|------|--------|-------------|
| `functions/backfill-bigquery/index.ts` | CREATE | Main backfill function with resume |

### 11.3 Test Scripts

| File | Action | Description |
|------|--------|-------------|
| `e2e-test/bigquery/10-setup-test-tenant.sql` | CREATE | Test tenant setup |
| `e2e-test/bigquery/11-backfill-customers.sql` | CREATE | Customer sync + dedup |
| `e2e-test/bigquery/12-backfill-products.sql` | CREATE | Product sync |
| `e2e-test/bigquery/13-backfill-orders.sql` | CREATE | Order sync (5 channels) |
| `e2e-test/bigquery/14-backfill-order-items.sql` | CREATE | Order items sync |
| `e2e-test/bigquery/15-backfill-transactions.sql` | CREATE | Refunds/Payments/Fulfillments |
| `e2e-test/bigquery/16-backfill-marketing.sql` | CREATE | Campaigns/Ad Spend |
| `e2e-test/bigquery/17-backfill-inventory.sql` | CREATE | Inventory movements |
| `e2e-test/bigquery/20-verify-l2-integrity.sql` | CREATE | L2 verification |
| `e2e-test/bigquery/21-run-l3-aggregation.sql` | CREATE | L3 KPI computation |
| `e2e-test/bigquery/22-run-l4-detection.sql` | CREATE | L4 alert detection |
| `e2e-test/bigquery/30-comprehensive-verify.sql` | CREATE | Full verification report |

### 11.4 Frontend Hooks

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useBigQueryBackfill.ts` | CREATE | UI hook for triggering backfill |
| `src/pages/admin/BigQueryBackfill.tsx` | CREATE | Admin UI for monitoring |
