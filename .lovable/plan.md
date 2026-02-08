

## Chạy lại Backfill Fulfillments và Payments

### Hiện trạng

| Model | Job | Trạng thái | Chi tiết |
|-------|-----|-----------|----------|
| **payments** | `e2e69007...` | Kẹt (pending) | kiotviet đã xử lý 543K/1.06M, 4 source khác completed |
| **fulfillments** | Không có | Chưa chạy lần nào | - |

### Kế hoạch

#### Bước 1: Xóa job payments cũ bị kẹt

Xóa job `e2e69007-fcea-45a7-a333-a04fc66058f6` và các source progress liên quan để chạy lại từ đầu (job bị kẹt ở trạng thái không hợp lệ - status "pending" nhưng source đang "running").

#### Bước 2: Chạy backfill payments mới

Gọi edge function `backfill-bigquery` với:
- action: `start`
- model_type: `payments`
- date_from: `2025-01-01`

#### Bước 3: Chạy backfill fulfillments

Gọi edge function `backfill-bigquery` với:
- action: `start`
- model_type: `fulfillments`
- date_from: `2025-01-01`

### Ghi chú kỹ thuật

- Cả 2 job sẽ tự động chunk và auto-continue nhờ cơ chế timeout 50s
- Có thể theo dõi tiến độ trực tiếp trên trang `/admin/bigquery-backfill` hiện tại
- Không cần thay đổi code, chỉ cần thao tác database (xóa job cũ) và gọi edge function

