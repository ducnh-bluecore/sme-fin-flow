

## Fix Incremental Sync - Chi sync data moi, khong keo full moi ngay

### Hien trang van de

Sau khi audit toan bo `backfill-bigquery/index.ts`, phat hien **6/10 model types KHONG co date filter** - moi lan chay se scan TOAN BO dataset tu BigQuery:

| Model | Co date filter? | Co upsert? | Van de khi chay daily |
|-------|----------------|------------|----------------------|
| Orders | CO (`order_at >= date_from`) | CO (upsert) | An toan |
| Customers | CO (`created_at >= date_from`) | CO (upsert) | An toan |
| Products | KHONG | CO (upsert) | Scan full 16K records nhung khong duplicate |
| Order Items | KHONG | KHONG (insert!) | **DUPLICATE moi ngay!** |
| Refunds | KHONG | CO (ignoreDuplicates) | Scan full, khong update data thay doi |
| Payments | KHONG | CO (ignoreDuplicates) | Scan full, khong update data thay doi |
| Fulfillments | KHONG | CO (ignoreDuplicates) | Scan full, khong update data thay doi |
| Ad Spend | KHONG | CO (ignoreDuplicates) | Scan full, khong update data thay doi |
| Campaigns | KHONG | KHONG (insert!) | **DUPLICATE moi ngay!** |
| Inventory | Chua implement | - | - |

### Muc do nguy hiem

1. **CRITICAL**: `order_items` va `campaigns` dung `.insert()` - **se tao ban ghi trung lap moi ngay**
2. **HIGH**: `refunds/payments/fulfillments` dung `ignoreDuplicates: true` - data cu thay doi se **khong duoc cap nhat**
3. **MEDIUM**: `products/ad_spend` scan full nhung co upsert nen khong sai data, chi ton tai nguyen

### Giai phap

#### 1. Them UNIQUE CONSTRAINT cho `cdp_order_items`

Hien tai `cdp_order_items` khong co unique constraint nen khong the dung upsert.

```text
-- Xoa duplicate truoc
DELETE FROM cdp_order_items a USING cdp_order_items b
WHERE a.id > b.id 
  AND a.tenant_id = b.tenant_id 
  AND a.order_id = b.order_id 
  AND a.sku = b.sku;

-- Them constraint
ALTER TABLE cdp_order_items 
ADD CONSTRAINT cdp_order_items_tenant_order_sku_key 
UNIQUE (tenant_id, order_id, sku);
```

#### 2. Doi `order_items` tu `.insert()` sang `.upsert()`

```text
// Truoc (SAI):
.insert(orderItems)

// Sau (DUNG):
.upsert(orderItems, { onConflict: 'tenant_id,order_id,sku' })
```

#### 3. Them date filter cho `syncOrderItems`

Hien tai query BigQuery KHONG co WHERE clause. Can them filter dua tren truong ngay cua order. Vi order_items khong co truong ngay rieng, phai join hoac dung truong `order_key` de loc. Cach kha thi nhat: them truong `order_at` vao mapping va filter theo no.

Tuy nhien cac bang order_items trong BigQuery (bdm_kov_OrderLineItems, shopee_OrderItems, etc.) co the KHONG co truong ngay. Phai kiem tra tung source:
- KiotViet `bdm_kov_OrderLineItems`: co the co truong `PurchaseDate` hoac khong
- Shopee/Lazada/TikTok order items: thuong khong co truong ngay rieng

**Giai phap thuc te**: Thay vi filter trong BigQuery, filter SAU KHI query bang cach chi sync order items cho nhung orders da co trong `cdp_orders` voi `order_at >= date_from`. Nhu vay chi can them dieu kien khi insert/upsert.

#### 4. Doi `ignoreDuplicates: false` cho refunds/payments/fulfillments

```text
// Truoc - bo qua data thay doi:
.upsert(refunds, { onConflict: 'tenant_id,refund_key', ignoreDuplicates: true })

// Sau - cap nhat data thay doi:
.upsert(refunds, { onConflict: 'tenant_id,refund_key' })
```

Tuong tu cho payments va fulfillments.

#### 5. Them date filter cho refunds/payments/fulfillments/ad_spend/campaigns

Them `date_from` vao options cua cac function nay va filter trong BigQuery query:
- Refunds: filter theo `refund_at` 
- Payments: filter theo `paid_at`
- Fulfillments: filter theo `shipped_at`
- Ad Spend: filter theo `spend_date`
- Campaigns: can them unique constraint truoc, roi doi sang upsert

#### 6. Campaigns: them unique constraint va doi sang upsert

`promotion_campaigns` hien dung `.insert()` nen se duplicate. Can:
- Xac dinh unique key (VD: `tenant_id, channel, campaign_name, start_date`)
- Them constraint
- Doi sang upsert

#### 7. Toi uu `update_order_items_cogs()`

Them dieu kien chi update items chua co COGS:

```text
AND (oi.unit_cogs IS NULL OR oi.unit_cogs = 0)
```

### Thu tu thuc hien

1. Migration: Xoa duplicate + them unique constraint cho `cdp_order_items`
2. Migration: Them unique constraint cho `promotion_campaigns`  
3. Migration: Update function `update_order_items_cogs()` them dieu kien `unit_cogs IS NULL`
4. Code: Sua `syncOrderItems` - doi insert sang upsert
5. Code: Sua `syncRefunds/Payments/Fulfillments` - bo `ignoreDuplicates`
6. Code: Sua `syncCampaigns` - doi insert sang upsert
7. Code: Them date filter cho tat ca cac function con thieu (order_items, refunds, payments, fulfillments, ad_spend, campaigns)

### Files can sua

1. **Migration SQL moi**: Unique constraints + update COGS function
2. **`supabase/functions/backfill-bigquery/index.ts`**: Sua 6 function sync

### Ket qua

- Daily sync chi query 2 ngay gan nhat tu BigQuery (thay vi full scan)
- Data thay doi (refund status, payment status) duoc cap nhat
- Khong con duplicate order_items va campaigns
- COGS chi tinh cho items moi, khong re-process toan bo

