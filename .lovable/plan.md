

## Vấn đề

Bảng "Mẫu Lẻ Size" hiện tại hiển thị flat list tất cả sản phẩm broken. Khi có vài trăm mẫu, bảng sẽ:
- Quá dài, không thể scan nhanh
- Không phân biệt được mức độ nghiêm trọng
- Mất focus vào những SP cần xử lý trước

## Giải pháp: Tiered Breakdown với Filter + Search

Thay vì flat list, chia thành **3 tầng ưu tiên** kết hợp **filter/search** và **collapse mặc định**.

### 1. Summary Bar (Thay thế header đơn giản)

Hiển thị 3 nhóm con ngay trên đầu bảng dưới dạng clickable chips:
- **Khẩn cấp** (Sẽ giảm giá / markdown_risk >= 80): X mẫu, Y triệu thiệt hại -- chip đỏ
- **Cần xử lý** (Trung bình + Khó): X mẫu, Y triệu -- chip cam  
- **Theo dõi** (Dễ fix): X mẫu -- chip vàng

Click vào chip = filter bảng theo nhóm đó. Click lại = bỏ filter.

### 2. Search + Sort Controls

Thêm thanh search nhỏ phía trên bảng:
- Input search theo tên sản phẩm
- Sort dropdown: Thiệt hại cao nhat (default), Suc khoe thap nhat, MD ETA gan nhat

### 3. Bảng với Pagination thay vì "Load More"

- Hiển thị **20 dòng/trang** (thay vì load tất cả rồi "tải thêm")
- Pagination controls ở dưới
- Top 3 vẫn highlight nền đỏ nhạt

### 4. Collapse mặc định khi > 50 mẫu

- Khi tổng > 50 mẫu, bảng mặc định chỉ hiển thị **Top 10** + summary text "Còn X mẫu khác"
- Button "Xem tất cả" để expand ra full bảng với pagination

## Chi tiết kỹ thuật

### File thay đổi

**`src/components/command/SizeControlTower/PrioritizedBreakdown.tsx`**:
- Thêm state: `activeFilter` (null | 'urgent' | 'action' | 'monitor'), `searchTerm`, `currentPage`, `isExpanded`
- Phân loại sorted items theo fixability score thành 3 nhóm
- Render Summary Bar chips với count + tổng thiệt hại
- Thêm search input (debounced) 
- Filter + paginate logic trước khi render TableBody
- Thay "Tải thêm" bằng Pagination component
- Khi totalCount > 50 và chưa expand: chỉ show top 10 + "Xem tất cả" button

### Logic phân nhóm

```text
urgent:  markdown_risk_score >= 80 (Sẽ giảm giá)
action:  fixability = 'Khó' hoặc 'Trung bình'
monitor: fixability = 'Dễ'
```

### Không thay đổi
- Data fetching logic (vẫn dùng server-side pagination qua RPC)
- Size Map column
- Evidence drawer
- Các component khác trong Control Tower
