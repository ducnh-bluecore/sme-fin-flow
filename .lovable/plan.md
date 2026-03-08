

## Plan: Fix 5 bugs trong Allocation & Rebalance Engine ✅ DONE

### Bug #1: Duplicate Recommendations (CRITICAL) ✅
- Added UNIQUE constraint `uq_alloc_run_fc_store` on `(run_id, fc_id, store_id)`
- Cleaned existing duplicates
- Added GROUP BY in V1 CTE + ON CONFLICT DO NOTHING

### Bug #2: CW Reserve quá bảo thủ ✅
- Changed from fixed `v_cw_reserve_min` (20 units) to percentage-based: `GREATEST(3, FLOOR(cw_available * 0.15))`
- CORE/HERO still use dedicated reserve rules

### Bug #3: Scarcity filter chặn Tier C ✅
- Updated `min_system_stock` from 50 → 20 in scarcity policy
- BST mới (< 60 days) bypasses scarcity filter entirely

### Bug #4: Rebalance Push cumulative stock ✅
- Added `push_cumulative` CTE with `SUM(push_qty) OVER (PARTITION BY fc_id ORDER BY weeks_cover ASC)`
- Filter `WHERE cum_push <= cw_available` prevents over-allocation

### Bug #5: V2 miss BST mới ✅
- BST mới bypasses `vel > 0` requirement in V2
- Fallback to V1 min_stock logic when velocity = 0
- Reason text shows "V2-BST mới (phủ nền, chưa có sales)"
