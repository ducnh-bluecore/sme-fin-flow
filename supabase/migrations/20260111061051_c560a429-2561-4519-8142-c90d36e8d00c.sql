
-- Add channel and group columns to intelligent_alert_rules
ALTER TABLE public.intelligent_alert_rules 
ADD COLUMN IF NOT EXISTS applicable_channels text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS alert_group text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority_order int DEFAULT 100;
