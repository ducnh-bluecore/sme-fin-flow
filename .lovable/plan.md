

## Vấn đề

RPC `fn_clearance_candidates` trả về lỗi **HTTP 400** với thông báo:

> `structure of query does not match function result type`
> `Returned type numeric does not match expected type integer in column 8`

**Nguyên nhân gốc:** Cột `markdown_risk_score` trong bảng `state_markdown_risk_daily` có kiểu `numeric`, nhưng function khai báo cột output là `INT` (integer). PostgreSQL không tự động chuyển đổi `numeric` sang `integer` trong RETURNS TABLE.

## Giải pháp

Cập nhật function `fn_clearance_candidates` để khai báo đúng kiểu dữ liệu cho cột `markdown_risk_score`:

### Migration SQL

Thay `markdown_risk_score INT` trong `RETURNS TABLE(...)` thành `markdown_risk_score NUMERIC`.

Hoặc thêm `::INT` cast trong câu SELECT cho `r.markdown_risk_score`. Cách cast an toàn hơn vì không thay đổi contract của function.

### Chi tiết kỹ thuật

Tạo 1 migration duy nhất: `CREATE OR REPLACE FUNCTION fn_clearance_candidates(...)` với thay đổi duy nhất ở dòng:
- **Trước:** `markdown_risk_score INT`
- **Sau:** `markdown_risk_score NUMERIC`

Không cần thay đổi code frontend vì `ClearanceCandidate.markdown_risk_score` đã là `number` (TypeScript) -- tương thích cả `INT` lẫn `NUMERIC`.

