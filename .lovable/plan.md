

## Dọn dẹp Inventory Backfill bị kẹt và chạy lại

### Vấn đề hiện tại

- **207 job trùng lặp** cho model `inventory` (1 running, 206 pending)
- Chỉ **20,796 / 1,032,601** records (~2%) đã sync vào `inventory_movements`
- Cơ chế auto-continue đang tạo job mới mỗi lần thay vì tiếp tục job cũ, gây ra vòng lặp vô hạn

### Phương án thực hiện

#### Bước 1: Xóa toàn bộ job inventory cũ

Chạy migration SQL để dọn sạch:
- Xóa tất cả `backfill_source_progress` liên quan đến inventory jobs
- Xóa tất cả 207 records trong `bigquery_backfill_jobs` cho model `inventory`
- Giữ nguyên 20,796 records đã sync trong `inventory_movements` (không xóa data)

#### Bước 2: Fix lỗi auto-continue tạo job trùng

Kiểm tra và sửa logic trong `backfill-bigquery/index.ts`:
- Khi auto-continue, phải tìm và tái sử dụng job hiện có (cùng tenant + model_type + status running/pending)
- Không tạo job mới nếu đã có job đang chạy cho cùng model_type
- Đảm bảo `backfill_source_progress` dùng `last_offset` đã lưu thay vì reset

#### Bước 3: Chạy lại backfill inventory

Trigger lại 1 job duy nhất cho `inventory` từ Admin UI. Job sẽ:
- Upsert data (conflict on `tenant_id, movement_date, branch_id, product_code`) nên 20K records cũ không bị duplicate
- Auto-continue qua cơ chế chunked backfill đã sửa
- Sync toàn bộ ~1M records còn lại

### Chi tiết kỹ thuật

**SQL cleanup (Bước 1):**
```text
DELETE FROM backfill_source_progress 
WHERE job_id IN (
  SELECT id FROM bigquery_backfill_jobs 
  WHERE model_type = 'inventory' 
  AND tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);

DELETE FROM bigquery_backfill_jobs 
WHERE model_type = 'inventory' 
AND tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

**Fix auto-continue (Bước 2):**
Trong hàm xử lý action `start`, thêm logic:
- Trước khi tạo job mới, kiểm tra xem đã có job running/pending cho cùng `tenant_id + model_type` chưa
- Nếu có, dùng lại job_id đó và chuyển sang logic `continue` thay vì insert job mới
- Điều này ngăn chặn việc tạo 207 job trùng lặp

**Ước tính thời gian sync:**
- 1,032,601 records / batch 500 = ~2,065 batches
- Mỗi chunk ~50 giây, xử lý ~29K records = ~36 auto-continue cycles
- Tổng thời gian ước tính: ~30 phút

