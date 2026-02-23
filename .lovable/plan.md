

# Tối ưu tốc độ load dữ liệu size tại kho đích

## Vấn đề

Khi mở rộng (expand) 1 dòng trong bảng Đề Xuất Điều Chuyển, phần "Tồn kho size tại kho đích" hiện "Đang tải dữ liệu size..." lâu vì:

1. Hook `useDestinationSizeInventory` query bảng `inv_state_positions` (34K rows) mà **không filter theo `snapshot_date`** -- có thể trả về dữ liệu cũ lẫn mới.
2. Supabase giới hạn mặc định 1000 rows/query -- kết quả có thể bị cắt.
3. Client phải extract size từ SKU suffix rồi aggregate -- tốn thời gian xử lý.

## Giải pháp: Tạo RPC server-side

Thay vì query raw rows rồi aggregate ở client, tạo 1 database function chuyên trả về dữ liệu size đã aggregate sẵn.

### 1. Tạo database function `fn_dest_size_inventory`

```sql
CREATE OR REPLACE FUNCTION fn_dest_size_inventory(
  p_tenant_id UUID,
  p_store_id UUID,
  p_fc_id UUID
)
RETURNS TABLE(size_code TEXT, on_hand BIGINT) AS $$
  SELECT 
    upper(regexp_replace(sku, '.*[0-9]', '')) as size_code,
    SUM(on_hand)::BIGINT as on_hand
  FROM inv_state_positions
  WHERE tenant_id = p_tenant_id
    AND store_id = p_store_id
    AND fc_id = p_fc_id
    AND snapshot_date = (
      SELECT MAX(snapshot_date) FROM inv_state_positions 
      WHERE tenant_id = p_tenant_id
    )
  GROUP BY size_code
  HAVING SUM(on_hand) > 0 OR size_code IS NOT NULL
  ORDER BY array_position(
    ARRAY['XXS','XS','S','M','L','XL','XXL','2XL','3XL','FS'], 
    upper(regexp_replace(sku, '.*[0-9]', ''))
  );
$$ LANGUAGE sql STABLE;
```

### 2. Sửa `useDestinationSizeInventory.ts`

- Thay query raw `inv_state_positions` bang `callRpc('fn_dest_size_inventory', { p_tenant_id, p_store_id, p_fc_id })`.
- Bỏ logic `extractSizeFromSku` và client-side aggregation.
- Kết quả trả về đã sẵn format `{ size_code, on_hand }[]`, chỉ cần map vào `DestSizeEntry`.

### 3. Kết quả mong đợi

- Query nhanh hơn vì aggregate ở DB (dùng index `idx_inv_state_positions_lookup`).
- Không bị giới hạn 1000 rows (RPC trả về kết quả đã group).
- Filter đúng `snapshot_date` mới nhất, không lẫn dữ liệu cũ.

