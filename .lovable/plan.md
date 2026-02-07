

## Lấy COGS từ Master Product thay vì Order Line Items

### Ly do thay doi

Theo nguyen tac FDP "SINGLE SOURCE OF TRUTH":
- `products.cost_price` la SSOT cho gia von -- da co 14,056/16,697 san pham (84%) co gia von
- `gia_goc_sp` trong order line items co the thay doi theo thoi gian, khong nhat quan, hoac bi null
- Gia von la thuoc tinh cua SAN PHAM, khong phai cua DON HANG

### Thay doi

#### 1. Revert mapping `gia_goc_sp` trong backfill-bigquery

Xoa `cost_price: 'gia_goc_sp'` khoi KiotViet ORDER_ITEM_SOURCES mapping. Order items chi luu thong tin ban hang (qty, unit_price, discount, line_revenue).

#### 2. Tinh COGS khi sync order items bang cach JOIN voi products

Sau khi insert order items, chay mot buoc UPDATE de tinh `unit_cogs`, `line_cogs`, `line_margin` bang cach JOIN voi bang `products` qua truong `sku`:

```text
UPDATE cdp_order_items oi
SET 
  unit_cogs  = p.cost_price,
  line_cogs  = p.cost_price * oi.qty,
  line_margin = oi.line_revenue - (p.cost_price * oi.qty)
FROM products p
WHERE p.tenant_id = oi.tenant_id
  AND p.sku = oi.sku
  AND p.cost_price > 0;
```

#### 3. Ap dung cho TAT CA channels

Loi the lon: khong chi KiotViet ma tat ca channels (Shopee, Lazada, TikTok) deu duoc tinh COGS tu cung mot nguon `products.cost_price`. Truoc day chi KiotViet co `gia_goc_sp`, cac channel khac khong co thong tin gia von. Voi cach nay, moi order item co SKU match voi products deu duoc tinh margin.

### Logic flow

```text
Backfill Order Items (all channels)
  |
  v
INSERT vao cdp_order_items (chi revenue data)
  |
  v
UPDATE JOIN products ON sku = sku
  -> unit_cogs = products.cost_price
  -> line_cogs = cost_price * qty  
  -> line_margin = line_revenue - line_cogs
```

### Ket qua mong doi

- 84% order items co SKU match se duoc tinh COGS tu master product
- Thong nhat gia von across ALL channels (Shopee, Lazada, TikTok, KiotViet)
- FDP co du lieu Gross Margin chinh xac hon

### Files can sua

1. `supabase/functions/backfill-bigquery/index.ts` -- Xoa `cost_price` mapping, them buoc UPDATE JOIN sau khi insert order items

