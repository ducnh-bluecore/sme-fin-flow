-- Add Decision Framing columns to early_warning_alerts
ALTER TABLE public.early_warning_alerts 
ADD COLUMN IF NOT EXISTS decision_framing JSONB DEFAULT '{}';

-- decision_framing structure:
-- {
--   "what_goes_wrong": "Specific harm description",
--   "irreversible_date": "2024-01-25",
--   "irreversible_trigger": "Description of point of no return",
--   "cheapest_action": "Lowest cost preventive action",
--   "action_cost_estimate": 0,
--   "action_metric_reference": "FDP: cash_runway | MDP: cm_percent",
--   "decision_owner_role": "CFO | COO | CMO",
--   "decision_owner_reason": "Why this role"
-- }

COMMENT ON COLUMN public.early_warning_alerts.decision_framing IS 
'Decision context: what_goes_wrong, irreversible_date, cheapest_action, decision_owner_role';

-- Update predictive_alert_rules to include decision framing templates
ALTER TABLE public.predictive_alert_rules 
ADD COLUMN IF NOT EXISTS decision_framing_template JSONB DEFAULT '{}';

-- Update existing rules with decision framing templates
UPDATE public.predictive_alert_rules
SET decision_framing_template = '{
  "what_goes_wrong_template": "Không đủ tiền trả lương/nhà cung cấp. Phải vay nóng hoặc delay payment → mất uy tín, phạt trễ hạn.",
  "irreversible_trigger": "Khi cash < 1 tuần payroll + AP due",
  "cheapest_actions": [
    {"action": "Tạm dừng PO mới", "cost": 0, "metric_ref": "FDP: pending_po_amount"},
    {"action": "Đẩy nhanh thu AR overdue", "cost": 0, "metric_ref": "FDP: ar_overdue_amount"},
    {"action": "Delay marketing spend 1 tuần", "cost": 0, "metric_ref": "MDP: weekly_ad_spend"}
  ],
  "decision_owner": {"role": "CFO", "reason": "Cash position là trách nhiệm trực tiếp của CFO"}
}'::JSONB
WHERE rule_code = 'CASH_RUNWAY_DECLINING';

UPDATE public.predictive_alert_rules
SET decision_framing_template = '{
  "what_goes_wrong_template": "SKU bán càng nhiều càng lỗ. Tiền mặt bị khóa trong hàng tồn không sinh lời.",
  "irreversible_trigger": "Khi inventory > 60 ngày bán + margin < 0%",
  "cheapest_actions": [
    {"action": "Dừng reorder SKU này", "cost": 0, "metric_ref": "FDP: pending_po_by_sku"},
    {"action": "Tăng giá bán 5-10%", "cost": 0, "metric_ref": "FDP: unit_price"},
    {"action": "Dừng ads cho SKU này", "cost": 0, "metric_ref": "MDP: sku_ad_spend"}
  ],
  "decision_owner": {"role": "COO", "reason": "Product margin và inventory là trách nhiệm Operations"}
}'::JSONB
WHERE rule_code = 'SKU_MARGIN_EROSION';

UPDATE public.predictive_alert_rules
SET decision_framing_template = '{
  "what_goes_wrong_template": "Cash bị khóa trong platform ads, không thể rút về để xoay vòng. Cash conversion cycle kéo dài.",
  "irreversible_trigger": "Khi locked cash > 50% available cash",
  "cheapest_actions": [
    {"action": "Pause campaigns ROAS < 1.5", "cost": 0, "metric_ref": "MDP: campaign_roas"},
    {"action": "Chuyển budget sang channel settle nhanh", "cost": 0, "metric_ref": "MDP: channel_settlement_days"},
    {"action": "Giảm daily budget 30%", "cost": 0, "metric_ref": "MDP: daily_ad_budget"}
  ],
  "decision_owner": {"role": "CMO", "reason": "Marketing spend allocation là quyết định của CMO"}
}'::JSONB
WHERE rule_code = 'MARKETING_CASH_LOCK';

UPDATE public.predictive_alert_rules
SET decision_framing_template = '{
  "what_goes_wrong_template": "AR aging tăng = cash về chậm. Phải dùng vốn lưu động nhiều hơn, có thể phải vay.",
  "irreversible_trigger": "Khi DSO > 60 ngày hoặc AR overdue > 20% total AR",
  "cheapest_actions": [
    {"action": "Call/email AR overdue > 30 ngày", "cost": 0, "metric_ref": "FDP: ar_aging_30_plus"},
    {"action": "Siết credit terms cho khách mới", "cost": 0, "metric_ref": "FDP: avg_credit_days"},
    {"action": "Offer early payment discount 2%", "cost": "2% of AR", "metric_ref": "FDP: ar_outstanding"}
  ],
  "decision_owner": {"role": "CFO", "reason": "AR collection và credit policy thuộc Finance"}
}'::JSONB
WHERE rule_code = 'DSO_INCREASING';