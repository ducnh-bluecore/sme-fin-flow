
# Fix Channel War + Inventory Data

## Nguyen nhan

### 1. Channel War: "Chua co du lieu channel"
- View `v_channel_pl_summary` timeout (error 57014) --> fallback sang `kpi_facts_daily`
- Fallback dung `.gte('date', ...)` nhung column that la `grain_date` --> query tra ve 0 rows
- Du lieu co san: kpi_facts_daily co data channel (KIOTVIET, SHOPEE, TIKTOK, LAZADA, TIKI, SHOPEE_ADS)
- Fallback cung doc `row.gross_revenue` nhung table nay dung `metric_code` + `metric_value` (pivot format)

### 2. Inventory: "Chua co du lieu ton kho"
- Snapshot moi nhat (Feb 12) co `total_inventory_value = 0`
- Function `compute_central_metrics_snapshot` tinh inventory tu `products.current_stock` nhung products chi co 1 record voi stock = 5
- Du lieu ton kho that nam trong `inv_state_positions` (34,293 rows, 293K units)
- Gia tri thuc: 178.3 ty VND (join inv_state_positions voi products.cost_price)

## Gia tri ky vong sau fix

### Channel War
| Channel | Revenue | Orders |
|---------|---------|--------|
| KIOTVIET | ~297 ty | ~268K |
| SHOPEE | ~31 ty | ~57K |
| TIKTOK | ~3.5 ty | ~6K |
| LAZADA | ~1.3 ty | ~1.9K |
| SHOPEE_ADS | filter out (no revenue) |

### Inventory
| Metric | Gia tri |
|--------|---------|
| Total Inventory Value | 178.3 ty VND |
| Total SKU positions | 34,293 |
| DIO | tinh tu inventory 178.3ty / annual COGS |

## Thay doi

### Fix 1: `src/hooks/useAllChannelsPL.ts` - Fallback pivot logic
- Doi `'date'` thanh `'grain_date'` (line 185-186)
- Thay logic doc flat columns bang pivot logic: group by `dimension_value` (channel), switch on `metric_code` (NET_REVENUE, ORDER_COUNT, COGS, GROSS_MARGIN)
- Filter out channels khong co revenue (SHOPEE_ADS)
- Tinh AOV = Revenue / Orders (khong sum daily AOV)

### Fix 2: SQL Migration - Update `compute_central_metrics_snapshot` inventory source
- Thay `products.current_stock * products.cost_price` bang `inv_state_positions JOIN products` 
- Query: `SELECT COALESCE(SUM(isp.on_hand * p.cost_price), 0) FROM inv_state_positions isp JOIN products p ON p.sku = isp.sku WHERE isp.on_hand > 0`
- Cung update DIO tinh tu inventory value moi

### Fix 3: `src/components/dashboard/InventoryRiskPanel.tsx` - Fallback toi inv_state_positions
- Khi snapshot co inventory = 0, query truc tiep `inv_state_positions` JOIN `products` de hien thi gia tri
- Hoac: sau khi fix migration, chi can bam Refresh la snapshot se co gia tri dung

## Files thay doi

| File | Thay doi |
|------|---------|
| `src/hooks/useAllChannelsPL.ts` | Fix fallback: `grain_date` + pivot logic |
| Migration SQL | Update `compute_central_metrics_snapshot`: inventory tu `inv_state_positions` |

## Kiem tra sau fix
| # | Test | Ky vong |
|---|------|---------|
| 1 | Channel War hien thi | 4-5 channels voi bars, KIOTVIET lon nhat |
| 2 | SHOPEE_ADS filtered | Khong hien thi rieng |
| 3 | Inventory value | 178.3 ty VND sau Refresh |
| 4 | DIO | Tinh tu 178.3ty / annual COGS |
