

## Plan: Tối ưu Product Insight — 3 nâng cấp

### 1. Tự động chạy Batch Sync hàng ngày (Cron Job)

Thêm `sync-lifecycle-batches` vào cron schedule, chạy sau khi `daily-bigquery-sync` hoàn tất (ví dụ 4:00 AM).

- Thêm config `[functions.sync-lifecycle-batches] verify_jwt = false` vào `config.toml`
- Tạo migration dùng `cron.schedule` gọi Edge Function mỗi ngày
- Giữ nút "Sync Batches" trên UI để chạy thủ công khi cần

### 2. Tối ưu việc load sản phẩm

Hiện tại RPC `fn_lifecycle_progress` trả về tất cả sản phẩm cùng lúc → chậm. Sẽ thêm **server-side pagination + search**:

- Thêm parameters vào RPC: `p_status TEXT DEFAULT NULL`, `p_search TEXT DEFAULT NULL`, `p_limit INT DEFAULT 50`, `p_offset INT DEFAULT 0`
- Frontend: phân trang 50 SP/trang, có ô tìm kiếm theo tên/mã SP, filter theo status
- Thêm `total_count` để hiển thị "trang X / Y"

### 3. Product Detail Dialog — Hiển thị giai đoạn lifecycle

Khi click vào 1 sản phẩm trong bảng, mở **Dialog** hiển thị chi tiết:

**Header**: Tên SP, mã, category, batch hiện tại

**Lifecycle Timeline** (visual):
```text
 ●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●
 0d      30d     60d     90d    180d
         ↑ Bạn đang ở đây (45d)
```

**Bảng milestone progress**:
| Giai đoạn | Target | Thực tế | Gap | Trạng thái |
|-----------|--------|---------|-----|-----------|
| 0–30d | — | 22% | — | ✅ |
| 0–60d | 50% | 38% | -12% | ⚠️ Behind |
| 0–90d | 70% | — | — | 🔜 Chưa tới |
| 0–180d | 100% | — | — | 🔜 |

**Metrics panel**: Velocity hiện tại, velocity cần thiết, cash at risk, tồn kho, đã bán

**Batch history**: Nếu có restock → hiển thị danh sách tất cả batches (số lượng, ngày, nguồn)

#### Technical approach

- Tạo RPC mới `fn_lifecycle_product_detail(p_tenant_id, p_fc_id)` trả về:
  - Thông tin SP cơ bản
  - Tất cả batches (không chỉ active)
  - Sell-through % tại từng milestone (dựa trên `inv_lifecycle_templates.milestones`)
  - Current stage (đang ở giai đoạn nào: 0-30d, 30-60d, 60-90d, etc.)
- Tạo component `ProductDetailDialog` trong trang ProductInsight
- Click vào TableRow → mở dialog với fc_id

### Tóm tắt thay đổi

| # | Việc | Files |
|---|------|-------|
| 1 | Cron job cho sync-lifecycle-batches | Migration (cron.schedule), config.toml |
| 2 | Pagination + search cho RPC | Migration (alter fn_lifecycle_progress), ProductInsightPage.tsx |
| 3 | RPC fn_lifecycle_product_detail | Migration mới |
| 4 | ProductDetailDialog component | ProductInsightPage.tsx (hoặc file riêng) |

