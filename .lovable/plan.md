

## Đánh giá phương án Phase 2: Thêm sản phẩm thủ công qua Collection Browser

### Điểm mạnh

1. **Zero migration** — Dùng đúng bảng `inv_allocation_recommendations` có sẵn, không phình DB
2. **Tận dụng data sẵn** — Tất cả hooks cần thiết đã tồn tại: `useCollections`, `useFamilyCodes`, `useStoreVelocity`, `useSourceOnHand`, `useLatestAllocationRun`
3. **Phase 4 tự động áp dụng** — Record manual khi approve sẽ tự trừ CW stock qua virtual deduction (vì cùng bảng)
4. **Approve/reject flow giống hệt** — Không cần logic riêng cho manual vs engine

### Rủi ro cần xử lý

**1. `run_id` là required (NOT NULL) trong schema**
- INSERT manual bắt buộc phải có `run_id` — plan nói dùng `latestRunId` nhưng nếu chưa chạy engine lần nào thì `latestRunId = null` → INSERT fail
- **Giải pháp**: Kiểm tra `latestRunId` trước khi cho mở Sheet. Nếu null → hiển thị thông báo "Chạy engine ít nhất 1 lần trước"

**2. UNIQUE constraint `(run_id, fc_id, store_id)`**
- Nếu engine đã suggest FC X → Store Y, user lại thêm manual cùng FC X → Store Y → violate UNIQUE
- **Giải pháp**: Dùng `ON CONFLICT (run_id, fc_id, store_id) DO UPDATE SET recommended_qty = recommended_qty + excluded.recommended_qty` hoặc filter ra FC đã có trong danh sách hiện tại

**3. `useStoreVelocity` gọi RPC mỗi khi click FC**
- Nếu user browse nhiều FC → nhiều RPC calls. Nhưng hook có `staleTime: 60s` nên cache OK
- Chấp nhận được

**4. Thiếu `store_name` và `fc_name` khi INSERT**
- Cần map từ `familyCodes` và `stores` arrays — plan đã đề cập nhưng cần đảm bảo truyền đúng

**5. Sheet quá đơn giản cho use case này**
- Collection list có thể dài (10+ BST × 10-50 FC mỗi BST). Sheet `sm:max-w-lg` có thể chật
- **Gợi ý**: Dùng `sm:max-w-2xl` hoặc full-width trên mobile. Thêm search bar để filter nhanh

### Phương án đã OK để triển khai

Với 2 điều chỉnh nhỏ:

1. **Guard `latestRunId`** — disable nút "Thêm sản phẩm" nếu chưa có run nào
2. **Handle UNIQUE conflict** — filter FC đã có trong suggestions cho cùng store, hoặc dùng UPSERT cộng dồn qty

Ngoài ra phương án solid: không tạo bảng mới, tận dụng flow có sẵn, self-healing deduction hoạt động tự nhiên.

### Sẵn sàng triển khai

Nếu đồng ý, tôi sẽ implement:
- `src/hooks/inventory/useAddManualAllocation.ts` — mutation với UPSERT
- `src/components/inventory/AddProductSheet.tsx` — Collection browser + velocity detail + add form
- Sửa `DailyTransferOrder.tsx` — thêm nút + badge "Thủ công"
- Sửa `InventoryAllocationPage.tsx` — truyền props

