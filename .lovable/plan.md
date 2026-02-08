

## Tao table `inventory_movements` va backfill tu BigQuery

### Hien trang

| Model | Table | Trang thai |
|-------|-------|-----------|
| `campaigns` | `promotion_campaigns` | Da co table + sync function + 0 records (chua chay) |
| `inventory` | `inventory_movements` | **Chua co table, chua co sync function** |

`promotion_campaigns` da ton tai va sync function da san sang -- chi can chay backfill. Rieng `inventory_movements` can tao table va viet sync function.

---

### Buoc 1: Tao table `inventory_movements`

Chay migration SQL de tao bang voi cau truc phu hop du lieu KiotViet (`bdm_kov_xuat_nhap_ton`):

```text
inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  movement_date     date NOT NULL,
  branch_id         text,
  branch_name       text,
  product_code      text NOT NULL,
  product_name      text,
  begin_stock       numeric DEFAULT 0,
  purchase_qty      numeric DEFAULT 0,
  sold_qty          numeric DEFAULT 0,
  return_qty        numeric DEFAULT 0,
  transfer_in_qty   numeric DEFAULT 0,
  transfer_out_qty  numeric DEFAULT 0,
  end_stock         numeric DEFAULT 0,
  net_revenue       numeric DEFAULT 0,
  cost_amount       numeric DEFAULT 0,
  channel           varchar DEFAULT 'kiotviet',
  created_at        timestamptz DEFAULT now(),
  UNIQUE(tenant_id, movement_date, branch_id, product_code)
)
```

RLS policy: Service role full access (giong `ad_spend_daily`).

### Buoc 2: Them INVENTORY_SOURCES mapping

Them config vao `supabase/functions/backfill-bigquery/index.ts`:

```text
INVENTORY_SOURCES = [{
  channel: 'kiotviet',
  dataset: 'olvboutique',
  table: 'bdm_kov_xuat_nhap_ton',
  mapping: {
    movement_date:    ten cot ngay trong BigQuery,
    branch_id:        ten cot ma chi nhanh,
    branch_name:      ten cot ten chi nhanh,
    product_code:     ten cot ma san pham,
    product_name:     ten cot ten san pham,
    begin_stock:      ten cot ton dau,
    purchase_qty:     ten cot nhap,
    sold_qty:         ten cot ban,
    return_qty:       ten cot tra hang,
    transfer_in_qty:  ten cot chuyen den,
    transfer_out_qty: ten cot chuyen di,
    end_stock:        ten cot ton cuoi,
    net_revenue:      ten cot doanh thu,
    cost_amount:      ten cot gia von,
  }
}]
```

**Luu y**: Ten cot BigQuery can xac nhan chinh xac. Se su dung convention KiotViet pho bien. Neu sai, job se fail va can dieu chinh.

### Buoc 3: Viet ham `syncInventory`

Theo dung pattern cua `syncFulfillments` / `syncAdSpend`:
- Query BigQuery theo batch (LIMIT/OFFSET)
- Upsert vao `inventory_movements` (conflict on `tenant_id, movement_date, branch_id, product_code`)
- Ho tro date_from filter va chunked auto-continue
- Tracking progress qua `backfill_source_progress`

### Buoc 4: Ket noi vao switch case

Them `case 'inventory':` vao main handler (dong ~2444) de goi `syncInventory`.

### Buoc 5: Deploy va chay backfill

1. Deploy edge function `backfill-bigquery`
2. Chay backfill cho `inventory` (date_from: 2025-01-01)
3. Chay backfill cho `campaigns` (da co san sync function, chi can trigger)

