

# Plan Fix Tổng Thể - Data Architecture v1.4.2

## Bản đồ hiện trạng

```text
LAYER        TABLE/FUNCTION              DATA STATE          STATUS
─────────────────────────────────────────────────────────────────────
L2 Master    cdp_orders                  1,147,699 rows      OK (nhưng cogs=0)
             cdp_order_items             189,732 rows        OK (nhưng line_cogs=0)
             cdp_customers               310,000+ rows       OK
             products                    16,706 rows         OK (84% có cost_price)
             cdp_refunds                 14,502 rows         OK
             cdp_fulfillments            326,532 rows        OK
             cdp_payments                985,324 rows        OK
             promotion_campaigns         110,687 rows        OK
             ad_spend_daily              449 rows            OK
             inventory_movements         890,430 rows        OK

L3 KPI       kpi_facts_daily             8,203 rows          PARTIAL
             kpi_definitions             0 rows              MISSING
             kpi_targets                 0 rows              MISSING
             kpi_thresholds              0 rows              MISSING

L4 Alert     alert_instances             13 rows             PARTIAL
             alert_rules                 0 rows              MISSING
             decision_cards              0 rows              MISSING
             evidence_packs              0 rows              MISSING

L5 AI        ai_metric_definitions       0 rows              MISSING
             ai_query_templates          10 rows             PARTIAL
             ai_dimension_catalog        12 rows             OK

L6 Audit     sync_jobs                   0 rows              MISSING
             audit_logs                  0 rows              MISSING
```

## Vấn đề chí mạng (Critical Chain)

```text
products.cost_price (84% OK)
       |
       v
update_order_items_cogs() --- BUG: dùng p.code (không tồn tại) thay vì p.sku
       |
       X  (CHAIN BROKEN)
       |
cdp_order_items.line_cogs = 0   (189,732 rows)
       |
       v
cdp_orders.cogs = 0             (1,147,699 rows) 
       |
       v
kpi_facts_daily COGS = 0        (1,239 rows)
kpi_facts_daily GROSS_MARGIN = 0
       |
       v
v_channel_performance.cogs = 0
v_all_revenue_summary.cogs = 0
       |
       v
Dashboard: Giá vốn = 0, Lợi nhuận = Doanh thu (SAI)
```

## Kế hoạch sửa: 6 Phases

### Phase 1: Fix COGS Chain (Critical - Sửa trước hết)

**1A. Fix function `update_order_items_cogs`**
- Bug: `p.code = oi.sku` -- cột `code` không tồn tại trong bảng `products`
- Fix: Đổi thành `p.sku = oi.sku`
- Match rate: 11,800/13,658 unique SKUs (86%) sẽ được cập nhật COGS

**1B. Tạo function `sync_order_cogs_from_items`**
- Aggregate `SUM(line_cogs)` từ `cdp_order_items` lên `cdp_orders.cogs`
- Tính `gross_margin = net_revenue - cogs`
- Chỉ update orders có `cogs IS NULL OR cogs = 0`

**1C. Tạo function `backfill_cogs_pipeline`**
- Gọi tuần tự: `update_order_items_cogs` -> `sync_order_cogs_from_items`
- Trả về JSON report: items updated, orders updated, match rate

### Phase 2: Recompute L3 KPI (Sau khi COGS đã có)

**2A. Xóa và tính lại KPI COGS + GROSS_MARGIN**
- DELETE kpi_facts_daily WHERE metric_code IN ('COGS', 'GROSS_MARGIN')
- Gọi lại `compute_kpi_facts_daily` cho toàn bộ date range
- Function này ĐÃ có logic COGS/GROSS_MARGIN (đọc từ `cdp_orders.cogs`), chỉ cần data đúng

### Phase 3: Seed L3 Metadata (kpi_definitions, kpi_targets, kpi_thresholds)

**3A. Seed `kpi_definitions`** - 12 core KPIs
- NET_REVENUE, GROSS_REVENUE, COGS, GROSS_MARGIN, AOV, ORDER_COUNT
- AD_SPEND, ROAS, AD_IMPRESSIONS, NEW_CUSTOMERS, REFUND_RATE, RETURN_RATE

**3B. Seed `kpi_thresholds`** - 3 severity per KPI (info/warning/critical)
- VD: GROSS_MARGIN < 30% = warning, < 20% = critical

**3C. Seed `kpi_targets`** - Monthly targets
- Dựa trên actual data trung bình * 1.1 (growth target 10%)

### Phase 4: Populate L4 Alert/Decision

**4A. Seed `alert_rules`** - 10-15 rules dựa trên kpi_thresholds
- VD: "COGS tăng > 5% so với tuần trước", "GROSS_MARGIN < 25%"

**4B. Tạo `evidence_packs`** cho 13 alert_instances hiện có
- Snapshot data quality tại thời điểm alert

**4C. Chạy `detect_threshold_breaches`** 
- Tự động tạo decision_cards từ alerts mới phát hiện

### Phase 5: Seed L5 AI Metadata

**5A. Seed `ai_metric_definitions`** - 12 metrics
- Mapping: metric_code -> table/column -> description -> unit -> format
- VD: NET_REVENUE -> cdp_orders.net_revenue -> "Doanh thu thuần" -> VND -> currency

**5B. Bổ sung `ai_query_templates`** - Proven SQL patterns
- Revenue by channel, COGS breakdown, Margin trend, Top SKU by profit
- Khoảng 10-15 templates phủ các use case phân tích chính

### Phase 6: Integrate vào Daily Sync Pipeline

**6A. Cập nhật `daily-bigquery-sync` orchestrator**
- Sau khi sync orders + order_items xong -> gọi `backfill_cogs_pipeline`
- Sau khi COGS xong -> gọi `compute_kpi_facts_daily` (2-day lookback)
- Sau khi KPI xong -> gọi `detect_threshold_breaches`

**6B. Log mỗi bước vào `sync_jobs`**
- job_type, started_at, completed_at, status, metadata (rows affected)

## Thứ tự thực hiện (Dependencies)

```text
Phase 1 (COGS Fix)
  |
  v
Phase 2 (Recompute KPI) -- phụ thuộc Phase 1
  |
  v
Phase 3 (Seed KPI Metadata) -- song song được
  |
  v
Phase 4 (Alert/Decision) -- phụ thuộc Phase 3
  |
  v
Phase 5 (AI Metadata) -- song song với Phase 4
  |
  v
Phase 6 (Daily Pipeline) -- cuối cùng, tích hợp tất cả
```

## Chi tiết kỹ thuật

### Migration 1: Fix COGS Functions

```text
-- Drop and recreate update_order_items_cogs
-- FIX: p.code -> p.sku
-- Returns: number of items updated

-- New: sync_order_cogs_from_items(p_tenant_id)
-- UPDATE cdp_orders SET cogs = subquery, gross_margin = net_revenue - cogs
-- WHERE cogs IS NULL OR cogs = 0

-- New: backfill_cogs_pipeline(p_tenant_id)
-- Calls both functions in sequence, returns JSON report
```

### Migration 2: Seed L3 Metadata

```text
-- INSERT INTO kpi_definitions (12 rows)
-- INSERT INTO kpi_thresholds (36 rows = 12 KPIs * 3 severities)
-- INSERT INTO kpi_targets (seed from actual averages)
```

### Migration 3: Seed L4 Rules + L5 AI Metadata

```text
-- INSERT INTO alert_rules (10-15 rules)
-- INSERT INTO ai_metric_definitions (12 rows)
-- INSERT INTO ai_query_templates (10-15 additional templates)
```

### Edge Function Update: daily-bigquery-sync

```text
After sync completion:
  Step 1: Call backfill_cogs_pipeline(tenant_id)
  Step 2: Call compute_kpi_facts_daily(tenant_id, lookback_start, today)
  Step 3: Call detect_threshold_breaches(tenant_id)
  Step 4: Log to sync_jobs
```

### Hook Updates (Minimal)

Không cần sửa hook -- các views (`v_channel_performance`, `v_all_revenue_summary`) đã đọc từ `cdp_orders.cogs/gross_margin`. Khi data đúng, views tự đúng.

## Kết quả mong đợi

| Metric | Trước | Sau |
|--------|-------|-----|
| cdp_order_items.line_cogs > 0 | 0 / 189,732 | ~163,000 / 189,732 (86%) |
| cdp_orders.cogs > 0 | 0 / 1,147,699 | ~985,000 / 1,147,699 (86%) |
| kpi_facts_daily COGS | 0 | Actual values |
| kpi_facts_daily GROSS_MARGIN | 0 | Actual values |
| kpi_definitions | 0 | 12 |
| kpi_thresholds | 0 | 36 |
| alert_rules | 0 | 10-15 |
| ai_metric_definitions | 0 | 12 |
| Dashboard COGS | 0 VND | Real COGS |
| Dashboard Gross Margin | = Revenue (sai) | Revenue - COGS (đúng) |

