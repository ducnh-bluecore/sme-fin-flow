

# Fix: Update Discounts bị timeout — Tối ưu batch update

## Vấn đề

Edge function `update_discounts` bị **timeout** sau khi fetch 500 orders từ BigQuery. Nguyên nhân:
- Mỗi order cần 2 queries riêng biệt (1 SELECT để lấy `gross_revenue`, 1 UPDATE để ghi `discount_amount` + `net_revenue`)
- 500 orders = 1000 queries tuần tự
- Edge function chỉ có ~60 giây — không đủ thời gian

## Giải pháp

Thay đổi trong file `supabase/functions/backfill-bigquery/index.ts` (khu vực dòng 3090-3157):

### 1. Giảm batch size xuống 100 (thay vì 500)
Mỗi lần gọi edge function chỉ xử lý 100 orders. UI sẽ tự auto-continue cho đến khi hết.

### 2. Dùng RPC / single query thay vì 2 queries per row
Tạo một database function `update_order_discounts_batch` nhận mảng `{order_key, discount_amount}` và thực hiện UPDATE trong 1 query duy nhất:

```sql
CREATE OR REPLACE FUNCTION update_order_discounts_batch(
  p_tenant_id UUID,
  p_updates JSONB
) RETURNS INT AS $$
DECLARE
  updated_count INT := 0;
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE cdp_orders 
    SET 
      discount_amount = (item->>'discount')::NUMERIC,
      net_revenue = COALESCE(gross_revenue, 0) - (item->>'discount')::NUMERIC
    WHERE tenant_id = p_tenant_id
      AND channel = 'kiotviet'
      AND order_key = item->>'order_key';
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
```

### 3. Edge function gọi RPC 1 lần duy nhất thay vì loop

Thay thế toàn bộ vòng lặp `for (const row of batch)` bằng:

```typescript
// Build batch payload
const updates = rows
  .filter(r => parseFloat(r.discount_amount || '0') > 0)
  .map(r => ({
    order_key: String(r.order_id),
    discount: parseFloat(r.discount_amount),
  }));

// Single RPC call — 1 query thay vì 1000
const { data: count, error } = await supabase
  .rpc('update_order_discounts_batch', {
    p_tenant_id: params.tenant_id,
    p_updates: JSON.stringify(updates),
  });

updatedCount = count || 0;
```

### 4. Giữ nguyên auto-continue logic trong UI
Không cần thay đổi frontend — chỉ cần edge function trả về `completed: false` khi chưa hết data.

## Kết quả mong đợi

- Trước: 1000 queries/batch, timeout sau ~30 giây
- Sau: 1 RPC call/batch, hoàn thành trong ~2-3 giây
- Tổng thời gian cập nhật ~1M records: ~30 phút (thay vì không bao giờ xong)

## Thay đổi cần thực hiện

1. **Migration SQL**: Tạo function `update_order_discounts_batch`
2. **Edge function**: Đổi logic update trong `supabase/functions/backfill-bigquery/index.ts` (dòng 3090-3157) — thay vòng lặp SELECT+UPDATE bằng 1 RPC call
3. **Deploy**: Re-deploy edge function
