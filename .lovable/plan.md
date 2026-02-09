

# Xu ly trung don KiotViet - Marketplace Dedup

## Van de phat hien

KiotViet la he thong POS tong, dong bo don hang tu tat ca kenh ban (Shopee, Lazada, TikTok, Tiki, Haravan) ve chung mot bang `raw_kiotviet_Orders`. Hien tai backfill do tat ca 1.07M don vao channel `kiotviet` ma khong phan biet don KiotViet goc (ban tai cua hang) va don san do ve.

Dong thoi, cac san (Shopee, Lazada, TikTok, Tiki) cung duoc sync rieng tu dataset cua tung san.

**Ket qua: Don hang tu san bi dem 2 lan** — 1 lan trong `kiotviet`, 1 lan trong kenh goc.

### Quy mo anh huong

| Kenh | Don hang rieng | Revenue rieng | Trung trong KiotViet? |
|------|---------------|---------------|----------------------|
| KiotViet (tat ca) | 1,068,958 | 1,136B VND | Bao gom ca don san |
| Shopee | 115,067 | 61.6B | Can xac minh |
| Lazada | 39,932 | 23.1B | Rat co the trung |
| TikTok | 20,129 | 9.7B | Rat co the trung |
| Tiki | 281 | 141M | Rat co the trung |

Uoc tinh don trung: **~100-175k don**, revenue bi dem doi: **~60-94B VND**

### Tai sao chua the xac dinh chinh xac?

- `SaleChannelId` (truong trong BigQuery phan biet kenh) **KHONG duoc extract** trong mapping hien tai
- `raw_data` JSONB **KHONG duoc luu** (0/1.07M records co raw_data)
- `OrderCode` (co prefix `DHLZD_`, `DHHRV-`, v.v.) **KHONG duoc sync**, chi sync `OrderId` (so thuan)
- Khong co cach nao tu database hien tai phan biet don KiotViet goc vs don san do ve

## Giai phap 3 buoc

### Buoc 1: Them `SaleChannelId` + `OrderCode` vao mapping BigQuery

Cap nhat `ORDER_SOURCES` cho KiotViet trong `backfill-bigquery/index.ts`:

```text
Truoc:
  mapping: {
    order_key: 'OrderId',
    order_at: 'PurchaseDate',
    status: 'Status',
    customer_id: 'CusId',
    customer_name: 'CustomerName',
    customer_phone: 'deliveryContactNumber',
    gross_revenue: 'Total',
    discount: 'discount',
  }

Sau:
  mapping: {
    order_key: 'OrderId',
    order_at: 'PurchaseDate',
    status: 'Status',
    customer_id: 'CusId',
    customer_name: 'CustomerName',
    customer_phone: 'deliveryContactNumber',
    gross_revenue: 'Total',
    discount: 'discount',
    sale_channel_id: 'SaleChannelId',  // MỚI
    order_code: 'OrderCode',            // MỚI
  }
```

Luu vao `raw_data` JSONB de truy vet:
```text
raw_data: {
  SaleChannelId: "5389",
  OrderCode: "DHHRV-123456"
}
```

### Buoc 2: Logic loc don trung khi sync

Trong ham `syncOrders`, them buoc loc sau khi transform:

```text
Voi moi batch KiotViet orders:
  1. Doc SaleChannelId tu BigQuery
  2. Tao mapping SaleChannelId -> kenh:
     - 0 hoac NULL -> kiotviet (don goc)
     - 5389, 277489 -> haravan
     - 38485, 1000000081 -> lazada
     - 238790 -> tiktokshop
     - (can xac minh them cho Shopee, Tiki)
  3. Chi giu cac don co SaleChannelId = 0/NULL (don KiotViet thuc su)
  4. Don tu san -> BO QUA (da co tu dataset rieng cua san)
```

### Buoc 3: Migration lam sach don trung hien co

Sau khi xac dinh duoc SaleChannelId mapping chinh xac tu BigQuery:

```text
Buoc 3a: Query BigQuery de lay danh sach OrderId co SaleChannelId != 0
Buoc 3b: Xoa hoac danh dau cac order_key tuong ung trong cdp_orders WHERE channel = 'kiotviet'
Buoc 3c: Chay lai compute_kpi_facts_daily de cap nhat KPI
Buoc 3d: Chay lai detect_threshold_breaches de cap nhat alerts
```

## Truoc khi implement: Can xac minh tu BigQuery

Truoc khi code, can chay 1 query BigQuery de xac nhan:

```text
SELECT SaleChannelId, COUNT(*) as cnt
FROM olvboutique.raw_kiotviet_Orders
GROUP BY SaleChannelId
ORDER BY cnt DESC
```

Query nay se cho biet:
- Bao nhieu kenh ban do ve KiotViet
- SaleChannelId nao la "don goc" (thuong la 0 hoac NULL)
- So luong chinh xac don bi trung

## Thu tu thuc hien

1. **Query BigQuery** xac minh SaleChannelId distribution (dung edge function `bigquery-query`)
2. **Cap nhat mapping** trong `backfill-bigquery/index.ts` - them SaleChannelId, OrderCode
3. **Them logic loc** trong syncOrders - chi sync don KiotViet goc
4. **Chay backfill lai** cho kiotviet orders voi mapping moi
5. **Lam sach data cu** - xoa/danh dau don trung
6. **Recompute KPIs** - `compute_kpi_facts_daily` cho toan bo giai doan

## Rui ro

| Rui ro | Muc do | Giam thieu |
|--------|--------|------------|
| Xoa nham don KiotViet goc | Cao | Query BigQuery xac minh truoc, backup truoc khi xoa |
| SaleChannelId mapping sai | Trung binh | Cross-check OrderCode prefix voi SaleChannelId |
| KPI bi giam dot ngot | Du kien | Giam do bo don trung, la dung - can thong bao user |
| Shopee chua co SaleChannelId | Can kiem tra | Neu Shopee khong do qua KiotViet thi khong anh huong |

## Anh huong du kien

- **Doanh thu KiotViet giam**: Tu ~1,136B xuong con ~900-1,000B (bo don san)
- **Tong doanh thu he thong giam**: ~60-94B (phan bi dem doi)
- **KPI chinh xac hon**: Net Revenue, Order Count, AOV deu phan anh dung hon
- **Customer linking se cai thien**: Bot don trung = bot nhieu customer

