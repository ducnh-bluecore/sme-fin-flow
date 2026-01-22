-- Add P3 priority to feature_decisions table
ALTER TABLE public.feature_decisions DROP CONSTRAINT IF EXISTS feature_decisions_priority_check;

ALTER TABLE public.feature_decisions ADD CONSTRAINT feature_decisions_priority_check 
  CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));

-- Add new persona options
ALTER TABLE public.feature_decisions DROP CONSTRAINT IF EXISTS feature_decisions_persona_check;

ALTER TABLE public.feature_decisions ADD CONSTRAINT feature_decisions_persona_check 
  CHECK (persona IN ('CEO', 'CFO', 'Ops', 'Growth', 'CRM', 'Finance Director', 'Accounting Lead', 'Marketing Analyst', 'Product Manager'));

-- Update page_reviews reviewed_status to match spec
ALTER TABLE public.page_reviews DROP CONSTRAINT IF EXISTS page_reviews_reviewed_status_check;

ALTER TABLE public.page_reviews ADD CONSTRAINT page_reviews_reviewed_status_check 
  CHECK (reviewed_status IN ('not_reviewed', 'reviewed', 'needs_changes'));