

## Phân tích: Tự động tạo schema riêng cho tenant mới — Cần fix gì?

### Hiện trạng

| Component | Hành vi hiện tại | Vấn đề |
|-----------|-----------------|--------|
| `create-tenant-with-owner` | Gọi `provision_tenant_schema()` → tạo schema trống ✅ | Chỉ tạo cấu trúc, không route data vào |
| `create-tenant-self` | Gọi `provision_tenant_by_tier()` cho midmarket/enterprise ✅ | Tương tự — schema trống |
| `backfill-bigquery` | Ghi trực tiếp vào `public.cdp_orders`, `public.products`... | **❌ KHÔNG gọi `init_tenant_session`** → data LUÔN vào public |
| `daily-bigquery-sync` | Gọi `backfill-bigquery` | Kế thừa bug trên |
| RPCs post-sync | `compute_kpi_facts_daily`, `detect_threshold_breaches` | Cần verify có respect `search_path` không |

### Vấn đề cốt lõi

**`backfill-bigquery` dùng service role client + ghi thẳng vào `public.*`** — không bao giờ gọi `init_tenant_session()` hay `set_tenant_schema()`. Dù tenant có schema riêng, data vẫn đổ vào public.

```text
BigQuery → backfill-bigquery → public.cdp_orders  ← LUÔN ở đây
                                                     (không bao giờ vào tenant_xxx.cdp_orders)
```

### Kế hoạch fix — 3 thay đổi

#### 1. Sửa `backfill-bigquery` — Set search_path trước khi ghi data

Thêm đoạn init tenant session ở đầu mỗi lần xử lý:

- Sau khi có `tenant_id`, gọi `supabase.rpc('init_tenant_session', { p_tenant_id: tenant_id })`
- Nếu tenant có schema riêng → `search_path` = `tenant_xxx, public` → `.from('cdp_orders')` sẽ tự route vào `tenant_xxx.cdp_orders`
- Nếu tenant chưa có schema → `search_path` vẫn là `public` → behavior y hệt hiện tại, không break gì

**File sửa**: `supabase/functions/backfill-bigquery/index.ts`
- Thêm ~10 dòng gọi `init_tenant_session` sau khi parse `tenant_id`
- Áp dụng cho cả action `start` và `continue`

#### 2. Sửa `daily-bigquery-sync` — Init session cho mỗi tenant trước sync

Hiện tại `syncTenant()` dùng chung 1 supabase client cho tất cả tenant. Cần gọi `init_tenant_session` ở đầu mỗi `syncTenant()` để set đúng search_path.

**File sửa**: `supabase/functions/daily-bigquery-sync/index.ts`
- Thêm `supabase.rpc('init_tenant_session', { p_tenant_id: tenantId })` ở đầu function `syncTenant()`

#### 3. Verify RPCs post-sync respect search_path

Các RPC như `compute_kpi_facts_daily`, `detect_threshold_breaches`, `backfill_cogs_pipeline` nhận `p_tenant_id` param. Cần confirm:
- Nếu chúng dùng explicit `WHERE tenant_id = p_tenant_id` → OK, vẫn query đúng bảng trong search_path
- Nếu chúng hardcode `public.xxx` → cần sửa

Đây là verify step, không chắc cần sửa code.

### Tóm tắt files cần sửa

| File | Thay đổi |
|------|---------|
| `supabase/functions/backfill-bigquery/index.ts` | Thêm `init_tenant_session` RPC call sau parse tenant_id |
| `supabase/functions/daily-bigquery-sync/index.ts` | Thêm `init_tenant_session` ở đầu `syncTenant()` |

### Rủi ro & an toàn

- **Backward compatible**: Tenant chưa có schema → `init_tenant_session` trả về `search_path = public` → không thay đổi gì
- **Tenant có schema**: Data sẽ tự động route vào `tenant_xxx.*` thay vì public
- **Không cần migrate data cũ**: Tenant mới tạo schema trống → backfill đầu tiên sẽ đổ data trực tiếp vào schema riêng

