

## Fix Fulfillments: Them KiotViet va Haravan + Sua cot sai

### Van de

`FULFILLMENT_SOURCES` hien tai chi co 3 source (Shopee, Lazada, TikTok) nhung **thieu 2 source quan trong**:
- **KiotViet**: Co `raw_kiotviet_Orders` voi truong `DeliveryCode` (ma van don)
- **Haravan**: Co `raw_hrv_Orders` voi thong tin fulfillment

Ngoai ra, 3 source hien tai cung co **loi mapping cot** (da audit lan truoc).

### Thay doi

#### 1. Sua FULFILLMENT_SOURCES (dong 372-412)

**Them 2 source moi:**

```text
KiotViet:
  channel: 'kiotviet'
  dataset: 'olvboutique'  
  table: 'raw_kiotviet_Orders'
  mapping:
    fulfillment_key: 'OrderId'
    order_key: 'OrderId'
    tracking_number: 'DeliveryCode'    (ma van don KiotViet)
    shipping_carrier: null             (KiotViet khong luu ten hang van chuyen trong truong rieng)
    fulfillment_status: 'Status'
    shipped_at: 'PurchaseDate'

Haravan:
  channel: 'haravan'
  dataset: 'olvboutique'
  table: 'raw_hrv_Orders'
  mapping:
    fulfillment_key: 'OrderId'
    order_key: 'OrderId'
    tracking_number: 'TrackingNumber'   (ma van don Haravan)
    shipping_carrier: 'ShippingCarrier'
    fulfillment_status: 'FulfillmentStatus'
    shipped_at: 'UpdatedAt'
```

**Sua 3 source cu (fix cot khong ton tai):**

| Source | Truong | Cu (sai) | Moi (dung) |
|--------|--------|----------|------------|
| Shopee | tracking_number | `tracking_no` | `null` (khong co cot nay) |
| Lazada | tracking_number | `tracking_code` | `null` |
| Lazada | shipping_carrier | `shipping_provider` | `delivery_info` |
| TikTok | shipped_at | `shipping_due_time` | `update_time` |

#### 2. Sua logic syncFulfillments (dong 1622-1647)

Cap nhat de xu ly mapping co gia tri `null`:
- Khi mapping value la `null`, **bo cot do ra khoi SELECT query**
- Trong row mapping, dat gia tri `null` truc tiep thay vi truy xuat tu BigQuery row

Logic moi:

```text
// Loc bo cac mapping co value = null truoc khi tao SELECT
const validColumns = Object.values(source.mapping).filter(v => v !== null)
const uniqueColumns = [...new Set(validColumns)]
const columns = uniqueColumns.map(c => `\`${c}\``).join(', ')

// Trong row mapping:
tracking_number: source.mapping.tracking_number 
  ? row[source.mapping.tracking_number] 
  : null
```

#### 3. Deploy va chay lai

1. Deploy edge function `backfill-bigquery`
2. Xoa job fulfillments cu da fail (`dce0ca9f...`)
3. Chay lai backfill fulfillments voi date_from: `2025-01-01`

### Luu y

- Can xac nhan ten cot chinh xac cua KiotViet va Haravan tren BigQuery. Cac ten tren (`DeliveryCode`, `TrackingNumber`, `ShippingCarrier`, `FulfillmentStatus`, `UpdatedAt`) dua tren convention cua KiotViet API va Haravan API. Neu ten cot khac, job se fail va can dieu chinh lai.
- Neu KiotViet/Haravan khong co mot so cot, se dat `null` tuong tu Shopee.

