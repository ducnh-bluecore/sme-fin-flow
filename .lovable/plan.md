

# Hop nhat san pham cung SKU cross-channel

## Thuc trang du lieu

| Channel | So SP | Co SKU that | Co the match |
|---------|-------|-------------|--------------|
| KiotViet | 28,526 | Co (ma noi bo) | Source of truth |
| Shopee | 3,436 | KHONG (item_sku = NULL) | Chi match bang ten |
| Tiki | 3,857 | KHONG (dung ID so cua Tiki) | Chi match bang ten |

Van de chinh: Shopee va Tiki KHONG LUU seller SKU trong BigQuery. Ca bang `shopee_Products` lan `shopee_OrderItems` deu co `item_sku = NULL` va `model_sku = NULL`.

## Giai phap: Product Mapping Table + Name-based Auto-match

### Buoc 1: Tao bang `product_channel_mapping`

Bang nay lien ket san pham tu cac san khac nhau ve 1 "master product" (KiotViet la goc):

```text
product_channel_mapping
  - id (uuid, PK)
  - tenant_id (uuid)
  - master_sku (text) -- SKU KiotViet (source of truth)
  - channel (text) -- shopee / tiki
  - channel_product_id (text) -- item_id cua Shopee / product_id cua Tiki
  - channel_product_name (text) -- ten tren san
  - match_method (text) -- 'auto_name' / 'manual'
  - confidence (float) -- do tin cay (0-1)
  - created_at, updated_at
  - UNIQUE(tenant_id, channel, channel_product_id)
```

### Buoc 2: Auto-match bang ten san pham

Logic tu dong:
1. Lay tat ca san pham KiotViet co ten
2. Voi moi SP Shopee/Tiki, tim SP KiotViet co ten giong nhat (sau khi loai bo prefix "OLV - ", "OLV-", chuyen lowercase)
3. Neu ten match chinh xac (sau normalize) => confidence = 1.0
4. Neu ten chua 1 phan (substring) => confidence = 0.7
5. Luu ket qua vao `product_channel_mapping`

Vi du matching:
- Shopee: "OLV - Ao Gigi Black Top" => KiotViet: "Gigi Black Top" (confidence: 1.0)
- Shopee: "OLV - Dam maxi hoa co yem Odette Fleur Dress" => KiotViet: "Odette Fleur Dress" (confidence: 0.8)

### Buoc 3: Cross-fill cost_price

Sau khi co mapping:
```sql
UPDATE products p_target
SET cost_price = p_kv.cost_price
FROM product_channel_mapping m
JOIN products p_kv ON p_kv.sku = m.master_sku 
  AND p_kv.channel = 'kiotviet' AND p_kv.tenant_id = m.tenant_id
WHERE p_target.channel = m.channel
  AND p_target.sku = m.channel_product_id  -- or matching logic
  AND p_target.tenant_id = m.tenant_id
  AND p_target.cost_price = 0
  AND p_kv.cost_price > 0;
```

### Buoc 4: Cap nhat view `v_top_products_30d`

View se JOIN voi `product_channel_mapping` de:
- Gop doanh thu cua cung 1 san pham ban tren nhieu kenh
- Hien thi ten KiotViet (day du) thay vi ten san

### Buoc 5: Admin UI de review/fix mapping

Them tab trong trang BigQuery Backfill de:
- Xem danh sach mapping tu dong (sort theo confidence thap nhat)
- Cho phep admin sua/xoa mapping sai
- Cho phep admin map thu cong cac SP chua match duoc

## Technical Details

### Migration SQL

```sql
CREATE TABLE IF NOT EXISTS product_channel_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  master_sku text NOT NULL,
  channel text NOT NULL,
  channel_product_id text NOT NULL,
  channel_product_name text,
  match_method text DEFAULT 'auto_name',
  confidence float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, channel, channel_product_id)
);

ALTER TABLE product_channel_mapping ENABLE ROW LEVEL SECURITY;
```

### Edge Function hoac RPC cho auto-match

Tao RPC `auto_match_products`:
1. Query products KiotViet va Shopee/Tiki
2. Normalize ten (bo prefix OLV, lowercase, trim)
3. Tim exact match truoc, roi substring match
4. Insert vao product_channel_mapping

### Cap nhat `v_top_products_30d`

```sql
CREATE OR REPLACE VIEW v_top_products_30d AS
SELECT 
  oi.tenant_id,
  COALESCE(m.master_sku, oi.sku) as sku,
  COALESCE(p_master.name, p.name, MAX(oi.product_name), oi.sku) as product_name,
  ...
FROM cdp_order_items oi
LEFT JOIN product_channel_mapping m 
  ON oi.tenant_id = m.tenant_id 
  AND oi.channel = m.channel 
  AND oi.sku = m.channel_product_id
LEFT JOIN products p_master 
  ON m.master_sku = p_master.sku 
  AND p_master.channel = 'kiotviet'
LEFT JOIN products p 
  ON oi.sku = p.sku AND oi.tenant_id = p.tenant_id
GROUP BY COALESCE(m.master_sku, oi.sku), ...
ORDER BY total_revenue DESC;
```

### Luu y

- Auto-match se khong 100% chinh xac vi ten SP tren san thuong khac KiotViet (them prefix, them size...)
- Can admin review cac mapping co confidence < 0.9
- Mapping chi can chay 1 lan + cap nhat incremental khi co SP moi
- KiotViet la source of truth cho gia von (cost_price), ten chinh thuc, va ma SKU

