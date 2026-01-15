-- Add linking column to alert_instances
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS linked_decision_card_id TEXT DEFAULT NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_alert_instances_linked_decision 
ON public.alert_instances(linked_decision_card_id) 
WHERE linked_decision_card_id IS NOT NULL;

-- Add comment explaining the relationship
COMMENT ON COLUMN public.alert_instances.linked_decision_card_id IS 
'Links to auto-generated decision card ID. When set, alert is hidden from Control Tower and shown only in Decision Center';

-- Add column to track if alert was auto-resolved by decision
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS resolved_by_decision BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.alert_instances.resolved_by_decision IS 
'True if this alert was automatically resolved when a linked decision was made';