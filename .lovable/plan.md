
# Fix View v_retail_concentration_risk: Hien Thi Ten San Pham & Danh Muc

## Van de

2 loi tren tab "Rui ro tap trung":

1. **"Chua phan loai: 100%"** - Tat ca san pham deu hien khong co danh muc
2. **"SKU-35361151"** thay vi ten that "Pink Wave Shopping Bag"

## Nguyen nhan goc

View `v_retail_concentration_risk` JOIN sai:
```
LEFT JOIN products p ON (oi.product_id = p.id::text)
```
- `cdp_order_items.product_id` chua KiotViet numeric ID (vd: `35361151`)
- `products.id` la UUID (vd: `75015089-03c6-4d09-9ac4-6af44a32cfa2`)
- Ket qua: JOIN luon fail --> fallback "SKU-..." va category = NULL

**Du lieu thuc te da co:**

| product_id | sku | product_name (oi) | name (products) | category |
|-----------|-----|-------------------|----------------|----------|
| 35361151 | BAG00015M | Pink Wave Shopping Bag | Pink Wave Shopping Bag | 07-Others |
| 1005241401 | BAG00016M | TET 2026 Shopping Bag | TET 2026 Shopping Bag | 07-Others |
| 1005668746 | SP020638 | Bao Li Xi OLV 2026 | Bao Li Xi OLV 2026 | 07-Others |
| 1002327349 | SER00206 | (null) | Lieu trinh Tiem Botox | Medical |

## Giai phap

Tao migration SQL de **thay doi view**, sua 2 CTE:

### 1. CTE `category_stats`: Join products qua SKU de lay category

```sql
-- Cu (sai):
COALESCE(oi.category, 'Chua phan loai')
-- oi.category luon NULL

-- Moi:
COALESCE(p.category, oi.category, 'Chua phan loai')
-- Join products via sku --> lay category that
```

### 2. CTE `sku_stats`: Join products qua SKU, uu tien product_name

```sql
-- Cu (sai):
LEFT JOIN products p ON (oi.product_id = p.id::text)
COALESCE(p.name, 'SKU-' || left(oi.product_id, 8))

-- Moi:
LEFT JOIN products p ON (oi.sku = p.sku AND oi.tenant_id = p.tenant_id)
COALESCE(p.name, oi.product_name, oi.sku, 'SKU-' || left(oi.product_id, 8))
```

### Ky vong sau fix

| Card | Truoc | Sau |
|------|-------|-----|
| Tap trung Danh muc | "Chua phan loai: 100%" | "07-Others: XX%", "Medical: YY%", ... |
| Tap trung Hero SKU | SKU-35361151 | Pink Wave Shopping Bag |
| | SKU-10052414 | TET 2026 Shopping Bag |
| | SKU-10056687 | Bao Li Xi OLV 2026 |
| | SKU-35361275 | Pink Wave Shopping Bag (S) |
| | SKU-10023273 | Lieu trinh Tiem Botox Allergan |

## Files thay doi

| File | Thay doi |
|------|---------|
| Migration SQL | DROP + CREATE view `v_retail_concentration_risk` voi JOIN qua SKU thay vi product_id |
