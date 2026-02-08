
# Sửa Function `compute_central_metrics_snapshot` -- Không thay đổi kết cấu Layer

## Nguyên tắc
- KHÔNG thêm/xóa/đổi tên bảng hay cột nào
- KHÔNG thay đổi cấu trúc data layer
- CHỈ sửa logic SQL trong function cho khớp với schema thực tế

## 4 lỗi cần sửa trong function

### Lỗi 1: `SUM(gross_profit)` -- cột không tồn tại
- **Cột thực tế**: `cdp_orders` có `gross_margin`, KHÔNG có `gross_profit`
- **Sửa**: Đổi dòng 90 thành `COALESCE(SUM(gross_margin), 0)`
- Nếu `gross_margin = 0` (do cogs chưa sync), fallback: `SUM(net_revenue - COALESCE(cogs, 0))`

### Lỗi 2: `is_first_order = true/false` -- cột không tồn tại
- **Sửa phần CAC (dòng 252-265)**: Tìm khách mới bằng subquery:
  ```text
  Khách có MIN(order_at) nằm trong kỳ = khách mới
  ```
- **Sửa phần Repeat Rate (dòng 280-292)**: Tìm khách quay lại bằng:
  ```text
  Khách có COUNT(orders) > 1 trong kỳ = khách quay lại
  ```

### Lỗi 3: `cdp_customer_equity` -- bảng không tồn tại
- **Dòng 268-271**: Query LTV từ bảng này sẽ lỗi
- **Sửa**: Tính LTV inline = `AVG(net_revenue) * AVG(số đơn/khách)` từ `cdp_orders`

### Lỗi 4: Hardcoded 90 ngày, bỏ qua tham số
- **Dòng 82-83**: `v_period_end := CURRENT_DATE; v_period_start := CURRENT_DATE - 90 days`
- **Sửa**: `v_period_start := p_start_date; v_period_end := p_end_date`
- Thêm filter `created_at <= v_period_end` cho marketing query (dòng 129-130)

## Thay đổi frontend

### `src/hooks/useFinanceTruthSnapshot.ts`
- Thêm flags vào `DataQualityFlags`: `hasCashData`, `hasARData`, `hasAPData`, `hasInventoryData`
- Logic: dựa trên giá trị snapshot, nếu tất cả = 0 thì đánh dấu "chưa có dữ liệu"

### `src/pages/CFODashboard.tsx`
- Metric thiếu nguồn dữ liệu (Cash, AR, AP, Inventory): hiển thị "Chua co du lieu" thay vì "0"
- Metric CÓ dữ liệu (Revenue, Orders, Marketing): giữ nguyên

## Tổng hợp

| Thay đổi | Loại | Chi tiết |
|---|---|---|
| `compute_central_metrics_snapshot` | Migration SQL | Sửa 4 lỗi logic, KHÔNG đổi schema |
| `useFinanceTruthSnapshot.ts` | Frontend | Thêm data quality flags |
| `CFODashboard.tsx` | Frontend | Hiển thị trạng thái "Chưa có dữ liệu" |
