
# Kết Nối Hành Động Sau Mô Phỏng Tăng Trưởng

## Vấn đề hiện tại
Sau khi chạy mô phỏng, người dùng chỉ thấy kết quả trên màn hình -- không có bước tiếp theo nào. Kết quả "chết" tại đó. Điều này vi phạm nguyên tắc FDP: **"Nếu không khiến quyết định rõ ràng hơn -- FDP đã thất bại."**

## Giải pháp: Action Bar sau kết quả mô phỏng

Thêm một thanh hành động (Action Bar) xuất hiện sau khi có kết quả, cho phép người dùng thực hiện 3 hành động cụ thể:

### 1. "Tạo Đề Xuất Sản Xuất" (Push to Production)
- Chuyển các FC cần sản xuất (từ `simulation.details` có `productionUnits > 0`) thành bản ghi trong bảng `dec_production_candidates`
- Mỗi FC tạo 1 dòng với: style_id, recommended_qty, cash_required, size_breakdown, urgency_score, status = 'PROPOSED'
- Sau khi tạo xong, hiện nút điều hướng sang trang `/command/production` để duyệt

### 2. "Xuất Báo Cáo" (Export)
- Xuất kết quả mô phỏng ra file Excel (.xlsx) gồm 3 sheet:
  - Tổng quan (hero strip metrics)
  - Chi tiết FC (production table)
  - Bản đồ mở rộng (expand/avoid categories)
- Dùng thư viện `xlsx` đã cài sẵn

### 3. "Lưu Kịch Bản" (Save Scenario)
- Lưu params + kết quả tóm tắt vào một bảng mới `growth_scenarios` để so sánh nhiều kịch bản
- Cho phép đặt tên kịch bản (vd: "Tăng 30% - Q3 2025")

---

## Chi tiết kỹ thuật

### File mới:
- `src/components/command/growth/GrowthActionBar.tsx` -- Thanh hành động với 3 nút

### File sửa:
- `src/components/command/GrowthSimulator.tsx` -- Import và render GrowthActionBar sau tất cả kết quả

### Database:
- Tạo bảng `growth_scenarios` (id, tenant_id, name, params jsonb, summary jsonb, created_at) với RLS policy theo tenant

### Logic Push to Production:
```text
Voi moi SimResult co productionUnits > 0:
  -> Insert vao dec_production_candidates:
     style_id = fc_code
     recommended_qty = productionUnits
     cash_required = cashRequired
     margin_projection = tinh tu margin% * revenue du kien
     urgency_score = tinh tu velocity segment + hero status
     size_breakdown = tu sku data (nhom theo size suffix)
     status = 'PROPOSED'
     as_of_date = today
```

### Logic Export Excel:
```text
Sheet 1 "Tong Quan": hero strip metrics (5 dong)
Sheet 2 "Chi Tiet FC": production table (tat ca details)
Sheet 3 "Chien Luoc": expand/avoid categories + size shifts
```

### UI Action Bar:
```text
+---------------------------------------------------------------+
| HANH DONG TIEP THEO                                           |
|                                                                |
| [Tao De Xuat San Xuat (X FC)]  [Xuat Excel]  [Luu Kich Ban]  |
|                                                                |
| Sau khi tao: "Da tao X de xuat san xuat. Xem tai day ->"      |
+---------------------------------------------------------------+
```

### Thu tu implement:
1. Tao migration cho bang `growth_scenarios`
2. Tao `GrowthActionBar.tsx` voi 3 nut hanh dong
3. Implement logic push to `dec_production_candidates`
4. Implement logic export Excel
5. Implement logic luu kich ban
6. Noi vao `GrowthSimulator.tsx`
