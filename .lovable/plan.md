

## Doanh thu thực thay vì x250k

### Van de hien tai
- `inv_state_demand` chi luu so luong (`total_sold`), khong co gia tien
- Dang hardcode `250,000 VND` lam gia trung binh -> sai lech voi thuc te
- Bang `cdp_order_items` co du lieu thuc: `unit_price`, `line_revenue`, `qty`, `sku`

### Giai phap: Tao summary view tinh AOV thuc tu don hang

**Buoc 1: Tao database view `v_inv_store_revenue`**

Tao mot summary view join `cdp_order_items` de tinh:
- **Gia ban trung binh thuc (avg_unit_price)** theo SKU/FC
- **Doanh thu thuc (actual_revenue)** = SUM(line_revenue) nhom theo store
- **AOV (Average Order Value)** theo cua hang

Logic: `cdp_order_items.sku` -> match voi `inv_state_demand.sku` -> group by `store_id`

Tuy nhien, `cdp_orders` khong co `store_id` (chi co `channel`). Vi vay phuong an thuc te la:

**Phuong an A (kha thi ngay):** Tinh `avg_unit_price` tu toan bo `cdp_order_items` nhom theo SKU, roi nhan voi `total_sold` cua tung store. Chinh xac hon 250k vi dung gia ban that.

**Phuong an B (can bo sung data):** Them `store_id` vao `cdp_orders` de co doanh thu thuc theo chi nhanh. Day la giai phap dai han nhung can thay doi data pipeline.

### De xuat: Phuong an A (thuc hien ngay)

**Buoc 1: Tao summary view**

```sql
CREATE VIEW v_inv_avg_unit_price AS
SELECT 
  tenant_id,
  sku,
  AVG(unit_price) as avg_unit_price,
  SUM(line_revenue) as total_revenue,
  SUM(qty) as total_qty
FROM cdp_order_items
WHERE unit_price > 0 AND qty > 0
GROUP BY tenant_id, sku;
```

**Buoc 2: Tao hook `useAvgUnitPrices`**

Query view tren de lay gia trung binh thuc theo SKU, tra ve mot Map `sku -> avg_unit_price`.

**Buoc 3: Cap nhat `StoreDirectoryTab`**

- Join `inv_state_demand` (co `sku` + `total_sold` theo store) voi `v_inv_avg_unit_price` (co `avg_unit_price` theo SKU)
- Tinh `est_revenue = SUM(total_sold_per_sku * avg_unit_price_per_sku)` thay vi `total_sold * 250k`
- Hien thi ca AOV thuc ben canh doanh thu

**Buoc 4: Fallback**

Neu SKU khong co trong `cdp_order_items` (hang moi chua ban online), van dung 250k lam fallback. Hien thi icon/tooltip de phan biet "doanh thu thuc" vs "uoc tinh".

### Ket qua

- Doanh thu sat thuc te hon, phan anh gia ban that cua tung san pham
- Van hoat dong khi chua co data day du (fallback 250k)
- Khong can thay doi schema `inv_state_demand` hay `inv_stores`

### Phan ky thuat

| Thanh phan | Thay doi |
|---|---|
| DB Migration | Tao view `v_inv_avg_unit_price` + RLS policy |
| Hook moi | `src/hooks/inventory/useAvgUnitPrices.ts` |
| Component | `StoreDirectoryTab.tsx` - thay logic tinh revenue |
| Fallback | 250k cho SKU chua co data ban hang |

