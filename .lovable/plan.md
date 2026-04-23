

## Kế hoạch: Loại bỏ cửa hàng non-OLV khỏi Engine Phân bổ & Tái cân bằng

### Vấn đề
Hiện tại cả hai engine (`fn_allocation_engine` và `fn_rebalance_engine`) đều lấy **tất cả** cửa hàng active (bao gồm 90 cửa hàng tier="standard" non-OLV). Chỉ có 24 cửa hàng OLV (tier S/A/B/C) mới cần tham gia phân bổ.

Hệ quả:
- Hàng bị chia loãng cho 90 cửa hàng không liên quan
- tier_weight mặc định = 1.0 (bằng Tier S) cho "standard" → non-OLV nhận hàng ngang S-tier
- Kết quả phân bổ khác xa so với logic SC team

### Thay đổi

**1. Migration SQL — Cập nhật `fn_allocation_engine`**

Thêm filter `AND tier IN ('S','A','B','C')` vào 2 bảng tạm:
- `tmp_str` (line 141): dùng cho V2
- `tmp_str_v1` (line 147): dùng cho V1

Cụ thể, thêm điều kiện:
```sql
AND tier IN ('S','A','B','C')
```
vào cả hai câu `CREATE TEMP TABLE tmp_str` và `CREATE TEMP TABLE tmp_str_v1`.

**2. Migration SQL — Cập nhật `fn_rebalance_engine`**

Thêm filter tương tự vào bảng `_pos` (line 119) cho các cửa hàng đích (destination):
```sql
AND s.tier IN ('S','A','B','C')
```
Hoặc chính xác hơn: trong các phase Push và Lateral, chỉ xét `to_location` có tier trong S/A/B/C.

**3. Implement ma trận phân bổ 2D (Tier × CW Stock)**

Thêm constraint key `v1_allocation_matrix` vào `inv_constraint_registry` với giá trị:
```json
{
  "ranges": [
    {"max_cw": 29, "S": 0, "A": 0, "B": 0, "C": 0},
    {"max_cw": 40, "S": 3, "A": 2, "B": 0, "C": 0},
    {"max_cw": 60, "S": 4, "A": 2, "B": 2, "C": 1},
    {"max_cw": 80, "S": 4, "A": 2, "B": 2, "C": 1},
    {"max_cw": 100, "S": 5, "A": 3, "B": 2, "C": 2},
    {"max_cw": 999999, "S": 6, "A": 4, "B": 3, "C": 2}
  ]
}
```
Cập nhật V1 logic trong engine: thay vì dùng `v1_min_store_stock_by_total_sku`, lookup `min_stock` từ ma trận theo `(tier, cw_available)`.

**4. Thêm rule CW < 6 → skip**

Thêm constraint `cw_min_threshold` = 6. Trong engine, nếu `cw.available < 6` cho một FC → skip FC đó (không phân bổ).

**5. Thêm V2 tier cap**

Thêm constraint `v2_order_cap_by_tier`:
```json
{"S": 6, "A": 4, "B": 3, "C": 2}
```
Trong V2 logic, giới hạn `need` theo cap tương ứng với tier cửa hàng.

**6. Seed BASE và DYNAMIC weights**

Insert vào `sem_allocation_policies`:
- BASE: `{"tier_S": 1.5, "tier_A": 1.2, "tier_B": 1.0, "tier_C": 0.7}`
- DYNAMIC: `{"tier_S": 1.5, "tier_A": 1.2, "tier_B": 1.0, "tier_C": 0.7}`

### Kết quả mong đợi
- Engine chỉ phân bổ cho 24 cửa hàng OLV (tier S/A/B/C)
- Số lượng phân bổ theo đúng ma trận SC team
- CW tồn thấp (< 6) sẽ không bị chia
- V2 có trần theo tier, tránh phân bổ quá mức cho cửa hàng nhỏ

### Ước tính
- 1 migration file (recreate cả 2 function + seed data)
- Không thay đổi UI/frontend

