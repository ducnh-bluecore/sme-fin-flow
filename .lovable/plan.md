

# Fix Rui ro Tap trung: Timeout + Loc SP Phu

## 2 Van de

### 1. Timeout (loi 500)
View `v_retail_concentration_risk` quet ~1.2M order items voi JOIN, vuot qua gioi han thoi gian cua PostgREST (8 giay). Ket qua: frontend hien "Khong the tai du lieu".

### 2. SP phu lot top Hero SKU
Cac san pham nhu "Pink Wave Shopping Bag", "TET 2026 Shopping Bag", "Bao Li Xi OLV 2026" co `selling_price = 0` va `cost_price = 0` trong bang products. Day la qua tang/tui xach kem don, khong phai san pham kinh doanh chinh. Chung khong nen xuat hien trong phan tich Hero SKU va Danh muc.

## Giai phap

Chuyen tu **VIEW** sang **MATERIALIZED VIEW** va them dieu kien loc SP phu.

### 1. Materialized View
- DROP view cu
- CREATE MATERIALIZED VIEW voi cung logic nhung chi chay 1 lan, ket qua luu san
- Tao UNIQUE INDEX tren tenant_id de ho tro `REFRESH CONCURRENTLY`
- Frontend truy van ngay lap tuc (khong timeout)

### 2. Loc SP phu khoi Hero SKU va Category
Trong CTE `sku_stats` va `category_stats`, them dieu kien:

```text
-- Loai bo SP co gia = 0 (qua tang, tui xach, li xi)
WHERE ... AND (p.selling_price IS NULL OR p.selling_price > 0)
```

Logic: Neu san pham co trong bang `products` va `selling_price = 0` --> loai. Neu khong match products (p.selling_price IS NULL) --> giu lai (de khong mat du lieu).

### 3. Refresh Data
Sau khi tao materialized view, chay `REFRESH MATERIALIZED VIEW` de co du lieu ngay.

## Ky vong sau fix

| Metric | Truoc | Sau |
|--------|-------|-----|
| API call | Timeout 500 | Tra ve < 100ms |
| Hero SKU top 5 | Pink Wave, TET Bag, Bao Li Xi... | Cac SP chinh co gia ban thuc |
| Category | 07-Others chiem 18% (do SP phu) | % giam, phan bo chinh xac hon |

## Chi tiet ky thuat

### Migration SQL

1. `DROP VIEW IF EXISTS public.v_retail_concentration_risk`
2. `CREATE MATERIALIZED VIEW public.v_retail_concentration_risk AS ...` voi:
   - CTE `category_stats`: them `AND (p.selling_price IS NULL OR p.selling_price > 0)`
   - CTE `sku_stats`: them `AND (p.selling_price IS NULL OR p.selling_price > 0)`
   - Giu nguyen cac CTE khac (channel_stats, customer_stats, monthly_stats, seasonal_index)
3. `CREATE UNIQUE INDEX ON v_retail_concentration_risk (tenant_id)`
4. `REFRESH MATERIALIZED VIEW v_retail_concentration_risk`

### Khong can thay doi code frontend
Hook `useRetailConcentrationRisk.ts` va component `RetailConcentrationRisk.tsx` da truy van dung format, chi can data tra ve la hien thi.

