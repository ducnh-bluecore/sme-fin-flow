

## Plan: Fix 5 bugs trong Allocation & Rebalance Engine

### Bug #1: Duplicate Recommendations (CRITICAL)

**Vấn đề:** V1 INSERT không có dedup → cùng `(fc_id, store_id)` có thể xuất hiện nhiều lần do LEFT JOIN với multiple demand rows.

**Fix:** Thêm `UNIQUE` constraint trên `(run_id, fc_id, store_id)` vào bảng `inv_allocation_recommendations`. Đồng thời thêm `GROUP BY` vào V1 CTE `v1_raw` để gộp trước khi INSERT (tương tự `push_grouped` trong rebalance).

**Migration:**
- `ALTER TABLE inv_allocation_recommendations ADD CONSTRAINT uq_alloc_run_fc_store UNIQUE (run_id, fc_id, store_id);`
- Update `fn_allocation_engine`: wrap V1 insert với GROUP BY hoặc `ON CONFLICT DO NOTHING`

---

### Bug #2: CW Reserve quá bảo thủ — 509 FCs bị miss (HIGH)

**Vấn đề:** Khi CW có 1032 FCs → reserve = 20 units/FC. FC có 23 units chỉ còn 3 available → gần như không chia được.

**Fix:** Thay đổi logic reserve từ **fixed per FC** sang **percentage-based**:
- Reserve = `MAX(3, FLOOR(cw_available * 0.15))` — giữ 15% hoặc tối thiểu 3 units
- Với FC 23 units: reserve = MAX(3, 3) = 3, available = 20 → chia được 4-5 stores
- Với FC 200 units: reserve = MAX(3, 30) = 30, available = 170 → vẫn an toàn
- CORE/HERO vẫn giữ rule riêng (`v_core_hero_min_per_sku`)

**Migration:** Update `fn_allocation_engine` — thay dòng tính `cwr` trong V1 và V2 CTEs.

---

### Bug #3: Scarcity filter chặn Tier C quá mạnh (MEDIUM)

**Vấn đề:** `min_system_stock = 50` → 92% FCs có system_total ≤ 50 → Tier C không nhận hàng V1.

**Fix:** Giảm threshold xuống `min_system_stock = 20` trong `sem_allocation_policies` (SCARCITY weights). Hoặc cho phép Tier C nhận hàng nếu FC thuộc BST mới (< 60 ngày).

**Data update:** `UPDATE sem_allocation_policies SET weights = jsonb_set(weights, '{min_system_stock}', '20') WHERE policy_type = 'SCARCITY'`

Thêm exception trong SQL: BST mới bypass scarcity filter (tương tự rebalance đã có `v_bst_new_age_days`).

---

### Bug #4: Rebalance Push không trừ cumulative stock (HIGH)

**Vấn đề:** Trong `ranked_push`, mỗi store dùng `cw.cw_available` gốc → nếu 5 stores cần hàng, tổng push có thể vượt CW stock.

**Fix:** Thêm window function `SUM(push_qty) OVER (PARTITION BY fc_id ORDER BY weeks_cover ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` để tính cumulative, sau đó filter `WHERE cum_push <= cw_available`.

**Migration:** Update `fn_rebalance_engine` — thêm CTE `push_cumulative` giữa `ranked_push` và `push_grouped`:

```text
push_cumulative AS (
  SELECT *,
    SUM(push_qty) OVER (PARTITION BY fc_id ORDER BY weeks_cover ASC) AS cum_push
  FROM ranked_push
  WHERE push_qty > 0
),
push_grouped AS (
  SELECT ... FROM push_cumulative
  WHERE cum_push <= cw_available
  GROUP BY ...
)
```

---

### Bug #5: V2 miss BST mới (velocity = 0) (MEDIUM)

**Vấn đề:** V2 yêu cầu `vel > 0 OR co > 0`. BST mới chưa có sales → bị loại.

**Fix:** Thêm điều kiện: nếu FC thuộc BST mới (product_created_date < 60 ngày), bypass velocity filter. Dùng V1 logic (phủ nền) cho BST mới thay vì V2.

Trong V2 CTE `v2_raw`, thêm:
```sql
WHERE (d.vel > 0 OR d.co > 0
       OR EXISTS (SELECT 1 FROM _fc f2 
                  WHERE f2.id = f.id 
                  AND f2.product_created_date IS NOT NULL
                  AND (CURRENT_DATE - f2.product_created_date) < v_bst_new_age_days))
```

Đồng thời set `need = min_stock` cho BST mới khi velocity = 0 (fallback về V1 logic).

---

### Tóm tắt thay đổi

| # | Bug | Severity | Fix type |
|---|-----|----------|----------|
| 1 | Duplicates | CRITICAL | Migration: UNIQUE constraint + GROUP BY |
| 2 | CW Reserve 20/FC | HIGH | Migration: percentage-based reserve |
| 3 | Scarcity Tier C | MEDIUM | Data update + SQL exception |
| 4 | Push no cumulative | HIGH | Migration: window function filter |
| 5 | V2 miss BST mới | MEDIUM | Migration: BST bypass in V2 |

Tất cả thay đổi nằm trong **1 migration** update 2 functions (`fn_allocation_engine`, `fn_rebalance_engine`) + 1 constraint + 1 data update.

