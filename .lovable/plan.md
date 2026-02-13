# Đánh Giá & Đề Xuất Nâng Cấp Bluecore Command

## Đánh giá hiện trạng

Module đã hoàn thiện tốt với 8 trang chức năng, hệ thống Decision Intelligence hoàn chỉnh (từ đề xuất → duyệt → đánh giá kết quả), và Size Intelligence Engine mạnh. Tuy nhiên còn nhiều điểm có thể cải thiện:

---

## Nhóm 1: Bugs & Technical Debt (Ưu tiên cao)

### 1.1 Overview Page bị giới hạn 1,000 rows

- `CommandOverviewPage.tsx` line 28: `.limit(1000)` khi query `inv_state_positions` — số liệu "Tồn Kho Mạng Lưới" và "Vốn Bị Khóa" sai nếu có >1,000 SKU
- **Fix**: Tạo DB view tổng hợp (giống `v_size_intelligence_summary`) hoặc dùng RPC function

### 1.2 Chưa localize hết tiếng Việt

- `SizeHealthActionGroups.tsx`: Vẫn còn tiếng Anh: "Loading action groups...", "No size health data", "styles", "core missing", "MD risk", "Load more", "Lost Rev", "Cash Lock", "Margin Leak", "Health", "ETA"
- `TransferSuggestionsCard.tsx`: Header còn "Smart Transfer Suggestions", "opportunities", "transfers", "units", "styles", "Style", "Size", "From", "Qty", "Net Benefit", "Status"

### 1.3 Trùng lặp hàm `formatVND`

- Định nghĩa lại `formatVND` ở 4 file khác nhau (Overview, Decisions, Outcomes, Production). Nên dùng `formatVNDCompact` từ `@/lib/formatters` đã có sẵn.

---

## Nhóm 2: UX Improvements (Ưu tiên trung bình)

### 2.1 Overview Page quá đơn giản

Hiện tại chỉ có 4 KPI cards + 1 decision feed. Đề xuất thêm:

- **Quick Action Bar**: Nút "Chạy Engine" nhanh cho từng module (Size Intelligence, Allocation, Network Gap)
- **Health Pulse**: 1 dòng tổng kết tình trạng — XANH/VÀNG/ĐỎ dựa trên composite score
- **Last Run Timestamps**: Hiển thị "Size Engine chạy lần cuối: 2 giờ trước" để biết dữ liệu có cũ không

### 2.2 Decision Queue thiếu filter & search

- Không có ô tìm kiếm
- Không filter theo `package_type` hoặc `risk_level`
- Package lines hiện UUID thay vì tên store/product

### 2.3 Outcomes Page thiếu visualization

- Bảng "Dự Đoán vs Thực Tế" chỉ là table text
- Nên có bar chart so sánh predicted vs actual revenue cho mỗi package
- Accuracy trend line theo thời gian

### 2.4 Production Page thiếu context

- Cột "Mẫu SP" hiện `style_id` (UUID/code) thay vì tên sản phẩm readable
- Thiếu liên kết ngược: từ production candidate → xem evidence pack của sản phẩm đó

---

## Nhóm 3: Feature Gaps (Ưu tiên theo nhu cầu)

### 3.1 Thiếu Notification/Alert System

- Theo manifesto Control Tower: "mỗi alert phải có owner, trạng thái, outcome"
- Hiện tại không có cơ chế push alert khi engine phát hiện vấn đề mới
- Đề xuất: Alert banner trên Overview khi có broken size mới / cash lock tăng đột biến

### 3.2 Thiếu Date Range Filter toàn cục

- Không thể xem dữ liệu theo khoảng thời gian
- Outcomes page cần filter theo period (7d / 30d / 90d)
- Network Gap cần so sánh trend

### 3.3 Thiếu Export/Report cho Management

- Chỉ có export Excel cho transfer suggestions
- Đề xuất: "Báo Cáo Tổng Hợp" PDF/Excel cho CEO — gồm health score, top risks, decisions made, outcomes

### 3.4 Mobile UX chưa tối ưu

- Bảng dữ liệu nhiều cột sẽ khó đọc trên mobile
- Decision Queue actions (Duyệt/Từ Chối) quá nhỏ trên mobile

---

## Đề xuất thứ tự triển khai


| #   | Hạng mục                                                                   | Effort     | Impact     |
| --- | -------------------------------------------------------------------------- | ---------- | ---------- |
| 1   | Localize hết tiếng Việt (SizeHealthActionGroups + TransferSuggestionsCard) | Thấp       | Cao        |
| 2   | Fix Overview 1,000-row limit                                               | Thấp       | Cao        |
| 3   | Gộp formatVND trùng lặp                                                    | Rất thấp   | Trung bình |
| 4   | Overview Health Pulse + Last Run                                           | Trung bình | Cao        |
| 5   | Decision Queue thêm search + filter + human-readable names                 | Trung bình | Cao        |
| 6   | Production Page resolve names                                              | Thấp       | Trung bình |
| 7   | Outcomes visualization (charts)                                            | Trung bình | Trung bình |
| 8   | Date range filter toàn cục                                                 | Cao        | Trung bình |
| 9   | Alert system                                                               | Cao        | Cao        |
| 10  | Export báo cáo tổng hợp                                                    | Cao        | Trung bình |
