

## Plan: Fix Finance Data Timeout trên Unit Economics Page

### Vấn de

Trang Unit Economics va cac module FDP khong hoat dong vi **query timeout**. Du lieu COGS da co san (94.4% order items da co gia von), nhung cac RPC va view bi timeout khi scan 1.2M orders + 191k order items.

### Loi console

```
get_fdp_period_summary: "canceling statement due to statement timeout"
get_sku_profitability_by_date_range: "canceling statement due to statement timeout"  
```

### Nguyen nhan goc

1. RPC `get_fdp_period_summary` - scan full 1.2M `cdp_orders` voi date filter nhung khong co composite index toi uu
2. RPC `get_sku_profitability_by_date_range` - JOIN 3 bang lon (`cdp_order_items` x `cdp_orders` x `products`) voi cast `p.id::text = coi.product_id` lam mat index
3. View `fdp_sku_summary` - aggregate toan bo 191k items voi JOIN khong co tenant filter

### Giai phap: Toi uu hoa database (SQL migration)

#### Buoc 1: Them index toi uu

- Index tren `cdp_orders(tenant_id, order_at)` da co nhung can covering index cho cac cot aggregate
- Index tren `cdp_order_items(tenant_id, sku)` de group nhanh hon

#### Buoc 2: Rewrite RPC `get_sku_profitability_by_date_range`

- Loai bo cast `p.id::text = coi.product_id` - dung truc tiep `coi.sku = p.sku` (match theo SKU thay vi product_id)
- Them index support cho pattern nay

#### Buoc 3: Tao materialized view thay the `fdp_sku_summary`

- Chuyen tu view thuong sang materialized view de cache ket qua
- Hoac rewrite thanh RPC co tenant filter + date range

#### Buoc 4: Timeout setting

- Tang statement timeout cho cac RPC nay hoac toi uu de chay duoi 10s

### Chi tiet ky thuat

**SQL Migration se bao gom:**

```text
-- 1. Index cho SKU lookup nhanh
CREATE INDEX IF NOT EXISTS idx_cdp_order_items_tenant_sku 
ON cdp_order_items(tenant_id, sku);

-- 2. Index cho products SKU lookup  
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku 
ON products(tenant_id, sku);

-- 3. Rewrite RPC get_sku_profitability_by_date_range
-- Dung coi.sku = p.sku thay vi p.id::text = coi.product_id
-- Tranh type cast lam mat index

-- 4. Tao materialized view cho fdp_sku_summary 
-- Hoac replace view voi tenant-aware version
```

**Khong can thay doi code frontend** - chi can fix database layer de query khong con timeout.

### Ket qua mong doi

- Unit Economics page load thanh cong voi data COGS thuc te
- Query time giam tu timeout (>30s) xuong duoi 5s
- Gross Profit, COGS%, Margin hien thi dung tu du lieu san co

