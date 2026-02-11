
# Thêm Store Capacity (Sức chứa kho) vào Inventory Allocation Engine

## Vấn đề hiện tại

- Bảng `inv_stores` đã có cột `capacity` (integer) với dữ liệu sẵn (2000-100000 units)
- **Engine hoàn toàn bỏ qua capacity** khi phân bổ hàng -- có thể đẩy hàng vượt sức chứa
- **UI không hiển thị và không cho chỉnh** capacity từng store
- Không có cảnh báo khi store gần đầy hoặc quá tải

## Thay đổi chi tiết

### 1. Hiển thị + chỉnh sửa Capacity trong Store Directory

**File: `src/components/inventory/StoreDirectoryTab.tsx`**

- Thêm metric "Sức chứa" vào StoreCard (hiển thị `total_on_hand / capacity` dạng progress bar)
- Thêm badge cảnh báo khi sử dụng > 85% capacity (vàng) hoặc > 95% (đỏ)
- Thêm nút "Chỉnh sửa" trên mỗi card, mở inline editor cho capacity
- Khi lưu, gọi update trực tiếp vào `inv_stores.capacity`

**File mới: `src/hooks/inventory/useUpdateStoreCapacity.ts`**

- Hook mutation để cập nhật `capacity` trong `inv_stores`
- Invalidate query `inv-stores` và `inv-store-directory-stores` sau khi lưu

### 2. Engine tôn trọng Capacity khi phân bổ

**File: `supabase/functions/inventory-allocation-engine/index.ts`**

- Thêm `capacity` vào `StoreInfo` interface
- Trong V1 (`runV1`): Trước khi allocate, tính `remainingCapacity = store.capacity - currentTotalOnHand`. Nếu `allocQty > remainingCapacity`, giảm `allocQty` xuống `remainingCapacity`
- Trong V2 (`runV2`): Tương tự, cap allocQty bởi remaining capacity
- Thêm `capacity_check` vào `constraint_checks` để ghi lại quyết định
- Nếu capacity = 0 hoặc null, engine bỏ qua check (backward compatible)

### 3. Thêm "Tỷ lệ sử dụng" vào Summary + Cảnh báo

**File: `src/components/inventory/InventoryHeroHeader.tsx`**

- Thêm chỉ số mới: "Stores gần đầy" (>85% capacity) vào hero header
- Đếm số store có `total_on_hand / capacity > 0.85`

### 4. Đề xuất tối ưu chứa hàng

**File mới: `src/components/inventory/CapacityOptimizationCard.tsx`**

- Hiển thị trong tab "Tất cả" hoặc hero section
- Logic:
  - Store A dư capacity + thiếu hàng bán chạy -> Ưu tiên push vào
  - Store B gần đầy + có hàng chậm -> Đề xuất lateral ra ngoài
  - Kho tổng gần đầy -> Ưu tiên push xuống store có chỗ
- Hiển thị dạng card nhỏ gọn: "3 store có thể nhận thêm hàng", "2 store cần giảm tải"

---

## Phan ky thuat

### Database
- **Không cần migration** -- cột `capacity` đã có trong `inv_stores`

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/inventory/StoreDirectoryTab.tsx` | Thêm capacity bar, badge, inline edit |
| `src/hooks/inventory/useUpdateStoreCapacity.ts` | **Mới** - mutation update capacity |
| `supabase/functions/inventory-allocation-engine/index.ts` | Thêm capacity check vào V1 + V2 |
| `src/components/inventory/InventoryHeroHeader.tsx` | Thêm "Stores gần đầy" indicator |
| `src/components/inventory/CapacityOptimizationCard.tsx` | **Mới** - đề xuất tối ưu sức chứa |

### Flow phân bổ mới

```text
Engine V1/V2: Tính allocQty cho store
  |
  v
Check: currentTotalOnHand + allocQty > capacity?
  |
  ├── YES -> allocQty = capacity - currentTotalOnHand (cap lại)
  |          Ghi constraint_checks.capacity_capped = true
  |
  └── NO  -> Giữ nguyên allocQty
  |
  v
Tiếp tục flow hiện tại (size integrity, CW reserve, etc.)
```

### Capacity thresholds

| Tỷ lệ sử dụng | Trạng thái | Màu |
|---|---|---|
| dưới 70% | Thoải mái | Xanh |
| 70-85% | Bình thường | Không highlight |
| 85-95% | Gần đầy | Vàng (warning) |
| trên 95% | Quá tải | Đỏ (danger) |
