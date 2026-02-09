

# Fix: Daily Sync Incremental + Multi-Channel Products

## 3 Van de chinh

### 1. Daily job khong incremental - keo het data tu dau
- `syncProducts`: KHONG nhan `date_from` param --> moi lan chay daily sync deu pull 16,706 products
- `syncOrderItems`: Comment ghi ro "no date filter" --> keo 2.2M items moi ngay thay vi chi 2 ngay gan nhat
- Cac model khac (orders, payments, fulfillments, refunds, ad_spend) DA co date filter hoat dong tot

### 2. Products chi keo tu 1 source KiotViet
- Hien tai chi co `PRODUCT_SOURCE = { table: 'bdm_master_data_products' }` (1 source duy nhat)
- Thieu san pham tu: Shopee, Lazada, TikTok, Tiki
- Khach hang mua tren san nhung san pham khong ton tai trong bang `products`

### 3. Sai ten bang source KiotViet
- Dang dung `bdm_master_data_products` (bang BDM da transform)
- Nen dung `raw_kiotviet_Products` (bang raw goc) de nhat quan voi cac model khac (raw_kiotviet_Orders, raw_kiotviet_Customers...)

---

## Giai phap

### Buoc 1: Chuyen Products sang multi-source (nhu Orders)

Thay `PRODUCT_SOURCE` (1 source) bang `PRODUCT_SOURCES` (nhieu source):

```text
PRODUCT_SOURCES = [
  { channel: 'kiotviet', dataset: 'olvboutique', table: 'raw_kiotviet_Products' }
  { channel: 'shopee', dataset: 'olvboutique_shopee', table: 'shopee_Products' }
  { channel: 'lazada', dataset: 'olvboutique_lazada', table: 'lazada_Products' }
  { channel: 'tiktok', dataset: 'olvboutique_tiktokshop', table: 'tiktok_Products' }
  { channel: 'tiki', dataset: 'olvboutique_tiki', table: 'tiki_Products' }
]
```

Moi source se co mapping rieng (ten cot khac nhau tuy platform).

### Buoc 2: Them date_from vao syncProducts

- Them `date_from` vao options type cua `syncProducts`
- Dung cot ngay phu hop de filter incremental (vd: `Date` cho KiotViet, `dw_timestamp` cho marketplace)
- Daily job chi keo products thay doi trong 2 ngay gan nhat

### Buoc 3: Them date filter cho syncOrderItems

- Order items tu Shopee/Lazada/TikTok co the JOIN voi orders table de filter theo ngay
- Hoac dung cot `dw_timestamp` (BigQuery watermark) neu co
- KiotViet order items: dung `OrderId` lien ket voi orders da co date filter

### Buoc 4: Them cot `channel` vao bang products

- Hien tai `products` unique constraint la `(tenant_id, sku)`
- Can them `channel` de phan biet cung SKU tu nhieu san
- Update constraint thanh `(tenant_id, channel, sku)`

---

## Technical Details

### File thay doi: `supabase/functions/backfill-bigquery/index.ts`

**1. Thay PRODUCT_SOURCE bang PRODUCT_SOURCES (dong 444-448):**

Khai bao mang sources voi mapping cho tung channel. Can xac nhan ten cot chinh xac tu BigQuery cho tung san (Shopee, Lazada, TikTok, Tiki) - co the can chay `bigquery-query` de verify column names.

**2. Viet lai syncProducts (dong 1857-2011):**

- Chuyen tu single-source sang multi-source loop (giong syncOrders)
- Them `date_from` vao options
- Them source progress tracking cho tung channel
- Mapping rieng cho tung source

**3. Cap nhat syncOrderItems (dong 1198-1414):**

- Them logic date filter: dung BigQuery date column hoac filter theo order date
- Cho daily incremental chi keo items cua orders trong 2 ngay gan nhat

### Migration: Them channel vao products table

```sql
-- Them cot channel
ALTER TABLE products ADD COLUMN IF NOT EXISTS channel text DEFAULT 'kiotviet';

-- Drop constraint cu
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tenant_id_sku_key;

-- Tao constraint moi
ALTER TABLE products ADD CONSTRAINT products_tenant_channel_sku_key 
  UNIQUE (tenant_id, channel, sku);
```

### Luu y quan trong

- Can verify ten bang san pham tren BigQuery cho tung san (shopee_Products, lazada_Products...) bang cach chay query kham pha truoc
- Mapping cot (ten, gia, SKU) khac nhau tuy platform
- View `v_top_products_30d` van hoat dong vi JOIN qua SKU, khong phu thuoc channel
- Daily sync sau fix se chi mat vai giay thay vi hang gio

