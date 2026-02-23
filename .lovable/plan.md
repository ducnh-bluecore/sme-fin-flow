
# Fix tên sản phẩm hiện UUID trong bảng Đề Xuất Điều Chuyển (Size Control Tower)

## Nguyên nhân

Bảng `state_size_transfer_daily` chỉ lưu `product_id` (UUID trỏ tới `inv_family_codes.id`), không có cột tên sản phẩm. Component `TransferSuggestionsCard` dùng `fcNames?.get(t.product_id)` để tra tên, nhưng khi `fcNames` map chưa load xong hoặc undefined, nó fallback sang hiện UUID thô.

## Giải pháp

### 1. Sửa `TransferSuggestionsCard.tsx`

- Thay vì chỉ dùng `fcNames?.get(t.product_id) || t.product_id`, thêm fallback rõ ràng hơn: hiện "Đang tải..." khi `fcNames` chưa sẵn sàng, hoặc hiện UUID rút gọn (8 ký tự đầu) thay vì full UUID.

### 2. Sửa `AssortmentPage.tsx`

- Truyền thêm loading state của `fcNames` vào `TransferSuggestionsCard` để component biết khi nào dữ liệu đã sẵn sàng.
- Hoặc đơn giản hơn: chờ `fcNames` load xong mới render `TransferSuggestionsCard`, hiện skeleton/loading thay thế.

### 3. (Cải tiến thêm) Join tên FC vào view/query

Tạo một DB view hoặc sửa query `state_size_transfer_daily` để JOIN với `inv_family_codes` lấy luôn `fc_name`, không phải phụ thuộc vào client-side lookup. Cách này triệt để nhất nhưng cần thêm migration.

## Ưu tiên

Giải pháp 2 (chờ fcNames load) là nhanh nhất và đủ hiệu quả. Giải pháp 3 (join DB) là lý tưởng nhất nhưng cần thêm bước.
