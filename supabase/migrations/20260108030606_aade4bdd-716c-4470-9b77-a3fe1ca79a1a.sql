-- Add priority and deadline columns to decision_analyses for Executive Summary display
ALTER TABLE public.decision_analyses 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS deadline date,
ADD COLUMN IF NOT EXISTS impact text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index for faster pending decisions query
CREATE INDEX IF NOT EXISTS idx_decision_analyses_pending 
ON public.decision_analyses(tenant_id, status) 
WHERE status = 'pending_approval';