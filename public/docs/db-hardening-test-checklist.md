# BLUECORE FDP - DB HARDENING TEST CHECKLIST

**Version:** 3.1  
**Date Applied:** 2024-01-20  
**Governance Patch:** P0/P1 DB Hardening Pack

---

## 🔐 ML LAYER TESTS

### Test 1: Predicted Confidence Range (0-100)
```sql
-- Should FAIL with constraint violation
INSERT INTO reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
) VALUES (
  'test-tenant-id', 'test-suggestion-id', 'v2.0', 150, '{}'
);
```
**Expected:** `ERROR: new row violates check constraint "chk_ml_predicted_confidence_0_100"`

### Test 2: Negative Confidence
```sql
-- Should FAIL
INSERT INTO reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
) VALUES (
  'test-tenant-id', 'test-suggestion-id', 'v2.0', -10, '{}'
);
```
**Expected:** `ERROR: new row violates check constraint "chk_ml_predicted_confidence_0_100"`

### Test 3: Kill-Switch Edge Function (403)
```bash
# Set ml_enabled = false for tenant
curl -X POST \
  "${SUPABASE_URL}/functions/v1/ml-reconciliation/predict" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-tenant-id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"suggestionId": "test-id"}'
```
**Expected:** HTTP 403 with `{"error": "ML is disabled (kill-switch active)", "mlEnabled": false, "code": "ML_DISABLED"}`

### Test 4: Kill-Switch DB Trigger
```sql
-- First disable ML for tenant
UPDATE tenant_ml_settings SET ml_enabled = false WHERE tenant_id = 'test-tenant-id';

-- Then try to insert directly to ml_prediction_logs
INSERT INTO ml_prediction_logs (
  tenant_id, suggestion_id, exception_id, model_version, predicted_confidence, explanation
) VALUES (
  'test-tenant-id', 'test-suggestion-id', '00000000-0000-0000-0000-000000000000', 'v2.0', 85, '{}'
);
```
**Expected:** `ERROR: ML is disabled for this tenant (kill-switch active)`

### Test 5: Valid Prediction with Logs Sync
```sql
-- Enable ML first
UPDATE tenant_ml_settings SET ml_enabled = true WHERE tenant_id = 'valid-tenant-id';

-- Insert valid prediction
INSERT INTO reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation
) VALUES (
  'valid-tenant-id', 'valid-suggestion-id', 'v2.0', 85, '{"exact_amount_match": 0.35}'
);

-- Verify log was created
SELECT * FROM ml_prediction_logs 
WHERE tenant_id = 'valid-tenant-id' AND suggestion_id = 'valid-suggestion-id';
```
**Expected:** One row in `ml_prediction_logs` matching the inserted prediction

### Test 6: Unique Latest Prediction
```sql
-- Insert two "latest" predictions for same key
INSERT INTO reconciliation_ml_predictions (
  tenant_id, suggestion_id, model_version, predicted_confidence, explanation, is_latest
) VALUES 
  ('tenant-1', 'suggestion-1', 'v2.0', 80, '{}', true),
  ('tenant-1', 'suggestion-1', 'v2.0', 85, '{}', true);
```
**Expected:** Second insert succeeds, first row has `is_latest = false` (trigger demotes it)

---

## 🛡️ APPROVALS TESTS

### Test 7: Self-Approval Prevention
```sql
-- Create a request
INSERT INTO approval_requests (
  id, tenant_id, policy_id, resource_type, action, requested_by, status
) VALUES (
  'req-1', 'tenant-1', 'policy-1', 'reconciliation', 'approve', 'user-1', 'pending'
);

-- Try to self-approve
INSERT INTO approval_decisions (
  approval_request_id, tenant_id, decided_by, decision
) VALUES (
  'req-1', 'tenant-1', 'user-1', 'approved'
);
```
**Expected:** `ERROR: Self-approval is not allowed`

### Test 8: One Vote Per Approver
```sql
-- First vote
INSERT INTO approval_decisions (
  approval_request_id, tenant_id, decided_by, decision
) VALUES (
  'req-1', 'tenant-1', 'user-2', 'approved'
);

-- Duplicate vote attempt
INSERT INTO approval_decisions (
  approval_request_id, tenant_id, decided_by, decision
) VALUES (
  'req-1', 'tenant-1', 'user-2', 'rejected'
);
```
**Expected:** `ERROR: duplicate key value violates unique constraint "ux_approval_one_vote_per_approver"`

---

## 📋 AUDIT TESTS

### Test 9: Actor Type USER Requires actor_user_id
```sql
INSERT INTO audit_events (
  tenant_id, actor_type, action, resource_type
) VALUES (
  'tenant-1', 'USER', 'create', 'reconciliation'
);
```
**Expected:** `ERROR: new row violates check constraint "chk_audit_valid_actor"`

### Test 10: Actor Type SYSTEM Requires actor_service_id
```sql
INSERT INTO audit_events (
  tenant_id, actor_type, action, resource_type, actor_user_id
) VALUES (
  'tenant-1', 'SYSTEM', 'auto_match', 'reconciliation', '00000000-0000-0000-0000-000000000001'
);
```
**Expected:** `ERROR: new row violates check constraint "chk_audit_valid_actor"`

### Test 11: Valid USER Audit
```sql
INSERT INTO audit_events (
  tenant_id, actor_type, actor_user_id, action, resource_type
) VALUES (
  'tenant-1', 'USER', '00000000-0000-0000-0000-000000000001', 'create', 'invoice'
);
```
**Expected:** Success

### Test 12: Valid SYSTEM Audit
```sql
INSERT INTO audit_events (
  tenant_id, actor_type, actor_service_id, action, resource_type
) VALUES (
  'tenant-1', 'SYSTEM', 'ml-reconciliation-v2.0', 'auto_match', 'reconciliation'
);
```
**Expected:** Success

---

## ✅ SUMMARY

| Test | Category | Constraint/Trigger | Status |
|------|----------|-------------------|--------|
| 1 | ML | `chk_ml_predicted_confidence_0_100` | ⬜ |
| 2 | ML | `chk_ml_predicted_confidence_0_100` | ⬜ |
| 3 | ML | Edge Function Kill-Switch | ⬜ |
| 4 | ML | `trg_enforce_ml_enabled_on_logs` | ⬜ |
| 5 | ML | `trg_sync_ml_predictions_to_logs` | ⬜ |
| 6 | ML | `ux_ml_predictions_latest` | ⬜ |
| 7 | Approvals | `trg_prevent_self_approval` | ⬜ |
| 8 | Approvals | `ux_approval_one_vote_per_approver` | ⬜ |
| 9 | Audit | `chk_audit_valid_actor` | ⬜ |
| 10 | Audit | `chk_audit_valid_actor` | ⬜ |
| 11 | Audit | `chk_audit_valid_actor` | ⬜ |
| 12 | Audit | `chk_audit_valid_actor` | ⬜ |

---

## 🏗️ CONSTRAINTS & TRIGGERS CREATED

### Constraints
- `chk_ml_predicted_confidence_0_100` - ML predictions range [0,100]
- `chk_ml_final_confidence_0_100` - ML final confidence range [0,100]
- `chk_ml_explanation_is_object` - Explanation must be JSON object
- `chk_ml_logs_predicted_confidence_0_100` - ML logs range [0,100]
- `chk_ml_logs_final_confidence_0_100` - ML logs final range [0,100]
- `chk_ml_perf_accuracy_0_100` - Performance accuracy range
- `chk_ml_perf_false_auto_rate_0_100` - False auto rate range
- `chk_ml_perf_guardrail_block_rate_0_100` - Guardrail block rate range
- `chk_audit_valid_actor` - Audit actor type validation

### Unique Indexes
- `ux_ml_predictions_latest` - One latest prediction per (tenant, suggestion, model)
- `ux_approval_one_vote_per_approver` - One vote per (request, approver)

### Triggers
- `trg_sync_ml_predictions_to_logs` - Sync predictions to audit logs
- `trg_enforce_ml_enabled_on_logs` - Kill-switch on direct log inserts
- `trg_prevent_self_approval` - Block self-approval

### Columns Added
- `tenant_ml_settings.ml_enabled` - Kill-switch flag
- `tenant_ml_settings.ml_model_version` - Model version
- `tenant_ml_settings.min_confidence_threshold` - Threshold config
- `reconciliation_ml_predictions.is_latest` - Latest prediction flag
- `audit_events.actor_user_id` - User actor ID
- `audit_events.actor_service_id` - Service actor ID
