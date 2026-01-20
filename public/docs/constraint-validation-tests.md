# BLUECORE FDP - Constraint Validation Test Suite

> **Purpose:** Comprehensive test cases for P0-Critical database constraints  
> **Version:** 1.0  
> **Last Updated:** 2025-01-20  

---

## Table of Contents

1. [Pre-requisites](#pre-requisites)
2. [ML Confidence Range Validation Tests](#1-ml-confidence-range-validation-tests)
3. [ML Kill-Switch Enforcement Tests](#2-ml-kill-switch-enforcement-tests)
4. [Self-Approval Prevention Tests](#3-self-approval-prevention-tests)
5. [Test Execution Checklist](#4-test-execution-checklist)

---

## Pre-requisites

### Setup Test Environment

```sql
-- Create test tenant (if not exists)
INSERT INTO public.tenants (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Tenant ML Governance', 'test-ml-gov')
ON CONFLICT (id) DO NOTHING;

-- Create test users
INSERT INTO auth.users (id, email)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b@test.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_c@test.com')
ON CONFLICT (id) DO NOTHING;

-- Initialize tenant_ml_settings
INSERT INTO public.tenant_ml_settings (tenant_id, ml_enabled, ml_status, ml_model_version, min_confidence_threshold)
VALUES ('11111111-1111-1111-1111-111111111111', true, 'ACTIVE', 'v2.0', 90)
ON CONFLICT (tenant_id) DO UPDATE SET ml_enabled = true, ml_status = 'ACTIVE';

-- Create test suggestion for predictions
INSERT INTO public.reconciliation_suggestions (id, tenant_id, transaction_id, invoice_id, match_score)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 
        gen_random_uuid(), gen_random_uuid(), 85.5)
ON CONFLICT (id) DO NOTHING;
```

---

## 1. ML Confidence Range Validation Tests

### 1.1 reconciliation_ml_predictions Table

| Test ID | Field | Value | Expected | Error Message |
|---------|-------|-------|----------|---------------|
| ML-VAL-001 | predicted_confidence | 50 | ✅ PASS | - |
| ML-VAL-002 | predicted_confidence | 0 | ✅ PASS (boundary) | - |
| ML-VAL-003 | predicted_confidence | 100 | ✅ PASS (boundary) | - |
| ML-VAL-004 | predicted_confidence | -10 | ❌ FAIL | `violates check constraint "chk_ml_predicted_confidence_0_100"` |
| ML-VAL-005 | predicted_confidence | 150 | ❌ FAIL | `violates check constraint "chk_ml_predicted_confidence_0_100"` |
| ML-VAL-006 | predicted_confidence | 999 | ❌ FAIL | `violates check constraint "chk_ml_predicted_confidence_0_100"` |
| ML-VAL-007 | final_confidence | 75.5 | ✅ PASS | - |
| ML-VAL-008 | final_confidence | -5 | ❌ FAIL | `violates check constraint "chk_ml_final_confidence_0_100"` |
| ML-VAL-009 | final_confidence | 101 | ❌ FAIL | `violates check constraint "chk_ml_final_confidence_0_100"` |

#### Test SQL: ML-VAL-001 (Valid confidence = 50)

```sql
-- TEST: ML-VAL-001 - Valid predicted_confidence = 50
-- EXPECTED: SUCCESS

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  50.00,
  '{"exact_amount": 0.3, "customer_match": 0.2}'::jsonb
);

-- Verify
SELECT id, predicted_confidence FROM public.reconciliation_ml_predictions 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND predicted_confidence = 50.00
LIMIT 1;
```

#### Test SQL: ML-VAL-002 (Boundary confidence = 0)

```sql
-- TEST: ML-VAL-002 - Boundary predicted_confidence = 0
-- EXPECTED: SUCCESS

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  0.00,
  '{"exact_amount": 0.0, "customer_match": 0.0}'::jsonb
);
```

#### Test SQL: ML-VAL-003 (Boundary confidence = 100)

```sql
-- TEST: ML-VAL-003 - Boundary predicted_confidence = 100
-- EXPECTED: SUCCESS

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  100.00,
  '{"exact_amount": 0.5, "customer_match": 0.5}'::jsonb
);
```

#### Test SQL: ML-VAL-004 (Invalid confidence = -10)

```sql
-- TEST: ML-VAL-004 - Invalid predicted_confidence = -10
-- EXPECTED: FAILURE with constraint violation

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  -10.00,
  '{"exact_amount": 0.3}'::jsonb
);

-- Expected Error:
-- ERROR: new row for relation "reconciliation_ml_predictions" violates check constraint "chk_ml_predicted_confidence_0_100"
-- DETAIL: Failing row contains (..., -10.00, ...).
```

#### Test SQL: ML-VAL-005 (Invalid confidence = 150)

```sql
-- TEST: ML-VAL-005 - Invalid predicted_confidence = 150
-- EXPECTED: FAILURE with constraint violation

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  150.00,
  '{"exact_amount": 0.3}'::jsonb
);

-- Expected Error:
-- ERROR: new row for relation "reconciliation_ml_predictions" violates check constraint "chk_ml_predicted_confidence_0_100"
```

#### Test SQL: ML-VAL-006 (Invalid confidence = 999)

```sql
-- TEST: ML-VAL-006 - Invalid predicted_confidence = 999
-- EXPECTED: FAILURE with constraint violation

INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  999.00,
  '{"exact_amount": 0.3}'::jsonb
);

-- Expected Error:
-- ERROR: new row for relation "reconciliation_ml_predictions" violates check constraint "chk_ml_predicted_confidence_0_100"
```

### 1.2 ml_prediction_logs Table

| Test ID | Field | Value | Expected | Error Message |
|---------|-------|-------|----------|---------------|
| ML-LOG-001 | predicted_confidence | 85.5 | ✅ PASS | - |
| ML-LOG-002 | predicted_confidence | -5 | ❌ FAIL | `violates check constraint "chk_ml_logs_predicted_confidence_0_100"` |
| ML-LOG-003 | final_confidence | 92.3 | ✅ PASS | - |
| ML-LOG-004 | final_confidence | 105 | ❌ FAIL | `violates check constraint "chk_ml_logs_final_confidence_0_100"` |

#### Test SQL: ML-LOG-002 (Invalid log confidence = -5)

```sql
-- TEST: ML-LOG-002 - Invalid predicted_confidence in logs = -5
-- EXPECTED: FAILURE (both kill-switch and constraint)

-- First ensure ML is enabled
UPDATE public.tenant_ml_settings 
SET ml_enabled = true, ml_status = 'ACTIVE'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO public.ml_prediction_logs (
  tenant_id, suggestion_id, exception_id, model_version, 
  predicted_confidence, final_confidence, features_hash, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  gen_random_uuid(),
  'v2.0',
  -5.00,
  -5.00,
  md5('test'),
  '{}'::jsonb
);

-- Expected Error:
-- ERROR: new row for relation "ml_prediction_logs" violates check constraint "chk_ml_logs_predicted_confidence_0_100"
```

### 1.3 ml_performance_snapshots Table

| Test ID | Field | Value | Expected | Error Message |
|---------|-------|-------|----------|---------------|
| ML-PERF-001 | accuracy | 95.5 | ✅ PASS | - |
| ML-PERF-002 | accuracy | -1 | ❌ FAIL | `violates check constraint "chk_ml_perf_accuracy_0_100"` |
| ML-PERF-003 | accuracy | 101 | ❌ FAIL | `violates check constraint "chk_ml_perf_accuracy_0_100"` |
| ML-PERF-004 | false_auto_rate | 2.5 | ✅ PASS | - |
| ML-PERF-005 | false_auto_rate | 200 | ❌ FAIL | `violates check constraint "chk_ml_perf_false_auto_rate_0_100"` |
| ML-PERF-006 | guardrail_block_rate | 15.0 | ✅ PASS | - |
| ML-PERF-007 | guardrail_block_rate | -10 | ❌ FAIL | `violates check constraint "chk_ml_perf_guardrail_block_rate_0_100"` |
| ML-PERF-008 | calibration_error | 5.2 | ✅ PASS | - |
| ML-PERF-009 | calibration_error | 105 | ❌ FAIL | `violates check constraint "chk_ml_perf_calibration_error_0_100"` |

#### Test SQL: ML-PERF-002 (Invalid accuracy = -1)

```sql
-- TEST: ML-PERF-002 - Invalid accuracy = -1
-- EXPECTED: FAILURE with constraint violation

INSERT INTO public.ml_performance_snapshots (
  tenant_id, model_version, accuracy, false_auto_rate, 
  guardrail_block_rate, calibration_error, snapshot_date
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'v2.0',
  -1.00,  -- Invalid!
  2.5,
  15.0,
  5.2,
  CURRENT_DATE
);

-- Expected Error:
-- ERROR: new row for relation "ml_performance_snapshots" violates check constraint "chk_ml_perf_accuracy_0_100"
```

#### Test SQL: ML-PERF-005 (Invalid false_auto_rate = 200)

```sql
-- TEST: ML-PERF-005 - Invalid false_auto_rate = 200
-- EXPECTED: FAILURE with constraint violation

INSERT INTO public.ml_performance_snapshots (
  tenant_id, model_version, accuracy, false_auto_rate, 
  guardrail_block_rate, calibration_error, snapshot_date
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'v2.0',
  92.0,
  200.00,  -- Invalid!
  15.0,
  5.2,
  CURRENT_DATE
);

-- Expected Error:
-- ERROR: new row for relation "ml_performance_snapshots" violates check constraint "chk_ml_perf_false_auto_rate_0_100"
```

---

## 2. ML Kill-Switch Enforcement Tests

### 2.1 Database Trigger Tests

| Test ID | ml_enabled | ml_status | Action | Expected |
|---------|------------|-----------|--------|----------|
| KS-001 | true | ACTIVE | Insert prediction | ✅ PASS |
| KS-002 | false | ACTIVE | Insert prediction | ❌ FAIL - kill-switch |
| KS-003 | true | DISABLED | Insert prediction | ❌ FAIL - disabled status |
| KS-004 | false | DISABLED | Insert prediction | ❌ FAIL |
| KS-005 | NULL | NULL | Insert prediction | ❌ FAIL - no settings |
| KS-006 | false | - | Direct insert to logs | ❌ FAIL |

#### Test SQL: KS-001 (ML enabled, insert should PASS)

```sql
-- TEST: KS-001 - ML enabled, insert prediction
-- EXPECTED: SUCCESS

-- Setup: Enable ML
UPDATE public.tenant_ml_settings 
SET ml_enabled = true, ml_status = 'ACTIVE'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Test: Insert prediction
INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  88.5,
  '{"exact_amount": 0.4, "customer_match": 0.35}'::jsonb
);

-- Verify: Check ml_prediction_logs has corresponding entry
SELECT COUNT(*) FROM public.ml_prediction_logs 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND suggestion_id = '22222222-2222-2222-2222-222222222222'
  AND predicted_confidence = 88.5;
-- Expected: 1 (sync trigger worked)
```

#### Test SQL: KS-002 (ML disabled via ml_enabled=false)

```sql
-- TEST: KS-002 - ML disabled (ml_enabled = false), insert should FAIL
-- EXPECTED: FAILURE with kill-switch error

-- Setup: Disable ML
UPDATE public.tenant_ml_settings 
SET ml_enabled = false, ml_status = 'ACTIVE'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Test: Attempt insert
INSERT INTO public.reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'v2.0',
  92.0,
  '{"test": true}'::jsonb
);

-- Expected Error:
-- ERROR: ML is disabled for this tenant (kill-switch active)
-- CONTEXT: PL/pgSQL function sync_ml_predictions_to_logs() ...

-- Cleanup
UPDATE public.tenant_ml_settings SET ml_enabled = true WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

#### Test SQL: KS-003 (ML disabled via ml_status=DISABLED)

```sql
-- TEST: KS-003 - ML status DISABLED, insert should FAIL
-- EXPECTED: FAILURE with disabled status error

-- Setup: Set status to DISABLED
UPDATE public.tenant_ml_settings 
SET ml_enabled = true, ml_status = 'DISABLED'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Test: Attempt insert to ml_prediction_logs directly
INSERT INTO public.ml_prediction_logs (
  tenant_id, suggestion_id, exception_id, model_version, 
  predicted_confidence, final_confidence, features_hash, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  gen_random_uuid(),
  'v2.0',
  90.0,
  90.0,
  md5('test'),
  '{}'::jsonb
);

-- Expected Error:
-- ERROR: ML is disabled for this tenant (ml_status = DISABLED)
-- CONTEXT: PL/pgSQL function enforce_ml_status() ...

-- Cleanup
UPDATE public.tenant_ml_settings SET ml_status = 'ACTIVE' WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

#### Test SQL: KS-006 (Direct log insert with ML disabled)

```sql
-- TEST: KS-006 - Direct insert to logs with ML disabled
-- EXPECTED: FAILURE - trigger blocks

-- Setup
UPDATE public.tenant_ml_settings 
SET ml_enabled = false
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Test
INSERT INTO public.ml_prediction_logs (
  tenant_id, suggestion_id, exception_id, model_version, 
  predicted_confidence, final_confidence, features_hash, explanation
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  gen_random_uuid(),
  'v2.0',
  85.0,
  85.0,
  md5('bypass-attempt'),
  '{}'::jsonb
);

-- Expected Error:
-- ERROR: ML is disabled for this tenant (kill-switch active)

-- Cleanup
UPDATE public.tenant_ml_settings SET ml_enabled = true WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

### 2.2 Edge Function API Tests

| Test ID | ml_enabled | Endpoint | Expected HTTP | Response |
|---------|------------|----------|---------------|----------|
| KS-API-001 | true | POST /ml-reconciliation/predict | 200 | `{ prediction: {...} }` |
| KS-API-002 | false | POST /ml-reconciliation/predict | 403 | `{ error: "ML_DISABLED", ... }` |

#### Test: KS-API-001 (API with ML enabled)

```bash
# TEST: KS-API-001 - API call with ML enabled
# EXPECTED: HTTP 200 with prediction

# First enable ML via SQL:
# UPDATE tenant_ml_settings SET ml_enabled = true WHERE tenant_id = 'YOUR_TENANT_ID';

curl -X POST "https://bwelonzvndchpjnfvawt.supabase.co/functions/v1/ml-reconciliation/predict" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suggestion_id": "22222222-2222-2222-2222-222222222222"
  }'

# Expected Response (HTTP 200):
# {
#   "suggestion_id": "22222222-2222-2222-2222-222222222222",
#   "ml_confidence": 87.5,
#   "combined_confidence": 89.2,
#   "explanation": {...},
#   "model_version": "v2.0"
# }
```

#### Test: KS-API-002 (API with ML disabled)

```bash
# TEST: KS-API-002 - API call with ML disabled (kill-switch active)
# EXPECTED: HTTP 403 Forbidden

# First disable ML via SQL:
# UPDATE tenant_ml_settings SET ml_enabled = false WHERE tenant_id = 'YOUR_TENANT_ID';

curl -X POST "https://bwelonzvndchpjnfvawt.supabase.co/functions/v1/ml-reconciliation/predict" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suggestion_id": "22222222-2222-2222-2222-222222222222"
  }'

# Expected Response (HTTP 403):
# {
#   "error": "ML_DISABLED",
#   "message": "ML predictions are disabled for this tenant",
#   "ml_enabled": false
# }
```

---

## 3. Self-Approval Prevention Tests

### 3.1 Unique Constraint Tests (One Vote Per Approver)

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SA-UQ-001 | User B approves once | ✅ PASS |
| SA-UQ-002 | User B approves same request again | ❌ FAIL - duplicate |
| SA-UQ-003 | User B approves, User C approves | ✅ PASS |

#### Test SQL: SA-UQ-001 & SA-UQ-002 (Duplicate vote prevention)

```sql
-- Setup: Create enterprise policy
INSERT INTO public.enterprise_policies (id, tenant_id, policy_type, conditions, required_approvals, is_active)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'MANUAL_RECONCILIATION',
  '{"amount_threshold": 50000000}'::jsonb,
  1,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Setup: Create approval request by User A
INSERT INTO public.approval_requests (
  id, tenant_id, policy_id, requested_by, resource_type, action, status
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- User A
  'reconciliation',
  'approve',
  'pending'
);

-- TEST: SA-UQ-001 - User B approves (first time)
-- EXPECTED: SUCCESS
INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- User B
  'approved',
  'Looks good'
);

-- TEST: SA-UQ-002 - User B tries to approve AGAIN
-- EXPECTED: FAILURE - duplicate key
INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- User B again!
  'approved',
  'Second approval attempt'
);

-- Expected Error:
-- ERROR: duplicate key value violates unique constraint "ux_approval_one_vote_per_approver"
-- DETAIL: Key (approval_request_id, decided_by)=(44444444-..., bbbbbbbb-...) already exists.
```

#### Test SQL: SA-UQ-003 (Multiple different approvers)

```sql
-- TEST: SA-UQ-003 - User C approves (different user, same request)
-- EXPECTED: SUCCESS

INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'cccccccc-cccc-cccc-cccc-cccccccccccc', -- User C (different!)
  'approved',
  'Also approved'
);

-- Verify: 2 decisions now exist
SELECT COUNT(*) FROM public.approval_decisions 
WHERE approval_request_id = '44444444-4444-4444-4444-444444444444';
-- Expected: 2
```

### 3.2 Self-Approval Trigger Tests

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SA-TR-001 | User A creates request, User A approves | ❌ FAIL - self-approval |
| SA-TR-002 | User A creates request, User B approves | ✅ PASS |
| SA-TR-003 | User A creates request, User B rejects | ✅ PASS |

#### Test SQL: SA-TR-001 (Self-approval blocked)

```sql
-- Setup: Create new request by User A
INSERT INTO public.approval_requests (
  id, tenant_id, policy_id, requested_by, resource_type, action, status
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- User A creates
  'payment',
  'approve',
  'pending'
);

-- TEST: SA-TR-001 - User A tries to approve their OWN request
-- EXPECTED: FAILURE - self-approval not allowed

INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- User A (same as requester!)
  'approved',
  'I approve my own request'
);

-- Expected Error:
-- ERROR: Self-approval is not allowed
-- CONTEXT: PL/pgSQL function prevent_self_approval() ...
```

#### Test SQL: SA-TR-002 (Cross-approval success)

```sql
-- TEST: SA-TR-002 - User B approves User A's request
-- EXPECTED: SUCCESS

INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- User B (different!)
  'approved',
  'Approved by different user'
);

-- Verify
SELECT decided_by, decision FROM public.approval_decisions 
WHERE approval_request_id = '55555555-5555-5555-5555-555555555555';
```

#### Test SQL: SA-TR-003 (Cross-rejection success)

```sql
-- Setup: Create another request
INSERT INTO public.approval_requests (
  id, tenant_id, policy_id, requested_by, resource_type, action, status
)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'reconciliation',
  'void',
  'pending'
);

-- TEST: SA-TR-003 - User B rejects User A's request
-- EXPECTED: SUCCESS

INSERT INTO public.approval_decisions (
  tenant_id, approval_request_id, decided_by, decision, comment
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666666',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'rejected',
  'Does not meet criteria'
);
```

---

## 4. Test Execution Checklist

### Pre-Test Setup

- [ ] Test tenant created
- [ ] Test users exist in auth.users
- [ ] tenant_ml_settings initialized
- [ ] Test suggestion exists for ML prediction tests

### ML Confidence Range Tests

| Test ID | Status | Notes |
|---------|--------|-------|
| ML-VAL-001 | ⬜ | Valid confidence 50 |
| ML-VAL-002 | ⬜ | Boundary 0 |
| ML-VAL-003 | ⬜ | Boundary 100 |
| ML-VAL-004 | ⬜ | Invalid -10 |
| ML-VAL-005 | ⬜ | Invalid 150 |
| ML-VAL-006 | ⬜ | Invalid 999 |
| ML-LOG-002 | ⬜ | Log confidence -5 |
| ML-PERF-002 | ⬜ | Accuracy -1 |
| ML-PERF-005 | ⬜ | False auto rate 200 |

### ML Kill-Switch Tests

| Test ID | Status | Notes |
|---------|--------|-------|
| KS-001 | ⬜ | ML enabled, insert pass |
| KS-002 | ⬜ | ML disabled, insert fail |
| KS-003 | ⬜ | Status DISABLED, fail |
| KS-006 | ⬜ | Direct log insert blocked |
| KS-API-001 | ⬜ | API 200 when enabled |
| KS-API-002 | ⬜ | API 403 when disabled |

### Self-Approval Tests

| Test ID | Status | Notes |
|---------|--------|-------|
| SA-UQ-001 | ⬜ | First approval pass |
| SA-UQ-002 | ⬜ | Duplicate vote blocked |
| SA-UQ-003 | ⬜ | Multiple approvers pass |
| SA-TR-001 | ⬜ | Self-approval blocked |
| SA-TR-002 | ⬜ | Cross-approval pass |
| SA-TR-003 | ⬜ | Cross-rejection pass |

### Post-Test Cleanup

```sql
-- Cleanup test data
DELETE FROM public.approval_decisions WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.approval_requests WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.ml_prediction_logs WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.reconciliation_ml_predictions WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.enterprise_policies WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.reconciliation_suggestions WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.tenant_ml_settings WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.tenants WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Summary

| Category | Total Tests | Pass Required |
|----------|-------------|---------------|
| ML Confidence Validation | 13 | All |
| ML Kill-Switch | 6 | All |
| Self-Approval Prevention | 6 | All |
| **TOTAL** | **25** | **25** |

**Pass Criteria:** All 25 tests must pass for P0 constraints to be considered validated.
