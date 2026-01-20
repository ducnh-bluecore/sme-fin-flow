-- ============================================================
-- BLUECORE FDP - ML GOVERNANCE TEST DATA GENERATOR
-- 1 Year of Realistic Data (2025-01-01 to 2025-12-31)
-- ============================================================
-- 
-- This script generates comprehensive test data for:
-- - ML predictions with varying confidence levels
-- - ML performance degradation simulation (95% → 85% accuracy)
-- - ML drift signals at critical thresholds
-- - Approval workflows with various outcomes
-- - Enterprise policies for governance testing
--
-- Run this AFTER the constraint migrations are applied.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. CLEANUP EXISTING TEST DATA (OPTIONAL)
-- ============================================================
-- Uncomment to clean before re-running

-- DELETE FROM public.approval_decisions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.approval_requests WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.ml_drift_signals WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.ml_performance_snapshots WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.ml_prediction_logs WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.reconciliation_ml_predictions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.enterprise_policies WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.tenant_ml_settings WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.reconciliation_suggestions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.profiles WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.tenants WHERE id = 'e0000000-0000-0000-0000-000000000001';


-- ============================================================
-- 1. CREATE TEST TENANT & USERS
-- ============================================================

INSERT INTO public.tenants (id, name, slug, created_at)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'ML Governance Test Corp',
  'ml-gov-test',
  '2024-12-01 00:00:00+07'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Create 5 test user profiles
INSERT INTO public.profiles (id, tenant_id, role, display_name, created_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'e0000000-0000-0000-0000-000000000001', 'cfo', 'CFO Test User', '2024-12-01'),
  ('e2222222-2222-2222-2222-222222222222', 'e0000000-0000-0000-0000-000000000001', 'finance_manager', 'Finance Manager A', '2024-12-01'),
  ('e3333333-3333-3333-3333-333333333333', 'e0000000-0000-0000-0000-000000000001', 'finance_manager', 'Finance Manager B', '2024-12-01'),
  ('e4444444-4444-4444-4444-444444444444', 'e0000000-0000-0000-0000-000000000001', 'accountant', 'Accountant A', '2024-12-01'),
  ('e5555555-5555-5555-5555-555555555555', 'e0000000-0000-0000-0000-000000000001', 'accountant', 'Accountant B', '2024-12-01')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;


-- ============================================================
-- 2. INITIALIZE TENANT ML SETTINGS
-- ============================================================
-- Start with ML enabled, will simulate kill-switch events in history

INSERT INTO public.tenant_ml_settings (
  tenant_id, ml_enabled, ml_status, ml_model_version, 
  min_confidence_threshold, created_at, updated_at
)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  true,
  'ACTIVE',
  'v2.2',  -- Latest version by end of 2025
  90.00,
  '2025-01-01 00:00:00+07',
  '2025-12-31 23:59:59+07'
)
ON CONFLICT (tenant_id) DO UPDATE SET 
  ml_enabled = true,
  ml_status = 'ACTIVE',
  ml_model_version = 'v2.2';


-- ============================================================
-- 3. CREATE TEST RECONCILIATION SUGGESTIONS
-- ============================================================
-- These are the base records that ML predictions reference

INSERT INTO public.reconciliation_suggestions (
  id, tenant_id, transaction_id, invoice_id, match_score, 
  match_type, status, created_at
)
SELECT
  ('e' || lpad((row_number() OVER ())::text, 7, '0') || '-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::uuid,
  'e0000000-0000-0000-0000-000000000001',
  gen_random_uuid(),
  gen_random_uuid(),
  (50 + random() * 50)::numeric(5,2),  -- Match score 50-100
  CASE (random() * 3)::int
    WHEN 0 THEN 'exact'
    WHEN 1 THEN 'partial'
    ELSE 'fuzzy'
  END,
  CASE (random() * 4)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'approved'
    WHEN 2 THEN 'rejected'
    ELSE 'applied'
  END,
  '2025-01-01'::timestamp + (random() * 365 * interval '1 day')
FROM generate_series(1, 200) AS s(i)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. GENERATE ML PREDICTIONS (~1000 records)
-- ============================================================
-- Distribution: 60% high (80-100), 25% medium (50-79), 15% low (0-49)
-- Model versions: v2.0 (Jan-May), v2.1 (Jun-Sep), v2.2 (Oct-Dec)

INSERT INTO public.reconciliation_ml_predictions (
  id, tenant_id, suggestion_id, model_version,
  predicted_confidence, final_confidence, explanation,
  is_latest, created_at
)
SELECT
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  -- Reference existing suggestions (cycle through them)
  ('e' || lpad(((i % 200) + 1)::text, 7, '0') || '-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::uuid,
  -- Model version based on date
  CASE 
    WHEN prediction_date < '2025-06-01' THEN 'v2.0'
    WHEN prediction_date < '2025-10-01' THEN 'v2.1'
    ELSE 'v2.2'
  END,
  -- Predicted confidence with realistic distribution
  CASE 
    WHEN random() < 0.60 THEN (80 + random() * 20)::numeric(5,2)  -- 60% high
    WHEN random() < 0.85 THEN (50 + random() * 30)::numeric(5,2)  -- 25% medium
    ELSE (random() * 50)::numeric(5,2)  -- 15% low
  END,
  -- Final confidence (slightly adjusted from predicted)
  CASE 
    WHEN random() < 0.60 THEN (80 + random() * 20)::numeric(5,2)
    WHEN random() < 0.85 THEN (50 + random() * 30)::numeric(5,2)
    ELSE (random() * 50)::numeric(5,2)
  END,
  -- Explanation with feature weights
  jsonb_build_object(
    'exact_amount', (random() * 0.4)::numeric(4,3),
    'customer_match', (random() * 0.35)::numeric(4,3),
    'date_proximity', (random() * 0.25)::numeric(4,3),
    'reference_match', (random() * 0.2)::numeric(4,3),
    'amount_delta', (random() * 0.15)::numeric(4,3)
  ),
  -- Only latest prediction per suggestion (simplify by setting all to true, trigger handles demotion)
  true,
  prediction_date
FROM (
  SELECT 
    i,
    ('2025-01-01'::timestamp + (random() * 365 * interval '1 day'))::timestamp AS prediction_date
  FROM generate_series(1, 1000) AS s(i)
) AS dates
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. ML PERFORMANCE SNAPSHOTS (12 Monthly Records)
-- ============================================================
-- Simulates ML accuracy degradation from 95% to 85% over 12 months
-- This is realistic model decay without retraining

INSERT INTO public.ml_performance_snapshots (
  id, tenant_id, model_version, snapshot_date,
  accuracy, calibration_error, false_auto_rate, guardrail_block_rate,
  total_predictions, correct_predictions, false_positives, false_negatives,
  created_at
)
VALUES
  -- January 2025: Fresh model, high accuracy
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.0', '2025-01-31',
   95.20, 2.10, 0.50, 8.30, 850, 809, 4, 37, '2025-01-31 23:59:00+07'),
  
  -- February 2025: Slight decline
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.0', '2025-02-28',
   94.80, 2.30, 0.60, 9.10, 920, 872, 6, 42, '2025-02-28 23:59:00+07'),
  
  -- March 2025: First drift signals appearing
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.0', '2025-03-31',
   93.50, 2.80, 0.80, 10.20, 1050, 982, 8, 60, '2025-03-31 23:59:00+07'),
  
  -- April 2025: Kill-switch triggered (accuracy dropped)
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.0', '2025-04-30',
   92.10, 3.50, 1.20, 12.50, 780, 718, 9, 53, '2025-04-30 23:59:00+07'),
  
  -- May 2025: Recovery after fixes
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.0', '2025-05-31',
   90.80, 4.20, 1.80, 15.30, 890, 808, 16, 66, '2025-05-31 23:59:00+07'),
  
  -- June 2025: New model version deployed
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.1', '2025-06-30',
   89.50, 4.80, 2.30, 18.10, 1100, 985, 25, 90, '2025-06-30 23:59:00+07'),
  
  -- July 2025: Accuracy continues to decline
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.1', '2025-07-31',
   88.20, 5.50, 2.80, 20.50, 1200, 1058, 34, 108, '2025-07-31 23:59:00+07'),
  
  -- August 2025: Stabilizing but lower
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.1', '2025-08-31',
   87.50, 5.80, 3.00, 21.20, 1150, 1006, 35, 109, '2025-08-31 23:59:00+07'),
  
  -- September 2025: Continued decay
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.1', '2025-09-30',
   86.80, 6.20, 3.30, 22.50, 1080, 937, 36, 107, '2025-09-30 23:59:00+07'),
  
  -- October 2025: New version v2.2 deployed
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.2', '2025-10-31',
   86.20, 6.50, 3.50, 23.10, 1250, 1078, 44, 128, '2025-10-31 23:59:00+07'),
  
  -- November 2025: Slight improvement with new version
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.2', '2025-11-30',
   85.50, 6.80, 3.80, 24.00, 1180, 1009, 45, 126, '2025-11-30 23:59:00+07'),
  
  -- December 2025: End of year baseline
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 'v2.2', '2025-12-31',
   85.00, 7.00, 4.00, 25.00, 1300, 1105, 52, 143, '2025-12-31 23:59:00+07')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 6. ML DRIFT SIGNALS (~20 Events)
-- ============================================================
-- Drift signals correlate with accuracy drops

INSERT INTO public.ml_drift_signals (
  id, tenant_id, drift_type, severity, metric_name,
  current_value, baseline_value, delta_percent,
  detected_at, acknowledged_at, acknowledged_by, notes, created_at
)
VALUES
  -- March: First signs of calibration drift
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001', 
   'CONFIDENCE_CALIBRATION', 'medium', 'calibration_error',
   2.80, 2.10, 33.33, '2025-03-15 14:30:00+07', NULL, NULL, 
   'Calibration error increasing, monitor closely', '2025-03-15 14:30:00+07'),
  
  -- March: Amount distribution shift
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'FEATURE_DISTRIBUTION', 'low', 'amount_delta',
   0.18, 0.12, 50.00, '2025-03-22 10:15:00+07', '2025-03-22 16:00:00+07',
   'e2222222-2222-2222-2222-222222222222', 'Seasonal pattern, expected', '2025-03-22 10:15:00+07'),
  
  -- April: CRITICAL - Accuracy drop triggers kill-switch consideration
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'OUTCOME_SHIFT', 'high', 'accuracy',
   92.10, 95.20, -3.25, '2025-04-10 09:00:00+07', '2025-04-10 09:30:00+07',
   'e1111111-1111-1111-1111-111111111111', 'CFO reviewed, monitoring increased', '2025-04-10 09:00:00+07'),
  
  -- April: CRITICAL - False auto rate breach
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'AUTOMATION_RISK', 'critical', 'false_auto_rate',
   1.20, 0.50, 140.00, '2025-04-12 11:45:00+07', '2025-04-12 12:00:00+07',
   'e1111111-1111-1111-1111-111111111111', 'KILL-SWITCH ACTIVATED - False auto rate > 1%', '2025-04-12 11:45:00+07'),
  
  -- April: Guardrail block rate spike
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'GUARDRAIL_IMPACT', 'high', 'guardrail_block_rate',
   12.50, 8.30, 50.60, '2025-04-15 08:30:00+07', '2025-04-16 10:00:00+07',
   'e2222222-2222-2222-2222-222222222222', 'Related to accuracy drop', '2025-04-15 08:30:00+07'),
  
  -- May: Recovery signal
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'OUTCOME_SHIFT', 'medium', 'accuracy',
   90.80, 92.10, -1.41, '2025-05-20 14:00:00+07', '2025-05-20 15:30:00+07',
   'e2222222-2222-2222-2222-222222222222', 'Stabilizing after parameter adjustment', '2025-05-20 14:00:00+07'),
  
  -- June: New model version deployed, fresh baseline
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'MODEL_UPDATE', 'info', 'model_version',
   NULL, NULL, NULL, '2025-06-01 00:00:00+07', '2025-06-01 00:00:00+07',
   'e1111111-1111-1111-1111-111111111111', 'v2.1 deployed, resetting baseline', '2025-06-01 00:00:00+07'),
  
  -- July: Feature drift detected
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'FEATURE_DISTRIBUTION', 'medium', 'customer_match',
   0.28, 0.35, -20.00, '2025-07-08 16:20:00+07', NULL, NULL,
   'Customer matching patterns changing', '2025-07-08 16:20:00+07'),
  
  -- July: Calibration error rising
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'CONFIDENCE_CALIBRATION', 'medium', 'calibration_error',
   5.50, 4.80, 14.58, '2025-07-25 11:00:00+07', '2025-07-26 09:00:00+07',
   'e3333333-3333-3333-3333-333333333333', 'Within acceptable range', '2025-07-25 11:00:00+07'),
  
  -- August: False auto rate warning
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'AUTOMATION_RISK', 'high', 'false_auto_rate',
   3.00, 2.80, 7.14, '2025-08-18 10:30:00+07', '2025-08-18 14:00:00+07',
   'e2222222-2222-2222-2222-222222222222', 'Elevated but not critical', '2025-08-18 10:30:00+07'),
  
  -- September: Accuracy continues decline
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'OUTCOME_SHIFT', 'high', 'accuracy',
   86.80, 87.50, -0.80, '2025-09-10 09:15:00+07', '2025-09-10 11:00:00+07',
   'e1111111-1111-1111-1111-111111111111', 'Scheduled v2.2 deployment for October', '2025-09-10 09:15:00+07'),
  
  -- September: High calibration error
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'CONFIDENCE_CALIBRATION', 'high', 'calibration_error',
   6.20, 5.80, 6.90, '2025-09-22 15:45:00+07', NULL, NULL,
   'Need to address in v2.2', '2025-09-22 15:45:00+07'),
  
  -- October: v2.2 deployed
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'MODEL_UPDATE', 'info', 'model_version',
   NULL, NULL, NULL, '2025-10-01 00:00:00+07', '2025-10-01 00:00:00+07',
   'e1111111-1111-1111-1111-111111111111', 'v2.2 deployed with improved calibration', '2025-10-01 00:00:00+07'),
  
  -- October: Minor feature drift
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'FEATURE_DISTRIBUTION', 'low', 'date_proximity',
   0.22, 0.25, -12.00, '2025-10-15 13:30:00+07', '2025-10-15 14:00:00+07',
   'e3333333-3333-3333-3333-333333333333', 'Expected Q4 pattern', '2025-10-15 13:30:00+07'),
  
  -- November: Accuracy stabilizing
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'OUTCOME_SHIFT', 'medium', 'accuracy',
   85.50, 86.20, -0.81, '2025-11-12 10:00:00+07', '2025-11-12 11:30:00+07',
   'e2222222-2222-2222-2222-222222222222', 'Slight decline, monitoring', '2025-11-12 10:00:00+07'),
  
  -- November: Guardrail impact stable
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'GUARDRAIL_IMPACT', 'medium', 'guardrail_block_rate',
   24.00, 23.10, 3.90, '2025-11-25 09:45:00+07', '2025-11-25 10:30:00+07',
   'e3333333-3333-3333-3333-333333333333', 'Expected range', '2025-11-25 09:45:00+07'),
  
  -- December: Year-end status
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'OUTCOME_SHIFT', 'medium', 'accuracy',
   85.00, 85.50, -0.58, '2025-12-20 14:00:00+07', NULL, NULL,
   'Year-end review scheduled', '2025-12-20 14:00:00+07'),
  
  -- December: Final calibration check
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'CONFIDENCE_CALIBRATION', 'medium', 'calibration_error',
   7.00, 6.80, 2.94, '2025-12-28 16:00:00+07', NULL, NULL,
   'Within Q4 expected range', '2025-12-28 16:00:00+07')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 7. ENTERPRISE POLICIES (6 Policies)
-- ============================================================

INSERT INTO public.enterprise_policies (
  id, tenant_id, policy_type, policy_name, description,
  conditions, required_approvals, approver_roles, is_active, created_at
)
VALUES
  -- Auto-reconciliation medium threshold
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'AUTO_RECONCILIATION', 'Auto-Recon Medium', 'Requires 1 approval for auto-reconciliation > 50M VND',
   '{"amount_threshold": 50000000, "confidence_min": 90}'::jsonb,
   1, ARRAY['finance_manager', 'cfo'], true, '2025-01-01'),
  
  -- Auto-reconciliation high threshold
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'AUTO_RECONCILIATION', 'Auto-Recon High', 'Requires 2 approvals for auto-reconciliation > 100M VND',
   '{"amount_threshold": 100000000, "confidence_min": 95}'::jsonb,
   2, ARRAY['finance_manager', 'cfo'], true, '2025-01-01'),
  
  -- Void reconciliation
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'VOID_RECONCILIATION', 'Void Any Reconciliation', 'Requires 1 approval to void any reconciliation',
   '{"any": true}'::jsonb,
   1, ARRAY['finance_manager', 'cfo'], true, '2025-01-01'),
  
  -- ML enablement toggle
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'ML_SETTINGS', 'ML Enable/Disable', 'Requires 2 approvals to toggle ML on/off',
   '{"action": ["enable", "disable"]}'::jsonb,
   2, ARRAY['cfo'], true, '2025-01-01'),
  
  -- Large payment approval
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'LARGE_PAYMENT', 'Large Payment Approval', 'Requires 2 approvals for payments > 200M VND',
   '{"amount_threshold": 200000000}'::jsonb,
   2, ARRAY['finance_manager', 'cfo'], true, '2025-01-01'),
  
  -- Critical exception resolution
  (gen_random_uuid(), 'e0000000-0000-0000-0000-000000000001',
   'EXCEPTION_RESOLUTION', 'Critical Exception', 'Requires 1 approval for critical exceptions',
   '{"exception_type": "critical", "severity": "high"}'::jsonb,
   1, ARRAY['finance_manager', 'cfo'], true, '2025-01-01')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 8. APPROVAL REQUESTS (~50 Records)
-- ============================================================
-- Distribution: 30 approved (single), 10 approved (multi), 5 rejected, 3 pending, 2 expired

-- Get policy IDs for reference
DO $$
DECLARE
  v_policy_auto_med uuid;
  v_policy_auto_high uuid;
  v_policy_void uuid;
  v_policy_ml uuid;
  v_policy_payment uuid;
  v_policy_exception uuid;
BEGIN
  -- Get policy IDs
  SELECT id INTO v_policy_auto_med FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'Auto-Recon Medium' LIMIT 1;
  SELECT id INTO v_policy_auto_high FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'Auto-Recon High' LIMIT 1;
  SELECT id INTO v_policy_void FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'Void Any Reconciliation' LIMIT 1;
  SELECT id INTO v_policy_ml FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'ML Enable/Disable' LIMIT 1;
  SELECT id INTO v_policy_payment FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'Large Payment Approval' LIMIT 1;
  SELECT id INTO v_policy_exception FROM public.enterprise_policies 
    WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001' AND policy_name = 'Critical Exception' LIMIT 1;

  -- Insert approval requests with varied scenarios
  
  -- APPROVED (Single Approver) - 30 records
  FOR i IN 1..30 LOOP
    INSERT INTO public.approval_requests (
      id, tenant_id, policy_id, requested_by, 
      resource_type, resource_id, action, status,
      required_approvals, current_approvals,
      resource_data, created_at, resolved_at
    )
    VALUES (
      ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
      'e0000000-0000-0000-0000-000000000001',
      CASE (i % 3)
        WHEN 0 THEN v_policy_auto_med
        WHEN 1 THEN v_policy_void
        ELSE v_policy_exception
      END,
      CASE (i % 2)
        WHEN 0 THEN 'e4444444-4444-4444-4444-444444444444'  -- Accountant A
        ELSE 'e5555555-5555-5555-5555-555555555555'  -- Accountant B
      END,
      CASE (i % 3)
        WHEN 0 THEN 'reconciliation'
        WHEN 1 THEN 'reconciliation'
        ELSE 'exception'
      END,
      gen_random_uuid(),
      CASE (i % 3)
        WHEN 0 THEN 'auto_apply'
        WHEN 1 THEN 'void'
        ELSE 'resolve'
      END,
      'approved',
      1, 1,
      jsonb_build_object('amount', (50000000 + random() * 50000000)::int),
      '2025-01-01'::timestamp + ((i * 10) * interval '1 day'),
      '2025-01-01'::timestamp + ((i * 10) * interval '1 day') + ((1 + random() * 24) * interval '1 hour')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- APPROVED (Multi Approver) - 10 records
  FOR i IN 31..40 LOOP
    INSERT INTO public.approval_requests (
      id, tenant_id, policy_id, requested_by,
      resource_type, resource_id, action, status,
      required_approvals, current_approvals,
      resource_data, created_at, resolved_at
    )
    VALUES (
      ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
      'e0000000-0000-0000-0000-000000000001',
      CASE (i % 2)
        WHEN 0 THEN v_policy_auto_high
        ELSE v_policy_payment
      END,
      'e4444444-4444-4444-4444-444444444444',
      CASE (i % 2)
        WHEN 0 THEN 'reconciliation'
        ELSE 'payment'
      END,
      gen_random_uuid(),
      'approve',
      'approved',
      2, 2,
      jsonb_build_object('amount', (100000000 + random() * 150000000)::int),
      '2025-02-01'::timestamp + ((i - 30) * 25 * interval '1 day'),
      '2025-02-01'::timestamp + ((i - 30) * 25 * interval '1 day') + ((2 + random() * 36) * interval '1 hour')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- REJECTED - 5 records
  FOR i IN 41..45 LOOP
    INSERT INTO public.approval_requests (
      id, tenant_id, policy_id, requested_by,
      resource_type, resource_id, action, status,
      required_approvals, current_approvals,
      resource_data, created_at, resolved_at
    )
    VALUES (
      ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
      'e0000000-0000-0000-0000-000000000001',
      v_policy_auto_high,
      'e5555555-5555-5555-5555-555555555555',
      'reconciliation',
      gen_random_uuid(),
      'auto_apply',
      'rejected',
      2, 0,
      jsonb_build_object('amount', (150000000 + random() * 100000000)::int, 'reason', 'Documentation incomplete'),
      '2025-03-01'::timestamp + ((i - 40) * 40 * interval '1 day'),
      '2025-03-01'::timestamp + ((i - 40) * 40 * interval '1 day') + ((4 + random() * 20) * interval '1 hour')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- PENDING - 3 records
  FOR i IN 46..48 LOOP
    INSERT INTO public.approval_requests (
      id, tenant_id, policy_id, requested_by,
      resource_type, resource_id, action, status,
      required_approvals, current_approvals,
      resource_data, created_at, expires_at
    )
    VALUES (
      ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
      'e0000000-0000-0000-0000-000000000001',
      v_policy_payment,
      'e4444444-4444-4444-4444-444444444444',
      'payment',
      gen_random_uuid(),
      'approve',
      'pending',
      2, (i - 45),  -- 1 or 2 partial approvals
      jsonb_build_object('amount', (200000000 + random() * 100000000)::int),
      '2025-12-15'::timestamp + ((i - 45) * interval '3 day'),
      '2025-12-31'::timestamp
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- EXPIRED - 2 records
  FOR i IN 49..50 LOOP
    INSERT INTO public.approval_requests (
      id, tenant_id, policy_id, requested_by,
      resource_type, resource_id, action, status,
      required_approvals, current_approvals,
      resource_data, created_at, expires_at
    )
    VALUES (
      ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
      'e0000000-0000-0000-0000-000000000001',
      v_policy_auto_med,
      'e5555555-5555-5555-5555-555555555555',
      'reconciliation',
      gen_random_uuid(),
      'auto_apply',
      'expired',
      1, 0,
      jsonb_build_object('amount', (60000000 + random() * 30000000)::int),
      '2025-06-01'::timestamp + ((i - 48) * 30 * interval '1 day'),
      '2025-06-08'::timestamp + ((i - 48) * 30 * interval '1 day')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;


-- ============================================================
-- 9. APPROVAL DECISIONS (Matching Requests)
-- ============================================================

-- Decisions for single-approver approved requests (30)
INSERT INTO public.approval_decisions (
  id, tenant_id, approval_request_id, decided_by, decision, comment, decided_at
)
SELECT
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  ('a' || lpad(i::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
  CASE (i % 2)
    WHEN 0 THEN 'e2222222-2222-2222-2222-222222222222'  -- Finance Manager A
    ELSE 'e3333333-3333-3333-3333-333333333333'  -- Finance Manager B
  END,
  'approved',
  CASE (i % 5)
    WHEN 0 THEN 'Verified against source documents'
    WHEN 1 THEN 'Amounts match, approved'
    WHEN 2 THEN 'Within tolerance limits'
    WHEN 3 THEN 'Reviewed and approved'
    ELSE 'Standard approval'
  END,
  '2025-01-01'::timestamp + ((i * 10) * interval '1 day') + ((1 + (i % 12)) * interval '1 hour')
FROM generate_series(1, 30) AS s(i)
ON CONFLICT DO NOTHING;

-- Decisions for multi-approver approved requests (10 x 2 = 20 decisions)
INSERT INTO public.approval_decisions (
  id, tenant_id, approval_request_id, decided_by, decision, comment, decided_at
)
SELECT
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  ('a' || lpad((30 + ceil(i/2.0))::int::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
  CASE (i % 2)
    WHEN 1 THEN 'e2222222-2222-2222-2222-222222222222'  -- First approver
    ELSE 'e1111111-1111-1111-1111-111111111111'  -- Second approver (CFO)
  END,
  'approved',
  CASE (i % 2)
    WHEN 1 THEN 'Initial review complete'
    ELSE 'Final approval granted'
  END,
  '2025-02-01'::timestamp + ((ceil(i/2.0) - 1) * 25 * interval '1 day') + ((i * 6) * interval '1 hour')
FROM generate_series(1, 20) AS s(i)
ON CONFLICT DO NOTHING;

-- Decisions for rejected requests (5)
INSERT INTO public.approval_decisions (
  id, tenant_id, approval_request_id, decided_by, decision, comment, decided_at
)
SELECT
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  ('a' || lpad((40 + i)::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
  'e2222222-2222-2222-2222-222222222222',
  'rejected',
  CASE i
    WHEN 1 THEN 'Missing supporting documentation'
    WHEN 2 THEN 'Amount exceeds budget allocation'
    WHEN 3 THEN 'Vendor not in approved list'
    WHEN 4 THEN 'Duplicate request detected'
    ELSE 'Does not meet policy requirements'
  END,
  '2025-03-01'::timestamp + ((i) * 40 * interval '1 day') + ((4 + i * 3) * interval '1 hour')
FROM generate_series(1, 5) AS s(i)
ON CONFLICT DO NOTHING;

-- Partial decisions for pending requests (1-2 approvals each)
INSERT INTO public.approval_decisions (
  id, tenant_id, approval_request_id, decided_by, decision, comment, decided_at
)
SELECT
  gen_random_uuid(),
  'e0000000-0000-0000-0000-000000000001',
  ('a' || lpad((45 + i)::text, 7, '0') || '-0001-0001-0001-000000000001')::uuid,
  'e2222222-2222-2222-2222-222222222222',
  'approved',
  'Awaiting second approval',
  '2025-12-15'::timestamp + ((i) * interval '3 day') + (2 * interval '1 hour')
FROM generate_series(1, 3) AS s(i)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 10. SUMMARY STATISTICS (For Verification)
-- ============================================================

-- Uncomment to verify data generation
/*
SELECT 'tenants' as table_name, COUNT(*) as record_count FROM public.tenants WHERE id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'tenant_ml_settings', COUNT(*) FROM public.tenant_ml_settings WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'reconciliation_suggestions', COUNT(*) FROM public.reconciliation_suggestions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'reconciliation_ml_predictions', COUNT(*) FROM public.reconciliation_ml_predictions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'ml_performance_snapshots', COUNT(*) FROM public.ml_performance_snapshots WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'ml_drift_signals', COUNT(*) FROM public.ml_drift_signals WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'enterprise_policies', COUNT(*) FROM public.enterprise_policies WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'approval_requests', COUNT(*) FROM public.approval_requests WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'approval_decisions', COUNT(*) FROM public.approval_decisions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
*/

COMMIT;

-- ============================================================
-- CLEANUP SCRIPT (Run to remove all test data)
-- ============================================================
/*
BEGIN;
DELETE FROM public.approval_decisions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.approval_requests WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.ml_drift_signals WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.ml_performance_snapshots WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.ml_prediction_logs WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.reconciliation_ml_predictions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.reconciliation_suggestions WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.enterprise_policies WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.tenant_ml_settings WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.profiles WHERE tenant_id = 'e0000000-0000-0000-0000-000000000001';
DELETE FROM public.tenants WHERE id = 'e0000000-0000-0000-0000-000000000001';
COMMIT;
*/
