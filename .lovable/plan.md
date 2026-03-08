

## Phân tích: "Lấy từ kho nào?"

### Thực trạng

Bảng `inv_allocation_recommendations` **không có cột source** (không có `from_location`, `source_store_id`). Đây là **thiết kế có chủ đích**: Allocation = luôn lấy từ **Kho Trung Tâm (CW)** → phân bổ xuống cửa hàng. Khác với Rebalance (có `from_location` / `to_location` vì chuyển ngang giữa stores).

Trong screenshot, dòng cuối "CN Trung Tâm" với tồn 462 chính là CW — nguồn hàng duy nhất cho allocation.

### Vấn đề UX

UI hiện tại **không nói rõ** nguồn hàng là CW. Planner nhìn bảng so sánh thấy nhiều store nhưng không biết hàng sẽ lấy từ đâu.

### Giải pháp

Thêm **thông tin nguồn hàng (CW)** vào AddProductSheet:

1. **Highlight CW trong bảng so sánh**: Dòng "CN Trung Tâm" thêm badge **"Nguồn"** (tương tự badge "Đích" đã có), màu khác biệt (ví dụ xanh lá)
2. **Hiển thị tồn CW khả dụng** trong card thông tin FC: thêm dòng "Tồn CW: 462" để planner biết có bao nhiêu hàng có thể phân bổ
3. **Validation**: Cảnh báo nếu qty nhập > tồn CW khả dụng

### Kỹ thuật

- Trong `velocityData`, CW thường là store có `store_name` chứa "Trung Tâm" hoặc có `location_type = 'central_warehouse'` trong `inv_stores`
- Cần query thêm `inv_stores.location_type` để xác định chính xác CW, hoặc dùng tồn CW từ `useSourceOnHand` map
- Sửa file: `src/components/inventory/AddProductSheet.tsx` — thêm badge "Nguồn" cho CW row, hiển thị tồn CW trong FC info card, validate qty

