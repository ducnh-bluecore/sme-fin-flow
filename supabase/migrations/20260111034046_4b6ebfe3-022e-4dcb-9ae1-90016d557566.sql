
-- =====================================================
-- CHUẨN HÓA DỮ LIỆU SEVERITY CHO HỆ THỐNG ALERTS
-- =====================================================

-- 1. Chuẩn hóa bảng `alerts`: high/medium/low → critical/warning/info
UPDATE public.alerts 
SET severity = CASE 
  WHEN severity = 'high' THEN 'critical'
  WHEN severity = 'medium' THEN 'warning'
  WHEN severity = 'low' THEN 'info'
  ELSE severity
END
WHERE severity IN ('high', 'medium', 'low');

-- 2. Chuẩn hóa bảng `intelligent_alert_rules`: medium → warning
UPDATE public.intelligent_alert_rules 
SET severity = 'warning'
WHERE severity = 'medium';

-- 3. Thêm comment để ghi nhận chuẩn severity
COMMENT ON COLUMN public.alerts.severity IS 'Mức độ nghiêm trọng: critical, warning, info';
COMMENT ON COLUMN public.alert_instances.severity IS 'Mức độ nghiêm trọng: critical, warning, info';
COMMENT ON COLUMN public.extended_alert_configs.severity IS 'Mức độ nghiêm trọng: critical, warning, info';
COMMENT ON COLUMN public.intelligent_alert_rules.severity IS 'Mức độ nghiêm trọng: critical, warning, info';

-- 4. Tạo CHECK constraint để đảm bảo tính toàn vẹn dữ liệu trong tương lai
ALTER TABLE public.alerts 
  DROP CONSTRAINT IF EXISTS alerts_severity_check;
ALTER TABLE public.alerts 
  ADD CONSTRAINT alerts_severity_check 
  CHECK (severity IN ('critical', 'warning', 'info'));

ALTER TABLE public.alert_instances 
  DROP CONSTRAINT IF EXISTS alert_instances_severity_check;
ALTER TABLE public.alert_instances 
  ADD CONSTRAINT alert_instances_severity_check 
  CHECK (severity IN ('critical', 'warning', 'info'));

ALTER TABLE public.extended_alert_configs 
  DROP CONSTRAINT IF EXISTS extended_alert_configs_severity_check;
ALTER TABLE public.extended_alert_configs 
  ADD CONSTRAINT extended_alert_configs_severity_check 
  CHECK (severity IN ('critical', 'warning', 'info'));

ALTER TABLE public.intelligent_alert_rules 
  DROP CONSTRAINT IF EXISTS intelligent_alert_rules_severity_check;
ALTER TABLE public.intelligent_alert_rules 
  ADD CONSTRAINT intelligent_alert_rules_severity_check 
  CHECK (severity IN ('critical', 'warning', 'info'));
