

## Fix Order Items Sync: UUID Mismatch

### Van de

| Field | Expected | Actual |
|-------|----------|--------|
| `cdp_order_items.order_id` | UUID (e.g. `7decfad1-ce45-...`) | String (e.g. `"HD123456"`) |

Code hien tai (dong 1138):
```text
order_id: orderKey  // "HD123456" → PostgreSQL reject vi khong phai UUID
```

Ket qua: Moi batch upsert deu that bai, `inserted: 0`, nhung job van danh dau `completed` vi error chi duoc `console.error` ma khong throw.

### Giai phap

Truoc khi upsert vao `cdp_order_items`, can lookup UUID cua order tu bang `cdp_orders` dua tren `order_key` + `channel`.

```text
BigQuery rows (order_key: "HD123456", channel: "kiotviet")
    |
    v
Lookup: cdp_orders WHERE order_key = "HD123456" AND channel = "kiotviet"
    |
    v
Get: id = "7decfad1-ce45-4f04-..."
    |
    v
Insert: cdp_order_items.order_id = "7decfad1-ce45-4f04-..."
```

### Chi tiet ky thuat

#### 1. Sua `syncOrderItems()` trong `backfill-bigquery/index.ts`

**Thay doi chinh (dong 1126-1156):**

- Sau khi fetch batch rows tu BigQuery, thu thap tat ca `orderKey` unique trong batch
- Query `cdp_orders` de lay map `{channel+order_key → uuid}`
- Chi tao order items cho nhung order da ton tai trong `cdp_orders`
- Bo qua (skip) nhung item ma order chua duoc sync (log warning)

Logic moi:

```text
1. Fetch batch tu BigQuery (500 rows)
2. Extract unique orderKeys tu batch
3. Query: SELECT id, order_key FROM cdp_orders 
   WHERE tenant_id = X AND channel = Y AND order_key IN (...)
4. Build map: orderKeyToUuid = { "HD123456": "7decfad1-..." }
5. Transform rows:
   - order_id = orderKeyToUuid[orderKey]  // UUID thay vi string
   - Skip neu khong tim thay order (orphan item)
6. Upsert vao cdp_order_items
```

#### 2. Xu ly loi tot hon

Hien tai khi upsert fail, code chi `console.error` va tiep tuc. Can:
- Dem so items bi skip (orphan - khong co order tuong ung)
- Log ro so luong: inserted / skipped / failed
- Bao cao trong metadata cua job

#### 3. Khong thay doi gi khac

- Schema `cdp_order_items` giu nguyen
- Unique constraint `(tenant_id, order_id, sku)` van hoat dong binh thuong
- COGS update sau sync van dung
- Daily sync orchestrator khong can thay doi

### Kiem tra sau fix

- Chay lai backfill order_items cho 1 source nho (vd: TikTok)
- Verify `cdp_order_items` co data (count > 0)
- Verify `order_id` la UUID hop le, match voi `cdp_orders.id`

