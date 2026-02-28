

## Chạy lại Allocation Engine (đã tích hợp Size Split)

Engine đã được cập nhật để tự động tách size sau khi phân bổ. Chỉ cần chạy lại 1 lần duy nhất.

### Thực hiện

1. Gọi Edge Function `inventory-allocation-engine` với action `allocate`, run_type `both`
2. Kiểm tra kết quả trả về — xác nhận `size_split.updated > 0`
3. Gọi tiếp action `rebalance` để test luôn phần rebalance
4. Xác nhận cả 2 engine đều trả về size_split thành công

### Kết quả mong đợi

- Engine chạy xong trong 1 lần duy nhất
- `size_breakdown` được điền tự động cho tất cả recommendations/suggestions
- Không cần bấm "Tách theo Size" riêng nữa

