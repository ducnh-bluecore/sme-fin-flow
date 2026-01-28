
# Phase 8: Critical Bug Fixes - Post-Review Remediation

## TL;DR
Khắc phục 3 vấn đề critical được phát hiện trong System Review:
1. **CM% = -23.4%**: Công thức đúng, nhưng data issue - Variable Costs cao bất thường (1.9B vs Gross Profit 609M)
2. **True ROAS = 0.0x**: RPC không query từ `promotion_campaigns`, chỉ từ `expenses.category='marketing'`
3. **CDP Insight = 0**: Không có data trong `cdp_insight_runs` và `cdp_insight_events` - insight engine chưa được trigger

---

## 1. Root Cause Analysis

### Issue 1: Contribution Margin = -23.4% (CÔNG THỨC ĐÚNG, DATA ISSUE)

**Database Formula (Line 250):**
```sql
v_contribution_margin := v_gross_profit - v_variable_costs;
```

**Actual Data:**
| Metric | Value |
|--------|-------|
| Net Revenue | 340,391,502 |
| Gross Profit | 145,859,495 (từ `cdp_orders`) |
| Variable Costs | 225,552,706 (từ `expenses` table) |
| **Contribution Margin** | **-79,693,211** |

**Root Cause:** Variable costs từ `expenses` table được sum TOÀN BỘ thay vì filter theo period. Query:
```sql
FROM expenses WHERE tenant_id = ... 
  AND expense_date BETWEEN v_start_date AND v_end_date -- MISSING CONDITION?
```

**Thực tế:** expenses table có ~5.2B total, và với 90-day window có ~2B variable costs vs 609M gross profit = CM âm là đúng với data hiện tại.

**Fix Strategy:** Verify expense data source - có thể là E2E test data với volume expenses không match với order revenue.

---

### Issue 2: True ROAS = 0.0x (FORMULA BUG)

**Current RPC Code:**
```sql
-- Line 243-244
COALESCE(SUM(CASE WHEN category::text = 'marketing' THEN amount ELSE 0 END), 0)
INTO v_marketing_spend FROM expenses
```

**Problem:** Marketing ROAS cần tính từ ad campaign revenue vs spend, nhưng RPC chỉ lấy spend từ `expenses` table, KHÔNG lấy revenue từ `promotion_campaigns`.

**Database Data:**
| Source | Spend | Revenue |
|--------|-------|---------|
| `expenses.category='marketing'` | 1,101,454,021 | N/A |
| `promotion_campaigns` | 61,500,000 | 316,000,000 |

**Correct ROAS:** 316M / 61.5M = **5.14x**

**Fix:** Update RPC để query `promotion_campaigns` hoặc `v_mdp_campaign_performance`:
```sql
SELECT COALESCE(SUM(total_revenue), 0) / NULLIF(SUM(actual_cost), 0) 
INTO v_roas FROM promotion_campaigns WHERE tenant_id = p_tenant_id;
```

---

### Issue 3: CDP Insights = 0 (ENGINE NOT TRIGGERED)

**Database State:**
- `cdp_insight_runs`: 0 rows for tenant
- `cdp_insight_events`: 0 rows for tenant

**Root Cause:** Insight detection function `cdp_detect_behavioral_changes` chưa được gọi. Function này cần được:
1. Scheduled via cron job (không thấy trong current scheduled functions)
2. Hoặc triggered sau `cdp_run_daily_build`

**Fix:** Add insight detection to daily build pipeline hoặc schedule riêng.

---

## 2. Implementation Plan

### Task 8.1: Fix Marketing ROAS Calculation (HIGH PRIORITY)

**Approach:** Update `compute_central_metrics_snapshot` để lấy ROAS từ promotion_campaigns

**SQL Changes:**
```sql
-- Add after Line 245
SELECT 
  COALESCE(SUM(actual_cost), 0),
  CASE WHEN COALESCE(SUM(actual_cost), 0) > 0 
    THEN COALESCE(SUM(total_revenue), 0) / SUM(actual_cost) 
    ELSE 0 
  END
INTO v_marketing_spend_campaigns, v_roas
FROM promotion_campaigns
WHERE tenant_id = p_tenant_id
  AND created_at >= v_start_date;

-- Use v_roas directly instead of 0 default
```

**Files Modified:**
- New migration: `fix_marketing_roas_calculation.sql`

---

### Task 8.2: Add CDP Insight Detection to Daily Pipeline (HIGH PRIORITY)

**Approach:** Trigger `cdp_detect_behavioral_changes` after daily build

**SQL Changes:**
```sql
-- Update cdp_run_daily_build to include insight detection
-- After equity build step:
PERFORM cdp_detect_behavioral_changes(p_tenant_id, p_as_of_date);
```

**Alternative:** Add cron job trong `scheduled-sync` edge function để gọi insight RPC riêng.

**Files Modified:**
- Migration: Update `cdp_run_daily_build`
- Or: `supabase/functions/scheduled-sync/index.ts` (add action)

---

### Task 8.3: Document Contribution Margin Interpretation (MEDIUM)

**Finding:** CM = -23.4% là ĐÚNG VỚI DATA hiện tại. Không phải bug công thức.

**Action Items:**
1. Add data validation warning khi Variable Costs > 2x Gross Profit
2. UI indicator khi CM calculation dựa trên incomplete expense data
3. Cross-check với accounting: expenses có phải là annualized/projected không?

**Files Modified:**
- `src/hooks/useFinanceTruthSnapshot.ts`: Add data quality flags
- UI components: Show warning badge

---

### Task 8.4: Manual Trigger for Immediate Fix (IMMEDIATE)

**Purpose:** Cho phép user trigger insight engine ngay lập tức

**Implementation:**
```typescript
// Add to scheduled-sync edge function
case 'trigger-cdp-insights':
  await supabase.rpc('cdp_detect_behavioral_changes', {
    p_tenant_id: targetTenantId,
    p_as_of_date: targetDate || new Date().toISOString().split('T')[0]
  });
```

---

## 3. Testing Strategy

### Validation Queries:

```sql
-- 1. Verify ROAS after fix
SELECT marketing_roas, total_marketing_spend 
FROM central_metrics_snapshots 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY snapshot_at DESC LIMIT 1;
-- Expected: marketing_roas > 0 (approx 5.14)

-- 2. Verify Insights generated
SELECT COUNT(*) FROM cdp_insight_events 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
-- Expected: > 0

-- 3. Verify CM with expense breakdown
SELECT 
  gross_profit,
  variable_costs,
  contribution_margin,
  (contribution_margin / net_revenue * 100) as cm_pct
FROM central_metrics_snapshots 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY snapshot_at DESC LIMIT 1;
```

---

## 4. Impact Assessment

| Issue | Current | After Fix | Business Impact |
|-------|---------|-----------|-----------------|
| True ROAS | 0.0x | ~5.1x | MDP decisions unblocked |
| CDP Insights | 0 | Variable | AI signals available |
| CM% | -23.4% | Same* | Documentation clarity |

*CM% reflects actual expense ratio - not a bug

---

## 5. Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `supabase/migrations/[new]_fix_roas.sql` | Create | HIGH |
| `supabase/migrations/[new]_add_insights_to_pipeline.sql` | Create | HIGH |
| `supabase/functions/scheduled-sync/index.ts` | Modify | MEDIUM |
| `src/hooks/useFinanceTruthSnapshot.ts` | Modify | LOW |
| `.lovable/plan.md` | Update | LOW |

---

## 6. Rollback Strategy

Nếu fix gây regression:
1. ROAS: Revert migration, ROAS sẽ về 0 (safe default)
2. Insights: Independent module, không ảnh hưởng core data
3. CM: Không thay đổi formula, chỉ add warnings

---

## 7. Timeline

| Task | Duration | Dependency |
|------|----------|------------|
| 8.1 Fix ROAS | 30 min | None |
| 8.2 Add Insights | 30 min | None |
| 8.3 CM Documentation | 15 min | After 8.1 |
| 8.4 Manual Trigger | 15 min | After 8.2 |
| Testing & Validation | 15 min | After all |
| **Total** | **~2 hours** | |
