

## Plan: Option B — Time-Based Virtual Deduction (No New Table)

### Nguyên lý
Sau khi user approve, tồn CNTT hiển thị và engine tính = `raw_on_hand - SUM(approved_qty WHERE approved_at > last_snapshot_date)`. Khi sync chạy lại từ BigQuery → `snapshot_date` mới > `approved_at` cũ → deduction tự biến mất. Không double deduction.

### Thay đổi

#### 1. SQL Migration: Update `fn_allocation_engine`
Trong CTE `tmp_cw` (line 75-80), thêm LEFT JOIN trừ approved qty chưa được sync:

```sql
-- Tính tổng approved sau lần sync cuối, per fc_id (from CW stores only)
CREATE TEMP TABLE tmp_pending_deductions ON COMMIT DROP AS
SELECT ar.fc_id, SUM(ar.recommended_qty) AS deducted
FROM inv_allocation_recommendations ar
JOIN inv_stores s ON s.id = ar.store_id AND s.tenant_id = p_tenant_id
WHERE ar.tenant_id = p_tenant_id
  AND ar.status = 'approved'
  AND ar.approved_at > (
    SELECT MAX(ls.max_date)::timestamp
    FROM tmp_latest_snap ls
    JOIN inv_stores cws ON cws.id = ls.store_id 
      AND cws.location_type = 'central_warehouse'
  )
GROUP BY ar.fc_id;

-- Also include rebalance push approved
INSERT INTO tmp_pending_deductions
SELECT rs.fc_id, SUM(rs.qty)
FROM inv_rebalance_suggestions rs
WHERE rs.tenant_id = p_tenant_id
  AND rs.status = 'approved'
  AND rs.from_location_type = 'central_warehouse'
  AND rs.approved_at > (
    SELECT MAX(ls.max_date)::timestamp
    FROM tmp_latest_snap ls
    JOIN inv_stores cws ON cws.id = ls.store_id 
      AND cws.location_type = 'central_warehouse'
  )
GROUP BY rs.fc_id
ON CONFLICT DO NOTHING;
-- (use INSERT with aggregation to merge both sources)
```

Then modify `tmp_cw`:
```sql
CREATE TEMP TABLE tmp_cw ON COMMIT DROP AS
SELECT sp.fc_id, 
  GREATEST(0, SUM(...) - COALESCE(ded.deducted, 0))::integer AS available
FROM inv_state_positions sp
JOIN tmp_latest_snap ls ON ...
JOIN inv_stores s ON ... location_type='central_warehouse'
LEFT JOIN tmp_pending_deductions ded ON ded.fc_id = sp.fc_id
WHERE sp.tenant_id = p_tenant_id 
GROUP BY sp.fc_id, ded.deducted
HAVING GREATEST(0, SUM(...) - COALESCE(ded.deducted, 0)) > 0;
```

Same pattern applied to `fn_rebalance_engine` — modify `cw_stock` CTE.

#### 2. Frontend: `useSourceOnHand.ts`
Add a new query after fetching positions to subtract approved-but-not-synced quantities:

- Fetch `inv_allocation_recommendations` where `status = 'approved'` and `approved_at > max snapshot_date` for CW stores
- Fetch `inv_rebalance_suggestions` where `status = 'approved'`, `from_location_type = 'central_warehouse'`, same time filter
- Subtract from the position map for CW store keys before returning

#### 3. Frontend: `useApproveRebalance.ts`
Add cache invalidation after approve:
```typescript
queryClient.invalidateQueries({ queryKey: ['inv-source-dest-on-hand'] });
```

### Luồng tự healing

```text
T0: Sync chạy → snapshot_date = 2026-03-08 → CW stock = 50
T1: Approve 10 units → approved_at = 2026-03-08 15:00
T2: Engine/UI: available = 50 - 10 = 40 ✅ (approved_at > snapshot_date)
T3: Sync chạy lại → snapshot_date = 2026-03-09 → CW stock = 40 (đã xuất thật)
T4: Engine/UI: approved_at < snapshot_date → deduction = 0 → available = 40 ✅ No double deduction
```

### Files
- 1 SQL migration (update both `fn_allocation_engine` + `fn_rebalance_engine`)
- `src/hooks/inventory/useSourceOnHand.ts` — subtract pending deductions for CW
- `src/hooks/inventory/useApproveRebalance.ts` — invalidate on-hand cache
- `.lovable/plan.md` — update status

