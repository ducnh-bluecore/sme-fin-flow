


## Plan: Fix 5 bugs trong Allocation & Rebalance Engine ✅ DONE

### Bug #1: Duplicate Recommendations (CRITICAL) ✅
- Added UNIQUE constraint `uq_alloc_run_fc_store` on `(run_id, fc_id, store_id)`
- Cleaned existing duplicates
- Added GROUP BY in V1 CTE + ON CONFLICT DO NOTHING

### Bug #2: CW Reserve quá bảo thủ ✅
- Changed from fixed `v_cw_reserve_min` (20 units) to percentage-based: `GREATEST(3, FLOOR(cw_available * 0.15))`
- CORE/HERO still use dedicated reserve rules

### Bug #3: Scarcity filter chặn Tier C ✅
- Updated `min_system_stock` from 50 → 20 in scarcity policy
- BST mới (< 60 days) bypasses scarcity filter entirely

### Bug #4: Rebalance Push cumulative stock ✅
- Added `push_cumulative` CTE with `SUM(push_qty) OVER (PARTITION BY fc_id ORDER BY weeks_cover ASC)`
- Filter `WHERE cum_push <= cw_available` prevents over-allocation

### Bug #5: V2 miss BST mới ✅
- BST mới bypasses `vel > 0` requirement in V2
- Fallback to V1 min_stock logic when velocity = 0
- Reason text shows "V2-BST mới (phủ nền, chưa có sales)"

## Phase 4: Option B — Time-Based Virtual Deduction ✅ DONE

### Nguyên lý
`available = raw_on_hand - SUM(approved_qty WHERE approved_at > last_sync_snapshot_date)`
Khi sync chạy lại → snapshot_date mới > approved_at cũ → deduction tự biến mất. Không double deduction.

### Thay đổi đã triển khai
1. **fn_allocation_engine**: Thêm `tmp_pending_deductions` (UNION ALL alloc + rebalance approved) → trừ từ `tmp_cw`
2. **fn_rebalance_engine**: Thêm `_pending_deductions` → trừ vào `_pos.available` cho CW stores
3. **useSourceOnHand.ts**: Fetch approved alloc/rebalance records có `approved_at > cwLastSync`, trừ từ CW store positions
4. **useApproveRebalance.ts**: Invalidate `inv-source-dest-on-hand` + `inv-positions` cache sau approve

## Multi-tenant Daily Sync ✅ DONE

### Thay đổi
- **`daily-bigquery-sync`**: Bỏ hardcode `TENANT_ID`, thay bằng query `bigquery_configs WHERE is_active = true` để auto-discover active tenants
- **Logic**: 
  - Cron trigger (không có `tenant_id` trong body) → sync TẤT CẢ active tenants
  - Manual/Admin trigger (có `tenant_id`) → sync 1 tenant cụ thể
  - Multi-tenant chạy sequential, mỗi tenant có run log riêng trong `daily_sync_runs`
- **pg_cron**: Không cần sửa — existing cron jobs gọi edge function KHÔNG truyền tenant_id → tự động chạy cho tất cả active tenants

## Schema Routing cho Multi-tenant ✅ DONE

### Thay đổi
- **`backfill-bigquery`**: Thêm `init_tenant_session` RPC call sau khi tạo supabase client, trước khi ghi data. Tenant có schema riêng → data route vào `tenant_xxx.*`. Tenant chưa có → fallback `public` (backward compatible).
- **`daily-bigquery-sync`**: Thêm `init_tenant_session` ở đầu `syncTenant()` để mỗi tenant trong loop được set đúng `search_path`.
- **Graceful fallback**: Nếu `init_tenant_session` fail → warn log + tiếp tục với public schema, không crash pipeline.

## Multi-tenant BigQuery Sources ✅ DONE

### Thay đổi
- **Bảng `bigquery_tenant_sources`**: Cấu hình nguồn BQ theo tenant (model_type, channel, dataset, table_name). UNIQUE(tenant_id, model_type, channel).
- **Seed Icon Denim**: 5 records (customers, orders, order_items, products, fulfillments) → dataset `DW-160STORE-BQ`, bảng `raw_hrv_*`
- **`backfill-bigquery/index.ts`**: 
  - Thêm `resolveSources()` — query `bigquery_tenant_sources` theo tenant_id + model_type, override dataset/table từ config. Fallback về hardcode nếu không có config.
  - Thêm `hasKiotVietChannel()` — chỉ apply marketplace dedup khi tenant dùng kiotviet.
  - Áp dụng cho tất cả sync functions: customers, orders, order_items, refunds, payments, fulfillments, products.
- **Không ảnh hưởng OLV Boutique** — không có config trong bảng mới → fallback hardcode.