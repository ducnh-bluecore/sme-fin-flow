

## Fix KiotViet Order Backfill: Luu CusId va Phone

### Van de

KiotViet order mapping co `customer_id: 'CusId'` nhung trong ham `syncOrders` (line 1116-1129), chi map `customer_name` va `customer_phone`. KiotViet khong co `customer_phone` trong mapping nen ca 2 truong `CusId` va `phone` deu bi mat.

Ket qua: 728K KiotViet orders khong the link ve `cdp_customers`.

### Giai phap

Sua duy nhat 1 file: `supabase/functions/backfill-bigquery/index.ts`

#### Thay doi 1: Them `customer_phone` vao KiotViet ORDER_SOURCES mapping

KiotViet orders co cot `ContactNumber` (so dien thoai khach hang). Them vao mapping:

```text
// Line 190-202: KiotViet order source
mapping: {
  ...existing fields...
  customer_phone: 'ContactNumber',   // NEW - phone tu KiotViet
}
```

**Luu y:** Can verify cot `ContactNumber` co ton tai trong `raw_kiotviet_Orders`. Neu khong co, se dung null va chi luu CusId.

#### Thay doi 2: Luu CusId vao `buyer_id` column

Trong ham `syncOrders` (line 1116-1129), them mapping `buyer_id` tu `customer_id` trong source mapping:

```text
// Line 1116-1129: Transform logic
const orders = rows.map(row => ({
  ...existing fields...
  buyer_id: row[source.mapping.customer_id] 
    ? String(row[source.mapping.customer_id]) 
    : null,                                    // NEW - luu CusId vao buyer_id
  customer_phone: row[source.mapping.customer_phone] || null,  // FIX - ensure not undefined
}));
```

Column `buyer_id` (type text) da ton tai trong `cdp_orders` schema, dung de luu external customer ID tu source.

### Khong can migration SQL

- Column `buyer_id` va `customer_phone` da co san trong `cdp_orders`
- Chi can sua code trong edge function

### Sau khi deploy

Ban chi can re-backfill KiotViet orders:
```json
{
  "action": "start",
  "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "model_type": "orders",
  "options": {
    "source_table": "raw_kiotviet_Orders",
    "date_from": "2025-01-01"
  }
}
```

Sau do chay `link_orders_by_customer_key` de link `buyer_id` (CusId) voi `cdp_customers.external_ids` chua kiotviet ID.

### Ket qua ky vong

- 728K KiotViet orders se co `buyer_id` = CusId (vi du: "123456")
- Customer phone se duoc luu (neu `ContactNumber` ton tai trong BigQuery table)
- Link rate du kien tang tu 8.3% len ~70-80%

