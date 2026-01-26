# Cross-Module Data Flywheel - Test Checklist

> Last Updated: 2026-01-26  
> Version: 1.0  
> Status: **READY FOR TESTING**

---

## 1. Unit Test Commands

```bash
# Run all tests
bun run test

# Run cross-module tests only
bun run test src/test/cross-module

# Run with coverage
bun run test --coverage

# Run specific test file
bun run test src/test/cross-module/types.test.ts
```

---

## 2. Integration Test Checklist

### 2.1 Independent Operation Guarantee

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1 | FDP works without CDP data | 1. Clear CDP revenue forecasts<br>2. Navigate to FDP Dashboard | Shows ESTIMATED badge, uses benchmark costs | ⬜ |
| 2 | MDP works without FDP locked costs | 1. Clear fdp_locked_costs for current month<br>2. Navigate to MDP Campaign | Falls back to 55% COGS, 12% Fees with ESTIMATED badge | ⬜ |
| 3 | CDP works without MDP attribution | 1. Clear cdp_customer_cohort_cac<br>2. Navigate to CDP LTV | Uses internal CAC estimate (150,000 VND) | ⬜ |
| 4 | Control Tower works with partial data | 1. Clear some cross-module tables<br>2. Navigate to Control Tower | Aggregates available signals only, no errors | ⬜ |

### 2.2 Cross-Module Data Flow

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1 | FDP → MDP: Locked Costs | 1. Lock costs in FDP (set is_locked=true)<br>2. Navigate to MDP Profit ROAS | MDP shows LOCKED badge with FDP data, green styling | ⬜ |
| 2 | CDP → MDP: Segment LTV | 1. Generate segment LTV in CDP<br>2. Push to MDP<br>3. Check MDP budget allocation | MDP receives segment priorities with confidence level | ⬜ |
| 3 | MDP → CDP: Attribution | 1. Record attribution in MDP<br>2. Push to CDP<br>3. Check CDP cohort CAC | CDP shows cohort CAC with "Từ MDP ✓" badge | ⬜ |
| 4 | FDP → CDP: Actual Revenue | 1. Record actual revenue in FDP<br>2. Push to CDP<br>3. Check CDP equity calibration | CDP recalibrates equity with FDP actual data | ⬜ |
| 5 | CDP → FDP: Revenue Forecast | 1. Create What-If scenario in CDP<br>2. Push to FDP<br>3. Check FDP monthly plans | FDP receives monthly allocation breakdown | ⬜ |
| 6 | Daily Sync | 1. Run cross_module_run_daily_sync()<br>2. Check all modules | All modules updated, Control Tower queue populated | ⬜ |

### 2.3 UI Component Behavior

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1 | LOCKED badge appearance | Green background, Lock icon, "Đã xác thực" text | ⬜ |
| 2 | OBSERVED badge appearance | Blue background, Database icon, "Dữ liệu thực" text | ⬜ |
| 3 | ESTIMATED badge appearance | Amber background, AlertTriangle icon, "Ước tính" text | ⬜ |
| 4 | ESTIMATED upgrade prompt | Lightbulb icon + "Nâng cấp ngay" button visible | ⬜ |
| 5 | Tooltip on hover | Shows data source and module origin | ⬜ |
| 6 | CrossModuleFlow visualization | Arrow connecting modules with confidence badge | ⬜ |

### 2.4 Error Handling

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1 | RPC function error | 1. Simulate RPC error<br>2. Check hook response | Returns ESTIMATED fallback, no crash | ⬜ |
| 2 | Network timeout | 1. Simulate slow network<br>2. Check loading state | Shows loading indicator, then fallback | ⬜ |
| 3 | Invalid data | 1. Insert invalid data in cross-module table<br>2. Check consumer module | Handles gracefully, uses fallback | ⬜ |

---

## 3. Database SQL Tests

### 3.1 Fallback Chain Test

```sql
-- Run in Supabase SQL Editor
DO $$
DECLARE
  v_result RECORD;
  v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Test 1: No locked costs -> should return ESTIMATED
  DELETE FROM fdp_locked_costs WHERE tenant_id = v_tenant_id AND year = 2026 AND month = 1;
  
  SELECT * INTO v_result 
  FROM mdp_get_costs_for_roas(v_tenant_id, 2026, 1);
  
  IF v_result.confidence_level != 'ESTIMATED' THEN
    RAISE EXCEPTION 'Test 1 FAILED: Expected ESTIMATED, got %', v_result.confidence_level;
  END IF;
  
  RAISE NOTICE 'Test 1 PASSED: Returns ESTIMATED when no locked costs';
  
  -- Test 2: Insert locked costs -> should return LOCKED
  INSERT INTO fdp_locked_costs (tenant_id, year, month, avg_cogs_percent, avg_fee_percent, is_locked)
  VALUES (v_tenant_id, 2026, 1, 48.5, 10.2, true)
  ON CONFLICT (tenant_id, year, month) DO UPDATE SET
    avg_cogs_percent = 48.5,
    avg_fee_percent = 10.2,
    is_locked = true;
  
  SELECT * INTO v_result 
  FROM mdp_get_costs_for_roas(v_tenant_id, 2026, 1);
  
  IF v_result.confidence_level != 'LOCKED' THEN
    RAISE EXCEPTION 'Test 2 FAILED: Expected LOCKED, got %', v_result.confidence_level;
  END IF;
  
  IF v_result.cogs_percent != 48.5 THEN
    RAISE EXCEPTION 'Test 2 FAILED: Expected COGS 48.5, got %', v_result.cogs_percent;
  END IF;
  
  RAISE NOTICE 'Test 2 PASSED: Returns LOCKED with correct values';
  
  -- Cleanup
  DELETE FROM fdp_locked_costs WHERE tenant_id = v_tenant_id AND year = 2026 AND month = 1;
  
  RAISE NOTICE '✅ All fallback chain tests passed!';
END $$;
```

### 3.2 Cross-Module Sync Test

```sql
-- Run in Supabase SQL Editor
DO $$
DECLARE
  v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  v_count INT;
BEGIN
  -- Run daily sync
  PERFORM cross_module_run_daily_sync(v_tenant_id);
  
  -- Verify Control Tower queue was populated
  SELECT COUNT(*) INTO v_count
  FROM control_tower_priority_queue
  WHERE tenant_id = v_tenant_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Control Tower queue items created: %', v_count;
  RAISE NOTICE '✅ Cross-module sync test completed!';
END $$;
```

### 3.3 Variance Detection Test

```sql
-- Run in Supabase SQL Editor
DO $$
DECLARE
  v_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  v_count INT;
BEGIN
  -- Run variance detection
  PERFORM detect_cross_domain_variance(v_tenant_id);
  
  -- Check alerts generated
  SELECT COUNT(*) INTO v_count
  FROM cross_domain_variance_alerts
  WHERE tenant_id = v_tenant_id
    AND status = 'open';
  
  RAISE NOTICE 'Open variance alerts: %', v_count;
  RAISE NOTICE '✅ Variance detection test completed!';
END $$;
```

---

## 4. Test Data Setup

### 4.1 Create Test Locked Costs

```sql
INSERT INTO fdp_locked_costs (
  tenant_id, year, month, 
  total_cogs, total_platform_fees, total_marketing_spend,
  avg_cogs_percent, avg_fee_percent, avg_cac,
  is_locked, locked_by
)
VALUES (
  '11111111-1111-1111-1111-111111111111', 2026, 1,
  500000000, 100000000, 50000000,
  48.5, 10.2, 180000,
  true, 'test-user'
);
```

### 4.2 Create Test Attribution Data

```sql
INSERT INTO cdp_customer_cohort_cac (
  tenant_id, cohort_month, acquisition_channel,
  total_spend, new_customers, cac_per_customer,
  source_module, confidence_level
)
VALUES (
  '11111111-1111-1111-1111-111111111111', '2026-01', 'facebook',
  15000000, 75, 200000,
  'MDP', 'LOCKED'
);
```

### 4.3 Create Test Segment LTV

```sql
INSERT INTO cdp_segment_ltv_for_mdp (
  tenant_id, segment_name, segment_type,
  avg_ltv, customer_count, priority_score,
  confidence_level
)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Platinum', 'tier', 5500000, 120, 95, 'OBSERVED'),
  ('11111111-1111-1111-1111-111111111111', 'Gold', 'tier', 2800000, 350, 80, 'OBSERVED'),
  ('11111111-1111-1111-1111-111111111111', 'REST', 'tier', 800000, 1500, 40, 'OBSERVED');
```

---

## 5. Cleanup After Testing

```sql
-- Remove test data (run after testing)
DELETE FROM fdp_locked_costs WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND year = 2026 AND month = 1;
DELETE FROM cdp_customer_cohort_cac WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND cohort_month = '2026-01';
DELETE FROM cdp_segment_ltv_for_mdp WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM cross_domain_variance_alerts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND created_at > NOW() - INTERVAL '1 hour';
DELETE FROM control_tower_priority_queue WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 6. Test Results Summary

| Category | Total | Passed | Failed | Pending |
|----------|-------|--------|--------|---------|
| Unit Tests | - | - | - | - |
| Integration Tests | 15 | - | - | 15 |
| Database Tests | 3 | - | - | 3 |
| **Total** | **18+** | **-** | **-** | **18** |

---

## 7. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| PM | | | |
