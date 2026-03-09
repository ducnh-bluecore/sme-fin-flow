

## Phân tích: Data tenant mới nằm ở đâu? Có lẫn data không?

### Kiến trúc hiện tại: Shared Schema (public) + RLS

**Tất cả tenant dùng CHUNG các bảng trong `public` schema.** Mỗi row có cột `tenant_id` để phân biệt.

```text
public.cdp_orders
├── row: tenant_id = OLV_ID,  order_key = "SP001" ...
├── row: tenant_id = OLV_ID,  order_key = "SP002" ...
├── row: tenant_id = NEW_TENANT_ID, order_key = "SP001" ...  ← tenant mới
└── row: tenant_id = NEW_TENANT_ID, order_key = "SP002" ...  ← tenant mới
```

### Cơ chế chống lẫn data

| Layer | Cách hoạt động | Trạng thái |
|-------|----------------|-----------|
| **RLS (Row Level Security)** | Mỗi bảng có policy `WHERE tenant_id = current_setting('app.current_tenant')` hoặc `get_active_tenant_id()` | ✅ Đã có trên ~100+ bảng |
| **Unique Constraints** | `(tenant_id, channel, order_key)`, `(tenant_id, canonical_key)`, `(tenant_id, sku)` | ✅ Đã có — 2 tenant có cùng SKU "SP001" sẽ KHÔNG conflict |
| **Session init** | `init_tenant_session()` set `app.current_tenant` → tất cả query sau đó chỉ thấy data tenant mình | ✅ Đã có |
| **Backfill** | `backfill-bigquery` nhận `tenant_id` param, INSERT với `tenant_id` đúng | ✅ Đã có |

### Rủi ro thực tế: 2 điểm CHƯA an toàn

#### 1. `daily-bigquery-sync` HARDCODE tenant ID
```typescript
// supabase/functions/daily-bigquery-sync/index.ts line 16
const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```
→ Nếu tạo tenant mới, daily sync **sẽ KHÔNG chạy** cho tenant đó. Phải cập nhật edge function để loop qua tất cả active tenants có `bigquery_configs`.

#### 2. `pg_cron` jobs cũng hardcode tenant
12 cron jobs đều gọi edge functions với tenant ID cố định. Tenant mới sẽ không được sync tự động.

### Kết luận: Data KHÔNG bị lẫn, nhưng tenant mới sẽ KHÔNG có daily sync

| Câu hỏi | Trả lời |
|---------|---------|
| Data nằm ở đâu? | Cùng bảng `public.*`, phân biệt bằng `tenant_id` |
| Có trùng bảng? | Có — cùng bảng, nhưng unique constraint theo `(tenant_id, ...)` nên không conflict |
| Lẫn data giữa 2 nguồn? | **Không** — RLS + session var đảm bảo mỗi user chỉ thấy data tenant mình |
| Tenant mới có auto sync? | **Không** — phải sửa `daily-bigquery-sync` + `pg_cron` |

### Cần làm để tenant mới hoạt động đầy đủ

1. **Sửa `daily-bigquery-sync`** — thay hardcode bằng query `SELECT id FROM tenants WHERE is_active = true AND id IN (SELECT tenant_id FROM bigquery_configs WHERE is_active = true)`, rồi loop sync cho từng tenant
2. **Sửa `pg_cron` jobs** — tương tự, các RPC như `compute_kpi_facts_daily`, `detect_threshold_breaches` phải chạy cho tất cả active tenants
3. **Thêm vào Onboarding Checklist** — bước "Daily Sync Activated" để admin biết tenant mới đã được đưa vào pipeline tự động

### Files cần sửa
- `supabase/functions/daily-bigquery-sync/index.ts` — bỏ hardcode, query active tenants + loop
- Các pg_cron SQL — update để multi-tenant (hoặc tạo 1 orchestrator edge function)

