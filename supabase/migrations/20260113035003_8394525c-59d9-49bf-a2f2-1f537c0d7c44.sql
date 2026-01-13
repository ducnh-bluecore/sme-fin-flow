-- Add assigned_to column for alert owner assignment
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Add assigned_at timestamp
ALTER TABLE public.alert_instances 
ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Create index for better query performance on assigned alerts
CREATE INDEX IF NOT EXISTS idx_alert_instances_assigned_to 
ON public.alert_instances(assigned_to) 
WHERE assigned_to IS NOT NULL;